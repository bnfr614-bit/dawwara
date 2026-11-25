'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getVolume, setVolume, unlockAudio, play } from '@/lib/sfx';
import { useMe } from './useMe';
import Icon from './Icon';

export default function Header() {
  const { me } = useMe();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [vol, setVol] = useState(0.35);

  useEffect(() => {
    setVol(getVolume());
    try { const t = localStorage.getItem('dw_theme'); if (t === 'light' || t === 'dark') apply(t); } catch {}
  }, []);

  function apply(t: 'dark' | 'light') {
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('dw_theme', t); } catch {}
  }

  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="brand" aria-label="دوّارة، الصفحة الرئيسية">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <circle cx="17" cy="17" r="15" fill="var(--saffron)" />
            <path d="M17 4 L21 17 L17 30 L13 17 Z" fill="var(--sadu)" />
            <circle cx="17" cy="17" r="4" fill="var(--ink)" />
          </svg>
          <b>دوّارة</b>
        </Link>
        <div className="top-actions">
          <label className="vol" title="مستوى الصوت">
            <span style={{ color: 'var(--dim)', display: 'flex' }}><Icon name={vol === 0 ? 'mute' : 'sound'} size={20} /></span>
            <span className="sr-only">مستوى الصوت</span>
            <input
              id="volume" type="range" min={0} max={1} step={0.05} value={vol}
              onChange={(e) => { const v = Number(e.target.value); setVol(v); setVolume(v); }}
              onPointerUp={() => { unlockAudio(); play('flip'); }}
            />
          </label>
          <button className="btn ghost icon" type="button" onClick={() => apply(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
          </button>
          {me && <span className="chip">{me.name}</span>}
        </div>
      </div>
      <div className="sadu" aria-hidden="true" />
    </header>
  );
}
