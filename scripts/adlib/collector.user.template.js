// ==UserScript==
// @name         명운록 · 메타 광고 라이브러리 전카테고리 스윕
// @namespace    myeongunrok.adlib
// @version      0.1.0
// @description  키워드 큐를 돌며 광고 라이브러리 카드를 전량 로드·파싱해 키워드별 JSON으로 내려받는다 (Tampermonkey)
// @match        https://www.facebook.com/ads/library/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * 사용법: scripts/adlib/README.md
 * 근거: 00_메타광고_업체랭킹.md §수집 방법 / 00_소재에서상품까지_연결지도.md §9
 *  - 라이브러리는 무한스크롤이 아니라 「더 보기」 버튼. setInterval 로 반복 클릭.
 *  - 착지 URL 은 l.facebook.com/l.php?u= 를 디코드해 host+pathname 만 남긴다 (query 금지).
 *  - 카드 5% 정도는 가상 스크롤로 본문이 비어 나온다. 오차로 안고 간다.
 */
(function () {
  'use strict';

  // build.mjs 가 keywords.json 에서 채운다: [{q, cat, catName, tier}, ...]
  const KEYWORDS = /*__KEYWORDS__*/[];

  const KEY = 'MUR_ADLIB_SWEEP';
  const DEFAULT_CFG = {
    maxCards: 450,      // 키워드당 상한 (기존 3차 수집이 452장)
    maxMore: 15,        // 「더 보기」 최대 클릭
    tickMs: 900,        // 클릭 간격
    idleTicks: 10,      // 새 카드가 안 늘면 이만큼 기다렸다 종료 (≈9초)
    firstWaitMs: 20000, // 첫 카드 대기 상한
    betweenKwMs: [4000, 9000], // 키워드 사이 대기 (랜덤)
    tiers: [1],
  };

  // ---------- 상태 ----------
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const save = (s) => localStorage.setItem(KEY, JSON.stringify(s));
  let state = load() || { running: false, idx: 0, queue: [], results: {}, cfg: DEFAULT_CFG, log: [] };
  state.cfg = Object.assign({}, DEFAULT_CFG, state.cfg || {});

  const log = (m) => {
    const line = `${new Date().toLocaleTimeString()} ${m}`;
    state.log = (state.log || []).concat(line).slice(-60);
    save(state);
    render();
    console.log('[adlib]', m);
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = ([a, b]) => a + Math.floor(Math.random() * (b - a));

  // ---------- URL ----------
  function buildUrl(q) {
    const p = new URLSearchParams({
      active_status: 'active', ad_type: 'all', country: 'KR', is_targeted_country: 'false',
      media_type: 'all', q, search_type: 'keyword_unordered',
      'sort_data[direction]': 'desc', 'sort_data[mode]': 'total_impressions',
    });
    return 'https://www.facebook.com/ads/library/?' + p.toString();
  }
  const currentQ = () => new URL(location.href).searchParams.get('q');

  // ---------- 파싱 ----------
  const RE_LIB = /(?:라이브러리|Library) ID:?\s*(\d{6,})/;
  const RE_LIB_G = /(?:라이브러리|Library) ID/g;
  const RE_START = /(?:게재 시작일|Started running on)[:\s]*([^\n]+)/;
  const RE_REUSE = /광고\s*(\d+)개에서 이 크리에이티브|(\d+)\s*ads? use this creative/;
  const RE_PARTNER = /함께합니다|is with|와\(과\) 함께|과\(와\) 함께/;
  const RE_SPONSOR = /^(후원|Sponsored)$/;
  const RE_CTA = /^(더 알아보기|지금 구매하기|구매하기|가입하기|지금 신청하기|신청하기|앱 설치|앱 다운로드|다운로드|자세히 알아보기|메시지 보내기|지금 예약하기|지금 문의하기|문의하기|더 보기|보기|참여하기|구독하기|시작하기|Learn more|Shop now|Sign up|Install now|Download|Book now|Send message|Apply now|Get offer|Subscribe|Watch more|Contact us|Get quote|Play game|Order now)$/i;
  const RE_DOMAINLINE = /^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i;
  const RE_PRICE = /(\d{1,3}(?:,\d{3})+|\d{3,7})\s*원/g;
  const RE_DISC = /(\d{2,3})\s*%\s*(할인|off|OFF)/;
  const META_LINE = /^(활성|Active|비활성|Inactive|플랫폼|Platforms|광고 세부 정보 보기|See ad details|이 광고에는 여러 버전이 있습니다|This ad has multiple versions|카테고리|Categories|광고 요약 보기|See summary details)$/;

  function parseKoDate(s) {
    if (!s) return null;
    let m = s.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    const d = new Date(s);
    return isNaN(d) ? s.trim() : d.toISOString().slice(0, 10);
  }
  const countLib = (el) => (el.textContent.match(RE_LIB_G) || []).length;

  function cardRoots() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const roots = new Map();
    let n;
    while ((n = walker.nextNode())) {
      if (!RE_LIB.test(n.nodeValue || '')) continue;
      let el = n.parentElement;
      let hops = 0;
      while (el.parentElement && hops < 30) {
        const p = el.parentElement;
        if (p === document.body || p.getAttribute('role') === 'main' || countLib(p) > 1) break;
        el = p; hops++;
      }
      const id = (el.textContent.match(RE_LIB) || [])[1];
      if (id && !roots.has(id)) roots.set(id, el);
    }
    return roots;
  }

  function landingOf(el) {
    for (const a of el.querySelectorAll('a[href]')) {
      let u; try { u = new URL(a.href, location.origin); } catch { continue; }
      let target = null;
      if (/l\.facebook\.com$/.test(u.host)) {
        const inner = u.searchParams.get('u');
        if (inner) { try { target = new URL(decodeURIComponent(inner)); } catch { /* skip */ } }
      } else if (!/facebook\.com$|fb\.com$|fb\.me$|facebook\.net$/.test(u.host)) {
        target = u;
      }
      if (!target) continue;
      const host = target.host.replace(/^www\./, '');
      const path = target.pathname.replace(/\/$/, '');
      let type = 'site';
      if (/play\.google\.com|apps\.apple\.com|onelink\.me|app\.link/.test(host)) type = 'app';
      else if (/forms\.gle|docs\.google\.com|tally\.so|typeform|smore/.test(host + path)) type = 'form';
      else if (/instagram\.com/.test(host)) type = 'instagram';
      else if (/kakao|pf\.kakao|open\.kakao/.test(host)) type = 'kakao';
      return { landing: host + path, landingType: type };
    }
    return { landing: '', landingType: 'fbpage' };
  }

  function parseCard(el, id) {
    const raw = el.innerText || '';
    const text = raw.replace(/https?:\/\/\S+/g, '');
    const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
    const startRaw = (text.match(RE_START) || [])[1] || '';
    const reuseM = text.match(RE_REUSE);
    const sponsorIdx = lines.findIndex((l) => RE_SPONSOR.test(l));
    let advertiser = sponsorIdx > 0 ? lines[sponsorIdx - 1] : '';
    if (!advertiser) {
      const a = [...el.querySelectorAll('a[href]')].find((x) => /facebook\.com\/(?!ads\/library)[^/?]+/.test(x.href) && (x.innerText || '').trim());
      advertiser = a ? a.innerText.trim() : '';
    }
    const partnerLine = lines.find((l) => RE_PARTNER.test(l)) || '';
    // 협업 카드: 「tami_real_love 페이지는 TIGHT 사주과(와) 함께합니다」 → advertiser=브랜드, partner=작가 계정
    let partner = '';
    const pm = partnerLine.match(/^(.+?)\s*(?:페이지는|님은|은|는)\s+(.+?)\s*(?:과\(와\)|와\(과\)|과|와)\s*함께합니다/) || partnerLine.match(/^(.+?)\s+is with\s+(.+)$/i);
    if (pm) { partner = pm[1].trim(); if (!advertiser || RE_PARTNER.test(advertiser)) advertiser = pm[2].trim(); }
    else if (partnerLine) partner = partnerLine.slice(0, 120);
    const body = [];
    let cta = '';
    for (let i = sponsorIdx + 1; i < lines.length && sponsorIdx >= 0; i++) {
      const l = lines[i];
      if (RE_CTA.test(l)) { cta = l; break; }
      if (RE_DOMAINLINE.test(l) && l.length < 60) break;
      if (META_LINE.test(l)) continue;
      body.push(l);
    }
    if (!cta) cta = (lines.find((l) => RE_CTA.test(l)) || '');
    const bodyText = body.join(' / ');
    const prices = [...new Set([...text.matchAll(RE_PRICE)].map((m) => parseInt(m[1].replace(/,/g, ''), 10)).filter((n) => n >= 500 && n <= 5000000))].slice(0, 5);
    const disc = (text.match(RE_DISC) || [])[1];
    const hasVideo = !!el.querySelector('video');
    const bigImg = [...el.querySelectorAll('img')].some((im) => Math.max(im.naturalWidth || 0, im.width || 0, im.clientWidth || 0) > 200);
    return {
      id,
      advertiser,
      partner,
      start: parseKoDate(startRaw),
      reuse: reuseM ? parseInt(reuseM[1] || reuseM[2], 10) : 1,
      versions: /여러 버전|multiple versions/.test(text),
      hook: (body[0] || '').slice(0, 140),
      text: bodyText.slice(0, 600),
      cta,
      media: hasVideo ? 'video' : bigImg ? 'image' : 'unknown',
      prices,
      discount: disc ? parseInt(disc, 10) : null,
      ...landingOf(el),
      empty: !advertiser && !body.length,
    };
  }

  function findMore() {
    return [...document.querySelectorAll('div[role="button"],button,a')]
      .find((e) => /^(더 보기|더보기|See more|Load more|결과 더 보기)/i.test((e.innerText || '').trim()) && e.offsetParent !== null);
  }
  const noResults = () => /결과 없음|결과가 없습니다|No ads match|검색 결과가 없|No results/.test(document.body.innerText || '');
  const rateLimited = () => /잠시 후 다시 시도|일시적으로 차단|rate limit|too many requests|문제가 발생했습니다/i.test(document.body.innerText || '');

  async function collect(kw) {
    const cfg = state.cfg;
    const t0 = Date.now();
    while (Date.now() - t0 < cfg.firstWaitMs) {
      if (cardRoots().size > 0) break;
      if (noResults()) break;
      await sleep(500);
    }
    let clicks = 0, idle = 0, last = 0;
    while (true) {
      const n = cardRoots().size;
      if (n >= cfg.maxCards) break;
      if (n > last) { last = n; idle = 0; } else idle++;
      const b = findMore();
      if (b && clicks < cfg.maxMore) { b.click(); clicks++; idle = 0; }
      window.scrollTo(0, document.body.scrollHeight);
      if (idle >= cfg.idleTicks) break;
      if (!b && clicks >= cfg.maxMore) break;
      setStatus(`${kw.q} · 카드 ${n} · 더보기 ${clicks}`);
      await sleep(cfg.tickMs);
    }
    // 언로드된 카드 복구 시도: 위로 천천히 스크롤
    for (let y = document.body.scrollHeight; y > 0; y -= 1500) { window.scrollTo(0, y); await sleep(120); }
    const roots = cardRoots();
    const cards = [];
    for (const [id, el] of roots) { try { cards.push(parseCard(el, id)); } catch (e) { cards.push({ id, error: String(e) }); } }
    return { cards, clicks, truncated: roots.size >= cfg.maxCards };
  }

  function download(name, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  const safe = (s) => s.replace(/[^\p{L}\p{N}_-]+/gu, '_');

  // ---------- 드라이버 ----------
  async function step() {
    if (!state.running) return;
    const cur = state.queue[state.idx];
    if (!cur) {
      state.running = false; save(state);
      download(`adlib_요약_${new Date().toISOString().slice(0, 10)}.json`, { results: state.results, queue: state.queue, cfg: state.cfg });
      log('✅ 큐 완료. 요약 JSON 내려받음.');
      return;
    }
    if (rateLimited()) { log('⚠ 속도 제한 감지 — 90초 대기 후 새로고침'); await sleep(90000); location.reload(); return; }
    if (currentQ() !== cur.q) { log(`→ ${state.idx + 1}/${state.queue.length} ${cur.q}`); location.href = buildUrl(cur.q); return; }
    const { cards, clicks, truncated } = await collect(cur);
    const date = new Date().toISOString().slice(0, 10);
    const file = `adlib_${cur.cat}_${safe(cur.q)}_${date}.json`;
    download(file, { meta: { q: cur.q, cat: cur.cat, catName: cur.catName, tier: cur.tier, collectedAt: new Date().toISOString(), url: location.href, cards: cards.length, moreClicks: clicks, truncated, emptyCards: cards.filter((c) => c.empty).length }, cards });
    state.results[cur.q] = { n: cards.length, file, at: date };
    state.idx++; save(state);
    log(`✔ ${cur.q}: ${cards.length}장 (빈 카드 ${cards.filter((c) => c.empty).length}) → ${file}`);
    await sleep(rand(state.cfg.betweenKwMs));
    if (state.running) step();
  }

  // ---------- 패널 ----------
  let panel, statusEl, logEl;
  function setStatus(s) { if (statusEl) statusEl.textContent = s; }
  function render() {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'mur-adlib-panel';
      panel.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;width:340px;background:#1b1b1f;color:#eee;font:12px/1.5 system-ui,sans-serif;border:1px solid #555;border-radius:10px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,.5)';
      document.body.appendChild(panel);
    }
    const done = Object.keys(state.results).length;
    const cur = state.queue[state.idx];
    panel.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px">명운록 · 광고 라이브러리 스윕 <span style="float:right;opacity:.6">v0.1</span></div>
      <div id="mur-status" style="color:#ffd27a;min-height:18px">${state.running ? `실행 중 · ${cur ? cur.q : '-'}` : '대기'}</div>
      <div style="margin:4px 0">진행 ${done}/${state.queue.length || KEYWORDS.length} · 큐 ${state.idx}</div>
      <div style="margin:6px 0">
        <label><input type="checkbox" id="mur-t1" ${state.cfg.tiers.includes(1) ? 'checked' : ''}> tier1(${KEYWORDS.filter((k) => k.tier === 1).length})</label>
        <label style="margin-left:8px"><input type="checkbox" id="mur-t2" ${state.cfg.tiers.includes(2) ? 'checked' : ''}> tier2(${KEYWORDS.filter((k) => k.tier === 2).length})</label>
        <label style="margin-left:8px"><input type="checkbox" id="mur-t3" ${state.cfg.tiers.includes(3) ? 'checked' : ''}> tier3(${KEYWORDS.filter((k) => k.tier === 3).length})</label>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button id="mur-start">▶ 시작/재개</button>
        <button id="mur-pause">⏸ 일시정지</button>
        <button id="mur-skip">⏭ 이 키워드 건너뛰기</button>
        <button id="mur-one">1개만(현재 q)</button>
        <button id="mur-reset" style="color:#f88">초기화</button>
      </div>
      <details style="margin-top:6px"><summary>로그</summary><pre id="mur-log" style="max-height:160px;overflow:auto;white-space:pre-wrap;margin:4px 0;font-size:11px;opacity:.85">${(state.log || []).slice(-25).join('\n')}</pre></details>`;
    statusEl = panel.querySelector('#mur-status');
    logEl = panel.querySelector('#mur-log');
    panel.querySelectorAll('button').forEach((b) => (b.style.cssText = 'background:#333;color:#eee;border:1px solid #666;border-radius:6px;padding:4px 8px;cursor:pointer'));
    panel.querySelector('#mur-start').onclick = () => {
      const tiers = [1, 2, 3].filter((t) => panel.querySelector(`#mur-t${t}`).checked);
      if (!state.queue.length || !state.running && state.idx === 0) {
        state.queue = KEYWORDS.filter((k) => tiers.includes(k.tier));
        state.idx = 0; state.results = {};
      }
      state.cfg.tiers = tiers; state.running = true; save(state);
      log(`시작 · 키워드 ${state.queue.length}개 (tier ${tiers.join(',')})`);
      step();
    };
    panel.querySelector('#mur-pause').onclick = () => { state.running = false; save(state); log('일시정지'); };
    panel.querySelector('#mur-skip').onclick = () => { const c = state.queue[state.idx]; state.idx++; save(state); log(`건너뜀: ${c && c.q}`); if (state.running) step(); };
    panel.querySelector('#mur-one').onclick = async () => {
      const q = currentQ(); if (!q) return alert('검색어(q)가 있는 페이지에서 눌러주세요');
      const k = KEYWORDS.find((x) => x.q === q) || { q, cat: 'X', catName: '단발', tier: 0 };
      state.running = false; save(state);
      log(`단발 수집: ${q}`);
      const { cards, clicks, truncated } = await collect(k);
      download(`adlib_${k.cat}_${safe(q)}_${new Date().toISOString().slice(0, 10)}.json`, { meta: { ...k, collectedAt: new Date().toISOString(), url: location.href, cards: cards.length, moreClicks: clicks, truncated }, cards });
      log(`✔ ${q}: ${cards.length}장`);
    };
    panel.querySelector('#mur-reset').onclick = () => { if (confirm('진행 상태를 지울까요? (내려받은 파일은 남습니다)')) { localStorage.removeItem(KEY); location.reload(); } };
  }

  render();
  if (state.running) setTimeout(step, 1500);
})();
