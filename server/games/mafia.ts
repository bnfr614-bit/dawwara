import type { GameEngine, Room } from '../types';
import { addScore } from '../types';
import { pickOne, shuffle } from '../content';
import { finish, fx, skip, stage, timing } from './util';

// The app is the game master: it wakes each role on their phone, counts votes and announces mornings.
type Role = 'mafia' | 'citizen' | 'doctor' | 'detective';
const T = { roles: 14, morning: 18, discuss: 150, vote: 40, verdict: 9, night: 35 };
const S = (r: Room) => r.state;

function mafiaCount(n: number) {
  return n <= 6 ? 1 : n <= 9 ? 2 : n <= 12 ? 3 : 4;
}

const alive = (room: Room) => room.players.filter((p) => S(room).alive.includes(p.id));
const aliveWith = (room: Room, role: Role) => alive(room).filter((p) => S(room).roles[p.id] === role);
const isMafia = (room: Room, pid: string) => S(room).roles[pid] === 'mafia';

function winner(room: Room): 'mafia' | 'town' | null {
  const m = aliveWith(room, 'mafia').length;
  const others = alive(room).length - m;
  if (m === 0) return 'town';
  if (m >= others) return 'mafia';
  return null;
}

function checkEnd(room: Room): boolean {
  const s = S(room);
  const w = winner(room);
  if (!w) return false;
  s.winner = w;
  for (const p of room.players) {
    const mafiaSide = s.roles[p.id] === 'mafia';
    if ((w === 'mafia') === mafiaSide) addScore(room, p.id, 3);
  }
  fx(room, w === 'town' ? 'steal' : 'stealFail');
  stage(room, 'over', 2, () => finish(room));
  return true;
}

function night(room: Room) {
  const s = S(room);
  s.night++;
  Object.assign(s, { mafiaVotes: {}, protect: null, check: null, nightDone: [] });
  fx(room, 'night');
  stage(room, 'night', T.night, () => morning(room));
}

function nightActorsDone(room: Room) {
  const s = S(room);
  const mafiaOk = aliveWith(room, 'mafia').every((p) => s.mafiaVotes[p.id]);
  const docOk = aliveWith(room, 'doctor').every(() => s.protect);
  const detOk = aliveWith(room, 'detective').every(() => s.check);
  return mafiaOk && docOk && detOk;
}

function morning(room: Room) {
  const s = S(room);
  // mafia target: most votes among mafia, ties broken at random
  const c: Record<string, number> = {};
  Object.values(s.mafiaVotes).forEach((t: any) => (c[t] = (c[t] || 0) + 1));
  const max = Math.max(0, ...Object.values(c));
  const target = max ? pickOne(Object.keys(c).filter((k) => c[k] === max)) : null;
  const saved = !!target && target === s.protect;
  s.lastProtected = s.protect;
  s.news = { killed: target && !saved ? target : null, saved, night: s.night };
  if (target && !saved) {
    s.alive = s.alive.filter((id: string) => id !== target);
    fx(room, 'strike', { count: 1 });
  } else fx(room, 'ding');
  if (checkEnd(room)) return;
  stage(room, 'morning', T.morning, () => discuss(room));
}

function discuss(room: Room) {
  const s = S(room);
  s.readyVote = [];
  fx(room, 'reveal');
  stage(room, 'discuss', T.discuss, () => vote(room));
}

function vote(room: Room) {
  const s = S(room);
  s.dayVotes = {};
  fx(room, 'bell');
  stage(room, 'vote', T.vote, () => verdict(room));
}

function verdict(room: Room) {
  const s = S(room);
  const c: Record<string, number> = {};
  Object.values(s.dayVotes).forEach((t: any) => (c[t] = (c[t] || 0) + 1));
  const max = Math.max(0, ...Object.values(c));
  const tops = Object.keys(c).filter((k) => c[k] === max);
  // a clear plurality is needed; a tie or a win for "skip" means nobody leaves
  const out = max > 0 && tops.length === 1 && tops[0] !== 'skip' ? tops[0] : null;
  s.verdict = { out, role: out ? s.roles[out] : null, counts: c };
  if (out) { s.alive = s.alive.filter((id: string) => id !== out); fx(room, 'strike', { count: 1 }); }
  else fx(room, 'buzz');
  stage(room, 'verdict', T.verdict, () => { if (!checkEnd(room)) night(room); });
}

