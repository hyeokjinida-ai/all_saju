#!/usr/bin/env node
// 수집 JSON(adlib_*.json) 집계 → 카테고리/키워드/광고주/착지/훅 랭킹 마크다운
// 사용: node scripts/adlib/rank.mjs <json폴더> [--date YYYY-MM-DD] [--out 보고서.md] [--long 90]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--')) || '.';
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const asOf = new Date(opt('--date', new Date().toISOString().slice(0, 10)));
const LONG_DAYS = parseInt(opt('--long', '90'), 10);
const outPath = opt('--out', join(dir, `보고서_${asOf.toISOString().slice(0, 10)}.md`));

const here = dirname(fileURLToPath(import.meta.url));
const catFit = {};
for (const f of ['keywords.json', 'keywords-commerce.json', 'keywords-v2.json']) {
  try {
    for (const c of JSON.parse(readFileSync(join(here, f), 'utf8')).categories) catFit[c.id] = { name: c.name, fit: c.fit };
  } catch { /* 세트가 없으면 건너뛴다 */ }
}

// ---------- 로드 ----------
const files = readdirSync(dir).filter((f) => /^adlib_.*\.json$/.test(f) && !/요약/.test(f));
if (!files.length) { console.error('adlib_*.json 이 없습니다:', dir); process.exit(1); }
const cards = [];
const kwMeta = {};
for (const f of files) {
  let j; try { j = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch (e) { console.error('skip', f, e.message); continue; }
  const m = j.meta || {};
  kwMeta[m.q] = m;
  for (const c of j.cards || []) cards.push({ ...c, q: m.q, cat: m.cat, tier: m.tier });
}
console.error(`파일 ${files.length} · 카드 ${cards.length}`);

// ---------- 유틸 ----------
const daysSince = (iso) => { const d = new Date(iso); return isNaN(d) ? null : Math.round((asOf - d) / 86400000); };
const median = (xs) => { const a = xs.filter((x) => Number.isFinite(x)).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : 0; };
const pct = (x) => (100 * x).toFixed(0) + '%';
const groupBy = (xs, f) => { const m = new Map(); for (const x of xs) { const k = f(x); if (k == null || k === '') continue; (m.get(k) || m.set(k, []).get(k)).push(x); } return m; };
const normAdv = (c) => (c.advertiser || '').replace(/\s+/g, ' ').trim();
const rankPct = (rows, key) => { const sorted = [...rows].map((r) => r[key]).sort((a, b) => a - b); return (v) => sorted.length > 1 ? sorted.findIndex((x) => x >= v) / (sorted.length - 1) : 1; };

// ---------- 키워드 지표 ----------
function metrics(list) {
  const adv = groupBy(list, normAdv);
  const advCounts = [...adv.values()].map((v) => v.length);
  const top1 = advCounts.length ? Math.max(...advCounts) / list.length : 0;
  const small = advCounts.filter((n) => n <= 2).length;
  const long = list.filter((c) => { const d = daysSince(c.start); return d != null && d >= LONG_DAYS; });
  const reuse = list.reduce((s, c) => s + (c.reuse || 1), 0);
  const withPrice = list.filter((c) => c.prices && c.prices.length);
  const lt = groupBy(list, (c) => c.landingType || 'fbpage');
  const share = (t) => (lt.get(t) || []).length / (list.length || 1);
  return {
    cards: list.length, advertisers: adv.size, top1, small_share: adv.size ? small / adv.size : 0,
    long: long.length, long_share: long.length / (list.length || 1), reuse, reuse_med: median(list.map((c) => c.reuse || 1)),
    site: share('site'), app: share('app'), fbpage: share('fbpage'), form: share('form'),
    video: list.filter((c) => c.media === 'video').length / (list.length || 1),
    partner: list.filter((c) => c.partner).length / (list.length || 1),
    priced: withPrice.length, price_med: median(withPrice.map((c) => Math.min(...c.prices))),
    oldest: list.map((c) => c.start).filter(Boolean).sort()[0] || '',
  };
}

const byKw = groupBy(cards, (c) => c.q);
const kwRows = [...byKw].map(([q, list]) => ({ q, cat: list[0].cat, catName: (catFit[list[0].cat] || {}).name || '', ...metrics(list) }));
{
  const P = { reuse: rankPct(kwRows, 'reuse'), long: rankPct(kwRows, 'long'), adv: rankPct(kwRows, 'advertisers'), small: rankPct(kwRows, 'small_share'), site: rankPct(kwRows, 'site') };
  for (const r of kwRows) {
    r.market = 100 * (0.30 * P.reuse(r.reuse) + 0.30 * P.long(r.long) + 0.15 * P.adv(r.advertisers) + 0.10 * P.small(r.small_share) + 0.15 * P.site(r.site));
    const f = (catFit[r.cat] || {}).fit || { build: 2, pg: 2, reg: 2 };
    r.fit = (f.build + f.pg + f.reg) / 9;
    r.score = r.market * (0.5 + 0.5 * r.fit);
  }
  kwRows.sort((a, b) => b.score - a.score);
}

// ---------- 카테고리 ----------
const byCat = groupBy(cards, (c) => c.cat);
const catRows = [...byCat].map(([cat, list]) => {
  const m = metrics(list);
  const ks = kwRows.filter((r) => r.cat === cat);
  return { cat, name: (catFit[cat] || {}).name || '', keywords: ks.length, ...m, score: ks.reduce((s, r) => s + r.score, 0) / (ks.length || 1), best: ks[0] ? ks[0].q : '' };
}).sort((a, b) => b.score - a.score);

// ---------- 광고주 ----------
const byAdv = groupBy(cards.filter((c) => normAdv(c)), normAdv);
const advRows = [...byAdv].map(([name, list]) => {
  const ids = new Set(list.map((c) => c.id));
  const uniq = [...new Map(list.map((c) => [c.id, c])).values()];
  const land = groupBy(uniq, (c) => c.landing);
  const topLand = [...land].sort((a, b) => b[1].length - a[1].length)[0];
  return {
    name, cards: uniq.length, ids: ids.size, reuse: uniq.reduce((s, c) => s + (c.reuse || 1), 0),
    long: uniq.filter((c) => { const d = daysSince(c.start); return d != null && d >= LONG_DAYS; }).length,
    oldest: uniq.map((c) => c.start).filter(Boolean).sort()[0] || '',
    keywords: [...new Set(list.map((c) => c.q))].slice(0, 6).join(', '),
    cats: [...new Set(list.map((c) => c.cat))].join(''),
    landing: topLand ? topLand[0] : '', hook: (uniq.sort((a, b) => (b.reuse || 1) - (a.reuse || 1))[0] || {}).hook || '',
  };
}).sort((a, b) => b.reuse - a.reuse || b.cards - a.cards);

// ---------- 착지 ----------
const byLand = groupBy(cards.filter((c) => c.landing), (c) => c.landing);
const landRows = [...byLand].map(([landing, list]) => {
  const uniq = [...new Map(list.map((c) => [c.id, c])).values()];
  return { landing, type: uniq[0].landingType, cards: uniq.length, reuse: uniq.reduce((s, c) => s + (c.reuse || 1), 0), advertisers: new Set(uniq.map(normAdv)).size, keywords: [...new Set(list.map((c) => c.q))].slice(0, 5).join(', '), price: median(uniq.flatMap((c) => c.prices && c.prices.length ? [Math.min(...c.prices)] : [])) };
}).sort((a, b) => b.reuse - a.reuse);

// ---------- 훅 ----------
const byHook = groupBy(cards.filter((c) => c.hook && c.hook.length > 6), (c) => c.hook);
const hookRows = [...byHook].map(([hook, list]) => {
  const uniq = [...new Map(list.map((c) => [c.id, c])).values()];
  return { hook, reuse: uniq.reduce((s, c) => s + (c.reuse || 1), 0), ads: uniq.length, advertiser: normAdv(uniq[0]), q: uniq[0].q, cat: uniq[0].cat, start: uniq.map((c) => c.start).filter(Boolean).sort()[0] || '' };
}).sort((a, b) => b.reuse - a.reuse);

// ---------- 출력 ----------
const esc = (s) => String(s ?? '').replace(/\|/g, '｜').replace(/\n/g, ' ');
const table = (heads, rows) => ['| ' + heads.join(' | ') + ' |', '|' + heads.map(() => '---').join('|') + '|', ...rows.map((r) => '| ' + r.map(esc).join(' | ') + ' |')].join('\n');
const d0 = asOf.toISOString().slice(0, 10);
const md = [];
md.push(`# 메타 광고 라이브러리 전카테고리 스윕 — 집계 보고서 (${d0})`, '');
md.push(`파일 ${files.length} · 키워드 ${byKw.size} · 카드 ${cards.length} · 광고주 ${byAdv.size} · 착지 ${byLand.size} · 장기집행 기준 ${LONG_DAYS}일+`, '');
md.push('> **점수식** market = 재집행합 30% + 장기집행 수 30% + 광고주 수 15% + 소규모 광고주 비율 10% + 사이트 직행 비율 15% (각 백분위) · score = market × (0.5 + 0.5 × 적합도). 적합도는 keywords.json 의 fit(build·pg·reg) 선입력값.', '');
md.push('## 1. 카테고리 랭킹', '');
md.push(table(['#', '카테고리', '키워드', '카드', '광고주', '장기집행', '재집행합', '사이트직행', '앱', '가격노출', '중간가', 'score', '1위 키워드'],
  catRows.map((r, i) => [i + 1, `${r.cat} ${r.name}`, r.keywords, r.cards, r.advertisers, r.long, r.reuse, pct(r.site), pct(r.app), r.priced, r.price_med || '', r.score.toFixed(1), r.best])), '');
md.push('## 2. 키워드 랭킹 (전체)', '');
md.push(table(['#', '키워드', '카테고리', '카드', '광고주', 'top1점유', '소규모비율', '장기집행', '재집행합', '재집행중앙', '사이트', '앱', 'FB페이지', '영상', '협업', '가격노출', '중간가', '최고령 시작', 'market', 'score'],
  kwRows.map((r, i) => [i + 1, r.q, r.cat, r.cards, r.advertisers, pct(r.top1), pct(r.small_share), r.long, r.reuse, r.reuse_med, pct(r.site), pct(r.app), pct(r.fbpage), pct(r.video), pct(r.partner), r.priced, r.price_med || '', r.oldest, r.market.toFixed(0), r.score.toFixed(1)])), '');
md.push('## 3. 광고주 랭킹 (재집행합 상위 60)', '');
md.push(table(['#', '광고주', '카드', '재집행합', '장기집행', '최고령 시작', '카테고리', '키워드', '대표 착지', '대표 훅'],
  advRows.slice(0, 60).map((r, i) => [i + 1, r.name, r.cards, r.reuse, r.long, r.oldest, r.cats, r.keywords, r.landing, r.hook.slice(0, 60)])), '');
md.push('## 4. 착지 랭킹 (재집행합 상위 60) — 진짜 「돈 버는 상품」 목록', '');
md.push(table(['#', '착지(host+path)', '유형', '카드', '재집행합', '광고주수', '키워드', '중간가'],
  landRows.slice(0, 60).map((r, i) => [i + 1, r.landing, r.type, r.cards, r.reuse, r.advertisers, r.keywords, r.price || ''])), '');
md.push('## 5. 위닝 훅 (재집행합 상위 50)', '');
md.push(table(['#', '재집행', '광고수', '광고주', '키워드', '게재시작', '훅'],
  hookRows.slice(0, 50).map((r, i) => [i + 1, r.reuse, r.ads, r.advertiser, r.q, r.start, r.hook.slice(0, 90)])), '');
md.push('## 6. 소규모 광고주가 장기 집행 중인 키워드 (진입 가능성 신호)', '');
md.push(table(['키워드', '카테고리', '광고주', '소규모비율', '장기집행', '사이트직행'],
  kwRows.filter((r) => r.advertisers >= 5 && r.small_share >= 0.5 && r.long >= 3).map((r) => [r.q, r.cat, r.advertisers, pct(r.small_share), r.long, pct(r.site)])), '');
md.push('## 7. 수집 품질', '');
md.push(table(['키워드', '카드', '빈카드', '더보기', '상한도달'], Object.values(kwMeta).map((m) => [m.q, m.cards, m.emptyCards ?? '', m.moreClicks ?? '', m.truncated ? '⚠' : ''])), '');
writeFileSync(outPath, md.join('\n'));
writeFileSync(outPath.replace(/\.md$/, '.json'), JSON.stringify({ asOf: d0, categories: catRows, keywords: kwRows, advertisers: advRows, landings: landRows, hooks: hookRows.slice(0, 200) }, null, 1));
console.error('→', outPath);
