import { networkInterfaces } from 'node:os';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** LAN addresses of this machine, so phones on the same Wi-Fi know where to go. */
export async function GET() {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i!.address)
    .filter((a) => /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(a));
  return NextResponse.json({ ips, port: Number(process.env.PORT || 3000) });
}
