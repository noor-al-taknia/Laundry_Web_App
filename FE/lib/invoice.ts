import type { CartItem, OrderItem } from "../app/types";

export const VAT_RATE = 0.15;

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateInvoice(
  cart: Pick<CartItem, "unitPrice" | "quantity">[],
  discountInput: number,
  amountPaidInput: number,
) {
  const subtotal = roundMoney(
    cart.reduce(
      (sum, item) => sum + item.unitPrice * Number(item.quantity || 0),
      0,
    ),
  );
  const discount = Math.min(
    Math.max(0, Number(discountInput || 0)),
    subtotal,
  );
  const taxable = roundMoney(subtotal - discount);
  const vatAmount = roundMoney(taxable * VAT_RATE);
  const totalAmount = roundMoney(taxable + vatAmount);
  const amountPaid = Math.min(
    Math.max(0, Number(amountPaidInput || 0)),
    totalAmount,
  );
  const balance = roundMoney(totalAmount - amountPaid);
  const paymentStatus =
    amountPaid <= 0 ? "unpaid" : balance <= 0 ? "paid" : "partial";
  return {
    subtotal,
    discount,
    taxable,
    vatAmount,
    totalAmount,
    amountPaid,
    balance,
    paymentStatus,
  } as const;
}

export function invoiceItems(cart: CartItem[]): OrderItem[] {
  return cart.map((item) => {
    const taxableAmount = roundMoney(item.unitPrice * item.quantity);
    const vatAmount = roundMoney(taxableAmount * VAT_RATE);
    return {
      serviceId: item.serviceId,
      categoryName: item.categoryName,
      serviceName: item.serviceName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      taxableAmount,
      vatAmount,
      totalAmount: roundMoney(taxableAmount + vatAmount),
    };
  });
}

function tlv(tag: number, value: string) {
  const bytes = new TextEncoder().encode(value);
  return Uint8Array.from([tag, bytes.length, ...bytes]);
}

export function vatQrPayload(input: {
  seller: string;
  vatNumber: string;
  timestamp: string;
  total: number;
  vat: number;
}) {
  const fields = [
    tlv(1, input.seller),
    tlv(2, input.vatNumber),
    tlv(3, input.timestamp),
    tlv(4, input.total.toFixed(2)),
    tlv(5, input.vat.toFixed(2)),
  ];
  const length = fields.reduce((sum, field) => sum + field.length, 0);
  const value = new Uint8Array(length);
  let offset = 0;
  for (const field of fields) {
    value.set(field, offset);
    offset += field.length;
  }
  if (typeof Buffer !== "undefined") return Buffer.from(value).toString("base64");
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
