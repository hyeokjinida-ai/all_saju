# 광고 v5(서윤 무성 UGC) 전용 캡처 — 실결과지에서 카드 재료를 잘라낸다.
#   PYTHONUTF8=1 python marketing/tools/cap_seoyun.py            # 전부
#   PYTHONUTF8=1 python marketing/tools/cap_seoyun.py --skip-cap # 조각이 이미 있으면 크롭만
#
# 왜 따로 쓰나: build_ads.py 의 build_captures 는 **지수** 결과지 기준으로 굳어 있고(파일명·rects 키),
# v5 는 손님이 서윤이라 결과지가 통째로 다르다. 같은 함수에 케이스를 끼우면 옛 소재가 깨진다.
#
# ⚠ 이 페이지에서 밟은 함정 3개 (2026-08-23 실측)
#  1) **페이지 높이가 실행마다 흔들린다** (23,883 / 24,299 / 29,705 css px — 웹툰 컷 로딩·useInView).
#     → 좌표(rects)와 픽셀은 **같은 실행**에서 나와야 한다. 창마다 --rects 를 같이 받아 그 창 것만 쓴다.
#  2) `document.querySelectorAll('*')` 텍스트 검색은 **RSC 페이로드 <script> 를 집는다**(0×0).
#     → 보이는 요소만(스크립트·스타일 제외, 크기 > 0).
#  3) dpr3 통짜는 1170×73,000 = 8,500만 픽셀로 PIL 폭탄 한도에 붙는다 → 창을 나눠 찍는다.
#
# 산출 → marketing/소재/산군/재료/캡처/seo/
import json
import os
import subprocess
import sys

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAT = os.path.join(ROOT, "marketing", "소재", "산군", "재료")
OUT = os.path.join(MAT, "캡처", "seo")
TMP = os.path.join(os.environ.get("TEMP", "/tmp"), "seo_cap")
URL = "http://localhost:3000/dev/sangun-result?case=seoyun"
CAP_PAGE = os.path.join(ROOT, "marketing", "tools", "cap_page.mjs")
Image.MAX_IMAGE_PIXELS = 250_000_000
os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

# 창 = (시작, 끝) CSS px. 500px 겹쳐 블록이 경계에 걸려도 한쪽에는 온전히 들어가게.
WINDOWS = [(0, 6600), (5900, 12500), (11800, 18400), (17700, 24300), (23600, 30200)]


def log(*a):
    print("[cap_seoyun]", *a, flush=True)


