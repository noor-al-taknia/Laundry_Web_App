"use client";

import { QRCodeCanvas } from "qrcode.react";
import { vatQrPayload } from "../../lib/invoice";
import type { OrderItem, Shop } from "../types";

export type ReceiptData = {
  invoiceNumber: string;
  orderDateTime: string;
  supplyDate: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: "cash" | "card";
  paymentStatus: "paid" | "unpaid" | "partial";
  subtotal: number;
  discount: number;
  vatAmount: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  items: OrderItem[];
};

const amount = new Intl.NumberFormat("en-SA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function qrValue(shop: Shop, receipt: ReceiptData) {
  const dateValue = receipt.orderDateTime.includes("T")
    ? receipt.orderDateTime
    : `${receipt.orderDateTime}T00:00:00+03:00`;
  return vatQrPayload({
    seller: shop.shopName,
    vatNumber: shop.vatNumber,
    timestamp: dateValue,
    total: receipt.totalAmount,
    vat: receipt.vatAmount,
  });
}

function dateLabel(value: string) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00+03:00`);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
    timeZone: "Asia/Riyadh",
  }).format(date);
}

export function Receipt({
  shop,
  receipt,
}: {
  shop: Shop;
  receipt: ReceiptData;
}) {
  return (
    <article className="receipt" id="invoice-receipt">
      <div className="receipt-top-rule" />
      <header className="receipt-header">
        <div className="receipt-monogram">
          {shop.shopName
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </div>
        <h2>{shop.shopName}</h2>
        {shop.shopNameAr && <h3 dir="rtl">{shop.shopNameAr}</h3>}
        <p>{shop.address}</p>
        {shop.phone && <p>Tel: {shop.phone}</p>}
        {shop.commercialNumber && <p>CR: {shop.commercialNumber}</p>}
      </header>

      <div className="tax-title">
        <span>TAX INVOICE</span>
        <b dir="rtl">الفاتورة الضريبية</b>
      </div>

      <dl className="receipt-details">
        <div>
          <dt>VAT No. / الرقم الضريبي</dt>
          <dd>{shop.vatNumber || "—"}</dd>
        </div>
        <div>
          <dt>Invoice No. / رقم الفاتورة</dt>
          <dd>{receipt.invoiceNumber}</dd>
        </div>
        <div>
          <dt>Invoice Date / تاريخ الإصدار</dt>
          <dd>{dateLabel(receipt.orderDateTime)}</dd>
        </div>
        <div>
          <dt>Supply Date / تاريخ التوريد</dt>
          <dd>{receipt.supplyDate}</dd>
        </div>
      </dl>

      <section className="buyer-block">
        <p className="receipt-section-title">CUSTOMER / العميل</p>
        <div>
          <span>Name / الاسم</span>
          <b>{receipt.customerName || "Walk-in Customer"}</b>
        </div>
        {receipt.customerPhone && (
          <div>
            <span>Mobile / الجوال</span>
            <b>{receipt.customerPhone}</b>
          </div>
        )}
        {receipt.customerAddress && (
          <div>
            <span>Address / العنوان</span>
            <b>{receipt.customerAddress}</b>
          </div>
        )}
      </section>

      <table className="receipt-items">
        <thead>
          <tr>
            <th>
              Service
              <br />
              <small>الخدمة</small>
            </th>
            <th>
              Price
              <br />
              <small>السعر</small>
            </th>
            <th>
              Qty
              <br />
              <small>الكمية</small>
            </th>
            <th>
              Total
              <br />
              <small>المجموع</small>
            </th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item, index) => (
            <tr key={`${item.serviceId}-${index}`}>
              <td>{item.serviceName}</td>
              <td>{amount.format(item.unitPrice)}</td>
              <td>{item.quantity}</td>
              <td>{amount.format(item.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="receipt-totals">
        <div>
          <span>Taxable amount (excl. VAT)</span>
          <b>{amount.format(receipt.subtotal)}</b>
        </div>
        <div>
          <span>Discount / الخصم</span>
          <b>− {amount.format(receipt.discount)}</b>
        </div>
        <div>
          <span>Total VAT 15% / مجموع الضريبة</span>
          <b>{amount.format(receipt.vatAmount)}</b>
        </div>
        <div className="grand-total">
          <span>
            TOTAL AMOUNT
            <small dir="rtl">إجمالي المبلغ</small>
          </span>
          <b>
            <small>SAR</small> {amount.format(receipt.totalAmount)}
          </b>
        </div>
        <div>
          <span>Advance / المدفوع</span>
          <b>{amount.format(receipt.amountPaid)}</b>
        </div>
        <div>
          <span>Balance / المتبقي</span>
          <b>{amount.format(receipt.balance)}</b>
        </div>
      </div>

      <div className="summary-strip">
        <div>
          <span>ITEMS</span>
          <b>{receipt.items.reduce((sum, item) => sum + item.quantity, 0)}</b>
        </div>
        <div>
          <span>PAYMENT</span>
          <b>{receipt.paymentMethod.toUpperCase()}</b>
        </div>
        <div>
          <span>STATUS</span>
          <b>{receipt.paymentStatus.toUpperCase()}</b>
        </div>
      </div>

      <section className="qr-block">
        <div className="qr-frame">
          <QRCodeCanvas
            value={qrValue(shop, receipt)}
            size={132}
            level="M"
            marginSize={2}
            title="Invoice verification QR code"
          />
        </div>
        <div>
          <b>INVOICE QR</b>
          <span>Scan for tax invoice data</span>
          <small>VAT · TOTAL · DATE</small>
        </div>
      </section>

      <footer className="receipt-footer">
        <p>{shop.receiptFooter}</p>
        <small>Computer-generated tax invoice</small>
      </footer>
      <div className="receipt-bottom-rule" />
    </article>
  );
}
