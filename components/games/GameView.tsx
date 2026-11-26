'use client';
import Feud from './Feud';
import WhoWrote from './WhoWrote';
import Intruder from './Intruder';
import OddQuestion from './OddQuestion';
import Draw from './Draw';
import Crime from './Crime';
import Letters from './Letters';
import Mafia from './Mafia';
import type { GP } from './types';

const MAP: Record<string, (p: GP) => JSX.Element> = {
  feud: Feud, 'who-wrote': WhoWrote, intruder: Intruder, 'odd-question': OddQuestion, draw: Draw, crime: Crime, letters: Letters, mafia: Mafia,
};

export default function GameView({ game, ...p }: GP & { game: string }) {
  const C = MAP[game];
  if (!C) return null;
  return p.mode === 'board' ? <div className="wrap" style={{ maxWidth: '110rem', width: '100%' }}><C {...p} /></div> : <C {...p} />;
}
