import type { GameEngine, Room } from '../types';
import { addScore, active } from '../types';
import { WHO_WROTE_PROMPTS, shuffle } from '../content';
import { finish, fx, scoreboard, skip, stage, timing } from './util';

const MAX_ROUNDS = 8;
const T = { write: 150, vote: 35, reveal: 8 };
const S = (r: Room) => r.state;

function beginVoting(room: Room) {
  const s = S(room);
  const all = Object.entries(s.stories).flatMap(([author, ts]: any) => ts.map((text: string) => ({ author, text })));
  if (Object.keys(s.stories).length < 2) {
    s.note = 'ما وصلت قصص كافية. لازم لاعبين اثنين على الأقل يكتبون.';
    return finish(room);
  }
  s.queue = shuffle(all);
  nextStory(room);
}

function nextStory(room: Room) {
  const s = S(room);
  s.votes = {};
  s.result = null;
  s.current = s.queue.shift() || null;
  if (!s.current || s.round >= MAX_ROUNDS) return finish(room);
  s.round++;
  fx(room, 'reveal');
  stage(room, 'vote', T.vote, () => reveal(room));
}

function reveal(room: Room) {
  const s = S(room);
  const author = s.current.author;
  const right = Object.entries(s.votes).filter(([, v]) => v === author).map(([k]) => k);
  right.forEach((id) => addScore(room, id, 2));
  if (right.length === 0) addScore(room, author, 5);
  s.result = { author, right };
  fx(room, right.length ? 'ding' : 'steal');
  stage(room, 'reveal', T.reveal, () => nextStory(room));
}

export const whoWrote: GameEngine = {
  start(room) {
    const prompts = shuffle(WHO_WROTE_PROMPTS);
    room.state = {
      round: 0, stories: {}, queue: [], current: null, votes: {}, result: null, fx: { n: 0 },
      prompts: Object.fromEntries(room.players.map((p, i) => [p.id, [prompts[(i * 2) % prompts.length], prompts[(i * 2 + 1) % prompts.length]]])),
    };
    stage(room, 'write', T.write, () => beginVoting(room));
  },

  act(room, pid, a) {
    const s = S(room);
    if (a.type === 'submit' && s.stage === 'write') {
      const list = (Array.isArray(a.stories) ? a.stories : []).map((x: any) => String(x || '').trim().slice(0, 400));
      if (list.length !== 2 || list.some((t: string) => t.length < 10)) return 'اكتب قصتين، كل وحدة 10 حروف على الأقل.';
      s.stories[pid] = list;
      if (active(room).every((p) => s.stories[p.id])) return skip(room, () => beginVoting(room));
      return;
    }
    if (a.type === 'vote' && s.stage === 'vote') {
      if (pid === s.current.author || a.target === pid || !room.players.some((p) => p.id === a.target)) return;
      s.votes[pid] = a.target;
      const voters = active(room).filter((p) => p.id !== s.current.author);
      if (voters.every((p) => s.votes[p.id])) return skip(room, () => reveal(room));
    }
  },

  view(room, viewer) {
    const s = S(room);
    return {
      ...timing(s), round: s.round, maxRounds: MAX_ROUNDS, note: s.note,
      prompts: viewer ? s.prompts[viewer] : null,
      submitted: Object.keys(s.stories),
      mySubmitted: viewer ? !!s.stories[viewer] : false,
      story: s.current ? s.current.text : null,
      isAuthor: !!viewer && s.current?.author === viewer,
      voted: Object.keys(s.votes || {}),
      myVote: viewer ? s.votes?.[viewer] : null,
      result: s.stage === 'reveal' ? { author: s.result.author, right: s.result.right, votes: s.votes } : null,
      leaderboard: scoreboard(room),
      left: s.queue.length,
    };
  },
};
