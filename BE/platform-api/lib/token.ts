const TOKEN_PATTERN = /^T-(\d{6})-(\d{4,})$/;

export function formatOrderToken(businessDate: string, sequence: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
    throw new Error("Order token requires an ISO business date.");
  }
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error("Order token sequence must be a positive integer.");
  }
  return `T-${businessDate.replaceAll("-", "").slice(2)}-${String(sequence).padStart(4, "0")}`;
}

export function isOrderToken(value: string) {
  return TOKEN_PATTERN.test(value.trim().toUpperCase());
}
