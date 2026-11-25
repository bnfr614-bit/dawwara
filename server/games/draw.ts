import type { GameEngine, Room, Team } from '../types';
import { teamOf } from '../types';
import { DRAW_WORDS } from '../content';
import { fresh, generators } from '../fresh';
import { deadline, finish, fx } from './util';

const SECONDS = 75;
const TARGET = 5;
const S = (r: Room) => r.state;
const other = (t: Team): Team => (t === 'a' ? 'b' : 'a');

function goChoose(room: Room, team: Team) {
  const s = S(room);
  room.clearTimer();
  Object.assign(s, { stage: 'choose', turn: team, drawer: null, word: null, strokes: [], deadline: null, result: null });
}

function score(room: Room, team: Team, how: string) {
  const s = S(room);
  room.clearTimer();
  s.deadline = null;
  s.teamScores[team]++;
  s.result = { team, how, word: s.word };
  s.stage = 'result';
  fx(room, 'ding');
  if (s.teamScores[team] >= TARGET) {
    room.players.forEach((p) => (p.score = s.teamScores[p.team as Team]));
    finish(room);
  }
}

export const draw: GameEngine & { acceptStroke(room: Room, pid: string, stroke: any): boolean } = {
  start(room) {
    room.state = { teamScores: { a: 0, b: 0 }, fx: { n: 0 }, target: TARGET, seconds: SECONDS };
    goChoose(room, 'a');
  },

  acceptStroke(room, pid, stroke) {
    const s = S(room);
    if (room.phase !== 'playing' || !s || s.stage !== 'draw' || s.drawer !== pid) return false;
    if (stroke?.clear) { s.strokes = []; return true; }
    const pts = Array.isArray(stroke?.p) ? stroke.p.slice(0, 400).map((n: any) => Math.max(0, Math.min(1, Number(n) || 0))) : null;
    if (!pts || pts.length < 2) return false;
    const clean = { id: String(stroke.id || '').slice(0, 20), p: pts, c: /^#[0-9a-f]{6}$/i.test(stroke.c) ? stroke.c : '#111111', w: Math.min(24, Math.max(1, Number(stroke.w) || 4)) };
    if (s.strokes.length < 4000) s.strokes.push(clean);
    Object.assign(stroke, clean);
    return true;
  },

  async act(room, pid, a, isHost) {
    const s = S(room);
    const team = room.players.find((p) => p.id === pid)?.team as Team;
    const captain = teamOf(room, s.turn)[0]?.id;
    switch (a.type) {
      case 'choose': {
        if (s.stage !== 'choose' || !(isHost || pid === captain)) return;
        const drawer = teamOf(room, s.turn).find((p) => p.id === a.drawer);
        if (!drawer) return 'اختار رسام من نفس الفريق.';
        const [word] = await fresh({ hostId: room.hostId, kind: 'draw', pool: DRAW_WORDS, n: 1, key: (w) => w, generate: generators.words('أشياء تنرسم بسهولة') });
        Object.assign(s, { stage: 'draw', drawer: drawer.id, word, strokes: [] });
        fx(room, 'round');
        deadline(room, SECONDS, () => { s.stage = 'steal'; fx(room, 'buzz'); });
        return;
      }
      case 'got': {
        if (s.stage === 'draw' && (isHost || pid === s.drawer)) score(room, s.turn, 'team');
        return;
      }
      case 'giveUp': {
        if (s.stage === 'draw' && (isHost || pid === s.drawer)) { room.clearTimer(); s.deadline = null; s.stage = 'steal'; fx(room, 'buzz'); }
        return;
      }
      case 'steal': {
        if (!isHost || s.stage !== 'steal') return;
        if (a.ok) score(room, other(s.turn), 'steal');
        else { s.result = { team: null, how: 'none', word: s.word }; s.stage = 'result'; fx(room, 'stealFail'); }
        return;
      }
      case 'next': {
        if ((isHost || team === other(s.turn)) && s.stage === 'result') goChoose(room, other(s.turn));
        return;
      }
      case 'end': {
        if (!isHost) return;
        room.players.forEach((p) => (p.score = s.teamScores[p.team as Team]));
        finish(room);
        return;
      }
    }
  },

  view(room, viewer, isHost) {
    const s = S(room);
    const me = room.players.find((p) => p.id === viewer);
    const captain = teamOf(room, s.turn)[0]?.id;
    const seesWord = viewer !== null && (viewer === s.drawer || (isHost && me?.team !== s.turn));
    return {
      stage: s.stage, turn: s.turn, teamScores: s.teamScores, target: TARGET, fx: s.fx,
      drawer: s.drawer, captain, deadline: s.deadline, seconds: SECONDS,
      word: seesWord || s.stage === 'result' || room.phase === 'end' ? s.word : null,
      wordLength: s.word ? s.word.replace(/\s/g, '').length : 0,
      strokes: s.strokes,
      amDrawer: viewer === s.drawer,
      canChoose: s.stage === 'choose' && (isHost || viewer === captain),
      result: s.result,
      isHost,
    };
  },
};
