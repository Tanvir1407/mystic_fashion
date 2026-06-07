import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-mystic-secret-key-123';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
  userId: string;
  roleName: string;
  permissions: { action: string; subject: string }[];
  [key: string]: any;
}

export async function createSession(payload: SessionPayload) {
  console.log(`[Auth] createSession called with payload:`, JSON.stringify(payload));
  try {
    const session = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(encodedSecret);
    console.log(`[Auth] JWT Session generated successfully (length: ${session.length})`);

    const cookieStore = cookies();
    cookieStore.set('admin-session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    console.log(`[Auth] Cookie 'admin-session' set successfully in cookieStore`);
    return session;
  } catch (error) {
    console.error(`[Auth] Error in createSession:`, error);
    throw error;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const session = cookieStore.get('admin-session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, encodedSecret, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = cookies();
  cookieStore.delete('admin-session');
  // Also delete the old cookie if it exists to clean up
  cookieStore.delete('admin-auth');
}

export async function hasPermission(action: string, subject: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  if (session.roleName === 'SUPERADMIN') return true;

  return session.permissions.some(
    p => p.action === action && p.subject === subject
  );
}

// ─── CUSTOMER AUTHENTICATION HELPERS ──────────────────────────────────────────

export interface CustomerSessionPayload {
  customerId: string;
  name: string;
  phone: string;
  email?: string | null;
  [key: string]: any;
}

export async function createCustomerSession(payload: CustomerSessionPayload) {
  console.log(`[Auth] createCustomerSession called with payload:`, JSON.stringify(payload));
  try {
    const session = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d') // Persistent session for 30 days
      .sign(encodedSecret);
    console.log(`[Auth] Customer JWT Session generated successfully`);

    try {
      const cookieStore = cookies();
      cookieStore.set('customer-session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
      console.log(`[Auth] Cookie 'customer-session' set successfully`);
    } catch (cookieError: any) {
      console.warn(`[Auth] Cookies could not be set (non-request context):`, cookieError.message);
    }
    return session;
  } catch (error) {
    console.error(`[Auth] Error in createCustomerSession:`, error);
    throw error;
  }
}

export async function getCustomerSession(): Promise<CustomerSessionPayload | null> {
  let session: string | undefined;
  try {
    const cookieStore = cookies();
    session = cookieStore.get('customer-session')?.value;
  } catch (cookieError: any) {
    console.warn(`[Auth] Cookies could not be read (non-request context):`, cookieError.message);
  }
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, encodedSecret, {
      algorithms: ['HS256'],
    });
    return payload as unknown as CustomerSessionPayload;
  } catch (error) {
    return null;
  }
}

export async function destroyCustomerSession() {
  try {
    const cookieStore = cookies();
    cookieStore.delete('customer-session');
  } catch (cookieError: any) {
    console.warn(`[Auth] Cookies could not be deleted (non-request context):`, cookieError.message);
  }
}

export async function verifyCustomerToken(token: string): Promise<CustomerSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret, {
      algorithms: ['HS256'],
    });
    return payload as unknown as CustomerSessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getCustomerSessionFromRequest(req: any): Promise<CustomerSessionPayload | null> {
  // 1. Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.substring(7).trim();
    return verifyCustomerToken(token);
  }

  // 2. Check NextRequest cookies if present
  if (req.cookies && typeof req.cookies.get === "function") {
    const cookieToken = req.cookies.get("customer-session")?.value;
    if (cookieToken) {
      return verifyCustomerToken(cookieToken);
    }
  }

  // 3. Fallback to standard cookieStore
  return getCustomerSession();
}

