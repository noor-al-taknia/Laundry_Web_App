"use client";

import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

type Item = {
  id: number;
  name: string;
  unitPrice: number;
  quantity: number;
};

type Invoice = {
  sellerName: string;
  sellerNameAr: string;
  vatNumber: string;
  sellerAddress: string;
  sellerPhone: string;
  buyerName: string;
  buyerAddress: string;
  buyerPhone: string;
  invoiceNumber: string;
  invoiceDateTime: string;
  supplyDate: string;
  status: "Paid" | "Unpaid";
  discount: number;
  items: Item[];
};

const VAT_RATE = 0.15;
const currency = new Intl.NumberFormat("en-SA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function localDateTimeValue(date = new Date()) {
  const riyadhTime = new Date(date.getTime() + 3 * 60 * 60_000);
  return riyadhTime.toISOString().slice(0, 16);
}

function initialInvoice(): Invoice {
  const now = new Date();
  return {
    sellerName: "PEARL LAUNDRY",
    sellerNameAr: "شركة بيرل بوليسر",
    vatNumber: "314521232800003",
    sellerAddress: "Riyadh, Saudi Arabia",
    sellerPhone: "",
    buyerName: "MANSOOR",
    buyerAddress: "Riyadh",
    buyerPhone: "",
    invoiceNumber: "1",
    invoiceDateTime: localDateTimeValue(now),
    supplyDate: localDateTimeValue(now).slice(0, 10),
    status: "Unpaid",
    discount: 0,
    items: [
      { id: 1, name: "BATH MAT", unitPrice: 1, quantity: 1 },
      { id: 2, name: "BED RUNNER", unitPrice: 1.2, quantity: 1 },
      { id: 3, name: "BED SKIRTING", unitPrice: 1.5, quantity: 1 },
      { id: 4, name: "BELT", unitPrice: 5, quantity: 1 },
    ],
  };
}

function toIsoWithOffset(value: string) {
  if (!value) return "";
  return `${value.length === 16 ? `${value}:00` : value}+03:00`;
}

function toTLV(tag: number, value: string) {
  const bytes = new TextEncoder().encode(String(value));
  return new Uint8Array([tag, bytes.length, ...bytes]);
}

function generateZatcaData({
  sellerName,
  vatNumber,
  invoiceDateTime,
  totalWithVat,
  vatAmount,
}: {
  sellerName: string;
  vatNumber: string;
  invoiceDateTime: string;
  totalWithVat: number;
  vatAmount: number;
}) {
  const fields = [
    toTLV(1, sellerName),
    toTLV(2, vatNumber),
    toTLV(3, invoiceDateTime),
    toTLV(4, totalWithVat.toFixed(2)),
    toTLV(5, vatAmount.toFixed(2)),
  ];
  const length = fields.reduce((sum, field) => sum + field.length, 0);
  const combined = new Uint8Array(length);
  let offset = 0;
  fields.forEach((field) => {
    combined.set(field, offset);
    offset += field.length;
  });
  let binary = "";
  combined.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function formatDateTime(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(`${value.length === 16 ? `${value}:00` : value}+03:00`));
}

