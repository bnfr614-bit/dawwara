'use client';
import { useState } from 'react';
import Fanjal from '../Fanjal';
import { Leaderboard, nameOf } from '../ui';
import type { GP } from './types';

const ROLE = { killer: { t: 'أنت القاتل 🔪', c: 'var(--sadu)', d: 'اختر سلاحك ودليلك، وبعدها اندس بين المحققين.' },
  witness: { t: 'أنت الشاهد 👁', c: 'var(--saffron)', d: 'تعرف القاتل. ساعد المحققين بالتلميح، لكن انتبه: لو كشفك القاتل في الأخير يفوز.' },
  detective: { t: 'أنت محقق 🕵️', c: 'var(--team-a)', d: 'ناقش، اسأل، وراقب أوراق الكل. اتفقوا على اتهام واحد.' } } as const;

function Hand({ h, name, pick, sel, onPick }: { h: { means: string[]; clues: string[] }; name?: string; pick?: boolean; sel?: { means?: string; clue?: string }; onPick?: (k: 'means' | 'clue', v: string) => void }) {
  return (
    <div className="card stack" style={{ padding: 12 }}>
      {name && <b>{name}</b>}
      <div className="label">الأسلحة</div>
      <div className="row">{h.means.map((m) => <button key={m} type="button" disabled={!pick} className={`chip${sel?.means === m ? ' pill-b' : ''}`} style={{ border: sel?.means === m ? '2px solid var(--sadu)' : '2px solid transparent' }} onClick={() => onPick?.('means', m)}>{m}</button>)}</div>
      <div className="label">الأدلة</div>
      <div className="row">{h.clues.map((c) => <button key={c} type="button" disabled={!pick} className={`chip${sel?.clue === c ? ' pill-a' : ''}`} style={{ border: sel?.clue === c ? '2px solid var(--team-a)' : '2px solid transparent' }} onClick={() => onPick?.('clue', c)}>{c}</button>)}</div>
    </div>
  );
}

export default function Crime({ room, view: v, you, act, mode, isHost }: GP) {
  const board = mode === 'board';
  const [sel, setSel] = useState<{ means?: string; clue?: string }>({});
  const [acc, setAcc] = useState<{ suspect?: string; means?: string; clue?: string }>({});
  const role = v.role as keyof typeof ROLE | null;
  const amLead = you === v.lead;

  const caseFile = v.file && (
    <div className="card stack">
      <h3>📁 ملف القضية</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
        {v.file.map((t: any) => (
          <div key={t.title} style={{ background: 'var(--raised)', borderRadius: 12, padding: 10 }}>
            <div className="label">{t.title}</div>
            <div className="row" style={{ gap: 4 }}>{t.options.map((o: string) => <span key={o} className="chip small" style={o === t.pick ? { background: 'var(--saffron)', color: 'var(--ink)', fontWeight: 700 } : { opacity: .55 }}>{o}</span>)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="stack" style={{ gap: 14 }}>
      {!board && role && v.stage !== 'over' && (
        <div className="secret" style={{ borderColor: ROLE[role].c }}>
          <div className="big" style={{ color: ROLE[role].c, fontSize: '1.7rem' }}>{ROLE[role].t}</div>
          <p className="muted">{ROLE[role].d}</p>
          {v.knows?.killer && <p>القاتل هو: <b style={{ color: 'var(--sadu)' }}>{nameOf(room, v.knows.killer)}</b></p>}
          {v.knows?.chosen && <p>اخترت: <b>{v.knows.chosen.means}</b> + <b>{v.knows.chosen.clue}</b></p>}
          {amLead && role !== 'killer' && <p style={{ color: 'var(--saffron)' }}>أنت المحقق الرئيسي: أنت اللي يسجل الاتهام النهائي.</p>}
        </div>
      )}

      {v.stage === 'killerPick' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 120 : 60} mood="think" /><div className="bubble grow">الكل يغمض… القاتل يختار سلاحه ودليله من أوراقه.</div></div>
          {!board && role === 'killer' && (
            <div className="stack">
              <Hand h={v.hands[you!]} pick sel={sel} onPick={(k, val) => setSel((s) => ({ ...s, [k]: val }))} />
              <button className="btn red" type="button" disabled={!sel.means || !sel.clue} onClick={() => act({ type: 'pick', ...sel })}>ثبّت الاختيار</button>
            </div>
          )}
        </>
      )}

      {(v.stage === 'investigate' || v.stage === 'hunt' || v.stage === 'over') && caseFile}

      {(v.stage === 'investigate' || board) && v.stage !== 'over' && v.hands && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {room.players.map((p) => <Hand key={p.id} h={v.hands[p.id]} name={p.name + (p.id === you ? ' (أنت)' : '')} />)}
        </div>
      )}

      {v.stage === 'investigate' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 100 : 56} talking /><div className="bubble grow">ناقشوا! المحقق الرئيسي {nameOf(room, v.lead)} يسجل الاتهام: الشخص + السلاح + الدليل من أوراقه.</div></div>
          {!board && (amLead || isHost) && role !== 'killer' && (
            <div className="card stack">
              <b>الاتهام النهائي</b>
              <div className="pick">{room.players.map((p) => <button key={p.id} type="button" className={acc.suspect === p.id ? 'sel' : ''} onClick={() => setAcc({ suspect: p.id })}>{p.name}</button>)}</div>
              {acc.suspect && <Hand h={v.hands[acc.suspect]} pick sel={acc} onPick={(k, val) => setAcc((s) => ({ ...s, [k]: val }))} />}
              <button className="btn gold" type="button" disabled={!acc.suspect || !acc.means || !acc.clue} onClick={() => act({ type: 'accuse', ...acc })}>سجّل الاتهام</button>
            </div>
          )}
        </>
      )}

      {v.stage === 'hunt' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 120 : 60} mood="shock" talking /><div className="bubble grow">الاتهام صحيح! بس القاتل عنده فرصة أخيرة: لو كشف الشاهد يفوز هو.</div></div>
          {!board && role === 'killer' && (
            <div className="pick">{room.players.filter((p) => p.id !== you).map((p) => <button key={p.id} type="button" onClick={() => act({ type: 'hunt', target: p.id })}>{p.name}</button>)}</div>
          )}
        </>
      )}

      {v.stage === 'over' && v.truth && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 130 : 64} mood="wink" talking />
            <div className="bubble grow">
              {v.detectivesWin ? 'المحققين فازوا! 🕵️' : 'القاتل فاز! 🔪'} القاتل {nameOf(room, v.truth.killer)} بـ«{v.truth.chosen?.means}» ودليل «{v.truth.chosen?.clue}»
              {v.truth.witness ? `، والشاهد ${nameOf(room, v.truth.witness)}` : ''}.
              {v.accusation && !v.correct ? ` الاتهام كان: ${nameOf(room, v.accusation.suspect)} + ${v.accusation.means} + ${v.accusation.clue}.` : ''}
              {v.hunted ? ` القاتل اتهم ${nameOf(room, v.hunted)} إنه الشاهد.` : ''}
            </div>
          </div>
          <Leaderboard rows={v.leaderboard} you={board ? null : you} />
          {isHost && !board && <div className="row"><button className="btn go grow" type="button" onClick={() => { setSel({}); setAcc({}); act({ type: 'deal' }); }}>قضية جديدة</button><button className="btn ghost" type="button" onClick={() => act({ type: 'end' })}>إنهاء</button></div>}
        </>
      )}
    </div>
  );
}
