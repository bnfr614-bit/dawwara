'use client';
import { useEffect, useRef, useState } from 'react';
import Fanjal from '../Fanjal';
import { Avatar, Buzzer, StageStrip, nameOf, teamName, useSecondsLeft } from '../ui';
import { play } from '@/lib/sfx';
import type { GP } from './types';

const otherTeam = (t: string) => (t === 'a' ? 'b' : 'a');

function hostLine(v: any, room: GP['room']) {
  const n = (id: string) => nameOf(room, id);
  if (v.stage === 'intro') return `المواجهة! ${n(v.face.a)} ضد ${n(v.face.b)}. جهزوا أصابعكم على الجرس!`;
  if (v.stage === 'countdown') return 'استعدوا…';
  if (v.busy && v.last?.pending) return `«${v.last.text}»… خلوني أشوف اللوحة!`;
  if (v.stage === 'reveal') return v.roundWinner ? `النقاط لـ${teamName(v.roundWinner)}! +${v.pot}` : 'انتهت الجولة.';
  if (v.last?.none) return v.stage === 'play' ? `محد ضغط! اللوحة لـ${teamName(v.control)}.` : 'خلص الوقت!';
  if (v.last && !v.last.pending) {
    if (v.stage === 'steal') return `ثلاث أكسات! ${teamName(otherTeam(v.control))}، تشاوروا: عندكم إجابة وحدة تسرقون فيها كل النقاط!`;
    if (v.last.timeout) return `${n(v.last.pid)} ما لحق! اكس.`;
    if (v.last.hit) return v.last.idx === 0 ? `«${v.last.text}» الإجابة الأولى! أسطورة يا ${n(v.last.pid)}!` : `«${v.last.text}» موجودة! كفو يا ${n(v.last.pid)}.`;
    return `«${v.last.text}»؟ ما لها وجود على اللوحة!`;
  }
  if (v.stage === 'buzz') return `${n(v.face.a)} و${n(v.face.b)}، أسرع واحد على الجرس!`;
  if (v.stage === 'face') return `${n(v.answerer)} ضغط! جاوب قبل يخلص الوقت.`;
  if (v.stage === 'play') return `${teamName(v.control)} ماسك اللوحة. الدور على ${n(v.answerer)}.`;
  if (v.stage === 'steal') return `فرصة السرقة لـ${teamName(otherTeam(v.control))}!`;
  return 'سألنا ١٠٠ شخص…';
}

