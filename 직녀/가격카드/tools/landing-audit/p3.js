(() => {
  const imgs = [...document.querySelectorAll("img")].map((el) => {
    const r = el.getBoundingClientRect();
    return { src: (el.currentSrc || el.src).split("/").pop(), w: Math.round(r.width), h: Math.round(r.height),
      attrW: el.getAttribute("width"), attrH: el.getAttribute("height"),
      cssAR: getComputedStyle(el).aspectRatio, loaded: el.complete && el.naturalWidth > 0,
      loading: el.getAttribute("loading") || "", y: Math.round(r.top + scrollY) };
  });
  const vids = [...document.querySelectorAll("video")].map((el) => {
    const r = el.getBoundingClientRect();
    return { src: (el.currentSrc || "").split("/").pop(), w: Math.round(r.width), h: Math.round(r.height), attrW: el.getAttribute("width"), attrH: el.getAttribute("height") };
  });
  return JSON.stringify({ docH: document.documentElement.scrollHeight, imgs, vids,
    zeroH: imgs.filter(i => i.h < 4).length, noDim: imgs.filter(i => !i.attrW && !i.attrH && (!i.cssAR || i.cssAR === "auto")).length });
})()
