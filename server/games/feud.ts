import type { GameEngine, Room, Team } from '../types';
import { teamOf } from '../types';
import { FEUD } from '../content';
import { fresh, generators } from '../fresh';
import { matchAnswer } from '../matcher';
import { finish, fx, stage, skip, timing } from './util';

// Fully automatic Family-Feud flow: VS intro, 3-2-1, question + buzzer, typed answers on timers.
const ROUNDS = 3;
const T = { intro: 4, count: 3, buzz: 15, answer: 15, play: 20, steal: 25, reveal: 7 };

type Q = { q: string; a: { text: string; pts: number; aliases: string[] }[] };
const toQ = (x: { q: string; a: any[] }): Q => ({
  q: x.q,
  a: x.a.map((r: any) => ({ text: String(r[0]), pts: Number(r[1]) || 0, aliases: Array.isArray(r[2]) ? r[2] : [] }))
    .sort((m, n) => n.pts - m.pts).slice(0, 8),
});
const other = (t: Team): Team => (t === 'a' ? 'b' : 'a');
const S = (room: Room) => room.state;
const teamIdOf = (room: Room, pid: string) => room.players.find((p) => p.id === pid)?.team as Team;

function newRound(room: Room) {
  const s = S(room);
  const ta = teamOf(room, 'a'), tb = teamOf(room, 'b');
  Object.assign(s, {
    face: { a: ta[s.rot.a % ta.length].id, b: tb[s.rot.b % tb.length].id, buzz: null, turn: null, first: null },
    control: null, strikes: 0, open: s.qs[s.qi].a.map(() => false), pot: 0, last: null, roundWinner: null,
    mult: s.qi === ROUNDS - 1 ? 2 : 1, answerer: null,
  });
  s.rot.a++; s.rot.b++;
  fx(room, 'vs');
  stage(room, 'intro', T.intro, () => stage(room, 'countdown', T.count, () => openBuzz(room)));
}

function openBuzz(room: Room) {
  fx(room, 'reveal');
  stage(room, 'buzz', T.buzz, () => {
    // nobody pressed: the board goes to the team that plays first this round
    S(room).last = { none: true };
    startPlay(room, S(room).qi % 2 === 0 ? 'a' : 'b');
  });
}

function faceTurn(room: Room, pid: string) {
  const s = S(room);
  s.face.turn = pid;
  s.answerer = pid;
  stage(room, 'face', T.answer, () => resolve(room, pid, -1, '⏱'));
}

function startPlay(room: Room, team: Team) {
  const s = S(room);
  s.control = team;
  nextAnswerer(room);
}

function nextAnswerer(room: Room) {
  const s = S(room);
  const t = teamOf(room, s.control);
  s.answerer = t[s.ans[s.control] % t.length]?.id ?? null;
  s.ans[s.control]++;
  stage(room, 'play', T.play, () => resolve(room, s.answerer, -1, '⏱'));
}

function startSteal(room: Room) {
  const s = S(room);
  s.answerer = null;
  fx(room, 'stealOpen');
  stage(room, 'steal', T.steal, () => { s.last = { none: true }; finishRound(room, s.control); });
}

function reveal(room: Room, idx: number) {
  const s = S(room);
  if (s.open[idx]) return;
  s.open[idx] = true;
  s.pot += s.qs[s.qi].a[idx].pts * s.mult;
}

function finishRound(room: Room, team: Team | null) {
  const s = S(room);
  if (team) { s.teamScores[team] += s.pot; s.roundWinner = team; fx(room, 'award', { team, pts: s.pot }); }
  s.answerer = null;
  stage(room, 'reveal', T.reveal, () => {
    s.open = s.open.map(() => true);
    if (s.qi >= ROUNDS - 1) {
      room.players.forEach((p) => (p.score = s.teamScores[p.team as Team]));
      return finish(room);
    }
    s.qi++;
    newRound(room);
  });
}

