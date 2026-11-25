'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import NameGate from '@/components/NameGate';
import { useMe } from '@/components/useMe';
import { gameById } from '@/lib/catalog';
import { createRoom } from '@/lib/useRoom';
import Loading from '@/components/Loading';

function Creating() {
  const router = useRouter();
  const game = useSearchParams().get('game') || '';
  const info = gameById(game);
  const { me } = useMe();
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!me || !info || started.current) return;
    started.current = true;
    createRoom(info.id).then((r) => {
      if (r.code) router.replace(`/room/${r.code}`);
      else { setErr(r.error || 'ما قدرنا نفتح الغرفة.'); started.current = false; }
    });
  }, [me, info, router]);

  if (!info) return <div className="wrap section"><div className="error">اللعبة غير موجودة. <a href="/#games">رجوع للألعاب</a></div></div>;
  return (
    <div className="wrap" style={{ maxWidth: 520 }}>
      {err ? (
        <div className="section stack"><div className="error">{err}</div><a className="btn ghost" href="/#games">رجوع للألعاب</a></div>
      ) : (
        <Loading text={`نفتح لك غرفة «${info.name}»`} />
      )}
    </div>
  );
}

export default function NewRoom() {
  return (
    <>
      <Header />
      <NameGate title="قبل نفتح الغرفة، وش اسمك؟">
        <Suspense><Creating /></Suspense>
      </NameGate>
    </>
  );
}
