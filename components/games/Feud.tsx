'use client';
import { useState } from 'react';
import Fanjal from '../Fanjal';
import { nameOf, teamName } from '../ui';
import type { GP } from './types';

function hostLine(v: any, room: GP['room']) {
  const n = (id: string) => nameOf(room, id);
  if (v.busy && v.last?.pending) return `«${v.last.text}»… خلوني أشوف اللوحة.`;
  if (v.stage === 'roundEnd') return v.roundWinner ? `النقاط لـ${teamName(v.roundWinner)}! +${v.pot}` : 'انتهت الجولة.';
  if (v.last && !v.last.pending) {
    if (v.stage === 'steal' && !v.last.hit) return `ثلاث أكسات! ${teamName(v.control === 'a' ? 'b' : 'a')}، تشاوروا وعندكم إجابة وحدة تسرقون فيها كل شي!`;
    if (v.last.hit) return v.last.idx === 0 ? `«${v.last.text}» الإجابة الأولى! أسطورة يا ${n(v.last.pid)}!` : `«${v.last.text}» موجودة! كفو يا ${n(v.last.pid)}.`;
    return `«${v.last.text}»؟ ما لها وجود على اللوحة!`;
  }
  if (v.stage === 'faceoff') return v.face.buzz ? `${n(v.face.buzz)} ضغط أول! جاوب.` : `مواجهة: ${n(v.face.a)} ضد ${n(v.face.b)}. أسرع واحد على الجرس!`;
  if (v.stage === 'play') return `${teamName(v.control)} ماسك اللوحة. الدور على ${n(v.answerer)}.`;
  if (v.stage === 'steal') return `فرصة السرقة لـ${teamName(v.control === 'a' ? 'b' : 'a')}!`;
  return 'سألنا ١٠٠ شخص…';
}

