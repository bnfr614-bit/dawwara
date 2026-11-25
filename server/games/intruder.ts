import type { GameEngine, Room } from '../types';
import { addScore, active } from '../types';
import { INTRUDER_WORDS, pickOne, shuffle } from '../content';
import { fresh, generators } from '../fresh';
import { sameWord } from '../matcher';
import { fx, finish, scoreboard } from './util';

const S = (r: Room) => r.state;
const CATEGORIES = Object.keys(INTRUDER_WORDS);

function tally(votes: Record<string, string>) {
  const c: Record<string, number> = {};
  Object.values(votes).forEach((v) => (c[v] = (c[v] || 0) + 1));
  const max = Math.max(0, ...Object.values(c));
  const top = Object.keys(c).filter((k) => c[k] === max);
  return { counts: c, top: top.length === 1 ? top[0] : null };
}

function settleVote(room: Room) {
  const s = S(room);
  const { counts, top } = tally(s.votes);
  Object.entries(s.votes).forEach(([v, t]) => { if (t === s.intruder) addScore(room, v, 1); });
  s.counts = counts;
  s.caught = top === s.intruder;
  if (s.caught) { s.stage = 'guess'; fx(room, 'ding'); }
  else { addScore(room, s.intruder, 2); s.stage = 'reveal'; fx(room, 'steal'); }
}

export const intruder: GameEngine = {
  start(room) {
    room.state = { stage: 'pick', round: 0, fx: { n: 0 }, categories: CATEGORIES };
  },

  async act(room, pid, a, isHost) {
    const s = S(room);
    switch (a.type) {
      case 'category': {
        if (!isHost || (s.stage !== 'pick' && s.stage !== 'reveal')) return;
        const cat = CATEGORIES.includes(a.category) ? a.category : pickOne(CATEGORIES);
        const [word] = await fresh({
          hostId: room.hostId, kind: `intruder:${cat}`, pool: INTRUDER_WORDS[cat], n: 1, key: (w) => w,
          generate: generators.words(cat),
        });
        const players = active(room);
        Object.assign(s, {
          stage: 'clues', round: s.round + 1, category: cat, word,
          intruder: pickOne(players).id, order: shuffle(players.map((p) => p.id)),
          votes: {}, counts: null, caught: false, guess: null, guessRight: null,
        });
        fx(room, 'round');
        return;
      }
      case 'openVote': {
        if (isHost && s.stage === 'clues') { s.stage = 'vote'; fx(room, 'bell'); }
        return;
      }
      case 'vote': {
        if (s.stage !== 'vote' || a.target === pid || !room.players.some((p) => p.id === a.target)) return;
        s.votes[pid] = a.target;
        if (active(room).every((p) => s.votes[p.id])) settleVote(room);
        return;
      }
      case 'closeVote': {
        if (isHost && s.stage === 'vote' && Object.keys(s.votes).length) settleVote(room);
        return;
      }
      case 'guess': {
        if (s.stage !== 'guess' || pid !== s.intruder) return;
        s.guess = String(a.text || '').slice(0, 40);
        s.guessRight = sameWord(s.guess, s.word);
        if (s.guessRight) addScore(room, s.intruder, 1);
        s.stage = 'reveal';
        fx(room, s.guessRight ? 'steal' : 'buzz');
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
    const meIntruder = viewer && viewer === s.intruder;
    const showSecret = viewer !== null && s.stage !== 'pick';
    return {
      stage: s.stage, round: s.round, fx: s.fx, isHost,
      categories: s.categories, category: s.category,
      card: showSecret ? (meIntruder ? null : s.word) : undefined,
      amIntruder: !!meIntruder && showSecret,
      order: s.order,
      voted: Object.keys(s.votes || {}),
      myVote: viewer ? s.votes?.[viewer] : null,
      reveal: s.stage === 'reveal' || s.stage === 'guess' ? {
        intruder: s.intruder, counts: s.counts, caught: s.caught,
        word: s.stage === 'reveal' ? s.word : null, guess: s.guess, guessRight: s.guessRight,
      } : null,
      leaderboard: scoreboard(room),
    };
  },
};
