import type { GameEngine, Room } from '../types';
import { active, addScore } from '../types';
import { LETTERS, LETTER_CATEGORIES } from '../content';
import { fresh } from '../fresh';
import { sameAnswer, startsWithLetter } from '../matcher';
import { deadline, finish, fx, scoreboard } from './util';

const SECONDS = 90;
const ROUNDS = 6;
const S = (r: Room) => r.state;

async function newRound(room: Room) {
  const s = S(room);
  if (s.round >= ROUNDS) return finish(room);
  const [letter] = await fresh({ hostId: room.hostId, kind: 'letter', pool: LETTERS, n: 1, key: (l) => l });
  Object.assign(s, { stage: 'fill', round: s.round + 1, letter, sheets: {}, stopper: null, rejects: {}, results: null });
  fx(room, 'round');
  deadline(room, SECONDS, () => toReview(room));
}

function toReview(room: Room) {
  const s = S(room);
  room.clearTimer();
  s.deadline = null;
  s.stage = 'review';
  fx(room, 'buzz');
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
  s.stage = 'scored';
  fx(room, 'ding');
}

export const letters: GameEngine = {
  async start(room) {
    room.state = { round: 0, fx: { n: 0 }, categories: LETTER_CATEGORIES, rounds: ROUNDS };
    await newRound(room);
  },

  async act(room, pid, a, isHost) {
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
        toReview(room);
        return;
      }
      case 'reject': {
        if (s.stage !== 'review' || a.pid === pid || !LETTER_CATEGORIES.includes(a.cat)) return;
        const k = rejectKey(a.pid, a.cat);
        const list: string[] = s.rejects[k] || [];
        s.rejects[k] = list.includes(pid) ? list.filter((x) => x !== pid) : [...list, pid];
        return;
      }
      case 'score': {
        if (isHost && s.stage === 'review') score(room);
        return;
      }
      case 'next': {
        if (isHost && s.stage === 'scored') await newRound(room);
        return;
      }
      case 'end': {
        if (isHost) finish(room);
        return;
      }
    }
  },

  view(room, viewer, isHost) {
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
      stage: s.stage, round: s.round, rounds: ROUNDS, letter: s.letter, categories: s.categories,
      deadline: s.deadline, seconds: SECONDS, fx: s.fx, isHost,
      mySheet: viewer ? s.sheets[viewer] || null : null,
      filled: Object.entries(s.sheets).filter(([, sh]: any) => LETTER_CATEGORIES.filter((c) => (sh[c] || '').trim()).length).map(([id]) => id),
      stopper: s.stopper,
      rows,
      leaderboard: scoreboard(room),
    };
  },
};
