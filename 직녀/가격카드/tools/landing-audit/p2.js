(() => {
  const out = {};
  const R = (el) => { const r = el.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) }; };
  // 1) 전체 높이로 늘어난 배경 영상?
  out.videos = [...document.querySelectorAll("video")].map((v) => {
    const cs = getComputedStyle(v);
    return { src: (v.currentSrc || "").split("/").pop(), rect: R(v), vw: v.videoWidth, vh: v.videoHeight,
      objectFit: cs.objectFit, position: cs.position, cls: v.className.slice(0, 70),
      parentCls: v.parentElement ? v.parentElement.className.slice(0, 70) : "", parentRect: v.parentElement ? R(v.parentElement) : null };
  });
  // 2) 말풍선 텍스트 뒤 실제 배경 — 조상 중 background-image url() 을 찾는다
  const bub = [...document.querySelectorAll("*")].filter((el) => {
    let own = ""; for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
    return /방금 다 읽었어요|맞으면 열어보세요|같이 볼까요|여기까지 폈어요/.test(own.trim());
  });
  out.bubbles = bub.map((el) => {
    let n = el, chain = [];
    for (let i = 0; i < 8 && n; i++) {
      const cs = getComputedStyle(n);
      chain.push({ tag: n.tagName.toLowerCase(), bg: cs.backgroundColor, bgImg: (cs.backgroundImage || "").slice(0, 90), cls: String(n.className || "").slice(0, 50) });
      n = n.parentElement;
    }
    // 형제 중 img(말풍선 PNG)가 있나
    const sib = el.closest("[class*=relative]");
    const imgs = sib ? [...sib.querySelectorAll("img")].map((i) => (i.currentSrc || i.src).split("/").pop()) : [];
    return { t: (el.textContent || "").trim().slice(0, 30), color: getComputedStyle(el).color, rect: R(el), chain, siblingImgs: imgs };
  });
  // 3) 고정(sticky/fixed) 요소
  out.fixed = [...document.querySelectorAll("body *")].filter((el) => { const p = getComputedStyle(el).position; return p === "fixed" || p === "sticky"; })
    .map((el) => ({ tag: el.tagName.toLowerCase(), cls: String(el.className || "").slice(0, 60), pos: getComputedStyle(el).position, rect: R(el), t: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50) }));
  // 4) ████ 글리프
  out.masks = [...document.querySelectorAll("*")].filter((el) => { let own = ""; for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue; return own.includes("█"); })
    .map((el) => ({ t: (el.textContent || "").trim().slice(0, 20), color: getComputedStyle(el).color, fs: getComputedStyle(el).fontSize, rect: R(el), cls: String(el.className || "").slice(0, 60) }));
  // 5) NeonMask 류 (블러 알약)
  out.blurpills = [...document.querySelectorAll("*")].filter((el) => /blur/.test(getComputedStyle(el).filter || "") || /blur/.test(String(el.className || "")))
    .slice(0, 20).map((el) => ({ tag: el.tagName.toLowerCase(), cls: String(el.className || "").slice(0, 60), filter: getComputedStyle(el).filter, rect: R(el), t: (el.textContent || "").trim().slice(0, 30) }));
  out.docH = document.documentElement.scrollHeight;
  return JSON.stringify(out);
})()
