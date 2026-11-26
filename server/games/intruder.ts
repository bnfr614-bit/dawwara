import type { GameEngine, Room } from '../types';
import { addScore, active } from '../types';
import { INTRUDER_WORDS, pickOne, shuffle } from '../content';
import { fresh, generators } from '../fresh';
import { sameWord } from '../matcher';
import { finish, fx, scoreboard, skip, stage, timing } from './util';

const ROUNDS = 4;
const T = { card: 8, clues: 90, vote: 35, guess: 25, reveal: 8 };
const S = (r: Room) => r.state;
const CATEGORIES = Object.keys(INTRUDER_WORDS);

async function newRound(room: Room) {
  const s = S(room);
  if (s.round >= ROUNDS) return finish(room);
  const cat = pickOne(CATEGORIES);
  const [word] = await fresh({ hostId: room.hostId, kind: `intruder:${cat}`, pool: INTRUDER_WORDS[cat], n: 1, key: (w) => w, generate: generators.words(cat) });
  const players = active(room);
  Object.assign(s, {
    round: s.round + 1, category: cat, word, intruder: pickOne(players).id, order: shuffle(players.map((p) => p.id)),
    votes: {}, counts: null, caught: false, guess: null, guessRight: null,
  });
  fx(room, 'round');
  stage(room, 'card', T.card, () => stage(room, 'clues', T.clues, () => openVote(room)));
}

function openVote(room: Room) {
  fx(room, 'bell');
  stage(room, 'vote', T.vote, () => settleVote(room));
}

function settleVote(room: Room) {
  const s = S(room);
  const c: Record<string, number> = {};
  Object.values(s.votes).forEach((v: any) => (c[v] = (c[v] || 0) + 1));
  const max = Math.max(0, ...Object.values(c));
  const top = Object.keys(c).filter((k) => c[k] === max);
  Object.entries(s.votes).forEach(([v, t]) => { if (t === s.intruder) addScore(room, v, 1); });
  s.counts = c;
  s.caught = top.length === 1 && top[0] === s.intruder;
  if (s.caught) { fx(room, 'ding'); stage(room, 'guess', T.guess, () => showReveal(room)); }
  else { addScore(room, s.intruder, 2); fx(room, 'steal'); showReveal(room); }
}

function showReveal(room: Room) {
  stage(room, 'reveal', T.reveal, () => newRound(room));
}

export const intruder: GameEngine = {
  async start(room) {
    room.state = { round: 0, fx: { n: 0 } };
    await newRound(room);
  },

  act(room, pid, a) {
    const s = S(room);
    if (a.type === 'endClues' && s.stage === 'clues') {
      // everyone pressed "ready to vote"
      s.readyVote = [...new Set([...(s.readyVote || []), pid])];
      if (active(room).every((p) => s.readyVote.includes(p.id))) { s.readyVote = []; return skip(room, () => openVote(room)); }
      return;
    }
    if (a.type === 'vote' && s.stage === 'vote') {
      if (a.target === pid || !room.players.some((p) => p.id === a.target)) return;
      s.votes[pid] = a.target;
      if (active(room).every((p) => s.votes[p.id])) return skip(room, () => settleVote(room));
      return;
    }
    if (a.type === 'guess' && s.stage === 'guess' && pid === s.intruder) {
      s.guess = String(a.text || '').slice(0, 40);
      s.guessRight = sameWord(s.guess, s.word);
      if (s.guessRight) addScore(room, s.intruder, 1);
      fx(room, s.guessRight ? 'steal' : 'buzz');
      return skip(room, () => showReveal(room));
    }
  },

  view(room, viewer) {
    const s = S(room);
    const meIntruder = !!viewer && viewer === s.intruder;
    const revealed = s.stage === 'reveal' || s.stage === 'guess';
    return {
      ...timing(s), round: s.round, rounds: ROUNDS, category: s.category,
      card: viewer ? (meIntruder ? null : s.word) : undefined,
      amIntruder: meIntruder,
      order: s.order,
      readyVote: s.readyVote || [],
      voted: Object.keys(s.votes || {}),
      myVote: viewer ? s.votes?.[viewer] : null,
      reveal: revealed ? { intruder: s.intruder, counts: s.counts, caught: s.caught, word: s.stage === 'reveal' ? s.word : null, guess: s.guess, guessRight: s.guessRight } : null,
      leaderboard: scoreboard(room),
    };
  },
};
