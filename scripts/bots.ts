// Joins N bot players to a room so one person can try a game alone: npx tsx scripts/bots.ts CODE [count]
import { io } from 'socket.io-client';

const BASE = process.env.BASE || 'http://localhost:3000';
const code = (process.argv[2] || '').toUpperCase();
const count = Number(process.argv[3] || 3);
const NAMES = ['سعود', 'ناصر', 'خالد', 'تركي', 'ماجد', 'بندر'];

(async () => {
  for (let i = 0; i < count; i++) {
    const r = await fetch(`${BASE}/api/me`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: NAMES[i] }) });
    const cookie = ((r.headers as any).getSetCookie?.()[0] || '').split(';')[0];
    const s = io(BASE, { path: '/ws', transports: ['websocket'], extraHeaders: { cookie } });
    s.on('connect', () => s.emit('join', { code }, (res: any) => {
      console.log(NAMES[i], res);
      s.emit('act', { type: 'team', team: i % 2 ? 'a' : 'b' }, () => {});
      s.emit('act', { type: 'ready' }, () => {});
    }));
  }
  setTimeout(() => process.exit(0), Number(process.env.STAY_MS || 15 * 60 * 1000));
})();
