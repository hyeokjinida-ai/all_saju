# -*- coding: utf-8 -*-
"""청월당식 단일 이미지 — 캐릭터 컷 + 대사체 훅 + 하단 CTA 띠 (2026-09-07)
그림은 scenes_R 패널 재사용. 신규 생성 0.
"""
import os, random
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAN  = os.path.abspath(os.path.join(ROOT, "..", "design", "toon", "scenes_R", "panels"))
OUT  = os.path.join(ROOT, "소재", "산군", "단일_청월당식")
os.makedirs(OUT, exist_ok=True)

BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
REG  = r"C:\Windows\Fonts\malgun.ttf"
WHITE=(255,255,255); INK=(28,24,24); RED=(198,46,38); BAND=(24,20,20)

def cover(img,W,H,anchor=0.5):
    r=max(W/img.width,H/img.height)
    im=img.resize((int(img.width*r),int(img.height*r)),Image.LANCZOS)
    x=(im.width-W)//2; y=int((im.height-H)*anchor)
    return im.crop((x,y,x+W,y+H))

def outline(d,xy,t,f,fill,ow=6,oc=(255,255,255)):
    x,y=xy
    for dx in range(-ow,ow+1,2):
        for dy in range(-ow,ow+1,2):
            if dx*dx+dy*dy<=ow*ow: d.text((x+dx,y+dy),t,font=f,fill=oc)
    d.text((x,y),t,font=f,fill=fill)

def make(name, panel, hook, band, W=1080, H=1350, anchor=0.35, dark=False):
    im = cover(Image.open(os.path.join(PAN,panel)).convert("RGB"), W, H, anchor)
    d = ImageDraw.Draw(im)
    bh = int(H*0.098)
    d.rectangle([0,H-bh,W,H], fill=BAND)
    fh = ImageFont.truetype(BOLD, int(W*0.088))
    fb = ImageFont.truetype(BOLD, int(W*0.040))
    lines = hook.split("\n")
    lh = int(W*0.115)
    y = int(H*0.055)
    for ln in lines:
        w = d.textlength(ln, font=fh)
        outline(d, ((W-w)//2, y), ln, fh, INK if not dark else WHITE, 7, WHITE if not dark else INK)
        y += lh
    bw = d.textlength(band, font=fb)
    d.text(((W-bw)//2, H-bh+(bh-int(W*0.052))//2), band, font=fb, fill=(238,232,226))
    tri = int(W*0.020)
    for cx in (int(W*0.5-bw/2-tri*2.4), int(W*0.5+bw/2+tri*1.2)):
        cy = H-bh//2
        d.polygon([(cx,cy-tri//2),(cx+tri,cy-tri//2),(cx+tri//2,cy+tri)], fill=RED)
    p=os.path.join(OUT,name); im.save(p,"PNG",optimize=True)
    print(name, im.size, os.path.getsize(p)//1024,"KB")

ADS = [
 ("cw01_leak_1080x1350.png","r06.png","안 좋은 달도\n그냥 말해줌","▼ 듣기 싫은 것부터 나옵니다 ▼",1080,1350,0.30,False),
 ("cw01_leak_1080x1920.png","r06.png","안 좋은 달도\n그냥 말해줌","▼ 듣기 싫은 것부터 나옵니다 ▼",1080,1920,0.30,False),
 ("cw02_norest_1080x1350.png","r02.png","아껴도 왜\n돈이 안 남지?","▼ 새는 달이 따로 있습니다 ▼",1080,1350,0.34,False),
 ("cw02_norest_1080x1920.png","r02.png","아껴도 왜\n돈이 안 남지?","▼ 새는 달이 따로 있습니다 ▼",1080,1920,0.34,False),
 ("cw03_wait_1080x1350.png","r09.png","지금은\n기다리라는데?","▼ 밀어붙일 때가 따로 있습니다 ▼",1080,1350,0.30,False),
 ("cw03_wait_1080x1920.png","r09.png","지금은\n기다리라는데?","▼ 밀어붙일 때가 따로 있습니다 ▼",1080,1920,0.30,False),
]

if __name__ == "__main__":
    for a in ADS: make(*a)
