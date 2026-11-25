'use client';
import { useState } from 'react';
import Fanjal from '../Fanjal';
import { Leaderboard, nameOf } from '../ui';
import type { GP } from './types';

export default function WhoWrote({ room, view: v, you, act, mode, isHost }: GP) {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const board = mode === 'board';
  const others = room.players.filter((p) => p.id !== you);

  if (v.stage === 'write') {
    return (
      <div className="stack" style={{ gap: 14 }}>
        <div className="host-bubble"><Fanjal size={board ? 120 : 70} talking /><div className="bubble grow">كل واحد يكتب قصتين قصار من مواقفه، بدون أسماء! ({v.submitted.length}/{room.players.length} خلصوا)</div></div>
        <div className="players">{room.players.map((p) => <div key={p.id} className={`player${v.submitted.includes(p.id) ? '' : ' off'}`}><span className="av">{v.submitted.includes(p.id) ? '✓' : p.name[0]}</span><span className="nm">{p.name}</span></div>)}</div>
        {!board && !v.mySubmitted && (
          <form className="card stack" onSubmit={(e) => { e.preventDefault(); act({ type: 'submit', stories: [s1, s2] }); }}>
            <label className="label" htmlFor="story1">القصة الأولى · فكرة: {v.prompts?.[0]}</label>
            <textarea id="story1" className="input" value={s1} onChange={(e) => setS1(e.target.value)} maxLength={400} />
            <label className="label" htmlFor="story2">القصة الثانية · فكرة: {v.prompts?.[1]}</label>
            <textarea id="story2" className="input" value={s2} onChange={(e) => setS2(e.target.value)} maxLength={400} />
            <button className="btn go" disabled={s1.trim().length < 10 || s2.trim().length < 10}>أرسل القصتين</button>
          </form>
        )}
        {!board && v.mySubmitted && <p className="center muted">وصلت قصصك. ننتظر الباقين…</p>}
        {isHost && !board && <button className="btn ghost" type="button" onClick={() => act({ type: 'begin' })}>ابدأ التصويت بالقصص اللي وصلت</button>}
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="label center">القصة {v.round} · باقي {v.left}</div>
      <div className="card" style={{ fontSize: board ? '2rem' : '1.2rem', lineHeight: 1.7, borderInlineStart: '6px solid var(--saffron)' }}>«{v.story}»</div>

      {v.stage === 'vote' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 100 : 60} mood="think" /><div className="bubble grow">مين كاتبها؟ صوّتوا من جوالاتكم. ({v.voted.length} صوتوا)</div></div>
          {!board && (v.isAuthor ? (
            <p className="center" style={{ color: 'var(--saffron)' }}>هذي قصتك! لا تفضح نفسك 🤫</p>
          ) : (
            <div className="pick">{others.map((p) => (
              <button key={p.id} type="button" className={v.myVote === p.id ? 'sel' : ''} onClick={() => act({ type: 'vote', target: p.id })}>{p.name}</button>
            ))}</div>
          ))}
          {isHost && !board && <button className="btn ghost" type="button" onClick={() => act({ type: 'reveal' })}>اكشف الكاتب</button>}
        </>
      )}

      {v.stage === 'reveal' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 110 : 64} mood="wink" talking />
            <div className="bubble grow">الكاتب: <b style={{ color: 'var(--saffron)' }}>{nameOf(room, v.result.author)}</b>! {v.result.right.length ? `كشفوه: ${v.result.right.map((id: string) => nameOf(room, id)).join('، ')} (+2)` : 'محد كشفه! +5 للكاتب'}</div>
          </div>
          <Leaderboard rows={v.leaderboard} you={board ? null : you} />
          {isHost && !board && <button className="btn go" type="button" onClick={() => act({ type: 'next' })}>القصة الجاية</button>}
        </>
      )}
    </div>
  );
}
