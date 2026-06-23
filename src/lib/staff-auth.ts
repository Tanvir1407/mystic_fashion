import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("CRITICAL: JWT_SECRET is not defined in environment variables.");
}
const encodedSecret = new TextEncoder().encode(jwtSecret);
const COOKIE_NAME = 'staff-session';

export interface StaffSessionPayload {
  staffId: string;
  username: string;
  email: string;
  [key: string]: any;
}

export async function createStaffSession(payload: StaffSessionPayload) {
  const session = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedSecret);

  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return session;
}

export async function getStaffSession(): Promise<StaffSessionPayload | null> {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, encodedSecret, { algorithms: ['HS256'] });
    return payload as unknown as StaffSessionPayload;
  } catch {
    return null;
  }
}

export async function destroyStaffSession() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}
