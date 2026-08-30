"use client";

import { FormEvent, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  catalogHeaders,
  customerHeaders,
  normalizeHeader,
  toCsv,
  validateHeaders,
} from "../../lib/csv";
import { api } from "../client";
import { MuiCircularProgress } from "./ui/mui";
import type {
  BootstrapData,
  Category,
  Customer,
  Order,
  OrderDetail,
  PermissionGrant,
  Shop,
  StaffDebt,
  User,
} from "../types";

const sar = new Intl.NumberFormat("en-SA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

async function adminAction(action: string, values: Record<string, unknown>) {
  return api("/api/admin", {
    method: "POST",
    body: JSON.stringify({ action, ...values }),
  });
}

export function AdminDashboard({ data }: { data: BootstrapData }) {
  const summary = data.todaySummary;
  return (
    <div className="page-content">
      <header className="page-heading">
        <div>
          <p className="eyebrow">OWNER OVERVIEW</p>
          <h2>Good day, {data.user.displayName}</h2>
          <p className="muted">Today’s shop activity at a glance.</p>
        </div>
        <span className="date-chip">
          {new Intl.DateTimeFormat("en-SA", {
            dateStyle: "full",
            timeZone: "Asia/Riyadh",
          }).format(new Date())}
        </span>
      </header>
      <section className="metric-grid">
        <div className="metric-card accent">
          <span>Today’s sales</span>
          <b>SAR {sar.format(Number(summary.grossSales))}</b>
          <small>{summary.orderCount} orders</small>
        </div>
        <div className="metric-card">
          <span>Collected</span>
          <b>SAR {sar.format(Number(summary.collected))}</b>
          <small>
            Cash {sar.format(Number(summary.cashCollected))} · Card{" "}
            {sar.format(Number(summary.cardCollected))}
          </small>
        </div>
        <div className="metric-card warning">
          <span>Outstanding</span>
          <b>SAR {sar.format(Number(summary.outstanding))}</b>
          <small>Partial and unpaid balances</small>
        </div>
        <div className="metric-card">
          <span>Customers</span>
          <b>{data.admin?.customerCount ?? 0}</b>
          <small>{data.admin?.serviceCount ?? 0} active catalog items</small>
        </div>
      </section>
      <section className="dashboard-grid">
        <div className="card">
          <div className="section-heading">
            <h3>Recent orders</h3>
            <span className="muted">Latest activity</span>
          </div>
          <div className="activity-list">
            {data.recentOrders.slice(0, 8).map((order) => (
              <div key={order.id}>
                <span className={`status-dot ${order.paymentStatus}`} />
                <div>
                  <b>{order.invoiceNumber}</b>
                  <small>
                    {order.customerName} · {order.createdByName}
                  </small>
                </div>
                <strong>SAR {sar.format(Number(order.totalAmount))}</strong>
              </div>
            ))}
            {!data.recentOrders.length && (
              <p className="empty-state">No orders yet.</p>
            )}
          </div>
        </div>
        <div className="card">
          <div className="section-heading">
            <h3>Catalog health</h3>
          </div>
          <div className="catalog-health">
            <div>
              <span>Categories</span>
              <b>{data.admin?.categoryCount ?? 0}</b>
            </div>
            <div>
              <span>Services</span>
              <b>{data.admin?.serviceCount ?? 0}</b>
            </div>
            <p>
              Prices are stored as effective-dated records so historical
              invoices never change when the catalog price changes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CatalogAdmin({
  catalog,
  refresh,
}: {
  catalog: Category[];
  refresh: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [category, setCategory] = useState({
    id: 0,
    name: "",
    color: "#2563eb",
    sortOrder: 0,
    isActive: true,
  });
  const [service, setService] = useState({
    id: 0,
    categoryId: catalog[0]?.id ?? 0,
    name: "",
    nameAr: "",
    price: 1,
    sortOrder: 0,
    isActive: true,
  });

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    try {
      await adminAction(
        category.id ? "category.update" : "category.create",
        category,
      );
      setCategory({
        id: 0,
        name: "",
        color: "#2563eb",
        sortOrder: 0,
        isActive: true,
      });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  async function saveService(event: FormEvent) {
    event.preventDefault();
    try {
      if (service.id) {
        await adminAction("service.update", service);
        const current = catalog
          .flatMap((item) => item.services)
          .find((item) => item.id === service.id);
        if (current && Number(current.price) !== Number(service.price)) {
          await adminAction("price.create", {
            serviceId: service.id,
            price: service.price,
          });
        }
      } else {
        await adminAction("service.create", service);
      }
      setService({
        id: 0,
        categoryId: catalog[0]?.id ?? 0,
        name: "",
        nameAr: "",
        price: 1,
        sortOrder: 0,
        isActive: true,
      });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  return (
    <div className="page-content">
      <header className="page-heading">
        <div>
          <p className="eyebrow">MASTER DATA</p>
          <h2>Categories, items, and pricing</h2>
          <p className="muted">
            Deactivation preserves old invoices and relationships.
          </p>
        </div>
      </header>
      {error && <div className="alert error">{error}</div>}
      <section className="admin-split">
        <form className="card admin-form" onSubmit={saveCategory}>
          <div className="section-heading">
            <h3>{category.id ? "Edit category" : "New category"}</h3>
          </div>
          <label>
            Category name
            <input
              value={category.name}
              onChange={(event) =>
                setCategory((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              required
            />
          </label>
          <div className="compact-fields">
            <label>
              Category color
              <input
                type="color"
                value={category.color}
                onChange={(event) =>
                  setCategory((current) => ({
                    ...current,
                    color: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Sort order
              <input
                type="number"
                value={category.sortOrder}
                onChange={(event) =>
                  setCategory((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          {category.id > 0 && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={category.isActive}
                onChange={(event) =>
                  setCategory((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Active
            </label>
          )}
          <button className="primary-button wide">Save category</button>
          {category.id > 0 && (
            <button
              type="button"
              className="text-button"
              onClick={() =>
                setCategory({
                  id: 0,
                  name: "",
                  color: "#2563eb",
                  sortOrder: 0,
                  isActive: true,
                })
              }
            >
              Cancel editing
            </button>
          )}
        </form>
        <form className="card admin-form" onSubmit={saveService}>
          <div className="section-heading">
            <h3>{service.id ? "Edit item and price" : "New service item"}</h3>
          </div>
          <label>
            Category
            <select
              value={service.categoryId}
              onChange={(event) =>
                setService((current) => ({
                  ...current,
                  categoryId: Number(event.target.value),
                }))
              }
              required
            >
              {catalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="compact-fields">
            <label>
              Item name
              <input
                value={service.name}
                onChange={(event) =>
                  setService((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              Arabic name
              <input
                dir="rtl"
                value={service.nameAr}
                onChange={(event) =>
                  setService((current) => ({
                    ...current,
                    nameAr: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Price excluding VAT
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={service.price}
                onChange={(event) =>
                  setService((current) => ({
                    ...current,
                    price: Number(event.target.value),
                  }))
                }
                required
              />
            </label>
            <label>
              Sort order
              <input
                type="number"
                value={service.sortOrder}
                onChange={(event) =>
                  setService((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          {service.id > 0 && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={service.isActive}
                onChange={(event) =>
                  setService((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Active
            </label>
          )}
          <button className="primary-button wide">Save item</button>
        </form>
      </section>

      <section className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Item</th>
                <th>Arabic</th>
                <th>Current price</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {catalog.flatMap((item) =>
                item.services.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <button
                        className="category-link"
                        onClick={() =>
                          setCategory({
                            id: item.id,
                            name: item.name,
                            color: item.color,
                            sortOrder: item.sortOrder,
                            isActive: item.isActive,
                          })
                        }
                      >
                        <span style={{ background: item.color }} />
                        {item.name}
                      </button>
                    </td>
                    <td>{entry.name}</td>
                    <td dir="rtl">{entry.nameAr || "—"}</td>
                    <td>SAR {sar.format(entry.price)}</td>
                    <td>
                      <span
                        className={`status-pill ${entry.isActive && item.isActive ? "paid" : "unpaid"}`}
                      >
                        {entry.isActive && item.isActive ? "active" : "inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() =>
                          setService({
                            id: entry.id,
                            categoryId: item.id,
                            name: entry.name,
                            nameAr: entry.nameAr,
                            price: entry.price,
                            sortOrder: entry.sortOrder,
                            isActive: entry.isActive,
                          })
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function CustomersAdmin({
  customers,
  refresh,
}: {
  customers: Customer[];
  refresh: () => Promise<void>;
}) {
  const empty = {
    id: 0,
    name: "",
    phone: "",
    email: "",
    address: "",
    vatNumber: "",
    notes: "",
    isActive: true,
  };
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchaseDetail, setPurchaseDetail] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const filtered = useMemo(
    () =>
      customers.filter((customer) =>
        `${customer.name} ${customer.phone} ${customer.email}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [customers, search],
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await adminAction(
        form.id ? "customer.update" : "customer.create",
        form,
      );
      setForm(empty);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  async function select(customer: Customer) {
    setForm(customer);
    try {
      const result = await api<{ orders: Order[] }>(
        `/api/orders?customerId=${customer.id}&from=2000-01-01&to=2099-12-31&limit=1000`,
      );
      setOrders(result.orders);
      setPurchaseDetail(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "History failed");
    }
  }

  return (
    <div className="page-content">
      <header className="page-heading">
        <div>
          <p className="eyebrow">CUSTOMER CRM</p>
          <h2>Customers and purchase history</h2>
        </div>
      </header>
      {error && <div className="alert error">{error}</div>}
      <section className="admin-split wide-left">
        <div className="card">
          <input
            className="table-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, mobile, or email"
          />
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id} onClick={() => select(customer)}>
                    <td>
                      <b>{customer.name}</b>
                    </td>
                    <td>{customer.phone || "—"}</td>
                    <td>{customer.email || "—"}</td>
                    <td>{customer.isActive ? "Active" : "Inactive"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <form className="card admin-form" onSubmit={save}>
          <div className="section-heading">
            <h3>{form.id ? "Edit customer" : "New customer"}</h3>
            {form.id > 0 && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setForm(empty);
                  setOrders([]);
                }}
              >
                New
              </button>
            )}
          </div>
          {(["name", "phone", "email", "address", "vatNumber"] as const).map(
            (field) => (
              <label key={field}>
                {field === "vatNumber"
                  ? "VAT number"
                  : field[0].toUpperCase() + field.slice(1)}
                <input
                  value={form[field]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  required={field === "name"}
                />
              </label>
            ),
          )}
          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
          {form.id > 0 && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Active customer
            </label>
          )}
          <button className="primary-button wide">Save customer</button>
        </form>
      </section>
      {form.id > 0 && (
        <section className="card">
          <div className="section-heading">
            <h3>{form.name} · purchase history</h3>
            <span>{orders.length} orders</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Total</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={async () => {
                      const result = await api<{ detail: OrderDetail }>(
                        `/api/orders?id=${order.id}`,
                      );
                      setPurchaseDetail(result.detail);
                    }}
                  >
                    <td>{order.invoiceNumber}</td>
                    <td>{order.orderDate}</td>
                    <td>{order.paymentStatus}</td>
                    <td>{order.paymentMethod}</td>
                    <td>SAR {sar.format(order.totalAmount)}</td>
                    <td>SAR {sar.format(order.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {purchaseDetail && (
            <div className="purchase-detail">
              <div className="section-heading">
                <h3>{purchaseDetail.order.invoiceNumber} · items</h3>
                <button
                  className="text-button"
                  onClick={() => setPurchaseDetail(null)}
                >
                  Close
                </button>
              </div>
              {purchaseDetail.items.map((item, index) => (
                <div key={item.id ?? index}>
                  <span>
                    {item.serviceName} × {item.quantity}
                  </span>
                  <b>SAR {sar.format(item.totalAmount)}</b>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function TeamAdmin({
  users,
  grants,
  debts,
  refresh,
}: {
  users: User[];
  grants: PermissionGrant[];
  debts: StaffDebt[];
  refresh: () => Promise<void>;
}) {
  const staff = users.filter((user) => user.role === "staff");
  const [userForm, setUserForm] = useState({
    id: 0,
    username: "",
    displayName: "",
    role: "staff",
    password: "",
    isActive: true,
    phone: "",
    passportNumber: "",
    passportExpiry: "",
    visaStatus: "not_recorded",
    visaExpiry: "",
    iqamaNumber: "",
    iqamaExpiry: "",
  });
  const [grant, setGrant] = useState({
    staffUserId: staff[0]?.id ?? 0,
    scope: "reports_history",
    fromDate: "",
    toDate: "",
    expiresAt: "",
  });
  const [error, setError] = useState("");

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    try {
      await adminAction(
        userForm.id ? "user.update" : "user.create",
        userForm,
      );
      setUserForm({
        id: 0,
        username: "",
        displayName: "",
        role: "staff",
        password: "",
        isActive: true,
        phone: "",
        passportNumber: "",
        passportExpiry: "",
        visaStatus: "not_recorded",
        visaExpiry: "",
        iqamaNumber: "",
        iqamaExpiry: "",
      });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  async function saveGrant(event: FormEvent) {
    event.preventDefault();
    try {
      await adminAction("grant.create", grant);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Grant failed");
    }
  }

  return (
    <div className="page-content">
      <header className="page-heading">
        <div>
          <p className="eyebrow">ACCESS CONTROL</p>
          <h2>Team and permissions</h2>
          <p className="muted">
            Server-side roles isolate staff functions from owner controls.
          </p>
        </div>
      </header>
      {error && <div className="alert error">{error}</div>}
      <section className="admin-split">
        <form className="card admin-form" onSubmit={saveUser}>
          <div className="section-heading">
            <h3>{userForm.id ? "Edit user" : "Create user"}</h3>
          </div>
          <label>
            Display name
            <input
              value={userForm.displayName}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              required
            />
          </label>
          {!userForm.id && (
            <label>
              Username
              <input
                value={userForm.username}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                required
              />
            </label>
          )}
          <label>
            Role
            <select
              value={userForm.role}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  role: event.target.value,
                }))
              }
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>Mobile number<input value={userForm.phone} onChange={(event) => setUserForm((current) => ({ ...current, phone: event.target.value }))} required={userForm.role === "staff"} /></label>
          {userForm.role === "staff" && <>
            <label>Passport number<input value={userForm.passportNumber} onChange={(event) => setUserForm((current) => ({ ...current, passportNumber: event.target.value }))} /></label>
            <label>Passport validity<input type="date" value={userForm.passportExpiry} onChange={(event) => setUserForm((current) => ({ ...current, passportExpiry: event.target.value }))} /></label>
            <label>Visa status<select value={userForm.visaStatus} onChange={(event) => setUserForm((current) => ({ ...current, visaStatus: event.target.value }))}><option value="not_recorded">Not recorded</option><option value="valid">Valid</option><option value="expiring">Expiring</option><option value="expired">Expired</option><option value="not_required">Not required</option></select></label>
            <label>Visa validity<input type="date" value={userForm.visaExpiry} onChange={(event) => setUserForm((current) => ({ ...current, visaExpiry: event.target.value }))} /></label>
            <label>Iqama number<input value={userForm.iqamaNumber} onChange={(event) => setUserForm((current) => ({ ...current, iqamaNumber: event.target.value }))} /></label>
            <label>Iqama validity<input type="date" value={userForm.iqamaExpiry} onChange={(event) => setUserForm((current) => ({ ...current, iqamaExpiry: event.target.value }))} /></label>
          </>}
          <label>
            {userForm.id ? "Reset password (optional)" : "Temporary password"}
            <input
              type="password"
              value={userForm.password}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              required={!userForm.id}
            />
          </label>
          {userForm.id > 0 && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={userForm.isActive}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Active
            </label>
          )}
          <button className="primary-button wide">Save user</button>
        </form>
        <form className="card admin-form" onSubmit={saveGrant}>
          <div className="section-heading">
            <h3>Grant historical access</h3>
          </div>
          <label>
            Staff user
            <select
              value={grant.staffUserId}
              onChange={(event) =>
                setGrant((current) => ({
                  ...current,
                  staffUserId: Number(event.target.value),
                }))
              }
            >
              {staff.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Permission
            <select
              value={grant.scope}
              onChange={(event) =>
                setGrant((current) => ({
                  ...current,
                  scope: event.target.value,
                }))
              }
            >
              <option value="reports_history">Read older reports</option>
              <option value="orders_history_write">
                Edit historical orders
              </option>
            </select>
          </label>
          <div className="compact-fields">
            <label>
              From
              <input
                type="date"
                value={grant.fromDate}
                onChange={(event) =>
                  setGrant((current) => ({
                    ...current,
                    fromDate: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={grant.toDate}
                onChange={(event) =>
                  setGrant((current) => ({
                    ...current,
                    toDate: event.target.value,
                  }))
                }
                required
              />
            </label>
          </div>
          <button className="primary-button wide">Grant permission</button>
        </form>
      </section>

      <section className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.displayName}</td>
                  <td>{user.username}</td>
                  <td>{user.role}</td>
                  <td>{user.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() =>
                        setUserForm({
                          id: user.id,
                          username: user.username,
                          displayName: user.displayName,
                          role: user.role,
                        password: "",
                        isActive: Boolean(user.isActive),
                        phone: user.phone ?? "",
                        passportNumber: user.passportNumber ?? "",
                        passportExpiry: user.passportExpiry ?? "",
                        visaStatus: user.visaStatus ?? "not_recorded",
                        visaExpiry: user.visaExpiry ?? "",
                        iqamaNumber: user.iqamaNumber ?? "",
                        iqamaExpiry: user.iqamaExpiry ?? "",
                        })
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-heading"><h3>Company receivables from staff</h3><span>Created automatically when staff money settles a cash bill</span></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Staff</th><th>Token</th><th>Original</th><th>Outstanding</th><th>Status</th><th>Action</th></tr></thead><tbody>{debts.map((debt) => <tr key={debt.id}><td>{debt.staffName}</td><td>{debt.tokenNumber}<small>{debt.invoiceNumber}</small></td><td>SAR {sar.format(Number(debt.originalAmount))}</td><td>SAR {sar.format(Number(debt.outstandingAmount))}</td><td><span className={`status-pill ${debt.status}`}>{debt.status}</span></td><td>{debt.status === "open" && <button className="text-button" onClick={async () => { await adminAction("staff_debt.update", { id: debt.id, outstandingAmount: 0, notes: "Settled by admin" }); await refresh(); }}>Mark settled</button>}</td></tr>)}{!debts.length && <tr><td colSpan={6} className="empty-cell">No staff-funded settlements.</td></tr>}</tbody></table></div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h3>Active permission grants</h3>
        </div>
        <div className="grant-list">
          {grants.map((item) => (
            <div key={item.id}>
              <div>
                <b>{item.staffName}</b>
                <span>{item.scope.replaceAll("_", " ")}</span>
              </div>
              <span>
                {item.fromDate} → {item.toDate}
              </span>
              <button
                className="text-button danger"
                onClick={async () => {
                  await adminAction("grant.delete", { id: item.id });
                  await refresh();
                }}
              >
                Revoke
              </button>
            </div>
          ))}
          {!grants.length && <p className="empty-state">No grants issued.</p>}
        </div>
      </section>
    </div>
  );
}

export function SettingsAdmin({
  shop,
  refresh,
}: {
  shop: Shop;
  refresh: () => Promise<void>;
}) {
  const [form, setForm] = useState(shop);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await adminAction("settings.update", form);
      setMessage("Shop settings saved.");
      await refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  return (
    <div className="page-content">
      <header className="page-heading">
        <div>
          <p className="eyebrow">BUSINESS PROFILE</p>
          <h2>Shop and invoice settings</h2>
          <p className="muted">
            Admin-only values used automatically on every new invoice.
          </p>
        </div>
      </header>
      {message && (
        <div className={`alert ${message.includes("saved") ? "success" : "error"}`}>
          {message}
        </div>
      )}
      <form className="card settings-form" onSubmit={save}>
        <div className="compact-fields">
          {(
            [
              ["shopName", "Shop name (English)"],
              ["shopNameAr", "Shop name (Arabic)"],
              ["phone", "Contact number"],
              ["email", "Email"],
              ["vatNumber", "VAT registration number"],
              ["commercialNumber", "Commercial registration"],
              ["invoicePrefix", "Invoice prefix"],
            ] as const
          ).map(([field, label]) => (
            <label key={field}>
              {label}
              <input
                dir={field === "shopNameAr" ? "rtl" : undefined}
                value={form[field]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field]: event.target.value,
                  }))
                }
                required={field === "shopName" || field === "vatNumber"}
              />
            </label>
          ))}
          <label className="span-2">
            Address
            <input
              value={form.address}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
            />
          </label>
          <label className="span-2">
            Receipt footer
            <textarea
              value={form.receiptFooter}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  receiptFooter: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <button className="primary-button">Save shop settings</button>
      </form>
    </div>
  );
}

type ImportKind = "customers" | "catalog";

export function DataImportAdmin({
  refresh,
}: {
  refresh: () => Promise<void>;
}) {
  const [kind, setKind] = useState<ImportKind>("customers");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const headers = kind === "customers" ? customerHeaders : catalogHeaders;

  function chooseFile(file?: File) {
    setRows([]);
    setMessage("");
    setFileName(file?.name ?? "");
    if (!file) return;
    if (file.size > 2_000_000) {
      setMessage("CSV file must be smaller than 2 MB.");
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
      complete(result) {
        const missing = validateHeaders(result.meta.fields ?? [], headers);
        if (missing.length) {
          setMessage(`Missing required columns: ${missing.join(", ")}`);
          return;
        }
        if (result.errors.length) {
          setMessage(`CSV error: ${result.errors[0].message}`);
          return;
        }
        if (!result.data.length || result.data.length > 1000) {
          setMessage("Import must contain between 1 and 1,000 data rows.");
          return;
        }
        setRows(result.data);
        setMessage(`${result.data.length} rows validated locally.`);
      },
      error(error) {
        setMessage(error.message);
      },
    });
  }

  function downloadTemplate() {
    const example =
      kind === "customers"
        ? [["Aisha Ahmed", "0500000000", "aisha@example.com", "Riyadh", "", "VIP"]]
        : [["Dry Cleaning", "#00695c", "Thobe", "ثوب", "12.00", "10"]];
    const blob = new Blob(["\uFEFF", toCsv(headers, example)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${kind}-import-template.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function submit() {
    if (!rows.length) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await adminAction(`import.${kind}`, { rows });
      const imported =
        typeof result === "object" &&
        result &&
        "imported" in result &&
        typeof result.imported === "number"
          ? result.imported
          : rows.length;
      setMessage(`${imported} rows imported successfully.`);
      setRows([]);
      setFileName("");
      await refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-content">
      <header className="page-heading">
        <div>
          <p className="eyebrow">CONTROLLED DATA LOAD</p>
          <h2>Import CSV data</h2>
          <p className="muted">
            Admin-only, validated and atomic: a bad row rejects the whole file.
          </p>
        </div>
        <button className="secondary-button" onClick={downloadTemplate}>
          Download {kind} template
        </button>
      </header>

      <section className="card import-card">
        <div className="segment import-kind">
          <button
            className={kind === "customers" ? "active" : ""}
            onClick={() => {
              setKind("customers");
              setRows([]);
              setMessage("");
            }}
          >
            Customers
          </button>
          <button
            className={kind === "catalog" ? "active" : ""}
            onClick={() => {
              setKind("catalog");
              setRows([]);
              setMessage("");
            }}
          >
            Categories, items & prices
          </button>
        </div>

        <label className="file-drop">
          <b>Select a UTF-8 CSV file</b>
          <span>{fileName || "Maximum 1,000 rows / 2 MB"}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => chooseFile(event.target.files?.[0])}
          />
        </label>

        {message && (
          <div
            className={`alert ${
              message.includes("validated") || message.includes("successfully")
                ? "success"
                : "error"
            }`}
          >
            {message}
          </div>
        )}

        <div className="import-guidance">
          <h3>Import rules</h3>
          <ul>
            <li>Do not rename or remove template headers.</li>
            <li>Save as UTF-8 CSV; keep phone numbers as text to preserve zeroes.</li>
            <li>Use decimal prices without currency symbols, for example 12.50.</li>
            <li>Category colors use six-digit hex values such as #00695c.</li>
            <li>
              Imports are create-only. Remove existing duplicate customers/items
              before importing.
            </li>
            <li>Keep a backup/export before a large production import.</li>
          </ul>
        </div>

        <button
          className="primary-button"
          disabled={!rows.length || busy}
          onClick={submit}
        >
          {busy && <MuiCircularProgress size={16} color="inherit" />}
          {busy ? "Importing…" : `Import ${rows.length || ""} rows`}
        </button>
      </section>
    </div>
  );
}
