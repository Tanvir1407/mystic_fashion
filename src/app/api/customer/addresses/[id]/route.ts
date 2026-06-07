import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCustomerSessionFromRequest(req);
    if (!session || !session.customerId) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { customerId } = session;
    const addressId = params.id;

    if (!addressId) {
      return NextResponse.json({ success: false, error: "Address ID is required." }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.customerAddress.findFirst({
      where: { id: addressId, customerId }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Address not found or unauthorized." },
        { status: 404 }
      );
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

    return NextResponse.json({
      success: true,
      message: "Address deleted successfully."
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
