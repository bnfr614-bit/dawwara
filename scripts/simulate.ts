// End-to-end smoke test of the automatic flow: bots join, press ready, and play on the real server.
// npx tsx scripts/simulate.ts <game> [players]
import { io, type Socket } from 'socket.io-client';

const BASE = process.env.BASE || 'http://localhost:3000';
const game = process.argv[2] || 'feud';
const count = Number(process.argv[3] || (game === 'mafia' ? 6 : 4));
const NAMES = ['فهد', 'سعود', 'ناصر', 'خالد', 'تركي', 'ماجد', 'بندر', 'نايف'];

type P = { name: string; s: Socket; view: any; room: any; you: string };
async function player(name: string): Promise<P> {
  const r = await fetch(`${BASE}/api/me`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
  const cookie = ((r.headers as any).getSetCookie?.()[0] || '').split(';')[0];
  const s = io(BASE, { path: '/ws', transports: ['websocket'], extraHeaders: { cookie } });
  const p: P = { name, s, view: null, room: null, you: '' };
  s.on('room', (d) => { p.view = d.view; p.room = d.room; p.you = d.you; });
  await new Promise((res, rej) => { s.on('connect', () => res(null)); s.on('connect_error', rej); });
  return p;
}
const emit = (s: Socket, ev: string, data: any) => new Promise<any>((res) => s.emit(ev, data, res));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const act = async (p: P, a: any) => { const r = await emit(p.s, 'act', a); if (r?.error) console.log(`  ! ${p.name} ${a.type}: ${r.error}`); await wait(120); return r; };
async function until(fn: () => any, ms = 30000, what = '') {
  const t = Date.now();
  while (Date.now() - t < ms) { const v = fn(); if (v) return v; await wait(150); }
  throw new Error(`timeout waiting for ${what}`);
}

(async () => {
  const ps = await Promise.all(NAMES.slice(0, count).map(player));
  const [host] = ps;
  const { code, error } = await emit(host.s, 'create', { game });
  if (error) throw new Error(error);
  for (const p of ps) await emit(p.s, 'join', { code });
  await until(() => host.room?.lobby?.deadline, 5000, 'lobby countdown');
  console.log('room', code, '| countdown started automatically');
  for (const p of ps) await act(p, { type: 'ready' });
  await until(() => host.room?.phase === 'playing', 15000, 'auto start');
  console.log('game started by itself (all ready)');
  const v = () => host.view;
  const by = (id: string) => ps.find((p) => p.you === id)!;

  if (game === 'feud') {
    await until(() => v().stage === 'intro', 5000, 'intro');
    console.log('intro VS:', by(v().face.a).name, 'ضد', by(v().face.b).name, '| question hidden:', v().question === null);
    await until(() => v().stage === 'countdown', 8000, 'countdown');
    await until(() => v().stage === 'buzz', 8000, 'buzz');
    console.log('question shown:', v().question);
    const fa = by(v().face.a);
    await act(fa, { type: 'buzz' });
    await until(() => v().stage === 'face', 3000, 'face');
    // a teammate cannot answer for the buzzer
    await act(ps.find((p) => p !== fa)!, { type: 'answer', text: 'x' });
    // peek at the real top answer through a finished-round view is impossible, so guess common words
    await act(fa, { type: 'answer', text: 'بطريق' });
    await until(() => v().stage === 'face' && v().answerer !== fa.you || v().stage === 'play', 5000, 'second faceoff');
    console.log('after first miss:', v().stage, 'answerer', by(v().answerer)?.name);
    // let the second player time out to test timers
    await until(() => v().stage === 'play', 20000, 'play by timeout');
    console.log('control', v().control, 'answerer', by(v().answerer).name, 'last', v().last?.text);
    for (let i = 0; i < 3 && v().stage === 'play'; i++) { await act(by(v().answerer), { type: 'answer', text: 'زرافة طايرة' }); }
    await until(() => v().stage === 'steal', 5000, 'steal');
    console.log('3 strikes -> steal');
    const stealer = ps.find((p) => p.room.players.find((x: any) => x.id === p.you).team !== v().control)!;
    await act(stealer, { type: 'answer', text: 'زرافة طايرة' });
    await until(() => v().stage === 'reveal', 5000, 'reveal');
    console.log('round over, winner', v().roundWinner, v().teamScores, '| all tiles revealed later automatically');
    await until(() => v().round === 2 && v().stage === 'intro', 15000, 'next round');
    console.log('round 2 started by itself');
  }

  if (game === 'mafia') {
    await until(() => v().stage === 'roles', 5000, 'roles');
    const roles = Object.fromEntries(ps.map((p) => [p.name, p.view.role]));
    console.log('roles:', roles);
    await until(() => v().stage === 'discuss', 30000, 'first day');
    console.log('morning news:', JSON.stringify(v().news));
    const alive = () => ps.filter((p) => v().alive.includes(p.you));
    for (const p of alive()) await act(p, { type: 'readyVote' });
    await until(() => v().stage === 'vote', 5000, 'vote');
    const mafiaP = ps.find((p) => p.view.role === 'mafia')!;
    for (const p of alive()) await act(p, { type: 'vote', target: p === mafiaP ? alive().find((x) => x !== p)!.you : mafiaP.you });
    await until(() => v().stage === 'verdict', 5000, 'verdict');
    console.log('verdict:', by(v().verdict.out)?.name, 'was', v().verdict.role);
    await until(() => v().stage === 'night' || host.room.phase === 'end', 15000, 'night or end');
    if (host.room.phase === 'end' || v().winner) console.log('winner', v().winner);
    else {
      const mafs = alive().filter((p) => p.view.role === 'mafia');
      const victim = alive().find((p) => p.view.role === 'citizen')!;
      for (const m of mafs) await act(m, { type: 'kill', target: victim.you });
      const doc = alive().find((p) => p.view.role === 'doctor');
      if (doc) await act(doc, { type: 'protect', target: victim.you });
      const det = alive().find((p) => p.view.role === 'detective');
      if (det) await act(det, { type: 'check', target: mafs[0]?.you || victim.you });
      await until(() => v().stage === 'morning' || v().winner, 5000, 'morning');
      console.log('night 1 news:', JSON.stringify(v().news), '| detective saw:', JSON.stringify(det?.view.checks));
    }
  }

  if (game === 'letters') {
    await until(() => v().stage === 'fill', 10000, 'fill');
    const L = v().letter;
    for (const [i, p] of ps.entries()) await act(p, { type: 'save', sheet: Object.fromEntries(v().categories.map((c: string) => [c, L + (i % 2 ? 'ل' : 'ر')])) });
    await act(ps[1], { type: 'stop' });
    await until(() => v().stage === 'review', 3000, 'review');
    for (const p of ps) await act(p, { type: 'doneReview' });
    await until(() => v().stage === 'scored', 3000, 'scored');
    console.log('letter', L, '| scores', v().leaderboard.map((r: any) => `${r.name}:${r.score}`).join(' '));
  }

  if (game === 'draw') {
    await until(() => v().stage === 'choose', 5000, 'choose');
    const cap = by(v().captain);
    const drawer = ps.find((p) => p.room.players.find((x: any) => x.id === p.you).team === v().turn && p !== cap) || cap;
    await act(cap, { type: 'choose', drawer: drawer.you });
    await until(() => v().stage === 'draw', 5000, 'draw');
    const word = drawer.view.word;
    const mate = ps.find((p) => p !== drawer && p.room.players.find((x: any) => x.id === p.you).team === v().turn)!;
    await act(mate, { type: 'guess', text: 'غلط' });
    await act(mate, { type: 'guess', text: word + 'ه' });
    await until(() => v().stage === 'result', 3000, 'result');
    console.log('drawer word', word, '| result', v().result, v().teamScores);
  }

  if (['who-wrote', 'intruder', 'odd-question', 'crime'].includes(game)) {
    await wait(1500);
    console.log('running stage:', v().stage, '| deadline set:', !!v().deadline);
  }

  ps.forEach((p) => p.s.close());
  process.exit(0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
