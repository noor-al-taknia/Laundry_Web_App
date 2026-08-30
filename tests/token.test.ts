import { describe, expect, it } from "vitest";
import { formatOrderToken, isOrderToken } from "../lib/token";

describe("order tokens", () => {
  it("creates a date-scoped, padded, searchable token", () => {
    expect(formatOrderToken("2026-08-30", 7)).toBe("T-260830-0007");
    expect(isOrderToken("t-260830-0007")).toBe(true);
  });

  it("keeps sequences above four digits unique", () => {
    expect(formatOrderToken("2026-08-30", 12001)).toBe("T-260830-12001");
  });

  it("rejects invalid allocation inputs", () => {
    expect(() => formatOrderToken("30-08-2026", 1)).toThrow();
    expect(() => formatOrderToken("2026-08-30", 0)).toThrow();
    expect(isOrderToken("INV-000001")).toBe(false);
  });
});
