'use client';
import { useState } from 'react';
import Fanjal from '../Fanjal';
import { Leaderboard, StageStrip, nameOf } from '../ui';
import type { GP } from './types';

export default function OddQuestion({ room, view: v, you, act, mode }: GP) {
  const board = mode === 'board';
  const [text, setText] = useState('');
  const big = board ? 120 : 64;

  return (
    <div className="stack" style={{ gap: 14 }}>
      <StageStrip v={v} board={board} left={<span className="chip gold">الجولة {v.round} من {v.rounds}</span>}
        label={v.stage === 'answer' ? `${v.answered.length}/${room.players.length} جاوبوا` : v.stage === 'vote' ? `${v.voted.length} صوتوا` : undefined} />

      {v.stage === 'answer' && (
        <>
          <div className="host-bubble"><Fanjal size={big} talking /><div className="bubble grow">كل واحد وصله سؤال على جواله… إلا واحد وصله سؤال مختلف. جاوبوا!</div></div>
          {!board && (v.myAnswer ? <p className="center muted">إجابتك: «{v.myAnswer}». ننتظر الباقين…</p> : (
            <form className="card stack" onSubmit={(e) => { e.preventDefault(); act({ type: 'answer', text }); }}>
              <div className="label">سؤالك (لا توريه أحد)</div>
              <h3 style={{ fontSize: '1.6rem' }}>{v.myQuestion}</h3>
              <div className="row">
                <input id="odd-answer" className="input grow" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="إجابتك…" autoComplete="off" />
                <button className="btn gold" disabled={!text.trim()}>أرسل</button>
              </div>
            </form>
          ))}
        </>
      )}

      {v.stage !== 'answer' && v.mainQuestion && (
        <>
          <div className="card center"><div className="label">السؤال الأصلي</div><div className="q-banner" style={{ fontSize: board ? '3rem' : '1.7rem' }}>{v.mainQuestion}</div></div>
          {v.stage === 'vote' && <div className="host-bubble"><Fanjal size={big} mood="think" /><div className="bubble grow">أي إجابة ما تركب على السؤال؟</div></div>}
          <div className="pick" style={board ? { gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' } : undefined}>
            {v.list.map((x: any) => (
              <button key={x.id} type="button" disabled={board || x.mine || v.stage !== 'vote'}
                className={v.myVote === x.id || (v.result && x.id === v.result.oddAnswerId) ? 'sel' : ''}
                style={board ? { fontSize: '1.5rem' } : undefined}
                onClick={() => act({ type: 'vote', id: x.id })}>
                <div>«{x.text}»</div>
                {x.by && <div className="small muted">{nameOf(room, x.by)}{v.result?.counts?.[x.id] ? ` · ${v.result.counts[x.id]} صوت` : ''}</div>}
                {x.mine && !x.by && <div className="small muted">إجابتك</div>}
              </button>
            ))}
          </div>
        </>
      )}

      {v.stage === 'reveal' && v.result && !v.result.skipped && (
        <>
          <div className="host-bubble"><Fanjal size={big} mood="wink" talking />
            <div className="bubble grow">الشاذ <b>{nameOf(room, v.result.odd)}</b>، وسؤاله كان: «{v.result.oddQuestion}». {v.result.caught ? 'وانكشف!' : 'ونجا! +2'}</div>
          </div>
          <Leaderboard rows={v.leaderboard} you={board ? null : you} />
        </>
      )}
      {v.stage === 'reveal' && v.result?.skipped && <div className="host-bubble"><Fanjal size={big} mood="sad" /><div className="bubble grow">ما وصلت إجابات كافية. نروح للجولة الجاية.</div></div>}
    </div>
  );
}
