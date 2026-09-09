// 배치 수집기 검증 7항목. 사용: npm i -D playwright-core && node scripts/adlib/test/run-batch.mjs
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
let script = readFileSync(new URL('../batch-snippet.js', import.meta.url), 'utf8');
// 픽스처는 file:// 이라 페이지 이동을 못 한다 → 이동 대신 같은 페이지에서 q 만 바뀐 것으로 흉내
script = script.replace("if (curQ() !== q) { console.log(`[adlib] → ${st.idx + 1}/${st.queue.length} 「${q}」 로 이동`); location.href = urlFor(q); return; }",
  "if (curQ() !== q) { history.replaceState(null,'', location.pathname + '?q=' + encodeURIComponent(q)); }");
script = script.replace(/const KEYWORDS = \[[\s\S]*?\];/, "const KEYWORDS = ['구독','심리테스트','펫보험'];");
script = script.replace("betweenMs: [5000, 11000]", "betweenMs: [200, 400]");
const browser = await chromium.launch({ headless: true })  // 크로미움 경로가 다르면 executablePath 지정;
const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { const t = m.text(); if (t.includes('[adlib]')) { logs.push(t); console.log(t.replace(/%c/g,'').replace(/color:[^;]+;?[^ ]*/g,'')); } });
const downloads = [];
page.on('download', (d) => downloads.push(d));
await page.goto('file://' + fileURLToPath(new URL('./fixture.html', import.meta.url)) + '?q=%EA%B5%AC%EB%8F%85');
await page.evaluate(script);
// 3키워드 + 요약 = 다운로드 4건 기다림
for (let i = 0; i < 60 && downloads.length < 4; i++) await page.waitForTimeout(1000);
const names = [];
const parsed = [];
for (const d of downloads) parsed.push(JSON.parse(readFileSync(await d.path(), 'utf8')));
const kwFiles = parsed.filter((j) => j.meta && j.meta.q);
const summary = parsed.find((j) => j.done);
const a = [
  ['다운로드 4건(키워드3+요약1)', downloads.length === 4],
  ['키워드 파일 3건', kwFiles.length === 3],
  ['키워드 순서 구독→심리테스트→펫보험', kwFiles.map((j) => j.meta.q).join(',') === '구독,심리테스트,펫보험'],
  ['각 파일 카드 7장', kwFiles.every((j) => j.cards.length === 7)],
  ['요약에 3키워드 기록', summary && Object.keys(summary.done).length === 3],
  ['파싱 정상(광고주)', kwFiles[0].cards.some((c) => c.advertiser === 'TIGHT 사주')],
  ['배치 완료 로그', logs.some((l) => l.includes('배치 완료'))],
];
let f = 0;
for (const [n, ok] of a) { console.log((ok ? 'PASS ' : 'FAIL ') + n); if (!ok) f++; }
await browser.close();
process.exit(f ? 1 : 0);
