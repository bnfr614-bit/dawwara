import { prisma } from '../lib/db';
import { aiEnabled, claude, extractJson } from './ai';
import { shuffle } from './content';

/**
 * Picks n items this host has never seen before and records them as used,
 * so the same question/word never comes back to the same host.
 * When the ready bank runs out, Claude writes new ones (also recorded).
 */
export async function fresh<T>(opts: {
  hostId: string;
  kind: string;
  pool: T[];
  n: number;
  key: (item: T) => string;
  generate?: (n: number, avoid: string[]) => Promise<T[]>;
}): Promise<T[]> {
  const { hostId, kind, pool, n, key } = opts;
  const usedRows = await prisma.usedContent.findMany({ where: { userId: hostId, kind }, select: { key: true } });
  const used = new Set(usedRows.map((r) => r.key));
  let picked = shuffle(pool.filter((x) => !used.has(key(x)))).slice(0, n);

  if (picked.length < n && opts.generate && aiEnabled()) {
    try {
      const avoid = [...used].slice(-150);
      const made = await opts.generate(n - picked.length + 2, avoid);
      const seen = new Set([...used, ...picked.map(key)]);
      for (const m of made) {
        if (picked.length >= n) break;
        if (!seen.has(key(m))) { picked.push(m); seen.add(key(m)); }
      }
    } catch (e) {
      console.warn(`[fresh] AI generation for ${kind} failed:`, (e as Error).message);
    }
  }
  if (picked.length < n) {
    // last resort without AI: least-recently used items, oldest first
    const old = await prisma.usedContent.findMany({ where: { userId: hostId, kind }, orderBy: { createdAt: 'asc' }, take: n * 3 });
    const byKey = new Map(pool.map((x) => [key(x), x]));
    for (const row of old) {
      if (picked.length >= n) break;
      const item = byKey.get(row.key);
      if (item && !picked.includes(item)) {
        picked.push(item);
        await prisma.usedContent.delete({ where: { id: row.id } });
      }
    }
  }
  await prisma.$transaction(
    picked.map((x) => prisma.usedContent.upsert({
      where: { userId_kind_key: { userId: hostId, kind, key: key(x) } },
      update: { createdAt: new Date() },
      create: { userId: hostId, kind, key: key(x) },
    })),
  );
  return picked;
}

const SYS = 'أنت كاتب محتوى لألعاب جماعية سعودية. تكتب باللهجة السعودية البيضاء، محتوى مناسب للعائلة، ومتنوع. ترد بـ JSON فقط بدون أي شرح.';

export const generators = {
  feud: async (n: number, avoid: string[]) => {
    const out = await claude({
      system: SYS,
      messages: [{ role: 'user', content:
        `اكتب ${n} أسئلة استطلاع جمهور جديدة لعبة "وش قالوا" (مثل: شي ما يبدأ صباحك بدونه؟). لكل سؤال 6 إلى 8 إجابات مرتبة من الأكثر شيوعاً، ونقاطها مجموعها تقريباً 100، وكل إجابة لها مرادفات شائعة.
لا تكرر هذي الأسئلة ولا تقاربها: ${avoid.join(' | ') || 'لا يوجد'}
الصيغة: [{"q":"...","a":[["إجابة",نقاط,["مرادف","مرادف"]],...]}]` }],
      maxTokens: 3000,
    });
    return extractJson<any[]>(out).filter((x) => x?.q && Array.isArray(x.a) && x.a.length >= 4);
  },
  odd: async (n: number, avoid: string[]) => {
    const out = await claude({
      system: SYS,
      messages: [{ role: 'user', content:
        `اكتب ${n} أزواج أسئلة للعبة "السؤال الشاذ": سؤالين إجاباتهم من نفس النوع (رقم مع رقم، اسم مع اسم) عشان الشاذ يقدر يندس، لكن المعنى مختلف.
لا تكرر: ${avoid.join(' | ') || 'لا يوجد'}
الصيغة: [["السؤال الأصلي","السؤال الشاذ"],...]` }],
      maxTokens: 1500,
    });
    return extractJson<[string, string][]>(out).filter((p) => Array.isArray(p) && p.length === 2);
  },
  words: (theme: string) => async (n: number, avoid: string[]) => {
    const out = await claude({
      system: SYS,
      messages: [{ role: 'user', content:
        `اكتب ${n} كلمات جديدة (كلمة أو كلمتين) من تصنيف: ${theme}. معروفة لأي شخص في السعودية.
لا تكرر: ${avoid.join(' | ') || 'لا يوجد'}
الصيغة: ["كلمة",...]` }],
      maxTokens: 800,
    });
    return extractJson<string[]>(out).filter((w) => typeof w === 'string' && w.trim());
  },
};
