'use client';
import { useState } from 'react';
import Miko from '../Miko';
import { Leaderboard, StageStrip, nameOf } from '../ui';
import type { GP } from './types';

export default function Intruder({ room, view: v, you, act, mode }: GP) {
  const board = mode === 'board';
  const [guess, setGuess] = useState('');
  const [peek, setPeek] = useState(false);
  const big = board ? 120 : 64;

  const card = !board && (
    <button type="button" className="secret" onClick={() => setPeek((x) => !x)} aria-pressed={peek}>
      <div className="label">بطاقتك السرية · {v.category}</div>
      {peek ? (v.amIntruder ? <div className="big" style={{ color: 'var(--bad)' }}>أنت الدخيل!</div> : <div className="big">{v.card}</div>) : <div className="big">••••</div>}
      <div className="muted small">{peek ? (v.amIntruder ? 'ما تعرف الكلمة. اسمع زين واندس.' : 'اضغط عشان تخفيها') : 'اضغط تشوفها، وخل جوالك بعيد عن عيونهم'}</div>
    </button>
  );

  return (
    <div className="stack" style={{ gap: 14 }}>
      <StageStrip v={v} board={board} left={<><span className="chip gold">الجولة {v.round} من {v.rounds}</span><span className="chip">التصنيف: {v.category}</span></>} />
      {(v.stage === 'card' || v.stage === 'clues' || v.stage === 'vote') && card}

      {v.stage === 'card' && <div className="host-bubble"><Miko size={big} talking wave /><div className="bubble grow">شوفوا بطاقاتكم! واحد منكم ما عنده الكلمة…</div></div>}

      {v.stage === 'clues' && (
        <>
          <div className="host-bubble"><Miko size={big} talking /><div className="bubble grow">كل واحد يسأل اللي بعده عن الكلمة. جاوبوا بشي يثبت إنكم تعرفونها بدون ما تكشفونها!</div></div>
          <div className="card stack"><div className="label">ترتيب الأسئلة</div>
            <div className="row">{v.order.map((id: string, i: number) => <span key={id} className="chip">{nameOf(room, id)} ← {nameOf(room, v.order[(i + 1) % v.order.length])}</span>)}</div>
          </div>
          {!board && <button className="btn ghost" type="button" disabled={v.readyVote.includes(you)} onClick={() => act({ type: 'endClues' })}>{v.readyVote.includes(you) ? `جاهز (${v.readyVote.length}/${room.players.length})` : 'جاهز للتصويت'}</button>}
        </>
      )}

      {v.stage === 'vote' && (
        <>
          <div className="host-bubble"><Miko size={big} mood="think" /><div className="bubble grow">مين الدخيل؟ ({v.voted.length}/{room.players.length} صوتوا)</div></div>
          {!board && <div className="pick">{room.players.filter((p) => p.id !== you).map((p) => <button key={p.id} type="button" className={v.myVote === p.id ? 'sel' : ''} onClick={() => act({ type: 'vote', target: p.id })}>{p.name}</button>)}</div>}
        </>
      )}

      {v.stage === 'guess' && (
        <>
          <div className="host-bubble"><Miko size={big} mood="shock" talking /><div className="bubble grow">انكشف الدخيل: <b>{nameOf(room, v.reveal.intruder)}</b>! بس عنده فرصة يخمن الكلمة…</div></div>
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
          <div className="host-bubble"><Miko size={big} mood="wink" talking />
            <div className="bubble grow">
              الدخيل كان <b>{nameOf(room, v.reveal.intruder)}</b> والكلمة <b>{v.reveal.word}</b>.{' '}
              {v.reveal.caught ? (v.reveal.guessRight ? `وخمّنها صح («${v.reveal.guess}»)! +1` : `وخمّن «${v.reveal.guess || '—'}»، غلط!`) : 'ونجا من التصويت! +2'}
            </div>
          </div>
          <Leaderboard rows={v.leaderboard} you={board ? null : you} />
        </>
      )}
    </div>
  );
}
