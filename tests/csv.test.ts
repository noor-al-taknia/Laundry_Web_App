import { describe, expect, it } from "vitest";
import {
  customerHeaders,
  normalizeHeader,
  toCsv,
  validateHeaders,
} from "../lib/csv";

describe("CSV import/export helpers", () => {
  it("normalizes spreadsheet headers consistently", () => {
    expect(normalizeHeader(" VAT Number ")).toBe("vat_number");
  });

  it("reports missing required headers", () => {
    expect(validateHeaders(["name", "phone"], customerHeaders)).toContain(
      "email",
    );
  });

  it("quotes commas and quote marks safely", () => {
    expect(toCsv(["name"], [['Pearl, "Main"']])).toBe(
      'name\r\n"Pearl, ""Main"""',
    );
  });
});