export function FeudBoard({ v }: { v: any }) {
  const n = v.tiles.length;
  const half = Math.ceil(n / 2);
  return (
    <div className={`feud-board${n <= 4 ? ' one' : ''}`}>
      {v.tiles.map((t: any, i: number) => (
        <div key={i} className={`tile${t.open ? ' open' : ''}`} style={{ order: n <= 4 ? i : i < half ? i * 2 : (i - half) * 2 + 1 }}>
          <div className="tile-in">
            <div className="f"><span className="n">{t.n}</span></div>
            <div className="b"><span className="t">{t.text}</span><span className="p">{t.pts}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Strikes({ n }: { n: number }) {
  return <div className="strikes" aria-label={`${n} من 3 أكسات`}>{[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''}>✕</i>)}</div>;
}

function VS({ v, room }: { v: any; room: GP['room'] }) {
  const a = room.players.find((p) => p.id === v.face.a);
  const b = room.players.find((p) => p.id === v.face.b);
  return (
    <div className="vs" aria-label={`${a?.name} ضد ${b?.name}`}>
      <div className="side" style={{ color: 'var(--team-a)' }}><Avatar name={a?.name || '؟'} team="a" /><b>{a?.name}</b><span className="chip pill-a">الأزرق</span></div>
      <div className="x">ضد</div>
      <div className="side b" style={{ color: 'var(--team-b)' }}><Avatar name={b?.name || '؟'} team="b" /><b>{b?.name}</b><span className="chip pill-b">الأحمر</span></div>
    </div>
  );
}

function Count({ v, sound }: { v: any; sound: boolean }) {
  const left = useSecondsLeft(v.deadline);
  const prev = useRef(-1);
  useEffect(() => { if (sound && left !== prev.current && left > 0) play('count'); prev.current = left; }, [left, sound]);
  return <div className="count-big" key={left}>{left || '!'}</div>;
}

function Podium({ t, v, room }: { t: 'a' | 'b'; v: any; room: GP['room'] }) {
  const on = (v.stage === 'steal' ? otherTeam(v.control) : v.control) === t;
  return (
    <div className={`podium ${t}${on ? ' on' : ''}`}>
      <div className="pn">{t === 'a' ? 'الأزرق' : 'الأحمر'}</div>
      <div className="ps">{v.teamScores[t]}</div>
      <div className="stack" style={{ gap: 4, width: '100%' }}>
        {room.players.filter((p) => p.team === t).map((p) => (
          <div key={p.id} className={`player team-${t}${p.id === v.answerer || p.id === v.face?.buzz ? ' on' : ''}`}>
            <span className="av">{p.name[0]}</span><span className="nm">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Feud({ room, view: v, you, act, mode }: GP) {
  const [text, setText] = useState('');
  const board = mode === 'board';
  const line = hostLine(v, room);
  const pre = v.stage === 'intro' || v.stage === 'countdown';
  const me = room.players.find((p) => p.id === you);

  const center = (
    <>
      {v.stage === 'intro' && <VS v={v} room={room} />}
      {v.stage === 'countdown' && <Count v={v} sound={board} />}
      {!pre && <div className="q-banner">{v.question}</div>}
      {!pre && <FeudBoard v={v} />}
    </>
  );

  const strip = (
    <StageStrip v={pre ? { ...v, deadline: null } : v} board={board}
      left={<><span className="chip gold">الجولة {v.round} من {v.rounds}</span>{v.mult > 1 && <span className="chip">النقاط ×{v.mult}</span>}</>}
      label={!pre && <>نقاط الجولة <b className="num">{v.pot}</b></>} />
  );

  if (board) {
    return (
      <div className="stack" style={{ gap: 18 }}>
        {strip}
        <div className="tv-stage">
          <Podium t="a" v={v} room={room} />
          <div className="tv-center stack" style={{ gap: 16 }}>
            <div className="host-bubble"><Fanjal size={100} talking={!!v.busy || pre} mood={v.last && !v.last.pending && !v.last.hit && !v.last.none ? 'shock' : 'happy'} wave={v.stage === 'intro'} /><div className="bubble grow">{line}</div></div>
            {center}
            {!pre && <Strikes n={v.strikes} />}
          </div>
          <Podium t="b" v={v} room={room} />
        </div>
      </div>
    );
  }

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await act({ type: 'answer', text: t });
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      {strip}
      <div className="row" style={{ justifyContent: 'center' }}>
        <span className="chip pill-a">الأزرق <b className="num">{v.teamScores.a}</b></span>
        <span className="chip pill-b">الأحمر <b className="num">{v.teamScores.b}</b></span>
        {me?.team && <span className="chip">فريقك: {teamName(me.team)}</span>}
      </div>
      <div className="host-bubble"><Fanjal size={64} talking={!!v.busy || pre} /><div className="bubble grow">{line}</div></div>

      {center}

      {v.canBuzz && <Buzzer onPress={() => act({ type: 'buzz' })} />}

      {v.canAnswer && (
        <form className="card stack" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label className="label" htmlFor="feud-answer">{v.stage === 'steal' ? 'إجابة السرقة: وحدة بس، تشاوروا!' : 'دورك! اكتب إجابتك'}</label>
          <div className="row">
            <input id="feud-answer" className="input grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب إجابتك…" maxLength={60} autoFocus autoComplete="off" />
            <button className="btn gold" disabled={!text.trim()}>أرسل</button>
          </div>
        </form>
      )}

      {!pre && !v.canBuzz && !v.canAnswer && v.stage !== 'reveal' && me && (
        <p className="center muted">
          {v.stage === 'buzz' ? 'تابع المواجهة على الجرس.' : me.team === (v.stage === 'steal' ? otherTeam(v.control) : v.control) ? 'فريقك يلعب. ساعدهم!' : 'فريق الخصم يلعب الحين.'}
        </p>
      )}
      {!pre && <Strikes n={v.strikes} />}
    </div>
  );
}
