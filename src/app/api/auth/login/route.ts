import { NextRequest, NextResponse } from "next/server";
import { loginCustomerAction } from "@/app/actions/customerAuth";
import prisma from "@/lib/prisma";
import { createCustomerSession } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { emailOrPhone, password } = await req.json();

    if (!emailOrPhone || !password) {
      return NextResponse.json(
        { success: false, error: "Email/Phone and password are required." },
        { status: 400 }
      );
    }

    const loginRes = await loginCustomerAction(emailOrPhone, password);
    if (!loginRes.success) {
      return NextResponse.json(
        { success: false, error: loginRes.error },
        { status: 400 }
      );
    }

    // Retrieve customer details to sign token and return
    const cleanInput = emailOrPhone.trim();
    let customer = null;

    if (EMAIL_REGEX.test(cleanInput.toLowerCase())) {
      customer = await prisma.customer.findUnique({
        where: { email: cleanInput.toLowerCase() },
        select: { id: true, name: true, phone: true, email: true, createdAt: true },
      });
    } else {
      const normalized = normalizePhone(cleanInput);
      if (normalized) {
        customer = await prisma.customer.findUnique({
          where: { phone: normalized },
          select: { id: true, name: true, phone: true, email: true, createdAt: true },
        });
      }
    }

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found." },
        { status: 404 }
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
