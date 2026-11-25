import type { Server, Socket } from 'socket.io';
import { gameById, type GameId } from '../lib/catalog';
import type { GameEngine, Room } from './types';
import { balanceTeams } from './types';
import { feud } from './games/feud';
import { whoWrote } from './games/whoWrote';
import { intruder } from './games/intruder';
import { oddQuestion } from './games/oddQuestion';
import { draw } from './games/draw';
import { crime } from './games/crime';
import { letters } from './games/letters';

const ENGINES: Record<GameId, GameEngine> = {
  feud,
  'who-wrote': whoWrote,
  intruder,
  'odd-question': oddQuestion,
  draw,
  crime,
  letters,
};

const rooms = new Map<string, Room>();
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ROOMS = 1000;
const MAX_ROOMS_PER_HOST = 3;

// token bucket per socket: actions burst 15 / refill 8 per second; drawing strokes 60 / 40
function allow(socket: Socket, kind: 'act' | 'stroke' = 'act') {
  const [burst, rate] = kind === 'act' ? [15, 8] : [60, 40];
  const now = Date.now();
  const buckets = (socket.data.buckets ??= {});
  const b = (buckets[kind] ??= { t: now, n: burst });
  b.n = Math.min(burst, b.n + ((now - b.t) / 1000) * rate);
  b.t = now;
  if (b.n < 1) return false;
  b.n -= 1;
  return true;
}
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

let io: Server;

function newCode() {
  for (;;) {
    const c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    if (!rooms.has(c)) return c;
  }
}

export function getRoom(code: string) {
  return rooms.get((code || '').toUpperCase());
}

export function createRoom(game: GameId, host: { id: string; name: string }) {
  const code = newCode();
  let handle: NodeJS.Timeout | null = null;
  const room: Room = {
    code,
    game,
    hostId: host.id,
    players: [{ id: host.id, name: host.name, connected: false, score: 0 }],
    phase: 'lobby',
    state: null,
    createdAt: Date.now(),
    update: () => broadcast(room),
    timer: (ms, fn) => {
      if (handle) clearTimeout(handle);
      handle = setTimeout(() => {
        handle = null;
        try { fn(); } catch (e) { console.error(e); }
        broadcast(room);
      }, ms);
    },
    clearTimer: () => { if (handle) clearTimeout(handle); handle = null; },
    emitRaw: (event, data) => io?.to(code).emit(event, data),
  };
  rooms.set(code, room);
  return room;
}

function publicRoom(room: Room) {
  const info = gameById(room.game)!;
  return {
    code: room.code,
    game: room.game,
    gameName: info.name,
    teams: !!info.teams,
    min: info.min,
    max: info.max,
    hostId: room.hostId,
    phase: room.phase,
    players: room.players.map((p) => ({ id: p.id, name: p.name, connected: p.connected, score: p.score, team: p.team })),
  };
}

function viewFor(room: Room, viewerId: string | null) {
  if (room.phase !== 'playing' && room.phase !== 'end') return null;
  const isHost = viewerId === room.hostId;
  return ENGINES[room.game].view(room, viewerId, isHost);
}

export function broadcast(room: Room) {
  if (!io) return;
  const sockets = io.sockets.adapter.rooms.get(room.code);
  if (!sockets) return;
  const base = publicRoom(room);
  for (const sid of sockets) {
    const s = io.sockets.sockets.get(sid);
    if (!s) continue;
    const viewer: string | null = s.data.board ? null : s.data.userId;
    s.emit('room', { room: base, you: viewer, view: viewFor(room, viewer) });
  }
}

async function handleLobby(room: Room, uid: string, a: any): Promise<string | void> {
  const isHost = uid === room.hostId;
  const info = gameById(room.game)!;
  switch (a.type) {
    case 'team': {
      if (!info.teams) return;
      const target = isHost && a.playerId ? a.playerId : uid;
      const p = room.players.find((x) => x.id === target);
      if (p && (a.team === 'a' || a.team === 'b')) p.team = a.team;
      return;
    }
    case 'kick': {
      if (!isHost || a.playerId === room.hostId) return;
      room.players = room.players.filter((p) => p.id !== a.playerId);
      io.in(room.code).fetchSockets().then((ss) => ss.forEach((s) => {
        if (s.data.userId === a.playerId && !s.data.board) { s.emit('kicked'); s.leave(room.code); }
      }));
      return;
    }
    case 'start': {
      if (!isHost) return 'المضيف بس يقدر يبدأ اللعبة.';
      const n = room.players.filter((p) => p.connected).length;
      if (n < info.min) return `تحتاج ${info.min} لاعبين على الأقل. الحين متصل ${n}.`;
      room.players = room.players.filter((p) => p.connected);
      room.players.forEach((p) => (p.score = 0));
      if (info.teams) {
        balanceTeams(room);
        const a = room.players.filter((p) => p.team === 'a').length;
        const b = room.players.filter((p) => p.team === 'b').length;
        if (a < 2 || b < 2) return 'كل فريق يحتاج لاعبين اثنين على الأقل.';
      }
      if (room.state?.starting) return;
      room.state = { starting: true };
      try {
        room.phase = 'playing';
        const err = await ENGINES[room.game].start(room);
        if (err) { room.phase = 'lobby'; room.state = null; return err; }
      } catch (e) {
        room.phase = 'lobby'; room.state = null;
        throw e;
      }
      return;
    }
  }
}

