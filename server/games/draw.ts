import type { GameEngine, Room, Team } from '../types';
import { teamOf } from '../types';
import { DRAW_WORDS, pickOne } from '../content';
import { fresh, generators } from '../fresh';
import { sameWord } from '../matcher';
import { finish, fx, skip, stage, timing } from './util';

const TARGET = 5;
const MAX_TURNS = 12;
const T = { choose: 15, draw: 75, steal: 20, result: 7 };
const S = (r: Room) => r.state;
const other = (t: Team): Team => (t === 'a' ? 'b' : 'a');
const teamOfPid = (room: Room, pid: string) => room.players.find((p) => p.id === pid)?.team as Team;

function goChoose(room: Room, team: Team) {
  const s = S(room);
  if (s.turns >= MAX_TURNS) return end(room);
  s.turns++;
  Object.assign(s, { turn: team, drawer: null, word: null, strokes: [], result: null, guesses: [] });
  fx(room, 'vs');
  stage(room, 'choose', T.choose, () => startDraw(room, pickOne(teamOf(room, team)).id));
}

async function startDraw(room: Room, drawer: string) {
  const s = S(room);
  const [word] = await fresh({ hostId: room.hostId, kind: 'draw', pool: DRAW_WORDS, n: 1, key: (w) => w, generate: generators.words('أشياء تنرسم بسهولة') });
  Object.assign(s, { drawer, word, strokes: [] });
  fx(room, 'reveal');
  stage(room, 'draw', T.draw, () => { fx(room, 'stealOpen'); stage(room, 'steal', T.steal, () => result(room, null, 'none')); });
}

function result(room: Room, team: Team | null, how: string) {
  const s = S(room);
  if (team) { s.teamScores[team]++; fx(room, how === 'steal' ? 'steal' : 'ding'); } else fx(room, 'stealFail');
  s.result = { team, how, word: s.word };
  stage(room, 'result', T.result, () => {
    if (team && s.teamScores[team] >= TARGET) return end(room);
    goChoose(room, other(s.turn));
  });
}

function end(room: Room) {
  const s = S(room);
  room.players.forEach((p) => (p.score = s.teamScores[p.team as Team]));
  finish(room);
}

export const draw: GameEngine & { acceptStroke(room: Room, pid: string, stroke: any): boolean } = {
  start(room) {
    room.state = { teamScores: { a: 0, b: 0 }, fx: { n: 0 }, turns: 0, guesses: [] };
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

  act(room, pid, a) {
    const s = S(room);
    const team = teamOfPid(room, pid);
    if (a.type === 'choose' && s.stage === 'choose') {
      if (pid !== teamOf(room, s.turn)[0]?.id) return 'الكابتن بس يختار الرسام.';
      if (!teamOf(room, s.turn).some((p) => p.id === a.drawer)) return 'اختار رسام من نفس الفريق.';
      return skip(room, () => startDraw(room, a.drawer));
    }
    if (a.type === 'guess') {
      const text = String(a.text || '').trim().slice(0, 40);
      if (!text) return;
      if (s.stage === 'draw') {
        if (team !== s.turn || pid === s.drawer) return 'التخمين لفريق الرسام بس.';
        const ok = sameWord(text, s.word);
        s.guesses = [...s.guesses.slice(-11), { pid, text: ok ? '✓' : text, ok }];
        if (ok) return skip(room, () => result(room, s.turn, 'team'));
        fx(room, 'buzz');
        return;
      }
      if (s.stage === 'steal') {
        if (team !== other(s.turn)) return 'محاولة السرقة لفريق الخصم.';
        const ok = sameWord(text, s.word);
        s.guesses = [...s.guesses.slice(-11), { pid, text, ok }];
        return skip(room, () => result(room, ok ? other(s.turn) : null, ok ? 'steal' : 'none'));
      }
    }
  },

  view(room, viewer) {
    const s = S(room);
    const me = room.players.find((p) => p.id === viewer);
    const captain = teamOf(room, s.turn)[0]?.id;
    const showWord = viewer === s.drawer || s.stage === 'result' || room.phase === 'end';
    return {
      ...timing(s), turn: s.turn, teamScores: s.teamScores, target: TARGET,
      drawer: s.drawer, captain,
      word: showWord ? s.word : null,
      wordLength: s.word ? s.word.replace(/\s/g, '').length : 0,
      strokes: s.strokes,
      amDrawer: viewer === s.drawer,
      canChoose: s.stage === 'choose' && viewer === captain,
      canGuess: !!me && ((s.stage === 'draw' && me.team === s.turn && me.id !== s.drawer) || (s.stage === 'steal' && me.team === other(s.turn))),
      guesses: s.guesses.map((g: any) => ({ ...g, text: g.ok && s.stage === 'draw' ? '✓' : g.text })),
      result: s.result,
    };
  },
};
