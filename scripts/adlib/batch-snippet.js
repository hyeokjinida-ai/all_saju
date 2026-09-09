/* 메타 광고 라이브러리 — 배치 수집기 (콘솔 복붙, 확장 불필요)
 *
 * console-snippet.js 는 키워드 하나를 긁는다. 이건 **키워드 목록을 자동으로 순회**한다.
 * 페이지를 스스로 이동하며 다 끝날 때까지 돈다. 진행 상태는 localStorage 에 남아
 * 새로고침하거나 중간에 닫았다 다시 붙여넣어도 이어서 간다.
 *
 * 쓰는 법
 *  1) 광고 라이브러리 아무 검색 페이지를 연다.
 *  2) F12 → Console. (처음이면 `allow pasting` 입력 후 Enter)
 *  3) 아래 KEYWORDS 를 원하는 목록으로 바꾸고 이 파일 전체를 붙여넣는다.
 *     scripts/adlib/keywords-v2.json 에서 뽑아 쓰려면 절차_형님용.md 참조.
 *  4) 키워드마다 JSON 이 하나씩 자동 다운로드된다. 창은 앞에 띄워 둔다.
 *
 * 멈추기: MUR.stop()   이어가기: 다시 붙여넣기   처음부터: MUR.reset()
 */
(() => {
  'use strict';

  // ── 여기를 바꾼다 ──────────────────────────────────────────────
  const KEYWORDS = [
    '구독', '정기결제', '무료체험', '첫 달 무료', '정기배송', '멤버십', '구독박스', '자동결제',
    '심리테스트', '성격검사', 'IQ 테스트', 'AI 진단', 'AI 관상', 'AI 프로필', '퍼스널컬러',
    '유산균', '콜라겐', '맞춤 영양제', '다이어트 챌린지', '식단 관리',
    '무료 특강', '전자책', 'AI 활용', '부업', '스마트스토어',
    '임플란트', '탈모 치료', '대출', '보험 비교', '인테리어 견적',
    '강아지 사료', '펫보험', '유아 교구', '학습지',
    'AI 앱', '홈페이지 제작', '예약 시스템', '웹툰', '항공권',
    '사주', '재회', '타로',
  ];
  const CFG = { maxCards: 450, maxMore: 15, tickMs: 900, idleTicks: 10, firstWaitMs: 20000,
                betweenMs: [5000, 11000] };
  // ──────────────────────────────────────────────────────────────

  const KEY = 'MUR_ADLIB_BATCH';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = ([a, b]) => a + Math.floor(Math.random() * (b - a));

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

  const parseKoDate = (s) => {
    if (!s) return null;
    const m = s.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    const d = new Date(s);
    return isNaN(d) ? s.trim() : d.toISOString().slice(0, 10);
  };
  const countLib = (el) => (el.textContent.match(RE_LIB_G) || []).length;

  function cardRoots() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const roots = new Map();
    let n;
    while ((n = w.nextNode())) {
      if (!RE_LIB.test(n.nodeValue || '')) continue;
      let el = n.parentElement, hops = 0;
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
      let t = null;
      if (/l\.facebook\.com$/.test(u.host)) {
        const inner = u.searchParams.get('u');
        if (inner) { try { t = new URL(decodeURIComponent(inner)); } catch {} }
      } else if (!/facebook\.com$|fb\.com$|fb\.me$|facebook\.net$/.test(u.host)) t = u;
      if (!t) continue;
      const host = t.host.replace(/^www\./, ''), path = t.pathname.replace(/\/$/, '');
      let type = 'site';
      if (/play\.google\.com|apps\.apple\.com|onelink\.me|app\.link/.test(host)) type = 'app';
      else if (/forms\.gle|docs\.google\.com|tally\.so|typeform|smore/.test(host + path)) type = 'form';
      else if (/instagram\.com/.test(host)) type = 'instagram';
      else if (/kakao/.test(host)) type = 'kakao';
      return { landing: host + path, landingType: type };
    }
    return { landing: '', landingType: 'fbpage' };
  }

  function parseCard(el, id) {
    const text = (el.innerText || '').replace(/https?:\/\/\S+/g, '');
    const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
    const startRaw = (text.match(RE_START) || [])[1] || '';
    const reuseM = text.match(RE_REUSE);
    const si = lines.findIndex((l) => RE_SPONSOR.test(l));
    let advertiser = si > 0 ? lines[si - 1] : '';
    if (!advertiser) {
      const a = [...el.querySelectorAll('a[href]')].find((x) => /facebook\.com\/(?!ads\/library)[^/?]+/.test(x.href) && (x.innerText || '').trim());
      advertiser = a ? a.innerText.trim() : '';
    }
    const partnerLine = lines.find((l) => RE_PARTNER.test(l)) || '';
    let partner = '';
    const pm = partnerLine.match(/^(.+?)\s*(?:페이지는|님은|은|는)\s+(.+?)\s*(?:과\(와\)|와\(과\)|과|와)\s*함께합니다/) || partnerLine.match(/^(.+?)\s+is with\s+(.+)$/i);
    if (pm) { partner = pm[1].trim(); if (!advertiser || RE_PARTNER.test(advertiser)) advertiser = pm[2].trim(); }
    else if (partnerLine) partner = partnerLine.slice(0, 120);
    const body = []; let cta = '';
    for (let i = si + 1; i < lines.length && si >= 0; i++) {
      const l = lines[i];
      if (RE_CTA.test(l)) { cta = l; break; }
      if (RE_DOMAINLINE.test(l) && l.length < 60) break;
      if (META_LINE.test(l)) continue;
      body.push(l);
    }
    if (!cta) cta = lines.find((l) => RE_CTA.test(l)) || '';
    const prices = [...new Set([...text.matchAll(RE_PRICE)].map((m) => parseInt(m[1].replace(/,/g, ''), 10)).filter((n) => n >= 500 && n <= 5000000))].slice(0, 5);
    const disc = (text.match(RE_DISC) || [])[1];
    const bigImg = [...el.querySelectorAll('img')].some((im) => Math.max(im.naturalWidth || 0, im.width || 0, im.clientWidth || 0) > 200);
    return { id, advertiser, partner, start: parseKoDate(startRaw),
      reuse: reuseM ? parseInt(reuseM[1] || reuseM[2], 10) : 1,
      versions: /여러 버전|multiple versions/.test(text),
      hook: (body[0] || '').slice(0, 140), text: body.join(' / ').slice(0, 600), cta,
      media: el.querySelector('video') ? 'video' : bigImg ? 'image' : 'unknown',
      prices, discount: disc ? parseInt(disc, 10) : null,
      ...landingOf(el), empty: !advertiser && !body.length };
  }

  const findMore = () => [...document.querySelectorAll('div[role="button"],button,a')]
    .find((e) => /^(더 보기|더보기|See more|Load more|결과 더 보기)/i.test((e.innerText || '').trim()) && e.offsetParent !== null);
  const rateLimited = () => /잠시 후 다시 시도|일시적으로 차단|rate limit|too many requests/i.test(document.body.innerText || '');

  const urlFor = (q) => 'https://www.facebook.com/ads/library/?' + new URLSearchParams({
    active_status: 'active', ad_type: 'all', country: 'KR', is_targeted_country: 'false',
    media_type: 'all', q, search_type: 'keyword_unordered',
    'sort_data[direction]': 'desc', 'sort_data[mode]': 'total_impressions',
  }).toString();
  const curQ = () => new URL(location.href).searchParams.get('q');

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const save = (s) => localStorage.setItem(KEY, JSON.stringify(s));
  let st = load();
  if (!st || JSON.stringify(st.queue) !== JSON.stringify(KEYWORDS)) {
    st = { queue: KEYWORDS, idx: 0, done: {}, running: true };
    save(st);
  }
  st.running = true; save(st);

  function download(name, obj) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  }
  const safe = (s) => s.replace(/[^\p{L}\p{N}_-]+/gu, '_');

  async function collect() {
    const t0 = Date.now();
    while (Date.now() - t0 < CFG.firstWaitMs && cardRoots().size === 0) await sleep(500);
    let clicks = 0, idle = 0, last = 0;
    while (true) {
      const n = cardRoots().size;
      if (n >= CFG.maxCards) break;
      if (n > last) { last = n; idle = 0; } else idle++;
      const b = findMore();
      if (b && clicks < CFG.maxMore) { b.click(); clicks++; idle = 0; }
      window.scrollTo(0, document.body.scrollHeight);
      if (idle >= CFG.idleTicks) break;
      if (!b && clicks >= CFG.maxMore) break;
      await sleep(CFG.tickMs);
    }
    for (let y = document.body.scrollHeight; y > 0; y -= 1500) { window.scrollTo(0, y); await sleep(110); }
    const roots = cardRoots(), cards = [];
    for (const [id, el] of roots) { try { cards.push(parseCard(el, id)); } catch (e) { cards.push({ id, error: String(e) }); } }
    return { cards, clicks, truncated: roots.size >= CFG.maxCards };
  }

  async function step() {
    st = load(); if (!st || !st.running) return;
    const q = st.queue[st.idx];
    if (!q) {
      st.running = false; save(st);
      download(`adlib_배치요약_${new Date().toISOString().slice(0, 10)}.json`, { done: st.done, queue: st.queue });
      console.log('%c[adlib] ✅ 배치 완료 — 요약 JSON 내려받음', 'color:#9f9;font-size:15px');
      console.table(Object.entries(st.done).map(([k, v]) => ({ 키워드: k, 카드: v })));
      return;
    }
    if (rateLimited()) { console.warn('[adlib] 속도 제한 — 120초 대기 후 새로고침'); await sleep(120000); location.reload(); return; }
    if (curQ() !== q) { console.log(`[adlib] → ${st.idx + 1}/${st.queue.length} 「${q}」 로 이동`); location.href = urlFor(q); return; }

    console.log(`%c[adlib] ${st.idx + 1}/${st.queue.length} 「${q}」 수집 중…`, 'color:#ff9');
    const { cards, clicks, truncated } = await collect();
    const empty = cards.filter((c) => c.empty).length;
    download(`adlib_${safe(q)}_${new Date().toISOString().slice(0, 10)}.json`,
      { meta: { q, collectedAt: new Date().toISOString(), url: location.href, cards: cards.length, moreClicks: clicks, truncated, emptyCards: empty }, cards });
    st = load(); st.done[q] = cards.length; st.idx++; save(st);
    console.log(`%c[adlib] ✔ 「${q}」 ${cards.length}장 (빈 카드 ${empty}) · 남은 ${st.queue.length - st.idx}개`, 'color:#9f9');
    await sleep(rnd(CFG.betweenMs));
    step();
  }

  window.MUR = {
    stop() { const s = load(); if (s) { s.running = false; save(s); } console.log('[adlib] 정지. 다시 붙여넣으면 이어서 간다.'); },
    reset() { localStorage.removeItem(KEY); console.log('[adlib] 초기화. 다시 붙여넣으면 처음부터.'); },
    status() { const s = load(); console.log(`[adlib] ${s ? s.idx : 0}/${s ? s.queue.length : 0}`); console.table(s ? s.done : {}); },
    skip() { const s = load(); if (s) { s.idx++; save(s); } console.log('[adlib] 건너뜀'); step(); },
  };
  console.log('%c[adlib] 배치 시작 — 키워드 ' + KEYWORDS.length + '개. 멈추려면 MUR.stop()', 'color:#9cf;font-size:15px');
  step();
})();
