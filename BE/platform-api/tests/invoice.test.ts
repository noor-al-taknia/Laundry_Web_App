import { describe, expect, it } from "vitest";
import { calculateInvoice, vatQrPayload } from "../lib/invoice";

describe("invoice calculation", () => {
  it("calculates VAT, advance and balance using currency rounding", () => {
    expect(
      calculateInvoice(
        [
          { unitPrice: 10, quantity: 2 },
          { unitPrice: 7.5, quantity: 1 },
        ],
        2.5,
        10,
      ),
    ).toEqual({
      subtotal: 27.5,
      discount: 2.5,
      taxable: 25,
      vatAmount: 3.75,
      totalAmount: 28.75,
      amountPaid: 10,
      balance: 18.75,
      paymentStatus: "partial",
    });
  });

  it("clamps discount and paid amount to preserve valid totals", () => {
    const result = calculateInvoice([{ unitPrice: 10, quantity: 1 }], 99, 99);
    expect(result.totalAmount).toBe(0);
    expect(result.balance).toBe(0);
    expect(result.paymentStatus).toBe("unpaid");
  });
});

describe("VAT QR", () => {
  it("encodes all five required TLV fields in Base64", () => {
    const encoded = vatQrPayload({
      seller: "Pearl Laundry",
      vatNumber: "310000000000003",
      timestamp: "2026-07-29T12:00:00+03:00",
      total: 115,
      vat: 15,
    });
    const bytes = Buffer.from(encoded, "base64");
    const tags: number[] = [];
    for (let index = 0; index < bytes.length; ) {
      tags.push(bytes[index]);
      index += 2 + bytes[index + 1];
    }
    expect(tags).toEqual([1, 2, 3, 4, 5]);
  });
});