function Board({ v, hostPeek, onTile }: { v: any; hostPeek?: boolean; onTile?: (i: number) => void }) {
  const n = v.tiles.length;
  const half = Math.ceil(n / 2);
  return (
    <div className={`feud-board${n <= 4 ? ' one' : ''}`}>
      {v.tiles.map((t: any, i: number) => (
        <div key={i} className={`tile${t.open ? ' open' : ''}${onTile && !t.open ? ' host-click' : ''}`} style={{ order: n <= 4 ? i : i < half ? i * 2 : (i - half) * 2 + 1 }}>
          <div className="tile-in">
            <div className="f" onClick={() => onTile && !t.open && onTile(i)} role={onTile ? 'button' : undefined} tabIndex={onTile && !t.open ? 0 : undefined}
              onKeyDown={(e) => { if (onTile && !t.open && (e.key === 'Enter' || e.key === ' ')) onTile(i); }}
              aria-label={onTile ? `اكشف الإجابة ${i + 1}${t.text ? `: ${t.text}` : ''}` : undefined}>
              <span className="n">{t.n}</span>
              {hostPeek && t.text && !t.open && <span className="peek"><span>{t.text}</span><span>{t.pts}</span></span>}
            </div>
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

function Podium({ t, v, room }: { t: 'a' | 'b'; v: any; room: GP['room'] }) {
  const on = (v.stage === 'steal' ? (v.control === 'a' ? 'b' : 'a') : v.control) === t;
  return (
    <div className={`podium ${t}${on ? ' on' : ''}`}>
      <div className="pn">{t === 'a' ? 'الأزرق' : 'الأحمر'}</div>
      <div className="ps">{v.teamScores[t]}</div>
      <div className="stack" style={{ gap: 4, width: '100%' }}>
        {room.players.filter((p) => p.team === t).map((p) => (
          <div key={p.id} className={`player team-${t}`} style={p.id === v.answerer || p.id === v.face?.buzz ? { outline: '2px solid var(--saffron)' } : undefined}>
            <span className="av">{p.name[0]}</span><span className="nm">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Feud({ room, view: v, you, act, mode, isHost }: GP) {
  const [text, setText] = useState('');
  const [peek, setPeek] = useState(false);
  const line = hostLine(v, room);

  if (mode === 'board') {
    return (
      <div className="stack" style={{ gap: 18 }}>
        <div className="tv-head">
          <span className="chip">الجولة {v.round} من {v.rounds}{v.mult > 1 ? ` · النقاط ×${v.mult}` : ''}</span>
          <span className="chip" dir="ltr">#{room.code}</span>
        </div>
        <div className="tv-q">{v.question}</div>
        <div className="tv-stage">
          <Podium t="a" v={v} room={room} />
          <div className="tv-center stack" style={{ gap: 14 }}>
            <div className="host-bubble"><Fanjal size={96} talking={!!v.busy} mood={v.last && !v.last.pending && !v.last.hit ? 'shock' : 'happy'} /><div className="bubble grow">{line}</div></div>
            <Board v={v} />
            <div className="row" style={{ justifyContent: 'center', gap: 24 }}>
              <Strikes n={v.strikes} />
              <div className="stack center" style={{ gap: 0 }}><span className="label">نقاط الجولة</span><b className="display num" style={{ fontSize: '2rem', color: 'var(--saffron)' }}>{v.pot}</b></div>
            </div>
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
  const me = room.players.find((p) => p.id === you);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card stack center">
        <div className="label">الجولة {v.round} من {v.rounds}{v.mult > 1 ? ` · ×${v.mult}` : ''}</div>
        <h2>{v.question}</h2>
        <div className="row" style={{ justifyContent: 'center' }}>
          <span className="chip pill-a">الأزرق {v.teamScores.a}</span>
          <span className="chip">الجولة: <b className="num">{v.pot}</b></span>
          <span className="chip pill-b">الأحمر {v.teamScores.b}</span>
        </div>
      </div>

      <div className="host-bubble"><Fanjal size={64} talking={!!v.busy} /><div className="bubble grow">{line}</div></div>

      {v.canBuzz && <button className="buzzer" type="button" onClick={() => act({ type: 'buzz' })}>اضغط!</button>}

      {v.canAnswer && (
        <form className="card stack" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label className="label" htmlFor="feud-answer">{v.stage === 'steal' ? 'إجابة السرقة (وحدة بس، تشاوروا!)' : 'جاوب الحين'}</label>
          <div className="row">
            <input id="feud-answer" className="input grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب إجابتك…" maxLength={60} autoFocus autoComplete="off" />
            <button className="btn gold" disabled={!text.trim()}>أرسل</button>
          </div>
        </form>
      )}

      {!v.canBuzz && !v.canAnswer && !isHost && me && v.stage !== 'roundEnd' && (
        <p className="center muted">{v.stage === 'faceoff' ? 'تابع المواجهة على الشاشة.' : me.team === v.control || (v.stage === 'steal' && me.team !== v.control) ? 'فريقك يلعب. ساعدهم بصوت عالي!' : 'فريق الخصم يلعب الحين.'}</p>
      )}

      {isHost ? (
        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>لوحة الحكم</b>
            <button className="btn ghost sm" type="button" aria-pressed={peek} onClick={() => setPeek((x) => !x)}>
              {peek ? '🙈 اخفِ الإجابات' : '👁 اعرض الإجابات'}
            </button>
          </div>
          <p className="muted small">
            {peek ? 'لا توريها أحد! اضغط أي إجابة تكشفها بنفسك لو الجهاز ما فهم اللاعب.' : 'الإجابات مخفية عشان لو أنت لاعب بعد. اضغط رقم الإجابة تكشفها، أو اعرضها لو أنت حكم بس.'}
          </p>
          <Board v={v} hostPeek={peek} onTile={(i) => act({ type: 'reveal', idx: i })} />
          <Strikes n={v.strikes} />
          <div className="row" style={{ justifyContent: 'center' }}>
            {v.stage !== 'roundEnd' && <button className="btn red" type="button" onClick={() => act({ type: 'strike' })} disabled={v.busy || (v.stage === 'faceoff' && !v.face.turn)}>✕ اكس</button>}
            {v.stage === 'roundEnd' && <button className="btn ghost" type="button" onClick={() => act({ type: 'revealAll' })}>اكشف الباقي</button>}
            {v.stage === 'roundEnd' && <button className="btn go" type="button" onClick={() => act({ type: 'next' })}>{v.round >= v.rounds ? 'النتيجة النهائية' : 'الجولة الجاية'}</button>}
          </div>
        </div>
      ) : (
        <Board v={v} />
      )}
    </div>
  );
}
