'use client';
import { useState } from 'react';
import Fanjal from '../Fanjal';
import { Leaderboard, nameOf } from '../ui';
import type { GP } from './types';

export default function OddQuestion({ room, view: v, you, act, mode, isHost }: GP) {
  const board = mode === 'board';
  const [text, setText] = useState('');

  return (
    <div className="stack" style={{ gap: 14 }}>
      <span className="chip" style={{ alignSelf: 'flex-start' }}>الجولة {v.round}</span>

      {v.stage === 'answer' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 120 : 64} talking /><div className="bubble grow">كل واحد وصله سؤال على جواله… إلا واحد وصله سؤال مختلف. جاوبوا! ({v.answered.length}/{room.players.length})</div></div>
          {!board && (v.myAnswer ? <p className="center muted">إجابتك: «{v.myAnswer}». ننتظر الباقين…</p> : (
            <form className="card stack" onSubmit={(e) => { e.preventDefault(); act({ type: 'answer', text }); }}>
              <div className="label">سؤالك (لا توريه أحد)</div>
              <h3>{v.myQuestion}</h3>
              <div className="row">
                <input id="odd-answer" className="input grow" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="إجابتك…" autoComplete="off" />
                <button className="btn gold" disabled={!text.trim()}>أرسل</button>
              </div>
            </form>
          ))}
          {isHost && !board && <button className="btn ghost" type="button" onClick={() => act({ type: 'closeAnswers' })}>اعرض الإجابات اللي وصلت</button>}
        </>
      )}

      {v.stage !== 'answer' && (
        <>
          <div className="card center"><div className="label">السؤال الأصلي</div><h2 style={{ fontSize: board ? '2.6rem' : undefined }}>{v.mainQuestion}</h2></div>
          {v.stage === 'vote' && <div className="host-bubble"><Fanjal size={board ? 100 : 56} mood="think" /><div className="bubble grow">أي إجابة ما تركب على السؤال؟ ({v.voted.length} صوتوا)</div></div>}
          <div className="pick" style={board ? { gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' } : undefined}>
            {v.list.map((x: any) => (
              <button key={x.id} type="button" disabled={board || x.mine || v.stage !== 'vote'}
                className={v.myVote === x.id || (v.result && x.id === v.result.oddAnswerId) ? 'sel' : ''}
                style={board ? { fontSize: '1.4rem' } : undefined}
                onClick={() => act({ type: 'vote', id: x.id })}>
                <div>«{x.text}»</div>
                {x.by && <div className="small muted">{nameOf(room, x.by)}{v.result?.counts?.[x.id] ? ` · ${v.result.counts[x.id]} صوت` : ''}</div>}
                {x.mine && !x.by && <div className="small muted">إجابتك</div>}
              </button>
            ))}
          </div>
          {v.stage === 'vote' && isHost && !board && <button className="btn ghost" type="button" onClick={() => act({ type: 'closeVote' })}>اقفل التصويت</button>}
        </>
      )}

      {v.stage === 'reveal' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 110 : 60} mood="wink" talking />
            <div className="bubble grow">الشاذ <b style={{ color: 'var(--sadu)' }}>{nameOf(room, v.result.odd)}</b>، وسؤاله كان: «{v.result.oddQuestion}». {v.result.caught ? 'وانكشف!' : 'ونجا! +2'}</div>
          </div>
          <Leaderboard rows={v.leaderboard} you={board ? null : you} />
          {isHost && !board && (
            <div className="row"><button className="btn go grow" type="button" onClick={() => act({ type: 'next' })}>الجولة الجاية</button><button className="btn ghost" type="button" onClick={() => act({ type: 'end' })}>إنهاء</button></div>
          )}
        </>
      )}
    </div>
  );
}
