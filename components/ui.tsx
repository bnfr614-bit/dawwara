'use client';
import { useEffect, useRef, useState } from 'react';
import { play } from '@/lib/sfx';
import type { RoomInfo } from '@/lib/useRoom';

export const nameOf = (room: RoomInfo | null, id?: string | null) => room?.players.find((p) => p.id === id)?.name || '؟';
export const teamName = (t?: string | null) => (t === 'a' ? 'الفريق الأزرق' : t === 'b' ? 'الفريق الأحمر' : '');

export function Countdown({ deadline, total, tick = false }: { deadline?: number | null; total?: number; tick?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadline]);
  const left = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  const prev = useRef(left);
  useEffect(() => {
    if (tick && left !== prev.current && left > 0 && left <= 5) play('tick');
    prev.current = left;
  }, [left, tick]);
  if (!deadline) return null;
  return (
    <span className={`timer${left <= 10 ? ' low' : ''}`} aria-live="off">
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
      {total ? <span className="sr-only"> من {total}</span> : null}
    </span>
  );
}

export function Leaderboard({ rows, you }: { rows: { id: string; name: string; score: number }[]; you?: string | null }) {
  return (
    <div className="lb">
      {rows.map((r, i) => (
        <div key={r.id} style={r.id === you ? { outline: '2px solid var(--saffron)' } : undefined}>
          <span>{i + 1}. {r.name}{r.id === you ? ' (أنت)' : ''}</span>
          <b className="num">{r.score}</b>
        </div>
      ))}
    </div>
  );
}

/** Plays the sound + visual for each new server cue exactly once. */
export function FxLayer({ fx, sound = true }: { fx?: { n: number; type: string; n2?: number } | null; sound?: boolean }) {
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
    if (fx.type === 'strike') setOverlay({ key: k, kind: 'x', count: (fx as any).count ?? 1 });
    if (fx.type === 'steal') { setOverlay({ key: k, kind: 'banner', text: 'كفو!' }); confetti(cv.current, 120); }
    if (fx.type === 'win') confetti(cv.current, 260);
    if (fx.type === 'top') confetti(cv.current, 60);
    if (fx.type === 'stop') setOverlay({ key: k, kind: 'banner', text: 'ستوب!' });
    const t = setTimeout(() => setOverlay((o) => (o?.key === k ? null : o)), 1800);
    return () => clearTimeout(t);
  }, [fx, sound]);

  return (
    <>
      <canvas ref={cv} className="confetti" aria-hidden="true" />
      {overlay?.kind === 'x' && (
        <div className="bigx" key={overlay.key} aria-hidden="true"><span>{'✕'.repeat(Math.min(3, overlay.count || 1))}</span></div>
      )}
      {overlay?.kind === 'banner' && (
        <div className="banner" key={overlay.key} aria-hidden="true"><b>{overlay.text}</b></div>
      )}
    </>
  );
}

function confetti(canvas: HTMLCanvasElement | null, n: number) {
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = canvas.getContext('2d')!;
  canvas.width = innerWidth; canvas.height = innerHeight;
  const colors = ['#f2b134', '#d23c2e', '#f6ead7', '#7aa35a', '#3f9be8'];
  const parts = Array.from({ length: n }, (_, i) => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 240, y: innerHeight / 3,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 4, r: Math.random() * 6 + 3,
    a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, col: colors[i % colors.length], life: 170,
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