export function attachSocketHandlers(server: Server, resolveUser: (s: Socket) => Promise<{ id: string; name: string } | null>) {
  io = server;
  // resolve the player before 'connection' fires, so no early event is dropped
  io.use(async (socket, next) => {
    try { socket.data.user = await resolveUser(socket); } catch { socket.data.user = null; }
    next();
  });
  io.on('connection', (socket) => {
    const user: { id: string; name: string } | null = socket.data.user;

    // rooms live in this process, so creation goes over the socket, not a Next route
    socket.on('create', ({ game }: { game: string }, ack?: (r: any) => void) => {
      if (!user) return ack?.({ error: 'اكتب اسمك أول.', needLogin: true });
      const info = gameById(game);
      if (!info) return ack?.({ error: 'اللعبة غير موجودة.' });
      // public site: cap open rooms per host and overall
      const mine = [...rooms.values()].filter((r) => r.hostId === user.id).sort((a, b) => a.createdAt - b.createdAt);
      while (mine.length >= MAX_ROOMS_PER_HOST) { const old = mine.shift()!; old.clearTimer(); rooms.delete(old.code); }
      if (rooms.size >= MAX_ROOMS) return ack?.({ error: 'الموقع زحمة الحين. جرّب بعد شوي.' });
      const room = createRoom(info.id, user);
      ack?.({ code: room.code });
    });

    socket.on('join', ({ code, board }: { code: string; board?: boolean }, ack?: (r: any) => void) => {
      const room = getRoom(code);
      if (!room) return ack?.({ error: 'ما لقينا غرفة بهالكود. تأكد منه أو اطلب كود جديد من المضيف.' });
      if (board) {
        if (!user || user.id !== room.hostId) return ack?.({ error: 'شاشة العرض للمضيف فقط.' });
        socket.data.board = true;
        socket.data.userId = user.id;
        socket.data.code = room.code;
        socket.join(room.code);
        ack?.({ ok: true });
        return broadcast(room);
      }
      if (!user) return ack?.({ error: 'سجّل دخولك أول عشان تدخل الغرفة.', needLogin: true });
      let p = room.players.find((x) => x.id === user.id);
      if (!p) {
        if (room.phase !== 'lobby') return ack?.({ error: 'اللعبة بدأت. انتظر الجولة الجاية واطلب من المضيف يرجّع الغرفة للانتظار.' });
        const info = gameById(room.game)!;
        if (room.players.length >= info.max) return ack?.({ error: `الغرفة مليانة (${info.max} لاعب).` });
        p = { id: user.id, name: user.name, connected: true, score: 0 };
        room.players.push(p);
      }
      p.connected = true;
      p.name = user.name;
      socket.data.userId = user.id;
      socket.data.code = room.code;
      socket.join(room.code);
      ack?.({ ok: true });
      broadcast(room);
    });

    socket.on('act', async (a: any, ack?: (r: any) => void) => {
      if (!allow(socket)) return ack?.({ error: 'شوي شوي! استنى ثانية.' });
      const room = getRoom(socket.data.code);
      const uid: string = socket.data.userId;
      if (!room || !uid) return ack?.({ error: 'انقطع الاتصال بالغرفة. حدّث الصفحة.' });
      if (!socket.data.board && !room.players.some((p) => p.id === uid)) return;
      const isHost = uid === room.hostId;
      let err: string | void;
      try {
        if (a?.type === 'toLobby') {
          if (!isHost) return;
          room.clearTimer();
          room.phase = 'lobby';
          room.state = null;
        } else if (room.phase === 'lobby') {
          err = await handleLobby(room, uid, a);
        } else {
          err = await ENGINES[room.game].act(room, uid, a, isHost);
        }
      } catch (e) {
        console.error(e);
        err = 'صار خطأ غير متوقع. جرّب مرة ثانية.';
      }
      ack?.(err ? { error: err } : { ok: true });
      broadcast(room);
    });

    // live drawing strokes: relayed without a full state broadcast
    socket.on('stroke', (stroke: any) => {
      if (!allow(socket, 'stroke')) return;
      const room = getRoom(socket.data.code);
      if (!room || room.game !== 'draw') return;
      if (draw.acceptStroke(room, socket.data.userId, stroke)) socket.to(room.code).emit('stroke', stroke);
    });

    socket.on('disconnect', () => {
      const room = getRoom(socket.data.code);
      if (!room || socket.data.board) return;
      const uid = socket.data.userId;
      const stillHere = [...(io.sockets.adapter.rooms.get(room.code) || [])].some((sid) => {
        const s = io.sockets.sockets.get(sid);
        return s && s.data.userId === uid && !s.data.board;
      });
      if (stillHere) return;
      const p = room.players.find((x) => x.id === uid);
      if (p) p.connected = false;
      if (room.phase === 'lobby' && p && uid !== room.hostId) room.players = room.players.filter((x) => x.id !== uid);
      broadcast(room);
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (now - room.createdAt > ROOM_TTL_MS) { room.clearTimer(); rooms.delete(code); }
    }
  }, 10 * 60 * 1000).unref();
}
