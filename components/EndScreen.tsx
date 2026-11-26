'use client';
import Fanjal from './Fanjal';
import { Leaderboard, TimerRing } from './ui';

export default function EndScreen({ room, you, act, view, board = false }: any) {
  const rows = [...room.players].sort((a: any, b: any) => b.score - a.score);
  const teamScores = view?.teamScores;
  const mafiaWin = view?.winner;
  const top = mafiaWin
    ? (mafiaWin === 'town' ? 'المواطنين فازوا!' : 'المافيا فازت!')
    : teamScores
      ? (teamScores.a === teamScores.b ? 'تعادل!' : teamScores.a > teamScores.b ? 'فاز الفريق الأزرق!' : 'فاز الفريق الأحمر!')
      : rows[0] ? `${rows[0].name} بطل الجلسة!` : '';
  return (
    <div className="stack center" style={{ alignItems: 'center', gap: 18, paddingBlock: 20 }}>
      <Fanjal size={board ? 190 : 130} mood="wink" talking wave />
      <h1 style={{ fontSize: board ? '5rem' : '2.8rem', background: 'linear-gradient(180deg,#fff3b8,var(--gold) 55%,var(--gold-2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{top}</h1>
      {teamScores && !mafiaWin && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <div className="podium a on"><div className="pn">الأزرق</div><div className="ps">{teamScores.a}</div></div>
          <div className="podium b on"><div className="pn">الأحمر</div><div className="ps">{teamScores.b}</div></div>
        </div>
      )}
      {(!teamScores || mafiaWin) && <div style={{ width: 'min(100%, 460px)' }}><Leaderboard rows={rows} you={board ? null : you} /></div>}
      <div className="row" style={{ justifyContent: 'center' }}>
        <TimerRing deadline={room.endAt} total={30} size={board ? 80 : 54} />
        <span className="muted">نرجع لغرفة الانتظار تلقائياً</span>
      </div>
      {!board && <button className="btn go lg" type="button" onClick={() => act({ type: 'again' })}>العب مرة ثانية</button>}
    </div>
  );
}
