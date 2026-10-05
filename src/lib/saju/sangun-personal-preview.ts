import { buildTeaser } from './teaser';
import { buildResultView } from './result-view';
import { computeDaeunTimeline, ganjiToMyeongsik, type SajuAnalysisResponse } from './saju-api';
import detailCopy from './sangun-detail-copy.json';

function spokenReading(line: string): string {
  const approved = (detailCopy as Record<string, string>)[line];
  if (approved) return approved;
  return line
    .replace(/^(\d{4})년 어름에 네 판이 한 번 통째로 바뀌었다\. 그때 옮긴 자리가 지금 자리다\.$/, '$1년 무렵, 익숙했던 생활이 달라지지 않았느냐. 곁에 두는 사람이나 네가 머무는 자리를 다시 정해야 했을 때로 읽힌다.')
    .replace(/^(\d{4})년, 너는 하나를 끊어냈다\. 사람이든 자리든 — 오래 끌던 것이었다\.$/, '$1년, 이대로 이어가도 될까 싶었던 일이 있느냐. 가까운 관계든 맡은 일이든, 더 붙들지 놓아줄지 고민했을 때로 읽힌다.')
    .replace(/^(\d{4})년이 네게 제일 무거웠다\. 그해에 버틴 것으로 지금까지 온 것이다\.$/, '$1년, 해야 할 일에 비해 기댈 곳은 적게 느껴지지 않았느냐. 남들이 보는 것보다 네 속이 무거웠을 때로 읽힌다.');
}

export type PreviewProfile = {
  name: string; birthDate: string; birthTime?: string | null; timeUnknown: boolean;
  gender: 'male' | 'female'; calendar: 'solar' | 'lunar'; partnerSex?: 'male' | 'female';
};

// This adapter consumes the same calculations as /api/saju/chart. It does not
// compute a second horoscope or treat the relationship peak year as a daeun.
export function buildSangunPersonalPreview(analysis: SajuAnalysisResponse, profile: PreviewProfile) {
  // The input flow also permits leaving the clock blank without checking
  // "unknown". Match the chart API, which omits the hour in both cases.
  profile = { ...profile, timeUnknown: profile.timeUnknown || !profile.birthTime };
  const myeongsik = ganjiToMyeongsik(analysis);
  if (!myeongsik) throw new Error('명식을 확인하지 못했습니다.');
  const view = buildResultView({myeongsik, rawAnalysis: analysis, name: profile.name,
    birthDate: profile.birthDate, birthTime: profile.timeUnknown ? null : profile.birthTime ?? null,
    timeUnknown: profile.timeUnknown, gender: profile.gender, calendar: profile.calendar,
    concerns: [], showScores: true, showDaeun: false});
  const teaser = buildTeaser(analysis, profile.gender, 'sangun', profile.partnerSex);
  if (!teaser) throw new Error('개인화 풀이를 확인하지 못했습니다.');
  const timeline = computeDaeunTimeline(analysis);
  const next = timeline.find(row => row.when === 'future' && /^\d{4}~\d{4}$/.test(row.years));
  const followLines: Record<string, string> = {
    '내 힘과 사람이 붙는 때': '스스로 해내는 힘과\n사람들과의 관계가 중요해지는 때다.',
    '말·재주·일 벌임이 커지는 때': '네 재주를 꺼내 쓰고,\n새로운 일을 벌이는 때구나.',
    '돈과 현실이 손에 잡히는 때': '해온 일에서 성과를 내고,\n돈을 챙겨야 할 때구나.',
    '자리·책임·이름이 붙는 때': '맡는 일이 커지고,\n책임도 늘어나는 때구나.',
    '배움·문서·귀인이 드는 때': '공부와 자격을 쌓고,\n도움을 받을 사람을 만나는 때구나.',
  };
  const cause = next?.line.split(' — ')[0] ?? '';
  const cols = view.pillars.slice().reverse().filter(p => p.gan.char !== '?').map(p => {
    const pos = p.isDay ? '나' : /년|연|해/.test(p.label) ? '해' : /월|달/.test(p.label) ? '달' : '시';
    const row = teaser.chartRows.find(r => r.pos === pos);
    return {...p, pos, ganSip: row?.ganSip ?? '', jiSip: row?.jiSip ?? '', fortune: row?.fortune ?? ''};
  });
  const face = teaser.partnerFace;
  return {
    profile: {...profile, name: profile.name.trim()},
    chart: {columns: cols, elements: view.ohaeng, sinsal: teaser.sinsal},
    reading: {lines: teaser.coldRead.map(spokenReading), pastYear: teaser.pastYear, hasPastCheck: teaser.hasPastCheck, judgeInvite: teaser.judgeInvite},
    nextDaeun: next ? {year: Number(next.years.split('~')[0]), range: next.range, ganji: next.ganji,
      follow: followLines[cause] ?? '앞으로 달라지는 흐름을\n네 사주에서 살펴보마.',
      caution: ['조심','무거움'].includes(next.favor) ? '한꺼번에 일을 늘리기보다,\n지금 맡은 일부터 챙겨라.' : null} : null,
    turningYear: teaser.turningYear,
    // Only the already-open portions go to this unpaid preview.
    partner: face ? {src: face.src, legacySrc: face.legacySrc, lookOpen: face.lookOpen,
      ageDir: (face as unknown as {ageDir?: string}).ageDir ?? ({elder:'연상 쪽',same:'비슷한 나이',younger:'연하 쪽'}[face.age]), ohKo: face.ohKo} : null,
    chapters: teaser.chapters,
    locked: teaser.locked,
  };
}
