import type { Room } from '../types';

/** Bumps a sound/animation cue that every client plays once. */
export function fx(room: Room, type: string, extra: Record<string, unknown> = {}) {
  room.state.fx = { type, ...extra, n: (room.state.fx?.n || 0) + 1 };
}

export function names(room: Room, ids: string[]) {
  return ids.map((id) => room.players.find((p) => p.id === id)?.name || '؟');
}

export function scoreboard(room: Room) {
  return [...room.players].sort((a, b) => b.score - a.score).map((p) => ({ id: p.id, name: p.name, score: p.score }));
}

export function deadline(room: Room, seconds: number, onEnd: () => void) {
  room.state.deadline = Date.now() + seconds * 1000;
  room.timer(seconds * 1000, () => {
    room.state.deadline = null;
    onEnd();
  });
}

export function finish(room: Room) {
  room.clearTimer();
  room.phase = 'end';
  fx(room, 'win');
}
