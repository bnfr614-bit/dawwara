'use client';
import { useId } from 'react';

export type Mood = 'happy' | 'think' | 'shock' | 'wink' | 'sad';

/** فنجال: a Saudi coffee cup (white porcelain, gold rim) in a shemagh and agal, the show's host. */
export default function Fanjal({ size = 120, mood = 'happy', talking = false, wave = false }: { size?: number; mood?: Mood; talking?: boolean; wave?: boolean }) {
  const id = useId().replace(/:/g, '');
  const g = (n: string) => `${n}-${id}`;
  const mouth = {
    happy: <path d="M51 86 Q60 95 69 86 Q60 90 51 86Z" fill="#7a1f1a" stroke="#4a110e" strokeWidth="1.6" strokeLinejoin="round" />,
    think: <path d="M53 89 Q59 86 68 88" stroke="#4a110e" strokeWidth="3" fill="none" strokeLinecap="round" />,
    shock: <ellipse cx="60" cy="89" rx="5" ry="6.5" fill="#7a1f1a" stroke="#4a110e" strokeWidth="1.6" />,
    wink: <path d="M50 85 Q60 98 70 85Z" fill="#7a1f1a" stroke="#4a110e" strokeWidth="1.6" strokeLinejoin="round" />,
    sad: <path d="M52 91 Q60 84 68 91" stroke="#4a110e" strokeWidth="3" fill="none" strokeLinecap="round" />,
  }[mood];
  const eye = (cx: number, closed: boolean) =>
    closed ? (
      <path d={`M${cx - 5.5} 72 Q${cx} 67 ${cx + 5.5} 72`} stroke="#2a1a10" strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : (
      <g>
        <ellipse cx={cx} cy="71" rx="6" ry="7.5" fill="#fff" stroke="#2a1a10" strokeWidth="1.4" />
        <circle cx={cx + (mood === 'think' ? 1.8 : 0)} cy={mood === 'think' ? 68.5 : 72} r="3.8" fill="#2a1a10" />
        <circle cx={cx + 1.4} cy={mood === 'think' ? 67 : 70.4} r="1.3" fill="#fff" />
      </g>
    );
  return (
    <svg width={size} height={size * 1.08} viewBox="0 0 120 130" role="img" aria-label="فنجال، مقدّم دوّارة" style={{ overflow: 'visible', flex: 'none' }}>
      <defs>
        <linearGradient id={g('cup')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e9e4da" />
          <stop offset=".35" stopColor="#ffffff" />
          <stop offset=".8" stopColor="#f3efe7" />
          <stop offset="1" stopColor="#d8d1c4" />
        </linearGradient>
        <linearGradient id={g('gold')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1b0" /><stop offset=".5" stopColor="#e6b325" /><stop offset="1" stopColor="#a8740c" />
        </linearGradient>
        <pattern id={g('shemagh')} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="#fdfdfd" />
          <rect width="3.5" height="3.5" fill="#d42a2a" />
          <rect x="3.5" y="3.5" width="3.5" height="3.5" fill="#d42a2a" />
        </pattern>
        <radialGradient id={g('cheek')} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ff8f8f" stopOpacity=".55" /><stop offset="1" stopColor="#ff8f8f" stopOpacity="0" />
        </radialGradient>
        <style>{`.fj-talk-${id}{animation:fjt .18s infinite alternate;transform-origin:60px 88px}@keyframes fjt{to{transform:scaleY(.3)}}.fj-wave-${id}{animation:fjw 1s ease-in-out infinite;transform-origin:96px 84px}@keyframes fjw{50%{transform:rotate(-20deg)}}.fj-bob-${id}{animation:fjb 3s ease-in-out infinite}@keyframes fjb{50%{transform:translateY(-3px)}}.fj-steam-${id}{animation:fjs 2.6s ease-in-out infinite}@keyframes fjs{0%,100%{opacity:.15;transform:translateY(3px)}50%{opacity:.6;transform:translateY(-3px)}}@media (prefers-reduced-motion:reduce){.fj-talk-${id},.fj-wave-${id},.fj-bob-${id},.fj-steam-${id}{animation:none}}`}</style>
      </defs>
      <ellipse cx="60" cy="125" rx="34" ry="4.5" fill="rgba(0,0,0,.3)" />
      <g className={`fj-bob-${id}`}>
        {/* steam rising from the coffee */}
        <g className={`fj-steam-${id}`} stroke="rgba(255,255,255,.75)" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M44 14 q-6 -6 0 -12" /><path d="M76 14 q-6 -6 0 -12" />
        </g>
        {/* arms */}
        <path d="M30 86 Q18 94 20 104" stroke="#e8e2d6" strokeWidth="7" fill="none" strokeLinecap="round" />
        <circle cx="20" cy="106" r="6" fill="#fff" stroke="#cfc6b6" strokeWidth="1.5" />
        <g className={wave ? `fj-wave-${id}` : undefined}>
          <path d={wave ? 'M90 84 Q102 76 103 62' : 'M90 86 Q102 94 100 104'} stroke="#e8e2d6" strokeWidth="7" fill="none" strokeLinecap="round" />
          <circle cx={wave ? 103 : 100} cy={wave ? 60 : 106} r="6" fill="#fff" stroke="#cfc6b6" strokeWidth="1.5" />
        </g>
        {/* cup body: finjan shape, wide rim tapering to a small foot */}
        <path d="M24 44 Q24 104 48 116 L72 116 Q96 104 96 44 Z" fill={`url(#${g('cup')})`} stroke="#b8ae9c" strokeWidth="1.5" />
        <rect x="46" y="114" width="28" height="6" rx="3" fill={`url(#${g('gold')})`} />
        {/* gold band with a simple Najdi motif */}
        <path d="M27 98 Q60 108 93 98" stroke={`url(#${g('gold')})`} strokeWidth="4" fill="none" />
        {[34, 46, 60, 74, 86].map((x) => <path key={x} d={`M${x} ${103 - Math.abs(60 - x) / 8} l3 -4 l3 4 l-3 4 z`} fill="#c8961a" />)}
        {/* shemagh draped over the rim, agal on top */}
        <path d="M18 48 Q20 18 60 14 Q100 18 102 48 Q96 58 92 70 Q86 52 60 50 Q34 52 28 70 Q24 58 18 48 Z" fill={`url(#${g('shemagh')})`} stroke="#b22020" strokeWidth="1.5" />
        <path d="M28 70 Q24 58 18 48 L14 66 Q20 74 28 70Z" fill={`url(#${g('shemagh')})`} stroke="#b22020" strokeWidth="1.2" />
        <path d="M92 70 Q96 58 102 48 L106 66 Q100 74 92 70Z" fill={`url(#${g('shemagh')})`} stroke="#b22020" strokeWidth="1.2" />
        <ellipse cx="60" cy="24" rx="32" ry="7" fill="none" stroke="#141414" strokeWidth="4.5" />
        <ellipse cx="60" cy="29" rx="34" ry="7.5" fill="none" stroke="#1f1f1f" strokeWidth="4.5" />
        <path d="M30 32 l-4 18 M33 33 l-2 18" stroke="#141414" strokeWidth="2.2" strokeLinecap="round" />
        {/* face */}
        {mood === 'shock' && <path d="M43 60 L54 63 M77 60 L66 63" stroke="#2a1a10" strokeWidth="2.6" strokeLinecap="round" />}
        {mood === 'think' && <path d="M43 63 L54 61 M66 59 L77 62" stroke="#2a1a10" strokeWidth="2.6" strokeLinecap="round" />}
        {eye(49, false)}
        {eye(71, mood === 'wink')}
        <ellipse cx="41" cy="82" rx="7" ry="4" fill={`url(#${g('cheek')})`} />
        <ellipse cx="79" cy="82" rx="7" ry="4" fill={`url(#${g('cheek')})`} />
        <path d="M50 80 Q55 77 60 80 Q65 77 70 80" stroke="#2a1a10" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <g className={talking ? `fj-talk-${id}` : undefined}>{mouth}</g>
        {/* porcelain shine */}
        <path d="M32 74 Q32 94 42 106" stroke="rgba(255,255,255,.9)" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
