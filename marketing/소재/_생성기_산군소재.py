# 산군 광고 소재 생성 — 정지컷 + 자막형 (5사 실측 최저비 형식)
# 브라우저 없이 Pillow 로 직접 찍는다. 원본 일러는 public/products/sangun/ 재활용.
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = r"C:\Users\HP\OneDrive\Desktop\all_saju\public\products\sangun"
OUT = r"C:\Users\HP\OneDrive\Desktop\all_saju\marketing\소재\산군"
os.makedirs(OUT, exist_ok=True)

MYEONGJO = r"C:\Windows\Fonts\batang.ttc"   # 바탕 — 산군 세계관(명조)
GOTHIC_B = r"C:\Windows\Fonts\malgunbd.ttf"
GOTHIC   = r"C:\Windows\Fonts\malgun.ttf"

GOLD   = (232, 201, 106)
BONE   = (240, 236, 228)
SOFT   = (198, 190, 176)

def font(path, size, idx=0):
    try:
        return ImageFont.truetype(path, size, index=idx)
    except Exception:
        return ImageFont.truetype(GOTHIC_B, size)

def cover(img, W, H):
    """비율 유지 채우기(center crop)."""
    r = max(W / img.width, H / img.height)
    im = img.resize((max(1, int(img.width * r)), max(1, int(img.height * r))), Image.LANCZOS)
    return im.crop(((im.width - W) // 2, (im.height - H) // 2,
                    (im.width - W) // 2 + W, (im.height - H) // 2 + H))

def scrim(base, top_frac):
    """하단 자막 가독성용 검정 그라디언트. top_frac 부터 아래로 짙어진다."""
    W, H = base.size
    g = Image.new("L", (1, H), 0)
    px = g.load()
    start = int(H * top_frac)
    for y in range(H):
        if y < start:
            px[0, y] = 0
        else:
            t = (y - start) / max(1, H - start)
            px[0, y] = int(252 * (t ** 0.85))
    mask = g.resize((W, H))
    black = Image.new("RGB", (W, H), (6, 5, 8))
    return Image.composite(black, base, mask)

def wrap(draw, text, f, maxw):
    out, line = [], ""
    for ch in text:
        if ch == "\n":
            out.append(line); line = ""; continue
        t = line + ch
        if draw.textlength(t, font=f) > maxw and line:
            out.append(line); line = ch
        else:
            line = t
    if line:
        out.append(line)
    return out

def text_shadow(d, xy, s, f, fill, blur_layer, shadow=(0, 0, 0)):
    x, y = xy
    for dx, dy in ((0, 3), (2, 2), (-2, 2)):
        blur_layer.text((x + dx, y + dy), s, font=f, fill=shadow)
    d.text((x, y), s, font=f, fill=fill)

def make(name, bg_file, hook, sub, W, H, hook_px, sub_px, scrim_from=0.34):
    bg = Image.open(os.path.join(SRC, bg_file)).convert("RGB")
    im = scrim(cover(bg, W, H), scrim_from)

    shadow = Image.new("RGB", (W, H), (0, 0, 0))
    sh_mask = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(sh_mask)
    d = ImageDraw.Draw(im)

    fh = font(MYEONGJO, hook_px)
    fs = font(GOTHIC, sub_px)
    fb = font(GOTHIC_B, int(W * 0.030))

    pad = int(W * 0.085)
    maxw = W - pad * 2

    hl = wrap(d, hook, fh, maxw)
    sl = wrap(d, sub, fs, maxw)

    lh_h = int(hook_px * 1.36)
    lh_s = int(sub_px * 1.62)
    rule_gap = int(H * 0.030)
    brand_gap = int(H * 0.036)

    block = len(hl) * lh_h + rule_gap * 2 + 2 + len(sl) * lh_s + brand_gap + int(W * 0.030)
    y = H - int(H * 0.085) - block

    # 훅 — 그림자 먼저(마스크에), 본문은 바로
    for ln in hl:
        for dx, dy in ((0, 4), (3, 3), (-3, 3)):
            sd.text((pad + dx, y + dy), ln, font=fh, fill=255)
        y += lh_h
    y += rule_gap
    rule_y = y
    y += 2 + rule_gap
    for ln in sl:
        for dx, dy in ((0, 3), (2, 2)):
            sd.text((pad + dx, y + dy), ln, font=fs, fill=200)
        y += lh_s
    y += brand_gap
    brand_y = y

    im = Image.composite(shadow, im, sh_mask.filter(ImageFilter.GaussianBlur(7)))
    d = ImageDraw.Draw(im)

    y = H - int(H * 0.085) - block
    for ln in hl:
        d.text((pad, y), ln, font=fh, fill=BONE)
        y += lh_h
    d.line([(pad, rule_y), (pad + int(maxw * 0.30), rule_y)], fill=GOLD, width=3)
    y = rule_y + 2 + rule_gap
    for ln in sl:
        d.text((pad, y), ln, font=fs, fill=SOFT)
        y += lh_s

    d.text((pad, brand_y), "명운록  ·  박수무당 사주", font=fb, fill=GOLD)

    p = os.path.join(OUT, name)
    im.save(p, "PNG", optimize=True)
    print(f"{name}  {W}x{H}  {os.path.getsize(p)//1024}KB  (훅 {len(hl)}줄)")

ADS = [
    # ① 인생스포 축 — 시장 1위 랭킹 1축. '내가 이미 안다'는 긴장을 우리 매개(장부)로.
    #    배경에 촛불이 많아 스크림을 위에서부터 올린다(첫 줄이 촛불 위에 걸렸다).
    ("sangun_ad01_janbu", "face.webp",
     "네 장부를\n내가 먼저 읽었다",
     "좋은 말만 해주지는 않는다.", 0.24),
    # ② 재물+시기 축 — 목차 4번(돈이 들어오는 달)을 그대로. 특정 연도는 단정하지 않는다.
    #    (개인화 없이 연도를 못박으면 소재가 거짓이 된다 — 그건 티저 안에서만 한다)
    ("sangun_ad02_money", "money.webp",
     "돈이 들어오는 달이\n네 장부에 적혀 있다",
     "몇 월인지, 어디로 새는지까지.", 0.36),
]

for slug, bgf, hook, sub, sc in ADS:
    make(f"{slug}_1080x1350.png", bgf, hook, sub, 1080, 1350, 96, 44, sc)
    make(f"{slug}_1080x1920.png", bgf, hook, sub, 1080, 1920, 96, 46, min(0.92, sc + 0.06))
