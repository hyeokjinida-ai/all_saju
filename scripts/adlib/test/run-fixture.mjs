// 모사 광고 라이브러리 페이지로 수집기 파서 검증. 사용: npm i -D playwright-core && node scripts/adlib/test/run-fixture.mjs
// (크로미움 경로가 다르면 chromium.launch({ executablePath }) 를 지정)
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const script = readFileSync(new URL('../dist/adlib-sweep.user.js', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] });
const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.text().startsWith('[adlib]')) console.log(m.text()); });
await page.goto('file://' + fileURLToPath(new URL('./fixture.html', import.meta.url)) + '?q=%EC%82%AC%EC%A3%BC');
await page.addScriptTag({ content: script });
await page.waitForSelector('#mur-adlib-panel');
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#mur-one')]);
const path = await dl.path();
const j = JSON.parse(readFileSync(path, 'utf8'));
console.log('file:', dl.suggestedFilename());
console.log('meta:', JSON.stringify(j.meta));
for (const c of j.cards) console.log(JSON.stringify(c));
// 검증
const byId = Object.fromEntries(j.cards.map((c) => [c.id, c]));
const asserts = [
  ['카드 수 7 (3 + 더보기 2회×2)', j.cards.length === 7],
  ['광고주 TIGHT', byId['1234567890001']?.advertiser === 'TIGHT 사주'],
  ['재집행 6', byId['1234567890001']?.reuse === 6],
  ['시작일 2026-04-15', byId['1234567890001']?.start === '2026-04-15'],
  ['착지 sajutight.me/mzmudang (query 제거)', byId['1234567890001']?.landing === 'sajutight.me/mzmudang'],
  ['가격 63000,29900', JSON.stringify(byId['1234567890001']?.prices) === '[63000,29900]'],
  ['할인 53', byId['1234567890001']?.discount === 53],
  ['영상', byId['1234567890001']?.media === 'video'],
  ['훅', byId['1234567890001']?.hook === '소름끼치는 인생스포 사주'],
  ['CTA 더 알아보기', byId['1234567890001']?.cta === '더 알아보기'],
  ['협업 카드 partner=tami_real_love', byId['1234567890002']?.partner === 'tami_real_love'],
  ['협업 카드 advertiser=TIGHT 사주(합산용)', byId['1234567890002']?.advertiser === 'TIGHT 사주'],
  ['이미지 카드 media=image', byId['1234567890002']?.media === 'image'],
  ['협업 카드 FB페이지 착지', byId['1234567890002']?.landingType === 'fbpage'],
  ['앱 착지', byId['1234567890003']?.landingType === 'app'],
  ['여러 버전 플래그', byId['1234567890003']?.versions === true],
  ['더보기 카드 990원', (byId['1234567890111']?.prices || [])[0] === 990],
  ['더보기 카드 착지 eunha-saju.com/solo', byId['1234567890111']?.landing === 'eunha-saju.com/solo'],
];
let fail = 0;
for (const [n, ok] of asserts) { console.log((ok ? 'PASS ' : 'FAIL ') + n); if (!ok) fail++; }
await browser.close();
process.exit(fail ? 1 : 0);
