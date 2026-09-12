"""영상 판정 — 4fps 프레임 추출 → 영역별 움직임(연속 프레임 평균차) · 루프 이음매(첫↔끝) · 카메라 드리프트 · 타일 시트.
usage: python loopjudge.py <mp4> <tag> <regions>   regions = "이름:x0,y0,x1,y1;..." (비율)
"""
import sys, os, subprocess, glob
from PIL import Image, ImageChops, ImageStat
FF = r"C:\Users\HP\AppData\Local\CapCut\Apps\8.7.0.3685\ffmpeg.exe"
vid, tag, regions = sys.argv[1], sys.argv[2], sys.argv[3]
out = os.path.join(os.path.dirname(vid), f"_frames_{tag}")
os.makedirs(out, exist_ok=True)
for f in glob.glob(os.path.join(out, "*.png")): os.remove(f)
subprocess.run([FF, "-loglevel", "error", "-y", "-i", vid, "-vf", "fps=4", os.path.join(out, "f%03d.png")], check=True)
frames = sorted(glob.glob(os.path.join(out, "f*.png")))
ims = [Image.open(f).convert("L") for f in frames]
W, H = ims[0].size
print(f"{tag}: {len(frames)}프레임 @4fps, {W}x{H}")
def diff(a, b, box=None):
    d = ImageChops.difference(a, b)
    if box: d = d.crop(box)
    return ImageStat.Stat(d).mean[0]
regs = {}
for r in regions.split(";"):
    name, v = r.split(":"); x0, y0, x1, y1 = [float(t) for t in v.split(",")]
    regs[name] = (int(x0*W), int(y0*H), int(x1*W), int(y1*H))
for name, box in regs.items():
    seq = [diff(ims[i], ims[i+1], box) for i in range(len(ims)-1)]
    print(f"  {name:8s} 연속차 평균={sum(seq)/len(seq):.2f} 최대={max(seq):.2f} | 첫↔끝(루프 이음매)={diff(ims[0], ims[-1], box):.2f}")
print(f"  전체     첫↔끝={diff(ims[0], ims[-1]):.2f}  첫↔중간={diff(ims[0], ims[len(ims)//2]):.2f}")
# 타일 시트 (2열, 원본 해상도 유지, 최대 12장 균등 샘플)
pick = frames[:: max(1, len(frames)//12)][:12]
tiles = [Image.open(f).convert("RGB") for f in pick]
tw, th = tiles[0].size; cols = 3; rows = (len(tiles)+cols-1)//cols
sheet = Image.new("RGB", (tw*cols, th*rows), (0,0,0))
for i, t in enumerate(tiles): sheet.paste(t, ((i%cols)*tw, (i//cols)*th))
sheet.thumbnail((1600, 3000))
sp = os.path.join(os.path.dirname(vid), f"_sheet_{tag}.png"); sheet.save(sp); print("  sheet:", sp)
