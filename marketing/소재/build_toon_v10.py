# -*- coding: utf-8 -*-
"""산군 이미지·이미지툰 소재 v10 (2026-09-06)
세트 A 장부 툰 8장(1:1) / 세트 B 단일 2종(4:5·9:16) / 세트 C 재물 대조 캐러셀 4장(1:1)
기존 컷·결과지 캡처만 쓴다. 조판은 _생성기_산군소재.py 의 색·폰트 체계를 따른다.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "..", "public", "products", "sangun")
SRC  = os.path.abspath(SRC)
CAP  = os.path.join(ROOT, "소재", "산군", "재료", "캡처", "seo")
OUT  = os.path.join(ROOT, "소재", "산군", "이미지툰_v10")
os.makedirs(OUT, exist_ok=True)

MYEONGJO = r"C:\Windows\Fonts\batang.ttc"
GOTHIC_B = r"C:\Windows\Fonts\malgunbd.ttf"
GOTHIC   = r"C:\Windows\Fonts\malgun.ttf"

GOLD = (232, 201, 106); BONE = (240, 236, 228); SOFT = (198, 190, 176)
INK  = (11, 10, 12);    RED  = (214, 88, 74)

def font(p, s, idx=0):
    try: return ImageFont.truetype(p, s, index=idx)
    except Exception: return ImageFont.truetype(GOTHIC_B, s)

def cover(img, W, H):
    r = max(W/img.width, H/img.height)
    im = img.resize((max(1,int(img.width*r)), max(1,int(img.height*r))), Image.LANCZOS)
    x = (im.width-W)//2; y = 0 if im.height <= H else int((im.height-H)*0.30)
    return im.crop((x, y, x+W, y+H))

def wrap(d, text, f, maxw):
    out, line = [], ""
    for ch in text:
        if ch == "\n": out.append(line); line = ""; continue
        t = line + ch
        if d.textlength(t, font=f) > maxw and line: out.append(line); line = ch
        else: line = t
    if line: out.append(line)
    return out

def openimg(name):
    return Image.open(os.path.join(SRC, name)).convert("RGB")

# ---------- 세트 A · 장부 툰 ----------
TOON = [
    ("t1-open.webp",  "서른일곱에 장사 시작했는데",      "이상하게 돈이 안 남더라"),
    ("gate.webp",     "친구가 사주 하나 보라고",          "링크를 던져줌"),
    ("money.webp",    "생년월일만 넣었는데",              "돈 드는 달이 딱 나옴"),
    ("@leak",         "어느 달에 새는지까지",             "같이 적혀 있음"),
    ("t6-mark.webp",  "좋은 얘기만 있는 건",              "아니었음"),
    ("t5-thread.webp","이런 데까지",                      "보는 거였어?"),
    ("t2-read.webp",  "생각보다 훨씬 자세해서",           "좀 놀람"),
    ("cover.webp",    "궁금하면",                         "너도 한번 봐봐"),
]

def toon(W=1080):
    H = W; band = int(H*0.235); imgh = H-band
    fh = font(GOTHIC_B, int(W*0.052)); fs = font(GOTHIC, int(W*0.046))
    fb = font(GOTHIC_B, int(W*0.026))
    for i,(src, l1, l2) in enumerate(TOON, 1):
        im = Image.new("RGB", (W, H), INK)
        if src == "@leak":
            rows = Image.open(os.path.join(CAP, "seo_money_calendar.png")).convert("RGB").crop((30, 500, 1140, 880))
            rw = int(W*0.95); rh = int(rows.height*(rw/rows.width))
            im.paste(rows.resize((rw, rh), Image.LANCZOS), ((W-rw)//2, (imgh-rh)//2))
        else:
            pic = cover(openimg(src), W, imgh)
            im.paste(pic, (0,0))
        d = ImageDraw.Draw(im)
        # 사진 아래끝 살짝 어둡게 이어붙이기
        d.rectangle([0, imgh, W, H], fill=INK)
        d.line([(0, imgh), (W, imgh)], fill=(46,42,40), width=2)
        pad = int(W*0.072); y = imgh + int(band*0.24)
        d.text((pad, y), l1, font=fh, fill=BONE); y += int(W*0.075)
        d.text((pad, y), l2, font=fs, fill=SOFT)
        if i == 1:
            d.rectangle([pad, int(H*0.055), pad+int(W*0.026), int(H*0.055)+int(W*0.026)], fill=GOLD)
        if i == len(TOON):
            d.text((W-pad-d.textlength("명운록 · 박수무당 사주", font=fb), H-int(band*0.22)),
                   "명운록 · 박수무당 사주", font=fb, fill=GOLD)
        p = os.path.join(OUT, f"toon_janbu_{i:02d}.png")
        im.save(p, "PNG", optimize=True)
        print("A", os.path.basename(p), im.size, os.path.getsize(p)//1024, "KB")

# ---------- 세트 B · 단일 이미지 ----------
def single(W, H, tag):
    im = cover(openimg("money.webp"), W, H)
    # 하단 스크림
    g = Image.new("L", (1, H), 0); px = g.load(); start = int(H*0.30)
    for y in range(H):
        px[0,y] = 0 if y < start else int(250*(((y-start)/max(1,H-start))**0.8))
    im = Image.composite(Image.new("RGB",(W,H),(6,5,8)), im, g.resize((W,H)))
    d = ImageDraw.Draw(im)
    fh = font(MYEONGJO, int(W*0.098)); fs = font(GOTHIC, int(W*0.040)); fb = font(GOTHIC_B, int(W*0.030))
    pad = int(W*0.085)
    hook = ["장사는 되는데", "이상하게 돈은", "안 남는다"]
    lh = int(W*0.125)
    block = len(hook)*lh + int(H*0.030)*2 + int(W*0.062) + int(H*0.036) + int(W*0.030)
    y = H - int(H*0.085) - block
    for ln in hook:
        d.text((pad+2, y+3), ln, font=fh, fill=(0,0,0)); d.text((pad, y), ln, font=fh, fill=BONE); y += lh
    y += int(H*0.030); d.line([(pad,y),(pad+int((W-pad*2)*0.30), y)], fill=GOLD, width=3); y += 2+int(H*0.030)
    d.text((pad, y), "내 재물운까지 싹 다 봐줌..", font=fs, fill=SOFT); y += int(W*0.062)+int(H*0.036)
    d.text((pad, y), "명운록  ·  박수무당 사주", font=fb, fill=GOLD)
    p = os.path.join(OUT, f"single_norest_{tag}.png")
    im.save(p, "PNG", optimize=True)
    print("B", os.path.basename(p), im.size, os.path.getsize(p)//1024, "KB")

# ---------- 세트 C · 재물 대조 캐러셀 ----------
def crop_rows(path, y0, y1):
    im = Image.open(path).convert("RGB")
    return im.crop((30, y0, im.width-30, y1))

def compare(W=1080):
    H = W; pad = int(W*0.085)
    fbig = font(GOTHIC_B, int(W*0.062)); fvs = font(MYEONGJO, int(W*0.085))
    fmid = font(GOTHIC_B, int(W*0.058)); fsm = font(GOTHIC, int(W*0.036))
    fb = font(GOTHIC_B, int(W*0.026))

    # 1) 대조표 — 캐릭터 없음
    im = Image.new("RGB", (W,H), INK); d = ImageDraw.Draw(im)
    d.text((pad, int(H*0.155)), "내가 생각하는", font=fbig, fill=SOFT)
    d.text((pad, int(H*0.155)+int(W*0.082)), "내 재물", font=fbig, fill=BONE)
    vy = int(H*0.445)
    d.line([(pad, vy-int(W*0.035)), (W-pad, vy-int(W*0.035))], fill=(52,47,44), width=3)
    vsw = d.textlength("VS", font=fvs)
    d.text(((W-vsw)//2, vy), "VS", font=fvs, fill=GOLD)
    d.line([(pad, vy+int(W*0.125)), (W-pad, vy+int(W*0.125))], fill=(52,47,44), width=3)
    d.text((pad, int(H*0.655)), "장부에 나온", font=fbig, fill=SOFT)
    d.text((pad, int(H*0.655)+int(W*0.082)), "내 재물", font=fbig, fill=RED)
    im.save(os.path.join(OUT,"cmp_money_01.png"), "PNG", optimize=True)

    # 2) 왼쪽 칸
    im = Image.new("RGB", (W,H), INK); d = ImageDraw.Draw(im)
    d.rectangle([pad-int(W*0.03), int(H*0.30), W-pad+int(W*0.03), int(H*0.66)], outline=(60,55,52), width=3)
    d.text((pad, int(H*0.365)), "장사는 되는데", font=fmid, fill=BONE)
    d.text((pad, int(H*0.365)+int(W*0.078)), "이상하게 돈은", font=fmid, fill=BONE)
    d.text((pad, int(H*0.365)+int(W*0.156)), "안 남는다", font=fmid, fill=BONE)
    d.text((pad, int(H*0.735)), "내가 아는 건 여기까지였음", font=fsm, fill=SOFT)
    im.save(os.path.join(OUT,"cmp_money_02.png"), "PNG", optimize=True)

    # 3) 오른쪽 칸 — 「크게 벌리는 해」 행만
    im = Image.new("RGB", (W,H), INK); d = ImageDraw.Draw(im)
    rows = crop_rows(os.path.join(CAP,"seo_money_calendar.png"), 860, 1120)
    rw = int(W*0.95); rh = int(rows.height*(rw/rows.width))
    im.paste(rows.resize((rw, rh), Image.LANCZOS), ((W-rw)//2, int(H*0.47)))
    d.text((pad, int(H*0.215)), "장부엔 이렇게", font=fmid, fill=BONE)
    d.text((pad, int(H*0.215)+int(W*0.078)), "적혀 있었음", font=fmid, fill=BONE)
    im.save(os.path.join(OUT,"cmp_money_03.png"), "PNG", optimize=True)

    # 4) 산군 + 훅
    im = cover(openimg("cover.webp"), W, H)
    g = Image.new("L",(1,H),0); px=g.load(); st=int(H*0.34)
    for y in range(H): px[0,y] = 0 if y<st else int(250*(((y-st)/max(1,H-st))**0.8))
    im = Image.composite(Image.new("RGB",(W,H),(6,5,8)), im, g.resize((W,H)))
    d = ImageDraw.Draw(im)
    d.text((pad, int(H*0.63)), "사주에서 이런 거까지", font=fmid, fill=BONE)
    d.text((pad, int(H*0.63)+int(W*0.078)), "나온다고?!", font=fmid, fill=BONE)
    d.text((pad, int(H*0.855)), "명운록  ·  박수무당 사주", font=fb, fill=GOLD)
    im.save(os.path.join(OUT,"cmp_money_04.png"), "PNG", optimize=True)
    for i in range(1,5):
        p=os.path.join(OUT,f"cmp_money_{i:02d}.png"); print("C", os.path.basename(p), os.path.getsize(p)//1024,"KB")

if __name__ == "__main__":
    toon(); single(1080,1350,"1080x1350"); single(1080,1920,"1080x1920"); compare()
