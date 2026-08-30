"use client";

import { useState } from "react";
import { api } from "../client";
import {
  exportOrdersCsv,
  exportOrdersExcel,
  exportOrdersPdf,
} from "../lib/report-export";
import type { Order, OrderDetail, User } from "../types";
import { MuiCircularProgress, MuiPagination } from "./ui/mui";

const sar = new Intl.NumberFormat("en-SA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function today() {
  return new Date(Date.now() + 3 * 60 * 60_000).toISOString().slice(0, 10);
}

export function Reports({
  user,
  initialOrders,
  initialRange,
  initialTotal,
  initialSummary,
  onChanged,
}: {
  user: User;
  initialOrders: Order[];
  initialRange: { from: string; to: string };
  initialTotal: number;
  initialSummary: {
    orders: number;
    sales: number;
    collected: number;
    balance: number;
  };
  onChanged: () => Promise<void>;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [summary, setSummary] = useState(initialSummary);
  const [filters, setFilters] = useState({
    from: initialRange.from,
    to: initialRange.to,
    status: "",
    method: "",
    account: "",
    customer: "",
    sort: "newest",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState("");
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [edit, setEdit] = useState({
    status: "unpaid",
    method: "cash",
    amountPaid: 0,
    cardAccount: "stc",
    cashReceived: 0,
    balanceSettledByStaff: false,
    settledFromStaff: 0,
    settledFromDrawer: 0,
    notes: "",
  });

  async function load(nextPage = 1) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value),
      );
      query.set("page", String(nextPage));
      query.set("pageSize", String(pageSize));
      const result = await api<{
        orders: Order[];
        total: number;
        summary: typeof summary;
      }>(
        `/api/orders?${query.toString()}`,
      );
      setOrders(result.orders);
      setTotal(result.total);
      setSummary(result.summary);
      setPage(nextPage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Report failed");
    } finally {
      setLoading(false);
    }
  }

  async function exportReport(kind: "csv" | "xlsx" | "pdf") {
    setExporting(kind);
    setError("");
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value),
      );
      query.set("page", "1");
      query.set("pageSize", "1000");
      const result = await api<{ orders: Order[]; total: number }>(
        `/api/orders?${query.toString()}`,
      );
      if (result.total > 1000) {
        throw new Error(
          "Export is limited to 1,000 matching orders. Narrow the date range.",
        );
      }
      const filename = `laundry-orders-${filters.from}-${filters.to}`;
      if (kind === "csv") exportOrdersCsv(result.orders, filename);
      if (kind === "xlsx") await exportOrdersExcel(result.orders, filename);
      if (kind === "pdf") {
        await exportOrdersPdf(
          result.orders,
          filename,
          `${filters.from} to ${filters.to}`,
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Export failed");
    } finally {
      setExporting("");
    }
  }

  async function openOrder(order: Order) {
    setError("");
    try {
      const result = await api<{ detail: OrderDetail }>(
        `/api/orders?id=${order.id}`,
      );
      setDetail(result.detail);
      setEdit({
        status: result.detail.order.paymentStatus,
        method: result.detail.order.paymentMethod,
        amountPaid: Number(result.detail.order.amountPaid),
        cardAccount: result.detail.order.cardAccount ?? "stc",
        cashReceived: Number(result.detail.order.cashReceived),
        balanceSettledByStaff: Boolean(result.detail.order.balanceSettledByStaff),
        settledFromStaff: Number(result.detail.order.settledFromStaff),
        settledFromDrawer: Number(result.detail.order.settledFromDrawer),
        notes: result.detail.order.notes,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open order");
    }
  }

  async function updateOrder() {
    if (!detail) return;
    setError("");
    try {
      const result = await api<{ detail: OrderDetail }>("/api/orders", {
        method: "PATCH",
        body: JSON.stringify({
          id: detail.order.id,
          version: detail.order.version,
          paymentStatus: edit.status,
          paymentMethod: edit.method,
          amountPaid: edit.amountPaid,
          cardAccount: edit.method === "card" ? edit.cardAccount : null,
          cashReceived: edit.method === "cash" ? edit.cashReceived : 0,
          balanceSettledByStaff: edit.method === "cash" && edit.balanceSettledByStaff,
          settledFromStaff: edit.method === "cash" && edit.balanceSettledByStaff ? edit.settledFromStaff : 0,
          settledFromDrawer: edit.method === "cash" && edit.balanceSettledByStaff ? edit.settledFromDrawer : 0,
          notes: edit.notes,
        }),
      });
      setDetail(result.detail);
      await load(page);
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update failed");
    }
  }

  return (
    <div className="page-content">
      <header className="page-heading">
        <div>
          <p className="eyebrow">REPORTING</p>
          <h2>Orders and collections</h2>
          <p className="muted">
            {user.role === "staff"
              ? "You can read the latest three days. Older dates require an admin grant."
              : "Filter and sort the complete order history."}
          </p>
        </div>
        <div className="export-actions">
          {(["csv", "xlsx", "pdf"] as const).map((kind) => (
            <button
              key={kind}
              className="secondary-button"
              disabled={Boolean(exporting)}
              onClick={() => exportReport(kind)}
            >
              {exporting === kind && (
                <MuiCircularProgress size={14} color="inherit" />
              )}
              {kind === "xlsx" ? "Excel" : kind.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}

      <section className="metric-grid report-metrics">
        <div className="metric-card">
          <span>Orders</span>
          <b>{summary.orders}</b>
        </div>
        <div className="metric-card">
          <span>Gross sales</span>
          <b>SAR {sar.format(summary.sales)}</b>
        </div>
        <div className="metric-card">
          <span>Collected</span>
          <b>SAR {sar.format(summary.collected)}</b>
        </div>
        <div className="metric-card warning">
          <span>Outstanding</span>
          <b>SAR {sar.format(summary.balance)}</b>
        </div>
      </section>

      <section className="card report-card">
        <div className="report-filters">
          <label>
            From
            <input
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={filters.to}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  to: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Payment status
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option value="">All statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </label>
          <label>
            Payment method
            <select
              value={filters.method}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  method: event.target.value,
                }))
              }
            >
              <option value="">Cash and card</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
            </select>
          </label>
          <label>
            Customer or invoice
            <input
              value={filters.customer}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  customer: event.target.value,
                }))
              }
              placeholder="Search"
            />
          </label>
          <label>Card account<select value={filters.account} onChange={(event) => setFilters((current) => ({ ...current, account: event.target.value }))}><option value="">STC and ANB</option><option value="stc">STC</option><option value="anb">ANB</option></select></label>
          <label>
            Sort
            <select
              value={filters.sort}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  sort: event.target.value,
                }))
              }
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="total_desc">Highest total</option>
              <option value="total_asc">Lowest total</option>
              <option value="customer_asc">Customer A–Z</option>
            </select>
          </label>
          <button
            className="primary-button"
            onClick={() => load(1)}
            disabled={loading}
          >
            {loading && <MuiCircularProgress size={15} color="inherit" />}
            {loading ? "Loading…" : "Apply filters"}
          </button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Method</th>
                <th>Payment details</th>
                <th>Staff</th>
                <th>Status</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} onClick={() => openOrder(order)}>
                  <td>
                    <b>{order.invoiceNumber}</b>
                  </td>
                  <td>{order.orderDate}</td>
                  <td>{order.customerName}</td>
                  <td>
                    <span className="method-chip">{order.paymentMethod === "card" ? `Card · ${(order.cardAccount ?? "stc").toUpperCase()}` : "Cash"}</span>
                  </td>
                  <td>{order.paymentMethod === "cash" ? <small>Received SAR {sar.format(Number(order.cashReceived))}<br />Staff SAR {sar.format(Number(order.settledFromStaff))} · Drawer SAR {sar.format(Number(order.settledFromDrawer))}</small> : <small>Receiving account: {(order.cardAccount ?? "stc").toUpperCase()}</small>}</td>
                  <td>{order.assignedStaffName}</td>
                  <td>
                    <span className={`status-pill ${order.paymentStatus}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td>SAR {sar.format(Number(order.totalAmount))}</td>
                  <td>SAR {sar.format(Number(order.amountPaid))}</td>
                  <td>SAR {sar.format(Number(order.balance))}</td>
                </tr>
              ))}
              {!orders.length && (
                <tr>
                  <td colSpan={10} className="empty-cell">
                    No orders match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination-row">
          <span>
            {total
              ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
              : "0 orders"}
          </span>
          <MuiPagination
            page={page}
            count={Math.max(1, Math.ceil(total / pageSize))}
            color="primary"
            onChange={(_event, value) => load(value)}
            disabled={loading}
            showFirstButton
            showLastButton
          />
        </div>
      </section>

      {detail && (
        <div className="modal-backdrop" onMouseDown={() => setDetail(null)}>
          <section
            className="modal order-detail-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="eyebrow">ORDER DETAIL</p>
                <h3>{detail.order.invoiceNumber}</h3>
              </div>
              <button className="icon-button" onClick={() => setDetail(null)}>
                ×
              </button>
            </header>
            <div className="detail-summary">
              <span>
                Customer <b>{detail.order.customerName}</b>
              </span>
              <span>
                Created by <b>{detail.order.createdByName}</b>
              </span>
              <span>Assigned staff <b>{detail.order.assignedStaffName}</b></span>
              <span>
                Date <b>{detail.order.orderDate}</b>
              </span>
              <span>
                Total <b>SAR {sar.format(detail.order.totalAmount)}</b>
              </span>
            </div>
            <div className="table-wrap">
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Total incl. VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item, index) => (
                    <tr key={item.id ?? index}>
                      <td>{item.serviceName}</td>
                      <td>{item.quantity}</td>
                      <td>SAR {sar.format(item.unitPrice)}</td>
                      <td>SAR {sar.format(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="edit-order-grid">
              <label>
                Status
                <select
                  value={edit.status}
                  onChange={(event) =>
                    setEdit((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              <label>
                Method
                <select
                  value={edit.method}
                  onChange={(event) =>
                    setEdit((current) => ({
                      ...current,
                      method: event.target.value,
                    }))
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
              </label>
              <label>
                Amount paid
                <input
                  type="number"
                  min="0"
                  max={detail.order.totalAmount}
                  value={edit.amountPaid}
                  onChange={(event) =>
                    setEdit((current) => ({
                      ...current,
                      amountPaid: Number(event.target.value),
                    }))
                  }
                />
              </label>
              {edit.method === "card" && <label>Receiving account<select value={edit.cardAccount} onChange={(event) => setEdit((current) => ({ ...current, cardAccount: event.target.value }))}><option value="stc">STC</option><option value="anb">ANB</option></select></label>}
              {edit.method === "cash" && <>
                <label>Cash received<input type="number" min="0" value={edit.cashReceived} onChange={(event) => setEdit((current) => ({ ...current, cashReceived: Number(event.target.value) }))} /></label>
                <label className="checkbox-label"><input type="checkbox" checked={edit.balanceSettledByStaff} onChange={(event) => setEdit((current) => ({ ...current, balanceSettledByStaff: event.target.checked }))} />Balance settled by staff</label>
                {edit.balanceSettledByStaff && <><label>From staff<input type="number" min="0" value={edit.settledFromStaff} onChange={(event) => setEdit((current) => ({ ...current, settledFromStaff: Number(event.target.value) }))} /></label><label>From drawer/wallet<input type="number" min="0" value={edit.settledFromDrawer} onChange={(event) => setEdit((current) => ({ ...current, settledFromDrawer: Number(event.target.value) }))} /></label></>}
              </>}
              <label>
                Notes
                <input
                  value={edit.notes}
                  onChange={(event) =>
                    setEdit((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <p className="permission-note">
              {user.role === "admin" || detail.order.orderDate === today()
                ? "Changes are audit logged."
                : "Historical changes require an admin permission grant."}
            </p>
            <button className="primary-button wide" onClick={updateOrder}>
              Save payment changes
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
