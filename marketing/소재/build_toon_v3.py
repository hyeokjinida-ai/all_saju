# -*- coding: utf-8 -*-
"""인스타툰 v3 — 말풍선판 (2026-09-07)
바뀐 것 2개
 1) 글자를 **그림 밖(상단 띠·하단 띠)에 안 쓴다.** 전부 그림 안 말풍선으로 옮겼다.
 2) 화법을 **후일담 「~했음」에서 그 순간의 혼잣말**로 바꿨다. 물음표·말줄임표를 쓴다.
"""
import os, random, math
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP  = os.path.join(ROOT, "소재", "산군", "재료", "캡처", "seo")
OUTROOT = os.path.join(ROOT, "소재", "산군")
BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
REG  = r"C:\Windows\Fonts\malgun.ttf"
INK=(24,22,22); RED=(206,52,42)
W = H = 1080

def jitter(d, xy, text, font, fill, seed, amp=1.6):
    rnd=random.Random(seed); x,y=xy
    for ch in text:
        d.text((x+rnd.uniform(-amp*0.3,amp*0.3), y+rnd.uniform(-amp,amp)), ch, font=font, fill=fill)
        x += d.textlength(ch,font=font)+rnd.uniform(-0.5,0.8)
    return x

def tw(d,t,f): return sum(d.textlength(c,font=f) for c in t)+len(t)*0.15

def bubble(im, d, lines, cx, cy, font, seed, tail=None, think=False, fill=(255,255,255)):
    """손으로 그린 듯 삐뚤한 말풍선. lines=리스트. cx,cy=풍선 중심. tail=(tx,ty) 꼬리 끝점."""
    lw = max(tw(d,t,font) for t in lines)
    lh = int(font.size*1.42)
    padx, pady = int(font.size*0.85), int(font.size*0.62)
    bw, bh = lw+padx*2, lh*len(lines)+pady*2
    x0,y0 = cx-bw/2, cy-bh/2
    rnd=random.Random(seed)
    # 삐뚤한 둥근 사각형 — 여러 겹 그려 손맛
    for k in range(2):
        o = 0 if k==0 else rnd.uniform(-2.5,2.5)
        box=[x0+o,y0+o,x0+bw+o,y0+bh+o]
        d.rounded_rectangle(box, radius=int(font.size*0.85), fill=fill if k==0 else None,
                            outline=INK, width=4 if k==0 else 2)
    if tail:
        tx,ty = tail
        if think:
            for i,(r,f2) in enumerate(((int(font.size*0.30),0.34),(int(font.size*0.20),0.62),(int(font.size*0.12),0.86))):
                px = x0+bw/2 + (tx-(x0+bw/2))*f2
                py = y0+bh/2 + (ty-(y0+bh/2))*f2
                d.ellipse([px-r,py-r,px+r,py+r], fill=fill, outline=INK, width=3)
        else:
            ax, ay = x0+bw/2, y0+bh/2
            vx, vy = tx-ax, ty-ay
            n = math.hypot(vx,vy) or 1
            px, py = -vy/n, vx/n
            base = font.size*0.42
            sx, sy = ax+vx*0.30, ay+vy*0.30
            mx,my = ax+vx*0.86, ay+vy*0.86
            d.polygon([(sx+px*base, sy+py*base),(sx-px*base, sy-py*base),(mx,my)], fill=fill, outline=INK)
            d.polygon([(sx+px*(base-4), sy+py*(base-4)),(sx-px*(base-4), sy-py*(base-4)),(mx,my)], fill=fill)
    y = y0+pady
    for t in lines:
        jitter(d,(x0+bw/2-tw(d,t,font)/2, y), t, font, INK, seed*7+len(t))
        y += lh
    return (x0,y0,x0+bw,y0+bh)

CAPS = {"leak":("seo_money_calendar.png",(30,500,1140,880)),
        "full":("seo_money_calendar.png",(30,20,1140,1130))}
