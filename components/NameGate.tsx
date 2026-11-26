'use client';
import { useState } from 'react';
import Fanjal from './Fanjal';
import { useMe } from './useMe';
import Loading from './Loading';

export default function NameGate({ children, title = 'وش اسمك؟' }: { children: React.ReactNode; title?: string }) {
  const { me, loading, saveName } = useMe();
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading text="لحظة" />;
  if (me) return <>{children}</>;

  return (
    <div className="wrap section" style={{ maxWidth: 460 }}>
      <form
        className="card stack center"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(await saveName(name));
          setBusy(false);
        }}
      >
        <div style={{ display: 'grid', placeItems: 'center' }}><Fanjal size={110} mood="wink" /></div>
        <h2>{title}</h2>
        <p className="muted">هذا الاسم اللي يشوفه ربعك في الغرفة. ما نحتاج إيميل ولا كلمة مرور.</p>
        <input id="player-name" className="input center" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: أبو فهد" maxLength={16} autoFocus />
        {err && <div className="error">{err}</div>}
        <button className="btn go lg block" disabled={busy || name.trim().length < 2}>يلا</button>
      </form>
    </div>
  );
}
