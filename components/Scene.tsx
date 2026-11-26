'use client';
import { useId } from 'react';
import Fanjal from './Fanjal';

// Each game card is a little TV set: spotlights, a glossy stage floor, Fanjal and the game's prop.
const TINT: Record<string, [string, string]> = {
  studio: ['#1b3dd6', '#ffb000'],
  notes: ['#3b2bd0', '#ff7ab8'],
  cards: ['#0f6bd6', '#27b4ff'],
  question: ['#1a8a6e', '#2fe38f'],
  easel: ['#7a2bd0', '#ff8f00'],
  crime: ['#4a4f6e', '#ffc21a'],
  letters: ['#c2410c', '#ffc21a'],
  mafia: ['#5a0a1a', '#ff3049'],
};

function Prop({ scene, id }: { scene: string; id: string }) {
  const gold = `url(#gold-${id})`;
  const blue = `url(#blue-${id})`;
  switch (scene) {
    case 'studio':
      return (
        <g transform="translate(150 30)">
          <rect x="0" y="0" width="120" height="96" rx="10" fill="#050d40" stroke={gold} strokeWidth="5" />
          {[0, 1, 2, 3].map((r) => [0, 1].map((c) => (
            <rect key={`${r}${c}`} x={8 + c * 54} y={8 + r * 21} width="50" height="17" rx="3" fill={r < 2 && c === 0 ? gold : blue} stroke="rgba(255,255,255,.25)" />
          )))}
          <circle cx="60" cy="118" r="14" fill="#ff3049" stroke="#d9def0" strokeWidth="4" />
        </g>
      );
    case 'notes':
      return (
        <g transform="translate(160 26)">
          <rect x="0" y="10" width="78" height="96" rx="6" fill="#fff" transform="rotate(-9 39 58)" />
          <rect x="30" y="4" width="78" height="96" rx="6" fill="#fff8e0" transform="rotate(7 69 52)" />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="42" y={22 + i * 14} width={56 - (i % 2) * 14} height="5" rx="2.5" fill="#c2c8e6" transform="rotate(7 69 52)" />)}
          <circle cx="92" cy="94" r="16" fill="#ff7ab8" stroke="#fff" strokeWidth="3" />
          <text x="92" y="102" textAnchor="middle" fontSize="22" fill="#fff" fontFamily="Lalezar">؟</text>
        </g>
      );
    case 'cards':
      return (
        <g transform="translate(160 22)">
          {[-16, 0, 16].map((r, i) => (
            <g key={i} transform={`rotate(${r} 55 120)`}>
              <rect x="28" y="6" width="56" height="86" rx="8" fill={i === 1 ? '#ff3049' : '#fff'} stroke="#0a1660" strokeWidth="3" />
              {i !== 1 && <rect x="36" y="14" width="40" height="70" rx="4" fill="none" stroke="#27b4ff" strokeWidth="2" strokeDasharray="4 3" />}
            </g>
          ))}
          <circle cx="56" cy="50" r="15" fill="#0a1660" />
          <text x="56" y="58" textAnchor="middle" fontSize="22" fill="#ffc21a" fontFamily="Lalezar">؟</text>
        </g>
      );
    case 'question':
      return (
        <g transform="translate(150 28)">
          <path d="M8 0 h110 a12 12 0 0 1 12 12 v50 a12 12 0 0 1 -12 12 h-66 l-18 16 v-16 h-26 a12 12 0 0 1 -12 -12 v-50 a12 12 0 0 1 12 -12z" fill="#fff" />
          <text x="46" y="56" textAnchor="middle" fontSize="44" fill="#2fe38f" fontFamily="Lalezar">؟</text>
          <text x="86" y="56" textAnchor="middle" fontSize="44" fill="#ff3049" fontFamily="Lalezar">؟</text>
          <circle cx="112" cy="104" r="14" fill="#2fe38f" stroke="#fff" strokeWidth="3" />
        </g>
      );
    case 'easel':
      return (
        <g transform="translate(160 18)">
          <path d="M20 132 L46 18 M100 132 L74 18 M60 18 L60 136" stroke="#8a5a2b" strokeWidth="6" strokeLinecap="round" />
          <rect x="6" y="14" width="108" height="80" rx="6" fill="#fffdf6" stroke={gold} strokeWidth="5" />
          <path d="M22 72 Q40 26 58 58 Q74 84 96 34" stroke="#ff3049" strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx="92" cy="32" r="8" fill="#27b4ff" />
        </g>
      );
    case 'crime':
      return (
        <g transform="translate(150 30)">
          <rect x="0" y="14" width="130" height="92" rx="8" fill="#d6a95a" stroke="#7a5418" strokeWidth="3" />
          <rect x="0" y="6" width="50" height="18" rx="5" fill="#d6a95a" stroke="#7a5418" strokeWidth="3" />
          <rect x="-6" y="56" width="142" height="16" fill="#ffc21a" />
          {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${i * 24} 56 l10 16`} stroke="#111" strokeWidth="6" />)}
          <circle cx="104" cy="36" r="16" fill="rgba(180,220,255,.4)" stroke="#1a1a1a" strokeWidth="5" />
          <path d="M115 47 l14 14" stroke="#1a1a1a" strokeWidth="7" strokeLinecap="round" />
        </g>
      );
    case 'letters':
      return (
        <g transform="translate(150 22)">
          {['إنسان', 'حيوان', 'نبات', 'جماد'].map((t, i) => (
            <g key={t}>
              <rect x="0" y={i * 26} width="92" height="20" rx="5" fill="#fff" />
              <text x="86" y={i * 26 + 15} fontSize="12" fill="#5a6288" textAnchor="end" fontFamily="Readex Pro">{t}</text>
            </g>
          ))}
          <circle cx="118" cy="50" r="26" fill={gold} stroke="#fff3b8" strokeWidth="4" />
          <text x="118" y="62" fontSize="34" fill="#1a1000" textAnchor="middle" fontFamily="Lalezar">م</text>
        </g>
      );
    case 'mafia':
      return (
        <g transform="translate(150 16)">
          <circle cx="100" cy="22" r="18" fill="#fff6cc" />
          <circle cx="108" cy="16" r="16" fill="#3a0612" opacity=".0" />
          {/* fedora */}
          <ellipse cx="60" cy="92" rx="62" ry="14" fill="#14141c" />
          <path d="M22 92 Q24 46 60 44 Q96 46 98 92 Z" fill="#1f1f2a" />
          <rect x="24" y="74" width="72" height="12" fill="#ff3049" />
          <path d="M44 50 Q60 60 76 50" stroke="#000" strokeWidth="4" fill="none" opacity=".4" />
          {[0, 1, 2].map((i) => <rect key={i} x={10 + i * 40} y="112" width="22" height="16" rx="3" fill="#ffc21a" opacity=".85" />)}
        </g>
      );
  }
  return null;
}

export default function Scene({ scene }: { scene: string }) {
  const id = useId().replace(/:/g, '');
  const [c1, c2] = TINT[scene] || TINT.studio;
  return (
    <div className="scene">
      <svg viewBox="0 0 320 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id={`bg-${id}`} cx="50%" cy="0%" r="110%">
            <stop offset="0" stopColor={c1} />
            <stop offset="1" stopColor="#040a2c" />
          </radialGradient>
          <linearGradient id={`beam-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`gold-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3b8" /><stop offset=".55" stopColor="#ffc21a" /><stop offset="1" stopColor="#ff8f00" />
          </linearGradient>
          <linearGradient id={`blue-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2f5cff" /><stop offset="1" stopColor="#0b1f8f" />
          </linearGradient>
          <radialGradient id={`floor-${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={c2} stopOpacity=".55" /><stop offset="1" stopColor={c2} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="170" fill={`url(#bg-${id})`} />
        <polygon points="40,0 80,0 150,170 -10,170" fill={`url(#beam-${id})`} opacity=".5" />
        <polygon points="240,0 280,0 330,170 170,170" fill={`url(#beam-${id})`} opacity=".4" />
        <ellipse cx="160" cy="165" rx="170" ry="26" fill={`url(#floor-${id})`} />
        {Array.from({ length: 16 }, (_, i) => <circle key={i} cx={10 + i * 20} cy="6" r="3" fill={i % 2 ? '#fff3b8' : c2} />)}
        <Prop scene={scene} id={id} />
      </svg>
      <div style={{ position: 'absolute', insetInlineEnd: 'auto', left: 18, bottom: 4 }}>
        <Fanjal size={86} mood={scene === 'crime' || scene === 'mafia' ? 'think' : scene === 'cards' ? 'wink' : 'happy'} wave={scene === 'studio'} />
      </div>
    </div>
  );
}
