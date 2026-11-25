import type { GameEngine, Room } from '../types';
import { active, addScore } from '../types';
import { CRIME_CLUES, CRIME_MEANS, pickOne, shuffle } from '../content';
import { fx, finish, scoreboard } from './util';

const S = (r: Room) => r.state;
const HAND = 4;

// what each weapon says about the case, so the case file points at the truth
const MEANS_TRAITS: Record<string, { cause: string; feel: string }> = {
  'سكين مطبخ': { cause: 'نزيف', feel: 'غضب' }, 'حبل': { cause: 'اختناق', feel: 'مخطط لها' }, 'سم في القهوة': { cause: 'تسمم', feel: 'مخطط لها' },
  'مسدس': { cause: 'نزيف', feel: 'انتقام' }, 'مطرقة': { cause: 'ضربة قوية', feel: 'غضب' }, 'مخدة': { cause: 'اختناق', feel: 'صدفة' },
  'دلة ثقيلة': { cause: 'ضربة قوية', feel: 'صدفة' }, 'سيارة': { cause: 'حادث', feel: 'انتقام' }, 'كهرباء': { cause: 'حادث', feel: 'مخطط لها' },
  'مضرب جولف': { cause: 'ضربة قوية', feel: 'غضب' }, 'عصا': { cause: 'ضربة قوية', feel: 'غضب' }, 'زجاجة': { cause: 'نزيف', feel: 'صدفة' },
  'حجر': { cause: 'ضربة قوية', feel: 'صدفة' }, 'دواء': { cause: 'تسمم', feel: 'مخطط لها' }, 'مقص': { cause: 'نزيف', feel: 'غضب' },
  'وشاح': { cause: 'اختناق', feel: 'انتقام' }, 'ماء مغلي': { cause: 'حادث', feel: 'غضب' }, 'سلك شاحن': { cause: 'اختناق', feel: 'صدفة' },
  'كرسي': { cause: 'ضربة قوية', feel: 'غضب' }, 'غاز': { cause: 'تسمم', feel: 'مخطط لها' },
};
const CLUE_TRAITS: Record<string, string> = {
  'بصمة إصبع': 'أثر شخصي', 'شعرة': 'أثر شخصي', 'فنجال مكسور': 'شي من المكان', 'تذكرة مواقف': 'ورق', 'رسالة واتساب': 'تقنية',
  'عطر عود': 'رائحة', 'طين على الأرض': 'شي من برا', 'زر قميص': 'لبس', 'إيصال مطعم': 'ورق', 'ساعة واقفة': 'وقت',
  'أثر حذاء': 'شي من برا', 'منديل': 'أثر شخصي', 'مفتاح سيارة': 'شي مفقود', 'كاميرا مراقبة': 'تقنية', 'شماغ': 'لبس',
  'قطعة تمر': 'أكل', 'رمل': 'شي من برا', 'شمعة': 'شي من المكان', 'سماعة': 'تقنية', 'صورة ممزقة': 'ورق',
};
const CAUSES = ['نزيف', 'اختناق', 'تسمم', 'ضربة قوية', 'حادث'];
const FEELS = ['مخطط لها', 'صدفة', 'غضب', 'انتقام'];
const CLUE_KINDS = [...new Set(Object.values(CLUE_TRAITS))];
const PLACES = ['البيت', 'الاستراحة', 'المكتب', 'البر', 'المواقف'];
const TIMES = ['الفجر', 'الظهر', 'المغرب', 'نص الليل'];

function caseFile(means: string, clue: string) {
  return [
    { title: 'سبب الوفاة', options: CAUSES, pick: MEANS_TRAITS[means]?.cause },
    { title: 'نوع الدليل', options: shuffle(CLUE_KINDS).filter((k) => k !== CLUE_TRAITS[clue]).slice(0, 4).concat(CLUE_TRAITS[clue]).sort(), pick: CLUE_TRAITS[clue] },
    { title: 'انطباع عام', options: FEELS, pick: MEANS_TRAITS[means]?.feel },
    { title: 'المكان', options: PLACES, pick: pickOne(PLACES) },
    { title: 'الوقت', options: TIMES, pick: pickOne(TIMES) },
  ];
}

