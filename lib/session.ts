import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { userFromCookieHeader } from './auth';

export async function currentUser() {
  return userFromCookieHeader(headers().get('cookie'));
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function readCookieStore() {
  return cookies();
}
