"""산군 광고 vK — 「과거검증 드라마」 28초 (v6)

W4(TIGHT 「너 11월에 만나는 남자」 24.6s · 재집행 48회) 공식:
  과거검증 2연타 → 무너짐 → 미래(얼굴) → 감탄, CTA 0.
우리는 2인 실사 드라마 대신 **서윤 무성 푸티지(v5 A·B·C) + 결과지 2장 카드**로 같은 척추를 세운다.
푸티지·캡처 전부 기존 자산 → 생성비 0. TTS 7줄만 신규(≈1cr).

⚠ 재료를 먼저 읽고 대본을 맞췄다: 서윤 결과지 2장은 과거 연도를 **2개가 아니라 2024년 하나**만 짚는다.
   그래서 W4 의 「2014년…2020년」 두 연도 대신 **시간순 2연타**(21~30세 대운 → 2024년 31세)로 세운다.
   연·월 숫자는 **카드 안에서만** 보이고 자막·TTS 엔 0건이다.

  PYTHONUTF8=1 python marketing/tools/build_vk.py --ratios 9x16,4x5
"""
import argparse
import os
import shutil
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_seoyun as S   # 부품 재사용: text_layer/shadowed/fit_width/rounded/font/loudnorm/qsv/endcard

ROOT = S.ROOT
CAPS = S.CAPS
CLIPS = S.CLIPS
OUT = S.OUT
FF = S.FF
C = S.C
FPS = 30
DUR = 28.0
AUD = f"{S.MAT}/클립/audio/vk"
TMP = "C:/Users/HP/AppData/Local/Temp/claude/vkbuild"
os.makedirs(TMP, exist_ok=True)


def log(*a):
    print("[vK]", *a, flush=True)


# ── 대본 ────────────────────────────────────────────────────────────────
# (번호, 발화 시작, 자막 줄, 정점)  — TTS 실측 길이: 3.58 4.00 4.18 2.78 3.78 2.78 2.78
LINES = [
    (1, 0.80, ["심심해서", "생년월일만 넣었거든"], False),
    (2, 4.70, ["근데 내 이십 대가", "통째로 적혀 있음"], False),
    (3, 9.10, ["그리고 이 해.", "나 진짜 다 엎었던 해."], False),
    (4, 13.70, ["이걸 어떻게 알지?"], True),
    (5, 16.80, ["다음 사람은", "이렇게 생겼다는데"], False),
    (6, 21.00, ["왜 또 내 스타일인데"], False),
    (7, 24.10, ["아 이건 기분 나빠"], True),
]

# 훅 3줄 — 축만 바꾼 변형 3개(제작비 0). 2행 첫 단어가 주사색으로 덮인다.
HOOKS = {
    "k1": [("장난으로 넣었는데", 57, "bone"), ("엎었던 해를 짚음", 80, "red_word"), ("*실제 사주 서비스 화면입니다", 40, "pink")],
    "k2": [("사주가 내 이십 대를", 57, "bone"), ("통째로 적어놨음", 80, "red_word"), ("*실제 사주 서비스 화면입니다", 40, "pink")],
    "k3": [("무당이 내 다음 사람", 57, "bone"), ("얼굴을 보여줌", 80, "red_word"), ("*실제 사주 서비스 화면입니다", 40, "pink")],
}

# 카드 — full 은 풀프레임. 배경 전환(8.9s·19.9s)을 카드가 덮도록 시각을 맞췄다.
# ⚠ 첫 렌더 실측: 8줄 문단을 풀프레임으로 띄우니 5~13s(9초) 동안 서윤이 통째로 사라졌다.
#   W4 는 사주 텍스트가 1.5초씩 **화면 일부에만** 뜨고 무녀 얼굴이 내내 보인다. 그래서 핵심 3줄 핀으로 바꿨다.
CARDS = [
    ("pin", "seo_line_ch2_A3.png", 4.70, 7.90, {}),      # 21~30세 정묘 대운 — 「여러 역할을 오가며 수입과 경험을」
    ("pin", "seo_line_ch2_B3.png", 9.10, 12.30, {}),     # **2024년 31세** — 「사람이든 자리든 하나가 통째로 바뀌었고」
    ("full", "seo_partner_card_ad_blur.png", 16.80, 20.70, {}),  # 얼굴 **블러 유지**(W4 「이렇게 생겼어」 잠금)
]

# base 조각 — (클립, in, out). 합 28.0s. 전환점은 카드 아래에 숨는다.
SEGS = [("A", 0.0, 9.5), ("B", 2.5, 13.5), ("C", 2.0, 9.5)]   # 전환 9.5s·20.5s 는 카드가 덮는다
END_T = 26.90


