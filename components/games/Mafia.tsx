'use client';
import { useState } from 'react';
import Fanjal from '../Fanjal';
import { Avatar, StageStrip, nameOf } from '../ui';
import type { GP } from './types';

const ROLES = {
  mafia: { t: 'مافيا', icon: '🎩', cls: 'mafia', d: 'كل ليلة تتفق مع فريقك على ضحية. في النهار اندس ودافع عن نفسك.' },
  citizen: { t: 'مواطن', icon: '🏠', cls: 'citizen', d: 'ما عندك قدرة بالليل. سلاحك النقاش والتصويت.' },
  doctor: { t: 'الطبيب', icon: '🩺', cls: 'doctor', d: 'كل ليلة تحمي شخص من الموت. ما تقدر تحمي نفس الشخص ليلتين ورا بعض.' },
  detective: { t: 'المحقق', icon: '🕵️', cls: 'detective', d: 'كل ليلة تفحص شخص وأعطيك الجواب: مافيا أو لا. لا تكشف نفسك بدري!' },
} as const;

function RoleCard({ v, room, show }: { v: any; room: GP['room']; show: boolean }) {
  const r = ROLES[v.role as keyof typeof ROLES];
  if (!r) return null;
  return (
    <div className={`role-card ${r.cls}`}>
      <div className="label">دورك السري</div>
      {show ? (
        <>
          <div className="big">{r.icon} {r.t}</div>
          <p className="muted">{r.d}</p>
          {v.team && v.team.length > 1 && <p>فريقك: <b>{v.team.map((id: string) => nameOf(room, id)).join('، ')}</b></p>}
        </>
      ) : <div className="big">••••</div>}
    </div>
  );
}

function Town({ v, room, you, onPick, picked, disable }: { v: any; room: GP['room']; you?: string | null; onPick?: (id: string) => void; picked?: string | null; disable?: (id: string) => boolean }) {
  return (
    <div className="pick">
      {room.players.map((p) => {
        const dead = !v.alive.includes(p.id);
        const votes = v.dayVotes ? Object.values(v.dayVotes).filter((t) => t === p.id).length : 0;
        return (
          <button key={p.id} type="button" disabled={!onPick || dead || disable?.(p.id)} className={picked === p.id ? 'sel' : ''} onClick={() => onPick?.(p.id)}
            style={dead ? { textDecoration: 'line-through', opacity: .4 } : undefined}>
            <span className="row" style={{ gap: 8 }}><Avatar name={p.name} size={28} /> {p.name}{p.id === you ? ' (أنت)' : ''}</span>
            {votes > 0 && <span className="chip small" style={{ marginTop: 4 }}>✋ {votes}</span>}
            {v.roles && <div className="small muted">{ROLES[v.roles[p.id] as keyof typeof ROLES]?.t}</div>}
          </button>
        );
      })}
    </div>
  );
}

