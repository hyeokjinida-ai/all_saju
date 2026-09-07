# -*- coding: utf-8 -*-
"""
산군 체험형(AI UGC) 광고 빌더 — marketing/tools/build_ugc.py (2026-08-23)

명세: marketing/소재/산군/광고영상_기획_v4_체험형공장_2026-08-23.md §4
  U1 = exp_11(광고 9개 재사용) 규격 — 서비스 화면 100% 배경 + 훅 3줄 카드 82% 고정
       + 크리에이터 우하단 PIP(박스 34%) + 정중앙 검정박스 자막(75px, 1.75s) + 결과지 41% + 엔드 포스터
  U2 = exp_08(×7) 규격 — 훅 2줄 100% 고정 + 셀피 원테이크 + 우하단 카드 슬롯 교체 + 숫자 카드 풀스크린

실행:
  PYTHONUTF8=1 python marketing/tools/build_ugc.py u1 --ratios 9x16,4x5
  PYTHONUTF8=1 python marketing/tools/build_ugc.py u1 u2 --ratios 9x16,4x5 --check

컷 타이밍은 대본 그리드가 아니라 **클립의 실제 발화 시각(Whisper)** 에 맞춘다 — `<clip>_asr.json`.
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_ads import (CONFIG, FF, TMP, OUT, CAPS, CLIPS, AUDIO, MAT, FORBIDDEN,
                       canvas, contact_sheet, ffdur, ffinfo, font, log, loudness,
                       loudnorm_2pass, qsv_args, render_text_layer, run, wrap_plain)

Image.MAX_IMAGE_PIXELS = None
UGC = f"{MAT}/UGC"
os.makedirs(f"{TMP}/ugc", exist_ok=True)

# ───────────────────────────── 규격(실측 C — 위닝 %) ─────────────────────────────
U = {
    "u1": {  # exp_11 ×9
        "hook": [{"y": 0.255, "size": 57, "text": "얼굴 없는 *박수무당*?", "stroke": 4, "accent": (255, 120, 190)},
                 {"y": 0.313, "size": 84, "text": "신점보다 독한 사주", "stroke": 6},
                 {"y": 0.372, "size": 40, "text": "* 실제 서비스 화면 · 1994년생 예시 결과", "stroke": 2, "color": (250, 190, 215)}],
        "cap": {"y": 0.523, "size": 75, "box": {"pad": (34, 18), "alpha": 0.66, "radius": 26}},
        # 실측 exp_11 = 인물 **컷아웃**(둥근 창 아님). 머리 꼭대기 y48% · 바닥 정렬 → 실루엣 점유 ≈20%
        "pip": {"mode": "cutout", "head_top": 0.48, "margin": 10, "gamma": (0.06, 0.88)},
        "hook_pct": 0.78,          # 실측 82%(16.5s 중 13.5s) — 마지막 자막 시작에서 제거
        "end": 2.4,                # 엔드 포스터
    },
    "u2": {  # exp_08 ×7
        "hook": [{"y": 0.136, "size": 76, "text": "신점 대신 본다는", "stroke": 5},
                 {"y": 0.190, "size": 76, "text": "*독한* 박수무당 사주", "stroke": 5, "accent": (232, 60, 60)},
                 {"y": 0.248, "size": 38, "text": "* 실제 서비스 화면 · 1994년생 예시 결과", "stroke": 2, "color": (245, 200, 200)}],
        "cap": {"y": 0.514, "size": 45, "box": {"pad": (26, 14), "alpha": 0.62, "radius": 18}},
        "pip": None,               # 셀피가 배경 전체
        "slot": {"box": (0.53, 0.565, 0.96, 0.975), "radius": 16, "pop": 0.25},
        "hook_pct": 1.0,           # 전체 고정
        "end": 1.8,
    },
}
BRAND = "명운록 · 박수무당 사주"


# ───────────────────────────── 캡처 조각 ─────────────────────────────
def cap(name):
    return Image.open(f"{CAPS}/{name}").convert("RGB")


def screen_from(img, W, H, frac=0.0, mode="cover"):
    """세로로 긴 캡처에서 frac(0~1) 지점의 한 화면을 W×H 로 뽑는다."""
    s = W / img.width
    ih = int(round(img.height * s))
    im = img.resize((W, ih), Image.LANCZOS)
    if ih <= H:
        out = Image.new("RGB", (W, H), (8, 6, 5))
        out.paste(im, (0, (H - ih) // 2))
        return out
    y0 = int(round((ih - H) * frac))
    return im.crop((0, y0, W, y0 + H))


def flip_screens(W, H, n=18, lo=0.06, hi=0.92):
    src = cap("cap_result_full.png")
    return [screen_from(src, W, H, lo + (hi - lo) * i / (n - 1)) for i in range(n)]


# ───────────────────────────── 텍스트 레이어 ─────────────────────────────
def text_png(ratio, spec, y_pct, kind):
    W, H = canvas(ratio)
    y = int(round(H * y_pct))
    C = CONFIG["colors"]
    col = spec.get("color", C["WHITE"])
    if kind == "hook":
        return render_text_layer(W, H, [spec["text"]], "gothic_b", spec["size"], col, y,
                                 stroke=spec.get("stroke", 4), lh=1.15, bold=1,
                                 accent=spec.get("accent", (255, 120, 190)))
    if kind == "cap":
        size, maxw = spec["size"], spec.get("maxw", 900)
        while size > 52 and font("gothic_b", size).getlength(spec["text"]) > maxw:
            size -= 2                                    # 실측 = 1줄 고정. 넘치면 줄바꿈이 아니라 축소
        return render_text_layer(W, H, [spec["text"]], "gothic_b", size, col, y, stroke=0, lh=1.22,
                                 box=spec["box"], shadow=False)
    if kind == "brand":
        return render_text_layer(W, H, [spec["text"]], "myeongjo", spec["size"], C["GOLD"], y,
                                 stroke=3, lh=1.2, bold=2)
    raise ValueError(kind)


def rounded_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    return m


# ───────────────────────────── 대본 (ASR 세그먼트별 문장 묶음) ─────────────────────────────
SCRIPT = {
    "u1": [["신점 대신 본다는 사주가", "있다길래 해 봤어요"],
           ["생년월일만 넣으면", "A4 열 장짜리 장부가 나오는데"],
           ["안 좋은 것도 그대로 적어 주고"],
           ["다음에 만날 사람", "얼굴까지 나와요"],
           ["돈 그릇의 크기까지"],
           ["걍 저 인생 스포당했는데"]],
    "u2": [["어 이거 진짜 미친 거 아니야", "정확도가 미쳤는데"],
           ["용한 데 찾아 세 시간 갈 거 없이", "그냥 이거 보면 되겠는데?"],
           ["여러분 이거 봐요", "제가 하는 일 맞추고"],
           ["제 연애 고민 맞추고", "제가 과거에 힘들었던 시기랑"],
           ["그리고 알고 보니까", "이게 A4 열 장짜리래요"],
           ["제가 재미로 봤다가", "소름 끼쳐서 지금 좀 심각해졌어요"],
           ["와 한번 보세요 진짜 추천"]],
}


def split_subs(asr, script, tail=0.18):
    """ASR 세그먼트(발화 실측 구간)를 그 안의 문장들에 글자수 비례로 나눈다.
    ASR 텍스트는 오인식이 있으므로 **문구는 대본**을 쓰고 **시각만** ASR 에서 가져온다."""
    subs = []
    n = min(len(asr), len(script))
    for i in range(n):
        s0, s1 = asr[i]["s"], asr[i]["e"]
        nxt = asr[i + 1]["s"] if i + 1 < n else s1 + tail
        lines = script[i]
        tot = sum(len(x) for x in lines)
        t = s0
        for j, x in enumerate(lines):
            d = (s1 - s0) * len(x) / tot
            if j == len(lines) - 1:
                end = min(s1 + tail, nxt - 0.02)      # tail 이 다음 세그먼트를 침범하면 자막 2장이 겹친다
            else:
                end = t + d
            subs.append((round(t, 3), round(max(end, t + 0.3), 3), x))
            t = min(end, s1) if j < len(lines) - 1 else end
    return subs


def number_card(W, H, frac=0.575):
    """수상 포스터 자리 대체 — 숫자 카드(실측 exp_08 15.0~17.75s 풀스크린 72%)."""
    cw, ch = int(W * 0.86), int(H * frac)
    card = Image.new("RGB", (cw, ch), (10, 8, 7))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((6, 6, cw - 7, ch - 7), radius=28, outline=(196, 158, 74), width=4)
    C = CONFIG["colors"]
    # 분량(A4 몇 장·몇 분)은 형님 지시로 걷었다(2026-09-02) — 착지 티저에서 전부 뺀 앵커라
    # 광고에서만 약속하면 어긋난다. 그 자리에 티저 마감 펀치와 같은 말을 세운다.
    rows = [("11장", "네 장부의 章"), ("움직일 달", "날짜로 박아 둔다"), ("조심할 달", "미리 알고 넘긴다"), ("전액 환불", "제대로 안 나오면")]
    fb = font("myeongjo", int(ch * 0.105))
    fs = font("gothic", int(ch * 0.036))
    y = int(ch * 0.10)
    for big, small in rows:
        wb = d.textlength(big, font=fb)
        ws = d.textlength(small, font=fs)
        d.text(((cw - ws) / 2, y), small, font=fs, fill=C["SOFT"])
        y += int(ch * 0.052)
        d.text(((cw - wb) / 2, y), big, font=fb, fill=C["GOLD"])
        y += int(ch * 0.16)
    return card


# ───────────────────────────── 스토리 ─────────────────────────────
def story_u1(asr, clip_dur, ratio):
    """자막·컷을 Whisper 실측 발화 시각에 맞춘다."""
    W, H = canvas(ratio)
    seg = asr
    subs = split_subs(seg, SCRIPT["u1"])
    t_end = clip_dur
    dur = t_end + U["u1"]["end"]

    flips = flip_screens(W, H, 18)
    gate = screen_from(cap("cap_gate_9x16.png"), W, H, 0.0)
    inp = screen_from(cap("cap_input_birth_9x16.png"), W, H, 0.22)
    face = screen_from(cap("cap_partner_card.png"), W, H, 0.10)
    money = screen_from(cap("cap_result_money_chapter_x5_crop.png"), W, H, 0.30)
    poster = screen_from(cap("cap_result_cover_9x16.png"), W, H, 0.0)
    chart = screen_from(cap("cap_result_cover_9x16.png"), W, H, 1.0)

    s = [x["s"] for x in seg]
    e = [x["e"] for x in seg]
    bg = [
        {"t0": 0.0,        "t1": s[1] - 0.55, "kind": "still", "img": gate,  "move": (1.0, 1.045)},
        {"t0": s[1] - 0.55, "t1": s[1] + 1.6, "kind": "clip",  "src": f"{CLIPS}/a1_front_7s_1080.mp4", "ss": 0.4},
        {"t0": s[1] + 1.6, "t1": e[1] + 0.15, "kind": "still", "img": inp,   "move": (1.0, 1.03)},
        {"t0": e[1] + 0.15, "t1": e[2] + 0.2, "kind": "flip",  "imgs": flips[:8],  "each": 0.34},
        {"t0": e[2] + 0.2, "t1": s[3] + 1.05, "kind": "flip",  "imgs": flips[8:13], "each": 0.34},
        {"t0": s[3] + 1.05, "t1": e[3] + 0.25, "kind": "still", "img": face, "move": (1.0, 1.05)},
        {"t0": e[3] + 0.25, "t1": e[4] + 0.5, "kind": "still", "img": money, "move": (1.0, 1.04)},
        {"t0": e[4] + 0.5,  "t1": t_end,      "kind": "still", "img": chart, "move": (1.0, 1.04)},
        {"t0": t_end,       "t1": dur,        "kind": "still", "img": poster, "move": (1.0, 1.03), "dim": 0.62},
    ]
    hook_t1 = subs[-1][0]
    texts = []
    for h in U["u1"]["hook"]:
        texts.append({"png": text_png(ratio, h, h["y"], "hook"), "t0": 0.0, "t1": hook_t1, "fade_out": 0.25})
    for (a, b, t) in subs:
        spec = dict(U["u1"]["cap"]); spec["text"] = t
        texts.append({"png": text_png(ratio, spec, spec["y"], "cap"), "t0": a, "t1": min(b, t_end), "fade": 0.12})
    texts.append({"png": text_png(ratio, {"text": BRAND, "size": 52}, 0.455, "brand"), "t0": t_end + 0.25, "t1": dur, "fade": 0.3})
    return {"id": "vU1_face", "dur": dur, "bg": bg, "texts": texts,
            "pip": U["u1"]["pip"], "clip_t0": 0.0, "clip_dur": clip_dur, "subs": subs}


def story_u2(asr, clip_dur, ratio):
    W, H = canvas(ratio)
    seg = asr
    t_end = clip_dur
    dur = t_end + U["u2"]["end"]
    subs = split_subs(seg, SCRIPT["u2"])
    _ = subs
    # 「그리고 알고 보니까 / 이게 A4 열 장짜리래요」 구간 = 실측 권위 포스터 자리 → 숫자 카드 풀스크린
    big_t0 = seg[4]["s"] if len(seg) > 4 else t_end * 0.63
    big_t1 = min(seg[4]["e"] + 0.4, t_end) if len(seg) > 4 else big_t0 + 2.75
    # 우하단 카드 슬롯 — 0초부터 존재(실측 ×7 의 핵심)
    slots = [
        (0.0, min(1.6, t_end), screen_from(cap("cap_result_cover_9x16.png"), 900, 1600, 0.0)),
        (1.8, min(5.4, t_end), screen_from(cap("cap_teaser_full.png"), 900, 1600, 0.36)),
        (min(6.0, t_end), min(8.6, t_end), screen_from(cap("cap_result_full.png"), 900, 1600, 0.13)),
        (min(8.9, t_end), min(11.4, t_end), screen_from(cap("cap_result_money_chapter.png"), 900, 1600, 0.30)),
        (min(11.6, t_end), min(15.0, t_end), screen_from(cap("cap_partner_card.png"), 900, 1600, 0.10)),
        (min(19.2, t_end), min(22.4, t_end), screen_from(cap("cap_result_money_chapter_x5_crop.png"), 900, 1600, 0.25)),
    ]
    texts = []
    for h in U["u2"]["hook"]:
        texts.append({"png": text_png(ratio, h, h["y"], "hook"), "t0": 0.0, "t1": dur})
    for (a, b, t) in subs:
        spec = dict(U["u2"]["cap"]); spec["text"] = t
        y = 0.855 if (a < big_t1 and big_t0 < b) else spec["y"]   # 숫자 카드 구간엔 자막을 카드 아래로
        texts.append({"png": text_png(ratio, spec, y, "cap"), "t0": a, "t1": min(b, t_end), "fade": 0.1})
    texts.append({"png": text_png(ratio, {"text": BRAND, "size": 52}, 0.455, "brand"), "t0": t_end + 0.2, "t1": dur, "fade": 0.25})
    poster = screen_from(cap("cap_result_cover_9x16.png"), W, H, 0.0)
    bg = [{"t0": 0.0, "t1": t_end, "kind": "clipfull"},
          {"t0": t_end, "t1": dur, "kind": "still", "img": poster, "move": (1.0, 1.03), "dim": 0.62}]
    return {"id": "vU2_selfie", "dur": dur, "bg": bg, "texts": texts, "pip": None, "slots": slots,
            "big": (big_t0, big_t1, number_card(W, H)), "clip_t0": 0.0, "clip_dur": clip_dur, "subs": subs}


# ───────────────────────────── 렌더 ─────────────────────────────
def decode_frames(path, W, H, fps, n, fit="cover", anchor=0.35):
    """영상 → RGB numpy 프레임 목록(정확히 n장, 모자라면 마지막 프레임 반복)."""
    vf = f"fps={fps},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}:(iw-{W})/2:(ih-{H})*{anchor}"
    p = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-i", path, "-vf", vf,
                        "-pix_fmt", "rgb24", "-f", "rawvideo", "-"], capture_output=True)
    if p.returncode != 0:
        raise RuntimeError(p.stderr.decode("utf-8", "replace")[-2000:])
    buf = np.frombuffer(p.stdout, dtype=np.uint8)
    got = buf.size // (W * H * 3)
    arr = buf[:got * W * H * 3].reshape(got, H, W, 3)
    if got >= n:
        return arr[:n]
    return np.concatenate([arr, np.repeat(arr[-1:], n - got, axis=0)], axis=0)


_MV = {}


class FrameStream:
    """ffmpeg 파이프에서 프레임을 순차로 읽는다(전 프레임을 메모리에 올리지 않는다)."""

    def __init__(self, path, W, H, fps, pad=True):
        vf = f"fps={fps},scale={W}:{H}"
        self.W, self.H, self.n = W, H, W * H * 3
        self.p = subprocess.Popen([FF, "-hide_banner", "-loglevel", "error", "-i", path, "-vf", vf,
                                   "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
                                  stdout=subprocess.PIPE, bufsize=self.n * 4)
        self.last = np.zeros((H, W, 3), np.uint8)
        self.i = -1

    def at(self, idx):
        while self.i < idx:
            b = self.p.stdout.read(self.n)
            if not b or len(b) < self.n:
                break
            self.last = np.frombuffer(b, np.uint8).reshape(self.H, self.W, 3)
            self.i += 1
        return self.last

    def close(self):
        try:
            self.p.stdout.close(); self.p.wait(timeout=5)
        except Exception:
            self.p.kill()


def cutout_geometry(pip, W, H, sw, sh):
    """실루엣 머리 꼭대기를 head_top 에 두고 바닥 정렬 → (w,h,x0,y0). sw/sh = 소스 비율."""
    top = 0.138                                   # 컷아웃 클립에서 실루엣 상단 비율(실측)
    h = int(round((1 - pip["head_top"]) * H / (1 - top)))
    w = int(round(h * sw / sh))
    return w, h, W - w - pip["margin"], H - h


def move_frame(img, W, H, z):
    z = round(z, 3)
    key = (id(img), W, H, z)
    if key in _MV:
        return _MV[key]
    if abs(z - 1.0) < 1e-4:
        out = np.asarray(img, dtype=np.uint8)
    else:
        w, h = int(round(W * z)), int(round(H * z))
        im = img.resize((w, h), Image.LANCZOS)
        x0, y0 = (w - W) // 2, (h - H) // 2
        out = np.asarray(im.crop((x0, y0, x0 + W, y0 + H)), dtype=np.uint8)
    if len(_MV) < 400:
        _MV[key] = out
    return out


def build(story_key, ratio, clip_path, asr_path, out_name, notext=False, dump=None):
    W, H = canvas(ratio)
    fps = CONFIG["fps"]
    asr = json.load(open(asr_path, encoding="utf-8"))
    clip_dur = ffdur(clip_path)
    st = (story_u1 if story_key == "u1" else story_u2)(asr, clip_dur, ratio)
    dur = st["dur"]
    N = int(round(dur * fps))
    log(f"{st['id']} {ratio} {dur:.2f}s {N}f")

    # 1) 크리에이터 클립 프레임
    cut_path = clip_path.replace(".mp4", "_cut.mp4")
    if story_key == "u1":
        pip = st["pip"]
        pw, ph, px, py = cutout_geometry(pip, W, H, 1080, 1920)
        so = FrameStream(clip_path, pw, ph, fps)      # 원본(밝기 기준)
        sc = FrameStream(cut_path, pw, ph, fps)       # 누끼(검정 위 프리멀티플라이)
        g0, g1 = pip["gamma"]
        clip_fr = None
    else:
        clip_fr = decode_frames(clip_path, W, H, fps, int(round(clip_dur * fps)), anchor=0.30)

    # 2) 배경 프레임 만들기
    def bg_frame(t):
        for c in st["bg"]:
            if c["t0"] - 1e-6 <= t < c["t1"]:
                u = (t - c["t0"]) / max(1e-6, c["t1"] - c["t0"])
                if c["kind"] == "still":
                    z0, z1 = c.get("move", (1.0, 1.0))
                    fr = move_frame(c["img"], W, H, z0 + (z1 - z0) * u)
                    return (fr * (1.0 - c["dim"])).astype(np.uint8) if c.get("dim") else fr
                if c["kind"] == "flip":
                    k = min(len(c["imgs"]) - 1, int((t - c["t0"]) / c["each"]))
                    return np.asarray(c["imgs"][k], dtype=np.uint8)
                if c["kind"] == "clip":
                    if "_fr" not in c:
                        n = int(round((c["t1"] - c["t0"]) * fps)) + 2
                        c["_fr"] = decode_frames(c["src"], W, H, fps, n)
                    return c["_fr"][min(len(c["_fr"]) - 1, int((t - c["t0"]) * fps))]
                if c["kind"] == "clipfull":
                    return clip_fr[min(len(clip_fr) - 1, int(t * fps))]
        return np.zeros((H, W, 3), np.uint8)

    # 3) 텍스트 레이어 (RGBA numpy)
    layers = []
    if dump:
        os.makedirs(dump, exist_ok=True)
        for n, tx in enumerate(st["texts"]):
            img, _ = tx["png"]
            img.save(f"{dump}/{st['id']}_{ratio}_{n:02d}_{tx['t0']:05.2f}-{tx['t1']:05.2f}s.png")
    for tx in ([] if notext else st["texts"]):
        img, bbox = tx["png"]
        x0, y0, x1, y1 = [int(v) for v in bbox]
        x0, y0 = max(0, x0 - 4), max(0, y0 - 4)
        x1, y1 = min(W, x1 + 4), min(H, y1 + 4)
        a = np.asarray(img.crop((x0, y0, x1, y1)), dtype=np.float32)   # bbox 안에서만 합성(전체 캔버스 블렌드는 느리다)
        layers.append({"rgb": a[..., :3], "a": a[..., 3:4] / 255.0, "t0": tx["t0"], "t1": tx["t1"],
                       "fade": tx.get("fade", 0.2), "fade_out": tx.get("fade_out", 0.18), "roi": (x0, y0, x1, y1)})

    # 3-b) U2 카드 슬롯
    slot_imgs = []
    if story_key == "u2":
        sb = U["u2"]["slot"]["box"]
        sw, sh = int(round(W * (sb[2] - sb[0]))), int(round(H * (sb[3] - sb[1])))
        smask = np.asarray(rounded_mask(sw, sh, U["u2"]["slot"]["radius"]), dtype=np.float32)[..., None] / 255.0
        sx, sy = int(round(W * sb[0])), int(round(H * sb[1]))
        for (a, b, im) in st["slots"]:
            if b <= a:
                continue
            slot_imgs.append((a, b, np.asarray(im.resize((sw, sh), Image.LANCZOS), dtype=np.uint8)))

    # 4) 합성 → 인코드
    raw = f"{TMP}/ugc/{st['id']}_{ratio}.mp4"
    enc = subprocess.Popen([FF, "-hide_banner", "-loglevel", "error", "-y",
                            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                            *qsv_args(CONFIG["enc"]["gq"], CONFIG["enc"]["preset"]), "-pix_fmt", "yuv420p", raw],
                           stdin=subprocess.PIPE)
    for i in range(N):
        t = i / fps
        f = bg_frame(t).astype(np.float32)
        if story_key == "u1" and t < clip_dur:
            k = int(t * fps)
            O = so.at(k).astype(np.float32)
            C = sc.at(k).astype(np.float32)
            lo = O.mean(2, keepdims=True); lc = C.mean(2, keepdims=True)
            al = np.clip((np.clip(lc / np.maximum(lo, 1.0), 0, 1) - g0) / (g1 - g0), 0, 1)
            reg = f[py:py + ph, px:px + pw]
            f[py:py + ph, px:px + pw] = C + reg * (1 - al)     # 프리멀티플라이 합성(머리카락 가장자리 보존)
        if story_key == "u2" and st["big"][0] <= t < st["big"][1]:
            bt0, bt1, bimg = st["big"]
            bw, bh = bimg.size
            ox, oy = (W - bw) // 2, min(int(H * 0.245), H - bh - 10)   # 훅 2줄 아래에서 시작
            fade = min(1.0, (t - bt0) / 0.3, (bt1 - t) / 0.3)
            barr = np.asarray(bimg, dtype=np.float32)
            f[oy:oy + bh, ox:ox + bw] = f[oy:oy + bh, ox:ox + bw] * (1 - fade) + barr * fade
        elif story_key == "u2":
            for (a, b, arr) in slot_imgs:
                if a <= t < b:
                    pop = min(1.0, (t - a) / U["u2"]["slot"]["pop"])
                    if pop >= 1.0:
                        reg = f[sy:sy + sh, sx:sx + sw]
                        f[sy:sy + sh, sx:sx + sw] = reg * (1 - smask) + arr.astype(np.float32) * smask
                        break
                    sc = 0.62 + 0.38 * pop
                    ww, hh = int(sw * sc), int(sh * sc)
                    ox, oy = sx + (sw - ww) // 2, sy + (sh - hh) // 2
                    small = np.asarray(Image.fromarray(arr).resize((ww, hh), Image.LANCZOS), dtype=np.float32)
                    m2 = np.asarray(rounded_mask(ww, hh, U["u2"]["slot"]["radius"]), dtype=np.float32)[..., None] / 255.0
                    reg = f[oy:oy + hh, ox:ox + ww]
                    f[oy:oy + hh, ox:ox + ww] = reg * (1 - m2) + small * m2
                    break
        for L in layers:
            if L["t0"] - 1e-6 <= t < L["t1"]:
                al = 1.0
                if t - L["t0"] < L["fade"]:
                    al = (t - L["t0"]) / L["fade"]
                if L["t1"] - t < L["fade_out"] and L["fade_out"] > 0:
                    al = min(al, (L["t1"] - t) / L["fade_out"])
                a = L["a"] * al
                rx0, ry0, rx1, ry1 = L["roi"]
                reg = f[ry0:ry1, rx0:rx1]
                f[ry0:ry1, rx0:rx1] = reg * (1 - a) + L["rgb"] * a
        enc.stdin.write(np.clip(f, 0, 255).astype(np.uint8).tobytes())
    enc.stdin.close()
    if enc.wait() != 0:
        raise RuntimeError("encode failed")
    if story_key == "u1":
        so.close(); sc.close()

    # 5) 오디오 = 크리에이터 목소리 + 베드
    mixwav = f"{TMP}/ugc/{st['id']}_{ratio}_mix.wav"
    wav = f"{TMP}/ugc/{st['id']}_{ratio}.m4a"
    bed = f"{AUDIO}/bed_gate.wav"
    fc = (f"[0:a]atrim=0:{clip_dur},asetpts=N/SR/TB,apad=whole_dur={dur}[v];"
          f"[1:a]aloop=loop=-1:size=2e9,atrim=0:{dur},volume=0.16,afade=t=out:st={dur-0.8}:d=0.8[b];"
          f"[v][b]amix=inputs=2:duration=first:dropout_transition=0[a]")
    run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", clip_path, "-i", bed,
         "-filter_complex", fc, "-map", "[a]", "-ar", str(CONFIG["aac"]["ar"]),
         "-ac", "2", "-t", f"{dur:.3f}", mixwav])
    norm = f"{TMP}/ugc/{st['id']}_{ratio}_n.wav"
    loudnorm_2pass(mixwav, norm, dur)          # 1패스 동적 모드는 −14.7 로 뜬다(실측) → 측정→선형 2패스
    run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", norm, "-c:a", "aac",
         "-b:a", CONFIG["aac"]["br"], "-ar", str(CONFIG["aac"]["ar"]), wav])

    final_tmp = f"{TMP}/ugc/{out_name}"
    run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-i", wav,
         "-map", "0:v", "-map", "1:a", "-c", "copy", "-shortest", final_tmp])
    dst = f"{OUT}/{out_name}"
    os.replace(final_tmp, dst)
    meta = {"id": st["id"], "ratio": ratio, "dur": dur, "subs": [[a, b, t] for a, b, t in st["subs"]],
            "hook": [h["text"] for h in U[story_key]["hook"]]}
    json.dump(meta, open(f"{TMP}/ugc/{out_name}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    log("->", dst)
    return dst, meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="+", choices=["u1", "u2"])
    ap.add_argument("--ratios", default="9x16,4x5")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--notext", action="store_true", help="자막·훅 없는 편집용 마스터")
    ap.add_argument("--dump", default=None, help="텍스트 레이어 투명 PNG 저장 폴더")
    a = ap.parse_args()
    src = {"u1": (f"{UGC}/ugc_u1_15s.mp4", f"{UGC}/ugc_u1_15s_asr.json", "sangun_vU1_face"),
           "u2": (f"{UGC}/ugc_u2_24s.mp4", f"{UGC}/ugc_u2_24s_asr.json", "sangun_vU2_selfie")}
    rows = []
    for key in a.ids:
        clip, asr, base = src[key]
        for ratio in a.ratios.split(","):
            W, H = canvas(ratio)
            name = f"{base}_{W}x{H}.mp4"
            if a.notext:
                name = name.replace(".mp4", "_notext.mp4")
            path, meta = build(key, ratio, clip, asr, name, notext=a.notext, dump=a.dump)
            if a.check:
                info = ffinfo(path)
                I, _ = loudness(path)
                hits = [w for t in [s[2] for s in meta["subs"]] + meta["hook"] for w in FORBIDDEN if w in t]
                probs = []
                if info["w"] != 1080 or info["h"] not in (1920, 1350):
                    probs.append("해상도")
                if info["mb"] > CONFIG["enc"]["max_mb"]:
                    probs.append(f"용량 {info['mb']:.1f}MB")
                if I is None or abs(I - CONFIG["loud"]["I"]) > 1.0:
                    probs.append(f"음량 {I}")
                if hits:
                    probs.append("금지어 " + ",".join(hits))
                contact_sheet(path, f"{OUT}/{name[:-4]}_sheet.png")
                rows.append(f"| {name} | {info['dur']:.2f}s | {info['w']}×{info['h']} | {info['mb']:.1f}MB | "
                            f"{I:.1f} | {'0' if not hits else '⚠'} | {'PASS' if not probs else 'FAIL: ' + '; '.join(probs)} |")
    if rows:
        print("\n| 파일 | 길이 | 해상도 | 용량 | LUFS | 금지어 | 판정 |")
        print("|---|---|---|---|---|---|---|")
        print("\n".join(rows))


if __name__ == "__main__":
    main()
