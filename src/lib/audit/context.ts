import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { AuditContext } from "./types";

/**
 * Extracts the full audit context from the current Server Action invocation.
 *
 * Combines:
 * - WHO: userId, email (fetched from DB), role from the JWT session
 * - WHERE: IP address and User-Agent from request headers
 *
 * Returns null if no authenticated session exists (public routes).
 * Since we only log admin mutations, a null return signals "skip logging."
 */
export async function getAuditContext(): Promise<AuditContext | null> {
  const session = await getSession();

  // No session = public/unauthenticated request → skip logging
  if (!session || !session.userId) {
    return null;
  }

  // Fetch user email from the database (not stored in JWT)
  let userEmail: string | null = null;
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    userEmail = staff?.email ?? null;
  } catch {
    // Non-critical — proceed without email
  }

  // Extract request metadata from headers
  // Next.js 14 Server Actions expose request headers via next/headers
  const headersList = headers();

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
    userId: session.userId,
    userEmail,
    userRole: session.roleName || null,
    ipAddress,
    userAgent,
  };
}

