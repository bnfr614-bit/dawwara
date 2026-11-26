'use client';
import { useEffect, useRef, useState } from 'react';
import Fanjal from '../Fanjal';
import { Buzzer } from '../ui';
import { Leaderboard, StageStrip, nameOf } from '../ui';
import type { GP } from './types';
import Icon from '../Icon';

const firstLetter = (s: string) => s.trim().replace(/^ال(?=..)/, '').replace(/[إأآٱ]/g, 'ا')[0];
// mirrors the server rule: "ال" is ignored, all alef forms count as one
const startsWith = (word: string, letter: string) => firstLetter(word) === letter.replace(/[إأآٱ]/g, 'ا');

export default function Letters({ room, view: v, you, act, mode }: GP) {
  const board = mode === 'board';
  const [sheet, setSheet] = useState<Record<string, string>>({});
  const saveT = useRef<any>(null);

  // fresh sheet each round
  useEffect(() => { setSheet(v.mySheet || {}); }, [v.round]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (cat: string, val: string) => {
    const next = { ...sheet, [cat]: val };
    setSheet(next);
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => act({ type: 'save', sheet: next }), 350);
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      <StageStrip v={v} board={board} left={<span className="chip gold">الجولة {v.round} من {v.rounds}</span>} label={v.stage === 'fill' ? `${v.filled.length} بدأوا` : undefined} />

      {v.stage === 'intro' ? (
        <div className="host-bubble" style={{ justifyContent: 'center' }}><Fanjal size={board ? 130 : 80} talking wave /><div className="bubble">جهزوا أنفسكم… الحرف بيطلع الحين!</div></div>
      ) : (
        <div className="letter-medal" aria-label={`الحرف ${v.letter}`}>{v.letter}</div>
      )}

      {v.stage === 'fill' && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 110 : 56} talking /><div className="bubble grow">كل الخانات تبدأ بحرف «{v.letter}». أول واحد يخلص يقول ستوب! ({v.filled.length} بدأوا)</div></div>
          {!board && (
            <form className="card sheet" onSubmit={async (e) => { e.preventDefault(); clearTimeout(saveT.current); await act({ type: 'save', sheet }); act({ type: 'stop' }); }}>
              {v.categories.map((c: string) => {
                const val = (sheet[c] || '').trim();
                const ok = val ? startsWith(val, v.letter) : null;
                return (
                  <label key={c}>
                    <span className="label" style={{ fontSize: '.95rem' }}>{c}</span>
                    <input id={`cell-${c}`} className="input" value={sheet[c] || ''} onChange={(e) => update(c, e.target.value)} placeholder={`${c} بحرف ${v.letter}`} maxLength={40} autoComplete="off"
                      style={{ paddingInlineEnd: 40, borderColor: ok === false ? 'var(--bad)' : undefined }} aria-invalid={ok === false} />
                    {ok !== null && <span className={`mark ${ok ? 'ok' : 'bad'}`} aria-label={ok ? 'تبدأ بالحرف' : `ما تبدأ بحرف ${v.letter}`}><Icon name={ok ? 'check' : 'x'} size={18} /></span>}
                  </label>
                );
              })}
              <div style={{ paddingTop: 8 }}><Buzzer label="ستوب!" onPress={async () => { clearTimeout(saveT.current); await act({ type: 'save', sheet }); act({ type: 'stop' }); }} /></div>
            </form>
          )}
        </>
      )}

      {(v.stage === 'review' || v.stage === 'scored') && (
        <>
          <div className="host-bubble"><Fanjal size={board ? 110 : 56} mood={v.stage === 'review' ? 'think' : 'wink'} talking />
            <div className="bubble grow">
              {v.stopper ? `${nameOf(room, v.stopper)} قال ستوب! ` : 'خلص الوقت! '}
              {v.stage === 'review' ? 'راجعوا الإجابات. أي إجابة غلط اضغطوا عليها ترفضونها.' : 'هذي النقاط.'}
            </div>
          </div>
          {v.rows.length === 0 && <p className="center muted">محد كتب شي هالجولة.</p>}
          {!board && v.rows.length > 0 && (
            <div className="review-cards">
              {v.rows.map((r: any) => (
                <div key={r.pid} className="rc">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <b>{nameOf(room, r.pid)}{r.pid === you ? ' (أنت)' : ''}{r.pid === v.stopper ? ' · قال ستوب' : ''}</b>
                    {r.total !== null && <b className="num" style={{ color: 'var(--gold)' }}>{r.total}</b>}
                  </div>
                  {r.cells.map((c: any) => {
                    const canReject = v.stage === 'review' && r.pid !== you && c.text;
                    return (
                      <div key={c.cat} className="rc-row">
                        <span className="label">{c.cat}</span>
                        <button type="button" disabled={!canReject} className={c.iRejected ? 'rejected' : ''} onClick={() => act({ type: 'reject', pid: r.pid, cat: c.cat })}
                          aria-label={canReject ? `${c.iRejected ? 'إلغاء رفض' : 'رفض'} ${c.text}` : undefined}>
                          <span className={!c.ok ? 'cell-bad' : c.why === 'مكررة' ? 'cell-dup' : ''}>{c.text || '—'}</span>
                          {(c.why || c.rejects > 0) && <span className="small muted"> · {c.why}{c.rejects ? ` ✕${c.rejects}` : ''}</span>}
                        </button>
                        <b className="num small">{c.pts ?? ''}</b>
                      </div>
                    );
                  })}
                </div>
              ))}
              {v.stage === 'review' && <p className="small muted center">اضغط على أي إجابة غلط عند غيرك عشان ترفضها. ترتفض إذا رفضها أكثر من نص اللاعبين.</p>}
            </div>
          )}
          {board && <div className="review card" style={{ padding: 8 }}>
            <table>
              <thead><tr><th>اللاعب</th>{v.categories.map((c: string) => <th key={c}>{c}</th>)}<th>المجموع</th></tr></thead>
              <tbody>
                {v.rows.map((r: any) => (
                  <tr key={r.pid}>
                    <td><b>{nameOf(room, r.pid)}</b>{r.pid === v.stopper ? ' ✋' : ''}</td>
                    {r.cells.map((c: any) => {
                      const canReject = !board && v.stage === 'review' && r.pid !== you && c.text;
                      return (
                        <td key={c.cat}>
                          <button type="button" disabled={!canReject} onClick={() => act({ type: 'reject', pid: r.pid, cat: c.cat })}
                            style={{ background: 'none', border: 'none', padding: 0, textAlign: 'start', cursor: canReject ? 'pointer' : 'default', outline: c.iRejected ? '2px solid var(--bad)' : undefined, borderRadius: 4 }}
                            aria-label={canReject ? `${c.iRejected ? 'إلغاء رفض' : 'رفض'} ${c.text}` : undefined}>
                            <span className={!c.ok ? 'cell-bad' : c.why === 'مكررة' ? 'cell-dup' : ''}>{c.text || '—'}</span>
                          </button>
                          <div className="small muted">
                            {c.pts !== null ? <b className="num">{c.pts}</b> : null}
                            {c.why ? ` ${c.why}` : ''}
                            {c.rejects ? ` · ✕${c.rejects}` : ''}
                          </div>
                        </td>
                      );
                    })}
                    <td><b className="num">{r.total ?? ''}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
          {v.stage === 'scored' && <Leaderboard rows={v.leaderboard} you={board ? null : you} />}
          {!board && v.stage === 'review' && (
            <button className="btn gold block" type="button" disabled={v.doneReview?.includes(you)} onClick={() => act({ type: 'doneReview' })}>
              {v.doneReview?.includes(you) ? `خلصت المراجعة (${v.doneReview.length}/${room.players.length})` : 'خلصت المراجعة'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
