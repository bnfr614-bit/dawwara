'use client';
import { useState } from 'react';
import Fanjal from '../Fanjal';
import { Leaderboard, nameOf } from '../ui';
import type { GP } from './types';

export default function Intruder({ room, view: v, you, act, mode, isHost }: GP) {
  const board = mode === 'board';
  const [guess, setGuess] = useState('');
  const [peek, setPeek] = useState(false);

  if (v.stage === 'pick') {
    return (
      <div className="stack" style={{ gap: 14 }}>
        <div className="host-bubble"><Fanjal size={board ? 120 : 70} /><div className="bubble grow">المضيف يختار التصنيف، وبعدها كل واحد يشوف بطاقته السرية.</div></div>
        {isHost && !board && (
          <div className="pick">
            {v.categories.map((c: string) => <button key={c} type="button" onClick={() => act({ type: 'category', category: c })}>{c}</button>)}
            <button type="button" onClick={() => act({ type: 'category', category: 'random' })}>🎲 عشوائي</button>
          </div>
        )}
      </div>
    );
  }

  const card = !board && (
    <button type="button" className="secret" style={{ width: '100%' }} onClick={() => setPeek((x) => !x)} aria-pressed={peek}>
      <div className="label">بطاقتك السرية · {v.category}</div>
      {peek ? (v.amIntruder ? <div className="big" style={{ color: 'var(--sadu)' }}>أنت الدخيل!</div> : <div className="big">{v.card}</div>) : <div className="big">••••</div>}
      <div className="muted small">{peek ? (v.amIntruder ? 'ما تعرف الكلمة. اسمع زين وحاول تندس.' : 'اضغط عشان تخفيها') : 'اضغط عشان تشوفها، وخل جوالك بعيد عن عيونهم'}</div>
    </button>
  );

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><span className="chip">الجولة {v.round}</span><span className="chip">التصنيف: {v.category}</span></div>
      {card}

      {v.stage === 'clues' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 110 : 60} talking /><div className="bubble grow">كل واحد يسأل اللي بعده سؤال عن الكلمة. جاوبوا بشي يثبت إنكم تعرفونها بدون ما تكشفونها!</div></div>
          <div className="card stack"><div className="label">ترتيب الأسئلة</div>
            <div className="row">{v.order.map((id: string, i: number) => <span key={id} className="chip">{i + 1}. {nameOf(room, id)} ← {nameOf(room, v.order[(i + 1) % v.order.length])}</span>)}</div>
          </div>
          {isHost && !board && <button className="btn gold" type="button" onClick={() => act({ type: 'openVote' })}>افتح التصويت</button>}
        </>
      )}

      {v.stage === 'vote' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 110 : 60} mood="think" /><div className="bubble grow">مين الدخيل؟ ({v.voted.length}/{room.players.length} صوتوا)</div></div>
          {!board && <div className="pick">{room.players.filter((p) => p.id !== you).map((p) => (
            <button key={p.id} type="button" className={v.myVote === p.id ? 'sel' : ''} onClick={() => act({ type: 'vote', target: p.id })}>{p.name}</button>
          ))}</div>}
          {isHost && !board && <button className="btn ghost" type="button" onClick={() => act({ type: 'closeVote' })}>اقفل التصويت</button>}
        </>
      )}

      {v.stage === 'guess' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 110 : 60} mood="shock" talking /><div className="bubble grow">انكشف الدخيل: <b style={{ color: 'var(--sadu)' }}>{nameOf(room, v.reveal.intruder)}</b>! بس عنده فرصة يخمن الكلمة…</div></div>
          {!board && you === v.reveal.intruder && (
            <form className="row" onSubmit={(e) => { e.preventDefault(); act({ type: 'guess', text: guess }); }}>
              <input id="intruder-guess" className="input grow" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="وش الكلمة؟" maxLength={40} autoFocus />
              <button className="btn gold" disabled={!guess.trim()}>خمّن</button>
            </form>
          )}
        </>
      )}

      {v.stage === 'reveal' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 120 : 64} mood="wink" talking />
            <div className="bubble grow">
              الدخيل كان <b style={{ color: 'var(--sadu)' }}>{nameOf(room, v.reveal.intruder)}</b> والكلمة <b style={{ color: 'var(--saffron)' }}>{v.reveal.word}</b>.{' '}
              {v.reveal.caught ? (v.reveal.guessRight ? `وخمّنها صح («${v.reveal.guess}»)! +1` : `وخمّن «${v.reveal.guess || '—'}»، غلط!`) : 'ونجا من التصويت! +2'}
            </div>
          </div>
          <Leaderboard rows={v.leaderboard} you={board ? null : you} />
          {isHost && !board && (
            <div className="stack">
              <div className="label">جولة جديدة بتصنيف:</div>
              <div className="pick">
                {v.categories.map((c: string) => <button key={c} type="button" onClick={() => act({ type: 'category', category: c })}>{c}</button>)}
                <button type="button" onClick={() => act({ type: 'category', category: 'random' })}>🎲 عشوائي</button>
              </div>
              <button className="btn ghost" type="button" onClick={() => act({ type: 'end' })}>إنهاء اللعبة</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
