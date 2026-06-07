import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionFromRequest } from "@/lib/auth";
import { changeCustomerPasswordAction } from "@/app/actions/customerAuth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSessionFromRequest(req);
    if (!session || !session.customerId) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: session.customerId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
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

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSessionFromRequest(req);
    if (!session || !session.customerId) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const result = await changeCustomerPasswordAction({ currentPassword, newPassword });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
