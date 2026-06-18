/**
 * Formats variant attributes (color, size, weight, dimension, etc.) cleanly.
 * If both color/weight and size/dimension are present and non-default,
 * they are formatted together as "{Color/Weight} / {Size}".
 * Otherwise, it returns the non-default one, or an empty string.
 */
export function formatVariant(item: {
  size?: string | null;
  color?: string | null;
  variant?: {
    size?: string | null;
    color?: string | null;
  } | null;
}): string {
  if (!item) return "";
  const sizeVal = item.variant?.size || item.size || "";
  const colorVal = item.variant?.color || item.color || "";

  const sizeClean = sizeVal && sizeVal !== "Default" && sizeVal !== "none" ? sizeVal : "";
  const colorClean = colorVal && colorVal !== "Default" && colorVal !== "none" ? colorVal : "";

  if (colorClean && sizeClean) {
    return `${colorClean} / ${sizeClean}`;
  }
  return sizeClean || colorClean || "";
}
