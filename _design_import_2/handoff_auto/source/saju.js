// 명운록 — 사주(四柱) 계산 helpers
// 데모용 단순화 계산. 정확한 만세력은 아니지만, 시각 디자인을 위한 안정적 출력을 제공.

const STEMS = ['갑','을','병','정','무','기','경','신','임','계'];
const STEMS_H = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const BRANCHES_H = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const ZODIAC = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'];

// 천간 오행 + 음양
const STEM_ELEMENT = ['목','목','화','화','토','토','금','금','수','수'];
const STEM_YIN     = [ '양','음','양','음','양','음','양','음','양','음'];

// 지지 오행
const BRANCH_ELEMENT = ['수','토','목','목','토','화','화','토','금','금','토','수'];
const BRANCH_YIN     = ['양','음','양','음','양','음','양','음','양','음','양','음'];
const BRANCH_HOURS   = [ // 자: 23-01, 축: 01-03, ...
  '23:00 — 01:00','01:00 — 03:00','03:00 — 05:00','05:00 — 07:00',
  '07:00 — 09:00','09:00 — 11:00','11:00 — 13:00','13:00 — 15:00',
  '15:00 — 17:00','17:00 — 19:00','19:00 — 21:00','21:00 — 23:00',
];

const ELEMENT_HANJA = { 목:'木', 화:'火', 토:'土', 금:'金', 수:'水' };
const ELEMENT_KO    = { 목:'나무', 화:'불', 토:'흙', 금:'쇠', 수:'물' };
const ELEMENT_COLOR = {
  목: 'var(--o-wood)',
  화: 'var(--o-fire)',
  토: 'var(--o-earth)',
  금: 'var(--o-metal)',
  수: 'var(--o-water)',
};

// ──────────────────────────────────────────────────────
// Year pillar — (year - 4) mod 10/12
function yearPillar(y) {
  const s = ((y - 4) % 10 + 10) % 10;
  const b = ((y - 4) % 12 + 12) % 12;
  return { s, b };
}

// Month pillar — 오호둔(五虎遁) 룰. 寅月 = Feb start.
// 월지(branch): 입춘부터 寅, 음력근사. 데모용 양력 month 기준.
function monthPillar(year, month, yearStem) {
  // month branch: Feb→寅(2), Mar→卯(3), ..., Dec→子(0), Jan→丑(1)
  const branch = (month + 1) % 12; // Jan(1)→2(인?), 보정 필요. 다음으로 fix:
  // Jan→丑(1), Feb→寅(2), Mar→卯(3), Apr→辰(4), May→巳(5), Jun→午(6),
  // Jul→未(7), Aug→申(8), Sep→酉(9), Oct→戌(10), Nov→亥(11), Dec→子(0)
  const map = [1,2,3,4,5,6,7,8,9,10,11,0]; // index = month-1
  const b = map[month - 1];
  // 월간(stem): 오호둔
  // 甲己년 → 丙寅 시작 / 乙庚 → 戊寅 / 丙辛 → 庚寅 / 丁壬 → 壬寅 / 戊癸 → 甲寅
  const startStem = [[0,5,2],[1,6,4],[2,7,6],[3,8,8],[4,9,0]];
  let firstStem = 0;
  for (const row of startStem) if (row[0] === yearStem || row[1] === yearStem) firstStem = row[2];
  // 寅(b=2)부터 시작. branch에서 寅까지 거리만큼 더함.
  const offset = (b - 2 + 12) % 12;
  const s = (firstStem + offset) % 10;
  return { s, b };
}

// Day pillar — Julian day approximation.
// 기준: 1900-01-01 = 甲戌日 (정확치는 아니지만 데모 일관성)
function dayPillar(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day));
  const ref = new Date(Date.UTC(1900, 0, 1));
  const dayDiff = Math.floor((d - ref) / 86400000);
  // 기준일 갑술(s=0, b=10) 가정
  const s = ((dayDiff) % 10 + 10) % 10;
  const b = ((dayDiff + 10) % 12 + 12) % 12;
  return { s, b };
}

// Hour pillar — branch by hour, stem by 일간(day stem) using 오서둔(五鼠遁)
function hourPillar(hour, dayStem) {
  // hour 23→자(0), 0→자(0), 1-2→축(1), 3-4→인(2)...
  let b;
  if (hour === 23 || hour === 0) b = 0;
  else b = Math.floor((hour + 1) / 2) % 12;
  // 오서둔: 甲己日 → 甲子시 / 乙庚 → 丙子 / 丙辛 → 戊子 / 丁壬 → 庚子 / 戊癸 → 壬子
  const startMap = [[0,5,0],[1,6,2],[2,7,4],[3,8,6],[4,9,8]];
  let firstStem = 0;
  for (const row of startMap) if (row[0] === dayStem || row[1] === dayStem) firstStem = row[2];
  const s = (firstStem + b) % 10;
  return { s, b };
}

// Compose pillar object
function makePillar(idx) {
  return {
    stem: STEMS[idx.s],
    stemH: STEMS_H[idx.s],
    branch: BRANCHES[idx.b],
    branchH: BRANCHES_H[idx.b],
    stemElement: STEM_ELEMENT[idx.s],
    stemElementH: ELEMENT_HANJA[STEM_ELEMENT[idx.s]],
    branchElement: BRANCH_ELEMENT[idx.b],
    branchElementH: ELEMENT_HANJA[BRANCH_ELEMENT[idx.b]],
    stemYin: STEM_YIN[idx.s],
    branchYin: BRANCH_YIN[idx.b],
    zodiac: ZODIAC[idx.b],
    hourRange: BRANCH_HOURS[idx.b],
    sIdx: idx.s, bIdx: idx.b,
  };
}

function computeSaju({ year, month, day, hour, minute = 0, gender = '여', name = '' }) {
  const yr = yearPillar(year);
  const mo = monthPillar(year, month, yr.s);
  const dy = dayPillar(year, month, day);
  const hr = hourPillar(hour, dy.s);

  const pillars = {
    year:  makePillar(yr),
    month: makePillar(mo),
    day:   makePillar(dy),
    hour:  makePillar(hr),
  };

  // 오행 분포
  const counts = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  ['year','month','day','hour'].forEach(k => {
    counts[pillars[k].stemElement]++;
    counts[pillars[k].branchElement]++;
  });

  return {
    input: { year, month, day, hour, minute, gender, name },
    pillars,
    counts,
    日柱: pillars.day,    // 일주 (자기 자신)
    日干: pillars.day.stem, // 일간
    日干H: pillars.day.stemH,
  };
}

window.SajuLib = {
  STEMS, STEMS_H, BRANCHES, BRANCHES_H, ZODIAC,
  STEM_ELEMENT, BRANCH_ELEMENT, ELEMENT_HANJA, ELEMENT_KO, ELEMENT_COLOR,
  computeSaju,
};
