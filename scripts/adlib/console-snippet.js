/* 메타 광고 라이브러리 — 콘솔 복붙 수집기 (확장 설치 불필요)
 * 쓰는 법: 광고 라이브러리 검색 페이지에서 F12 → Console → 이 파일 전체 붙여넣고 Enter.
 *          끝나면 JSON 파일이 자동으로 다운로드된다. 다른 키워드는 검색어 바꾸고 다시 붙여넣기.
 * 근거: 00_메타광고_업체랭킹.md 수집 방법 · 00_소재에서상품까지_연결지도.md §9
 */
(async () => {
  'use strict';
  const CFG = { maxCards: 450, maxMore: 15, tickMs: 900, idleTicks: 10, firstWaitMs: 20000 };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const roots = new Map();
    let n;
    while ((n = walker.nextNode())) {
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
    const body = [];
    let cta = '';
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
    return {
      id, advertiser, partner, start: parseKoDate(startRaw),
      reuse: reuseM ? parseInt(reuseM[1] || reuseM[2], 10) : 1,
      versions: /여러 버전|multiple versions/.test(text),
      hook: (body[0] || '').slice(0, 140), text: body.join(' / ').slice(0, 600), cta,
      media: el.querySelector('video') ? 'video' : bigImg ? 'image' : 'unknown',
      prices, discount: disc ? parseInt(disc, 10) : null,
      ...landingOf(el), empty: !advertiser && !body.length,
    };
  }

  const findMore = () => [...document.querySelectorAll('div[role="button"],button,a')]
    .find((e) => /^(더 보기|더보기|See more|Load more|결과 더 보기)/i.test((e.innerText || '').trim()) && e.offsetParent !== null);

  const q = new URL(location.href).searchParams.get('q') || 'unknown';
  console.log('%c[adlib] 수집 시작: ' + q, 'color:#ff9;font-size:14px');

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
    console.log(`[adlib] 카드 ${n} · 더보기 ${clicks}`);
    await sleep(CFG.tickMs);
  }
  for (let y = document.body.scrollHeight; y > 0; y -= 1500) { window.scrollTo(0, y); await sleep(120); }

  const roots = cardRoots(), cards = [];
  for (const [id, el] of roots) { try { cards.push(parseCard(el, id)); } catch (e) { cards.push({ id, error: String(e) }); } }

  const out = {
    meta: { q, collectedAt: new Date().toISOString(), url: location.href, cards: cards.length,
            moreClicks: clicks, truncated: roots.size >= CFG.maxCards, emptyCards: cards.filter((c) => c.empty).length },
    cards,
  };
  const name = `adlib_${q.replace(/[^\p{L}\p{N}_-]+/gu, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
  a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);

  console.log(`%c[adlib] ✔ ${q}: ${cards.length}장 (빈 카드 ${out.meta.emptyCards}) → ${name}`, 'color:#9f9;font-size:14px');
  console.table(cards.slice(0, 10).map((c) => ({ 광고주: c.advertiser, 재집행: c.reuse, 시작: c.start, 가격: (c.prices || []).join(','), 착지: c.landing, 훅: (c.hook || '').slice(0, 30) })));
  window.__adlib = out;
  window.__adlibName = name;
})();
