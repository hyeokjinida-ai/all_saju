# -*- coding: utf-8 -*-
"""
산군 광고영상 빌더 — marketing/tools/build_ads.py (2026-08-23 밤)

명세: marketing/소재/산군/광고영상_제작명세_2026-08-23.md
  §0-B(위닝 45편 실측 규격)이 §0 기본값·§2 컷표의 숫자를 덮어쓴다. 컷 순서·소스·문구는 §2, 4:5 파생은 §4, 판정은 §5.
실행:
  PYTHONUTF8=1 python marketing/tools/build_ads.py captures                 # 캡처 조각 잇기 + 블록 자르기(재료/캡처)
  PYTHONUTF8=1 python marketing/tools/build_ads.py vB_janbu vC_gwaedam --ratios 9x16,4x5
  PYTHONUTF8=1 python marketing/tools/build_ads.py all --ratios 9x16,4x5 --check
  PYTHONUTF8=1 python marketing/tools/build_ads.py --check                  # 이미 뽑힌 영상만 판정·시트
파이프라인: prep_assets → render_cuts → concat(xfade) → text_layers(PIL PNG) → overlay(ffmpeg) → audio → encode → check

환경 실측(이 PC):
  - ffmpeg 는 CapCut 동봉본뿐 — libx264 없음 → h264_qsv(ICQ global_quality 18, preset slow) 로 대체. h264_mf 는 멈춘다.
  - ffmpeg 출력 경로에 한글이 있으면 죽는다 → 모든 ffmpeg 출력은 ASCII 임시 폴더(TMP)에 쓰고 마지막에 os.replace.
  - 루프 클립은 24fps → fps=30 으로 올린다.
"""
import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

Image.MAX_IMAGE_PIXELS = None

ROOT = "C:/Users/HP/OneDrive/Desktop/all_saju"
FF = "C:/Users/HP/AppData/Local/CapCut/Apps/8.7.0.3685/ffmpeg.exe"
TMP = "C:/Users/HP/AppData/Local/Temp/claude/adbuild"           # ASCII 전용(ffmpeg 출력)
MAT = f"{ROOT}/marketing/소재/산군/재료"
CLIPS = f"{MAT}/클립"
AUDIO = f"{CLIPS}/audio"
CAPS = f"{MAT}/캡처"
OUT = f"{ROOT}/marketing/소재/산군/영상"
PUB = f"{ROOT}/public/products/sangun"
SRC2K = f"{ROOT}/design/sangun/video-src"

for d in (TMP, f"{TMP}/cap", f"{TMP}/cuts", f"{TMP}/text", f"{TMP}/mix", f"{TMP}/final", f"{TMP}/prep", f"{TMP}/sheet", CAPS, OUT):
    os.makedirs(d, exist_ok=True)

# ───────────────────────────── CONFIG — 숫자는 전부 여기(9:16 1080×1920 px, 4:5는 같은 %) ─────────────────────────────
CONFIG = {
    "fps": 30,
    "W": 1080,
    "H": {"9x16": 1920, "4x5": 1350},
    "safe": {"9x16": (220, 1500), "4x5": (100, 1180)},     # 텍스트 y 세이프존
    "bg_crop45_y": 285,                                     # 4:5 배경 = 9:16 클립의 y 285~1635 크롭(§4)
    "hook_band_top": 180,                                   # 훅 밴드 허용 상단(§0-B 실측 y 10.6%=204 가 §0 세이프존 220 위라 훅만 예외)
    "enc": {"gq": 16, "preset": "slow", "gq_mid": 14, "max_mb": 30},  # h264_qsv ICQ
    "aac": {"br": "160k", "ar": 44100},
    "loud": {"I": -16.0, "TP": -1.5, "LRA": 9.0},
    "fonts": {
        "myeongjo": "C:/Windows/Fonts/batang.ttc",          # 바탕 — 훅·산군 대사·V-C/V-A 자막
        "gothic_b": "C:/Windows/Fonts/malgunbd.ttf",        # 맑은고딕 굵게 — 항목·V-D 자막·CTA
        "gothic": "C:/Windows/Fonts/malgun.ttf",
    },
    "colors": {"GOLD": (232, 201, 106), "BONE": (240, 236, 228), "SOFT": (198, 190, 176), "WHITE": (255, 255, 255), "RED": (220, 38, 38),
               "CINNABAR": (176, 62, 40)},   # v6 강조색 = 주사 낙관 실측(173,67,41). **형광 배경**으로 쓴다 — 글자색으로 쓰면 앰버 배경에 묻힌다(실측 2회)
               # → 색상은 유지하고 명도만 올린 주홍. W2 는 흑백 배경이라 진한 빨강이 살았다
    "text": {"fade": 0.25, "rise": 20, "shadow": {"alpha": 0.6, "dx": 0, "dy": 3, "blur": 6}, "maxw": 920},
    "scrim": {"top": 220, "h": 520, "a": 0.50},            # 훅 밴드 밑 스크림(위→아래 0.5→0), 영상 배경 소재에만
    # 포맷별 확정 규격(§0-B)
    "stack": {"hook": {"size": 72, "stroke": 4, "y": 250}, "sub": {"size": 44, "y": 480},
              "item": {"size": 44, "stroke": 3, "maxw": 840, "ys": (650, 930, 1210), "t": (1.0, 2.0, 3.0)},
              "cta": {"size": 40, "t": 4.0, "y": (1400, 1480)}, "brand_y": 1336},
    "face": {"hook": {"size": 68, "stroke": 4, "y": 204, "until": 7.3},  # 실측 6~8.5s 제거 → 카드 풀스크린 진입(7.3s)과 동시
             "cap": {"size": 54, "stroke": 3, "y": 1210, "every": 1.5},
             "cta": {"size": 60, "y": (1110, 1210)}, "brand_y": 1330},
    "ghost": {"band": (0.22, 0.78), "cap": {"size": 52, "stroke": 3, "y_pct": 0.48},
              "cta": {"size": 60, "y": (1230, 1300), "at": 0.2, "dim_last": 1.5}, "brand_y": 1340, "xfade": 0.4},
    "screen": {"hook": {"size": 68, "stroke": 4, "y": 204, "until": 8.0},
               "cap": {"size": 52, "stroke": 3, "y": 1210, "every": 2.5},
               "cta": {"size": 60, "y": (1110, 1210), "t": 22.0}, "brand_y": 1250,
               "cursor": {"r": 34, "alpha": 0.35, "pop": 0.15, "pop_scale": 1.3}, "hl": {"line": 6, "radius": 18},
               "pause": 0.6, "blur_speed": 2200},
    "cap_scale": 1080 / 1170,                                # dpr3 캡처(390×3) → 폰 풀스크린 폭 1080
}

FORBIDDEN = ("구매", "결제", "할인", "원")                    # 카피 금지어(§5) — 텍스트 레이어 문자열 기준
CLIP = {k: f"{CLIPS}/{k}" for k in ()}
CLIP = {
    "a1_front": f"{CLIPS}/a1_front_7s_1080.mp4", "a2_money": f"{CLIPS}/a2_money_7s_1080.mp4",
    "a3_thread": f"{CLIPS}/a3_thread_7s_1080.mp4", "a6_snap": f"{CLIPS}/a6_snap_7s_720_static.mp4",
    "a7_close": f"{CLIPS}/a7_close_7s_1080.mp4", "a8_ganji": f"{CLIPS}/a8_ganji_7s_1x1_2k.mp4",
    "a9_stand": f"{CLIPS}/a9_stand_7s_1080.mp4", "b2_slap": f"{CLIPS}/b2_slap_5s_1080.mp4",
}
STILL = {"t2-read": f"{PUB}/t2-read.webp", "t3-snap": f"{PUB}/t3-snap.webp", "cover": f"{PUB}/cover.webp", "altar": f"{PUB}/altar.webp"}


# ───────────────────────────── 공용 ─────────────────────────────
def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def run(cmd, quiet=True):
    """ffmpeg 실행. 실패하면 stderr 꼬리를 붙여 예외."""
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError("cmd failed: " + " ".join(str(c) for c in cmd[:12]) + " ...\n" + r.stderr.decode("utf-8", "replace")[-3000:])
    return r


