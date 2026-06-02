import prisma from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";

export interface CartItem {
  id: string; // Product ID
  name: string;
  price: number;
  quantity: number;
  originalPrice?: number;
  requiresPrint?: boolean;
  printCost?: number;
  printDetails?: any[];
}

export interface CouponValidationResult {
  isValid: boolean;
  discountAmount: number;
  appliedItems: string[];
  error?: string;
}

/**
 * Deletes all expired coupon locks from the database.
 */
export async function cleanupExpiredLocks(tx?: any) {
  const client = tx || prisma;
  try {
    await client.couponLock.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  } catch (error) {
    console.error("Failed to cleanup expired coupon locks:", error);
  }
}

/**
 * Validates a coupon code against a set of cart items, customer phone, and session ID.
 * Implements a strict Chain of Responsibility validation flow.
 */
export async function validateCouponRules(
  couponCode: string,
  cartItems: CartItem[],
  deliveryCharge: number,
  phone?: string,
  sessionId?: string,
  tx?: any
): Promise<CouponValidationResult> {
  const client = tx || prisma;

  // 0. Cleanup expired locks
  await cleanupExpiredLocks(client);

  const code = couponCode.trim().toUpperCase();
  if (!code) {
    return { isValid: false, discountAmount: 0, appliedItems: [], error: "Coupon code is empty." };
  }

  // 1. Basic Status Check
  const coupon = await client.coupon.findUnique({
    where: { code },
  });

  if (!coupon || !coupon.isActive || coupon.deletedAt) {
    return { isValid: false, discountAmount: 0, appliedItems: [], error: "Invalid or inactive coupon code." };
  }

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) {
    return { isValid: false, discountAmount: 0, appliedItems: [], error: "This coupon is not yet active." };
  }
  if (coupon.endDate && now > coupon.endDate) {
    return { isValid: false, discountAmount: 0, appliedItems: [], error: "This coupon has expired." };
  }

  const phoneMatch = phone ? normalizePhone(phone) : undefined;

  // Check global limit (usages + active locks excluding the current session)
  const usagesCount = await client.couponUsage.count({
    where: { couponId: coupon.id }
  });

  const locksCount = await client.couponLock.count({
    where: {
      couponId: coupon.id,
      NOT: [
        sessionId ? { sessionId } : {},
        phoneMatch ? { phone: phoneMatch } : {}
      ]
    }
  });

  if (coupon.usageLimitTotal !== null && (usagesCount + locksCount) >= coupon.usageLimitTotal) {
    return { isValid: false, discountAmount: 0, appliedItems: [], error: "This coupon is fully booked/sold out." };
  }

  // 2. User Verification (Check limit per user)
  if (phoneMatch) {
    const userUsages = await client.couponUsage.count({
      where: { couponId: coupon.id, phone: phoneMatch }
    });

    const userLocks = await client.couponLock.count({
      where: {
        couponId: coupon.id,
        phone: phoneMatch,
        NOT: sessionId ? { sessionId } : {}
      }
    });

    if ((userUsages + userLocks) >= coupon.usageLimitPerUser) {
      return {
        isValid: false,
        discountAmount: 0,
        appliedItems: [],
        error: `You have reached the usage limit for this coupon (maximum ${coupon.usageLimitPerUser} per user).`
      };
    }
  }

  // 3. Customer Segment Check
  if (coupon.customerSegment && phoneMatch) {
    const segment = coupon.customerSegment.toUpperCase();

    if (segment === "NEW_USER") {
      const customerOrdersCount = await client.order.count({
        where: {
          phone: phoneMatch,
          status: { not: "CANCELLED" }
        }
      });
      if (customerOrdersCount > 0) {
        return { isValid: false, discountAmount: 0, appliedItems: [], error: "This coupon is valid for new customers only." };
      }
    } else if (segment === "VIP") {
      const completedOrders = await client.order.findMany({
        where: {
          phone: phoneMatch,
          status: "DELIVERED"
        },
        select: { totalAmount: true }
      });
      const totalSpent = completedOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
      if (completedOrders.length < 5 && totalSpent < 15000) {
        return { isValid: false, discountAmount: 0, appliedItems: [], error: "This coupon is restricted to VIP customers." };
      }
    }
  }

  // 4. Cart Eligibility & Targeting Check
  const productIds = cartItems.map(item => item.id);
  const dbProducts = await client.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, categoryId: true, discountId: true, discount: true }
  });

  const dbProductMap = new Map(dbProducts.map(p => [p.id, p]));
  const eligibleItems: CartItem[] = [];
  const appliedItems: string[] = [];

  for (const item of cartItems) {
    const dbProd = dbProductMap.get(item.id) as any;
    if (!dbProd) continue;

    // A: Exclude Sale Items
    const isOnSale = (dbProd.discount && dbProd.discount.active) || (item.originalPrice !== undefined && item.originalPrice > item.price);
    if (coupon.excludeSaleItems && isOnSale) {
      continue; // Excluded because it is already discounted
    }

    // B: Product Whitelist/Blacklist
    if (coupon.excludedProductIds.length > 0 && coupon.excludedProductIds.includes(item.id)) {
      continue; // Blacklisted product
    }
    if (coupon.includedProductIds.length > 0 && !coupon.includedProductIds.includes(item.id)) {
      continue; // Not in whitelisted products
    }

    // C: Category Whitelist/Blacklist
    const catId = dbProd.categoryId;
    if (catId) {
      if (coupon.excludedCategoryIds.length > 0 && coupon.excludedCategoryIds.includes(catId)) {
        continue; // Blacklisted category
      }
      if (coupon.includedCategoryIds.length > 0 && !coupon.includedCategoryIds.includes(catId)) {
        continue; // Not in whitelisted categories
      }
    } else {
      if (coupon.includedCategoryIds.length > 0) {
        continue; // Not in category whitelist since it has no category
      }
    }

    eligibleItems.push(item);
    appliedItems.push(item.id);
  }

  if (eligibleItems.length === 0) {
    return {
      isValid: false,
      discountAmount: 0,
      appliedItems: [],
      error: "This coupon is not applicable to any of the items in your cart."
    };
  }

  // 5. Spend Limits Check
  const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (coupon.minCartValue !== null && eligibleSubtotal < coupon.minCartValue) {
    return {
      isValid: false,
      discountAmount: 0,
      appliedItems: [],
      error: `This coupon requires a minimum spend of ৳${coupon.minCartValue.toLocaleString()} on eligible items.`
    };
  }

  if (coupon.maxCartValue !== null && eligibleSubtotal > coupon.maxCartValue) {
    return {
      isValid: false,
      discountAmount: 0,
      appliedItems: [],
      error: `This coupon is not applicable to carts exceeding ৳${coupon.maxCartValue.toLocaleString()} to prevent exploitation.`
    };
  }

  // 6. Granular Discount Calculation
  let discountAmount = 0;

  if (coupon.type === "FREE_SHIPPING") {
    // Delivery charge is fully waived
    discountAmount = deliveryCharge;
  } else if (coupon.type === "PERCENTAGE") {
    discountAmount = (coupon.value / 100) * eligibleSubtotal;
    if (coupon.maxDiscountAmount !== null) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }
  } else {
    // FLAT coupon type
    discountAmount = coupon.value;
  }

  // Ensure discount does not exceed eligible subtotal (except free shipping which maps to delivery charge)
  if (coupon.type !== "FREE_SHIPPING") {
    discountAmount = Math.min(discountAmount, eligibleSubtotal);
  }

  return {
    isValid: true,
    discountAmount: Math.round(discountAmount * 100) / 100, // round to 2 decimal places
    appliedItems
  };
}
