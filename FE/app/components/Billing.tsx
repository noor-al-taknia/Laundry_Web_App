"use client";

import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { calculateInvoice, invoiceItems } from "../../lib/invoice";
import { api } from "../client";
import { useAppStore } from "../store";
import type {
  Category,
  Customer,
  OrderDetail,
  OrderItem,
  Shop,
} from "../types";
import { Receipt, type ReceiptData } from "./Receipt";
import { MuiCircularProgress } from "./ui/mui";

const format = new Intl.NumberFormat("en-SA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function today() {
  return new Date(Date.now() + 3 * 60 * 60_000).toISOString().slice(0, 10);
}

function receiptFromDetail(detail: OrderDetail): ReceiptData {
  return {
    invoiceNumber: detail.order.invoiceNumber,
    tokenNumber: detail.order.tokenNumber,
    orderDateTime: detail.order.createdAt,
    supplyDate: detail.order.supplyDate,
    customerName: detail.order.customerName,
    customerPhone: detail.order.customerPhone,
    customerAddress: detail.order.customerAddress,
    paymentMethod: detail.order.paymentMethod,
    cardAccount: detail.order.cardAccount,
    cashReceived: Number(detail.order.cashReceived),
    balanceSettledByStaff: Boolean(detail.order.balanceSettledByStaff),
    settledFromStaff: Number(detail.order.settledFromStaff),
    settledFromDrawer: Number(detail.order.settledFromDrawer),
    paymentStatus: detail.order.paymentStatus,
    subtotal: Number(detail.order.subtotal),
    discount: Number(detail.order.discount),
    vatAmount: Number(detail.order.vatAmount),
    totalAmount: Number(detail.order.totalAmount),
    amountPaid: Number(detail.order.amountPaid),
    balance: Number(detail.order.balance),
    items: detail.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
      taxableAmount: Number(item.taxableAmount),
      vatAmount: Number(item.vatAmount),
      totalAmount: Number(item.totalAmount),
    })),
  };
}

