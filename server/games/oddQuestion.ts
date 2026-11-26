import type { GameEngine, Room } from '../types';
import { addScore, active } from '../types';
import { ODD_QUESTIONS, pickOne, shuffle } from '../content';
import { fresh, generators } from '../fresh';
import { finish, fx, scoreboard, skip, stage, timing } from './util';

const ROUNDS = 5;
const T = { answer: 60, vote: 40, reveal: 9 };
const S = (r: Room) => r.state;

async function newRound(room: Room) {
  const s = S(room);
  if (s.round >= ROUNDS) return finish(room);
  const [pair] = await fresh({ hostId: room.hostId, kind: 'odd', pool: ODD_QUESTIONS, n: 1, key: (p) => p[0], generate: generators.odd });
  Object.assign(s, { round: s.round + 1, pair, odd: pickOne(active(room)).id, answers: {}, list: [], votes: {}, result: null });
  fx(room, 'round');
  stage(room, 'answer', T.answer, () => toVote(room));
}

function toVote(room: Room) {
  const s = S(room);
  if (Object.keys(s.answers).length < 2) { s.result = { skipped: true }; return stage(room, 'reveal', T.reveal, () => newRound(room)); }
  s.list = shuffle(Object.entries(s.answers).map(([pid, text], i) => ({ id: `x${i}${Math.random().toString(36).slice(2, 6)}`, pid, text })));
  fx(room, 'bell');
  stage(room, 'vote', T.vote, () => settle(room));
}

function settle(room: Room) {
  const s = S(room);
  const counts: Record<string, number> = {};
  Object.values(s.votes).forEach((v: any) => (counts[v] = (counts[v] || 0) + 1));
  const oddEntry = s.list.find((x: any) => x.pid === s.odd);
  const max = Math.max(0, ...Object.values(counts));
  const tops = Object.keys(counts).filter((k) => counts[k] === max);
  const caught = !!oddEntry && tops.length === 1 && tops[0] === oddEntry.id;
  Object.entries(s.votes).forEach(([v, id]) => { if (oddEntry && id === oddEntry.id) addScore(room, v, 1); });
  if (!caught) addScore(room, s.odd, 2);
  s.result = { counts, caught, oddAnswerId: oddEntry?.id };
  fx(room, caught ? 'ding' : 'steal');
  stage(room, 'reveal', T.reveal, () => newRound(room));
}

export const oddQuestion: GameEngine = {
  async start(room) {
    room.state = { round: 0, fx: { n: 0 } };
    await newRound(room);
  },

  act(room, pid, a) {
    const s = S(room);
    if (a.type === 'answer' && s.stage === 'answer') {
      const t = String(a.text || '').trim().slice(0, 120);
      if (!t) return 'اكتب إجابة.';
      s.answers[pid] = t;
      if (active(room).every((p) => s.answers[p.id])) return skip(room, () => toVote(room));
      return;
    }
    if (a.type === 'vote' && s.stage === 'vote') {
      const entry = s.list.find((x: any) => x.id === a.id);
      if (!entry || entry.pid === pid) return;
      s.votes[pid] = a.id;
      if (active(room).every((p) => s.votes[p.id] || !s.answers[p.id])) return skip(room, () => settle(room));
    }
  },

  view(room, viewer) {
    const s = S(room);
    const revealed = s.stage === 'reveal' && !s.result?.skipped;
    return {
      ...timing(s), round: s.round, rounds: ROUNDS,
      myQuestion: viewer ? (viewer === s.odd ? s.pair[1] : s.pair[0]) : null,
      mainQuestion: s.stage === 'answer' ? null : s.pair[0],
      answered: Object.keys(s.answers),
      myAnswer: viewer ? s.answers[viewer] : null,
      list: s.stage === 'answer' ? [] : s.list.map((x: any) => ({ id: x.id, text: x.text, mine: x.pid === viewer, by: revealed ? x.pid : null })),
      voted: Object.keys(s.votes),
      myVote: viewer ? s.votes[viewer] : null,
      result: revealed ? { ...s.result, odd: s.odd, oddQuestion: s.pair[1] } : s.result?.skipped ? { skipped: true } : null,
      leaderboard: scoreboard(room),
    };
  },
};