def cap_panel(kind):
    fn,box = CAPS[kind]
    src = Image.open(os.path.join(CAP,fn)).convert("RGB").crop(box)
    p = Image.new("RGB",(1080,1080),(11,10,12))
    r = min(1000/src.width, 1000/src.height)
    s = src.resize((int(src.width*r),int(src.height*r)), Image.LANCZOS)
    p.paste(s, ((1080-s.width)//2,(1080-s.height)//2))
    return p

def make(outdir, idx, pdir, panel, bubbles, title=None, brand=False, prefix="v3"):
    im = cap_panel(panel[1:]) if panel.startswith("@") else \
         Image.open(os.path.join(pdir,panel)).convert("RGB").resize((W,H), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    if title:
        f2=ImageFont.truetype(BOLD,34)
        t1,t2 = title
        x=(W-tw(d,t2,f2))/2; yy=H-96
        d.rounded_rectangle([x-26,yy-14,x+tw(d,t2,f2)+26,yy+52], radius=14, fill=(255,255,255), outline=INK, width=3)
        jitter(d,(x,yy),t2,f2,(60,56,54),idx*31+3,amp=1.0)
    for b in bubbles:
        lines, cx, cy, tail, think, size = b
        f=ImageFont.truetype(BOLD,size)
        bubble(im, d, lines, cx*W, cy*H, f, idx*17+int(cx*100),
               tail=(tail[0]*W, tail[1]*H) if tail else None, think=think)
    if brand:
        fb=ImageFont.truetype(BOLD,30); t="명운록 · 박수무당 사주"
        d.rectangle([W-tw(d,t,fb)-58, H-70, W-14, H-20], fill=(16,14,14))
        jitter(d,(W-tw(d,t,fb)-46,H-60),t,fb,(232,196,120),77,amp=1.0)
    os.makedirs(outdir,exist_ok=True)
    p=os.path.join(outdir,"%s_%02d.png"%(prefix,idx)); im.save(p,"PNG",optimize=True)
    print(prefix,idx,panel)

PF = os.path.abspath(os.path.join(ROOT,"..","design","toon","scenes_F","panels"))
PR = os.path.abspath(os.path.join(ROOT,"..","design","toon","scenes_R","panels"))

# (컷, 패널, [말풍선(lines, cx, cy, tail, think, size)], 표지제목, 브랜드)
WEALTH = [
 (1,"P15", [(["돈이 왜","안 남지?"], 0.50,0.13,(0.50,0.34),True,60)], (None,"석 달치 카드값 뒤져본 썰"), False),
 (2,"P02", [(["이걸 다","어디에 썼지"], 0.74,0.17,(0.56,0.30),True,44)], None, False),
 (3,"P03", [(["금액보다","나가는 달이","정해져 있네?"], 0.73,0.19,(0.58,0.33),True,42)], None, False),
 (4,"P05", [(["사주에도","돈 나가는 달이","있다고?"], 0.29,0.18,(0.44,0.36),False,42)], None, False),
 (5,"@leak",[(["어? 두 달은","진짜 겹치는데"], 0.28,0.14,None,False,44)], None, False),
 (6,"P07", [(["…얼굴이","없으신데요"], 0.25,0.17,(0.34,0.44),False,44)], None, False),
 (7,"P09", [(["이 달은","그냥 비워두자"], 0.28,0.16,(0.40,0.34),True,44)], None, False),
 (8,"P08", [(["하필 이 달에"], 0.29,0.14,(0.40,0.32),False,46),
            (["그래도 준비는","해뒀지"], 0.70,0.80,None,True,36)], None, False),
 (9,"@full",[(["기본은 무료로","나온대"], 0.30,0.13,None,False,46)], None, True),
]
MAP_F={"P15":"p15.png","P02":"p02.png","P03":"p03.png","P05":"p05.png","P07":"p07.png","P09":"p09.png","P08":"p08.png"}
MAP_R={"P15":"r01.png","P02":"r02.png","P03":"r03.png","P05":"r05.png","P07":"r07.png","P09":"r09.png","P08":"r08.png"}


PJ = os.path.abspath(os.path.join(ROOT,"..","design","toon","scenes_J","panels"))
CAPS["daeun"]=("seo_daeun_table.png",None)
CAPS["jikeon"]=("seo_line_jikeon.png",None)
CAPS["partner"]=("seo_partner_card_blur.png",None)

PAST = [
 (1,"p15.png",[(["몇 년 전 그 일,","맞힐 수 있나?"],0.50,0.13,(0.50,0.34),True,54)],(None,"사주 안 믿다가 기록부터 맞춰본 썰"),False),
 (2,"p03.png",[(["그 얘긴","아무한테도","안 했는데"],0.73,0.19,(0.58,0.33),True,42)],None,False),
 (3,"p05.png",[(["생년월일만","넣으면 된다고?"],0.29,0.17,(0.44,0.35),False,44)],None,False),
 (4,"p13.png",[(["어? 그 해가","그대로 있는데"],0.72,0.16,(0.56,0.32),False,46)],None,False),
 (5,"p14.png",[(["짐 싸서","나오던 그때"],0.28,0.16,(0.42,0.34),True,44)],None,False),
 (6,"p07.png",[(["…얼굴이","없으신데요"],0.25,0.17,(0.34,0.44),False,44)],None,False),
 (7,"p06.png",[(["남은 장도","봐야겠는데"],0.72,0.16,(0.57,0.32),True,44)],None,False),
 (8,"@jikeon",[(["기본은 무료로","나온대"],0.30,0.13,None,False,46)],None,True),
]
FACE = [
 (1,"p03.png",[(["만날 사람","얼굴도 나와?"],0.50,0.13,(0.50,0.33),True,54)],(None,"연애 접고 살다가 짝 카드를 본 썰"),False),
 (2,"p12.png",[(["소개팅은","나갈수록 지쳐"],0.28,0.16,(0.42,0.34),True,44)],None,False),
 (3,"p05.png",[(["사람 항목이","따로 있네?"],0.29,0.17,(0.44,0.35),False,44)],None,False),
 (4,"p17.png",[(["첫인상이랑","나이대까지…"],0.72,0.16,(0.56,0.32),False,46)],None,False),
 (5,"p07.png",[(["…얼굴이","없으신데요"],0.25,0.17,(0.34,0.44),False,44)],None,False),
 (6,"p18.png",[(["앉자마자","그 카드 생각남"],0.30,0.14,(0.40,0.32),True,42)],None,False),
 (7,"p09.png",[(["시기까지","겹쳤는데"],0.28,0.16,(0.40,0.34),True,44)],None,False),
 (8,"@partner",[(["기본은 무료로","나온대"],0.30,0.13,None,False,46)],None,True),
]
HARSH = [
 (1,"p16.png",[(["뭐야 이거,","왜 이렇게 말해"],0.50,0.13,(0.50,0.33),False,52)],(None,"듣기 싫어서 껐다가 다시 켠 썰"),False),
 (2,"p05.png",[(["가볍게","한번 넣어볼까"],0.29,0.17,(0.44,0.35),True,44)],None,False),
 (3,"p20.png",[(["안 좋은 것부터","나오는데?"],0.72,0.16,(0.57,0.33),False,44)],None,False),
 (4,"p19.png",[(["기분 나빠서","꺼버림"],0.28,0.15,(0.40,0.33),True,46)],None,False),
 (5,"p07.png",[(["말을 안 고르시네"],0.25,0.17,(0.34,0.44),False,44)],None,False),
 (6,"p08.png",[(["…그 달에","진짜 그렇게 됐네"],0.29,0.14,(0.40,0.32),False,42)],None,False),
 (7,"p09.png",[(["듣기 싫은 말이","맞더라"],0.28,0.16,(0.40,0.34),True,44)],None,False),
 (8,"@jikeon",[(["기본은 무료로","나온대"],0.30,0.13,None,False,46)],None,True),
]
JOB = [
 (1,"j01.png",[(["또 떨어졌겠지"],0.50,0.13,(0.50,0.33),True,54)],(None,"스무 번 미끄러지고 시기부터 본 썰"),False),
 (2,"j02.png",[(["메일 열기가","무섭다"],0.28,0.16,(0.42,0.34),True,44)],None,False),
 (3,"j03.png",[(["나 붙었어!"],0.30,0.15,(0.40,0.34),False,44),(["…축하해"],0.74,0.78,None,True,34)],None,False),
 (4,"j04.png",[(["지금은","기다리라고?"],0.72,0.16,(0.57,0.33),False,46)],None,False),
 (5,"j05.png",[(["…얼굴이","없으신데요"],0.25,0.16,(0.34,0.42),False,44)],None,False),
 (6,"j06.png",[(["이 달에 다시","넣어보래"],0.28,0.15,(0.40,0.33),True,44)],None,False),
 (7,"j07.png",[(["접어뒀던","데서 연락이?"],0.72,0.16,(0.57,0.33),False,44)],None,False),
 (8,"@daeun",[(["기본은 무료로","나온대"],0.30,0.13,None,False,46)],None,True),
]

if __name__ == "__main__":
    for m,pd,out,pre in ((MAP_F,PF,"이미지툰_v3_A_재물_손그림","v3A"),(MAP_R,PR,"이미지툰_v3_B_재물_컬러","v3B")):
        for (i,p,bs,ti,br) in WEALTH:
            make(os.path.join(OUTROOT,out), i, pd, m.get(p,p), bs, ti, br, pre)
    for cuts,out,pre,pd in ((PAST,"이미지툰_v3_C_과거","v3C",PF),(FACE,"이미지툰_v3_D_얼굴","v3D",PF),
                            (HARSH,"이미지툰_v3_E_직언","v3E",PF),(JOB,"이미지툰_v3_F_취준생","v3F",PJ)):
        for (i,p,bs,ti,br) in cuts:
            make(os.path.join(OUTROOT,out), i, pd, p, bs, ti, br, pre)
