// 콘솔 스니펫 파서 검증 13항목. 사용: npm i -D playwright-core && node scripts/adlib/test/run-snippet.mjs
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const script = readFileSync(new URL('../console-snippet.js', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true })  // 크로미움 경로가 다르면 executablePath 를 넣는다;
const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
page.on('console', (m) => { const t = m.text(); if (t.includes('[adlib]')) console.log(t); });
await page.goto('file://' + fileURLToPath(new URL('./fixture.html', import.meta.url)) + '?q=%EC%A0%84%EC%9E%90%EC%B1%85');
const [dl] = await Promise.all([
  page.waitForEvent('download', { timeout: 60000 }),
  page.evaluate(script),
]);
// 헤드리스 크로미움은 blob 다운로드의 suggestedFilename 을 보고하지 않는다.
// 스니펫이 만든 진짜 파일명은 window.__adlibName 으로 확인한다.
const realName = await page.evaluate(() => window.__adlibName);
const j = JSON.parse(readFileSync(await dl.path(), 'utf8'));
const byId = Object.fromEntries(j.cards.map((c) => [c.id, c]));
const a = [
  ['생성 파일명에 검색어', /전자책/.test(realName || '')],
  ['카드 7장', j.cards.length === 7],
  ['meta.q', j.meta.q === '전자책'],
  ['광고주', byId['1234567890001']?.advertiser === 'TIGHT 사주'],
  ['재집행 6', byId['1234567890001']?.reuse === 6],
  ['시작일', byId['1234567890001']?.start === '2026-04-15'],
  ['착지 query 제거', byId['1234567890001']?.landing === 'sajutight.me/mzmudang'],
  ['가격 2개', JSON.stringify(byId['1234567890001']?.prices) === '[63000,29900]'],
  ['할인 53', byId['1234567890001']?.discount === 53],
  ['협업 partner', byId['1234567890002']?.partner === 'tami_real_love'],
  ['협업 advertiser 브랜드', byId['1234567890002']?.advertiser === 'TIGHT 사주'],
  ['앱 착지', byId['1234567890003']?.landingType === 'app'],
  ['더보기 카드 990원', (byId['1234567890111']?.prices || [])[0] === 990],
];
let f = 0;
for (const [n, ok] of a) { console.log((ok ? 'PASS ' : 'FAIL ') + n); if (!ok) f++; }
await browser.close();
process.exit(f ? 1 : 0);