def run(cmd):
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(" ".join(map(str, cmd[:8])) + "\n" + r.stderr.decode("utf-8", "replace")[-1200:])
    return r


def build_base(ratio):
    W, H = 1080, (1920 if ratio == "9x16" else 1350)
    base = f"{TMP}/base_{ratio}.mp4"
    if os.path.exists(base):
        return base, W, H
    log("  base 조각 3개 자르고 잇는다")
    parts = []
    for i, (name, a, b) in enumerate(SEGS):
        src = f"{TMP}/src_{name}.mp4"
        if not os.path.exists(src):
            shutil.copyfile(f"{CLIPS}/seo_{name}_15s.mp4", src)   # 한글 경로 회피
        dst = f"{TMP}/seg_{ratio}_{i}.mp4"
        vf = f"fps={FPS}" + (",crop=1080:1350:0:0" if ratio == "4x5" else "")   # 4:5 는 위 정렬(v5 실측)
        run([FF, "-y", "-loglevel", "error", "-ss", f"{a:.2f}", "-to", f"{b:.2f}", "-i", src,
             "-vf", vf, *S.qsv_args(14, "slow"), "-an", dst])
        parts.append(dst)
    lst = f"{TMP}/concat_{ratio}.txt"
    with open(lst, "w", encoding="utf-8") as f:
        for p in parts:
            f.write(f"file '{p}'\n")
    run([FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
         "-vf", f"tpad=stop_mode=clone:stop_duration=2,fps={FPS}", "-t", f"{DUR:.2f}",
         *S.qsv_args(14, "slow"), "-an", base])
    return base, W, H


