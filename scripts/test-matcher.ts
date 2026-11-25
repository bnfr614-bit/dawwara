import { localMatch, startsWithLetter, sameAnswer } from '../server/matcher';

const cases: [string, string, boolean][] = [
  ['مويه', 'ماء', true], ['موية', 'الموية', true], ['الكبسه', 'كبسة', true], ['كبسسسه', 'كبسة', true],
  ['قهوه', 'القهوة', true], ['الجوال', 'تلفون', true], ['زيارة اهل', 'زيارة الأهل', true], ['الأهل', 'زيارة الأهل', true],
  ['السياره خربانه', 'السيارة خربت', true], ['واتس', 'واتساب', true], ['شاهي', 'الشاي', true],
  ['نوم', 'الزحمة', false], ['فطور', 'القهوة', false], ['شاي', 'شواية', false],
];
let fail = 0;
for (const [g, a, want] of cases) {
  const got = localMatch(g, a);
  if (got !== want) fail++;
  console.log(got === want ? 'ok  ' : 'FAIL', g, '|', a, '=>', got);
}
const extra = [startsWithLetter('أسد', 'أ'), startsWithLetter('اسامة', 'أ'), startsWithLetter('مصر', 'م'), !startsWithLetter('بقرة', 'م'), sameAnswer('محمد', 'محمّد')];
console.log('letters/dups', extra);
process.exit(fail || extra.includes(false) ? 1 : 0);
