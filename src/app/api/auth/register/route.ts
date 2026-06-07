import { NextRequest, NextResponse } from "next/server";
import { registerCustomerAction } from "@/app/actions/customerAuth";
import prisma from "@/lib/prisma";
import { createCustomerSession } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const registerRes = await registerCustomerAction(payload);
    if (!registerRes.success) {
      return NextResponse.json(
        { success: false, error: registerRes.error },
        { status: 400 }
      );
    }

    // Retrieve registration profile to sign token and return
    const normalized = normalizePhone(payload.phone);
    if (!normalized) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number formatting." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { phone: normalized },
      select: { id: true, name: true, phone: true, email: true, createdAt: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer registration failed to verify." },
        { status: 500 }
      );
    }

    // Generate JWT token using the session helper
    const token = await createCustomerSession({
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    });

    return NextResponse.json({
      success: true,
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        createdAt: customer.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