export default function Home() {
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [nextItemId, setNextItemId] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [qrVersion, setQrVersion] = useState(0);

  const totals = useMemo(() => {
    const taxable = invoice.items.reduce(
      (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
      0,
    );
    const discount = Math.max(0, Number(invoice.discount || 0));
    const netTaxable = Math.max(0, taxable - discount);
    const vat = netTaxable * VAT_RATE;
    const due = netTaxable + vat;
    const itemCount = invoice.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
    return { taxable, discount, netTaxable, vat, due, itemCount };
  }, [invoice]);

  const errors = useMemo(() => {
    const result: string[] = [];
    if (!invoice.sellerName.trim()) result.push("Seller name is required.");
    if (!invoice.vatNumber.trim()) result.push("VAT number is required.");
    if (!/^\d{15}$/.test(invoice.vatNumber.trim())) {
      result.push("VAT number must contain 15 digits.");
    }
    if (!invoice.invoiceDateTime) result.push("Invoice date and time is required.");
    if (invoice.items.length === 0) result.push("Add at least one invoice item.");
    if (
      invoice.items.some(
        (item) =>
          !item.name.trim() ||
          Number(item.unitPrice) <= 0 ||
          Number(item.quantity) <= 0,
      )
    ) {
      result.push("Every item needs a name, positive price, and positive quantity.");
    }
    if (totals.discount > totals.taxable) {
      result.push("Discount cannot be greater than the taxable amount.");
    }
    return [...new Set(result)];
  }, [invoice, totals.discount, totals.taxable]);

  const qrData = useMemo(
    () =>
      generateZatcaData({
        sellerName: invoice.sellerName,
        vatNumber: invoice.vatNumber,
        invoiceDateTime: toIsoWithOffset(invoice.invoiceDateTime),
        totalWithVat: totals.due,
        vatAmount: totals.vat,
      }),
    // qrVersion intentionally provides a manual refresh control.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qrVersion],
  );

  function update<K extends keyof Invoice>(key: K, value: Invoice[K]) {
    setInvoice((current) => ({ ...current, [key]: value }));
  }

  function updateItem(id: number, patch: Partial<Item>) {
    setInvoice((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addItem() {
    setInvoice((current) => ({
      ...current,
      items: [
        ...current.items,
        { id: nextItemId, name: "NEW SERVICE", unitPrice: 1, quantity: 1 },
      ],
    }));
    setNextItemId((id) => id + 1);
  }

  function deleteItem(id: number) {
    setInvoice((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== id),
    }));
  }

  function refreshQr() {
    setSubmitted(true);
    if (errors.length === 0) setQrVersion((version) => version + 1);
  }

  function printInvoice() {
    setSubmitted(true);
    if (errors.length === 0) {
      setQrVersion((version) => version + 1);
      window.setTimeout(() => window.print(), 50);
    }
  }

  function resetInvoice() {
    setInvoice(initialInvoice());
    setNextItemId(5);
    setSubmitted(false);
    setQrVersion((version) => version + 1);
  }

  const field = <K extends keyof Invoice>(
    label: string,
    key: K,
    options?: {
      type?: string;
      placeholder?: string;
      dir?: "rtl";
      required?: boolean;
    },
  ) => (
    <label className="field">
      <span>
        {label}
        {options?.required && <b aria-hidden="true"> *</b>}
      </span>
      <input
        aria-label={label}
        dir={options?.dir}
        type={options?.type || "text"}
        placeholder={options?.placeholder}
        required={options?.required}
        value={String(invoice[key])}
        onChange={(event) =>
          update(
            key,
            (options?.type === "number"
              ? Number(event.target.value)
              : event.target.value) as Invoice[K],
          )
        }
      />
    </label>
  );

  return (
    <main className="app-shell">
      <header className="topbar no-print">
        <div className="brand-mark" aria-hidden="true">
          P
        </div>
        <div>
          <p className="eyebrow">PEARL LAUNDRY · BILLING DESK</p>
          <h1>Tax invoice studio</h1>
        </div>
        <div className="phase-chip">
          <span />
          ZATCA Phase 1
        </div>
      </header>

      <section className="workspace">
        <div className="editor no-print">
          <div className="editor-intro">
            <div>
              <p className="section-kicker">Invoice editor</p>
              <h2>Build a compliant laundry bill</h2>
            </div>
            <p>All amounts are in Saudi riyals (SAR). VAT is fixed at 15%.</p>
          </div>

          {submitted && errors.length > 0 && (
            <div className="validation" role="alert">
              <strong>Please check the invoice</strong>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <section className="form-card">
            <div className="form-heading">
              <span>01</span>
              <div>
                <h3>Seller details</h3>
                <p>Your registered shop information</p>
              </div>
            </div>
            <div className="field-grid">
              {field("Seller name (English)", "sellerName", { required: true })}
              {field("Seller name (Arabic)", "sellerNameAr", {
                dir: "rtl",
                placeholder: "اسم البائع",
              })}
              {field("VAT number", "vatNumber", { required: true })}
              {field("Phone number", "sellerPhone", { type: "tel" })}
              <div className="span-2">
                {field("Address / العنوان", "sellerAddress")}
              </div>
            </div>
          </section>

          <section className="form-card">
            <div className="form-heading">
              <span>02</span>
              <div>
                <h3>Buyer details</h3>
                <p>Customer information for this bill</p>
              </div>
            </div>
            <div className="field-grid">
              {field("Buyer name / اسم العميل", "buyerName")}
              {field("Mobile number", "buyerPhone", { type: "tel" })}
              <div className="span-2">
                {field("Buyer address / عنوان العميل", "buyerAddress")}
              </div>
            </div>
          </section>

          <section className="form-card">
            <div className="form-heading">
              <span>03</span>
              <div>
                <h3>Invoice details</h3>
                <p>Reference, timing, and payment status</p>
              </div>
            </div>
            <div className="field-grid">
              {field("Invoice number / رقم الفاتورة", "invoiceNumber")}
              {field("Invoice date & time", "invoiceDateTime", {
                type: "datetime-local",
                required: true,
              })}
              {field("Date of supply", "supplyDate", { type: "date" })}
              <label className="field">
                <span>Payment status</span>
                <select
                  aria-label="Payment status"
                  value={invoice.status}
                  onChange={(event) =>
                    update("status", event.target.value as "Paid" | "Unpaid")
                  }
                >
                  <option>Paid</option>
                  <option>Unpaid</option>
                </select>
              </label>
              {field("Discount amount", "discount", {
                type: "number",
              })}
            </div>
          </section>

          <section className="form-card items-card">
            <div className="form-heading items-heading">
              <span>04</span>
              <div>
                <h3>Laundry items</h3>
                <p>Price each service before VAT</p>
              </div>
              <button className="small-action" type="button" onClick={addItem}>
                + Add item
              </button>
            </div>
            <div className="items-editor">
              <div className="item-labels" aria-hidden="true">
                <span>Service</span>
                <span>Unit price</span>
                <span>Qty</span>
                <span />
              </div>
              {invoice.items.map((item, index) => (
                <div className="item-row" key={item.id}>
                  <div className="item-index">{String(index + 1).padStart(2, "0")}</div>
                  <input
                    aria-label={`Item ${index + 1} name`}
                    value={item.name}
                    onChange={(event) =>
                      updateItem(item.id, { name: event.target.value })
                    }
                  />
                  <div className="money-input">
                    <span>SAR</span>
                    <input
                      aria-label={`Item ${index + 1} unit price`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(item.id, {
                          unitPrice: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <input
                    aria-label={`Item ${index + 1} quantity`}
                    className="quantity-input"
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(item.id, {
                        quantity: Number(event.target.value),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="delete-button"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => deleteItem(item.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
              {invoice.items.length === 0 && (
                <div className="empty-items">
                  No services yet. Add at least one item to create an invoice.
                </div>
              )}
            </div>
          </section>

          <div className="actions">
            <button className="button button-secondary" onClick={refreshQr}>
              <span aria-hidden="true">↻</span> Refresh QR
            </button>
            <button className="button button-ghost" onClick={resetInvoice}>
              New invoice
            </button>
            <button className="button button-primary" onClick={printInvoice}>
              Print invoice <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>

        <aside className="preview-panel">
          <div className="preview-label no-print">
            <div>
              <span className="live-dot" />
              LIVE PREVIEW
            </div>
            <span>80 mm thermal receipt</span>
          </div>

          <article className="receipt" id="invoice-receipt">
            <div className="receipt-top-rule" />
            <header className="receipt-header">
              <div className="receipt-monogram">PL</div>
              <h2>{invoice.sellerName || "SELLER NAME"}</h2>
              <h3 dir="rtl">{invoice.sellerNameAr || "اسم المغسلة"}</h3>
              <p>{invoice.sellerAddress || "—"}</p>
              {invoice.sellerPhone && <p>Tel: {invoice.sellerPhone}</p>}
            </header>

            <div className="tax-title">
              <span>TAX INVOICE</span>
              <b dir="rtl">الفاتورة الضريبية</b>
            </div>

            <dl className="receipt-details">
              <div>
                <dt>VAT No. / الرقم الضريبي</dt>
                <dd>{invoice.vatNumber || "—"}</dd>
              </div>
              <div>
                <dt>Invoice No. / رقم الفاتورة</dt>
                <dd>#{invoice.invoiceNumber || "—"}</dd>
              </div>
              <div>
                <dt>Invoice Date / تاريخ الإصدار</dt>
                <dd>{formatDateTime(invoice.invoiceDateTime)}</dd>
              </div>
              <div>
                <dt>Date of Supply / تاريخ التوريد</dt>
                <dd>{invoice.supplyDate || "—"}</dd>
              </div>
            </dl>

            <section className="buyer-block">
              <p className="receipt-section-title">BUYER / العميل</p>
              <div>
                <span>Name / الاسم</span>
                <b>{invoice.buyerName || "Walk-in customer"}</b>
              </div>
              <div>
                <span>Address / العنوان</span>
                <b>{invoice.buyerAddress || "—"}</b>
              </div>
              {invoice.buyerPhone && (
                <div>
                  <span>Mobile / الجوال</span>
                  <b>{invoice.buyerPhone}</b>
                </div>
              )}
            </section>

            <table className="receipt-items">
              <thead>
                <tr>
                  <th>Service<br /><small>الخدمة</small></th>
                  <th>Price<br /><small>السعر</small></th>
                  <th>Qty<br /><small>الكمية</small></th>
                  <th>Total<br /><small>المجموع</small></th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => {
                  const lineTaxable = Number(item.unitPrice) * Number(item.quantity);
                  const lineTotal = lineTaxable * (1 + VAT_RATE);
                  return (
                    <tr key={item.id}>
                      <td>{item.name || "—"}</td>
                      <td>{currency.format(Number(item.unitPrice || 0))}</td>
                      <td>{item.quantity || 0}</td>
                      <td>{currency.format(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="receipt-totals">
              <div>
                <span>Taxable amount (excl. VAT)</span>
                <b>{currency.format(totals.taxable)}</b>
              </div>
              <div>
                <span>Discount / الخصم</span>
                <b>− {currency.format(totals.discount)}</b>
              </div>
              <div>
                <span>Total VAT 15% / مجموع الضريبة</span>
                <b>{currency.format(totals.vat)}</b>
              </div>
              <div className="grand-total">
                <span>
                  TOTAL AMOUNT DUE
                  <small dir="rtl">إجمالي المبلغ المستحق</small>
                </span>
                <b>
                  <small>SAR</small> {currency.format(totals.due)}
                </b>
              </div>
            </div>

            <div className="summary-strip">
              <div>
                <span>ITEMS</span>
                <b>{totals.itemCount}</b>
              </div>
              <div>
                <span>STATUS</span>
                <b className={invoice.status === "Paid" ? "paid" : "unpaid"}>
                  {invoice.status.toUpperCase()}
                </b>
              </div>
              <div>
                <span>BALANCE</span>
                <b>
                  {currency.format(invoice.status === "Paid" ? 0 : totals.due)}
                </b>
              </div>
            </div>

            <section className="qr-block">
              <div className="qr-frame">
                <QRCodeCanvas
                  value={qrData}
                  size={128}
                  level="M"
                  marginSize={2}
                  title="ZATCA Phase 1 QR code"
                />
              </div>
              <div>
                <b>ZATCA PHASE 1</b>
                <span>Scan to verify invoice data</span>
                <small>TLV · Base64 · UTF-8</small>
              </div>
            </section>

            <footer className="receipt-footer">
              <p>Thank you for choosing our laundry service.</p>
              <p dir="rtl">شكرًا لاختياركم خدمات المغسلة</p>
              <small>Printed: {formatDateTime(localDateTimeValue())}</small>
            </footer>
            <div className="receipt-bottom-rule" />
          </article>
        </aside>
      </section>
    </main>
  );
}
