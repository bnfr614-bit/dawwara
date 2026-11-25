import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { COOKIE, sessionCookie, signSession } from '@/lib/auth';
import { currentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ user: await currentUser() });
}

/** Sets or renames the player on this device. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().replace(/\s+/g, ' ').slice(0, 16);
  if (name.length < 2) return NextResponse.json({ error: 'اكتب اسم من حرفين على الأقل.' }, { status: 400 });
  const existing = await currentUser();
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { name }, select: { id: true, name: true } })
    : await prisma.user.create({ data: { name }, select: { id: true, name: true } });
  const res = NextResponse.json({ user });
  if (!existing) res.cookies.set(sessionCookie(await signSession(user.id)));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: COOKIE, value: '', path: '/', maxAge: 0 });
  return res;
}
