import { SignJWT, jwtVerify } from 'jose';
import { parse } from 'cookie';
import { prisma } from './db';

export const COOKIE = 'dw_session';
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me');

export async function signSession(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifySession(token?: string | null): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function userFromCookieHeader(header?: string | null) {
  const token = header ? parse(header)[COOKIE] : null;
  const id = await verifySession(token);
  if (!id) return null;
  return prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
}

export function sessionCookie(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
}
