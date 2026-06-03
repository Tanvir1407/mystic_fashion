"use server";

import prisma from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { normalizePhone } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { createCustomerSession } from "@/lib/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper to check email format
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// ─── SEND OTP CODE ───────────────────────────────────────────────────────────
export async function sendCustomerOtpAction(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = email.toLowerCase().trim();
    if (!isValidEmail(cleanEmail)) {
      return { success: false, error: "Invalid email format." };
    }

    const customer = await prisma.customer.findUnique({
      where: { email: cleanEmail }
    });

    if (!customer) {
      return { success: false, error: "Email address not registered." };
    }

    const now = new Date();
    // Enforce 120-second (2 minutes) rate limit
    if (customer.otpExpiresAt) {
      const timeDiffMs = customer.otpExpiresAt.getTime() - now.getTime();
      // OTP expires in 15 minutes (900,000 ms).
      // If timeDiffMs > 13 minutes (780,000 ms), it means the last request was sent less than 2 minutes (120s) ago.
      const timeElapsedMs = (15 * 60 * 1000) - timeDiffMs;
      const rateLimitMs = 2 * 60 * 1000; // 120 seconds

      if (timeElapsedMs < rateLimitMs) {
        const secondsToWait = Math.ceil((rateLimitMs - timeElapsedMs) / 1000);
        return { 
          success: false, 
          error: `Please wait ${secondsToWait} seconds before requesting another code.` 
        };
      }
    }

    // Generate secure 6-digit random code
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        otpCode,
        otpExpiresAt
      }
    });

    // Send email
    const emailResult = await sendEmail({
      to: cleanEmail,
      subject: "Mystic Fashion - Verification Code",
      html: `
        <div style="font-family: sans-serif; padding: 30px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-bottom: 10px; font-size: 20px;">Verification Code</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">Use the verification code below to complete your login or reset your password. This code is valid for 15 minutes.</p>
          <div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; text-align: center; margin: 20px 0;">
            <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5;">${otpCode}</span>
          </div>
          <p style="font-size: 11px; color: #94a3b8;">If you did not request this verification, please ignore this email.</p>
        </div>
      `
    });

    if (!emailResult.success) {
      return { success: false, error: emailResult.error || "Failed to send email." };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[sendCustomerOtpAction] Error:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

// ─── VERIFY OTP CODE ─────────────────────────────────────────────────────────
export async function verifyCustomerOtpAction(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const customer = await prisma.customer.findUnique({
      where: { email: cleanEmail }
    });

    if (!customer) {
      return { success: false, error: "Email address not registered." };
    }

    if (!customer.otpCode || customer.otpCode !== code) {
      return { success: false, error: "Invalid verification code." };
    }

    if (!customer.otpExpiresAt || customer.otpExpiresAt < new Date()) {
      return { success: false, error: "Verification code has expired." };
    }

    if (!customer.isActive) {
      return { success: false, error: "Your account is currently suspended. Please contact customer support." };
    }

    // Clear verification codes on successful verify
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        otpCode: null,
        otpExpiresAt: null
      }
    });

    // Sign session
    await createCustomerSession({
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email
    });

    return { success: true };
  } catch (error: any) {
    console.error("[verifyCustomerOtpAction] Error:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

// ─── CUSTOMER REGISTRATION ───────────────────────────────────────────────────
export async function registerCustomerAction(payload: {
  name: string;
  phone: string;
  email?: string;
  password?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const normalized = normalizePhone(payload.phone);

    if (!payload.name || payload.name.trim().length < 2) {
      return { success: false, error: "Name must be at least 2 characters long." };
    }
    if (!normalized) {
      return { success: false, error: "Invalid phone number." };
    }

    let cleanEmail: string | null = null;
    if (payload.email && payload.email.trim()) {
      cleanEmail = payload.email.toLowerCase().trim();
      if (!isValidEmail(cleanEmail)) {
        return { success: false, error: "Invalid email format." };
      }

      // Check if email already associated with an account
      const existingByEmail = await prisma.customer.findUnique({
        where: { email: cleanEmail }
      });
      if (existingByEmail) {
        return { success: false, error: "Email address is already registered." };
      }
    }

    const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : null;

    // Check if phone number already exists from a guest checkout
    const existingByPhone = await prisma.customer.findUnique({
      where: { phone: normalized }
    });

    let customer;

    if (existingByPhone) {
      // If it exists and already has a password set, prevent takeover
      if (existingByPhone.passwordHash) {
        return { success: false, error: "Phone number is already associated with an account." };
      }

      // Merge email/password into existing guest account to preserve order history
      customer = await prisma.customer.update({
        where: { id: existingByPhone.id },
        data: {
          email: cleanEmail || undefined,
          passwordHash,
          name: payload.name.trim()
        }
      });
    } else {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          name: payload.name.trim(),
          phone: normalized,
          email: cleanEmail,
          passwordHash
        }
      });
    }

    // Create session
    await createCustomerSession({
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email
    });

    return { success: true };
  } catch (error: any) {
    console.error("[registerCustomerAction] Error:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

// ─── PASSWORD LOGIN ──────────────────────────────────────────────────────────
export async function loginCustomerAction(emailOrPhone: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanInput = emailOrPhone.trim();
    let customer = null;

    if (isValidEmail(cleanInput.toLowerCase())) {
      customer = await prisma.customer.findUnique({
        where: { email: cleanInput.toLowerCase() }
      });
    } else {
      const normalized = normalizePhone(cleanInput);
      if (normalized) {
        customer = await prisma.customer.findUnique({
          where: { phone: normalized }
        });
      }
    }

    if (!customer) {
      return { success: false, error: "Invalid credentials." };
    }

    if (!customer.isActive) {
      return { success: false, error: "Your account is currently suspended. Please contact customer support." };
    }

    if (!customer.passwordHash) {
      return { success: false, error: "This account does not have a password set. Please login using verification code." };
    }

    const matches = await bcrypt.compare(password, customer.passwordHash);
    if (!matches) {
      return { success: false, error: "Invalid credentials." };
    }

    // Set 30-day persistent session
    await createCustomerSession({
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email
    });

    return { success: true };
  } catch (error: any) {
    console.error("[loginCustomerAction] Error:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

// ─── RESET PASSWORD ──────────────────────────────────────────────────────────
export async function resetCustomerPasswordAction(payload: {
  email: string;
  otpCode: string;
  password?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = payload.email.toLowerCase().trim();
    if (!payload.password || payload.password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    const customer = await prisma.customer.findUnique({
      where: { email: cleanEmail }
    });

    if (!customer) {
      return { success: false, error: "Email address not registered." };
    }

    if (!customer.otpCode || customer.otpCode !== payload.otpCode) {
      return { success: false, error: "Invalid verification code." };
    }

    if (!customer.otpExpiresAt || customer.otpExpiresAt < new Date()) {
      return { success: false, error: "Verification code has expired." };
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    // Update password and clear OTP
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash,
        otpCode: null,
        otpExpiresAt: null
      }
    });

    // Auto-login after password reset
    await createCustomerSession({
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email
    });

    return { success: true };
  } catch (error: any) {
    console.error("[resetCustomerPasswordAction] Error:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

// ─── LOGOUT CUSTOMER ─────────────────────────────────────────────────────────
import { destroyCustomerSession } from "@/lib/auth";

export async function logoutCustomerAction(): Promise<{ success: boolean }> {
  try {
    await destroyCustomerSession();
    return { success: true };
  } catch (error) {
    console.error("[logoutCustomerAction] Error:", error);
    return { success: false };
  }
}

// ─── GET CURRENT CUSTOMER SESSION ───────────────────────────────────────────
import { getCustomerSession } from "@/lib/auth";

export async function getCurrentCustomerSessionAction() {
  try {
    return await getCustomerSession();
  } catch (error) {
    return null;
  }
}

// ─── CHANGE PASSWORD ─────────────────────────────────────────────────────────
export async function changeCustomerPasswordAction(payload: {
  currentPassword?: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCustomerSession();
    if (!session || !session.customerId) {
      return { success: false, error: "Unauthorized." };
    }

    const customer = await prisma.customer.findUnique({
      where: { id: session.customerId }
    });

    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    // If they already have a password set, we MUST verify the current password first
    if (customer.passwordHash) {
      if (!payload.currentPassword) {
        return { success: false, error: "Please enter your current password." };
      }
      const matches = await bcrypt.compare(payload.currentPassword, customer.passwordHash);
      if (!matches) {
        return { success: false, error: "Current password is incorrect." };
      }
    }

    if (payload.newPassword.length < 6) {
      return { success: false, error: "New password must be at least 6 characters long." };
    }

    const newPasswordHash = await bcrypt.hash(payload.newPassword, 10);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: newPasswordHash
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("[changeCustomerPasswordAction] Error:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}
