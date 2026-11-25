import type { GameEngine, Room, Team } from '../types';
import { teamOf } from '../types';
import { FEUD } from '../content';
import { fresh, generators } from '../fresh';
import { matchAnswer } from '../matcher';
import { fx, finish } from './util';

const ROUNDS = 3;
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
  s.face = {
    a: ta[s.rot.a % ta.length].id,
    b: tb[s.rot.b % tb.length].id,
    buzz: null, turn: null, first: null,
  };
  s.rot.a++; s.rot.b++;
  s.stage = 'faceoff';
  s.control = null;
  s.strikes = 0;
  s.open = s.qs[s.qi].a.map(() => false);
  s.rest = false;
  s.pot = 0;
  s.last = null;
  s.mult = s.qi === ROUNDS - 1 ? 2 : 1;
  fx(room, 'round');
}

function answererFor(room: Room): string | null {
  const s = S(room);
  if (s.stage === 'faceoff') return s.face.turn;
  if (s.stage === 'play') {
    const t = teamOf(room, s.control);
    return t[s.ans[s.control] % t.length]?.id ?? null;
  }
  return null; // steal: any member of the stealing team may answer once
}

function reveal(room: Room, idx: number) {
  const s = S(room);
  if (s.open[idx]) return;
  s.open[idx] = true;
  s.pot += s.qs[s.qi].a[idx].pts * s.mult;
}

function award(room: Room, team: Team) {
  const s = S(room);
  s.teamScores[team] += s.pot;
  s.roundWinner = team;
  s.stage = 'roundEnd';
  s.rest = true;
  fx(room, 'award', { team, pts: s.pot });
}

/** Applies a judged answer (idx = board index, -1 = miss) for player pid. */
function resolve(room: Room, pid: string, idx: number) {
  const s = S(room);
  const q = s.qs[s.qi];
  const team = teamIdOf(room, pid);
  if (idx >= 0) { reveal(room, idx); fx(room, idx === 0 ? 'top' : 'ding', { idx }); }
  else fx(room, 'buzz');

  if (s.stage === 'faceoff') {
    if (!s.face.first) {
      if (idx === 0) { s.control = team; s.stage = 'play'; return; }
      s.face.first = { pid, idx };
      s.face.turn = team === 'a' ? s.face.b : s.face.a;
      return;
    }
    const f = s.face.first;
    if (idx < 0 && f.idx < 0) { // both missed: buzz again
      s.face.buzz = null; s.face.turn = null; s.face.first = null;
      return;
    }
    const secondWins = idx >= 0 && (f.idx < 0 || idx < f.idx);
    s.control = secondWins ? team : other(team);
    s.stage = 'play';
    if (s.open.every(Boolean)) award(room, s.control);
    return;
  }

  if (s.stage === 'play') {
    s.ans[s.control]++;
    if (idx < 0) {
      s.strikes++;
      fx(room, 'strike', { count: s.strikes });
      if (s.strikes >= 3) { s.stage = 'steal'; s.stealBy = null; }
    } else if (s.open.every(Boolean)) {
      award(room, s.control);
    }
    return;
  }

  if (s.stage === 'steal') {
    if (idx >= 0) { fx(room, 'steal'); award(room, other(s.control)); }
    else { fx(room, 'stealFail'); award(room, s.control); }
  }
  void q;
}

