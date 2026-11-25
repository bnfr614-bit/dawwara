// End-to-end smoke test: fake players join a room over the real socket server and play.
import { io, type Socket } from 'socket.io-client';

const BASE = process.env.BASE || 'http://localhost:3000';
const game = process.argv[2] || 'feud';

async function player(name: string) {
  const r = await fetch(`${BASE}/api/me`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
  const cookie = ((r.headers as any).getSetCookie?.()[0] || r.headers.get('set-cookie') || '').split(';')[0];
  const s = io(BASE, { path: '/ws', transports: ['websocket'], extraHeaders: { cookie } });
  const p = { name, s, view: null as any, room: null as any, you: '' };
  s.on('room', (d) => { p.view = d.view; p.room = d.room; p.you = d.you; });
  await new Promise((res, rej) => { s.on('connect', () => res(null)); s.on('connect_error', rej); });
  console.log('connected', name);
  return p;
}
const emit = (s: Socket, ev: string, data: any) => new Promise<any>((res) => s.emit(ev, data, res));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const act = async (p: any, a: any) => { const r = await emit(p.s, 'act', a); if (r?.error) console.log(`  ! ${p.name} ${a.type}: ${r.error}`); await wait(150); return r; };

(async () => {
  const ps = await Promise.all(['فهد', 'سعود', 'ناصر', 'خالد'].map(player));
  const [host] = ps;
  const { code, error } = await emit(host.s, 'create', { game });
  if (error) throw new Error(error);
  console.log('room', code);
  for (const p of ps) console.log(' join', p.name, await emit(p.s, 'join', { code }));
  await wait(200);
  if (game === 'feud') {
    await act(ps[1], { type: 'team', team: 'a' });
    await act(ps[2], { type: 'team', team: 'b' });
    await act(ps[3], { type: 'team', team: 'b' });
  }
  await act(host, { type: 'start' });
  const v = () => host.view;
  const byId = (id: string) => ps.find((p) => p.you === id)!;

  if (game === 'feud') {
    console.log('Q1:', v().question, '| tiles', v().tiles.length, '| host sees', v().tiles.map((t: any) => t.text).join('، '));
    const fa = byId(v().face.a);
    await act(fa, { type: 'buzz' });
    const top = v().tiles[0].text;
    await act(fa, { type: 'answer', text: top + 'ه' }); // misspelled top answer
    console.log('after faceoff:', v().stage, 'control', v().control, 'last', v().last, 'pot', v().pot);
    for (let i = 0; i < 3 && v().stage === 'play'; i++) {
      const ans = byId(v().answerer);
      await act(ans, { type: 'answer', text: 'بطريق' });
      console.log(' miss -> strikes', v().strikes, 'stage', v().stage);
    }
    const stealer = ps.find((p) => p.room.players.find((x: any) => x.id === p.you).team !== v().control)!;
    const idx = v().tiles.findIndex((t: any) => !t.open);
    await act(stealer, { type: 'answer', text: v().tiles[idx].text });
    console.log('steal ->', v().stage, 'winner', v().roundWinner, 'scores', v().teamScores);
    await act(host, { type: 'next' });
    console.log('Q2:', v().question, 'stage', v().stage, 'mult', v().mult);
  }

  if (game === 'letters') {
    const L = v().letter;
    console.log('letter', L);
    const sheet = (w: string) => Object.fromEntries(v().categories.map((c: string) => [c, L + w]));
    await act(ps[1], { type: 'save', sheet: sheet('ل') });
    await act(ps[2], { type: 'save', sheet: { ...sheet('ل'), 'بلاد': 'مصر' } });
    await act(ps[3], { type: 'save', sheet: sheet('ر') });
    const stopErr = await act(ps[1], { type: 'stop' });
    console.log('stop', stopErr, 'stage', v().stage);
    await act(ps[2], { type: 'reject', pid: ps[3].you, cat: 'إنسان' });
    await act(ps[1], { type: 'reject', pid: ps[3].you, cat: 'إنسان' });
    await act(host, { type: 'score' });
    for (const r of v().rows) console.log(' ', byId(r.pid).name, r.cells.map((c: any) => `${c.text}:${c.pts}${c.why ? '(' + c.why + ')' : ''}`).join(' '), '=', r.total);
  }

  const pv = (p: any) => p.view;
  if (game === 'who-wrote') {
    for (const p of ps) await act(p, { type: 'submit', stories: [`مرة من المرات ${p.name} نسي مفاتيحه`, `${p.name} طاح في المسبح بملابسه`] });
    console.log('stage', v().stage, 'story', v().story);
    const author = ps.find((p) => pv(p).isAuthor)!;
    for (const p of ps) if (p !== author) await act(p, { type: 'vote', target: p === ps[0] ? author.you : ps.find((x) => x !== p && x !== author)!.you });
    console.log('reveal', v().stage, 'author', author.name, 'right', v().result.right.length, 'board', v().leaderboard.map((r: any) => `${r.name}:${r.score}`).join(' '));
  }
  if (game === 'intruder') {
    await act(host, { type: 'category', category: 'أكل' });
    const intr = ps.find((p) => pv(p).amIntruder)!;
    console.log('word seen by others', pv(ps.find((p) => p !== intr)!).card, '| intruder', intr.name, 'card', pv(intr).card);
    await act(host, { type: 'openVote' });
    for (const p of ps) await act(p, { type: 'vote', target: p === intr ? ps.find((x) => x !== intr)!.you : intr.you });
    console.log('stage', v().stage, 'caught', v().reveal?.caught);
    const word = pv(ps.find((p) => p !== intr)!).card;
    await act(intr, { type: 'guess', text: word + ' ' });
    console.log('guessRight', v().reveal.guessRight, v().leaderboard.map((r: any) => `${r.name}:${r.score}`).join(' '));
  }
  if (game === 'odd-question') {
    const odd = ps.find((p) => pv(p).myQuestion !== pv(ps[0]).myQuestion) || ps[0];
    console.log('q', pv(ps[1]).myQuestion, '| odd', odd.name, pv(odd).myQuestion);
    for (const p of ps) await act(p, { type: 'answer', text: p === odd ? 'أحمر' : '7 ساعات' });
    const oddId = pv(ps[0]).list.find((x: any) => x.text === 'أحمر')?.id;
    for (const p of ps) { const l = pv(p).list; const t = p === odd ? l.find((x: any) => !x.mine).id : oddId; await act(p, { type: 'vote', id: t }); }
    console.log('caught', v().result.caught, v().leaderboard.map((r: any) => `${r.name}:${r.score}`).join(' '));
  }
  if (game === 'crime') {
    const killer = ps.find((p) => pv(p).role === 'killer')!;
    const h = pv(killer).hands[killer.you];
    await act(killer, { type: 'pick', means: h.means[0], clue: h.clues[0] });
    console.log('file', v().file.map((t: any) => `${t.title}=${t.pick}`).join(' | '));
    const lead = ps.find((p) => p.you === v().lead)!;
    await act(lead, { type: 'accuse', suspect: killer.you, means: h.means[0], clue: h.clues[0] });
    console.log('stage', v().stage, 'correct', v().correct, 'detectivesWin', v().detectivesWin);
  }
  if (game === 'draw') {
    const cap = ps.find((p) => p.you === v().captain)!;
    const drawer = ps.find((p) => p.room.players.find((x: any) => x.id === p.you).team === v().turn && p !== cap) || cap;
    await act(cap, { type: 'choose', drawer: drawer.you });
    console.log('drawer sees', pv(drawer).word, '| others see', pv(ps.find((p) => p !== drawer && p !== host)!).word, 'len', v().wordLength);
    drawer.s.emit('stroke', { id: 's1', p: [0.1, 0.1, 0.5, 0.5], c: '#d23c2e', w: 5 });
    await wait(200);
    await act(drawer, { type: 'got' });
    console.log('result', v().result, v().teamScores);
  }

  // second room by same host: questions must not repeat
  const { code: c2 } = await emit(host.s, 'create', { game });
  if (game === 'feud') {
    const seen = new Set<string>();
    console.log('no-repeat check across 4 new rooms:');
    for (let k = 0; k < 4; k++) {
      const { code: c } = await emit(host.s, 'create', { game });
      for (const p of ps) await emit(p.s, 'join', { code: c });
      await act(ps[1], { type: 'team', team: 'a' }); await act(ps[2], { type: 'team', team: 'b' }); await act(ps[3], { type: 'team', team: 'b' });
      const r = await act(host, { type: 'start' });
      if (r?.error) break;
      const q = v().question;
      console.log('  room', c, q, seen.has(q) ? 'REPEATED!' : 'new');
      seen.add(q);
    }
  }
  void c2;
  ps.forEach((p) => p.s.close());
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
