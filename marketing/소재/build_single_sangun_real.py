# -*- coding: utf-8 -*-
"""산군 실사 단일 이미지 — 처음 보는 사람에게 걸리는 훅 (2026-09-07)
훅 규칙: 우리 내부 용어(장부 등)로 시작하지 않는다. 독자 상황이나 질문으로 연다.
근거 문법: 귀신사주 「청송 귀자할매 알아?」(재집행 77회) = 질문 + 고유명사 / 「장사는 되는데 이상하게 돈은 안남는다」
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.abspath(os.path.join(ROOT, "..", "public", "products", "sangun"))
OUT  = os.path.join(ROOT, "소재", "산군", "단일_산군실사")
os.makedirs(OUT, exist_ok=True)

MYEONGJO = r"C:\Windows\Fonts\batang.ttc"
BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
BONE=(240,236,228); SOFT=(196,188,175); RED=(190,44,36); BAND=(14,12,12)

def font(p,s,idx=0):
    try: return ImageFont.truetype(p,s,index=idx)
    except Exception: return ImageFont.truetype(BOLD,s)

def cover(img,W,H,anchor=0.3):
    r=max(W/img.width,H/img.height)
    im=img.resize((int(img.width*r),int(img.height*r)),Image.LANCZOS)
    x=(im.width-W)//2; y=int((im.height-H)*anchor)
    return im.crop((x,y,x+W,y+H))

def scrim(base, frac):
    W,H=base.size
    g=Image.new("L",(1,H),0); px=g.load(); st=int(H*frac)
    for y in range(H):
        px[0,y]= 0 if y<st else int(248*(((y-st)/max(1,H-st))**0.75))
    return Image.composite(Image.new("RGB",(W,H),(6,5,7)), base, g.resize((W,H)))

def make(name, bg, hook, band, W=1080, H=1350, anchor=0.28, sf=0.30):
    im = scrim(cover(Image.open(os.path.join(SRC,bg)).convert("RGB"), W, H, anchor), sf)
    d = ImageDraw.Draw(im)
    fh = font(MYEONGJO, int(W*0.098))
    fb = font(BOLD, int(W*0.038))
    lines = hook.split("\n")
    lh = int(W*0.128)
    bh = int(H*0.092)
    block = len(lines)*lh
    y = H - bh - int(H*0.075) - block
    for ln in lines:
        w = d.textlength(ln, font=fh)
        x = (W-w)//2
        d.text((x+2,y+4), ln, font=fh, fill=(0,0,0))
        d.text((x,y), ln, font=fh, fill=BONE)
        y += lh
    d.rectangle([0,H-bh,W,H], fill=BAND)
    bw = d.textlength(band, font=fb)
    d.text(((W-bw)//2, H-bh+(bh-int(W*0.050))//2), band, font=fb, fill=(236,230,222))
    tri = int(W*0.019)
    for cx in (int(W*0.5-bw/2-tri*2.6), int(W*0.5+bw/2+tri*1.3)):
        cy = H-bh//2
        d.polygon([(cx,cy-tri//2),(cx+tri,cy-tri//2),(cx+tri//2,cy+tri)], fill=RED)
    p=os.path.join(OUT,name); im.save(p,"PNG",optimize=True)
    print(name, im.size, os.path.getsize(p)//1024,"KB")

ADS = [
 # ① 질문 + 고유명사 (귀자할매 문법). 브랜드를 몰라도 궁금해진다.
 ("rs01_who_1080x1350.png","teaser-face.webp","얼굴 없는 박수가\n있다는데?","▼ 듣기 싫은 것부터 말합니다 ▼",1080,1350,0.18,0.34),
 ("rs01_who_1080x1920.png","teaser-face.webp","얼굴 없는 박수가\n있다는데?","▼ 듣기 싫은 것부터 말합니다 ▼",1080,1920,0.16,0.30),
 # ② 독자 상황부터. 우리 용어 0.
 ("rs02_norest_1080x1350.png","money.webp","아껴도 돈이\n안 남는 달이 있다","▼ 몇 월인지 적어드립니다 ▼",1080,1350,0.30,0.32),
 ("rs02_norest_1080x1920.png","money.webp","아껴도 돈이\n안 남는 달이 있다","▼ 몇 월인지 적어드립니다 ▼",1080,1920,0.26,0.28),
 # ③ 부정 축. 청월당 6장 중 4장이 이 축.
 ("rs03_harsh_1080x1350.png","close.webp","듣기 좋은 말은\n안 나온다","▼ 새는 달까지 적어둡니다 ▼",1080,1350,0.30,0.32),
 ("rs03_harsh_1080x1920.png","close.webp","듣기 좋은 말은\n안 나온다","▼ 새는 달까지 적어둡니다 ▼",1080,1920,0.26,0.28),
]

if __name__ == "__main__":
    for a in ADS: make(*a)
