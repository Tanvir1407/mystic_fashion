import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import prisma from "@/lib/prisma";
import type { AuditContext } from "./types";

/**
 * Extracts the full audit context from the current Server Action invocation.
 *
 * Combines:
 * - WHO: userId, email, role from the JWT session (handles both Admin and Staff)
 * - WHERE: IP address and User-Agent from request headers
 *
 * Returns null if no authenticated session exists (public routes).
 * A null return signals "skip logging."
 */
export async function getAuditContext(): Promise<AuditContext | null> {
  const headersList = headers();
  const referer = headersList.get("referer") || "";
  const isStaffPath = referer.includes("/staff/") || referer.endsWith("/staff");

  let userId: string | null = null;
  let userEmail: string | null = null;
  let userRole: string | null = null;

  // 1. Prioritize staff session if request is coming from staff portal
  if (isStaffPath) {
    try {
      const staffSession = await getStaffSession();
      if (staffSession && staffSession.staffId) {
        userId = staffSession.staffId;
        userEmail = staffSession.email || null;
        userRole = "STAFF";
      }
    } catch {
      // Ignore session fetch errors
    }
  }

  // 2. Fall back to admin session if no staff session resolved
  if (!userId) {
    try {
      const adminSession = await getSession();
      if (adminSession && adminSession.userId) {
        userId = adminSession.userId;
        userRole = adminSession.roleName || null;

        // Fetch admin user email from the database
        const staff = await prisma.staff.findUnique({
          where: { id: adminSession.userId },
          select: { email: true },
        });
        userEmail = staff?.email ?? null;
      }
    } catch {
      // Ignore session fetch errors
    }
  }

  // 3. General fallback to staff session (if not resolved by referer but staff cookie exists)
  if (!userId) {
    try {
      const staffSession = await getStaffSession();
      if (staffSession && staffSession.staffId) {
        userId = staffSession.staffId;
        userEmail = staffSession.email || null;
        userRole = "STAFF";
      }
    } catch {
      // Ignore session fetch errors
    }
  }

  if (!userId) {
    return null;
  }

  // Extract request metadata from headers
  // Next.js 14 Server Actions expose request headers via next/headers

  // Helper to strip ports and ipv6 mapping prefixes
  const cleanIp = (ipStr: string): string => {
    let cleaned = ipStr.trim();
    if (cleaned.startsWith("::ffff:")) {
      cleaned = cleaned.substring(7);
    }
    // Strip port if IPv4 address contains one (e.g. 192.168.1.1:54321)
    if (cleaned.includes(":") && !cleaned.includes("::") && cleaned.split(":").length === 2) {
      cleaned = cleaned.split(":")[0];
    }
    return cleaned;
  };

  // IP extraction priority:
  // 1. X-Forwarded-For (set by Nginx reverse proxy) — first IP in the chain
  // 2. X-Real-IP (alternative Nginx header)
  // 3. Fallback to "unknown"
  const forwardedFor = headersList.get("x-forwarded-for");
  const rawIp =
    forwardedFor?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  const ipAddress = rawIp !== "unknown" ? cleanIp(rawIp) : "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";

  return {
    userId,
    userEmail,
    userRole,
    ipAddress,
    userAgent,
  };
}