RECTS_JS = r"""
(()=>{
  const R=(el)=>{ if(!el) return null; const r=el.getBoundingClientRect();
    if(r.width<1||r.height<1) return null; return [r.left, r.top+scrollY, r.width, r.height]; };
  const SKIP=new Set(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','HEAD','META','LINK']);
  // 보이는 요소만 — RSC 페이로드가 <script> 안에 본문을 통째로 들고 있어서 그냥 찾으면 0x0 이 잡힌다
  const visibleMatches=(re)=>[...document.querySelectorAll('p,div,span,h1,h2,h3,h4,li,strong,em,mark,td')]
      .filter(e=>!SKIP.has(e.tagName) && re.test(e.textContent||'')
                 && e.getBoundingClientRect().width>1 && e.getBoundingClientRect().height>1);
  // 문단 = 가장 안쪽 일치 요소에서 **인라인을 벗어날 때까지** 올라간다.
  // ⚠ mark/strong 의 rect 는 여러 줄에 걸치면 폭이 문단만큼 넓어져서 "너비로 판별"이 안 된다
  //   (실측: mark 326px vs 단 332px). 그대로 자르면 위아래 줄이 반쯤 잘려 들어온다.
  const INLINE=new Set(['MARK','STRONG','EM','SPAN','A','CODE','B','I','U','SMALL','SUP','SUB']);
  const para=(re)=>{ const m=visibleMatches(re); if(!m.length) return null;
    let n=m[m.length-1];
    for(let i=0;i<8&&n;i++){
      const disp=getComputedStyle(n).display;
      if(!INLINE.has(n.tagName) && !/^inline/.test(disp) && n.getBoundingClientRect().height>18) return R(n);
      n=n.parentElement; }
    return R(m[m.length-1]); };
  // 표 = 제목 span 의 **up1**(머리줄 컨테이너의 부모) — 실측으로 확인한 구조
  const table=(title)=>{ const s=[...document.querySelectorAll('span')]
      .find(x=>(x.textContent||'').trim()===title && x.getBoundingClientRect().height>1);
    return s&&s.parentElement&&s.parentElement.parentElement ? R(s.parentElement.parentElement) : null; };
  // tight = 강조 요소(mark/strong) 자체의 rect. 여러 줄에 걸쳐도 **줄 경계에 딱 맞으므로**
  // 여백 0 으로 자르면 이웃 줄이 안 들어온다. 핀 카드는 이쪽을 쓴다(문단판은 너무 길다).
  const tight=(re)=>{ const m=visibleMatches(re); return m.length? R(m[m.length-1]) : null; };
  const out={};
  out.jikeon = para(/미련은 남아 있지만/);
  out.jikeon_t = tight(/미련은 남아 있지만/);
  out.ch1_a_t  = tight(/첫 번째 강점은/);
  out.ch1_b_t  = tight(/기회를 돈과 결과로 바꾸는 감각/);  // 굵은 건 이쪽(「두 번째 강점이다」는 굵기 밖이라 문단이 잡힌다)
  out.ch1_c_t  = tight(/남들과 다른 결은/);
  out.olhae_t  = tight(/미련을 확인하는 해가 아니라/);
  out.ch1_a  = para(/첫 번째 강점은/);
  out.ch1_b  = para(/두 번째 강점이다/);
  out.ch1_c  = para(/남들과 다른 결은/);
  out.olhae  = para(/미련을 확인하는 해가 아니라/);   // 3장 형광 — 흐름 블록 카드
  out.daeun  = table('네 대운 연대기');
  out.money  = table('돈의 달력');
  out.inyeon_cal = table('인연의 달력');
  // 짝 카드 = 얼굴 img 의 **up1**(실측 332x672), 얼굴 = img 자체(166x210)
  const img=[...document.querySelectorAll('img')].find(i=>/partner-/.test(i.src||''));
  out.face = R(img);
  out.partner_card = img&&img.parentElement&&img.parentElement.parentElement
      ? R(img.parentElement.parentElement) : null;
  out.partner_src = img ? (img.src.split('/').pop()) : null;
  // ⚠ 광고용 카드는 「만나는 자리」 **위에서 자른다**. 공급사 도화살 해설이 경고문("이미 기혼자와…")을
  //   장소로 흘려보내는 경우가 있어(서윤 실측) 광고에 그대로 나가면 안 된다. 필요한 건 시기·외모·성격뿐.
  const pl=[...document.querySelectorAll('div,span,p')].find(e=>(e.textContent||'').trim()==='만나는 자리'
      && e.getBoundingClientRect().height>1);
  if(pl && out.partner_card){ const r=pl.getBoundingClientRect(); const c=out.partner_card;
    out.partner_card_ad=[c[0], c[1], c[2], Math.max(60, (r.top+scrollY) - c[1] - 6)]; }
  const g=[...document.querySelectorAll('div')].filter(d=>/ganji/.test(getComputedStyle(d).backgroundImage||''));
  out.ganji = g.length ? R(g[0]) : null;
  out.__page=[0,0,document.documentElement.scrollWidth,document.documentElement.scrollHeight];
  return out;
})()
"""


def cap(prefix, dpr, wait=15000, y0=None, y1=None, chunk=1200):
    cmd = ["node", CAP_PAGE, "--url", URL, "--out", prefix, "--w", "390",
           "--dpr", str(dpr), "--wait", str(wait), "--maxh", "60000",
           "--chunk", str(chunk), "--rects", RECTS_JS]
    if y0 is not None:
        cmd += ["--y0", str(int(y0)), "--y1", str(int(y1))]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        sys.stderr.write((r.stderr or "")[-1500:])
        raise SystemExit(f"cap_page failed rc={r.returncode}")
    return prefix


def stitch(prefix):
    j = json.load(open(prefix + ".json", encoding="utf-8"))
    if not j["parts"]:
        return None, j, 0
    dpr = j["dpr"]
    y0 = j["parts"][0]["scrollY"]
    y1 = j["parts"][-1]["scrollY"] + j["parts"][-1]["h"]
    out = Image.new("RGB", (j["width"] * dpr, int(round((y1 - y0) * dpr))), (5, 4, 3))
    for p in j["parts"]:
        out.paste(Image.open(p["file"]).convert("RGB"), (0, int(round((p["scrollY"] - y0) * dpr))))
    return out, j, y0


# 이름 → (rects 키, 파일명, 풀폭 여부, 위·아래 여백)
BLOCKS = [
    ("jikeon", "seo_pin_jikeon.png", True, 14, 14),
    ("jikeon_t", "seo_line_jikeon.png", True, 3, 3),
    ("ch1_a_t", "seo_line_ch1_a.png", True, 3, 3),
    ("ch1_b_t", "seo_line_ch1_b.png", True, 3, 32),   # 강조가 한 줄이라 끝 문장("두 번째 강점이다")이 잘린다 → 아래 한 줄 더
    ("ch1_c_t", "seo_line_ch1_c.png", True, 3, 3),
    ("olhae_t", "seo_line_olhae.png", True, 3, 3),
    ("ch1_a", "seo_pin_ch1_a.png", True, 12, 12),
    ("ch1_b", "seo_pin_ch1_b.png", True, 12, 12),
    ("ch1_c", "seo_pin_ch1_c.png", True, 12, 12),
    ("olhae", "seo_pin_olhae.png", True, 12, 12),
    ("daeun", "seo_daeun_table.png", True, 8, 8),
    ("money", "seo_money_calendar.png", True, 8, 8),
    ("inyeon_cal", "seo_inyeon_calendar.png", True, 8, 8),
    ("ganji", "seo_balloon.png", True, 6, 6),
    ("partner_card", "seo_partner_card.png", False, 10, 10),
    ("partner_card_ad", "seo_partner_card_ad.png", False, 10, 6),
    ("face", "seo_partner_face.png", False, 14, 14),
]


