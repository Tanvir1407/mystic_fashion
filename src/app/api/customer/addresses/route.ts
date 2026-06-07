import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSessionFromRequest(req);
    if (!session || !session.customerId) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const addresses = await prisma.customerAddress.findMany({
      where: { customerId: session.customerId },
      orderBy: { isDefault: "desc" }
    });

    return NextResponse.json({
      success: true,
      addresses: addresses.map((addr) => ({
        id: addr.id,
        label: addr.label,
        fullName: addr.fullName,
        phone: addr.phone,
        district: addr.district,
        address: addr.address,
        pathaoCityId: addr.pathaoCityId,
        pathaoZoneId: addr.pathaoZoneId,
        pathaoAreaId: addr.pathaoAreaId,
        isDefault: addr.isDefault
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSessionFromRequest(req);
    if (!session || !session.customerId) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { customerId } = session;
    const payload = await req.json();

    const {
      id,
      label,
      fullName,
      phone,
      district,
      address,
      pathaoCityId,
      pathaoZoneId,
      pathaoAreaId,
      isDefault
    } = payload;

    if (!label || !fullName || !phone || !district || !address) {
      return NextResponse.json(
        { success: false, error: "Missing required shipping address fields." },
        { status: 400 }
      );
    }

    // 1. Enforce max 2 addresses rule
    if (!id) {
      const addressCount = await prisma.customerAddress.count({
        where: { customerId }
      });
      if (addressCount >= 2) {
        return NextResponse.json(
          { success: false, error: "Maximum limit reached. You can only save up to 2 addresses (e.g. Home and Office)." },
          { status: 400 }
        );
      }
    }

    let isDefaultVal = isDefault ?? false;

    // If default is checked, reset other defaults for this customer
    if (isDefaultVal) {
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
        isDefaultVal = true;
      }
    }

    let savedAddress;
    if (id) {
      // Verify ownership
      const existing = await prisma.customerAddress.findFirst({
        where: { id, customerId }
      });
      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Address not found or unauthorized." },
          { status: 404 }
        );
      }

      savedAddress = await prisma.customerAddress.update({
        where: { id },
        data: {
          label: label.trim(),
          fullName: fullName.trim(),
          phone: phone.trim(),
          district: district.trim(),
          address: address.trim(),
          pathaoCityId: pathaoCityId ? Number(pathaoCityId) : null,
          pathaoZoneId: pathaoZoneId ? Number(pathaoZoneId) : null,
          pathaoAreaId: pathaoAreaId ? Number(pathaoAreaId) : null,
          isDefault: isDefaultVal
        }
      });
    } else {
      savedAddress = await prisma.customerAddress.create({
        data: {
          customerId,
          label: label.trim(),
          fullName: fullName.trim(),
          phone: phone.trim(),
          district: district.trim(),
          address: address.trim(),
          pathaoCityId: pathaoCityId ? Number(pathaoCityId) : null,
          pathaoZoneId: pathaoZoneId ? Number(pathaoZoneId) : null,
          pathaoAreaId: pathaoAreaId ? Number(pathaoAreaId) : null,
          isDefault: isDefaultVal
        }
      });
    }

    return NextResponse.json({
      success: true,
      addressId: savedAddress.id,
      message: "Address saved successfully."
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
