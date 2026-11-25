'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GAMES } from '@/lib/catalog';
import Fanjal from './Fanjal';
import Scene from './Scene';
import Icon from './Icon';

const DEMO = { q: 'شي ما يبدأ صباحك بدونه؟', a: [['القهوة', 38], ['الجوال', 22], ['الفطور', 14], ['الصلاة', 10], ['الشاي', 8], ['الدش', 5]] as [string, number][] };

function LivePreview() {
  const [open, setOpen] = useState<number[]>([]);
  useEffect(() => {
    const order = [1, 0, 3, 2, 5, 4];
    let i = 0;
    const t = setInterval(() => {
      setOpen((o) => (i >= order.length ? [] : [...o, order[i]]));
      i = i >= order.length ? 0 : i + 1;
    }, 1300);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="stack preview" aria-label="معاينة لعبة وش قالوا">
      <div className="host-bubble">
        <Fanjal size={80} talking />
        <div className="bubble">سألنا ١٠٠ شخص: {DEMO.q}</div>
      </div>
      <div className="feud-board">
        {DEMO.a.map(([t, p], i) => (
          <div key={t} className={`tile${open.includes(i) ? ' open' : ''}`} style={{ order: i < 3 ? i * 2 : (i - 3) * 2 + 1 }}>
            <div className="tile-in">
              <div className="f"><span className="n">{i + 1}</span></div>
              <div className="b"><span className="t">{t}</span><span className="p">{p}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameCard({ g, featured }: { g: (typeof GAMES)[number]; featured?: boolean }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <article className={`flip${flipped ? ' on' : ''}${featured ? ' featured' : ''}`}>
      <div className="flip-in">
        <div className="face" aria-hidden={flipped}>
          <Scene scene={g.scene} />
          <div className="face-body">
            <h3>{g.name}</h3>
            <p className="muted">{g.tagline}</p>
            <div className="meta">
              <span className="chip"><Icon name="users" size={15} /> {g.min}–{g.max} لاعب</span>
              <span className="chip"><Icon name="clock" size={15} /> {g.minutes} دقيقة</span>
              {g.teams && <span className="chip"><Icon name="teams" size={15} /> فريقين</span>}
            </div>
            <div className="row" style={{ marginTop: 'auto' }}>
              <Link className="btn go grow" href={`/new?game=${g.id}`} tabIndex={flipped ? -1 : 0}>العب الحين</Link>
              <button className="btn ghost" type="button" onClick={() => setFlipped(true)} tabIndex={flipped ? -1 : 0}>كيف تلعب؟</button>
            </div>
          </div>
        </div>
        <div className="face back" aria-hidden={!flipped}>
          <h3>{g.name}</h3>
          <div className="label">الطريقة</div>
          <ol className="steps">{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <div className="label">النقاط</div>
          <ul className="stack small" style={{ paddingInlineStart: 18, gap: 4 }}>{g.scoring.map((s) => <li key={s}>{s}</li>)}</ul>
          <button className="btn ghost" type="button" style={{ marginTop: 'auto' }} onClick={() => setFlipped(false)} tabIndex={flipped ? 0 : -1}>رجوع للبطاقة</button>
        </div>
      </div>
    </article>
  );
}

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length === 4) router.push(`/room/${c}`);
  };

  return (
    <main>
      <section className="wrap hero">
        <div className="stack" style={{ gap: 18 }}>
          <h1>ليلة الشلة تبدأ <em>بكود من ٤ حروف</em></h1>
          <p>المضيف يفتح غرفة، والكل يدخل من جواله بدون تحميل، واللوحة على الشاشة الكبيرة. وفنجال يمسك الجلسة ويحكم بينكم.</p>
          <div className="hero-actions">
            <a className="btn go lg" href="#games">افتح غرفة</a>
            <form className="join-box" onSubmit={go}>
              <input id="join-code" className="input grow" aria-label="كود الغرفة" placeholder="عندك كود؟ اكتبه هنا" maxLength={4} value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())} autoComplete="off" autoCapitalize="characters" />
              <button className="btn gold" disabled={code.length !== 4}>ادخل</button>
            </form>
          </div>
        </div>
        <LivePreview />
      </section>

      <section className="wrap section" id="games">
        <h2>الألعاب</h2>
        <p className="lead">سبع ألعاب، من ٢ لين ١٤ لاعب. اضغط «كيف تلعب؟» تنقلب البطاقة وتشوف القواعد.</p>
        <div className="games">{GAMES.map((g, i) => <GameCard key={g.id} g={g} featured={i === 0} />)}</div>
      </section>

      <section className="wrap section">
        <h2>كيف تبدأون</h2>
        <div className="how3">
          <div className="card"><h3>١. المضيف يختار لعبة</h3><p className="muted">يفتح الغرفة ويطلع له كود من ٤ حروف. يفتح «شاشة العرض» على التلفزيون أو اللابتوب.</p></div>
          <div className="card"><h3>٢. الشلة تدخل بالكود</h3><p className="muted">كل واحد يفتح الموقع من جواله، يكتب اسمه والكود، وتوصله بطاقاته وأسئلته على شاشته.</p></div>
          <div className="card"><h3>٣. فنجال يمسك الجلسة</h3><p className="muted">يعرض الأسئلة، يحكم الإجابات حتى لو فيها أخطاء إملائية، ويحسب النقاط لين آخر جولة.</p></div>
        </div>
      </section>

      <section className="wrap section faq">
        <h2>أسئلة تتكرر</h2>
        <details><summary>هل نحتاج نحمّل تطبيق؟</summary><p>لا. كل شي من المتصفح، على الجوال أو اللابتوب.</p></details>
        <details><summary>هل الأسئلة تتكرر؟</summary><p>لا. كل سؤال وكلمة تطلع للمضيف تنحفظ، وما ترجع له مرة ثانية. وإذا خلصت الأسئلة الجاهزة يكتب فنجال أسئلة جديدة.</p></details>
        <details><summary>كتبت الإجابة بإملاء غلط، تنحسب؟</summary><p>إيه. «مويه» و«موية» و«ماء» كلها وحدة، والأخطاء البسيطة تنمشي. وإذا الجهاز ما فهمها، المضيف يقدر يكشف الإجابة بنفسه.</p></details>
        <details><summary>لازم شاشة كبيرة؟</summary><p>أحسن، بس مو شرط. كل لاعب يشوف اللي يحتاجه على جواله.</p></details>
        <details><summary>كم شخص يقدر يلعب؟</summary><p>على حسب اللعبة، من ٢ لين ١٤ لاعب.</p></details>
      </section>
      <div className="sadu" aria-hidden="true" />
      <footer className="wrap section center muted small">دوّارة · ألعاب للشلة</footer>
    </main>
  );
}
