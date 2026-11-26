import type { GameEngine, Room } from '../types';
import { active, addScore } from '../types';
import { LETTERS, LETTER_CATEGORIES } from '../content';
import { fresh } from '../fresh';
import { sameAnswer, startsWithLetter } from '../matcher';
import { finish, fx, scoreboard, skip, stage, timing } from './util';

const ROUNDS = 5;
const T = { intro: 4, fill: 90, review: 40, scored: 9 };
const S = (r: Room) => r.state;

async function newRound(room: Room) {
  const s = S(room);
  if (s.round >= ROUNDS) return finish(room);
  const [letter] = await fresh({ hostId: room.hostId, kind: 'letter', pool: LETTERS, n: 1, key: (l) => l });
  Object.assign(s, { round: s.round + 1, letter, sheets: {}, stopper: null, rejects: {}, results: null, doneReview: [] });
  fx(room, 'round');
  stage(room, 'intro', T.intro, () => { fx(room, 'reveal'); stage(room, 'fill', T.fill, () => toReview(room)); });
}

function toReview(room: Room) {
  fx(room, 'buzz');
  stage(room, 'review', T.review, () => score(room));
}

const rejectKey = (pid: string, cat: string) => `${pid}|${cat}`;

function validity(room: Room, pid: string, cat: string) {
  const s = S(room);
  const text = (s.sheets[pid]?.[cat] || '').trim();
  if (!text) return { text, ok: false, why: 'فاضية' };
  if (!startsWithLetter(text, s.letter)) return { text, ok: false, why: `ما تبدأ بـ ${s.letter}` };
  const votes = (s.rejects[rejectKey(pid, cat)] || []).length;
  const others = active(room).length - 1;
  if (others > 0 && votes > others / 2) return { text, ok: false, why: 'مرفوضة بالتصويت' };
  return { text, ok: true, why: '' };
}

function score(room: Room) {
  const s = S(room);
  const ids = Object.keys(s.sheets);
  const results: Record<string, Record<string, { text: string; ok: boolean; why: string; pts: number }>> = {};
  for (const pid of ids) results[pid] = {};
  for (const cat of LETTER_CATEGORIES) {
    const valid = ids.map((pid) => ({ pid, ...validity(room, pid, cat) }));
    for (const v of valid) {
      const dup = v.ok && valid.some((o) => o.pid !== v.pid && o.ok && sameAnswer(o.text, v.text));
      const pts = !v.ok ? 0 : dup ? 5 : 10;
      results[v.pid][cat] = { text: v.text, ok: v.ok, why: dup ? 'مكررة' : v.why, pts };
    }
  }
  for (const pid of ids) {
    let total = Object.values(results[pid]).reduce((n, r) => n + r.pts, 0);
    if (pid === s.stopper && Object.values(results[pid]).every((r) => r.ok)) total += 3;
    addScore(room, pid, total);
    (results[pid] as any).__total = total;
  }
  s.results = results;
  fx(room, 'ding');
  stage(room, 'scored', T.scored, () => newRound(room));
}

export const letters: GameEngine = {
  async start(room) {
    room.state = { round: 0, fx: { n: 0 }, categories: LETTER_CATEGORIES, rounds: ROUNDS };
    await newRound(room);
  },

  async act(room, pid, a) {
    const s = S(room);
    switch (a.type) {
      case 'save': {
        if (s.stage !== 'fill') return;
        const sheet: Record<string, string> = {};
        for (const c of LETTER_CATEGORIES) sheet[c] = String(a.sheet?.[c] || '').slice(0, 40);
        s.sheets[pid] = sheet;
        return;
      }
      case 'stop': {
        if (s.stage !== 'fill') return;
        const sheet = s.sheets[pid];
        if (!sheet || LETTER_CATEGORIES.some((c) => !String(sheet[c] || '').trim())) return 'عبّ كل الخانات قبل تقول ستوب.';
        const wrong = LETTER_CATEGORIES.filter((c) => !startsWithLetter(sheet[c], s.letter));
        if (wrong.length) return `هذي ما تبدأ بحرف ${s.letter}: ${wrong.join('، ')}`;
        s.stopper = pid;
        fx(room, 'stop', { pid });
        return skip(room, () => toReview(room));
        return;
      }
      case 'reject': {
        if (s.stage !== 'review' || a.pid === pid || !LETTER_CATEGORIES.includes(a.cat)) return;
        const k = rejectKey(a.pid, a.cat);
        const list: string[] = s.rejects[k] || [];
        s.rejects[k] = list.includes(pid) ? list.filter((x) => x !== pid) : [...list, pid];
        return;
      }
      case 'doneReview': {
        if (s.stage !== 'review') return;
        s.doneReview = [...new Set([...s.doneReview, pid])];
        if (active(room).every((p) => s.doneReview.includes(p.id))) return skip(room, () => score(room));
        return;
      }
    }
  },

  view(room, viewer) {
    const s = S(room);
    const reviewing = s.stage !== 'fill';
    const rows = reviewing
      ? Object.keys(s.sheets).map((pid) => ({
          pid,
          cells: LETTER_CATEGORIES.map((cat) => {
            const v = validity(room, pid, cat);
            const r = s.results?.[pid]?.[cat];
            return { cat, text: v.text, ok: r ? r.ok : v.ok, why: r ? r.why : v.why, pts: r?.pts ?? null, rejects: (s.rejects[rejectKey(pid, cat)] || []).length, iRejected: !!viewer && (s.rejects[rejectKey(pid, cat)] || []).includes(viewer) };
          }),
          total: s.results?.[pid]?.__total ?? null,
        }))
      : [];
    return {
      ...timing(s), round: s.round, rounds: ROUNDS, letter: s.stage === 'intro' ? null : s.letter, categories: s.categories, doneReview: s.doneReview,
      mySheet: viewer ? s.sheets[viewer] || null : null,
      filled: Object.entries(s.sheets).filter(([, sh]: any) => LETTER_CATEGORIES.filter((c) => (sh[c] || '').trim()).length).map(([id]) => id),
      stopper: s.stopper,
      rows,
      leaderboard: scoreboard(room),
    };
  },
};
