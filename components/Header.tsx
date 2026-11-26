'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getVolume, setVolume, unlockAudio, play } from '@/lib/sfx';
import { useMe } from './useMe';
import Icon from './Icon';

export default function Header() {
  const { me } = useMe();
  const [vol, setVol] = useState(0.35);
  useEffect(() => { setVol(getVolume()); }, []);

  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="brand" aria-label="دوّارة، الصفحة الرئيسية">
          <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="16" fill="#ffc21a" stroke="#b35f00" strokeWidth="2" />
            <circle cx="18" cy="18" r="10" fill="#0c238f" />
            <path d="M18 9 L21 18 L18 27 L15 18 Z" fill="#ff3049" />
            <circle cx="18" cy="18" r="2.5" fill="#fff" />
          </svg>
          <b>دوّارة</b>
        </Link>
        <div className="top-actions">
          <label className="vol" title="مستوى الصوت">
            <span style={{ color: 'var(--dim)', display: 'flex' }}><Icon name={vol === 0 ? 'mute' : 'sound'} size={20} /></span>
            <span className="sr-only">مستوى الصوت</span>
            <input id="volume" type="range" min={0} max={1} step={0.05} value={vol}
              onChange={(e) => { const v = Number(e.target.value); setVol(v); setVolume(v); }}
              onPointerUp={() => { unlockAudio(); play('flip'); }} />
          </label>
          {me && <span className="chip">{me.name}</span>}
        </div>
      </div>
      <div className="bulbs" aria-hidden="true" />
    </header>
  );
}
