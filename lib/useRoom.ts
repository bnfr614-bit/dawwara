'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export type RoomInfo = {
  code: string; game: string; gameName: string; teams: boolean; min: number; max: number;
  hostId: string; phase: 'lobby' | 'playing' | 'end';
  lobby: { deadline: number | null; ready: string[]; error?: string };
  endAt: number | null;
  players: { id: string; name: string; connected: boolean; score: number; team?: 'a' | 'b' }[];
};

// server deadlines are in server time; shift them onto this device's clock
function localize(d: any) {
  const skew = Date.now() - (d.room?.now ?? Date.now());
  const fix = (t: number | null | undefined) => (t ? t + skew : t);
  if (d.room) { d.room.lobby = { ...d.room.lobby, deadline: fix(d.room.lobby?.deadline) }; d.room.endAt = fix(d.room.endAt); }
  if (d.view) d.view = { ...d.view, deadline: fix(d.view.deadline) };
  return d;
}

let shared: Socket | null = null;
export function getSocket() {
  if (!shared) shared = io({ path: '/ws', transports: ['websocket', 'polling'] });
  return shared;
}
/** reconnect so the server re-reads the device cookie (after setting a name) */
export function resetSocket() {
  shared?.disconnect();
  shared = null;
}

export function createRoom(game: string): Promise<{ code?: string; error?: string; needLogin?: boolean }> {
  const s = getSocket();
  return new Promise((res) => s.timeout(8000).emit('create', { game }, (err: any, r: any) => res(err ? { error: 'ما قدرنا نوصل للسيرفر.' } : r)));
}

export function useRoom(code: string, opts: { board?: boolean; enabled?: boolean } = {}) {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [view, setView] = useState<any>(null);
  const [you, setYou] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [connected, setConnected] = useState(false);
  const [kicked, setKicked] = useState(false);
  const sock = useRef<Socket | null>(null);
  const enabled = opts.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;
    const s = getSocket();
    sock.current = s;
    const join = () => {
      s.emit('join', { code, board: !!opts.board }, (r: any) => {
        if (r?.error) { setError(r.error); setNeedLogin(!!r.needLogin); }
        else { setError(null); setNeedLogin(false); }
      });
    };
    const onRoom = (raw: any) => { const d = localize(raw); setRoom(d.room); setView(d.view); setYou(d.you); };
    const onConnect = () => { setConnected(true); join(); };
    const onDisconnect = () => setConnected(false);
    const onKicked = () => setKicked(true);
    s.on('room', onRoom);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('kicked', onKicked);
    if (s.connected) onConnect();
    return () => {
      s.off('room', onRoom); s.off('connect', onConnect); s.off('disconnect', onDisconnect); s.off('kicked', onKicked);
    };
  }, [code, opts.board, enabled]);

  const act = useCallback((a: any): Promise<string | null> => {
    const s = sock.current;
    if (!s) return Promise.resolve('غير متصل');
    return new Promise((res) => s.timeout(15000).emit('act', a, (err: any, r: any) => res(err ? 'انقطع الاتصال، جرّب مرة ثانية.' : r?.error || null)));
  }, []);

  return { room, view, you, error, needLogin, connected, kicked, act, socket: sock };
}
