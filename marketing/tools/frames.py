# -*- coding: utf-8 -*-
"""
frames.py — 영상을 0.25초(4fps) 텀으로 캡처해 '읽을 수 있는' 시트로 만든다.

  python marketing/tools/frames.py <mp4...> [--fps 4] [--thr 6] [--out DIR] [--no-asr]

- 4fps 추출 → 연속 프레임 격자(6×10) 셀 최대 평균차가 --thr(기본 12) 미만이면 병합(타일에 1.25–2.50s 구간 표기)
- 타일은 원본 해상도(360×640 등) 그대로, 2×2 = 720×(1280+라벨) → 클로드 입력에서 다운스케일 없음
- faster-whisper small(로컬 캐시, CPU int8)로 <name>_transcript.txt (세그먼트 타임스탬프)
- CapCut ffmpeg 는 비ASCII 출력 경로에서 죽으므로 ASCII 임시 폴더에 뽑고 PIL 로 저장
"""
import sys, os, glob, json, argparse, subprocess, tempfile, shutil
from PIL import Image, ImageDraw, ImageFont
import numpy as np

FF = r"C:/Users/HP/AppData/Local/CapCut/Apps/8.7.0.3685/ffmpeg.exe"
FONT = r"C:/Windows/Fonts/malgunbd.ttf"


def extract(src, fps, tmp):
    out = os.path.join(tmp, "f_%05d.png")
    cmd = [FF, "-hide_banner", "-loglevel", "error", "-i", src,
           "-vf", f"fps={fps}", "-vsync", "0", out]
    subprocess.run(cmd, check=True)
    return sorted(glob.glob(os.path.join(tmp, "f_*.png")))


def cell_max(d, cols=6, rows=10):
    h, w = d.shape
    return max(d[j*h//rows:(j+1)*h//rows, i*w//cols:(i+1)*w//cols].mean()
               for j in range(rows) for i in range(cols))


def dedupe(files, fps, thr):
    """연속 프레임의 격자 셀 최대 평균차 < thr 이면 같은 구간으로 병합(전체 평균은 국소 변화를 놓친다)."""
    keep = []  # (t_start, t_end, path)
    prev = None
    for i, p in enumerate(files):
        t = i / fps
        im = np.asarray(Image.open(p).convert("L").resize((90, 160)), dtype=np.float32)
        # 격자(6x10) 셀별 평균차의 최대값 — 레터박스 띠·작은 자막처럼 국소 변화도 잡는다
        if prev is not None and cell_max(np.abs(im - prev)) < thr:
            keep[-1][1] = t
        else:
            keep.append([t, t, p])
        prev = im
    return keep


def sheets(keep, name, outdir, cols=2, rows=2):
    font = ImageFont.truetype(FONT, 22)
    w, h = Image.open(keep[0][2]).size
    label_h = 34
    per = cols * rows
    paths = []
    for s in range(0, len(keep), per):
        chunk = keep[s:s + per]
        sheet = Image.new("RGB", (cols * w, rows * (h + label_h)), (18, 18, 18))
        d = ImageDraw.Draw(sheet)
        for k, (t0, t1, p) in enumerate(chunk):
            x = (k % cols) * w
            y = (k // cols) * (h + label_h)
            sheet.paste(Image.open(p).convert("RGB"), (x, y + label_h))
            lab = f"{t0:.2f}s" if t1 == t0 else f"{t0:.2f}–{t1:.2f}s"
            d.text((x + 8, y + 5), lab, font=font, fill=(255, 230, 120))
        n = s // per + 1
        op = os.path.join(outdir, f"{name}_dense_{n:02d}.png")
        sheet.save(op, optimize=True)
        paths.append(op)
    return paths


def asr(src, name, outdir, tmp):
    wav = os.path.join(tmp, "a.wav")
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", src,
                    "-vn", "-ac", "1", "-ar", "16000", wav], check=True)
    from faster_whisper import WhisperModel
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segs, info = model.transcribe(wav, language="ko", vad_filter=True, beam_size=5)
    lines = []
    for sg in segs:
        lines.append(f"[{sg.start:6.2f}–{sg.end:6.2f}] {sg.text.strip()}")
    op = os.path.join(outdir, f"{name}_transcript.txt")
    with open(op, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) if lines else "(무음 또는 음성 없음)")
    return op, len(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("videos", nargs="+")
    ap.add_argument("--fps", type=float, default=4)
    ap.add_argument("--thr", type=float, default=12)
    ap.add_argument("--out", default=None)
    ap.add_argument("--no-asr", action="store_true")
    a = ap.parse_args()
    for src in a.videos:
        name = os.path.splitext(os.path.basename(src))[0]
        outdir = a.out or os.path.dirname(os.path.abspath(src))
        os.makedirs(outdir, exist_ok=True)
        tmp = tempfile.mkdtemp(prefix="fr_", dir=os.environ.get("TEMP"))
        try:
            files = extract(src, a.fps, tmp)
            keep = dedupe(files, a.fps, a.thr)
            sh = sheets(keep, name, outdir)
            meta = {"video": src, "fps": a.fps, "thr": a.thr, "frames": len(files),
                    "kept": len(keep), "sheets": [os.path.basename(p) for p in sh],
                    "segments": [[round(t0, 2), round(t1, 2)] for t0, t1, _ in keep]}
            tr = None
            if not a.no_asr:
                tr, nseg = asr(src, name, outdir, tmp)
                meta["transcript"] = os.path.basename(tr); meta["asr_segments"] = nseg
            with open(os.path.join(outdir, f"{name}_dense.json"), "w", encoding="utf-8") as f:
                json.dump(meta, f, ensure_ascii=False, indent=1)
            print(f"{name}: {len(files)} frames -> {len(keep)} kept -> {len(sh)} sheets"
                  + (f", asr {meta.get('asr_segments')} seg" if tr else ""))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
