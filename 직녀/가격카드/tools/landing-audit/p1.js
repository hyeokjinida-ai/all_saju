(() => {
  const out = {};
  const d = document.querySelector("details");
  if (d) {
    const li = d.querySelector("ul li");
    const r = li ? li.getBoundingClientRect() : null;
    out.details = { open: d.open, liRect: r ? { y: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width) } : null,
      ulDisplay: d.querySelector("ul") ? getComputedStyle(d.querySelector("ul")).display : null,
      ulCV: d.querySelector("ul") ? getComputedStyle(d.querySelector("ul")).contentVisibility : null,
      detailsRect: (() => { const rr = d.getBoundingClientRect(); return { y: Math.round(rr.top + scrollY), h: Math.round(rr.height) }; })() };
  }
  out.videos = [...document.querySelectorAll("video")].map((v) => ({
    src: (v.currentSrc || "").split("/").pop(), vw: v.videoWidth, vh: v.videoHeight,
    dur: +(v.duration || 0).toFixed(2), paused: v.paused, readyState: v.readyState,
    preload: v.preload, loop: v.loop, poster: (v.poster || "").split("/").pop(),
    rect: (() => { const r = v.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; })(),
  }));
  out.docH = document.documentElement.scrollHeight;
  // 첫 화면(0~844) 안에 있는 것
  out.firstScreen = [...document.querySelectorAll("body *")].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.top < 844 && r.bottom > 0 && r.height > 6 && (el.children.length === 0 || el.tagName === "VIDEO" || el.tagName === "IMG");
  }).map((el) => { const r = el.getBoundingClientRect(); return { tag: el.tagName.toLowerCase(), t: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50), y: Math.round(r.top), h: Math.round(r.height) }; });
  return JSON.stringify(out);
})()
