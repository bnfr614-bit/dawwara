'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import NameGate from '@/components/NameGate';
import Lobby from '@/components/Lobby';
import GameView from '@/components/games/GameView';
import { FxLayer, Toast } from '@/components/ui';
import EndScreen from '@/components/EndScreen';
import { useRoom } from '@/lib/useRoom';
import { unlockAudio } from '@/lib/sfx';
import Loading from '@/components/Loading';
import Icon from '@/components/Icon';
import { useGameTheme } from '@/lib/useGameTheme';

function RoomClient({ code }: { code: string }) {
  const { room, view, you, error, connected, kicked, act } = useRoom(code);
  const [toast, setToast] = useState<string | null>(null);
  useGameTheme(room?.game);
  const isHost = !!room && you === room.hostId;
  const doAct = async (a: any) => { unlockAudio(); const e = await act(a); if (e) setToast(e); return e; };

  if (kicked) return <div className="wrap section"><div className="error">صاحب الغرفة طلّعك منها.</div></div>;
  if (error) return (
    <div className="wrap section stack" style={{ maxWidth: 520 }}>
      <div className="error">{error}</div>
      <a className="btn ghost" href="/">رجوع للرئيسية</a>
    </div>
  );
  if (!room) return <Loading text="ندخلك الغرفة" />;

  return (
    <main className="wrap" style={{ paddingBottom: 40 }} onPointerDown={unlockAudio}>
      <div className="room-head">
        <div className="row">
          <span className="chip"><b>{room.gameName}</b></span>
          <span className="chip num" dir="ltr">{room.code}</span>
          {!connected && <span className="chip" style={{ color: 'var(--bad)' }}><span className="dots">نعيد الاتصال</span></span>}
        </div>
        {isHost && room.phase !== 'lobby' && (
          <a className="btn ghost icon" href={`/room/${room.code}/board`} target="_blank" rel="noopener" aria-label="افتح شاشة العرض" title="شاشة العرض"><Icon name="tv" size={20} /></a>
        )}
      </div>

      {room.phase === 'lobby' && <Lobby room={room} you={you} act={doAct} onError={setToast} />}
      {room.phase === 'playing' && view && <GameView game={room.game} room={room} view={view} you={you} act={doAct} mode="phone" isHost={isHost} />}
      {room.phase === 'end' && <EndScreen room={room} you={you} isHost={isHost} act={doAct} view={view} />}

      <FxLayer fx={view?.fx} sound={isHost} />
      <Toast msg={toast} onDone={() => setToast(null)} />
    </main>
  );
}

export default function RoomPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  return (
    <>
      <Header />
      <NameGate title={`دخول الغرفة ${code}: وش اسمك؟`}>
        <RoomClient code={code} />
      </NameGate>
    </>
  );
}
