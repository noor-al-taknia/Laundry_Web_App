export function numericId() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return bytes.reduce((value, byte) => value * 256 + byte, 0);
}