export function Billing({
  shop,
  catalog,
  customers,
  onSaved,
}: {
  shop: Shop;
  catalog: Category[];
  customers: Customer[];
  onSaved: () => Promise<void>;
}) {
  const {
    cart,
    customerDraft,
    addCartItem,
    setQuantity,
    clearCart,
    setCustomerDraft,
    clearCustomerDraft,
  } = useAppStore();
  const customerQuery = customerDraft.query;
  const customerId = customerDraft.id;
  const customer = customerDraft;
  const [showCustomers, setShowCustomers] = useState(false);
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [amountPaid, setAmountPaid] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [supplyDate, setSupplyDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [savedReceipt, setSavedReceipt] = useState<ReceiptData | null>(null);

  const matches = useMemo(() => {
    const search = customerQuery.trim().toLowerCase();
    if (!search) return customers.slice(0, 8);
    return customers
      .filter((item) =>
        `${item.name} ${item.phone} ${item.email}`.toLowerCase().includes(search),
      )
      .slice(0, 8);
  }, [customerQuery, customers]);

  const totals = useMemo(
    () => calculateInvoice(cart, discount, amountPaid),
    [cart, discount, amountPaid],
  );

  const draftItems: OrderItem[] = invoiceItems(cart);

  const draftReceipt: ReceiptData = {
    invoiceNumber: "DRAFT",
    orderDateTime: new Date().toISOString(),
    supplyDate,
    customerName: customer.name || "Walk-in Customer",
    customerPhone: customer.phone,
    customerAddress: customer.address,
    paymentMethod,
    paymentStatus: totals.paymentStatus,
    subtotal: totals.subtotal,
    discount: totals.discount,
    vatAmount: totals.vatAmount,
    totalAmount: totals.totalAmount,
    amountPaid: totals.amountPaid,
    balance: totals.balance,
    items: draftItems,
  };

  function addService(
    category: Category,
    service: Category["services"][number],
  ) {
    if (!service.price) {
      setMessage(`${service.name} does not have an active price.`);
      return;
    }
    setSavedReceipt(null);
    setMessage("");
    addCartItem({
      serviceId: service.id,
      categoryName: category.name,
      categoryColor: category.color,
      serviceName: service.name,
      unitPrice: service.price,
      quantity: 1,
    });
  }

  function changeQuantity(serviceId: number, quantity: number) {
    if (quantity <= 0) {
      setQuantity(serviceId, 0);
      return;
    }
    setQuantity(serviceId, quantity);
  }

  function selectCustomer(selected: Customer) {
    setCustomerDraft({
      id: selected.id,
      query: selected.name,
      name: selected.name,
      phone: selected.phone,
      email: selected.email,
      address: selected.address,
    });
    setShowCustomers(false);
  }

  function resetOrder() {
    clearCart();
    clearCustomerDraft();
    setDiscount(0);
    setAmountPaid(0);
    setPaymentMethod("cash");
    setSupplyDate(today());
    setNotes("");
    setSavedReceipt(null);
    setMessage("");
  }

  async function complete(printAfter: boolean) {
    if (!cart.length) {
      setMessage("Add at least one service to the order.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await api<{ order: OrderDetail }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId,
          saveCustomer,
          customer,
          items: cart.map((item) => ({
            serviceId: item.serviceId,
            quantity: item.quantity,
          })),
          discount: totals.discount,
          amountPaid: totals.amountPaid,
          paymentMethod,
          supplyDate,
          notes,
        }),
      });
      const receipt = receiptFromDetail(result.order);
      flushSync(() => {
        setSavedReceipt(receipt);
        clearCart();
        clearCustomerDraft();
        setDiscount(0);
        setAmountPaid(0);
        setNotes("");
      });
      setMessage(`Order ${receipt.invoiceNumber} saved successfully.`);
      await onSaved();
      if (printAfter) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => window.print());
        });
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="billing-layout">
      <section className="billing-workspace">
        <header className="page-heading">
          <div>
            <p className="eyebrow">FRONT DESK</p>
            <h2>New laundry order</h2>
          </div>
          <button className="secondary-button" onClick={resetOrder}>
            Clear order
          </button>
        </header>

        {message && (
          <div className={`alert ${message.includes("saved") ? "success" : ""}`}>
            {message}
          </div>
        )}

        <section className="customer-panel card">
          <div className="section-heading">
            <div>
              <span className="step">01</span>
              <h3>Customer</h3>
            </div>
            {customerId && <span className="saved-chip">Saved customer</span>}
          </div>
          <div className="customer-search">
            <label>
              Search or enter customer name
              <input
                value={customerQuery}
                onFocus={() => setShowCustomers(true)}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomerDraft({ query: value, id: null, name: value });
                  setShowCustomers(true);
                }}
                placeholder="Name, mobile, or email"
              />
            </label>
            {showCustomers && (
              <div className="customer-results">
                {matches.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => selectCustomer(item)}
                  >
                    <span>
                      <b>{item.name}</b>
                      <small>{item.email || "No email"}</small>
                    </span>
                    <strong>{item.phone || "No mobile"}</strong>
                  </button>
                ))}
                {!matches.length && (
                  <p>No match. Continue typing to create a new customer.</p>
                )}
              </div>
            )}
          </div>
          <div className="compact-fields">
            <label>
              Mobile
              <input
                value={customer.phone}
                onChange={(event) =>
                  setCustomerDraft({ phone: event.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={customer.email}
                onChange={(event) =>
                  setCustomerDraft({ email: event.target.value })
                }
              />
            </label>
            <label className="span-2">
              Address
              <input
                value={customer.address}
                onChange={(event) =>
                  setCustomerDraft({ address: event.target.value })
                }
              />
            </label>
          </div>
          {!customerId && customer.name && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={saveCustomer}
                onChange={(event) => setSaveCustomer(event.target.checked)}
              />
              Save this customer for future orders
            </label>
          )}
        </section>

        <section className="service-picker card">
          <div className="section-heading">
            <div>
              <span className="step">02</span>
              <h3>Select services</h3>
            </div>
            <span className="muted">Tap an item to add it</span>
          </div>
          <div className="category-groups">
            {catalog
              .filter((category) => category.isActive)
              .map((category) => (
                <div className="category-group" key={category.id}>
                  <div
                    className="category-title"
                    style={{ borderColor: category.color }}
                  >
                    <span style={{ background: category.color }} />
                    <b>{category.name}</b>
                  </div>
                  <div className="service-buttons">
                    {category.services
                      .filter((service) => service.isActive)
                      .map((service) => (
                        <button
                          type="button"
                          key={service.id}
                          style={
                            {
                              "--category-color": category.color,
                            } as React.CSSProperties
                          }
                          onClick={() => addService(category, service)}
                        >
                          <span>{service.name}</span>
                          {service.nameAr && <small>{service.nameAr}</small>}
                          <b>SAR {format.format(service.price)}</b>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="cart-panel card">
          <div className="section-heading">
            <div>
              <span className="step">03</span>
              <h3>Order items</h3>
            </div>
            <span className="item-count">{cart.length} lines</span>
          </div>
          {!cart.length ? (
            <div className="empty-state">Select services above to begin.</div>
          ) : (
            <div className="cart-list">
              {cart.map((item) => (
                <div className="cart-line" key={item.serviceId}>
                  <span
                    className="category-dot"
                    style={{ background: item.categoryColor }}
                  />
                  <div>
                    <b>{item.serviceName}</b>
                    <small>
                      {item.categoryName} · SAR {format.format(item.unitPrice)}
                    </small>
                  </div>
                  <div className="quantity-control">
                    <button
                      onClick={() =>
                        changeQuantity(item.serviceId, item.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <input
                      aria-label={`${item.serviceName} quantity`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) =>
                        changeQuantity(
                          item.serviceId,
                          Number(event.target.value),
                        )
                      }
                    />
                    <button
                      onClick={() =>
                        changeQuantity(item.serviceId, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                  </div>
                  <strong>
                    SAR {format.format(item.unitPrice * item.quantity * 1.15)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="payment-panel card">
          <div className="section-heading">
            <div>
              <span className="step">04</span>
              <h3>Payment</h3>
            </div>
            <span className={`status-pill ${totals.paymentStatus}`}>
              {totals.paymentStatus}
            </span>
          </div>
          <div className="payment-grid">
            <div>
              <span className="field-label">Payment method</span>
              <div className="segment">
                <button
                  className={paymentMethod === "cash" ? "active" : ""}
                  onClick={() => setPaymentMethod("cash")}
                >
                  Cash
                </button>
                <button
                  className={paymentMethod === "card" ? "active" : ""}
                  onClick={() => setPaymentMethod("card")}
                >
                  Card
                </button>
              </div>
            </div>
            <label>
              Discount (SAR)
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(Number(event.target.value))}
              />
            </label>
            <label>
              Advance / amount paid (SAR)
              <input
                type="number"
                min="0"
                max={totals.totalAmount}
                step="0.01"
                value={amountPaid}
                onChange={(event) => setAmountPaid(Number(event.target.value))}
              />
            </label>
            <div>
              <span className="field-label">Quick status</span>
              <div className="segment">
                <button onClick={() => setAmountPaid(0)}>Unpaid</button>
                <button onClick={() => setAmountPaid(totals.totalAmount)}>
                  Paid in full
                </button>
              </div>
            </div>
            <label>
              Supply date
              <input
                type="date"
                value={supplyDate}
                onChange={(event) => setSupplyDate(event.target.value)}
              />
            </label>
            <label>
              Order note
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>
          <div className="checkout-summary">
            <div>
              <span>Subtotal</span>
              <b>SAR {format.format(totals.subtotal)}</b>
            </div>
            <div>
              <span>VAT 15%</span>
              <b>SAR {format.format(totals.vatAmount)}</b>
            </div>
            <div className="checkout-total">
              <span>Total</span>
              <b>SAR {format.format(totals.totalAmount)}</b>
            </div>
            <div>
              <span>Balance</span>
              <b>SAR {format.format(totals.balance)}</b>
            </div>
          </div>
          <div className="checkout-actions">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => complete(false)}
            >
              Save order
            </button>
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => complete(true)}
            >
              {busy ? (
                <>
                  <MuiCircularProgress size={16} color="inherit" /> Saving…
                </>
              ) : (
                "Save & print invoice"
              )}
            </button>
          </div>
        </section>
      </section>

      <aside className="invoice-preview-panel">
        <div className="preview-toolbar">
          <div>
            <span className="live-dot" />
            PRINTABLE PREVIEW
          </div>
          {savedReceipt && (
            <button onClick={() => window.print()}>Print again</button>
          )}
        </div>
        <Receipt shop={shop} receipt={savedReceipt ?? draftReceipt} />
      </aside>
    </div>
  );
}
