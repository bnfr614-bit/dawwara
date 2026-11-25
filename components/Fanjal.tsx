'use client';

type Mood = 'happy' | 'think' | 'shock' | 'wink';

/** فنجال: an Arabic coffee cup in a bisht, the game host. */
export default function Fanjal({ size = 120, mood = 'happy', talking = false }: { size?: number; mood?: Mood; talking?: boolean }) {
  const mouth = {
    happy: <path d="M50 77 q10 9 20 0" stroke="#1c1208" strokeWidth="3.2" fill="none" strokeLinecap="round" />,
    think: <path d="M52 79 h16" stroke="#1c1208" strokeWidth="3.2" strokeLinecap="round" />,
    shock: <ellipse cx="60" cy="79" rx="6" ry="7" fill="#5a120c" />,
    wink: <path d="M50 76 q10 10 20 0" stroke="#1c1208" strokeWidth="3.2" fill="#5a120c" strokeLinecap="round" />,
  }[mood];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="فنجال، مقدّم دوّارة">
      <style>{`.fj-talk{animation:fjt .2s infinite alternate;transform-origin:60px 78px}@keyframes fjt{to{transform:scaleY(.35)}}.fj-steam{animation:fjs 2.4s ease-in-out infinite}@keyframes fjs{0%,100%{opacity:.2;transform:translateY(2px)}50%{opacity:.7;transform:translateY(-3px)}}@media (prefers-reduced-motion:reduce){.fj-talk,.fj-steam{animation:none}}`}</style>
      {/* steam */}
      <g className="fj-steam" stroke="var(--dim)" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M48 20 q-6 -7 0 -14" /><path d="M60 18 q-6 -7 0 -14" /><path d="M72 20 q-6 -7 0 -14" />
      </g>
      {/* bisht (cloak) */}
      <path d="M18 112 Q22 60 36 46 L84 46 Q98 60 102 112 Z" fill="#2a1c12" />
      <path d="M36 46 L48 112 M84 46 L72 112" stroke="var(--saffron)" strokeWidth="3.5" />
      {/* cup body */}
      <path d="M32 34 h56 l-6 54 q-1 8 -9 8 h-26 q-8 0 -9 -8 z" fill="#f6ead7" stroke="#1c1208" strokeWidth="2.5" />
      {/* sadu band on cup */}
      <rect x="35" y="40" width="50" height="7" fill="var(--sadu)" />
      <path d="M35 47 l5 -7 l5 7 l5 -7 l5 7 l5 -7 l5 7 l5 -7 l5 7 l5 -7 l5 7" fill="none" stroke="#1c1208" strokeWidth="1.6" />
      {/* coffee rim */}
      <ellipse cx="60" cy="34" rx="28" ry="5" fill="#c9a04f" stroke="#1c1208" strokeWidth="2.5" />
      {/* glasses */}
      <g stroke="#1c1208" strokeWidth="2.5" fill="rgba(255,255,255,.35)">
        <circle cx="49" cy="62" r="7" /><circle cx="71" cy="62" r="7" /><path d="M56 62 h8" fill="none" />
      </g>
      {mood === 'wink' ? <path d="M68 62 h7" stroke="#1c1208" strokeWidth="3" strokeLinecap="round" /> : <circle cx="71" cy="62" r="2.4" fill="#1c1208" />}
      <circle cx="49" cy="62" r="2.4" fill="#1c1208" />
      {mood === 'shock' && <path d="M42 51 l7 2 M78 51 l-7 2" stroke="#1c1208" strokeWidth="2.5" strokeLinecap="round" />}
      <g className={talking ? 'fj-talk' : undefined}>{mouth}</g>
      {/* hands */}
      <circle cx="28" cy="84" r="6" fill="#f6ead7" stroke="#1c1208" strokeWidth="2" />
      <circle cx="92" cy="84" r="6" fill="#f6ead7" stroke="#1c1208" strokeWidth="2" />
    </svg>
  );
}
