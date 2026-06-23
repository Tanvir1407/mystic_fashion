/**
 * Rounds a price to the nearest integer using standard rounding:
 *   >= .5 decimal → round up  (e.g. 2698.8 → 2699)
 *   <  .5 decimal → round down (e.g. 2698.4 → 2698)
 */
export function roundPrice(price: number): number {
  return Math.round(price);
}

/**
 * Safely parses a price value from various formats (number, string, Decimal object).
 */
export function parsePrice(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (typeof obj.toNumber === "function") {
      return (obj as { toNumber: () => number }).toNumber();
    }
    if (obj.d && Array.isArray(obj.d)) {
      const sign = obj.s === -1 ? "-" : "";
      const base = (obj.d as number[]).join("");
      const exponent = typeof obj.e === "number" ? (obj.e as number) : 0;
      const parsed = parseFloat(sign + base) * Math.pow(10, exponent - (base.length - 1));
      return isNaN(parsed) ? 0 : parsed;
    }
  }
  return Number(val) || 0;
}

/**
 * Formats a price as a BDT string with no decimal places.
 * Uses standard rounding before formatting.
 *
 * @param price     - The numeric price value
 * @param zeroLabel - Optional label to return when price is 0 (e.g. "Free")
 */
export function formatBDT(price: number, zeroLabel?: string): string {
  const rounded = roundPrice(price);
  if (zeroLabel !== undefined && rounded === 0) return zeroLabel;
  return `৳${rounded.toLocaleString("en-IN")}`;
}