export const feud: GameEngine = {
  async start(room) {
    const qs = await fresh({
      hostId: room.hostId, kind: 'feud', pool: FEUD, n: ROUNDS, key: (x) => x.q,
      generate: generators.feud,
    });
    if (qs.length < ROUNDS) return 'ما قدرنا نجهز أسئلة كافية. جرّب مرة ثانية.';
    room.state = {
      qs: qs.map(toQ), qi: 0, teamScores: { a: 0, b: 0 },
      rot: { a: 0, b: 0 }, ans: { a: 0, b: 0 }, busy: false, fx: { n: 0 },
    };
    newRound(room);
  },

  async act(room, pid, a, isHost) {
    const s = S(room);
    const q = s.qs[s.qi];
    switch (a.type) {
      case 'buzz': {
        if (s.stage !== 'faceoff' || s.face.buzz) return;
        if (pid !== s.face.a && pid !== s.face.b) return;
        s.face.buzz = pid; s.face.turn = pid;
        fx(room, 'bell', { pid });
        return;
      }
      case 'answer': {
        const text = String(a.text || '').trim().slice(0, 60);
        if (!text || s.busy || s.stage === 'roundEnd') return;
        if (s.stage === 'steal') {
          if (teamIdOf(room, pid) !== other(s.control)) return 'السرقة لفريق الخصم بس.';
        } else if (answererFor(room) !== pid) return 'مو دورك تجاوب.';
        s.busy = true;
        s.last = { pid, text, pending: true };
        room.update();
        try {
          const closed = s.open.map((o: boolean, i: number) => (o ? i : -1)).filter((i: number) => i >= 0);
          const idx = await matchAnswer(text, q.a, q.q, closed);
          if (S(room) !== s || s.stage === 'roundEnd') return;
          s.last = { pid, text, idx, hit: idx >= 0 };
          resolve(room, pid, idx);
        } finally {
          s.busy = false;
        }
        return;
      }
      // host overrides: the host is the judge and can correct the machine
      case 'reveal': {
        if (!isHost) return;
        const idx = Number(a.idx);
        if (!(idx >= 0 && idx < q.a.length) || s.open[idx]) return;
        if (s.stage === 'roundEnd') { s.open[idx] = true; fx(room, 'flip'); return; }
        const who = answererFor(room) || (s.stage === 'steal' ? teamOf(room, other(s.control))[0]?.id : null) || s.face.turn;
        if (!who) { reveal(room, idx); fx(room, 'ding'); return; }
        s.last = { pid: who, text: q.a[idx].text, idx, hit: true, byHost: true };
        resolve(room, who, idx);
        return;
      }
      case 'strike': {
        if (!isHost) return;
        const who = answererFor(room) || (s.stage === 'steal' ? teamOf(room, other(s.control))[0]?.id : null);
        if (!who) return;
        s.last = { pid: who, text: '—', idx: -1, hit: false, byHost: true };
        resolve(room, who, -1);
        return;
      }
      case 'revealAll': {
        if (!isHost || s.stage !== 'roundEnd') return;
        s.open = s.open.map(() => true);
        fx(room, 'flip');
        return;
      }
      case 'next': {
        if (!isHost || s.stage !== 'roundEnd') return;
        if (s.qi >= ROUNDS - 1) {
          const ts = s.teamScores;
          room.players.forEach((p) => (p.score = ts[p.team as Team]));
          return finish(room);
        }
        s.qi++;
        newRound(room);
        return;
      }
    }
  },

  view(room, viewer, isHost) {
    const s = S(room);
    const q = s.qs[s.qi];
    const showAll = isHost && viewer !== null;
    const me = viewer ? room.players.find((p) => p.id === viewer) : null;
    const answerer = answererFor(room);
    return {
      round: s.qi + 1, rounds: ROUNDS, mult: s.mult,
      question: q.q,
      tiles: q.a.map((x: any, i: number) => ({
        n: i + 1,
        open: s.open[i],
        text: s.open[i] || showAll ? x.text : null,
        pts: s.open[i] || showAll ? x.pts * s.mult : null,
      })),
      stage: s.stage, strikes: s.strikes, pot: s.pot,
      control: s.control, teamScores: s.teamScores, roundWinner: s.roundWinner,
      face: s.face, answerer, busy: s.busy, last: s.last, fx: s.fx,
      canBuzz: !!me && s.stage === 'faceoff' && !s.face.buzz && (me.id === s.face.a || me.id === s.face.b),
      canAnswer: !!me && !s.busy && (
        (s.stage !== 'steal' && s.stage !== 'roundEnd' && answerer === me.id) ||
        (s.stage === 'steal' && me.team === other(s.control))
      ),
      final: room.phase === 'end',
    };
  },
};
