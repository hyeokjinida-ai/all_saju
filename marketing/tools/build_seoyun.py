# -*- coding: utf-8 -*-
"""
build_seoyun.py — 광고 v5 「사주 보다가 긁힘」 조립기 (서윤 무성 UGC + 여성 TTS)

  PYTHONUTF8=1 python marketing/tools/build_seoyun.py V0            # 본판 9:16
  PYTHONUTF8=1 python marketing/tools/build_seoyun.py all --ratios 9x16,4x5
  PYTHONUTF8=1 python marketing/tools/build_seoyun.py V0 --check

왜 build_ads.py 를 안 늘리고 따로 쓰나: 저 파일의 STORY 는 **정지컷·루프 기반 v3 공장** 형태로 굳어 있고,
v5 는 실사 클립 3개를 이어 붙인 뒤 그 위에 카드·자막을 얹는 완전히 다른 골격이다.
공용 부품(FF 경로·폰트·인코더 인자·loudnorm·파이프 합성)은 build_ads 에서 그대로 가져다 쓴다.

밟은 함정(2026-08-23):
 - CapCut ffmpeg 엔 libx264·libmp3lame 이 없다 → 비디오 h264_qsv, 오디오 aac(.m4a/.wav)
 - ffmpeg 출력 경로에 한글이 있으면 죽는다 → 전부 ASCII TMP 에 쓰고 마지막에 복사
 - seed_audio 는 「장부」·「긁힐 각오」를 못 읽는다 → 대본에서 회피(발음 쉬운 말)
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_ads import FF, CONFIG, font, qsv_args, loudnorm_2pass  # noqa: E402

ROOT = "C:/Users/HP/OneDrive/Desktop/all_saju"
MAT = f"{ROOT}/marketing/소재/산군/재료"
CAPS = f"{MAT}/캡처/seo"
CLIPS = f"{MAT}/클립/seo"
AUD = f"{MAT}/클립/audio/seo"
OUT = f"{ROOT}/marketing/소재/산군/영상"
TMP = "C:/Users/HP/AppData/Local/Temp/claude/seobuild"
WIN = os.path.join(os.environ.get("TEMP", "/tmp"), "seo_cap")  # cap_seoyun 이 남긴 dpr3 창 PNG
FPS = 30
DUR = 48.0
C = CONFIG["colors"]
os.makedirs(TMP, exist_ok=True)
os.makedirs(OUT, exist_ok=True)


def log(*a):
    print("[v5]", *a, flush=True)


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode != 0:
        raise RuntimeError(" ".join(map(str, cmd[:6])) + "\n" + r.stderr.decode("utf-8", "replace")[-1500:])
    return r


# ───────────────────────── 대본·타임라인 ─────────────────────────
# t = 발화 시작(초). sub = 자막 줄(리스트면 2줄). peak = 정점(1.8배).
LINES = [
    (1, 0.20, "사주 보다가 긁힘.", ["사주 보다가 긁힘"], False),
    (2, 1.70, "나한테 미련 남았냐는데?", ["나한테 미련 남았냐는데?"], False),
    (3, 3.10, "고민 하나 적었더니 이게 옴.", ["고민 하나 적었더니", "이게 옴"], False),
    (4, 5.30, "요즘 계속 뜨던 박수무당 사주인데,", ["요즘 계속 뜨던", "박수무당 사주인데"], False),
    (5, 7.30, "오늘 운세 한 줄 나오는 게 아니라, 열한 장이 나옴.", ["오늘 운세 한 줄이 아니라", "열한 장이 나옴"], False),
    (6, 10.00, "성격, 돈, 인연, 일, 조심할 달까지.", ["성격, 돈, 인연, 일", "조심할 달까지"], False),
    (7, 12.80, "나 원래 회의에서 마지막에 정리하는 스타일인데,", ["나 원래 회의에서", "마지막에 정리하는 스타일인데"], False),
    (8, 15.20, "흐름 읽고 판단으로 길 낸다, 감각을 구조로 바꾼다,", ["흐름 읽고 판단으로 길 낸다", "감각을 구조로 바꾼다"], False),
    (9, 17.90, "이거까지 맞추는 게 말 돼?", ["이거까지 맞추는 게 말 돼?"], True),
    (10, 20.10, "위로해 주는 게 아니라, 안 좋은 것도 그대로 나옴.", ["위로해 주는 게 아니라", "안 좋은 것도 그대로 나옴"], False),
    (11, 22.60, "기분 나쁘게 다 맞음.", ["기분 나쁘게 다 맞음"], True),
    (12, 23.60, "인연 쪽은 더 웃김.", ["인연 쪽은 더 웃김"], False),
    (13, 25.50, "말보다 행동으로 챙기는 사람이 온다는데,", ["말보다 행동으로", "챙기는 사람이 온다는데"], False),
    (14, 27.10, "나 원래 말 잘하는 사람만 만났음.", ["나 원래", "말 잘하는 사람만 만났음"], False),
    (15, 28.70, "아 이건 기분 나빠.", ["아 이건 기분 나빠"], True),
    (16, 30.10, "근데 그 사람 얼굴까지 보여줌.", ["근데 그 사람", "얼굴까지 보여줌"], False),
    (17, 31.40, "왜 또 내 스타일인데.", ["왜 또 내 스타일인데"], False),
    (18, 33.00, "마음 흔들리는 달까지 찍혀 있고,", ["마음 흔들리는 달까지", "찍혀 있고"], False),
    (19, 35.20, "몇 살에 풀리는지 십 년 단위로 적혀 있음.", ["몇 살에 풀리는지", "십 년 단위로 적혀 있음"], False),
    (20, 37.30, "운세가 아니라 내 인생 패턴 들킨 느낌.", ["운세가 아니라", "내 인생 패턴 들킨 느낌"], True),
    (21, 40.30, "기분 나쁜데 잘 맞음.", ["기분 나쁜데 잘 맞음"], True),
    (22, 42.20, "무료로 몇 줄 먼저 보여주니까 이건 진짜 한 번 해봐.", ["무료로 몇 줄 먼저 보여주니까", "이건 진짜 한 번 해봐"], False),
    (23, 44.50, "긁힐 준비는 하고!", ["긁힐 준비는 하고!"], False),
]

HOOKS = {
    "h24": [("사주 보다가 긁힘", 57, "bone"), ("미련 남았냐는데?", 84, "red_word"), ("*실제 사주 서비스 화면입니다", 40, "pink")],
    "h25": [("사주가 내 전남친 취향을", 57, "bone"), ("맞춰버림", 84, "red_word"), ("*실제 사주 서비스 화면입니다", 40, "pink")],
    "h26": [("무당이 내 다음 남친", 57, "bone"), ("얼굴을 보여줌", 84, "red_word"), ("*실제 사주 서비스 화면입니다", 40, "pink")],
}

# 카드 — (종류, 파일, t0, t1, 옵션)
#   slot  = 우하단 작은 카드(팝 0.25s)   pin = 폭 96% 읽는 카드
#   full  = 풀프레임(어두운 바탕에 96%)  pan = 세로로 긴 페이지를 훑기
CARDS = [
    ("pin", "seo_line_jikeon.png", 0.22, 5.10, {"hl": True}),
    ("pan", "__win0", 7.60, 10.10, {"y0": 0.06, "y1": 0.30}),
    ("pin", "seo_line_ch1_a.png", 12.80, 14.90, {}),
    ("pin", "seo_line_ch1_b.png", 15.20, 17.40, {}),
    ("pin", "seo_line_ch1_c.png", 17.55, 19.60, {}),
    ("slot", "seo_balloon.png", 20.20, 22.40, {}),
    ("slot", "seo_partner_card_ad_blur.png", 25.40, 27.95, {}),
    # 28.0~30.0 = 크로마(폰 화면) — 별도 처리
    ("full", "seo_partner_card_ad.png", 30.10, 32.60, {"reveal": (30.20, 31.40)}),
    ("full", "seo_inyeon_calendar.png", 33.00, 35.05, {}),
    ("full", "seo_daeun_table.png", 35.20, 37.25, {}),
    ("pan", "__win1", 37.40, 39.60, {"y0": 0.10, "y1": 0.62}),
]
CHROMA = (28.00, 30.00, "seo_partner_card_ad_blur.png")
FLASH = 15.00
END_T = 46.00


# ───────────────────────── 그리기 도우미 ─────────────────────────
def text_layer(size, items):
    """items: (text, font_kind, px, (r,g,b), y, align) → RGBA. 외곽선 + 그림자."""
    W, H = size
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for txt, kind, px, col, y, stroke in items:
        f = font(kind, px)
        w = d.textlength(txt, font=f)
        x = (W - w) / 2
        d.text((x, y), txt, font=f, fill=col + (255,), stroke_width=stroke, stroke_fill=(0, 0, 0, 235))
    return im


def shadowed(im, blur=8, alpha=150, dy=4):
    a = np.asarray(im)[:, :, 3]
    sh = Image.fromarray(np.stack([np.zeros_like(a)] * 3 + [(a.astype(np.float32) * alpha / 255).astype(np.uint8)], -1), "RGBA")
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.alpha_composite(sh, (0, dy))
    out.alpha_composite(im)
    return out


def fit_width(im, w):
    return im.resize((w, max(1, int(im.height * w / im.width))), Image.LANCZOS)


def rounded(im, r=18, pad=14, bg=(10, 8, 6, 235), border=(232, 201, 106, 90)):
    W, H = im.width + pad * 2, im.height + pad * 2
    card = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle([0, 0, W - 1, H - 1], r, fill=bg, outline=border, width=2)
    card.alpha_composite(im.convert("RGBA"), (pad, pad))
    return card


# ───────────────────────── 베이스 트랙 ─────────────────────────
def build_base(ratio):
    W, H = 1080, (1920 if ratio == "9x16" else 1350)
    base = f"{TMP}/base_{ratio}.mp4"
    if os.path.exists(base):
        return base, W, H
    log("  concat+encode base (수 분 걸린다)")
    lst = f"{TMP}/concat.txt"
    tmpclips = []
    for n in ("A", "B", "C"):
        src = f"{CLIPS}/seo_{n}_15s.mp4"
        dst = f"{TMP}/clip_{n}.mp4"
        if not os.path.exists(dst):
            shutil.copyfile(src, dst)   # 한글 경로 회피
        tmpclips.append(dst)
    with open(lst, "w", encoding="utf-8") as f:
        for p in tmpclips:
            f.write(f"file '{p}'\n")
    joined = f"{TMP}/joined.mp4"
    run([FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
         "-r", str(FPS), *qsv_args(14, "slow"), "-an", joined])
    # 45s 뒤 3초는 마지막 프레임 정지(엔드카드 바탕)
    vf = f"tpad=stop_mode=clone:stop_duration=3.2,fps={FPS}"
    if ratio == "4x5":
        vf += ",crop=1080:1350:0:0"   # 4:5 는 **위 정렬**(y285 로 자르면 훅 3줄이 얼굴을 덮는다 — 실측 c45_compare)
    run([FF, "-y", "-loglevel", "error", "-i", joined, "-vf", vf, "-t", f"{DUR:.2f}",
         *qsv_args(14, "slow"), "-an", base])
    return base, W, H


# ───────────────────────── 레이어 생성 ─────────────────────────
def make_layers(ratio, hook_key, cta_line23):
    W, H = 1080, (1920 if ratio == "9x16" else 1350)
    L = []   # {"im":PIL RGBA, "pos":(x,y), "t0","t1","fade","fade_out","pop"}

    def add(im, pos, t0, t1, fade=0.12, fade_out=0.12, pop=0.0, full=False, reveal=None):
        L.append({"im": im.convert("RGBA"), "pos": pos, "t0": t0, "t1": t1,
                  "fade": fade, "fade_out": fade_out, "pop": pop, "full": full, "reveal": reveal})

    # ① 훅 3줄 고정 — 이 구도는 머리가 y8% 까지 올라오므로 **천장 띠**(y2~16%)에 놓는다
    hk = HOOKS[hook_key]
    ys = [int(H * 0.030), int(H * 0.068), int(H * 0.142)] if ratio == "9x16" else [int(H * 0.020), int(H * 0.055), int(H * 0.135)]
    sc = 1.0 if ratio == "9x16" else 0.82
    items = []
    for (txt, px, style), y in zip(hk, ys):
        px = int(px * sc)
        col = {"bone": C["BONE"], "red_word": (255, 255, 255), "pink": (244, 194, 200)}[style]
        items.append((txt, "gothic_b" if style != "pink" else "gothic", px, col, y, 6 if style != "pink" else 3))
    hook = shadowed(text_layer((W, H), items), blur=10, alpha=170, dy=5)
    # 강조 단어(2행 첫 단어)를 빨강으로 덮어쓴다
    d = ImageDraw.Draw(hook)
    f2 = font("gothic_b", int(hk[1][1] * sc))
    t2 = hk[1][0]
    key = t2.split()[0]
    wfull = d.textlength(t2, font=f2)
    x2 = (W - wfull) / 2
    d.text((x2, ys[1]), key, font=f2, fill=C["RED"] + (255,), stroke_width=6, stroke_fill=(0, 0, 0, 235))
    add(hook, (0, 0), 0.0, 44.0, fade=0.0, fade_out=0.5)

    # ② 자막
    cap_y = int(H * 0.527)
    for i, t0, spoken, rows, peak in LINES:
        txt_rows = rows if i != 23 else [cta_line23]
        px = int((81 if peak else 45) * (1.0 if ratio == "9x16" else 0.85))
        items = []
        yy = cap_y - (len(txt_rows) - 1) * int(px * 0.62)
        for r in txt_rows:
            items.append((r, "gothic_b", px, C["WHITE"], yy, 5))
            yy += int(px * 1.24)
        im = shadowed(text_layer((W, H), items), blur=9, alpha=190, dy=4)
        nxt = next((x[1] for x in LINES if x[0] == i + 1), DUR)
        add(im, (0, 0), t0 - 0.08, min(nxt - 0.05, t0 + 3.4), fade=0.10, fade_out=0.12)

    # ③ 카드
    for kind, name, t0, t1, opt in CARDS:
        if name.startswith("__win"):
            src = f"{WIN}/win{name[-1]}.png"
            if not os.path.exists(src):
                log("  pan 원본 없음, 건너뜀:", src)
                continue
            page = Image.open(src).convert("RGB")
            L.append({"pan": page, "y0": opt["y0"], "y1": opt["y1"], "t0": t0, "t1": t1,
                      "fade": 0.15, "fade_out": 0.15, "full": True, "im": None, "pos": (0, 0), "pop": 0.0, "reveal": None})
            continue
        p = f"{CAPS}/{name}"
        if not os.path.exists(p):
            log("  카드 없음, 건너뜀:", name)
            continue
        im = Image.open(p).convert("RGB")
        if kind == "slot":
            card = rounded(fit_width(im, int(W * 0.52)))
            add(card, (int(W * 0.45), int(H * 0.615)), t0, t1, pop=0.25)
        elif kind == "pin":
            card = rounded(fit_width(im, int(W * 0.90)), pad=18)
            add(card, (int((W - card.width) / 2), int(H * 0.638)), t0, t1, pop=0.18)
        elif kind == "full":
            side = int(W * 0.98)
            body = fit_width(im, side)
            if body.height > H * 0.90:
                body = body.resize((int(body.width * H * 0.90 / body.height), int(H * 0.90)), Image.LANCZOS)
            bg = Image.new("RGBA", (W, H), (8, 6, 5, 255))
            bg.alpha_composite(body.convert("RGBA"), ((W - body.width) // 2, (H - body.height) // 2))
            add(bg, (0, 0), t0, t1, fade=0.18, fade_out=0.18, full=True, reveal=opt.get("reveal"))
    return L


# ───────────────────────── 합성 ─────────────────────────
def composite(ratio, layers, base, W, H, out_mp4, audio_wav, chroma_card):
    n = int(round(DUR * FPS))
    dec = subprocess.Popen([FF, "-loglevel", "quiet", "-i", base, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    cmd = [FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", audio_wav, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
           "-t", f"{DUR:.2f}", *qsv_args(16, "slow"), "-movflags", "+faststart", out_mp4]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    nb = W * H * 3
    # 크로마 카드 미리 준비
    ck = Image.open(f"{CAPS}/{chroma_card}").convert("RGB") if chroma_card else None
    ck_np = np.asarray(ck).astype(np.float32) if ck else None
    last = None
    try:
        for i in range(n):
            buf = dec.stdout.read(nb)
            if len(buf) < nb:
                fr = last.copy() if last is not None else np.zeros((H, W, 3), np.uint8)
            else:
                fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy()
                last = fr
            t = i / FPS
            # 크로마(폰 화면에 결과지)
            if ck_np is not None and CHROMA[0] <= t < CHROMA[1]:
                fr = chroma_replace(fr, ck_np)
            # 레이어
            for l in layers:
                if not (l["t0"] <= t < l["t1"]):
                    continue
                k = 1.0
                if l["fade"] > 0:
                    k = min(1.0, (t - l["t0"]) / l["fade"])
                if l["fade_out"] > 0 and t > l["t1"] - l["fade_out"]:
                    k = min(k, max(0.0, (l["t1"] - t) / l["fade_out"]))
                if l.get("pan") is not None:
                    fr = paste_pan(fr, l, t, W, H, k)
                    continue
                im = l["im"]
                if l.get("pop"):
                    p = min(1.0, (t - l["t0"]) / l["pop"])
                    s = 0.62 + 0.38 * (1 - (1 - p) ** 3)
                    if s < 0.995:
                        im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.BILINEAR)
                if l.get("reveal"):
                    r0, r1 = l["reveal"]
                    pass  # reveal 은 blur 카드 → sharp 카드 두 장으로 처리(CARDS 에서 분리)
                fr = paste_rgba(fr, im, l["pos"] if not l.get("pop") else
                                (l["pos"][0] + (l["im"].width - im.width) // 2, l["pos"][1] + (l["im"].height - im.height) // 2), k)
            # 화이트 플래시(A→B 이음매)
            if FLASH <= t < FLASH + 0.40:
                a = 1 - abs((t - FLASH) / 0.20 - 1)
                fr = (fr.astype(np.float32) * (1 - a * 0.85) + 255 * a * 0.85).astype(np.uint8)
            enc.stdin.write(fr.tobytes())
            if i % 150 == 0:
                log(f"  frame {i}/{n} ({t:.1f}s)")
    finally:
        enc.stdin.close()
        dec.stdout.close()
        err = enc.stderr.read().decode("utf-8", "replace")
        enc.wait()
        dec.wait()
    if enc.returncode != 0:
        raise RuntimeError("encode failed: " + err[-1500:])
    return out_mp4


def paste_rgba(fr, im, pos, k):
    H, W = fr.shape[:2]
    a = np.asarray(im)
    x, y = int(pos[0]), int(pos[1])
    h, w = a.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return fr
    sub = a[y0 - y:y1 - y, x0 - x:x1 - x]
    al = (sub[:, :, 3:4].astype(np.float32) / 255.0) * k
    fr[y0:y1, x0:x1] = (fr[y0:y1, x0:x1].astype(np.float32) * (1 - al) + sub[:, :, :3].astype(np.float32) * al).astype(np.uint8)
    return fr


def paste_pan(fr, l, t, W, H, k):
    page = l["pan"]
    if page.width != W:
        page = page.resize((W, int(page.height * W / page.width)), Image.LANCZOS)
        l["pan"] = page
    p = (t - l["t0"]) / max(1e-6, (l["t1"] - l["t0"]))
    yy = l["y0"] + (l["y1"] - l["y0"]) * p
    top = int(max(0, min(page.height - H, yy * page.height)))
    win = np.asarray(page.crop((0, top, W, top + H)).convert("RGB")).astype(np.float32)
    return (fr.astype(np.float32) * (1 - k) + win * k).astype(np.uint8)


def chroma_replace(fr, card):
    """폰 화면의 초록 사각형에 결과지 카드를 박는다. 손가락은 마스크로 자동 가려진다."""
    f = fr.astype(np.int16)
    g = (f[:, :, 1] > 90) & (f[:, :, 1] - f[:, :, 0] > 45) & (f[:, :, 1] - f[:, :, 2] > 45)
    if g.sum() < 4000:
        return fr
    ys, xs = np.where(g)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    bw, bh = x1 - x0, y1 - y0
    ci = Image.fromarray(card.astype(np.uint8))
    sw = bw / ci.width
    sh = bh / ci.height
    s = max(sw, sh)
    ci = ci.resize((max(1, int(ci.width * s)), max(1, int(ci.height * s))), Image.LANCZOS)
    cx = (ci.width - bw) // 2
    cy = 0
    patch = np.asarray(ci.crop((cx, cy, cx + bw, cy + bh))).astype(np.float32)
    m = g[y0:y1, x0:x1].astype(np.float32)
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255.0
    m = m[:, :, None]
    reg = fr[y0:y1, x0:x1].astype(np.float32)
    fr[y0:y1, x0:x1] = (reg * (1 - m) + patch * m).astype(np.uint8)
    return fr


# ───────────────────────── 오디오 ─────────────────────────
def build_audio(out_wav):
    meta = json.load(open(f"{AUD}/_lines_meta.json", encoding="utf-8"))
    M = {int(m["file"][5:7]): m for m in meta}
    sr = 44100
    total = int(DUR * sr)
    mix = np.zeros(total, np.float32)
    import wave
    for i, t0, spoken, rows, peak in LINES:
        f = f"{AUD}/line_{i:02d}.wav"
        w = wave.open(f)
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        if w.getnchannels() > 1:
            a = a.reshape(-1, w.getnchannels()).mean(1)
        if w.getframerate() != sr:
            idx = np.linspace(0, len(a) - 1, int(len(a) * sr / w.getframerate()))
            a = np.interp(idx, np.arange(len(a)), a).astype(np.float32)
        tr = M.get(i, {}).get("trim", [0, len(a) / sr])
        a = a[int(tr[0] * sr):int(tr[1] * sr)]
        # 앞뒤 5ms 페이드(클릭 방지)
        e = int(sr * 0.005)
        if len(a) > 2 * e:
            a[:e] *= np.linspace(0, 1, e)
            a[-e:] *= np.linspace(1, 0, e)
        s = int(t0 * sr)
        n = min(len(a), total - s)
        if n > 0:
            mix[s:s + n] += a[:n]
    # 룸톤 베드 — 산군 랜딩 gate.mp4 오디오(있으면)
    bed = f"{MAT}/클립/audio/bed_gate.wav"
    if os.path.exists(bed):
        w = wave.open(bed)
        b = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        if w.getnchannels() > 1:
            b = b.reshape(-1, w.getnchannels()).mean(1)
        if w.getframerate() != sr:
            idx = np.linspace(0, len(b) - 1, int(len(b) * sr / w.getframerate()))
            b = np.interp(idx, np.arange(len(b)), b).astype(np.float32)
        if len(b) > 0:
            reps = int(np.ceil(total / len(b)))
            b = np.tile(b, reps)[:total] * 0.055
            mix += b
    mix = np.clip(mix, -1, 1)
    raw = f"{TMP}/narr_raw.wav"
    with wave.open(raw, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    loudnorm_2pass(raw, out_wav, DUR)
    return out_wav


# ───────────────────────── 엔드카드 ─────────────────────────
def endcard(W, H):
    bg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(bg)
    d.rectangle([0, 0, W, H], fill=(6, 5, 4, 245))
    logo = Image.open(f"{ROOT}/public/brand/logo-h-ivory.png").convert("RGBA")
    lw = int(W * 0.62)
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    bg.alpha_composite(logo, ((W - lw) // 2, int(H * 0.40)))
    f1 = font("myeongjo", int(46 * (1 if H > 1500 else 0.85)))
    t1 = "박수무당 사주 · 산군"
    d.text(((W - d.textlength(t1, font=f1)) / 2, int(H * 0.54)), t1, font=f1, fill=C["GOLD"] + (255,))
    f2 = font("myeongjo", int(38 * (1 if H > 1500 else 0.85)))
    t2 = "네 장부, 내가 먼저 봤다"
    d.text(((W - d.textlength(t2, font=f2)) / 2, int(H * 0.60)), t2, font=f2, fill=C["SOFT"] + (255,))
    return bg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*", default=["V0"])
    ap.add_argument("--ratios", default="9x16")
    a = ap.parse_args()
    variants = {
        "V0": ("h24", "긁힐 준비는 하고!"),
        "V2": ("h25", "긁힐 준비는 하고!"),
        "V3": ("h26", "긁힐 준비는 하고!"),
    }
    ids = list(variants) if a.ids == ["all"] else a.ids
    wav = f"{TMP}/narr.wav"
    if not os.path.exists(wav):
        log("audio …")
        build_audio(wav)
    for ratio in a.ratios.split(","):
        base, W, H = build_base(ratio)
        log("base", ratio, base)
        for vid in ids:
            hook_key, cta = variants[vid]
            layers = make_layers(ratio, hook_key, cta)
            layers.append({"im": endcard(W, H), "pos": (0, 0), "t0": END_T, "t1": DUR,
                           "fade": 0.10, "fade_out": 0.0, "pop": 0.0, "full": True, "reveal": None})
            tmp_out = f"{TMP}/{vid}_{ratio}.mp4"
            composite(ratio, layers, base, W, H, tmp_out, wav, CHROMA[2])
            final = f"{OUT}/sangun_vU5_{vid}_seoyun_1080x{H}.mp4"
            shutil.copyfile(tmp_out, final)
            log("saved", final, f"{os.path.getsize(final)/1e6:.1f}MB")


if __name__ == "__main__":
    main()
