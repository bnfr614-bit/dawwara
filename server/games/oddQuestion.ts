import type { GameEngine, Room } from '../types';
import { addScore, active } from '../types';
import { ODD_QUESTIONS, pickOne, shuffle } from '../content';
import { fresh, generators } from '../fresh';
import { fx, finish, scoreboard } from './util';

const S = (r: Room) => r.state;

async function newRound(room: Room) {
  const s = S(room);
  const [pair] = await fresh({
    hostId: room.hostId, kind: 'odd', pool: ODD_QUESTIONS, n: 1, key: (p) => p[0],
    generate: generators.odd,
  });
  Object.assign(s, {
    stage: 'answer', round: s.round + 1, pair, odd: pickOne(active(room)).id,
    answers: {}, list: [], votes: {}, result: null,
  });
  fx(room, 'round');
}

function toVote(room: Room) {
  const s = S(room);
  s.list = shuffle(Object.entries(s.answers).map(([pid, text], i) => ({ id: `x${i}${Math.random().toString(36).slice(2, 6)}`, pid, text })));
  s.stage = 'vote';
  fx(room, 'bell');
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
  s.stage = 'reveal';
  fx(room, caught ? 'ding' : 'steal');
}

export const oddQuestion: GameEngine = {
  async start(room) {
    room.state = { round: 0, fx: { n: 0 } };
    await newRound(room);
  },

  async act(room, pid, a, isHost) {
    const s = S(room);
    switch (a.type) {
      case 'answer': {
        if (s.stage !== 'answer') return;
        const t = String(a.text || '').trim().slice(0, 120);
        if (!t) return 'اكتب إجابة.';
        s.answers[pid] = t;
        if (active(room).every((p) => s.answers[p.id])) toVote(room);
        return;
      }
      case 'closeAnswers': {
        if (isHost && s.stage === 'answer' && Object.keys(s.answers).length >= 2) toVote(room);
        return;
      }
      case 'vote': {
        if (s.stage !== 'vote') return;
        const entry = s.list.find((x: any) => x.id === a.id);
        if (!entry || entry.pid === pid) return;
        s.votes[pid] = a.id;
        if (active(room).every((p) => s.votes[p.id] || !s.answers[p.id])) settle(room);
        return;
      }
      case 'closeVote': {
        if (isHost && s.stage === 'vote') settle(room);
        return;
      }
      case 'next': {
        if (isHost && s.stage === 'reveal') await newRound(room);
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
    const iAmOdd = viewer === s.odd;
    const revealed = s.stage === 'reveal';
    return {
      stage: s.stage, round: s.round, fx: s.fx, isHost,
      myQuestion: viewer ? (iAmOdd ? s.pair[1] : s.pair[0]) : null,
      mainQuestion: s.stage === 'answer' ? null : s.pair[0],
      answered: Object.keys(s.answers),
      myAnswer: viewer ? s.answers[viewer] : null,
      list: s.stage === 'answer' ? [] : s.list.map((x: any) => ({
        id: x.id, text: x.text,
        mine: x.pid === viewer,
        by: revealed ? x.pid : null,
      })),
      voted: Object.keys(s.votes),
      myVote: viewer ? s.votes[viewer] : null,
      result: revealed ? { ...s.result, odd: s.odd, oddQuestion: s.pair[1] } : null,
      leaderboard: scoreboard(room),
    };
  },
};
