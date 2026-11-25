'use client';
import { useEffect, useRef, useState } from 'react';
import Fanjal from '../Fanjal';
import { Countdown, nameOf, teamName } from '../ui';
import { getSocket } from '@/lib/useRoom';
import type { GP } from './types';

type Stroke = { id: string; p: number[]; c: string; w: number; clear?: boolean };
const COLORS = ['#111111', '#d23c2e', '#1f74c4', '#2b9a5c', '#f2b134', '#8a5a2b', '#ffffff'];

function Canvas({ strokes, canDraw, resetKey }: { strokes: Stroke[]; canDraw: boolean; resetKey: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const all = useRef<Stroke[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(5);

  const paint = (s: Stroke) => {
    const c = cv.current?.getContext('2d');
    if (!c || !cv.current) return;
    const W = cv.current.width, H = cv.current.height;
    c.strokeStyle = s.c; c.lineWidth = s.w * (W / 800); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i < s.p.length; i += 2) {
      const x = s.p[i] * W, y = s.p[i + 1] * H;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
  };
  const redraw = () => {
    const el = cv.current; if (!el) return;
    const c = el.getContext('2d')!;
    c.fillStyle = '#fffdf8'; c.fillRect(0, 0, el.width, el.height);
    all.current.forEach(paint);
  };

  // size to the box, keep a 4:3 drawing space
  useEffect(() => {
    const el = cv.current!;
    const fit = () => { const r = el.getBoundingClientRect(); el.width = Math.round(r.width * devicePixelRatio); el.height = Math.round(r.height * devicePixelRatio); redraw(); };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // full state from the server (join mid-round, new turn)
  useEffect(() => { all.current = [...strokes]; redraw(); }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // live strokes from the drawer
  useEffect(() => {
    const s = getSocket();
    const on = (st: Stroke) => {
      if (st.clear) { all.current = []; redraw(); return; }
      all.current.push(st); paint(st);
    };
    s.on('stroke', on);
    return () => { s.off('stroke', on); };
  }, []);

  // drawer input: send short segments as the finger moves
  const cur = useRef<Stroke | null>(null);
  const lastSend = useRef(0);
  const pos = (e: React.PointerEvent) => {
    const r = cv.current!.getBoundingClientRect();
    return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))];
  };
  const flush = (keepTail: boolean) => {
    const st = cur.current;
    if (!st || st.p.length < 4) return;
    getSocket().emit('stroke', st);
    all.current.push(st);
    const tail = st.p.slice(-2);
    cur.current = keepTail ? { id: Math.random().toString(36).slice(2, 10), p: tail, c: st.c, w: st.w } : null;
  };

  return (
    <div className="stack">
      <div className="canvas-wrap">
        <canvas
          ref={cv}
          aria-label={canDraw ? 'لوحة الرسم، ارسم بإصبعك' : 'رسمة الرسام'}
          style={{ cursor: canDraw ? 'crosshair' : 'default' }}
          onPointerDown={(e) => {
            if (!canDraw) return;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            cur.current = { id: Math.random().toString(36).slice(2, 10), p: pos(e), c: color, w: color === '#ffffff' ? width * 4 : width };
          }}
          onPointerMove={(e) => {
            if (!canDraw || !cur.current) return;
            const [x, y] = pos(e);
            const p = cur.current.p;
            p.push(x, y);
            paint({ ...cur.current, p: p.slice(-4) });
            if (Date.now() - lastSend.current > 50 || p.length > 300) { lastSend.current = Date.now(); flush(true); }
          }}
          onPointerUp={() => { if (cur.current && cur.current.p.length === 2) cur.current.p.push(cur.current.p[0] + 0.002, cur.current.p[1]); flush(false); cur.current = null; }}
          onPointerCancel={() => { flush(false); cur.current = null; }}
        />
      </div>
      {canDraw && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="palette">
            {COLORS.map((c) => (
              <button key={c} type="button" className={c === color ? 'sel' : ''} style={{ background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.25)' }}
                aria-label={c === '#ffffff' ? 'ممحاة' : `لون ${c}`} onClick={() => setColor(c)} />
            ))}
          </div>
          <div className="row">
            <input id="brush" type="range" min={2} max={16} value={width} onChange={(e) => setWidth(Number(e.target.value))} aria-label="سماكة القلم" />
            <button className="btn ghost sm" type="button" onClick={() => { getSocket().emit('stroke', { clear: true }); all.current = []; redraw(); }}>امسح</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Draw({ room, view: v, you, act, mode, isHost }: GP) {
  const board = mode === 'board';
  const me = room.players.find((p) => p.id === you);
  const team = room.players.filter((p) => p.team === v.turn);
  const resetKey = `${v.stage}-${v.drawer}-${v.turn}`;

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="chip pill-a">الأزرق {v.teamScores.a}</span>
        <span className="chip">أول فريق يوصل {v.target}</span>
        <span className="chip pill-b">الأحمر {v.teamScores.b}</span>
      </div>

      {v.stage === 'choose' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 120 : 64} talking /><div className="bubble grow">دور {teamName(v.turn)}! الكابتن {nameOf(room, v.captain)} يختار الرسام.</div></div>
          {v.canChoose && !board && (
            <div className="pick">{team.map((p) => <button key={p.id} type="button" onClick={() => act({ type: 'choose', drawer: p.id })}>{p.name}{p.id === you ? ' (أنا)' : ''}</button>)}</div>
          )}
        </>
      )}

      {(v.stage === 'draw' || v.stage === 'steal') && (
        <>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>الرسام: <b>{nameOf(room, v.drawer)}</b> ({teamName(v.turn)})</span>
            {v.stage === 'draw' ? <Countdown deadline={v.deadline} tick={board} /> : <span className="chip" style={{ color: 'var(--bad)' }}>خلص الوقت!</span>}
          </div>
          {v.word ? (
            <div className="secret" style={{ padding: 12 }}><div className="label">{v.amDrawer ? 'ارسم هذي الكلمة' : 'الكلمة (للحكم)'}</div><div className="big">{v.word}</div></div>
          ) : (
            <div className="center muted">{'_ '.repeat(v.wordLength)} ({v.wordLength} حروف)</div>
          )}
          <Canvas strokes={v.strokes} canDraw={!board && v.amDrawer && v.stage === 'draw'} resetKey={resetKey} />
          {v.stage === 'draw' && !board && (v.amDrawer || isHost) && (
            <div className="row">
              <button className="btn go grow" type="button" onClick={() => act({ type: 'got' })}>✓ فريقي خمّنها</button>
              <button className="btn ghost" type="button" onClick={() => act({ type: 'giveUp' })}>استسلم</button>
            </div>
          )}
          {v.stage === 'draw' && !board && !v.amDrawer && me?.team === v.turn && <p className="center">خمّنوا بصوت عالي!</p>}
          {v.stage === 'steal' && (
            <>
              <div className="host-bubble"><Fanjal size={board ? 100 : 56} mood="shock" /><div className="bubble grow">{teamName(v.turn === 'a' ? 'b' : 'a')}، عندكم محاولة وحدة!</div></div>
              {isHost && !board && (
                <div className="row"><button className="btn go grow" type="button" onClick={() => act({ type: 'steal', ok: true })}>✓ خمّنوها</button><button className="btn red grow" type="button" onClick={() => act({ type: 'steal', ok: false })}>✕ غلط</button></div>
              )}
            </>
          )}
        </>
      )}

      {v.stage === 'result' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 120 : 64} mood="wink" talking />
            <div className="bubble grow">الكلمة كانت <b style={{ color: 'var(--saffron)' }}>{v.result.word}</b>. {v.result.team ? `نقطة لـ${teamName(v.result.team)}${v.result.how === 'steal' ? ' بالسرقة!' : '!'}` : 'محد خمنها.'}</div>
          </div>
          <Canvas strokes={v.strokes} canDraw={false} resetKey={resetKey} />
          {isHost && !board && (
            <div className="row"><button className="btn go grow" type="button" onClick={() => act({ type: 'next' })}>الدور الجاي</button><button className="btn ghost" type="button" onClick={() => act({ type: 'end' })}>إنهاء</button></div>
          )}
        </>
      )}
    </div>
  );
}