export default function Mafia({ room, view: v, you, act, mode }: GP) {
  const board = mode === 'board';
  const [peek, setPeek] = useState(true);
  const big = board ? 120 : 64;
  const dead = !board && !v.amAlive;
  const nightLike = v.stage === 'night' || v.stage === 'roles';

  const news = (() => {
    if (!v.news) return '';
    if (v.news.first) return 'صباح الخير يا أهل المدينة! الليلة الأولى مرت بسلام… بس المافيا صارت تعرف بعضها.';
    if (v.news.killed) return `صحت المدينة على خبر حزين: ${nameOf(room, v.news.killed)} طلع من اللعبة الليلة. له كلمة أخيرة قصيرة.`;
    if (v.news.saved) return 'المافيا حاولت تقتل أحد… بس الطبيب أنقذه! الكل نجا.';
    return 'ليلة هادية، الكل نجا.';
  })();

  return (
    <div className="stack" style={{ gap: 14, ...(nightLike && board ? { filter: 'saturate(.8)' } : {}) }}>
      <StageStrip v={v} board={board}
        left={<><span className="chip gold">{v.stage === 'roles' ? 'توزيع الأدوار' : nightLike ? `الليلة ${v.night}` : 'النهار'}</span><span className="chip">باقين {v.counts.alive}</span></>} />

      {!board && v.role && v.stage !== 'over' && (
        <button type="button" onClick={() => setPeek((x) => !x)} style={{ all: 'unset', cursor: 'pointer', display: 'block' }} aria-pressed={peek}>
          <RoleCard v={v} room={room} show={peek} />
        </button>
      )}
      {dead && v.stage !== 'over' && <div className="error center">طلعت من اللعبة. تابع بصمت ولا تلمّح لأحد 🤐</div>}

      {v.stage === 'roles' && (
        <div className="night-sky stack" style={{ alignItems: 'center' }}>
          <div className="moon" />
          <div className="host-bubble"><Fanjal size={big} talking /><div className="bubble">وزعت الأدوار! شوفوا جوالاتكم بدون ما أحد يشوف. المافيا تتعرف على بعضها الليلة.</div></div>
        </div>
      )}

      {v.stage === 'night' && (
        <div className="night-sky stack" style={{ alignItems: 'stretch' }}>
          <div className="moon" />
          <div className="host-bubble" style={{ justifyContent: 'center' }}><Fanjal size={big} mood="think" /><div className="bubble">المدينة نايمة… كل واحد عنده دور يصحى على جواله الحين.</div></div>
          {!board && v.amAlive && v.role === 'mafia' && (
            <>
              <b className="center">اختاروا الضحية {v.mafiaVotes && Object.keys(v.mafiaVotes).length > 0 && `(أصوات فريقك: ${Object.entries(v.mafiaVotes).map(([k, t]) => `${nameOf(room, k)}←${nameOf(room, t as string)}`).join('، ')})`}</b>
              <Town v={v} room={room} you={you} picked={v.mafiaVotes?.[you!]} disable={(id) => v.team?.includes(id)} onPick={(id) => act({ type: 'kill', target: id })} />
            </>
          )}
          {!board && v.amAlive && v.role === 'doctor' && (
            <>
              <b className="center">مين تحمي الليلة؟{v.lastProtected && ` (ما تقدر تحمي ${nameOf(room, v.lastProtected)} مرة ثانية)`}</b>
              <Town v={v} room={room} you={you} picked={v.myProtect} disable={(id) => id === v.lastProtected} onPick={(id) => act({ type: 'protect', target: id })} />
            </>
          )}
          {!board && v.amAlive && v.role === 'detective' && (
            <>
              <b className="center">{v.checkedTonight ? 'فحصت الليلة. شوف النتيجة تحت.' : 'مين تبي تفحص؟'}</b>
              {!v.checkedTonight && <Town v={v} room={room} you={you} disable={(id) => id === you} onPick={(id) => act({ type: 'check', target: id })} />}
            </>
          )}
          {!board && v.amAlive && v.role === 'citizen' && <p className="center muted">غمّض… ما عندك شي تسويه بالليل. انتظر الصباح.</p>}
        </div>
      )}

      {!board && v.role === 'detective' && v.checks?.length > 0 && (
        <div className="card stack">
          <b>نتائج فحصك</b>
          {v.checks.map((c: any, i: number) => (
            <div key={i} className="row" style={{ justifyContent: 'space-between' }}>
              <span>الليلة {c.night}: {nameOf(room, c.target)}</span>
              <span className="chip" style={{ background: c.mafia ? 'var(--bad)' : 'var(--ok)', color: c.mafia ? '#fff' : '#032012' }}>{c.mafia ? 'مافيا!' : 'مو مافيا'}</span>
            </div>
          ))}
        </div>
      )}

      {v.stage === 'morning' && (
        <div className="host-bubble"><Fanjal size={big} mood={v.news?.killed ? 'sad' : 'happy'} talking /><div className="bubble grow">{news}</div></div>
      )}

      {v.stage === 'discuss' && (
        <>
          <div className="host-bubble"><Fanjal size={big} talking /><div className="bubble grow">وقت النقاش! مين تشكّون فيه؟ دافعوا عن أنفسكم واتهموا بالدليل. الموتى ساكتين.</div></div>
          <Town v={v} room={room} you={you} />
          {!board && v.amAlive && (
            <button className="btn gold block" type="button" disabled={v.readyVote?.includes(you)} onClick={() => act({ type: 'readyVote' })}>
              {v.readyVote?.includes(you) ? `جاهز للتصويت (${v.readyVote.length})` : 'جاهز للتصويت'}
            </button>
          )}
        </>
      )}

      {v.stage === 'vote' && (
        <>
          <div className="host-bubble"><Fanjal size={big} mood="think" /><div className="bubble grow">صوّتوا! مين يطلع من المدينة؟ لازم أغلبية واضحة.</div></div>
          <Town v={v} room={room} you={you} picked={v.myVote} disable={(id) => id === you || dead}
            onPick={!board && v.amAlive ? (id) => act({ type: 'vote', target: id }) : undefined} />
          {!board && v.amAlive && <button className={`btn ghost block${v.myVote === 'skip' ? ' gold' : ''}`} type="button" onClick={() => act({ type: 'vote', target: 'skip' })}>ما أبي أطرد أحد</button>}
        </>
      )}

      {v.stage === 'verdict' && v.verdict && (
        <div className="host-bubble"><Fanjal size={big} mood={v.verdict.out ? 'shock' : 'think'} talking />
          <div className="bubble grow">
            {v.verdict.out ? <>المدينة طردت <b>{nameOf(room, v.verdict.out)}</b>… وكان <b style={{ color: v.verdict.role === 'mafia' ? 'var(--bad)' : 'var(--ok)' }}>{ROLES[v.verdict.role as keyof typeof ROLES]?.t}</b>!</> : 'ما فيه أغلبية. محد طلع اليوم.'}
          </div>
        </div>
      )}

      {(v.stage === 'over' || v.winner) && (
        <>
          <div className="host-bubble"><Fanjal size={big} mood="wink" talking wave />
            <div className="bubble grow">{v.winner === 'town' ? 'المواطنين نظّفوا المدينة من المافيا! 🎉' : 'المافيا سيطرت على المدينة! 🎩'}</div>
          </div>
          <Town v={v} room={room} you={you} />
        </>
      )}
    </div>
  );
}
