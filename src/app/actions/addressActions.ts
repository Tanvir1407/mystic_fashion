"use server";

import prisma from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth";

// ─── SAVE SHIPPING ADDRESS ──────────────────────────────────────────────────
export async function saveCustomerAddressAction(payload: {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  district: string;
  address: string;
  pathaoCityId?: number | null;
  pathaoZoneId?: number | null;
  pathaoAreaId?: number | null;
  zoneName?: string;
  areaName?: string;
  isDefault?: boolean;
}): Promise<{ success: boolean; error?: string; addressId?: string }> {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return { success: false, error: "Unauthorized. Please login to save address." };
    }

    const { customerId } = session;

    if (!payload.label || !payload.fullName || !payload.phone || !payload.district || !payload.address) {
      return { success: false, error: "Missing required shipping address fields." };
    }

    // 1. Enforce max 2 addresses rule
    if (!payload.id) {
      const addressCount = await prisma.customerAddress.count({
        where: { customerId }
      });
      if (addressCount >= 2) {
        return { 
          success: false, 
          error: "Maximum limit reached. You can only save up to 2 addresses (e.g. Home and Office)." 
        };
      }
    }

    // If default is checked, reset other defaults for this customer
    if (payload.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false }
      });
    } else {
      // If this is their first address, make it default automatically
      const currentCount = await prisma.customerAddress.count({
        where: { customerId }
      });
      if (currentCount === 0) {
        payload.isDefault = true;
      }
    }

    let savedAddress;
    if (payload.id) {
      // Verify ownership
      const existing = await prisma.customerAddress.findFirst({
        where: { id: payload.id, customerId }
      });
      if (!existing) {
        return { success: false, error: "Address not found or unauthorized." };
      }

      savedAddress = await prisma.customerAddress.update({
        where: { id: payload.id },
        data: {
          label: payload.label.trim(),
          fullName: payload.fullName.trim(),
          phone: payload.phone.trim(),
          district: payload.district.trim(),
          address: payload.address.trim(),
          pathaoCityId: payload.pathaoCityId,
          pathaoZoneId: payload.pathaoZoneId,
          pathaoAreaId: payload.pathaoAreaId,
          zoneName: payload.zoneName || null,
          areaName: payload.areaName || null,
          isDefault: payload.isDefault ?? false
        }
      });
    } else {
      savedAddress = await prisma.customerAddress.create({
        data: {
          customerId,
          label: payload.label.trim(),
          fullName: payload.fullName.trim(),
          phone: payload.phone.trim(),
          district: payload.district.trim(),
          address: payload.address.trim(),
          pathaoCityId: payload.pathaoCityId,
          pathaoZoneId: payload.pathaoZoneId,
          pathaoAreaId: payload.pathaoAreaId,
          zoneName: payload.zoneName || null,
          areaName: payload.areaName || null,
          isDefault: payload.isDefault ?? false
        }
      });
    }

    return { success: true, addressId: savedAddress.id };
  } catch (error: any) {
    console.error("[saveCustomerAddressAction] Error:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

// ─── DELETE SHIPPING ADDRESS ────────────────────────────────────────────────
export async function deleteCustomerAddressAction(addressId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return { success: false, error: "Unauthorized." };
    }

    const { customerId } = session;

    // Verify ownership
    const existing = await prisma.customerAddress.findFirst({
      where: { id: addressId, customerId }
    });

    if (!existing) {
      return { success: false, error: "Address not found or unauthorized." };
    }

    await prisma.customerAddress.delete({
      where: { id: addressId }
    });

    // If the deleted address was default, make the remaining one default (if any exists)
    if (existing.isDefault) {
      const nextAddress = await prisma.customerAddress.findFirst({
        where: { customerId }
      });
      if (nextAddress) {
        await prisma.customerAddress.update({
          where: { id: nextAddress.id },
          data: { isDefault: true }
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("[deleteCustomerAddressAction] Error:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}
