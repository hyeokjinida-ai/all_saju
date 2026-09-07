(() => {
  const H = window.innerHeight, W = window.innerWidth;
  const clean = (s) => String(s).replace(/\s+/g, " ").trim();
  // 첫 화면 안에 들어오는 CTA / 가격 / 상품명
  const tap = [...document.querySelectorAll("a,button,[role=button]")].map((el) => {
    const r = el.getBoundingClientRect();
    return { t: clean(el.textContent || ""), top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height), inFold: r.top < H && r.bottom > 0 };
  }).filter((b) => b.w > 1 && b.h > 1);
  // 배경 레이어(블러 유리판 · 그라데이션 · 영상) 크기
  const layers = [...document.querySelectorAll("body *")].filter((el) => {
    const cs = getComputedStyle(el);
    return (cs.backdropFilter && cs.backdropFilter !== "none") || (cs.filter && cs.filter !== "none" && el.tagName !== "PATH");
  }).map((el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { tag: el.tagName.toLowerCase(), cls: String(el.className || "").slice(0, 44), h: Math.round(r.height), w: Math.round(r.width),
      backdrop: cs.backdropFilter.slice(0, 24), filter: cs.filter.slice(0, 24), pos: cs.position };
  });
  const vids = [...document.querySelectorAll("video")].map((v) => { const r = v.getBoundingClientRect(); const cs = getComputedStyle(v);
    return { src: (v.currentSrc || "").split("/").pop(), w: Math.round(r.width), h: Math.round(r.height), vw: v.videoWidth, vh: v.videoHeight, fit: cs.objectFit,
      visiblePct: v.videoWidth ? +((r.width / (r.height * v.videoWidth / v.videoHeight)) * 100).toFixed(1) : null }; });
  return JSON.stringify({ W, H, docH: document.documentElement.scrollHeight,
    fold: tap.filter((b) => b.inFold), firstCta: tap.find((b) => b.h >= 40 && b.w >= 150) || null, layers, vids,
    foldText: [...document.querySelectorAll("body *")].filter((el) => { const r = el.getBoundingClientRect(); let own = ""; for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
      return clean(own) && r.top < H && r.bottom > 0 && !el.closest("svg"); }).map((el) => { const r = el.getBoundingClientRect(); let own = ""; for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
      return { t: clean(own).slice(0, 60), top: Math.round(r.top), fs: +parseFloat(getComputedStyle(el).fontSize).toFixed(0) }; }) });
})()
