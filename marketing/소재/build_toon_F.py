# -*- coding: utf-8 -*-
"""산군 「장부」 이미지툰 10컷 조판 — 캐릭터 F (2026-09-06)
그림 = design/toon/scenes_F/panels/*.png (ChatGPT 웹 생성, 글자 없음)
글자 = 여기서 얹는다. 손글씨 폰트가 없어 글자마다 미세 지터를 준다.
"""
import os, random
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAN  = os.path.join(ROOT, "..", "design", "toon", "scenes_F", "panels")
PAN  = os.path.abspath(PAN)
OUT  = os.path.join(ROOT, "소재", "산군", "이미지툰_F")
os.makedirs(OUT, exist_ok=True)

BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
REG  = r"C:\Windows\Fonts\malgun.ttf"
INK  = (26, 24, 24)
GREY = (105, 100, 98)
RED  = (214, 62, 48)
HL   = (250, 206, 200)

W = H = 1080

def jitter_text(d, xy, text, font, fill, seed, amp=2.0, rot=0):
    """글자마다 살짝 흔들어 손으로 쓴 느낌."""
    rnd = random.Random(seed)
    x, y = xy
    for ch in text:
        dy = rnd.uniform(-amp, amp)
        dx = rnd.uniform(-amp*0.35, amp*0.35)
        d.text((x+dx, y+dy), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + rnd.uniform(-0.6, 0.9)
    return x

def measure(d, text, font):
    return sum(d.textlength(c, font=font) for c in text) + len(text)*0.15

def rough_box(d, box, seed, fill):
    """손으로 칠한 것 같은 삐뚤한 하이라이트 사각형."""
    rnd = random.Random(seed)
    x0,y0,x1,y1 = box
    pts = [(x0+rnd.uniform(-3,3), y0+rnd.uniform(-3,3)),
           (x1+rnd.uniform(-3,3), y0+rnd.uniform(-4,2)),
           (x1+rnd.uniform(-3,3), y1+rnd.uniform(-3,3)),
           (x0+rnd.uniform(-3,3), y1+rnd.uniform(-2,4))]
    d.polygon(pts, fill=fill)

def draw_line_with_hl(im, d, text, font, cy, fill, seed):
    """{키워드} 부분만 붉은 박스로 칠하고 한 줄을 가운데 정렬로 그린다."""
    parts, buf, hl = [], "", False
    for ch in text:
        if ch == "{":
            if buf: parts.append((buf, False)); buf=""
            hl=True
        elif ch == "}":
            if buf: parts.append((buf, True)); buf=""
            hl=False
        else:
            buf += ch
    if buf: parts.append((buf, hl))
    total = sum(measure(d, t, font) for t,_ in parts)
    x = (W - total)/2
    asc = font.getbbox("가")[3]
    for i,(t,is_hl) in enumerate(parts):
        w = measure(d, t, font)
        if is_hl:
            rough_box(d, (x-9, cy-6, x+w+9, cy+asc+8), seed+i, HL)
        x = jitter_text(d, (x, cy), t, font, fill, seed*7+i)
    return

def make(idx, panel, top, bottom, cover=False, brand=False):
    im = Image.new("RGB", (W,H), (255,255,255))
    d = ImageDraw.Draw(im)
    p = Image.open(os.path.join(PAN, panel)).convert("RGB")
    if cover:
        f1 = ImageFont.truetype(BOLD, 62); f2 = ImageFont.truetype(REG, 34)
        ph = 716
        pic = p.resize((ph,ph), Image.LANCZOS)
        im.paste(pic, ((W-ph)//2, 296))
        draw_line_with_hl(im, d, top.split("\n")[0], f1, 86, INK, 11)
        draw_line_with_hl(im, d, top.split("\n")[1], f1, 168, INK, 23)
        draw_line_with_hl(im, d, bottom, f2, 252, GREY, 31)
    else:
        f1 = ImageFont.truetype(BOLD, 50); f2 = ImageFont.truetype(REG, 40)
        ph = 780
        pic = p.resize((ph,ph), Image.LANCZOS)
        im.paste(pic, ((W-ph)//2, 168))
        draw_line_with_hl(im, d, top, f1, 68, INK, idx*13+1)
        draw_line_with_hl(im, d, bottom, f2, 972, GREY, idx*29+5)
    if brand:
        fb = ImageFont.truetype(BOLD, 31)
        t = "명운록 · 박수무당 사주"
        jitter_text(d, (W - measure(d,t,fb) - 46, H-58), t, fb, RED, 77, amp=1.2)
    path = os.path.join(OUT, "toonF_%02d.png" % idx)
    im.save(path, "PNG", optimize=True)
    print("%02d %s  %dKB" % (idx, panel, os.path.getsize(path)//1024))

CUTS = [
 (1,  "p01.png", "돈 모으는 걸 포기했던 내가\n{서른일곱}에 숨통 트인 썰", "(사주 딱 한 번 본 게 다임)", True,  False),
 (2,  "p02.png", "월급은 {들어오는데} 통장은 늘 그대로임", "아껴도 남는 게 없더라",       False, False),
 (3,  "p03.png", "이번 달도 {카드값} 막고 끝남 ㅋㅋ",     "이러다 평생 이러는 거 아냐?", False, False),
 (4,  "p04.png", "그러다 언니가 {사주} 얘길 꺼냄",         "돈 새는 달이 따로 있대",       False, False),
 (5,  "p05.png", "속는 셈 치고 {생년월일}만 넣어봤음",     "어차피 안 맞겠지 하고",       False, False),
 (6,  "p06.png", "근데 {돈 새는 달}이 딱 나옴",           "소름 돋아서 한참 봤음",       False, False),
 (7,  "p07.png", "봐주는 게 갓 쓴 {박수무당}인데",         "얼굴이 없음;;",               False, False),
 (8,  "p08.png", "그 달에 진짜 {목돈}이 나갔음",           "미리 안 게 어디야",           False, False),
 (9,  "p09.png", "이제 {그 달}은 아예 비워둠",             "덜 흔들림",                   False, False),
 (10, "p11.png", "너네도 해보라고 {링크} 가져왔음",         "아래에서 볼 수 있음",         False, True),
]

if __name__ == "__main__":
    for c in CUTS:
        make(*c)