function hunt(room: Room) {
  const s = S(room);
  s.stage = s.witness ? 'hunt' : 'over';
  if (!s.witness) conclude(room, true);
}

function conclude(room: Room, detectivesWin: boolean) {
  const s = S(room);
  s.stage = 'over';
  s.detectivesWin = detectivesWin;
  for (const p of room.players) {
    if (p.id === s.killer) { if (!detectivesWin) addScore(room, p.id, 3); }
    else if (detectivesWin) addScore(room, p.id, 2);
  }
  fx(room, detectivesWin ? 'steal' : 'stealFail');
}

export const crime: GameEngine = {
  start(room) {
    room.state = { round: 0, fx: { n: 0 } };
    return this.act(room, room.hostId, { type: 'deal' }, true) as any;
  },

  act(room, pid, a, isHost) {
    const s = S(room);
    switch (a.type) {
      case 'deal': {
        if (!isHost || (s.round && s.stage !== 'over')) return;
        const players = active(room);
        const order = shuffle(players.map((p) => p.id));
        const means = shuffle(CRIME_MEANS), clues = shuffle(CRIME_CLUES);
        const hands: Record<string, { means: string[]; clues: string[] }> = {};
        players.forEach((p, i) => {
          hands[p.id] = { means: means.slice((i * HAND) % means.length, (i * HAND) % means.length + HAND), clues: clues.slice((i * HAND) % clues.length, (i * HAND) % clues.length + HAND) };
        });
        Object.assign(s, {
          round: s.round + 1, stage: 'killerPick', hands,
          killer: order[0], witness: players.length >= 5 ? order[1] : null,
          lead: order[players.length >= 5 ? 2 : 1],
          chosen: null, file: null, accusation: null, correct: null, hunted: null, detectivesWin: null,
        });
        fx(room, 'round');
        return;
      }
      case 'pick': {
        if (s.stage !== 'killerPick' || pid !== s.killer) return;
        const h = s.hands[pid];
        if (!h.means.includes(a.means) || !h.clues.includes(a.clue)) return 'اختار سلاح ودليل من أوراقك.';
        s.chosen = { means: a.means, clue: a.clue };
        s.file = caseFile(a.means, a.clue);
        s.stage = 'investigate';
        fx(room, 'bell');
        return;
      }
      case 'accuse': {
        if (s.stage !== 'investigate' || !(pid === s.lead || isHost)) return;
        const h = s.hands[a.suspect];
        if (!h || !h.means.includes(a.means) || !h.clues.includes(a.clue)) return 'الاتهام لازم يكون: لاعب + سلاح من أوراقه + دليل من أوراقه.';
        s.accusation = { suspect: a.suspect, means: a.means, clue: a.clue };
        s.correct = a.suspect === s.killer && a.means === s.chosen.means && a.clue === s.chosen.clue;
        if (s.correct) { fx(room, 'ding'); hunt(room); }
        else conclude(room, false);
        return;
      }
      case 'hunt': {
        if (s.stage !== 'hunt' || pid !== s.killer || a.target === s.killer) return;
        s.hunted = a.target;
        conclude(room, a.target !== s.witness);
        return;
      }
      case 'end': {
        if (isHost) finish(room);
        return;
      }
    }
  },

  view(room, viewer, isHost) {
    const s = S(room);
    const over = s.stage === 'over';
    const role = !viewer ? null : viewer === s.killer ? 'killer' : viewer === s.witness ? 'witness' : 'detective';
    return {
      stage: s.stage, round: s.round, fx: s.fx, isHost,
      role, lead: s.lead, witnessExists: !!s.witness,
      hands: s.hands,
      // the witness knows who did it, the killer knows their own pick
      knows: role === 'witness' ? { killer: s.killer } : role === 'killer' ? { chosen: s.chosen } : null,
      file: s.file,
      accusation: s.accusation, correct: s.correct, hunted: s.hunted, detectivesWin: s.detectivesWin,
      truth: over ? { killer: s.killer, witness: s.witness, chosen: s.chosen } : null,
      leaderboard: scoreboard(room),
    };
  },
};
