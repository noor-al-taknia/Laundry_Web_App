export const customerHeaders = [
  "name",
  "phone",
  "email",
  "address",
  "vat_number",
  "notes",
] as const;

export const catalogHeaders = [
  "category_name",
  "category_color",
  "item_name",
  "item_name_ar",
  "price",
  "sort_order",
] as const;

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function validateHeaders(
  actual: string[],
  required: readonly string[],
) {
  const normalized = new Set(actual.map(normalizeHeader));
  return required.filter((header) => !normalized.has(header));
}

export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(headers: readonly string[], rows: unknown[][]) {
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");
}
