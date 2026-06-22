export function roundPrice(price: number): number {
  return Math.round(price);
}

export function getFinalPrice(
  price: number,
  discount?: { active: boolean; discountType: string; value: number } | null,
): number {
  if (discount?.active) {
    if (discount.discountType === "PERCENTAGE") {
      return roundPrice(price - price * (discount.value / 100));
    }
    return roundPrice(Math.max(0, price - discount.value));
  }
  return roundPrice(price);
}

export function formatPrice(amount: number): string {
  return `৳${roundPrice(amount).toLocaleString("en-IN")}`;
}
