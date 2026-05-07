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
  const session = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedSecret);
  
  cookies().set('admin-session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const session = cookies().get('admin-session')?.value;
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
  cookies().delete('admin-session');
  // Also delete the old cookie if it exists to clean up
  cookies().delete('admin-auth');
}

export async function hasPermission(action: string, subject: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  
  if (session.roleName === 'SUPERADMIN') return true;
  
  return session.permissions.some(
    p => p.action === action && p.subject === subject
  );
}
