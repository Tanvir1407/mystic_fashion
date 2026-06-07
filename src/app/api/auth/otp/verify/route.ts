import { NextRequest, NextResponse } from "next/server";
import { verifyCustomerOtpAction } from "@/app/actions/customerAuth";
import prisma from "@/lib/prisma";
import { createCustomerSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const verifyRes = await verifyCustomerOtpAction(email, code);
    if (!verifyRes.success) {
      return NextResponse.json(
        { success: false, error: verifyRes.error },
        { status: 400 }
      );
    }

    // Find the customer details to generate token and return profile
    const customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

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
