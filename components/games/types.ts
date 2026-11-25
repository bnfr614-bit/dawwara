import type { RoomInfo } from '@/lib/useRoom';

export type GP = {
  room: RoomInfo;
  view: any;
  you: string | null;
  act: (a: any) => Promise<string | null>;
  mode: 'phone' | 'board';
  isHost: boolean;
};
