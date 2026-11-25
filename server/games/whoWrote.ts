import type { GameEngine, Room } from '../types';
import { addScore, active } from '../types';
import { WHO_WROTE_PROMPTS, shuffle } from '../content';
import { fx, finish, scoreboard } from './util';

const MAX_ROUNDS = 10;
const S = (r: Room) => r.state;

function nextStory(room: Room) {
  const s = S(room);
  s.votes = {};
  s.result = null;
  s.current = s.queue.shift() || null;
  if (!s.current || s.round >= MAX_ROUNDS) return finish(room);
  s.round++;
  s.stage = 'vote';
  fx(room, 'round');
}

function reveal(room: Room) {
  const s = S(room);
  const author = s.current.author;
  const right = Object.entries(s.votes).filter(([, v]) => v === author).map(([k]) => k);
  right.forEach((id) => addScore(room, id, 2));
  if (right.length === 0) addScore(room, author, 5);
  s.result = { author, right };
  s.stage = 'reveal';
  fx(room, right.length ? 'ding' : 'steal');
}

export const whoWrote: GameEngine = {
  start(room) {
    const prompts = shuffle(WHO_WROTE_PROMPTS);
    room.state = {
      stage: 'write', round: 0, stories: {}, queue: [], current: null, votes: {}, result: null, fx: { n: 0 },
      prompts: Object.fromEntries(room.players.map((p, i) => [p.id, [prompts[(i * 2) % prompts.length], prompts[(i * 2 + 1) % prompts.length]]])),
    };
  },

  act(room, pid, a, isHost) {
    const s = S(room);
    switch (a.type) {
      case 'submit': {
        if (s.stage !== 'write') return;
        const list = (Array.isArray(a.stories) ? a.stories : []).map((x: any) => String(x || '').trim().slice(0, 400));
        if (list.length !== 2 || list.some((t: string) => t.length < 10)) return 'اكتب قصتين، كل وحدة 10 حروف على الأقل.';
        s.stories[pid] = list;
        if (active(room).every((p) => s.stories[p.id])) return this.act(room, pid, { type: 'begin' }, true);
        return;
      }
      case 'begin': {
        if (!isHost || s.stage !== 'write') return;
        const all = Object.entries(s.stories).flatMap(([author, ts]: any) => ts.map((text: string) => ({ author, text })));
        if (all.length < 2) return 'نحتاج قصص من لاعبين اثنين على الأقل.';
        s.queue = shuffle(all);
        return nextStory(room);
      }
      case 'vote': {
        if (s.stage !== 'vote' || pid === s.current.author) return;
        if (!room.players.some((p) => p.id === a.target) || a.target === pid) return;
        s.votes[pid] = a.target;
        const voters = active(room).filter((p) => p.id !== s.current.author);
        if (voters.every((p) => s.votes[p.id])) reveal(room);
        return;
      }
      case 'reveal': {
        if (isHost && s.stage === 'vote') reveal(room);
        return;
      }
      case 'next': {
        if (isHost && s.stage === 'reveal') nextStory(room);
        return;
      }
    }
  },

  view(room, viewer, isHost) {
    const s = S(room);
    const me = viewer;
    return {
      stage: s.stage, round: s.round, maxRounds: MAX_ROUNDS, fx: s.fx,
      prompts: me ? s.prompts[me] : null,
      submitted: Object.keys(s.stories),
      mySubmitted: me ? !!s.stories[me] : false,
      story: s.current ? s.current.text : null,
      isAuthor: !!me && s.current?.author === me,
      voted: Object.keys(s.votes),
      myVote: me ? s.votes[me] : null,
      result: s.stage === 'reveal' ? {
        author: s.result.author,
        right: s.result.right,
        votes: s.votes,
      } : null,
      leaderboard: scoreboard(room),
      left: s.queue.length,
      isHost,
    };
  },
};
