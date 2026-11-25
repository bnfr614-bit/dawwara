'use client';

// Soft, short cues. Everything goes through one master gain the player can turn down or mute.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const KEY = 'dw_volume';
const DEFAULT_VOLUME = 0.35;

export function getVolume() {
  try { const v = localStorage.getItem(KEY); return v === null ? DEFAULT_VOLUME : Math.max(0, Math.min(1, Number(v))); } catch { return DEFAULT_VOLUME; }
}
export function setVolume(v: number) {
  try { localStorage.setItem(KEY, String(v)); } catch {}
  if (master) master.gain.value = v * 0.22;
}

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = getVolume() * 0.22;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio() { ac(); }

function tone(freq: number, dur: number, opt: { type?: OscillatorType; vol?: number; at?: number; to?: number } = {}) {
  const c = ac();
  if (!c || !master || getVolume() === 0) return;
  const t = c.currentTime + (opt.at || 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opt.type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
  const v = opt.vol ?? 0.5;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx: Record<string, () => void> = {
  ding: () => { tone(1046, 0.35, { type: 'triangle' }); tone(1568, 0.45, { type: 'sine', at: 0.08, vol: 0.35 }); },
  top: () => { [784, 1046, 1318].forEach((f, i) => tone(f, 0.35, { type: 'triangle', at: i * 0.08, vol: 0.45 })); },
  flip: () => tone(520, 0.08, { type: 'sine', vol: 0.3, to: 780 }),
  strike: () => { tone(180, 0.35, { type: 'triangle', vol: 0.6, to: 140 }); tone(186, 0.35, { type: 'sine', vol: 0.4, to: 146 }); },
  buzz: () => tone(220, 0.3, { type: 'triangle', vol: 0.5, to: 160 }),
  bell: () => { tone(1318, 0.25, { type: 'sine', vol: 0.45 }); tone(1318, 0.25, { type: 'sine', at: 0.12, vol: 0.3 }); },
  stop: () => { tone(660, 0.12, { type: 'square', vol: 0.18 }); tone(440, 0.2, { type: 'square', at: 0.1, vol: 0.18 }); },
  round: () => { tone(523, 0.18, { type: 'triangle', vol: 0.4 }); tone(784, 0.28, { type: 'triangle', at: 0.14, vol: 0.4 }); },
  steal: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, { type: 'triangle', at: i * 0.08, vol: 0.4 })); },
  stealFail: () => { [440, 370, 311].forEach((f, i) => tone(f, 0.3, { type: 'triangle', at: i * 0.15, vol: 0.4 })); },
  award: () => { [659, 784, 988].forEach((f, i) => tone(f, 0.2, { type: 'sine', at: i * 0.07, vol: 0.4 })); },
  win: () => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.28, { type: 'triangle', at: i * 0.12, vol: 0.4 })); },
  tick: () => tone(900, 0.03, { type: 'sine', vol: 0.15 }),
};

export function play(type: string) { sfx[type]?.(); }
