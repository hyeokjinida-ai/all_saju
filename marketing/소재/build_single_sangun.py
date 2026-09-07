# -*- coding: utf-8 -*-
"""산군이 주인공인 단일 이미지 — 만화판 산군 + 대사체 훅 + 하단 CTA 띠 (2026-09-07)
그림은 design/toon/sangun_toon/ 부품 재사용. 신규 생성 0.
⚠ 산군 얼굴은 갓 아래 완전 검정. 눈·입 그리지 않는다.
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SG   = os.path.abspath(os.path.join(ROOT, "..", "design", "toon", "sangun_toon"))
OUT  = os.path.join(ROOT, "소재", "산군", "단일_산군")
os.makedirs(OUT, exist_ok=True)

BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
MYEONGJO = r"C:\Windows\Fonts\batang.ttc"
PAPER=(248,244,236); INK=(26,22,22); RED=(186,40,32); BAND=(20,17,17); GOLD=(206,168,86)

def font(p,s,idx=0):
    try: return ImageFont.truetype(p,s,index=idx)
    except Exception: return ImageFont.truetype(BOLD,s)

def place(base, part, box_h, cx, cy):
    im = Image.open(os.path.join(SG, part + ".png")).convert("RGBA")
    # 흰 배경 제거
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a = px[x,y]
            if r>242 and g>240 and b>234: px[x,y]=(r,g,b,0)
    r = box_h/im.height
    im = im.resize((int(im.width*r), box_h), Image.LANCZOS)
    base.paste(im, (int(cx-im.width/2), int(cy-im.height/2)), im)

def make(name, part, hook, band, W=1080, H=1350, ph=0.52, py=0.62):
    im = Image.new("RGB",(W,H),PAPER)
    d = ImageDraw.Draw(im)
    # 위아래 얇은 금선
    d.line([(int(W*0.07),int(H*0.035)),(W-int(W*0.07),int(H*0.035))], fill=GOLD, width=3)
    place(im, part, int(H*ph), W*0.5, H*py)
    fh = font(MYEONGJO, int(W*0.096))
    fb = font(BOLD, int(W*0.038))
    lines = hook.split("\n")
    lh = int(W*0.125)
    y = int(H*0.075)
    for ln in lines:
        w = d.textlength(ln, font=fh)
        d.text(((W-w)//2+2, y+3), ln, font=fh, fill=(210,204,192))
        d.text(((W-w)//2, y), ln, font=fh, fill=INK)
        y += lh
    bh = int(H*0.094)
    d.rectangle([0,H-bh,W,H], fill=BAND)
    bw = d.textlength(band, font=fb)
    d.text(((W-bw)//2, H-bh+(bh-int(W*0.050))//2), band, font=fb, fill=(240,234,226))
    tri = int(W*0.019)
    for cx in (int(W*0.5-bw/2-tri*2.6), int(W*0.5+bw/2+tri*1.3)):
        cy = H-bh//2
        d.polygon([(cx,cy-tri//2),(cx+tri,cy-tri//2),(cx+tri//2,cy+tri)], fill=RED)
    p=os.path.join(OUT,name); im.save(p,"PNG",optimize=True)
    print(name, im.size, os.path.getsize(p)//1024,"KB")

ADS = [
 ("sg01_janbu_1080x1350.png","obj_book", "네 장부는\n이미 적혀 있다", "▼ 돈 드는 달, 새는 달 ▼", 1080,1350,0.42,0.62),
 ("sg01_janbu_1080x1920.png","obj_book", "네 장부는\n이미 적혀 있다", "▼ 돈 드는 달, 새는 달 ▼", 1080,1920,0.34,0.60),
 ("sg02_notonly_1080x1350.png","bust_arms","좋은 달만 골라\n말해주지 않는다", "▼ 새는 달까지 적어둡니다 ▼", 1080,1350,0.52,0.62),
 ("sg02_notonly_1080x1920.png","bust_arms","좋은 달만 골라\n말해주지 않는다", "▼ 새는 달까지 적어둡니다 ▼", 1080,1920,0.42,0.60),
 ("sg03_wait_1080x1350.png","bust_point","지금은\n나설 때가 아니다", "▼ 밀어붙일 때가 따로 있습니다 ▼", 1080,1350,0.52,0.62),
 ("sg03_wait_1080x1920.png","bust_point","지금은\n나설 때가 아니다", "▼ 밀어붙일 때가 따로 있습니다 ▼", 1080,1920,0.42,0.60),
]

if __name__ == "__main__":
    for a in ADS: make(*a)
