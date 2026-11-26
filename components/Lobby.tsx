'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { RoomInfo } from '@/lib/useRoom';
import { gameById } from '@/lib/catalog';
import Miko from './Miko';
import Icon from './Icon';
import { Avatar, TimerRing } from './ui';

export default function Lobby({ room, you, act, onError, board = false }: {
  room: RoomInfo; you: string | null; act: (a: any) => Promise<string | null>; onError: (m: string) => void; board?: boolean;
}) {
  const isOwner = you === room.hostId && !board;
  const info = gameById(room.game)!;
  const online = room.players.filter((p) => p.connected);
  const me = room.players.find((p) => p.id === you);
  const ready = room.lobby?.ready || [];
  const deadline = room.lobby?.deadline;
  const iAmReady = !!you && ready.includes(you);
  const need = Math.max(0, info.min - online.length);

  const [joinUrl, setJoinUrl] = useState('');
  useEffect(() => {
    const h = location.hostname;
    if (h !== 'localhost' && h !== '127.0.0.1') { setJoinUrl(location.host); return; }
    // on the host's own machine, show the Wi-Fi address phones can reach
    fetch('/api/net').then((r) => r.json()).then((d) => setJoinUrl(d.ips?.[0] ? `${d.ips[0]}:${d.port}` : location.host)).catch(() => setJoinUrl(location.host));
  }, []);
  // scanning the QR lands straight in this room
  const roomLink = joinUrl ? `${typeof location !== 'undefined' && joinUrl === location.host ? location.protocol : 'http:'}//${joinUrl}/room/${room.code}` : '';
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!roomLink) return;
    QRCode.toDataURL(roomLink, { margin: 1, width: 360, color: { dark: '#040a2c', light: '#ffffff' } }).then(setQr).catch(() => setQr(null));
  }, [roomLink]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(roomLink); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { onError(roomLink); }
  };

  const status = deadline
    ? 'اللعبة تبدأ تلقائياً بعد العد. اضغطوا «جاهز» كلكم عشان نبدأ أسرع!'
    : need > 0 ? `ننتظر ${need} لاعب بعد عشان نبدأ.` : 'ننتظر…';

  const PlayerTile = ({ p }: { p: RoomInfo['players'][number] }) => (
    <div className={`player${p.connected ? '' : ' off'}${p.team ? ` team-${p.team}` : ''}${ready.includes(p.id) ? ' on' : ''}`}>
      <Avatar name={p.name} team={p.team} />
      <span className="nm grow">{p.name}{p.id === you && !board ? ' (أنت)' : ''}</span>
      {ready.includes(p.id) && <span className="small" style={{ color: 'var(--ok)' }}>جاهز</span>}
      {isOwner && p.id !== room.hostId && (
        <button className="btn ghost icon" type="button" aria-label={`طرد ${p.name}`} title="طرد" onClick={() => act({ type: 'kick', playerId: p.id })}><Icon name="x" size={16} /></button>
      )}
    </div>
  );

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="card lobby-top">
        <div className="stack" style={{ gap: 14 }}>
          <div className="host-bubble">
            <Miko size={board ? 130 : 80} talking={!!deadline} wave />
            <div className="bubble grow">حياكم في «{info.name}»! {board ? 'امسحوا الكود بجوالاتكم أو ادخلوا العنوان.' : 'شارك الكود مع ربعك.'}</div>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'end' }}>
            <div>
              <div className="label">كود الغرفة</div>
              <div className="code-big" dir="ltr" style={board ? { fontSize: 'clamp(3.4rem, 10vh, 6.5rem)' } : undefined}>{room.code}</div>
            </div>
            {deadline && <TimerRing deadline={deadline} total={20} size={board ? 110 : 70} tick={board} />}
          </div>
          {joinUrl && (
            <div className="row">
              <span className="chip num" dir="ltr" style={{ fontSize: board ? '1.3rem' : undefined }}>{joinUrl}</span>
              {!board && <button className="btn ghost sm" type="button" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={16} /> {copied ? 'تم النسخ' : 'انسخ رابط الدخول'}</button>}
            </div>
          )}
          <div className="muted small">{online.length} متصل · {info.min}–{info.max} لاعب · {status}</div>
          {room.lobby?.error && <div className="error small">{room.lobby.error}</div>}
        </div>
        {qr && <div className="qr" style={{ width: board ? 'clamp(200px, 30vh, 320px)' : 168 }}><img src={qr} alt={`رمز QR لدخول الغرفة ${room.code}`} /></div>}
      </div>

      {room.teams ? (
        <div className="row" style={{ alignItems: 'stretch' }}>
          {(['a', 'b'] as const).map((t) => (
            <div key={t} className="card grow stack" style={{ borderTop: `5px solid var(--team-${t})`, flexBasis: 260 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 style={{ color: `var(--team-${t})`, fontSize: '1.6rem' }}>{t === 'a' ? 'الفريق الأزرق' : 'الفريق الأحمر'}</h3>
                {!board && me && me.team !== t && <button className={`btn sm ${t}`} type="button" onClick={() => act({ type: 'team', team: t })}>انضم</button>}
              </div>
              <div className="players">{room.players.filter((p) => p.team === t).map((p) => <PlayerTile key={p.id} p={p} />)}</div>
            </div>
          ))}
          {room.players.some((p) => !p.team) && (
            <div className="card grow stack" style={{ flexBasis: 200 }}>
              <h3 style={{ fontSize: '1.4rem' }}>بدون فريق</h3>
              <p className="muted small">ينوزعون تلقائياً لما تبدأ اللعبة.</p>
              <div className="players">{room.players.filter((p) => !p.team).map((p) => <PlayerTile key={p.id} p={p} />)}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="card stack">
          <h3 style={{ fontSize: '1.5rem' }}>اللاعبين</h3>
          <div className="players">{room.players.map((p) => <PlayerTile key={p.id} p={p} />)}</div>
        </div>
      )}

      {!board && me && (
        <button className={`btn lg block ${iAmReady ? 'ghost' : 'go'}`} type="button" onClick={() => act({ type: 'ready' })}>
          {iAmReady ? 'جاهز ✓ (اضغط للإلغاء)' : 'أنا جاهز'}
        </button>
      )}
      {isOwner && <a className="btn ghost block" href={`/room/${room.code}/board`} target="_blank" rel="noopener"><Icon name="tv" size={20} /> افتح شاشة العرض للتلفزيون</a>}
    </div>
  );
}
