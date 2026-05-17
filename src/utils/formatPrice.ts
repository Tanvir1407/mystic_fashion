/**
 * Rounds a price to the nearest integer using standard rounding:
 *   >= .5 decimal → round up  (e.g. 2698.8 → 2699)
 *   <  .5 decimal → round down (e.g. 2698.4 → 2698)
 */
export function roundPrice(price: number): number {
  return Math.round(price);
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
