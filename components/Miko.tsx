'use client';
import { useId } from 'react';

export type Mood = 'happy' | 'think' | 'shock' | 'wink' | 'sad';

/** ميكو: a golden studio microphone in a navy tux and bow tie, the show's host. */
export default function Miko({ size = 120, mood = 'happy', talking = false, wave = false }: { size?: number; mood?: Mood; talking?: boolean; wave?: boolean }) {
  const id = useId().replace(/:/g, '');
  const g = (n: string) => `${n}-${id}`;
  const mouth = {
    happy: <path d="M50 66 Q60 76 70 66 Q60 71 50 66Z" fill="#5b0d17" stroke="#3a0710" strokeWidth="1.5" strokeLinejoin="round" />,
    think: <path d="M52 69 Q58 66 68 68" stroke="#3a0710" strokeWidth="3" fill="none" strokeLinecap="round" />,
    shock: <ellipse cx="60" cy="69" rx="5.5" ry="7" fill="#5b0d17" stroke="#3a0710" strokeWidth="1.5" />,
    wink: <path d="M49 65 Q60 79 71 65Z" fill="#5b0d17" stroke="#3a0710" strokeWidth="1.5" strokeLinejoin="round" />,
    sad: <path d="M51 71 Q60 64 69 71" stroke="#3a0710" strokeWidth="3" fill="none" strokeLinecap="round" />,
  }[mood];
  const eye = (cx: number, closed: boolean) =>
    closed ? (
      <path d={`M${cx - 6} 52 Q${cx} 47 ${cx + 6} 52`} stroke="#1a1030" strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : (
      <g>
        <ellipse cx={cx} cy="51" rx="7" ry="8.5" fill="#fff" stroke="#1a1030" strokeWidth="1.5" />
        <circle cx={cx + (mood === 'think' ? 2 : 0)} cy={mood === 'think' ? 48 : 52} r="4.2" fill="#1a1030" />
        <circle cx={cx + 1.6} cy={mood === 'think' ? 46.5 : 50.2} r="1.5" fill="#fff" />
      </g>
    );
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 120 134" role="img" aria-label="ميكو، مقدّم دوّارة" style={{ overflow: 'visible', flex: 'none' }}>
      <defs>
        <radialGradient id={g('head')} cx="40%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff6cc" />
          <stop offset=".45" stopColor="#ffc21a" />
          <stop offset="1" stopColor="#b35f00" />
        </radialGradient>
        <pattern id={g('mesh')} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.1" fill="rgba(120,60,0,.35)" />
        </pattern>
        <linearGradient id={g('suit')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a43c9" />
          <stop offset="1" stopColor="#0a1660" />
        </linearGradient>
        <linearGradient id={g('ring')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f4ff" />
          <stop offset=".5" stopColor="#9aa3c8" />
          <stop offset="1" stopColor="#5a6288" />
        </linearGradient>
        <style>{`.mk-talk-${id}{animation:mkt .18s infinite alternate;transform-origin:60px 68px}@keyframes mkt{to{transform:scaleY(.3)}}.mk-wave-${id}{animation:mkw 1s ease-in-out infinite;transform-origin:96px 92px}@keyframes mkw{50%{transform:rotate(-18deg)}}.mk-bob-${id}{animation:mkb 3s ease-in-out infinite}@keyframes mkb{50%{transform:translateY(-3px)}}@media (prefers-reduced-motion:reduce){.mk-talk-${id},.mk-wave-${id},.mk-bob-${id}{animation:none}}`}</style>
      </defs>
      <ellipse cx="60" cy="130" rx="30" ry="4" fill="rgba(0,0,0,.35)" />
      <g className={`mk-bob-${id}`}>
        {/* body: tux */}
        <path d="M36 84 Q60 76 84 84 L90 122 Q60 132 30 122 Z" fill={`url(#${g('suit')})`} stroke="#060d3a" strokeWidth="2" />
        <path d="M52 82 L60 104 L68 82 Z" fill="#fff" />
        <path d="M44 84 L60 106 L50 124" fill="none" stroke="#060d3a" strokeWidth="2" opacity=".6" />
        <path d="M76 84 L60 106 L70 124" fill="none" stroke="#060d3a" strokeWidth="2" opacity=".6" />
        {/* bow tie */}
        <path d="M50 84 L58 88 L50 92 Z M70 84 L62 88 L70 92 Z" fill="#ff3049" stroke="#8a0f1f" strokeWidth="1.2" />
        <circle cx="60" cy="88" r="3" fill="#ff3049" stroke="#8a0f1f" strokeWidth="1.2" />
        <circle cx="60" cy="100" r="1.6" fill="#ffc21a" /><circle cx="60" cy="108" r="1.6" fill="#ffc21a" />
        {/* arms */}
        <path d="M36 88 Q24 98 26 108" stroke={`url(#${g('suit')})`} strokeWidth="9" fill="none" strokeLinecap="round" />
        <circle cx="26" cy="110" r="6.5" fill="#fff" stroke="#c9cfe8" strokeWidth="1.5" />
        <g className={wave ? `mk-wave-${id}` : undefined}>
          <path d={wave ? 'M84 88 Q98 82 100 68' : 'M84 88 Q96 98 94 108'} stroke={`url(#${g('suit')})`} strokeWidth="9" fill="none" strokeLinecap="round" />
          <circle cx={wave ? 100 : 94} cy={wave ? 66 : 110} r="6.5" fill="#fff" stroke="#c9cfe8" strokeWidth="1.5" />
        </g>
        {/* neck ring */}
        <rect x="40" y="74" width="40" height="10" rx="5" fill={`url(#${g('ring')})`} stroke="#3a4066" strokeWidth="1.5" />
        {/* head: mic grille */}
        <circle cx="60" cy="46" r="34" fill={`url(#${g('head')})`} stroke="#8a4a00" strokeWidth="2" />
        <circle cx="60" cy="46" r="34" fill={`url(#${g('mesh')})`} />
        <path d="M30 34 Q60 22 90 34" stroke="rgba(255,255,255,.55)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="46" cy="24" rx="9" ry="5" fill="rgba(255,255,255,.55)" transform="rotate(-20 46 24)" />
        {/* face */}
        {mood === 'shock' && <path d="M40 38 L52 41 M80 38 L68 41" stroke="#1a1030" strokeWidth="3" strokeLinecap="round" />}
        {mood === 'think' && <path d="M40 41 L52 39 M68 37 L80 40" stroke="#1a1030" strokeWidth="3" strokeLinecap="round" />}
        {eye(48, false)}
        {eye(72, mood === 'wink')}
        <ellipse cx="40" cy="62" rx="5" ry="3" fill="rgba(255,90,110,.45)" />
        <ellipse cx="80" cy="62" rx="5" ry="3" fill="rgba(255,90,110,.45)" />
        <g className={talking ? `mk-talk-${id}` : undefined}>{mouth}</g>
      </g>
    </svg>
  );
}
