'use client';
import { useEffect, useRef, useState } from 'react';
import { play } from '@/lib/sfx';
import type { RoomInfo } from '@/lib/useRoom';

export const nameOf = (room: RoomInfo | null, id?: string | null) => room?.players.find((p) => p.id === id)?.name || '؟';
export const teamName = (t?: string | null) => (t === 'a' ? 'الفريق الأزرق' : t === 'b' ? 'الفريق الأحمر' : '');

/** Whole seconds left until `deadline` (device clock), updated 4×/s. */
export function useSecondsLeft(deadline?: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadline]);
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
}

/** Circular countdown that drains as the stage runs out. */
export function TimerRing({ deadline, total, size = 56, tick = false }: { deadline?: number | null; total?: number; size?: number; tick?: boolean }) {
  const left = useSecondsLeft(deadline);
  const prev = useRef(left);
  useEffect(() => {
    if (tick && left !== prev.current && left > 0 && left <= 5) play('tick');
    prev.current = left;
  }, [left, tick]);
  if (!deadline) return null;
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const frac = total ? Math.min(1, left / total) : 1;
  const low = left <= 5;
  return (
    <span className={`ring${low ? ' low' : ''}`} role="timer" aria-label={`باقي ${left} ثانية`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.12)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={low ? 'var(--bad)' : 'var(--gold)'} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset .25s linear' }} />
      </svg>
      <b style={{ fontSize: size * 0.36 }}>{left}</b>
    </span>
  );
}

export function Avatar({ name, team, size }: { name: string; team?: string | null; size?: number }) {
  return <span className={`av${team ? ` ${team}` : ''}`} style={size ? { width: size, height: size, fontSize: size * 0.45 } : undefined}>{name?.[0] || '؟'}</span>;
}

export function Buzzer({ onPress, label = 'اضغط!', small = false, disabled = false }: { onPress: () => void; label?: string; small?: boolean; disabled?: boolean }) {
  return (
    <button type="button" className={`buzzer${small ? ' sm' : ''}`} onClick={onPress} disabled={disabled} style={disabled ? { filter: 'grayscale(1)', opacity: .5 } : undefined}>
      {label}
    </button>
  );
}

export function Leaderboard({ rows, you }: { rows: { id: string; name: string; score: number }[]; you?: string | null }) {
  return (
    <div className="lb">
      {rows.map((r, i) => (
        <div key={r.id} style={r.id === you ? { outline: '2px solid var(--gold)' } : undefined}>
          <span className="row" style={{ gap: 8 }}><b className="num">{i + 1}</b><Avatar name={r.name} size={28} /> {r.name}{r.id === you ? ' (أنت)' : ''}</span>
          <b className="num display" style={{ fontSize: '1.3rem', color: 'var(--gold)' }}>{r.score}</b>
        </div>
      ))}
    </div>
  );
}

/** Plays the sound + visual for each new server cue exactly once. */
export function FxLayer({ fx, sound = true }: { fx?: { n: number; type: string } | null; sound?: boolean }) {
  const seen = useRef<number | null>(null);
  const [overlay, setOverlay] = useState<{ key: number; kind: 'x' | 'banner'; text?: string; count?: number } | null>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fx) return;
    if (seen.current === null) { seen.current = fx.n; return; } // don't replay on first load
    if (fx.n === seen.current) return;
    seen.current = fx.n;
    if (sound) play(fx.type);
    const k = fx.n;
    const banners: Record<string, string> = { steal: 'كفو!', stop: 'ستوب!', stealOpen: 'فرصة سرقة!', night: 'المدينة نامت' };
    if (fx.type === 'strike') setOverlay({ key: k, kind: 'x', count: (fx as any).count ?? 1 });
    if (banners[fx.type]) setOverlay({ key: k, kind: 'banner', text: banners[fx.type] });
    if (fx.type === 'steal') confetti(cv.current, 140);
    if (fx.type === 'win') confetti(cv.current, 280);
    if (fx.type === 'top') confetti(cv.current, 70);
    const t = setTimeout(() => setOverlay((o) => (o?.key === k ? null : o)), 1800);
    return () => clearTimeout(t);
  }, [fx, sound]);

  return (
    <>
      <canvas ref={cv} className="confetti" aria-hidden="true" />
      {overlay?.kind === 'x' && <div className="bigx" key={overlay.key} aria-hidden="true"><span>{'✕'.repeat(Math.min(3, overlay.count || 1))}</span></div>}
      {overlay?.kind === 'banner' && <div className="banner" key={overlay.key} aria-hidden="true"><b>{overlay.text}</b></div>}
    </>
  );
}

function confetti(canvas: HTMLCanvasElement | null, n: number) {
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = canvas.getContext('2d')!;
  canvas.width = innerWidth; canvas.height = innerHeight;
  const colors = ['#ffc21a', '#ff8f00', '#ffffff', '#27b4ff', '#ff3d63', '#2fe38f'];
  const parts = Array.from({ length: n }, (_, i) => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 260, y: innerHeight / 3,
    vx: (Math.random() - 0.5) * 15, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 3,
    a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, col: colors[i % colors.length], life: 180,
  }));
  const loop = () => {
    c.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of parts) {
      if (p.life-- <= 0) continue;
      alive++;
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += p.va;
      c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.col; c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); c.restore();
    }
    if (alive) requestAnimationFrame(loop); else c.clearRect(0, 0, canvas.width, canvas.height);
  };
  loop();
}

export function Toast({ msg, onDone }: { msg: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  if (!msg) return null;
  return <div className="toast" role="status">{msg}</div>;
}

/** Shared top strip for every game: round chip, stage label, timer. */
export function StageStrip({ left, label, v, board }: { left?: React.ReactNode; label?: React.ReactNode; v: any; board?: boolean }) {
  return (
    <div className="stage-strip">
      <div className="row" style={{ gap: 6 }}>{left}</div>
      <div className="row" style={{ gap: 10 }}>
        {label && <span className="chip">{label}</span>}
        <TimerRing deadline={v.deadline} total={v.total} size={board ? 84 : 56} tick={board} />
      </div>
    </div>
  );
}
