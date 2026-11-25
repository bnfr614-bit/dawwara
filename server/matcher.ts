import { aiEnabled, claude, extractJson } from './ai';

/** Spelling-level normalization for Arabic answers: مويه = موية = الموية */
export function norm(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '') // tashkeel + tatweel
    .replace(/[إأآٱا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ئ/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/^(وال|بال|فال|كال|لل|ال)(?=..)/, '')) // definite article and attached prepositions
    .map((w) => w.replace(/(.)\1+/g, '$1')) // stretched letters: كبسسسه
    .join(' ')
    .trim();
}

function lev(a: string, b: string) {
  if (a === b) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

const tolerance = (len: number) => (len <= 3 ? 0 : len <= 6 ? 1 : 2);

// same word with a typo, or two forms of one root (خربت / خربانه): shared 3+ letter start
function wordEq(x: string, w: string) {
  if (x === w || (w.length > 3 && lev(x, w) <= tolerance(w.length))) return true;
  let p = 0;
  while (p < x.length && p < w.length && x[p] === w[p]) p++;
  return p >= 3 && p / Math.min(x.length, w.length) >= 0.7;
}

// dialect/synonym groups (compared after norm())
const SYNONYMS = [
  ['ماء', 'مويه', 'مي', 'ميه', 'مياه'],
  ['جوال', 'تلفون', 'موبايل', 'هاتف', 'جول'],
  ['سياره', 'موتر', 'سيارات', 'عربيه'],
  ['قهوه', 'كوفي', 'قهوه عربيه'],
  ['شاي', 'شاهي', 'تشاي'],
  ['قطوه', 'قط', 'بس', 'بسه', 'قطه'],
  ['ثلاجه', 'براد', 'تلاجه'],
  ['فلوس', 'بيزات', 'مال', 'نقود'],
  ['نوم', 'نايم', 'النوم'],
  ['زحمه', 'زحام', 'ازدحام'],
  ['اكل', 'طعام', 'وجبه'],
  ['بيت', 'منزل', 'دار'],
  ['ولد', 'ولد', 'صبي', 'بزر', 'طفل', 'اطفال'],
  ['شنطه', 'حقيبه', 'جنطه'],
  ['دكتور', 'طبيب'],
  ['تمر', 'تمور', 'رطب'],
  ['مكيف', 'كنديشن', 'تكييف'],
  ['تلفزيون', 'تلفاز', 'شاشه'],
  ['سناب', 'سناب شات', 'سنابشات'],
  ['واتساب', 'واتس', 'وتساب'],
];
function synonymsOf(s: string): string[] {
  const n = norm(s);
  const group = SYNONYMS.find((g) => g.some((w) => norm(w) === n));
  return group ? group : [];
}

/** Local, instant match: spelling variants, typos, synonyms, word-order and contained answers. */
export function localMatch(guess: string, answer: string, aliases: string[] = []) {
  const g = norm(guess);
  if (!g) return false;
  const gSyn = synonymsOf(guess).map(norm);
  if (gSyn.length && [answer, ...aliases].some((c) => gSyn.includes(norm(c)))) return true;
  for (const cand of [answer, ...aliases, ...synonymsOf(answer)]) {
    const a = norm(cand);
    if (!a) continue;
    if (g === a) return true;
    if (lev(g, a) <= tolerance(a.length)) return true;
    const gw = g.split(' '), aw = a.split(' ');
    // every word of the answer appears (typos or same root) in the guess: "السياره خربانه" vs "السيارة خربت"
    if (aw.length > 1 && aw.every((w) => gw.some((x) => wordEq(x, w)))) return true;
    if (aw.every((w) => gw.some((x) => x === w || (w.length > 3 && lev(x, w) <= tolerance(w.length))))) return true;
    // single-word guess that is a core word of a multi-word answer: "الأهل" for "زيارة الأهل"
    if (gw.length === 1 && g.length >= 3 && aw.length > 1 && aw.some((w) => w.length >= 3 && lev(w, g) <= tolerance(w.length))) return true;
  }
  return false;
}

/**
 * Finds which answer (by index) a typed guess means. Local fuzzy match first; when nothing
 * matches and Claude is configured, asks it to judge meaning (synonyms, dialect words).
 */
export async function matchAnswer(guess: string, answers: { text: string; aliases?: string[] }[], context: string, exclude: number[] = []): Promise<number> {
  const open = answers.map((a, i) => ({ ...a, i })).filter((a) => !exclude.includes(a.i));
  for (const a of open) if (localMatch(guess, a.text, a.aliases)) return a.i;
  if (!aiEnabled() || !norm(guess)) return -1;
  try {
    const out = await claude({
      system:
        'أنت حكم في لعبة مسابقات سعودية. تحكم هل إجابة اللاعب تعني نفس إحدى الإجابات على اللوحة. اقبل المرادفات واللهجات والأخطاء الإملائية والصيغ المختلفة لنفس المعنى (مثلاً: ماء = موية، جوال = تلفون، سيارة = موتر). ارفض إذا كانت شي مختلف أو أعم أو أخص بشكل واضح. رد بـ JSON فقط: {"index": رقم الإجابة أو -1}',
      messages: [{
        role: 'user',
        content: `السؤال: ${context}\nالإجابات على اللوحة:\n${open.map((a) => `${a.i}: ${a.text}`).join('\n')}\n\nإجابة اللاعب: «${guess}»`,
      }],
      maxTokens: 50,
      timeoutMs: 6000,
    });
    const { index } = extractJson<{ index: number }>(out);
    return open.some((a) => a.i === index) ? index : -1;
  } catch (e) {
    console.warn('AI match failed, local result kept', (e as Error).message);
    return -1;
  }
}

/** True if the word starts with the round letter (أ covers ا إ آ). */
export function startsWithLetter(word: string, letter: string) {
  const w = norm(word).replace(/\s/g, '');
  const l = norm(letter);
  return !!w && w[0] === l;
}

/** Simple equality for secret-word guesses, tolerant of spelling. */
export function sameWord(a: string, b: string) {
  return localMatch(a, b);
}

/** Groups equal answers (after normalization + small typos) so duplicates share points. */
export function sameAnswer(a: string, b: string) {
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x === y || lev(x, y) <= tolerance(Math.max(x.length, y.length)));
}