def build_audio(out_wav):
    """TTS 7줄을 타임라인에 얹고 룸톤을 깐다. trim 은 무음 문턱으로 자동."""
    sr = 44100
    total = int(DUR * sr)
    mix = np.zeros(total, np.float32)
    for i, t0, rows, peak in LINES:
        w = wave.open(f"{AUD}/line_{i:02d}.wav")
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        if w.getnchannels() > 1:
            a = a.reshape(-1, w.getnchannels()).mean(1)
        if w.getframerate() != sr:
            idx = np.linspace(0, len(a) - 1, int(len(a) * sr / w.getframerate()))
            a = np.interp(idx, np.arange(len(a)), a).astype(np.float32)
        nz = np.where(np.abs(a) > 0.012)[0]          # 앞뒤 무음 잘라내기
        if len(nz):
            a = a[max(0, nz[0] - int(sr * 0.04)):min(len(a), nz[-1] + int(sr * 0.06))]
        e = int(sr * 0.005)
        if len(a) > 2 * e:
            a[:e] *= np.linspace(0, 1, e)
            a[-e:] *= np.linspace(1, 0, e)
        st = int(t0 * sr)
        n = min(len(a), total - st)
        if n > 0:
            mix[st:st + n] += a[:n]
    bed = f"{S.MAT}/클립/audio/bed_gate.wav"
    if os.path.exists(bed):
        w = wave.open(bed)
        b = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        if w.getnchannels() > 1:
            b = b.reshape(-1, w.getnchannels()).mean(1)
        if w.getframerate() != sr:
            idx = np.linspace(0, len(b) - 1, int(len(b) * sr / w.getframerate()))
            b = np.interp(idx, np.arange(len(b)), b).astype(np.float32)
        if len(b):
            mix += np.tile(b, int(np.ceil(total / len(b))))[:total] * 0.055
    raw = f"{TMP}/narr_raw.wav"
    with wave.open(raw, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
    S.loudnorm_2pass(raw, out_wav, DUR)
    return out_wav


def make_layers(ratio, hook_key):
    W, H = 1080, (1920 if ratio == "9x16" else 1350)
    L = []

    def add(im, pos, t0, t1, fade=0.12, fade_out=0.12, pop=0.0, full=False):
        L.append({"im": im.convert("RGBA"), "pos": pos, "t0": t0, "t1": t1,
                  "fade": fade, "fade_out": fade_out, "pop": pop, "full": full, "reveal": None})

    # ① 훅 3줄 — 전구간 고정(R3). 이 구도는 머리가 y8% 까지 올라오므로 천장 띠에 놓는다
    hk = HOOKS[hook_key]
    ys = [int(H * 0.030), int(H * 0.068), int(H * 0.142)] if ratio == "9x16" else [int(H * 0.020), int(H * 0.055), int(H * 0.135)]
    sc = 1.0 if ratio == "9x16" else 0.82
    items = []
    for (txt, px, style), y in zip(hk, ys):
        px = int(px * sc)
        col = {"bone": C["BONE"], "red_word": (255, 255, 255), "pink": (244, 194, 200)}[style]
        items.append((txt, "gothic_b" if style != "pink" else "gothic", px, col, y, 6 if style != "pink" else 3))
    hook = S.shadowed(S.text_layer((W, H), items), blur=10, alpha=170, dy=5)
    d = ImageDraw.Draw(hook)
    f2 = S.font("gothic_b", int(hk[1][1] * sc))
    t2 = hk[1][0]
    key = t2.split()[0]
    x2 = (W - d.textlength(t2, font=f2)) / 2
    d.text((x2, ys[1]), key, font=f2, fill=(242, 124, 88, 255), stroke_width=6, stroke_fill=(0, 0, 0, 235))
    add(hook, (0, 0), 0.0, END_T, fade=0.0, fade_out=0.5)

    # ② 자막 — TTS 문장. 정점은 1.8배
    cap_y = int(H * 0.527)
    for k, (i, t0, rows, peak) in enumerate(LINES):
        px = int((81 if peak else 45) * (1.0 if ratio == "9x16" else 0.85))
        items = []
        yy = cap_y - (len(rows) - 1) * int(px * 0.62)
        for r in rows:
            items.append((r, "gothic_b", px, C["WHITE"], yy, 5))
            yy += int(px * 1.24)
        im = S.shadowed(S.text_layer((W, H), items), blur=9, alpha=190, dy=4)
        nxt = LINES[k + 1][1] if k + 1 < len(LINES) else END_T
        add(im, (0, 0), t0 - 0.08, min(nxt - 0.10, t0 + 4.4), fade=0.10, fade_out=0.12)

    # ③ 카드 — 풀프레임(연도 문장을 읽혀야 한다). 배경 전환을 덮는 위치
    for kind, name, t0, t1, opt in CARDS:
        p = f"{CAPS}/{name}"
        if not os.path.exists(p):
            log("  카드 없음, 건너뜀:", name)
            continue
        im = Image.open(p).convert("RGB")
        if kind == "pin":
            card = S.rounded(S.fit_width(im, int(W * 0.92)), pad=18)
            add(card, (int((W - card.width) / 2), int(H * 0.60)), t0, t1, pop=0.18)
            continue
        side = int(W * 0.98)
        body = S.fit_width(im, side)
        if body.height > H * 0.88:
            body = body.resize((int(body.width * H * 0.88 / body.height), int(H * 0.88)), Image.LANCZOS)
        bg = Image.new("RGBA", (W, H), (8, 6, 5, 255))
        bg.alpha_composite(body.convert("RGBA"), ((W - body.width) // 2, (H - body.height) // 2))
        add(bg, (0, 0), t0, t1, fade=0.18, fade_out=0.18, full=True)
    return L


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*", default=["K0"])
    ap.add_argument("--ratios", default="9x16")
    a = ap.parse_args()
    # K0 = W4 그대로(CTA·엔드카드 0, 궁금증만) / KE = 엔드카드 1.1s
    variants = {"K0": ("k1", False), "KE": ("k1", True), "K2": ("k2", False), "K3": ("k3", False)}
    ids = list(variants) if a.ids == ["all"] else a.ids
    wav = f"{TMP}/narr.wav"
    if not os.path.exists(wav):
        log("audio …")
        build_audio(wav)
    for ratio in a.ratios.split(","):
        base, W, H = build_base(ratio)
        log("base", ratio, base)
        for vid in ids:
            hook_key, endcard = variants[vid]
            layers = make_layers(ratio, hook_key)
            if endcard:
                layers.append({"im": S.endcard(W, H), "pos": (0, 0), "t0": END_T, "t1": DUR,
                               "fade": 0.10, "fade_out": 0.0, "pop": 0.0, "full": True, "reveal": None})
            tmp_out = f"{TMP}/{vid}_{ratio}.mp4"
            S.DUR = DUR                     # composite 이 모듈 상수를 본다
            S.CHROMA = (0, 0, None)         # vK 는 크로마 없음
            S.FLASH = -1.0                  # v5 의 A→B 화이트 플래시(15.0s)는 vK 에 없다 — 이음매를 카드가 덮는다
            S.composite(ratio, layers, base, W, H, tmp_out, wav, None)
            final = f"{OUT}/sangun_vK_{vid}_seoyun_1080x{H}.mp4"
            shutil.copyfile(tmp_out, final)
            log("saved", final, f"{os.path.getsize(final)/1e6:.1f}MB")


if __name__ == "__main__":
    main()
