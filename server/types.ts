import type { GameId } from '../lib/catalog';

export type Team = 'a' | 'b';

export type Player = {
  id: string;
  name: string;
  connected: boolean;
  score: number;
  team?: Team;
};

export type Room = {
  code: string;
  game: GameId;
  hostId: string;
  players: Player[];
  phase: 'lobby' | 'playing' | 'end';
  state: any;
  createdAt: number;
  update: () => void;
  timer: (ms: number, fn: () => void) => void;
  clearTimer: () => void;
  emitRaw: (event: string, data: unknown) => void;
};

export type ActResult = void | string | Promise<void | string>;

export interface GameEngine {
  start(room: Room): ActResult;
  act(room: Room, playerId: string, action: any, isHost: boolean): ActResult;
  /** viewerId null = shared TV board */
  view(room: Room, viewerId: string | null, isHost: boolean): any;
}

export const player = (room: Room, id: string) => room.players.find((p) => p.id === id);
export const active = (room: Room) => room.players.filter((p) => p.connected);
export const addScore = (room: Room, id: string, n: number) => {
  const p = player(room, id);
  if (p) p.score += n;
};
export const teamOf = (room: Room, t: Team) => room.players.filter((p) => p.team === t);
export const teamScore = (room: Room, t: Team) => room.state?.teamScores?.[t] ?? 0;

export function balanceTeams(room: Room) {
  const unassigned = room.players.filter((p) => !p.team);
  for (const p of unassigned) {
    const a = teamOf(room, 'a').length;
    const b = teamOf(room, 'b').length;
    p.team = a <= b ? 'a' : 'b';
  }
}