def ffdur(path):
    r = subprocess.run([FF, "-hide_banner", "-i", path], capture_output=True)
    m = re.search(rb"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    if not m:
        raise RuntimeError("no duration: " + path)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def ffinfo(path):
    r = subprocess.run([FF, "-hide_banner", "-i", path], capture_output=True)
    s = r.stderr.decode("utf-8", "replace")
    m = re.search(r"Video: .*? (\d{3,4})x(\d{3,4})", s)
    f = re.search(r"([\d.]+) fps", s)
    return {"dur": ffdur(path), "w": int(m.group(1)) if m else 0, "h": int(m.group(2)) if m else 0,
            "fps": float(f.group(1)) if f else 0, "audio": "Audio:" in s, "mb": os.path.getsize(path) / 1048576}


def lin(a, b, t):
    return a + (b - a) * t


def ease(t):
    """ease-in-out(cubic)"""
    t = max(0.0, min(1.0, t))
    return 4 * t * t * t if t < 0.5 else 1 - ((-2 * t + 2) ** 3) / 2


_FONTS = {}
SYMBOL_FALLBACK = set("⬇⬆➜▸►◀▶")            # 맑은고딕·바탕에 없는 글리프 → Segoe UI Symbol(실측: ⬇ 가 네모로 찍혔다)
SYMBOL_FONT = "C:/Windows/Fonts/seguisym.ttf"


def font(kind, size):
    key = (kind, size)
    if key not in _FONTS:
        path = SYMBOL_FONT if kind == "symbol" else CONFIG["fonts"][kind]
        _FONTS[key] = ImageFont.truetype(path, size, index=0)
    return _FONTS[key]


def runs_with_fallback(text, color, f, size):
    """한 세그먼트를 (text, color, font) 런으로 — 기호 글리프만 대체 폰트로."""
    out = []
    cur = ""
    cur_sym = None
    for ch in text:
        is_sym = ch in SYMBOL_FALLBACK
        if cur and is_sym != cur_sym:
            out.append((cur, color, font("symbol", size) if cur_sym else f))
            cur = ""
        cur += ch
        cur_sym = is_sym
    if cur:
        out.append((cur, color, font("symbol", size) if cur_sym else f))
    return out


def Y(ratio, y):
    """9:16 px → 비율별 px(같은 %)."""
    return int(round(y * CONFIG["H"][ratio] / 1920))


def canvas(ratio):
    return CONFIG["W"], CONFIG["H"][ratio]


# ───────────────────────────── 캡처: 조각 잇기 + 블록 자르기 ─────────────────────────────
def stitch_chunks(prefix):
    """cap_page.mjs 조각(<prefix>_NN.png + <prefix>.json) → 한 장. (scrollY 기준으로 붙인다)"""
    j = json.load(open(prefix + ".json", encoding="utf-8"))
    dpr = j["dpr"]
    W = j["width"] * dpr
    y0 = j["parts"][0]["scrollY"]
    y1 = j["parts"][-1]["scrollY"] + j["parts"][-1]["h"]
    out = Image.new("RGB", (W, int(round((y1 - y0) * dpr))), (0, 0, 0))
    for p in j["parts"]:
        im = Image.open(p["file"]).convert("RGB")
        out.paste(im, (0, int(round((p["scrollY"] - y0) * dpr))))
    return out, j, y0


def build_captures():
    """TMP/cap 의 조각 → 재료/캡처/*.png (풀페이지 + 블록) + caps_index.json(좌표는 CSS px, 페이지 기준)."""
    idx = {}
    plan = {  # 이름: (조각 prefix, 저장명)
        "home": ("home916", "cap_home_full.png"),
        "gate916": ("gate693", "cap_gate_9x16.png"), "gate45": ("gate487", "cap_gate_4x5.png"),
        "input916": ("input693", "cap_input_birth_9x16.png"), "input45": ("input487", "cap_input_birth_4x5.png"),
        "teaser": ("teaser", "cap_teaser_full.png"), "result": ("result", "cap_result_full.png"),
        "partner5": ("partner5", "cap_result_partner_card_x5.png"), "money5": ("money5", "cap_result_money_chapter_x5.png"),
    }
    for key, (prefix, name) in plan.items():
        im, j, y0 = stitch_chunks(f"{TMP}/cap/{prefix}")
        im.save(f"{CAPS}/{name}")
        idx[key] = {"file": name, "dpr": j["dpr"], "css_w": j["width"], "css_y0": y0, "css_h": im.height / j["dpr"], "rects": j.get("rects") or {}}
        log("stitched", name, im.size)
    # 블록 잘라내기(설명적 이름) — 좌표는 rects(CSS px) × dpr
    t = idx["teaser"]
    r = t["rects"]["past_panel"]
    im = Image.open(f"{CAPS}/cap_teaser_full.png")
    d = t["dpr"]
    im.crop((0, int((r[1] - 24) * d), im.width, int((r[1] + r[3] + 24) * d))).save(f"{CAPS}/cap_teaser_past_year_block.png")
    im.crop((0, 0, im.width, int(693 * d))).save(f"{CAPS}/cap_teaser_top_9x16.png")
    rs = idx["result"]
    im = Image.open(f"{CAPS}/cap_result_full.png")
    d = rs["dpr"]
    im.crop((0, 0, im.width, int(693 * d))).save(f"{CAPS}/cap_result_cover_9x16.png")
    m = rs["rects"]["money_h3"]
    im.crop((0, int((m[1] - 40) * d), im.width, int((m[1] + 660) * d))).save(f"{CAPS}/cap_result_money_chapter.png")
    p = idx["partner5"]
    im = Image.open(f"{CAPS}/cap_result_partner_card_x5.png")
    d = p["dpr"]
    card = p["rects"]["partner_card"]
    face = p["rects"]["face"]
    oy = p["css_y0"]
    im.crop((int((card[0] - 6) * d), int((card[1] - oy - 6) * d), int((card[0] + card[2] + 6) * d), int((card[1] - oy + card[3] + 6) * d))).save(f"{CAPS}/cap_partner_card.png")
    mg = 14
    im.crop((int((face[0] - mg) * d), int((face[1] - oy - mg) * d), int((face[0] + face[2] + mg) * d), int((face[1] - oy + face[3] + mg) * d))).save(f"{CAPS}/cap_partner_face.png")
    mo = idx["money5"]
    im = Image.open(f"{CAPS}/cap_result_money_chapter_x5.png")
    d = mo["dpr"]
    mh = mo["rects"]["money_h3"]
    oy = mo["css_y0"]
    im.crop((int((mh[0] - 8) * d), int((mh[1] - oy - 24) * d), int((mh[0] + mh[2] + 8) * d), int((mh[1] - oy + 560) * d))).save(f"{CAPS}/cap_result_money_chapter_x5_crop.png")
    json.dump(idx, open(f"{CAPS}/caps_index.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    log("captures ->", CAPS)
    return idx


def write_overlay_pngs():
    """캡컷용 빨간 표시 PNG(투명): 동그라미 r90 선 8 · 밑줄 → 재료/클립/."""
    C = CONFIG["colors"]["RED"]
    im = Image.new("RGBA", (220, 220), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((20, 20, 200, 200), outline=(*C, 235), width=8)
    im.save(f"{CLIPS}/overlay_red_circle_r90.png")
    im = Image.new("RGBA", (720, 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # 손으로 그은 느낌: 살짝 기울고 끝이 굵다
    pts = [(12, 22), (200, 18), (420, 24), (708, 16)]
    d.line(pts, fill=(*C, 235), width=8, joint="curve")
    d.line([(16, 30), (260, 28), (520, 33), (700, 28)], fill=(*C, 150), width=4, joint="curve")
    im.save(f"{CLIPS}/overlay_red_underline.png")
    im = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((60, 520, 1020, 1480), radius=28, outline=(*CONFIG["colors"]["GOLD"], 120), width=3)
    d.text((80, 1490), "카톡 캡처 자리(가이드) — 이 PNG 는 안내용, 영상엔 없음", font=font("gothic", 28), fill=(*CONFIG["colors"]["GOLD"], 160))
    im.save(f"{CLIPS}/overlay_vF_kakao_guide.png")


def caps_index():
    p = f"{CAPS}/caps_index.json"
    if not os.path.exists(p):
        return build_captures()
    return json.load(open(p, encoding="utf-8"))


# ───────────────────────────── 텍스트 레이어(PIL) ─────────────────────────────
def parse_rich(s, base, accent):
    """'*단어*' 는 GOLD. → [(text, color)]"""
    segs = []
    for i, part in enumerate(s.split("*")):
        if part:
            segs.append((part, accent if i % 2 == 1 else base))
    return segs


def wrap_plain(text, f, maxw):
    out, line = [], ""
    for ch in text:
        if ch == "\n":
            out.append(line)
            line = ""
            continue
        t = line + ch
        if f.getlength(t) > maxw and line:
            # 조사·구두점이 줄머리에 오지 않게 한 글자 정도는 앞 줄에 붙인다
            out.append(line.rstrip())
            line = ch.lstrip()
        else:
            line = t
    if line:
        out.append(line)
    return out


def render_text_layer(W, H, lines, fkind, size, color, y, stroke=3, align="center", x=None, lh=1.2, accent=None,
                      glow=None, box=None, shadow=True, letter=0, bold=0, hl=None):
    """투명 PNG 한 장(전체 캔버스). lines = 문자열 목록(각각 '*골드*' 마크업 가능).
    box = dict(pad=(px,py), alpha, radius, border) → 글 뒤 검정 반투명 박스. glow = (color, blur, alpha).
    반환 (Image, bbox(x0,y0,x1,y1))."""
    accent = accent or CONFIG["colors"]["GOLD"]
    f = font(fkind, size)
    ascent, descent = f.getmetrics()
    line_h = int(round(size * lh))
    rich = [[r for t, c in parse_rich(s, color, accent) for r in runs_with_fallback(t, c, f, size)] for s in lines]
    widths = [sum(rf.getlength(t) for t, _, rf in segs) + letter * max(0, sum(len(t) for t, _, _ in segs) - 1) for segs in rich]
    block_w = max(widths) if widths else 0
    block_h = line_h * len(lines)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if box:
        px, py = box.get("pad", (36, 14))
        px = int(max(14, min(px, (960 - block_w) / 2)))   # 박스는 x 60~1020 안에(세이프존)
        bx0 = int((W - block_w) / 2 - px) if align == "center" else int((x or 80) - px)
        bx1 = int(bx0 + block_w + 2 * px)
        by0 = int(y - py)
        by1 = int(y + block_h + py)
        bd = ImageDraw.Draw(layer)
        bd.rounded_rectangle((bx0, by0, bx1, by1), radius=box.get("radius", 20), fill=(0, 0, 0, int(255 * box.get("alpha", 0.7))),
                             outline=(*CONFIG["colors"]["GOLD"], 255) if box.get("border") else None, width=box.get("border", 0))
    sh = CONFIG["text"]["shadow"]
    # 1) 그림자(블러) 2) 외곽선 3) 본문 — 외곽선을 먼저 전부 그려야 뒤 글자 외곽선이 앞 글자 속을 덮지 않는다
    txt = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(txt)
    bbox = [W, H, 0, 0]
    pos = []
    for i, segs in enumerate(rich):
        ly = y + i * line_h
        lx = (W - widths[i]) / 2 if align == "center" else (x if x is not None else 80)
        cx = lx
        for t, c, rf in segs:
            pos.append((cx, ly, t, c, rf))
            cx += rf.getlength(t) + letter * len(t)
        bbox[0] = min(bbox[0], int(lx) - stroke)
        bbox[2] = max(bbox[2], int(lx + widths[i]) + stroke)
    bbox[1] = y - stroke
    bbox[3] = y + block_h + stroke
    if hl:
        # ⚠ 촛불 앰버 배경에선 주황 계열 **글자색** 강조가 통째로 묻힌다(v6 첫·둘째 렌더 실측).
        #   그래서 W2 처럼 색 글씨를 쓰지 않고, 우리 결과지의 형광(주사색 배경 + 흰 글씨) 문법을 그대로 쓴다.
        hd = ImageDraw.Draw(layer)
        for cx, ly, t, c, rf in pos:
            if c != accent:
                continue
            wpx = rf.getlength(t) + letter * len(t)
            hd.rounded_rectangle((cx - 10, ly + int(size * 0.10), cx + wpx + 10, ly + int(size * 1.10)),
                                 radius=int(size * 0.16), fill=(*hl, 235))
    if glow:
        gc, gb, ga = glow
        g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(g)
        for cx, ly, t, c, rf in pos:
            gd.text((cx, ly), t, font=rf, fill=(*gc, int(255 * ga)), stroke_width=max(2, stroke), stroke_fill=(*gc, int(255 * ga)))
        g = g.filter(ImageFilter.GaussianBlur(gb))
        layer.alpha_composite(g)
        layer.alpha_composite(g)
    if shadow:
        s = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sd = ImageDraw.Draw(s)
        for cx, ly, t, c, rf in pos:
            sd.text((cx + sh["dx"], ly + sh["dy"]), t, font=rf, fill=(0, 0, 0, int(255 * sh["alpha"])), stroke_width=stroke, stroke_fill=(0, 0, 0, int(255 * sh["alpha"])))
        s = s.filter(ImageFilter.GaussianBlur(sh["blur"]))
        layer.alpha_composite(s)
    if stroke > 0:
        for cx, ly, t, c, rf in pos:
            d.text((cx, ly), t, font=rf, fill=(0, 0, 0, 255), stroke_width=stroke + bold, stroke_fill=(0, 0, 0, 255))
    for cx, ly, t, c, rf in pos:
        cc = CONFIG["colors"]["WHITE"] if (hl and c == accent) else c
        d.text((cx, ly), t, font=rf, fill=(*cc, 255), stroke_width=bold, stroke_fill=(*cc, 255))
    layer.alpha_composite(txt)
    if box:
        bbox = [min(bbox[0], bx0), min(bbox[1], by0), max(bbox[2], bx1), max(bbox[3], by1)]
    return layer, tuple(bbox)


def scrim_layer(W, H, top, h, a):
    """훅 밴드 밑 검정 스크림(위 a → 아래 0)."""
    g = Image.new("L", (1, H), 0)
    px = g.load()
    for yy in range(H):
        if top <= yy < top + h:
            px[0, yy] = int(255 * a * (1 - (yy - top) / h) ** 1.2)
        elif yy < top:
            px[0, yy] = int(255 * a)
    mask = g.resize((W, H))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.putalpha(mask)
    return layer


def dim_layer(W, H, a):
    return Image.new("RGBA", (W, H), (0, 0, 0, int(255 * a)))


def bar_layer(W, H, y, h, a=0.45, w=840, radius=18):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0 = (W - w) // 2
    d.rounded_rectangle((x0, y, x0 + w, y + h), radius=radius, fill=(0, 0, 0, int(255 * a)), outline=(*CONFIG["colors"]["GOLD"], 90), width=2)
    return layer


# ───────────────────────────── 컷 렌더(배경) ─────────────────────────────
def qsv_args(gq, preset="veryfast"):
    return ["-c:v", "h264_qsv", "-preset", preset, "-global_quality", str(gq), "-pix_fmt", "nv12"]


def bg_filter(ratio, fit="cover", anchor=0.5, src_w=1080, src_h=1920):
    """소스 → 캔버스. cover: 폭 1080 맞춘 뒤 세로 중앙 크롭(4:5 = y285~1635). band: 레터박스 띠 안에 cover 후 위아래 검정."""
    W, H = canvas(ratio)
    if fit == "cover":
        sw = W
        sh = int(round(src_h * W / src_w))
        if sh < H:  # 1:1 등 세로가 모자라면 높이 기준
            sh = H
            sw = int(round(src_w * H / src_h))
        cy = int(round((sh - H) * (CONFIG["bg_crop45_y"] / (1920 - 1350) if ratio == "4x5" and src_w == 1080 and src_h == 1920 else anchor)))
        cx = (sw - W) // 2
        return f"scale={sw}:{sh}:flags=lanczos,crop={W}:{H}:{cx}:{cy}"
    b0, b1 = CONFIG["ghost"]["band"]
    by0 = int(round(H * b0))
    bh = int(round(H * b1)) - by0
    sh = int(round(src_h * W / src_w))
    cy = int(round((sh - bh) * anchor))
    return f"scale={W}:{sh}:flags=lanczos,crop={W}:{bh}:0:{cy},pad={W}:{H}:0:{by0}:black"


def render_loop_cut(out, ratio, src, dur, ss=0.0, fit="cover", anchor=0.5, hold_after=None):
    """루프 클립 → 캔버스 크기 컷(dur 초). hold_after: 그 초 이후는 마지막 프레임 정지(b2_slap 2.8s 규칙)."""
    W, H = canvas(ratio)
    info = ffinfo(src)
    vf = bg_filter(ratio, fit, anchor, info["w"], info["h"]) + f",fps={CONFIG['fps']}"
    if hold_after is not None and dur > hold_after:
        cmd = [FF, "-y", "-loglevel", "error", "-t", f"{hold_after:.3f}", "-i", src,
               "-vf", vf + f",tpad=stop_mode=clone:stop_duration={dur - hold_after + 0.5:.3f}", "-t", f"{dur:.3f}", "-an", *qsv_args(CONFIG["enc"]["gq_mid"]), out]
    else:
        cmd = [FF, "-y", "-loglevel", "error", "-stream_loop", "-1", "-ss", f"{ss:.3f}", "-i", src, "-t", f"{dur:.3f}",
               "-vf", vf, "-an", *qsv_args(CONFIG["enc"]["gq_mid"]), out]
    run(cmd)
    return out


def pipe_frames(out, W, H, frames, gq=None):
    """PIL/numpy 프레임 → rawvideo 파이프 → h264_qsv."""
    cmd = [FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(CONFIG["fps"]), "-i", "-",
           "-an", *qsv_args(gq or CONFIG["enc"]["gq_mid"]), out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    n = 0
    try:
        for fr in frames:
            if isinstance(fr, Image.Image):
                fr = np.asarray(fr.convert("RGB"))
            p.stdin.write(np.ascontiguousarray(fr, dtype=np.uint8).tobytes())
            n += 1
    finally:
        p.stdin.close()
        err = p.stderr.read().decode("utf-8", "replace")
        p.wait()
    if p.returncode != 0:
        raise RuntimeError("pipe encode failed: " + err[-2000:])
    return n


def pad_still_916(img, W=1080, H=1920):
    """4:5 정지컷 → 9:16: 가장자리 연장(cover 블러) + 원본 가운데(8/23 방식)."""
    r = max(W / img.width, H / img.height)
    bg = img.resize((int(img.width * r) + 1, int(img.height * r) + 1), Image.LANCZOS)
    bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2, (bg.width - W) // 2 + W, (bg.height - H) // 2 + H))
    bg = bg.filter(ImageFilter.GaussianBlur(40))
    bg = Image.eval(bg, lambda v: int(v * 0.55))
    fw = W
    fh = int(round(img.height * W / img.width))
    if fh > H:
        fh = H
        fw = int(round(img.width * H / img.height))
    fg = img.resize((fw, fh), Image.LANCZOS)
    bg.paste(fg, ((W - fw) // 2, (H - fh) // 2))
    return bg


def still_frames(img916, ratio, dur, move=None, fit="cover", anchor=0.5):
    """9:16 정지 이미지(1080×1920 이상) → 푸시인 프레임. move=(z0,z1). fit=band 면 레터박스."""
    W, H = canvas(ratio)
    n = int(round(dur * CONFIG["fps"]))
    if fit == "band":
        b0, b1 = CONFIG["ghost"]["band"]
        by0 = int(round(H * b0))
        bh = int(round(H * b1)) - by0
        sh = int(round(img916.height * W / img916.width))
        im = img916.resize((W, sh), Image.LANCZOS)
        cy = int(round((sh - bh) * anchor))
        band = im.crop((0, cy, W, cy + bh))
        base = Image.new("RGB", (W, H), (0, 0, 0))
        base.paste(band, (0, by0))
        src = base
        # 푸시인은 띠 안에서만(띠 이미지를 확대)
        for i in range(n):
            z = lin(move[0], move[1], i / max(1, n - 1)) if move else 1.0
            if z == 1.0:
                yield np.asarray(base)
                continue
            cw, ch = bh_w(band.width, z), bh_w(band.height, z)
            x0 = (band.width - cw) / 2
            y0 = (band.height - ch) / 2
            bb = band.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((band.width, band.height), Image.BILINEAR)
            fr = base.copy()
            fr.paste(bb, (0, by0))
            yield np.asarray(fr)
        return
    # cover: 9:16 소스 → 캔버스(4:5 는 y 285~1635)
    if ratio == "4x5":
        src = img916.resize((W, 1920), Image.LANCZOS).crop((0, CONFIG["bg_crop45_y"], W, CONFIG["bg_crop45_y"] + H))
    else:
        src = img916.resize((W, H), Image.LANCZOS)
    # 확대 시 품질 위해 1.3배 원본을 들고 크롭
    big = img916.resize((int(W * 1.3), int(img916.height * W * 1.3 / img916.width)), Image.LANCZOS)
    if ratio == "4x5":
        big = big.crop((0, int(CONFIG["bg_crop45_y"] * 1.3), big.width, int((CONFIG["bg_crop45_y"] + H) * 1.3)))
    for i in range(n):
        z = lin(move[0], move[1], i / max(1, n - 1)) if move else 1.0
        if z == 1.0:
            yield np.asarray(src)
            continue
        cw = big.width / z
        ch = big.height / z
        x0 = (big.width - cw) / 2
        y0 = (big.height - ch) / 2
        yield np.asarray(big.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((W, H), Image.BILINEAR))


def bh_w(v, z):
    return int(v / z)


# ───────────────────────────── 폰 화면 녹화(스크롤 클립) ─────────────────────────────
class Page:
    """폭 1080 으로 맞춘 페이지 이미지 + CSS→px 변환."""

    def __init__(self, path, css_w, dpr, css_y0=0.0, scale_to=1080, crop_css_x=None):
        im = Image.open(path).convert("RGB")
        self.dpr = dpr
        self.css_y0 = css_y0
        if crop_css_x:  # (x0,x1) CSS px 로 가로 자르기(카드만 풀폭으로)
            im = im.crop((int(crop_css_x[0] * dpr), 0, int(crop_css_x[1] * dpr), im.height))
            self.css_x0 = crop_css_x[0]
            css_w = crop_css_x[1] - crop_css_x[0]
        else:
            self.css_x0 = 0
        self.s = scale_to / (css_w * dpr)         # 캡처 px → 페이지 px
        self.k = scale_to / css_w                 # CSS px → 페이지 px
        self.im = im.resize((scale_to, int(round(im.height * self.s))), Image.LANCZOS)
        self.W = self.im.width
        self.H = self.im.height

    def px(self, css_x, css_y):
        return (css_x - self.css_x0) * self.k, (css_y - self.css_y0) * self.k

    def rect(self, r):
        """CSS rect [x,y,w,h] → 페이지 px (x,y,w,h)"""
        x, y = self.px(r[0], r[1])
        return x, y, r[2] * self.k, r[3] * self.k


def scroll_frames(page, ratio, dur, keys, taps=(), hls=(), zoom=None, start_black=0.0):
    """keys=[(t, scrollY_px)] 구간마다 ease-in-out. taps=[(t, x, y)] 페이지 px. hls=[(x,y,w,h,t0,t1)] 빨간 둥근 박스.
    zoom=(z0, z1, cx, cy): 페이지 px 기준점 중심으로 천천히 확대(컷 길이 동안 선형)."""
    W, H = canvas(ratio)
    fps = CONFIG["fps"]
    n = int(round(dur * fps))
    cur = CONFIG["screen"]["cursor"]
    hl = CONFIG["screen"]["hl"]
    keys = sorted(keys)
    maxy = max(0, page.H - H)

    def sy_at(t):
        if t <= keys[0][0]:
            return keys[0][1]
        for (t0, y0), (t1, y1) in zip(keys, keys[1:]):
            if t0 <= t <= t1:
                return lin(y0, y1, ease((t - t0) / (t1 - t0))) if t1 > t0 else y1
        return keys[-1][1]

    # 빨간 박스·커서는 페이지 좌표에 붙어 같이 움직인다
    cursor_img = {}

    def cursor(scale):
        key = round(scale, 2)
        if key not in cursor_img:
            r = int(cur["r"] * scale)
            c = Image.new("RGBA", (r * 2 + 4, r * 2 + 4), (0, 0, 0, 0))
            ImageDraw.Draw(c).ellipse((2, 2, 2 + 2 * r, 2 + 2 * r), fill=(255, 255, 255, int(255 * cur["alpha"])), outline=(255, 255, 255, 140), width=2)
            cursor_img[key] = c
        return cursor_img[key]

    for i in range(n):
        t = i / fps
        sy = max(0, min(maxy, sy_at(t)))
        # 빠른 플릭 구간은 3점 평균으로 모션블러(프레임 단위 점프가 덜 보인다)
        v = abs(sy_at(t + 1 / fps) - sy_at(t - 1 / fps)) * fps / 2
        if v > CONFIG["screen"]["blur_speed"]:
            ns = int(max(4, min(14, v / 500)))
            acc = np.zeros((H, W, 3), np.float32)
            for j in range(ns):
                dt = (j / (ns - 1) - 0.5) / fps
                syy = max(0, min(maxy, sy_at(t + dt)))
                acc += np.asarray(page.im.crop((0, int(syy), W, int(syy) + H)), np.float32)
            fr = Image.fromarray((acc / ns).astype(np.uint8))
        else:
            fr = page.im.crop((0, int(round(sy)), W, int(round(sy)) + H))
        if fr.height < H:
            base = Image.new("RGB", (W, H), (10, 9, 8))
            base.paste(fr, (0, 0))
            fr = base
        if hls or taps:
            fr = fr.convert("RGBA")
            d = ImageDraw.Draw(fr)
            for (hx, hy, hw, hh, t0, t1) in hls:
                if t0 <= t <= t1:
                    pop = min(1.0, (t - t0) / 0.15)
                    grow = 1 + 0.08 * (1 - pop)
                    cx, cy = hx + hw / 2, hy + hh / 2 - sy
                    ww, hh2 = hw * grow, hh * grow
                    a = int(255 * pop)
                    d.rounded_rectangle((cx - ww / 2, cy - hh2 / 2, cx + ww / 2, cy + hh2 / 2), radius=hl["radius"], outline=(*CONFIG["colors"]["RED"], a), width=hl["line"])
            for (tt, tx, ty) in taps:
                if tt - 0.35 <= t <= tt + 0.45:
                    sc = 1.0
                    if tt <= t <= tt + cur["pop"]:
                        sc = lin(1.0, cur["pop_scale"], (t - tt) / cur["pop"])
                    elif t > tt + cur["pop"]:
                        sc = cur["pop_scale"]
                    c = cursor(sc)
                    fr.alpha_composite(c, (int(tx - c.width / 2), int(ty - sy - c.height / 2)))
            fr = fr.convert("RGB")
        if zoom:
            z0, z1, cx, cy = zoom
            z = lin(z0, z1, i / max(1, n - 1))
            if z != 1.0:
                cw, ch = W / z, H / z
                x0 = min(max(0, cx - cw / 2), W - cw)
                y0 = min(max(0, (cy - sy) - ch / 2), H - ch)
                fr = fr.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((W, H), Image.BILINEAR)
        if start_black and t < start_black:
            fr = Image.eval(fr, lambda v: int(v * (t / start_black)))
        yield np.asarray(fr)


# ───────────────────────────── 타임라인·컷 렌더 ─────────────────────────────
def timeline(cuts):
    """cuts[i] = {d, xfade(이 컷으로 들어오는 전환)} → (t_i, 렌더길이 r_i). 전환은 경계 중심 ±x/2 → r_i = d + x_in/2 + x_out/2."""
    t = 0.0
    out = []
    for i, c in enumerate(cuts):
        x_in = c.get("xfade", 0.0) if i > 0 else 0.0
        x_out = cuts[i + 1].get("xfade", 0.0) if i + 1 < len(cuts) else 0.0
        out.append({"t0": t, "t1": t + c["d"], "r": c["d"] + x_in / 2 + x_out / 2, "x_in": x_in})
        t += c["d"]
    return out, t


def render_cut(story_id, ratio, i, cut, r, pages, prep):
    """컷 하나 → TMP/cuts/… mp4 (길이 r). kind: loop | still | scroll | black | image"""
    W, H = canvas(ratio)
    out = f"{TMP}/cuts/{story_id}_{ratio}_{i:02d}.mp4"
    k = cut["kind"]
    if k == "loop":
        render_loop_cut(out, ratio, CLIP[cut["src"]], r, ss=cut.get("ss", 0.0), fit=cut.get("fit", "cover"), anchor=cut.get("anchor", 0.5), hold_after=cut.get("hold_after"))
    elif k == "still":
        img = prep[cut["src"]]
        pipe_frames(out, W, H, still_frames(img, ratio, r, cut.get("move"), cut.get("fit", "cover"), cut.get("anchor", 0.5)))
    elif k == "scroll":
        pg = pages[cut["page"]]
        spec = cut["build"](pg, ratio, r)  # → dict(keys, taps, hls, zoom)
        pipe_frames(out, W, H, scroll_frames(pg, ratio, r, spec["keys"], spec.get("taps", ()), spec.get("hls", ()), spec.get("zoom")))
    elif k == "black":
        col = cut.get("color", (11, 10, 12))
        pipe_frames(out, W, H, (np.full((H, W, 3), col, np.uint8) for _ in range(int(round(r * CONFIG["fps"])))))
    else:
        raise ValueError(k)
    return out


def concat_cuts(story_id, ratio, files, tl):
    """xfade(경계 중심)·하드컷 concat 을 filter_complex 한 번에."""
    out = f"{TMP}/cuts/{story_id}_{ratio}_base.mp4"
    if len(files) == 1:
        shutil.copy(files[0], out)
        return out
    parts = []
    for i, f in enumerate(files):
        # settb=AVTB: concat 출력(1/1000000)과 fps 출력(1/30)의 타임베이스가 섞이면 xfade 가 거부한다(실측)
        parts.append(f"[{i}:v]format=yuv420p,setpts=PTS-STARTPTS,fps={CONFIG['fps']},settb=AVTB[v{i}]")
    cur = "v0"
    acc = tl[0]["r"]
    for i in range(1, len(files)):
        x = tl[i]["x_in"]
        nxt = f"m{i}"
        if x > 0:
            parts.append(f"[{cur}][v{i}]xfade=transition=fade:duration={x:.3f}:offset={acc - x:.3f}[{nxt}]")
            acc += tl[i]["r"] - x
        else:
            parts.append(f"[{cur}][v{i}]concat=n=2:v=1:a=0[{nxt}]")
            acc += tl[i]["r"]
        cur = nxt
    cmd = [FF, "-y", "-loglevel", "error"]
    for f in files:
        cmd += ["-i", f]
    cmd += ["-filter_complex", ";".join(parts), "-map", f"[{cur}]", "-an", *qsv_args(CONFIG["enc"]["gq_mid"]), out]
    run(cmd)
    return out


# ───────────────────────────── 텍스트 요소 → PNG + overlay ─────────────────────────────
def build_text_layers(story_id, ratio, texts, dur):
    """texts: [{kind, text, t0, t1, y, ...}] → [(png, t0, t1, fade_in, fade_out, rise, bbox, kind)].
    4:5 는 같은 % 로 내려앉히되, 같은 시간에 떠 있는 요소끼리 세로로 겹치면 아래 요소를 밀어 내린다(훅 2줄↔서브 등)."""
    W, H = canvas(ratio)
    C = CONFIG["colors"]
    safe = CONFIG["safe"][ratio]
    layers = []
    placed = []   # (bbox, t0, t1)

    def render(e, y):
        kind = e["kind"]
        if kind == "hook":
            lines = e["text"].split("\n")
            return render_text_layer(W, H, lines, "myeongjo", e.get("size", 72), C["WHITE"], y, stroke=e.get("stroke", 4), lh=1.15, bold=2,
                                     box={"pad": (34, 16), "alpha": 0.62, "radius": 18} if e.get("box") else None)
        if kind == "sub":
            return render_text_layer(W, H, [e["text"]], "myeongjo", e.get("size", 44), C["GOLD"], y, stroke=e.get("stroke", 3), lh=1.2, bold=1)
        if kind == "item":
            f = font("gothic_b", e.get("size", 44))
            lines = wrap_plain(e["text"], f, e.get("maxw", 840))
            return render_text_layer(W, H, lines, "gothic_b", e.get("size", 44), C["WHITE"], y, stroke=e.get("stroke", 3), lh=1.22)
        if kind == "caption":
            fk = e.get("font", "myeongjo")
            f = font(fk, e.get("size", 52))
            lines = wrap_plain(e["text"], f, e.get("maxw", CONFIG["text"]["maxw"]))
            return render_text_layer(W, H, lines, fk, e.get("size", 52), C["WHITE"], y, stroke=e.get("stroke", 3), lh=1.25, bold=1 if fk == "myeongjo" else 0,
                                     accent=C.get(e["accent"]) if e.get("accent") else None,
                                     hl=C.get(e["hl"]) if e.get("hl") else None)
        if kind == "cta_box":
            size = e.get("size", 40)
            bh = Y(ratio, e["y"][1]) - Y(ratio, e["y"][0])
            lh = 1.2
            ty = y + (bh - int(size * lh)) // 2
            pad_y = max(8, (bh - int(size * lh)) // 2)
            return render_text_layer(W, H, [e["text"]], "gothic_b", size, C["WHITE"], ty, stroke=0, lh=lh,
                                     box={"pad": (40, pad_y), "alpha": 0.72, "radius": 22, "border": 2}, shadow=False)
        if kind == "cta_glow":
            return render_text_layer(W, H, [e["text"]], "myeongjo", e.get("size", 60), C["GOLD"], y, stroke=3, lh=1.15, glow=(C["GOLD"], 18, 0.55), bold=2)
        if kind == "brand":
            return render_text_layer(W, H, [e.get("text", "명운록 · 박수무당 사주")], "gothic", e.get("size", 36), C["GOLD"], y, stroke=3, lh=1.2,
                                     align=e.get("align", "center"), x=80)
        if kind == "label":
            return render_text_layer(W, H, [e["text"]], "gothic", e.get("size", 38), C["SOFT"], y, stroke=2, lh=1.2,
                                     box={"pad": (22, 10), "alpha": 0.55, "radius": 12}, shadow=False)
        if kind == "bar":
            h = e.get("h", 110)
            return bar_layer(W, H, y, h), ((W - 840) // 2, y, (W + 840) // 2, y + h)
        if kind == "dim":
            return dim_layer(W, H, e.get("a", 0.6)), None
        if kind == "scrim":
            sc = CONFIG["scrim"]
            return scrim_layer(W, H, Y(ratio, sc["top"]), Y(ratio, sc["h"]), sc["a"]), None
        raise ValueError(kind)

    for n, e in enumerate(texts):
        kind = e["kind"]
        yv = e.get("y", 0)
        if e.get("y_pct"):
            y = int(round(H * e["y_pct"]))
        elif isinstance(yv, (tuple, list)):
            y = Y(ratio, yv[0])
        else:
            y = Y(ratio, yv)
        t0, t1 = e.get("t0", 0.0), min(dur, e.get("t1", dur))
        img, bbox = render(e, y)
        if bbox and kind not in ("dim", "scrim"):
            gap = 12
            for _ in range(6):   # 겹침 해소(밀어 내리기) — 같은 시간대·세로 겹침만
                push = 0
                for pb, pt0, pt1 in placed:
                    if pt0 < t1 and t0 < pt1 and bbox[0] < pb[2] and pb[0] < bbox[2] and bbox[1] < pb[3] + gap and bbox[3] > pb[1] - gap:
                        push = max(push, pb[3] + gap - bbox[1])
                if push <= 0:
                    break
                y += int(push)
                img, bbox = render(e, y)
            if bbox[3] > safe[1]:   # 세이프존 아래로 밀리면 위 요소 쪽으로 당겨 올린다(한 번만)
                y -= bbox[3] - safe[1]
                img, bbox = render(e, y)
            placed.append((bbox, t0, t1))
        fade_in = e.get("fade", CONFIG["text"]["fade"])
        rise = e.get("rise", CONFIG["text"]["rise"])
        if kind in ("dim", "scrim"):
            rise = 0
            fade_in = e.get("fade", 0.4 if kind == "dim" else 0.0)
        png = f"{TMP}/text/{story_id}_{ratio}_{n:02d}_{kind}.png"
        img.save(png)
        layers.append({"png": png, "t0": t0, "t1": t1, "fade": fade_in, "fade_out": e.get("fade_out", 0.0),
                       "rise": rise, "bbox": bbox, "kind": kind, "text": e.get("text", ""), "y": y,
                       "blink": e.get("blink", 0.0)})
    return layers


def overlay_and_encode(base, layers, audio_wav, out, dur, gq=None):
    """base 영상 + PNG 레이어(enable/fade/rise) + 오디오 → 최종 mp4(h264_qsv ICQ, AAC).
    ffmpeg overlay 체인은 PNG 루프 입력 8개에서 메모리 5GB·4분(실측)이라 버렸다 — 디코드 파이프 → numpy 합성 → 인코드 파이프."""
    info = ffinfo(base)
    W, H = info["w"], info["h"]
    fps = CONFIG["fps"]
    n = int(round(dur * fps))
    L = []
    for l in layers:
        im = np.asarray(Image.open(l["png"]).convert("RGBA"))
        a = im[:, :, 3]
        ys, xs = np.where(a > 0)
        if len(ys) == 0:
            continue
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1
        L.append({"x0": x0, "x1": x1, "y0": y0, "y1": y1, "rgb": im[y0:y1, x0:x1, :3].astype(np.float32),
                  "a": (im[y0:y1, x0:x1, 3].astype(np.float32) / 255.0)[:, :, None],
                  "t0": l["t0"], "t1": l["t1"], "fade": l["fade"], "fade_out": l["fade_out"], "rise": l["rise"],
                  "blink": l.get("blink", 0.0)})
    dec = subprocess.Popen([FF, "-loglevel", "quiet", "-i", base, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    cmd = [FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-"]
    if audio_wav:
        cmd += ["-i", audio_wav, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", CONFIG["aac"]["br"], "-ar", str(CONFIG["aac"]["ar"])]
    else:
        cmd += ["-an"]
    cmd += ["-t", f"{dur:.3f}", *qsv_args(gq or CONFIG["enc"]["gq"], CONFIG["enc"]["preset"]), "-movflags", "+faststart", out]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    nbytes = W * H * 3
    last = None
    try:
        for i in range(n):
            buf = dec.stdout.read(nbytes)
            if len(buf) < nbytes:
                if last is None:
                    raise RuntimeError("base decode gave no frames: " + base)
                fr = last.copy()
            else:
                fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
                last = fr
            t = i / fps
            act = [l for l in L if l["t0"] <= t < l["t1"]]
            if act:
                fr = fr.copy()
                for l in act:
                    k = 1.0
                    if l["fade"] > 0:
                        k = min(1.0, (t - l["t0"]) / l["fade"])
                    if l["fade_out"] > 0 and t > l["t1"] - l["fade_out"]:
                        k = min(k, max(0.0, (l["t1"] - t) / l["fade_out"]))
                    if l["blink"]:      # W2 의 CTA 색 깜빡임 — 우리는 밝기로(주기 1.2s)
                        k *= 0.72 + 0.28 * (0.5 + 0.5 * math.cos(2 * math.pi * (t - l["t0"]) / l["blink"]))
                    dy = int(round(l["rise"] * (1 - min(1.0, (t - l["t0"]) / l["fade"])))) if (l["rise"] and l["fade"] > 0) else 0
                    y0, y1 = l["y0"] + dy, l["y1"] + dy
                    sy0, sy1 = max(0, y0), min(H, y1)
                    if sy1 <= sy0:
                        continue
                    src = fr[sy0:sy1, l["x0"]:l["x1"]].astype(np.float32)
                    a = l["a"][sy0 - y0:sy1 - y0] * k
                    rgb = l["rgb"][sy0 - y0:sy1 - y0]
                    fr[sy0:sy1, l["x0"]:l["x1"]] = (src * (1 - a) + rgb * a).astype(np.uint8)
            enc.stdin.write(fr.tobytes())
    finally:
        enc.stdin.close()
        dec.stdout.close()
        err = enc.stderr.read().decode("utf-8", "replace")
        enc.wait()
        dec.wait()
    if enc.returncode != 0:
        raise RuntimeError("encode failed: " + err[-2000:])
    return out


# ───────────────────────────── 오디오 ─────────────────────────────
def loudnorm_2pass(src, out, dur):
    """loudnorm 2패스(측정→선형 적용) + 끝 0.5s 페이드. 짧은 클립에 동적 모드를 쓰면 출렁인다."""
    L = CONFIG["loud"]
    r = subprocess.run([FF, "-hide_banner", "-i", src, "-af", f"loudnorm=I={L['I']}:TP={L['TP']}:LRA={L['LRA']}:print_format=json", "-f", "null", "-"], capture_output=True)
    s = r.stderr.decode("utf-8", "replace")
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", s, re.S)
    meas = json.loads(m.group(0)) if m else None
    af = f"loudnorm=I={L['I']}:TP={L['TP']}:LRA={L['LRA']}"
    if meas and meas.get("input_i") not in (None, "-inf"):
        af += (f":measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:measured_LRA={meas['input_lra']}"
               f":measured_thresh={meas['input_thresh']}:offset={meas['target_offset']}:linear=true:print_format=summary")
    af += f",afade=t=out:st={max(0, dur - 0.5):.3f}:d=0.5,atrim=0:{dur:.3f}"
    run([FF, "-y", "-loglevel", "error", "-i", src, "-af", af, "-ar", str(CONFIG["aac"]["ar"]), "-ac", "2", out])
    return out


def mix_audio(story_id, ratio, dur, mode, vo=None):
    """mode: bed | voice. bed = gate 타격(0s) + face 드론(aloop). voice = 베드 +12dB LPF 6k + 덕킹 + 나레이션. → TMP/mix/…wav (loudnorm −16)."""
    if mode == "none":
        return None
    raw = f"{TMP}/mix/{story_id}_{ratio}_{mode}_raw.wav"
    out = f"{TMP}/mix/{story_id}_{ratio}_{mode}.wav"
    fo = max(0.1, dur - 0.8)
    hit = "[0:a]atrim=0:3.2,afade=t=out:st=2.0:d=1.2,volume=2dB[hit]"
    bed = f"[1:a]aloop=loop=-1:size=220500,atrim=0:{dur:.3f},afade=t=in:d=0.4,afade=t=out:st={fo:.3f}:d=0.8,volume=12dB,lowpass=f=6000[bed]"
    cmd = [FF, "-y", "-loglevel", "error", "-i", f"{AUDIO}/bed_gate.wav", "-i", f"{AUDIO}/bed_face.wav"]
    if mode == "bed":
        fc = f"{hit};{bed};[hit][bed]amix=inputs=2:normalize=0:dropout_transition=0,atrim=0:{dur:.3f}[a]"
    else:
        # vo = [(file, start_s)] — 컷 시작 +0.3s
        vparts = []
        for i, (f, st) in enumerate(vo):
            cmd += ["-i", f]
            ms = int(round(st * 1000))
            vparts.append(f"[{2 + i}:a]aresample=44100,aformat=channel_layouts=mono,adelay={ms}|{ms},volume=3dB[vo{i}]")
        vmix = "".join(f"[vo{i}]" for i in range(len(vo))) + f"amix=inputs={len(vo)}:normalize=0:dropout_transition=0,apad,atrim=0:{dur:.3f},asplit=2[vs1][vs2]"
        fc = (f"{hit};{bed};" + ";".join(vparts) + ";" + vmix +
              ";[bed][vs1]sidechaincompress=threshold=0.02:ratio=4:attack=40:release=400[bedd]"
              f";[hit][bedd][vs2]amix=inputs=3:normalize=0:dropout_transition=0,atrim=0:{dur:.3f}[a]")
    cmd += ["-filter_complex", fc, "-map", "[a]", "-ar", "44100", "-ac", "2", raw]
    run(cmd)
    return loudnorm_2pass(raw, out, dur)


# ───────────────────────────── 재료 준비 ─────────────────────────────
def load_pages(ratio, idx):
    """비율별 페이지 이미지(폭 1080). 100svh 화면(게이트·입력)은 비율별 캡처를 쓴다."""
    r45 = ratio == "4x5"
    P = {}
    h = idx["home"]
    P["home"] = Page(f"{CAPS}/{h['file']}", h["css_w"], h["dpr"])
    P["home"].rects = h["rects"]
    g = idx["gate45" if r45 else "gate916"]
    P["gate"] = Page(f"{CAPS}/{g['file']}", g["css_w"], g["dpr"])
    P["gate"].rects = g["rects"]
    n = idx["input45" if r45 else "input916"]
    P["input"] = Page(f"{CAPS}/{n['file']}", n["css_w"], n["dpr"])
    P["input"].rects = n["rects"]
    t = idx["teaser"]
    P["teaser"] = Page(f"{CAPS}/{t['file']}", t["css_w"], t["dpr"])
    P["teaser"].rects = t["rects"]
    rs = idx["result"]
    P["result"] = Page(f"{CAPS}/{rs['file']}", rs["css_w"], rs["dpr"])
    P["result"].rects = rs["rects"]
    p5 = idx["partner5"]
    card = p5["rects"]["partner_card"]
    P["card"] = Page(f"{CAPS}/{p5['file']}", p5["css_w"], p5["dpr"], css_y0=p5["css_y0"], crop_css_x=(card[0] - 4, card[0] + card[2] + 4))
    P["card"].rects = p5["rects"]
    m5 = idx["money5"]
    mh = m5["rects"]["money_h3"]
    P["money"] = Page(f"{CAPS}/{m5['file']}", m5["css_w"], m5["dpr"], css_y0=m5["css_y0"], crop_css_x=(mh[0] - 12, mh[0] + mh[2] + 12))
    P["money"].rects = m5["rects"]
    return P


def prep_stills(idx):
    """정지컷 → 9:16 이미지(메모리). t2-read 패딩, 얼굴 클로즈업(카드 캡처 x5 에서), 인장 등."""
    S = {}
    S["t2-read"] = pad_still_916(Image.open(STILL["t2-read"]).convert("RGB"))
    S["t3-snap"] = pad_still_916(Image.open(STILL["t3-snap"]).convert("RGB"))
    # 얼굴 클로즈업: 카드 x5 캡처의 얼굴(830×1050) + 여백 → 폭 1080 꽉 채움(얼굴 폭 ≈ 960 ≥ 760)
    face = Image.open(f"{CAPS}/cap_partner_face.png").convert("RGB")
    fw = 1080
    fh = int(round(face.height * fw / face.width))
    face = face.resize((fw, fh), Image.LANCZOS)
    bg = Image.new("RGB", (1080, 1920), (12, 10, 8))
    # 위아래는 카드 질감 대신 어둡게 — 카드 캡처 전체를 배경으로 깔고 얼굴을 올린다
    card = Image.open(f"{CAPS}/cap_partner_card.png").convert("RGB")
    cbg = card.resize((1080, int(round(card.height * 1080 / card.width))), Image.LANCZOS)
    cbg = cbg.crop((0, 0, 1080, min(cbg.height, 1920)))
    cbg = Image.eval(cbg.filter(ImageFilter.GaussianBlur(12)), lambda v: int(v * 0.45))
    bg.paste(cbg, (0, 0))
    bg.paste(face, (0, (1920 - fh) // 2))
    d = ImageDraw.Draw(bg)
    d.rectangle((0, (1920 - fh) // 2, 1079, (1920 - fh) // 2 + fh - 1), outline=(*CONFIG["colors"]["GOLD"], ), width=2)
    S["face"] = bg
    # v6 vA' — 결과지 **표지 실물**(이름·제목·생년월일). W3 의 「[정수연] 님의 사주 [1995년 1월 15일]」 자리.
    # 문구를 지어내지 않고 화면을 그대로 쓴다(R5). cap_result_cover_9x16 의 제목 블록만 오려 세로 가운데.
    cov = Image.open(f"{CAPS}/cap_result_cover_9x16.png").convert("RGB")
    hdr = cov.crop((0, 900, cov.width, 1300))                       # 命運錄·신당 ~ 생년월일 줄 (실측)
    hw = 1080
    hh = int(round(hdr.height * hw / hdr.width))
    hdr = ImageEnhance.Brightness(hdr.resize((hw, hh), Image.LANCZOS)).enhance(1.35)   # 표지 원본이 어둡다(실측)
    cb = cov.resize((1080, int(round(cov.height * 1080 / cov.width))), Image.LANCZOS)
    cb = cb.crop((0, 0, 1080, min(cb.height, 1920)))
    cb = Image.eval(cb.filter(ImageFilter.GaussianBlur(10)), lambda v: int(v * 0.72))
    hb = Image.new("RGB", (1080, 1920), (10, 8, 6))
    hb.paste(cb, (0, 0))
    hb.paste(hdr, (0, (1920 - hh) // 2))
    S["cover_hdr"] = hb
    # 돈이 들어오는 달 확대(V-F) — x5 크롭을 폭 1080 으로, 위는 검정
    m = Image.open(f"{CAPS}/cap_result_money_chapter_x5_crop.png").convert("RGB")
    mw = 1000
    mh = int(round(m.height * mw / m.width))
    m = m.resize((mw, mh), Image.LANCZOS)
    mb = Image.new("RGB", (1080, 1920), (8, 7, 6))
    mb.paste(m.crop((0, 0, mw, min(mh, 1220))), (40, 700))   # 훅 밴드 아래(4:5 중앙크롭 후에도 훅 밑에 오게 y 700)
    S["money_big"] = mb
    # 빈 어둠(V-F 0~12s 카톡 자리) — 은은한 방사 글로우
    dark = Image.new("RGB", (1080, 1920), (9, 8, 11))
    g = Image.new("L", (1080, 1920), 0)
    gd = ImageDraw.Draw(g)
    gd.ellipse((-200, 300, 1280, 1700), fill=40)
    g = g.filter(ImageFilter.GaussianBlur(160))
    dark = Image.composite(Image.new("RGB", (1080, 1920), (46, 32, 22)), dark, g)
    S["dark"] = dark
    return S


# ───────────────────────────── V-D 스크롤 연출(페이지별) ─────────────────────────────
def sc_home(pg, ratio, r):
    W, H = canvas(ratio)
    x, y, w, h = pg.rect(pg.rects["sangun"])
    tap = (x + w * 0.5, y + h * 0.62)
    return {"keys": [(0.0, 0), (0.5, 0), (1.1, 90), (r, 90)], "taps": [(1.7, *tap)]}


def sc_gate(pg, ratio, r):
    x, y, w, h = pg.rect(pg.rects["enter"])
    return {"keys": [(0.0, 0), (r, 0)], "taps": [(r - 0.55, x + w / 2, y + h / 2)]}


def sc_input(pg, ratio, r):
    b = [b for b in pg.rects["buttons"] if b[0] == "다음"][0]
    x, y, w, h = pg.rect(b[1:])
    return {"keys": [(0.0, 0), (r, 0)], "taps": [(r - 0.55, x + w / 2, y + h / 2)]}


def sc_teaser(pg, ratio, r):
    """티저: 상단 0.8s → 갑술년 말풍선까지 플릭 → 0.6s 멈춤 → 과거연도 판까지 플릭 → 끝까지 정지(빨간 박스)."""
    W, H = canvas(ratio)
    px, py, pw, ph = pg.rect(pg.rects["past_p"])
    panel = pg.rect(pg.rects["past_panel"])
    # 멈춘 상태에서 문장이 y 37~62% 안에 오게: 문장 중심을 48% 에
    y2 = py + ph / 2 - H * 0.48
    y1 = min(y2 - 1500, pg.k * 1560 - H * 0.62)  # 첫 멈춤: 「갑술년 기사월 무오일」 말풍선(CSS y≈1560)이 62% 자리
    P = CONFIG["screen"]["pause"]
    keys = [(0.0, 0), (0.8, 0), (1.7, y1), (1.7 + P, y1), (1.7 + P + 1.4, y2), (r, y2)]
    hl_t0 = 1.7 + P + 1.4 + 0.25
    hls = [(px - 18, py - 10, pw + 36, ph + 20, hl_t0, r)]
    return {"keys": keys, "hls": hls}


def sc_result(pg, ratio, r):
    """결과지: 표지 0.8s → 여덟 글자·一章 → 0.6s → 四 돈이 들어오는 달 제목으로 플릭 → 빨간 박스 1.8s → 본문 천천히."""
    W, H = canvas(ratio)
    mx, my, mw, mh = pg.rect(pg.rects["money_h3"])
    y1 = pg.rect(pg.rects["eight"])[1] - H * 0.18
    y2 = my + mh / 2 - H * 0.45
    y3 = y2 + H * 0.42
    P = CONFIG["screen"]["pause"]
    t_hl = 0.8 + 0.8 + P + 1.3
    keys = [(0.0, 0), (0.8, 0), (1.6, y1), (1.6 + P, y1), (t_hl, y2), (t_hl + 1.9, y2), (r, y3)]
    hls = [(mx - 14, my - 12, mw + 28, mh + 24, t_hl + 0.2, t_hl + 1.9 + 0.3)]
    return {"keys": keys, "hls": hls}


def sc_card_zoom(pg, ratio, r):
    """PartnerCard 풀폭 + 1.0→1.08 줌(얼굴 중심)."""
    W, H = canvas(ratio)
    fx, fy, fw, fh = pg.rect(pg.rects["face"])
    return {"keys": [(0.0, 0), (r, 0)], "zoom": (1.0, 1.08, fx + fw / 2, fy + fh / 2 + 140)}


def sc_card_scroll(pg, ratio, r):
    """V-A: 카드 풀폭, 천천히 아래로(0→320px)."""
    return {"keys": [(0.0, 0), (r, 320)]}


def sc_money_big(pg, ratio, r):
    return {"keys": [(0.0, 0), (0.5, 0), (r, 260)]}


# ───────────────────────────── STORY — 소재별 선언 ─────────────────────────────
def vc_voice_durs(voice):
    """나레이션 길이(초) 6줄."""
    return [ffdur(f"{AUDIO}/{voice}_line{i}.mp3") for i in range(6)]


def story_vB(variant="janbu"):
    S = CONFIG["stack"]
    if variant == "janbu":
        bg, hook, sub = "a1_front", "네 장부를\n내가 먼저 읽었다", "좋은 말만 해주지는 않는다."
        items = ["· 돈이 들어오는 달 — 몇 월인지", "· 인연이 들어오는 달 — 짝의 인상까지", "· 인생이 크게 바뀌는 해"]
    else:
        bg, hook, sub = "a2_money", "돈이 들어오는 달이\n네 장부에 적혀 있다", "돌려 말하지 않는다."
        items = ["· 몇 월에 들어오는지", "· 어디로 새는지", "· 다가올 1년, 달까지 콕"]
    dur = 8.0
    texts = [{"kind": "scrim"},
             {"kind": "hook", "text": hook, "y": S["hook"]["y"], "size": S["hook"]["size"], "stroke": S["hook"]["stroke"], "t0": 0.0},
             {"kind": "sub", "text": sub, "y": S["sub"]["y"], "size": S["sub"]["size"], "t0": 0.0}]
    for it, y, t in zip(items, S["item"]["ys"], S["item"]["t"]):
        texts.append({"kind": "item", "text": it, "y": y, "size": S["item"]["size"], "stroke": S["item"]["stroke"], "maxw": S["item"]["maxw"], "t0": t})
    texts.append({"kind": "cta_box", "text": "▼ 생년월일만 넣으면 먼저 무료로 몇 줄 펴 본다 ▼", "y": S["cta"]["y"], "size": S["cta"]["size"], "t0": S["cta"]["t"]})
    texts.append({"kind": "brand", "y": S["brand_y"], "t0": S["cta"]["t"]})
    return {"id": f"vB{'' if variant == 'janbu' else '2'}_{variant}", "slug": variant, "name": "vB" if variant == "janbu" else "vB2", "dur": dur,
            "cuts": [{"kind": "loop", "src": bg, "d": dur}], "texts": texts, "audio": ["bed", "none"], "hook_full": True}


def story_vE():
    S = CONFIG["stack"]
    dur = 8.0
    texts = [{"kind": "scrim"},
             {"kind": "hook", "text": "산군 사주가\n진짜 맞는다는 이유 3가지", "y": S["hook"]["y"], "size": S["hook"]["size"], "stroke": S["hook"]["stroke"], "t0": 0.0}]
    for y, t in zip(S["item"]["ys"], S["item"]["t"]):
        texts.append({"kind": "bar", "y": y - 22, "h": 120, "t0": t})
    texts.append({"kind": "cta_box", "text": "⬇ 내 장부 먼저 펴 보는 곳 ⬇", "y": S["cta"]["y"], "size": S["cta"]["size"], "t0": S["cta"]["t"]})
    texts.append({"kind": "brand", "y": S["brand_y"], "t0": S["cta"]["t"]})
    return {"id": "vE_shell", "slug": "shell", "name": "vE_shell", "dur": dur, "cuts": [{"kind": "loop", "src": "a1_front", "d": dur}],
            "texts": texts, "audio": ["bed"], "hook_full": True}


def story_vC(voice=None):
    """v6 재컷 — W2(청송 귀자할매 19.86s·재집행 77회) 실측 반영.
    ① 화자를 지운다: 3인칭 설명체 → 옛이야기체 「~단다」
       (W2 는 「~라고 해」인데 그건 귀신사주가 135건으로 도배한 어미다. 화자 지움 효과는 같게, 어미는 우리 것으로)
    ② 강조 키워드 1 → 4회(컷마다 하나) · 색은 주사 낙관(CINNABAR)
    ③ 엔딩 3.0s(15%) → 5.0s(25%) · 마지막 프레임 유지(W2 는 화면을 안 바꾼다)
    ④ 컷 6 → 5 (평균 2.7s)"""
    G = CONFIG["ghost"]
    #                                       ↓ *별표* = 주사색 강조
    caps = ["이상하다.",
            "*명운록*이라고,\n얼굴 없는 박수가 있단다.",
            "사람마다 *여덟 글자*로 적힌\n장부가 있단다.",
            "*돈이 들어오는 달*이 보이면\n그 달만 짚어 준단다.",
            "좋은 말만 듣고 싶은 사람은\n*돌려보냈단다*."]
    base = [2.6, 3.0, 3.2, 3.0, 2.6]     # 합 14.4 + 엔딩 5.6 = 20.0s
    cta_hold = 5.6                       # R1 — 20s 의 28% (W2 29%)
    vo = None
    if voice:
        durs = vc_voice_durs(voice)[:5]
        base = [max(b, 0.3 + d) for b, d in zip(base, durs)]
    x = G["xfade"]
    cuts = [{"kind": "loop", "src": "a7_close", "d": base[0], "fit": "band", "anchor": 0.5},
            {"kind": "loop", "src": "a1_front", "d": base[1], "fit": "band", "anchor": 0.45, "xfade": x},
            {"kind": "still", "src": "t2-read", "d": base[2], "fit": "band", "anchor": 0.5, "move": (1.00, 1.04), "xfade": x},
            {"kind": "loop", "src": "a9_stand", "d": base[3], "fit": "band", "anchor": 0.3, "xfade": x},
            # 마지막 컷 = 2.4s 동작(탁자 내리침) + 5.0s 정지. W2 처럼 CTA 구간에도 화면을 안 바꾼다
            {"kind": "loop", "src": "b2_slap", "d": base[4] + cta_hold, "fit": "band", "anchor": 0.45, "hold_after": base[4], "xfade": x}]
    tl, dur = timeline(cuts)
    texts = []
    # ① 타이핑 — W2 는 「이」→「이상하다.」→「이상하다..」 를 0.4s 간격으로 찍고 1.2s 에 붉은 한 줄을 얹는다
    for t, t1, txt in [(0.0, 0.35, "이"), (0.35, 0.75, "이상하다."), (0.75, base[0] + 0.05, "이상하다..")]:
        texts.append({"kind": "caption", "text": txt, "y_pct": G["cap"]["y_pct"], "size": G["cap"]["size"],
                      "stroke": G["cap"]["stroke"], "t0": t, "t1": t1, "fade": 0.05})
    texts.append({"kind": "caption", "text": "*묻기도 전에 읽는다*", "y_pct": G["cap"]["y_pct"] - 0.075,
                  "size": int(G["cap"]["size"] * 1.35), "stroke": 4, "accent": "CINNABAR", "hl": "CINNABAR", "t0": 1.20, "t1": base[0] + 0.05})
    for i, c in enumerate(caps[1:], start=1):
        texts.append({"kind": "caption", "text": c, "y_pct": G["cap"]["y_pct"], "size": G["cap"]["size"],
                      "stroke": G["cap"]["stroke"], "accent": "CINNABAR", "hl": "CINNABAR",
                      "t0": tl[i]["t0"], "t1": tl[i + 1]["t0"] if i < 4 else tl[4]["t0"] + base[4] + 0.3})
    cta_t = tl[4]["t0"] + base[4] + 0.35          # 동작이 끝나고 화면이 멎는 순간부터 CTA
    texts.append({"kind": "dim", "a": 0.34, "t0": cta_t, "fade": 0.5})   # W2 는 딤 없이 화면 유지 — 우리는 글자 가독만큼만
    texts.append({"kind": "cta_glow", "text": "산군에게 장부 받기 >", "y": G["cta"]["y"][0], "size": G["cta"]["size"], "t0": cta_t, "blink": 1.2})
    texts.append({"kind": "caption", "text": "생년월일만 넣으면 먼저 무료로 몇 줄", "font": "gothic", "size": 38,
                  "y_pct": 0.735, "stroke": 2, "t0": cta_t + 0.5})
    texts.append({"kind": "brand", "y": G["brand_y"], "t0": cta_t})
    if voice:
        vo = [(f"{AUDIO}/{voice}_line{i}.mp3", tl[i]["t0"] + 0.3) for i in range(1, 5)]
    sid = "vC2_seolhwa" + (f"_{voice}" if voice else "")
    return {"id": sid, "slug": "seolhwa", "name": "vC2", "dur": dur, "cuts": cuts, "texts": texts,
            "audio": ["voice"] if voice else ["none"], "vo": vo, "suffix": f"_voice{voice[1]}" if voice else "_silent", "hook_full": False}


# V-D 티저 자막: 명세 원문은 「…작년 일을 어떻게 알지」인데 데모 표본(1994-06-01 여)의 과거연도 문장이 「2022년 …」이라
# 화면과 어긋난다(2026 기준 작년≠2022). 화면 문장에 맞춰 연도를 박는다 — 원문으로 되돌리려면 이 상수만 바꾼다.
VD_TEASER_CAPTION = "…2022년 일을 어떻게 알지"


def story_vD():
    Sc = CONFIG["screen"]
    cuts = [{"kind": "scroll", "page": "home", "d": 3.0, "build": sc_home},
            {"kind": "scroll", "page": "gate", "d": 1.6, "build": sc_gate},
            {"kind": "scroll", "page": "input", "d": 2.4, "build": sc_input},
            {"kind": "scroll", "page": "teaser", "d": 6.0, "build": sc_teaser},
            {"kind": "scroll", "page": "result", "d": 7.0, "build": sc_result},
            {"kind": "scroll", "page": "card", "d": 5.0, "build": sc_card_zoom, "xfade": 0.25}]
    tl, dur = timeline(cuts)
    cap = Sc["cap"]
    texts = [{"kind": "hook", "text": "요즘 인스타에서\n산군 사주라는 게 돈다길래", "y": Sc["hook"]["y"], "size": Sc["hook"]["size"], "stroke": Sc["hook"]["stroke"], "t0": 0.0, "t1": Sc["hook"]["until"], "fade_out": 0.25, "box": True},
             {"kind": "label", "text": "* 예시 결과 · 1994년생 표본", "y": 420, "size": 38, "t0": 0.0},
             {"kind": "caption", "text": "생일만 넣으래서 넣어봄", "font": "gothic_b", "y": cap["y"], "size": cap["size"], "stroke": cap["stroke"], "t0": tl[1]["t0"], "t1": tl[3]["t0"]},
             {"kind": "caption", "text": VD_TEASER_CAPTION, "font": "gothic_b", "y": cap["y"], "size": cap["size"], "stroke": cap["stroke"], "t0": tl[3]["t0"], "t1": tl[4]["t0"]},
             {"kind": "caption", "text": "달까지 찍혀 있음", "font": "gothic_b", "y": cap["y"], "size": cap["size"], "stroke": cap["stroke"], "t0": tl[4]["t0"], "t1": tl[5]["t0"]},
             {"kind": "dim", "a": 0.55, "t0": Sc["cta"]["t"], "fade": 0.4},
             {"kind": "cta_box", "text": "산군에게 장부 받기 >", "y": Sc["cta"]["y"], "size": Sc["cta"]["size"], "t0": Sc["cta"]["t"]},
             {"kind": "brand", "y": Sc["brand_y"], "t0": Sc["cta"]["t"]}]
    return {"id": "vD_screen", "slug": "screen", "name": "vD", "dur": dur, "cuts": cuts, "texts": texts, "audio": ["bed"], "hook_full": False}


def story_vA():
    """v6 재컷 — W3(소름끼치는 인생스포 8.85s·재집행 62회) 비율 그대로.
    ① 컷 6 → 4 (1.29s/컷 → 2.25s/컷). W3 는 한 화면을 2.2 초씩 붙든다.
    ② 엔딩 15% → 24%.
    ③ 결과지에 **이름·생년월일**(W3 의 「[정수연] 님의 사주 [1995년 1월 15일]」) — 표지 실물 컷으로.
    ④ 훅은 카드 등장까지만(W3 도 2.75s 에서 대사로 교체한다)."""
    F = CONFIG["face"]
    cuts = [{"kind": "loop", "src": "a1_front", "d": 2.0},                              # ① 공간 — W3 1.5s
            {"kind": "still", "src": "cover_hdr", "d": 1.0, "move": (1.00, 1.03), "xfade": 0.25},   # ② 누구의 장부인지
            {"kind": "scroll", "page": "card", "d": 2.6, "build": sc_card_scroll, "xfade": 0.25},   # ③ 짝 카드
            {"kind": "still", "src": "face", "d": 3.4, "move": (1.00, 1.05), "xfade": 0.25}]        # ④ 얼굴 + 엔딩
    tl, dur = timeline(cuts)
    cap = F["cap"]
    hook_until = tl[1]["t0"] + 0.15          # 표지 컷이 뜨면 훅을 내린다
    cta_t = dur - 2.2                        # R1 — 9.0s 의 24%
    # ⚠ 카드·표지 구간엔 자막을 얹지 않는다 — 첫 렌더 실측에서 카드 본문(외모·성격·만나는 자리)과 겹쳐 둘 다 못 읽었다.
    #   W3 도 결과지 카드가 뜨는 2.1s 동안 카드 위 글자는 CTA 뿐이다. 카드 자체가 텍스트다.
    texts = [{"kind": "scrim", "t1": hook_until, "fade_out": 0.25},
             {"kind": "hook", "text": "네가 만날 사람,\n*얼굴*부터 봐라", "y": F["hook"]["y"], "size": F["hook"]["size"],
              "stroke": F["hook"]["stroke"], "t0": 0.0, "t1": hook_until, "fade_out": 0.25},
             {"kind": "caption", "text": "네 장부를 먼저 읽었다", "y": cap["y"], "size": cap["size"],
              "stroke": cap["stroke"], "t0": hook_until, "t1": tl[2]["t0"] - 0.1}]
    texts.append({"kind": "label", "text": "* 예시 결과 · 1993년생 표본", "y": 172, "size": 34, "t0": hook_until + 0.05, "t1": cta_t})
    texts += [{"kind": "dim", "a": 0.34, "t0": cta_t, "fade": 0.4},
              {"kind": "cta_box", "text": "무료로 먼저 보기 >", "y": F["cta"]["y"], "size": F["cta"]["size"], "t0": cta_t},
              {"kind": "brand", "y": F["brand_y"], "t0": cta_t}]
    return {"id": "vA2_face", "slug": "face", "name": "vA2", "dur": dur, "cuts": cuts, "texts": texts, "audio": ["bed"], "hook_full": False}


def story_vF():
    S = CONFIG["stack"]
    F = CONFIG["face"]
    cuts = [{"kind": "still", "src": "dark", "d": 12.0},
            {"kind": "still", "src": "money_big", "d": 4.0, "move": (1.00, 1.06), "xfade": 0.25},
            {"kind": "loop", "src": "a1_front", "d": 8.0, "xfade": 0.25}]
    tl, dur = timeline(cuts)
    texts = [{"kind": "scrim"},
             {"kind": "hook", "text": "장부 받은 사람들이\n카톡으로 보낸 것", "y": S["hook"]["y"], "size": S["hook"]["size"], "stroke": S["hook"]["stroke"], "t0": 0.0},
             {"kind": "sub", "text": "좋은 말만 해주지는 않는다.", "y": 980, "size": 56, "t0": 16.0, "t1": 24.0},
             {"kind": "dim", "a": 0.6, "t0": 20.0, "fade": 0.4},
             {"kind": "cta_box", "text": "무료로 먼저 보기 >", "y": F["cta"]["y"], "size": F["cta"]["size"], "t0": 20.0},
             {"kind": "brand", "y": F["brand_y"], "t0": 20.0}]
    return {"id": "vF_shell", "slug": "shell", "name": "vF_shell", "dur": dur, "cuts": cuts, "texts": texts, "audio": ["bed"], "hook_full": True}


STORY = {
    "vB_janbu": lambda: story_vB("janbu"),
    "vB2_money": lambda: story_vB("money"),
    "vC2_seolhwa": lambda: story_vC(None),
    "vC2_seolhwa_v3": lambda: story_vC("v3"),
    "vC2_seolhwa_v5": lambda: story_vC("v5"),
    "vD_screen": story_vD,
    "vA2_face": story_vA,
    "vE_shell": story_vE,
    "vF_shell": story_vF,
}
ORDER = ["vB_janbu", "vB2_money", "vC2_seolhwa", "vC2_seolhwa_v3", "vC2_seolhwa_v5", "vD_screen", "vA2_face", "vE_shell", "vF_shell"]


def final_name(story, ratio, audio_mode):
    W, H = canvas(ratio)
    suffix = story.get("suffix", "")
    if story["name"] in ("vE_shell", "vF_shell"):
        return f"sangun_{story['name']}_{W}x{H}.mp4"
    if audio_mode == "none" and not suffix:
        suffix = "_silent"
    return f"sangun_{story['name']}_{story['slug']}_{W}x{H}{suffix}.mp4"


# ───────────────────────────── 빌드 ─────────────────────────────
_CACHE = {}


def build(story_key, ratios, do_check=False, notext=False, dump=None):
    story = STORY[story_key]()
    idx = caps_index()
    if "stills" not in _CACHE:
        _CACHE["stills"] = prep_stills(idx)
    prep = _CACHE["stills"]
    report = []
    for ratio in ratios:
        if ("pages", ratio) not in _CACHE:
            _CACHE[("pages", ratio)] = load_pages(ratio, idx)
        pages = _CACHE[("pages", ratio)]
        tl, dur = timeline(story["cuts"])
        log(f"[{story['id']} {ratio}] cuts={len(story['cuts'])} dur={dur:.2f}")
        files = [render_cut(story["id"], ratio, i, c, tl[i]["r"], pages, prep) for i, c in enumerate(story["cuts"])]
        base = concat_cuts(story["id"], ratio, files, tl)
        layers = build_text_layers(story["id"], ratio, story["texts"], dur)
        # 텍스트 PNG 낱개(캡컷용) → 재료/클립/텍스트PNG/<id>/
        for l in layers:
            if l["kind"] in ("hook", "sub", "item", "caption", "cta_box", "cta_glow", "brand"):
                dst = f"{CLIPS}/텍스트PNG/{story['id']}_{ratio}"
                os.makedirs(dst, exist_ok=True)
                shutil.copy(l["png"], f"{dst}/{os.path.basename(l['png'])}")
        use = [] if notext else layers
        for mode in (story["audio"][:1] if notext else story["audio"]):
            wav = mix_audio(story["id"], ratio, dur, mode, story.get("vo"))
            name = final_name(story, ratio, mode)
            if notext:
                name = name.replace(".mp4", "_notext.mp4")
            tmp_out = f"{TMP}/final/{name}"
            gq = CONFIG["enc"]["gq"]
            overlay_and_encode(base, use, wav, tmp_out, dur, gq)
            while os.path.getsize(tmp_out) / 1048576 > CONFIG["enc"]["max_mb"] and gq < 30:
                gq += 3
                log("  >30MB → global_quality", gq)
                overlay_and_encode(base, use, wav, tmp_out, dur, gq)
            dst = f"{OUT}/{name}"
            os.replace(tmp_out, dst)
            json.dump({"story": story_key, "ratio": ratio, "audio": mode, "dur": dur, "hook_full": story.get("hook_full"),
                       "layers": [{"kind": l["kind"], "text": l["text"], "t0": l["t0"], "t1": l["t1"], "bbox": l["bbox"]} for l in layers]},
                      open(f"{TMP}/final/{name}.json", "w", encoding="utf-8"), ensure_ascii=False)
            log("  ->", name, f"{os.path.getsize(dst) / 1048576:.1f}MB")
            report.append(name)
        # 스크롤 클립 낱개(캡컷용)
        if any(c["kind"] == "scroll" for c in story["cuts"]):
            for i, c in enumerate(story["cuts"]):
                if c["kind"] == "scroll":
                    dst = f"{CLIPS}/scroll_{story['id']}_{ratio}_{i:02d}_{c['page']}.mp4"
                    shutil.copy(files[i], dst)
    return report


# ───────────────────────────── 판정(--check) ─────────────────────────────
def contact_sheet(video, out_png, n=8):
    info = ffinfo(video)
    dur = info["dur"]
    tiles = []
    for i in range(n):
        t = dur * (i + 0.5) / n
        fp = f"{TMP}/sheet/f_{i}.png"
        run([FF, "-y", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1", "-update", "1", fp])
        im = Image.open(fp).convert("RGB")
        tw = 324
        th = int(round(im.height * tw / im.width))
        im = im.resize((tw, th), Image.LANCZOS)
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, 90, 30), fill=(0, 0, 0))
        d.text((6, 6), f"{t:.1f}s", fill=(255, 255, 255), font=font("gothic_b", 20))
        tiles.append(im)
    cols = 4
    rows = math.ceil(n / cols)
    tw, th = tiles[0].size
    sheet = Image.new("RGB", (cols * tw + (cols - 1) * 6, rows * th + (rows - 1) * 6), (40, 40, 40))
    for i, im in enumerate(tiles):
        sheet.paste(im, ((i % cols) * (tw + 6), (i // cols) * (th + 6)))
    sheet.save(out_png)
    return out_png


def loudness(video):
    r = subprocess.run([FF, "-hide_banner", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True)
    s = r.stderr.decode("utf-8", "replace")
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", s)
    p = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", s)
    return (float(m[-1]) if m else None, float(p[-1]) if p else None)


def check_all():
    lines = ["# 산군 광고영상 자동 판정 (build_ads.py --check) — " + time.strftime("%Y-%m-%d %H:%M"), "",
             "| 파일 | 길이 | 해상도 | fps | MB | 오디오 | LUFS | 세이프존 | 금지어 | 훅밴드 | 판정 |", "|---|---|---|---|---|---|---|---|---|---|---|"]
    ok_all = True
    for name in sorted(os.listdir(OUT)):
        if not name.endswith(".mp4"):
            continue
        path = f"{OUT}/{name}"
        meta_p = f"{TMP}/final/{name}.json"
        meta = json.load(open(meta_p, encoding="utf-8")) if os.path.exists(meta_p) else None
        info = ffinfo(path)
        ratio = "9x16" if info["h"] == 1920 else "4x5"
        probs = []
        exp_dur = meta["dur"] if meta else None
        if exp_dur and abs(info["dur"] - exp_dur) > 0.15:
            probs.append(f"길이 {info['dur']:.2f}≠{exp_dur:.2f}")
        if info["w"] != 1080 or info["h"] not in (1920, 1350):
            probs.append("해상도")
        if abs(info["fps"] - 30) > 0.1:
            probs.append("fps")
        if info["mb"] > CONFIG["enc"]["max_mb"]:
            probs.append("용량")
        lufs = "-"
        if info["audio"]:
            I, pk = loudness(path)
            lufs = f"{I:.1f}" if I is not None else "?"
            if I is None or abs(I - CONFIG["loud"]["I"]) > 1.0:
                probs.append(f"음량 {lufs}")
        elif meta and meta["audio"] != "none":
            probs.append("오디오 없음")
        safe = CONFIG["safe"][ratio]
        hook_top = Y(ratio, CONFIG["hook_band_top"])   # 훅 밴드는 §0-B 실측(y 10.6%)이 §0 세이프존(220)보다 위 — 훅만 따로 허용
        safe_ok = "-"
        forb = "-"
        hook = "-"
        if meta:
            bad = []
            for l in meta["layers"]:
                b = l["bbox"]
                if b and l["kind"] not in ("dim", "scrim"):
                    top = hook_top if l["kind"] == "hook" else safe[0]
                    if b[1] < top - 2 or b[3] > safe[1] + 2 or b[0] < 60 or b[2] > 1020:
                        bad.append(f"{l['kind']}({b[1]}~{b[3]})")
            safe_ok = "OK" if not bad else "⚠ " + ",".join(bad)
            if bad:
                probs.append("세이프존")
            hits = [w for l in meta["layers"] for w in FORBIDDEN if w in l["text"]]
            forb = "0" if not hits else "⚠ " + ",".join(hits)
            if hits:
                probs.append("금지어")
            hooks = [l for l in meta["layers"] if l["kind"] == "hook"]
            if hooks:
                h = hooks[0]
                full = h["t0"] <= 0.01 and h["t1"] >= meta["dur"] - 0.05
                hook = "전구간" if full else f"{h['t0']:.1f}~{h['t1']:.1f}s"
                if meta.get("hook_full") and not full:
                    probs.append("훅밴드")
            else:
                hook = "없음(V-C)"
        sheet = f"{OUT}/{name[:-4]}_sheet.png"
        contact_sheet(path, sheet)
        verdict = "PASS" if not probs else "FAIL: " + "; ".join(probs)
        ok_all &= not probs
        lines.append(f"| {name} | {info['dur']:.2f}s | {info['w']}×{info['h']} | {info['fps']:.0f} | {info['mb']:.1f} | {'있음' if info['audio'] else '없음'} | {lufs} | {safe_ok} | {forb} | {hook} | {verdict} |")
    lines += ["", "세이프존: 9:16 y 220~1500(훅 밴드만 180~, §0-B 실측 y 10.6%) · 4:5 y 100~1180 · x 60~1020(텍스트 bbox 기준). 음량 −16±1 LUFS(오디오 있는 판만). 금지어 「구매」「결제」「할인」「원」. 시트 = 8프레임(`*_sheet.png`).",
              f"전체: {'PASS' if ok_all else 'FAIL 있음'}"]
    open(f"{OUT}/_check_report.md", "w", encoding="utf-8").write("\n".join(lines))
    log("check ->", f"{OUT}/_check_report.md", "PASS" if ok_all else "FAIL")
    return ok_all


# ───────────────────────────── CLI ─────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*", help="captures | all | " + " ".join(ORDER))
    ap.add_argument("--ratios", default="9x16,4x5")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--notext", action="store_true", help="자막·훅 없는 편집용 마스터")
    a = ap.parse_args()
    ratios = [r for r in a.ratios.split(",") if r]
    ids = a.ids
    if ids == ["captures"]:
        build_captures()
        write_overlay_pngs()
        return
    write_overlay_pngs()
    if ids == ["all"]:
        ids = ORDER
    for sid in ids:
        if sid not in STORY:
            sys.exit("unknown id: " + sid)
        t0 = time.time()
        build(sid, ratios, notext=a.notext)
        log(f"done {sid} in {time.time() - t0:.0f}s")
    if a.check:
        check_all()


if __name__ == "__main__":
    main()
