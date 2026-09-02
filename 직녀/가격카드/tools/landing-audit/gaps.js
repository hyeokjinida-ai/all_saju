// 블록 간 세로 여백 전수 — 칠흑 판독과 같은 자로 잰다.
// 티저 컬럼의 «보이는 블록»들을 y 순서로 세우고, 앞 블록 바닥 → 다음 블록 머리 거리를 잰다.
(() => {
  const W = innerWidth;
  const blocks = [];
  const walk = (el) => {
    for (const c of el.children) {
      const r = c.getBoundingClientRect();
      if (r.height < 8 || r.width < W * 0.3) { continue; }
      const cs = getComputedStyle(c);
      if (cs.position === "fixed" || cs.display === "none") continue;
      // 큰 래퍼는 파고들고, 화면 두 장 이하 덩어리는 블록으로 채택
      if (r.height > innerHeight * 2 && c.children.length > 1) { walk(c); continue; }
      blocks.push({
        y: Math.round(r.top + scrollY),
        b: Math.round(r.bottom + scrollY),
        h: Math.round(r.height),
        t: (c.innerText || "").trim().replace(/\s+/g, " ").slice(0, 22),
        tag: c.tagName,
      });
    }
  };
  walk(document.querySelector("main") || document.body);
  blocks.sort((a, b) => a.y - b.y);
  const rows = [];
  for (let i = 1; i < blocks.length; i++) {
    const gap = blocks[i].y - blocks[i - 1].b;
    if (gap > -20) rows.push({ gap, at: blocks[i].y, prev: blocks[i - 1].t, next: blocks[i].t });
  }
  return JSON.stringify({ n: blocks.length, rows }, null, 1);
})();
