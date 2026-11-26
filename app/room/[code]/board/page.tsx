'use client';
import { useEffect, useState } from 'react';
import Lobby from '@/components/Lobby';
import GameView from '@/components/games/GameView';
import { FxLayer } from '@/components/ui';
import { useRoom } from '@/lib/useRoom';
import { unlockAudio } from '@/lib/sfx';
import EndScreen from '@/components/EndScreen';
import Loading from '@/components/Loading';
import { useGameTheme } from '@/lib/useGameTheme';

export default function Board({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const { room, view, error, act } = useRoom(code, { board: true });
  const [armed, setArmed] = useState(false);
  useGameTheme(room?.game);

  // the board is read from across the room: scale every rem with the screen width
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.fontSize;
    el.style.fontSize = 'clamp(16px, 1.2vw, 30px)';
    return () => { el.style.fontSize = prev; };
  }, []);

  if (error) return <div className="wrap section"><div className="error">{error}</div></div>;
  if (!room) return <Loading text="نجهّز الشاشة" />;

  return (
    <main className="tv">
      {!armed && (
        <button className="btn gold" type="button" style={{ position: 'fixed', bottom: 'calc(24px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}
          onClick={() => { unlockAudio(); setArmed(true); document.documentElement.requestFullscreen?.().catch(() => {}); }}>
          🔊 شغّل الصوت وملء الشاشة
        </button>
      )}
      {room.phase === 'lobby' && <div className="wrap" style={{ maxWidth: 1000 }}><Lobby room={room} you={null} act={act} onError={() => {}} board /></div>}
      {room.phase === 'playing' && view && <GameView game={room.game} room={room} view={view} you={null} act={act} mode="board" isHost={false} />}
      {room.phase === 'end' && <EndScreen room={room} view={view} board />}
      <FxLayer fx={view?.fx} sound={armed} />
      <div className="bulbs" aria-hidden="true" style={{ marginTop: "auto" }} />
    </main>
  );
}
