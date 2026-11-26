import type { Room } from '../types';

/** Bumps a sound/animation cue that every client plays once. */
export function fx(room: Room, type: string, extra: Record<string, unknown> = {}) {
  room.state.fx = { type, ...extra, n: (room.state.fx?.n || 0) + 1 };
}

export function scoreboard(room: Room) {
  return [...room.players].sort((a, b) => b.score - a.score).map((p) => ({ id: p.id, name: p.name, score: p.score }));
}

/**
 * Moves the game to `stage` for `seconds`, then runs `next`.
 * Every game runs on these timers: nobody has to press "next".
 */
export function stage(room: Room, name: string, seconds: number, next: () => void | Promise<void>) {
  const s = room.state;
  s.stage = name;
  s.deadline = Date.now() + seconds * 1000;
  s.total = seconds;
  const token = (s.token = (s.token || 0) + 1);
  room.timer(seconds * 1000, async () => {
    if (room.state !== s || s.token !== token) return; // stage already moved on
    s.deadline = null;
    await next();
  });
}

/** Ends the current stage early (everyone acted) and runs `next` now. */
export async function skip(room: Room, next: () => void | Promise<void>) {
  room.state.token = (room.state.token || 0) + 1;
  room.clearTimer();
  room.state.deadline = null;
  await next();
}

export function finish(room: Room) {
  room.clearTimer();
  if (room.state) room.state.deadline = null;
  room.phase = 'end';
  fx(room, 'win');
}

export const timing = (s: any) => ({ stage: s.stage, deadline: s.deadline, total: s.total, now: Date.now(), fx: s.fx });