export const mafia: GameEngine = {
  start(room) {
    const ids = shuffle(room.players.map((p) => p.id));
    const roles: Record<string, Role> = {};
    const m = mafiaCount(ids.length);
    ids.forEach((id, i) => {
      roles[id] = i < m ? 'mafia' : i === m ? 'doctor' : i === m + 1 ? 'detective' : 'citizen';
    });
    room.state = {
      roles, alive: [...ids], night: 0, day: 0, fx: { n: 0 }, checks: {}, lastProtected: null,
      mafiaVotes: {}, dayVotes: {}, news: null, verdict: null, winner: null, readyVote: [],
    };
    // first night is for getting to know your role and your team; nobody is killed
    fx(room, 'night');
    stage(room, 'roles', T.roles, () => { S(room).news = { first: true }; stage(room, 'morning', 6, () => discuss(room)); });
  },

  act(room, pid, a) {
    const s = S(room);
    const me = s.roles[pid] as Role;
    if (!s.alive.includes(pid)) return 'أنت طالع من اللعبة. تابع بصمت.';
    const target = String(a.target || '');
    const valid = s.alive.includes(target);

    if (s.stage === 'night') {
      if (a.type === 'kill' && me === 'mafia' && valid && !isMafia(room, target)) s.mafiaVotes[pid] = target;
      else if (a.type === 'protect' && me === 'doctor' && valid) {
        if (target === s.lastProtected) return 'ما تقدر تحمي نفس الشخص ليلتين ورا بعض.';
        s.protect = target;
      } else if (a.type === 'check' && me === 'detective' && valid && !s.check && target !== pid) {
        s.check = target;
        (s.checks[pid] ||= []).push({ target, mafia: isMafia(room, target), night: s.night });
      } else return;
      if (nightActorsDone(room)) return skip(room, () => morning(room));
      return;
    }
    if (a.type === 'readyVote' && s.stage === 'discuss') {
      s.readyVote = [...new Set([...s.readyVote, pid])];
      if (s.readyVote.length > alive(room).length / 2) return skip(room, () => vote(room));
      return;
    }
    if (a.type === 'vote' && s.stage === 'vote') {
      if (target !== 'skip' && (!valid || target === pid)) return;
      s.dayVotes[pid] = target;
      if (alive(room).every((p) => s.dayVotes[p.id])) return skip(room, () => verdict(room));
    }
  },

  view(room, viewer) {
    const s = S(room);
    const me = viewer ? (s.roles[viewer] as Role) : null;
    const over = !!s.winner || room.phase === 'end';
    const amAlive = !!viewer && s.alive.includes(viewer);
    return {
      ...timing(s), night: s.night,
      role: me, amAlive,
      team: me === 'mafia' ? room.players.filter((p) => s.roles[p.id] === 'mafia').map((p) => p.id) : null,
      alive: s.alive,
      counts: { mafia: aliveWith(room, 'mafia').length, alive: s.alive.length },
      // night: each role only sees its own task
      mafiaVotes: me === 'mafia' ? s.mafiaVotes : null,
      myProtect: me === 'doctor' ? s.protect : null,
      lastProtected: me === 'doctor' ? s.lastProtected : null,
      checks: me === 'detective' && viewer ? s.checks[viewer] || [] : null,
      checkedTonight: me === 'detective' ? !!s.check : null,
      nightDoneMine: s.stage === 'night' && viewer ? (me === 'mafia' ? !!s.mafiaVotes[viewer] : me === 'doctor' ? !!s.protect : me === 'detective' ? !!s.check : true) : null,
      news: s.news,
      readyVote: s.readyVote,
      dayVotes: s.stage === 'vote' || s.stage === 'verdict' ? s.dayVotes : null,
      myVote: viewer ? s.dayVotes?.[viewer] : null,
      verdict: s.stage === 'verdict' ? s.verdict : null,
      winner: s.winner,
      roles: over ? s.roles : null,
    };
  },
};