def main():
    skip = "--skip-cap" in sys.argv
    saved, meta = {}, {}
    for i, (a, b) in enumerate(WINDOWS):
        p = os.path.join(TMP, f"w{i}")
        if not skip:
            log(f"window{i} capturing css {a}~{b} …")
            cap(p, dpr=3, y0=a, y1=b)
        im, j, wy0 = stitch(p)
        if im is None:
            log(f"window{i} empty (page shorter) — skip")
            continue
        d = j["dpr"]
        rects = j.get("rects") or {}
        top, bot = wy0, wy0 + im.height / d
        page_h = (rects.get("__page") or [0, 0, 0, 0])[3]
        log(f"window{i} {im.size} css {top:.0f}~{bot:.0f} (page {page_h})")
        meta.setdefault("partner_src", rects.get("partner_src"))
        for key, name, fullw, padt, padb in BLOCKS:
            if name in saved:
                continue
            rc = rects.get(key)
            if not rc:
                continue
            x, y, w, h = rc
            if not (y - padt >= top and y + h + padb <= bot):
                continue
            L, Rr = (0, im.width) if fullw else (max(0, int((x - 8) * d)), min(im.width, int((x + w + 8) * d)))
            T = max(0, int((y - top - padt) * d))
            B = min(im.height, int((y - top + h + padb) * d))
            crop = im.crop((L, T, Rr, B))
            crop.save(os.path.join(OUT, name))
            saved[name] = (crop.size, [round(v) for v in rc])
            log("  saved", name, crop.size, "css", [round(v) for v in rc])
        # 플립 원본은 가장 큰 창 하나로 쓰지 않는다 — 아래에서 통짜를 따로 만든다
        im.save(os.path.join(TMP, f"win{i}.png"))

    missing = [n for _, n, _, _, _ in BLOCKS if n not in saved]
    if missing:
        log("MISSING:", missing)

    # 얼굴 블러 2종
    fp = os.path.join(OUT, "seo_partner_face.png")
    if os.path.exists(fp):
        Image.open(fp).convert("RGB").filter(ImageFilter.GaussianBlur(18)) \
            .save(os.path.join(OUT, "seo_partner_face_blur.png"))
        log("  saved seo_partner_face_blur.png")
    cp = os.path.join(OUT, "seo_partner_card.png")
    if os.path.exists(cp) and "seo_partner_card.png" in saved and "seo_partner_face.png" in saved:
        card = Image.open(cp).convert("RGB")
        cr = saved["seo_partner_card.png"][1]
        fr = saved["seo_partner_face.png"][1]
        d = 3
        fx = int((fr[0] - (cr[0] - 8)) * d)
        fy = int((fr[1] - (cr[1] - 10)) * d)
        box = (max(0, fx), max(0, fy), min(card.width, fx + int(fr[2] * d)), min(card.height, fy + int(fr[3] * d)))
        if box[2] > box[0] + 4 and box[3] > box[1] + 4:
            card.paste(card.crop(box).filter(ImageFilter.GaussianBlur(16)), box)
        card.save(os.path.join(OUT, "seo_partner_card_blur.png"))
        log("  saved seo_partner_card_blur.png")

    # 플립 18장 — 통짜(dpr1) 한 번 더. 0.34초씩 넘어가므로 dpr1 로 충분하다.
    pf = os.path.join(TMP, "full1")
    if "--no-full" in sys.argv:
        log("skip full pass (--no-full)")
        pf = None
    elif not skip:
        log("full(dpr1) capturing …")
        cap(pf, dpr=1, chunk=1600)
    full, jf, _ = (stitch(pf) if pf and os.path.exists(pf + ".json") else (None, None, 0))
    if full is not None:
        full.save(os.path.join(OUT, "seo_result_full.png"))
        fw, fh = 1080, 1920
        sc = full.resize((fw, int(full.height * fw / full.width)), Image.LANCZOS)
        n = 18
        stride = max(1, (sc.height - fh) // (n - 1))
        for i in range(n):
            y = min(i * stride, sc.height - fh)
            sc.crop((0, y, fw, y + fh)).save(os.path.join(OUT, f"seo_flip_{i + 1:02d}.png"))
        log(f"saved seo_result_full.png {full.size} + seo_flip_01..18 (stride={stride})")

    json.dump({"saved": {k: v[0] for k, v in saved.items()}, "css": {k: v[1] for k, v in saved.items()},
               "missing": missing, "partner_src": meta.get("partner_src")},
              open(os.path.join(OUT, "seo_caps_index.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    log("done ->", OUT, "| 짝 얼굴:", meta.get("partner_src"))


if __name__ == "__main__":
    main()