/** Applies a judged answer (idx = board index, -1 = miss). */
function resolve(room: Room, pid: string | null, idx: number, text?: string) {
  const s = S(room);
  if (!pid) return;
  const team = teamIdOf(room, pid);
  if (text === '⏱') s.last = { pid, text: 'خلص الوقت', idx: -1, hit: false, timeout: true };
  if (idx >= 0) { reveal(room, idx); fx(room, idx === 0 ? 'top' : 'ding', { idx }); }

  if (s.stage === 'face') {
    if (idx < 0) fx(room, 'buzz');
    if (!s.face.first) {
      if (idx === 0) return startPlay(room, team);
      s.face.first = { pid, idx };
      return faceTurn(room, team === 'a' ? s.face.b : s.face.a);
    }
    const f = s.face.first;
    const secondWins = idx >= 0 && (f.idx < 0 || idx < f.idx);
    // both missed: the team that buzzed first keeps the board
    const winner = f.idx < 0 && idx < 0 ? teamIdOf(room, f.pid) : secondWins ? team : other(team);
    if (s.open.every(Boolean)) return finishRound(room, winner);
    return startPlay(room, winner);
  }

  if (s.stage === 'play') {
    if (idx < 0) {
      s.strikes++;
      fx(room, 'strike', { count: s.strikes });
      if (s.strikes >= 3) return startSteal(room);
    } else if (s.open.every(Boolean)) return finishRound(room, s.control);
    return nextAnswerer(room);
  }

  if (s.stage === 'steal') {
    if (idx >= 0) { fx(room, 'steal'); return finishRound(room, other(s.control)); }
    fx(room, 'stealFail');
    return finishRound(room, s.control);
  }
}

export const feud: GameEngine = {
  async start(room) {
    const qs = await fresh({ hostId: room.hostId, kind: 'feud', pool: FEUD, n: ROUNDS, key: (x) => x.q, generate: generators.feud });
    if (qs.length < ROUNDS) return 'ما قدرنا نجهز أسئلة كافية. جرّب مرة ثانية.';
    room.state = { qs: qs.map(toQ), qi: 0, teamScores: { a: 0, b: 0 }, rot: { a: 0, b: 0 }, ans: { a: 0, b: 0 }, busy: false, fx: { n: 0 } };
    newRound(room);
  },

  async act(room, pid, a) {
    const s = S(room);
    const q = s.qs[s.qi];
    if (a.type === 'buzz') {
      if (s.stage !== 'buzz' || s.face.buzz) return;
      if (pid !== s.face.a && pid !== s.face.b) return;
      s.face.buzz = pid;
      fx(room, 'bell', { pid });
      return skip(room, () => faceTurn(room, pid));
    }
    if (a.type !== 'answer') return;
    const text = String(a.text || '').trim().slice(0, 60);
    if (!text || s.busy) return;
    if (s.stage === 'steal') {
      if (teamIdOf(room, pid) !== other(s.control)) return 'السرقة لفريق الخصم بس.';
    } else if (!['face', 'play'].includes(s.stage) || s.answerer !== pid) return 'مو دورك تجاوب.';
    const stageAt = s.stage;
    const token = s.token;
    s.busy = true;
    s.last = { pid, text, pending: true };
    room.update();
    try {
      const closed = s.open.map((o: boolean, i: number) => (o ? i : -1)).filter((i: number) => i >= 0);
      const idx = await matchAnswer(text, q.a, q.q, closed);
      if (S(room) !== s || s.stage !== stageAt || s.token !== token) return; // timer won the race
      s.last = { pid, text, idx, hit: idx >= 0 };
      room.clearTimer();
      resolve(room, pid, idx);
    } finally {
      s.busy = false;
    }
  },

  view(room, viewer) {
    const s = S(room);
    const q = s.qs[s.qi];
    const me = viewer ? room.players.find((p) => p.id === viewer) : null;
    const showQ = !['intro', 'countdown'].includes(s.stage);
    const end = room.phase === 'end';
    return {
      ...timing(s),
      round: s.qi + 1, rounds: ROUNDS, mult: s.mult,
      question: showQ ? q.q : null,
      tiles: q.a.map((x: any, i: number) => ({
        n: i + 1, open: s.open[i] || end,
        text: s.open[i] || end ? x.text : null,
        pts: s.open[i] || end ? x.pts * s.mult : null,
      })),
      strikes: s.strikes, pot: s.pot, control: s.control, teamScores: s.teamScores, roundWinner: s.roundWinner,
      face: s.face, answerer: s.answerer, busy: s.busy, last: s.last,
      canBuzz: !!me && s.stage === 'buzz' && !s.face.buzz && (me.id === s.face.a || me.id === s.face.b),
      canAnswer: !!me && !s.busy && (
        (['face', 'play'].includes(s.stage) && s.answerer === me.id) ||
        (s.stage === 'steal' && me.team === other(s.control))
      ),
    };
  },
};
