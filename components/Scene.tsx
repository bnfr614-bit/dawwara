import Fanjal from './Fanjal';

const BG: Record<string, string> = {
  studio: 'radial-gradient(circle at 50% 0%, #6b3b12, #1b100a 70%)',
  notes: 'linear-gradient(160deg, #3a2a1f, #1b120c)',
  cards: 'linear-gradient(160deg, #1f2b3a, #11161e)',
  question: 'linear-gradient(160deg, #2c3a24, #141b10)',
  easel: 'linear-gradient(160deg, #3a2232, #1a0f17)',
  crime: 'linear-gradient(160deg, #2a2a2a, #0f0f0f)',
  letters: 'linear-gradient(160deg, #3a3220, #19150b)',
};

function Prop({ scene }: { scene: string }) {
  switch (scene) {
    case 'studio':
      return (
        <svg width="150" height="110" viewBox="0 0 150 110" aria-hidden="true">
          <rect x="5" y="10" width="140" height="90" rx="10" fill="#0b0705" stroke="#f2b134" strokeWidth="3" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x="14" y={20 + i * 19} width="58" height="14" rx="3" fill={i < 2 ? '#f2b134' : '#3a2a1f'} />)}
          {[0, 1, 2, 3].map((i) => <rect key={i} x="78" y={20 + i * 19} width="58" height="14" rx="3" fill="#3a2a1f" />)}
        </svg>
      );
    case 'notes':
      return (
        <svg width="140" height="110" viewBox="0 0 140 110" aria-hidden="true">
          <rect x="20" y="14" width="70" height="86" rx="6" fill="#f6ead7" transform="rotate(-8 55 57)" />
          <rect x="52" y="10" width="70" height="86" rx="6" fill="#fff8ea" transform="rotate(6 87 53)" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x="62" y={26 + i * 14} width="50" height="4" rx="2" fill="#b9a58f" transform="rotate(6 87 53)" />)}
          <text x="84" y="92" fontSize="28" fill="#d23c2e" fontFamily="serif" transform="rotate(6 87 53)">؟</text>
        </svg>
      );
    case 'cards':
      return (
        <svg width="150" height="110" viewBox="0 0 150 110" aria-hidden="true">
          {[-14, 0, 14].map((r, i) => <rect key={i} x="52" y="12" width="48" height="74" rx="7" fill={i === 1 ? '#d23c2e' : '#f6ead7'} stroke="#1c1208" strokeWidth="2" transform={`rotate(${r} 76 95)`} />)}
          <circle cx="76" cy="48" r="10" fill="#1c1208" /><text x="70" y="54" fontSize="16" fill="#f2b134">?</text>
        </svg>
      );
    case 'question':
      return (
        <svg width="140" height="110" viewBox="0 0 140 110" aria-hidden="true">
          <path d="M20 20 h100 a10 10 0 0 1 10 10 v40 a10 10 0 0 1 -10 10 h-60 l-16 14 v-14 h-24 a10 10 0 0 1 -10 -10 v-40 a10 10 0 0 1 10 -10z" fill="#f6ead7" />
          <text x="54" y="66" fontSize="40" fill="#7aa35a" fontFamily="serif">؟</text>
          <text x="86" y="66" fontSize="40" fill="#d23c2e" fontFamily="serif">؟</text>
        </svg>
      );
    case 'easel':
      return (
        <svg width="140" height="110" viewBox="0 0 140 110" aria-hidden="true">
          <path d="M40 106 L62 14 M100 106 L78 14" stroke="#8a5a2b" strokeWidth="5" />
          <rect x="30" y="16" width="80" height="62" rx="4" fill="#fffdf8" stroke="#8a5a2b" strokeWidth="3" />
          <path d="M42 64 q14 -34 28 -8 q12 20 26 -18" stroke="#d23c2e" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="92" cy="30" r="7" fill="#f2b134" />
        </svg>
      );
    case 'crime':
      return (
        <svg width="150" height="110" viewBox="0 0 150 110" aria-hidden="true">
          <rect x="18" y="18" width="114" height="80" rx="6" fill="#c9a04f" />
          <rect x="18" y="12" width="46" height="14" rx="4" fill="#c9a04f" />
          <rect x="18" y="50" width="114" height="12" fill="#f2b134" />
          <path d="M22 50 l8 12 M38 50 l8 12 M54 50 l8 12 M70 50 l8 12" stroke="#1c1208" strokeWidth="4" />
          <circle cx="106" cy="34" r="12" fill="none" stroke="#1c1208" strokeWidth="4" /><path d="M114 42 l12 12" stroke="#1c1208" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case 'letters':
      return (
        <svg width="150" height="110" viewBox="0 0 150 110" aria-hidden="true">
          {['إنسان', 'حيوان', 'نبات', 'جماد'].map((t, i) => (
            <g key={t}><rect x="14" y={10 + i * 24} width="86" height="19" rx="4" fill="#f6ead7" /><text x="92" y={24 + i * 24} fontSize="11" fill="#6e5a49" textAnchor="end">{t}</text></g>
          ))}
          <circle cx="122" cy="52" r="20" fill="#d23c2e" /><text x="122" y="61" fontSize="26" fill="#fff" textAnchor="middle" fontWeight="700">م</text>
        </svg>
      );
  }
  return null;
}

export default function Scene({ scene }: { scene: string }) {
  return (
    <div className="scene" style={{ background: BG[scene] || BG.studio }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        <Fanjal size={84} mood={scene === 'crime' ? 'think' : scene === 'cards' ? 'wink' : 'happy'} />
        <Prop scene={scene} />
      </div>
    </div>
  );
}
