'use client';
import Fanjal from './Fanjal';
import { Leaderboard } from './ui';

export default function EndScreen({ room, you, isHost, act, view, board = false }: any) {
  const rows = [...room.players].sort((a: any, b: any) => b.score - a.score);
  const teamScores = view?.teamScores;
  const top = teamScores
    ? (teamScores.a === teamScores.b ? 'تعادل!' : teamScores.a > teamScores.b ? 'فاز الفريق الأزرق!' : 'فاز الفريق الأحمر!')
    : rows[0] ? `${rows[0].name} بطل الجلسة!` : '';
  return (
    <div className="stack center" style={{ alignItems: 'center', gap: 16, paddingBlock: 20 }}>
      <Fanjal size={board ? 180 : 120} mood="wink" talking />
      <h1 style={{ fontSize: board ? '4rem' : '2.2rem', color: 'var(--saffron)' }}>{top}</h1>
      {teamScores && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <div className="podium a on"><div className="pn">الأزرق</div><div className="ps">{teamScores.a}</div></div>
          <div className="podium b on"><div className="pn">الأحمر</div><div className="ps">{teamScores.b}</div></div>
        </div>
      )}
      {!teamScores && <div style={{ width: 'min(100%, 420px)' }}><Leaderboard rows={rows} you={board ? null : you} /></div>}
      {isHost && !board && <button className="btn go lg" type="button" onClick={() => act({ type: 'toLobby' })}>جولة ثانية بنفس الغرفة</button>}
      {!isHost && !board && <a className="btn ghost" href="/">ألعاب ثانية</a>}
    </div>
  );
}

