# -*- coding: utf-8 -*-
"""인스타툰 전편 재작성 v2 (2026-09-07) — 레퍼런스와 거리를 벌린 판
버린 것: 「속는 셈 치고」 · 「너네도 해보라고 링크 가져왔음」 · 「그러다 ~ 얘길 꺼냄」 ·
        「이러다 ~ 아냐?」 · 「포기했던 내가 [나이]에 ~한 썰」 · 카페에서 사주 꺼내는 컷 · 쿠폰 들고 가리키는 CTA 컷
바꾼 것: 서사 골격을 「남이 추천 → 반신반의 → 소름 → 예언 적중」에서
        **「내가 먼저 이상함을 느낌 → 내 기록과 대조 → 표시해 둠 → 실제로 겪음」**으로 꺾었다.
        CTA 컷은 캐릭터가 아니라 **결과지 실물 캡처**로 바꿨다(위닝 14개 중 12개가 결과 화면을 띄운다).
"""
import os, random
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP  = os.path.join(ROOT, "소재", "산군", "재료", "캡처", "seo")
OUTROOT = os.path.join(ROOT, "소재", "산군")

BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
REG  = r"C:\Windows\Fonts\malgun.ttf"
INK=(26,24,24); GREY=(105,100,98); RED=(214,62,48); HL=(250,206,200)
W = H = 1080

def jitter_text(d, xy, text, font, fill, seed, amp=2.0):
    rnd = random.Random(seed); x,y = xy
    for ch in text:
        d.text((x+rnd.uniform(-amp*0.35,amp*0.35), y+rnd.uniform(-amp,amp)), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + rnd.uniform(-0.6,0.9)
    return x

def measure(d,t,f): return sum(d.textlength(c,font=f) for c in t)+len(t)*0.15

def rough_box(d, box, seed, fill):
    rnd=random.Random(seed); x0,y0,x1,y1=box
    d.polygon([(x0+rnd.uniform(-3,3),y0+rnd.uniform(-3,3)),(x1+rnd.uniform(-3,3),y0+rnd.uniform(-4,2)),
               (x1+rnd.uniform(-3,3),y1+rnd.uniform(-3,3)),(x0+rnd.uniform(-3,3),y1+rnd.uniform(-2,4))], fill=fill)

def line_hl(d, text, font, cy, fill, seed):
    parts,buf,hl=[],"",False
    for ch in text:
        if ch=="{":
            if buf: parts.append((buf,False)); buf=""
            hl=True
        elif ch=="}":
            if buf: parts.append((buf,True)); buf=""
            hl=False
        else: buf+=ch
    if buf: parts.append((buf,hl))
    total=sum(measure(d,t,font) for t,_ in parts); x=(W-total)/2
    asc=font.getbbox("가")[3]
    for i,(t,is_hl) in enumerate(parts):
        w=measure(d,t,font)
        if is_hl: rough_box(d,(x-9,cy-6,x+w+9,cy+asc+8),seed+i,HL)
        x=jitter_text(d,(x,cy),t,font,fill,seed*7+i)

CAPS = {
 "leak": ("seo_money_calendar.png",(30,500,1140,880)),
 "full": ("seo_money_calendar.png",(30,20,1140,1130)),
 "daeun":("seo_daeun_table.png",None),
 "inyeon":("seo_inyeon_calendar.png",None),
 "jikeon":("seo_line_jikeon.png",None),
 "partner":("seo_partner_card_blur.png",None),
}
def cap_card(kind):
    fn,box = CAPS[kind]
    src = Image.open(os.path.join(CAP,fn)).convert("RGB")
    return src.crop(box) if box else src

def make(outdir, idx, panel_dir, panel, top, bottom, cover=False, brand=False, prefix="t"):
    im=Image.new("RGB",(W,H),(255,255,255)); d=ImageDraw.Draw(im)
    if panel.startswith("@"):
        rows=cap_card(panel[1:])
        rw=int(W*0.95); rh=int(rows.height*(rw/rows.width))
        ph=780; box=Image.new("RGB",(ph,ph),(11,10,12))
        r2=min((ph-24)/rows.width,(ph-24)/rows.height)
        rr=rows.resize((int(rows.width*r2),int(rows.height*r2)),Image.LANCZOS)
        box.paste(rr,((ph-rr.width)//2,(ph-rr.height)//2))
        im.paste(box,((W-ph)//2,168))
    else:
        p=Image.open(os.path.join(panel_dir,panel)).convert("RGB")
        if cover:
            ph=716; im.paste(p.resize((ph,ph),Image.LANCZOS),((W-ph)//2,296))
        else:
            ph=780; im.paste(p.resize((ph,ph),Image.LANCZOS),((W-ph)//2,168))
    if cover:
        f1=ImageFont.truetype(BOLD,62); f2=ImageFont.truetype(REG,34)
        ls=top.split(chr(10))
        line_hl(d,ls[0],f1,86,INK,11); line_hl(d,ls[1],f1,168,INK,23)
        line_hl(d,bottom,f2,252,GREY,31)
    else:
        f1=ImageFont.truetype(BOLD,50); f2=ImageFont.truetype(REG,40)
        line_hl(d,top,f1,68,INK,idx*13+1); line_hl(d,bottom,f2,972,GREY,idx*29+5)
    if brand:
        fb=ImageFont.truetype(BOLD,31); t="명운록 · 박수무당 사주"
        jitter_text(d,(W-measure(d,t,fb)-46,H-58),t,fb,RED,77,amp=1.2)
    os.makedirs(outdir,exist_ok=True)
    path=os.path.join(outdir,"%s_%02d.png"%(prefix,idx)); im.save(path,"PNG",optimize=True)
    print(prefix,idx,panel)

PF = os.path.abspath(os.path.join(ROOT,"..","design","toon","scenes_F","panels"))
PR = os.path.abspath(os.path.join(ROOT,"..","design","toon","scenes_R","panels"))
PJ = os.path.abspath(os.path.join(ROOT,"..","design","toon","scenes_J","panels"))

# ── 재물 9컷 (F·R 공통 대본) ───────────────────────────────
WEALTH = [
 (1,"{P15}","돈이 안 남아서"+chr(10)+"석 달치 {카드값}을 뒤져본 썰","(사주는 그다음에 봤음)",True,False),
 (2,"{P02}","{영수증}부터 쭉 깔아봤음","어디서 새는지 알고 싶었음",False,False),
 (3,"{P03}","근데 금액보다 {시기}가 이상함","나가는 달이 정해져 있었음",False,False),
 (4,"{P05}","사주에도 {돈 나가는 달}이 있다길래","내 기록이랑 맞춰봤음",False,False),
 (5,"@leak","붉은 글씨로 {세 달}이 적혀 있었음","그중 두 달이 겹쳤음",False,False),
 (6,"{P07}","봐주는 게 갓 쓴 {박수무당}인데","얼굴이 없음;;",False,False),
 (7,"{P09}","남은 한 달을 {비워뒀음}","여행이랑 큰 결제를 옮김",False,False),
 (8,"{P08}","그 달에 {차 수리비}가 나갔음","준비해둔 걸로 냈음",False,False),
 (9,"@full","기본 결과는 {무료}로 나온다","아래에서 볼 수 있음",False,True),
]
MAP_F = {"{P15}":"p15.png","{P02}":"p02.png","{P03}":"p03.png","{P05}":"p05.png","{P07}":"p07.png","{P09}":"p09.png","{P08}":"p08.png"}
MAP_R = {"{P15}":"r01.png","{P02}":"r02.png","{P03}":"r03.png","{P05}":"r05.png","{P07}":"r07.png","{P09}":"r09.png","{P08}":"r08.png"}

PAST = [
 (1,"p15.png","사주 안 믿다가"+chr(10)+"{기록}부터 맞춰본 썰","(무료로 본 게 다임)",True,False),
 (2,"p03.png","몇 년 전에 {크게 엎은} 해가 있음","그 얘긴 아무한테도 안 했음",False,False),
 (3,"p05.png","생년월일만 넣고 {지난 일}을 봤음","맞나 보려고",False,False),
 (4,"p13.png","그 해가 {그대로} 적혀 있었음","나만 아는 건데",False,False),
 (5,"p14.png","짐 싸서 나오던 {그때}가 맞았음","말한 적도 없는데",False,False),
 (6,"p07.png","봐주는 게 갓 쓴 {박수무당}인데","얼굴이 없음;;",False,False),
 (7,"p06.png","그래서 {남은 장}도 열어봤음","이건 봐야 될 것 같았음",False,False),
 (8,"@jikeon","기본 결과는 {무료}로 나온다","아래에서 볼 수 있음",False,True),
]
FACE = [
 (1,"p03.png","연애 접고 살다가"+chr(10)+"{짝 카드}를 본 썰","(사주 한 번 본 게 다임)",True,False),
 (2,"p12.png","소개팅은 {나갈수록} 지침","혼자가 편해졌음",False,False),
 (3,"p05.png","생년월일 넣으니 {사람} 항목이 있었음","이런 것도 나오나 했음",False,False),
 (4,"p17.png","{첫인상}이랑 나이대가 적혀 있었음","생각보다 구체적이었음",False,False),
 (5,"p07.png","봐주는 게 갓 쓴 {박수무당}인데","얼굴이 없음;;",False,False),
 (6,"p18.png","나중에 {비슷한 사람}을 만났음","앉자마자 카드가 생각났음",False,False),
 (7,"p09.png","만나는 {시기}도 겹쳤음","우연이라기엔",False,False),
 (8,"@partner","기본 결과는 {무료}로 나온다","아래에서 볼 수 있음",False,True),
]
HARSH = [
 (1,"p16.png","듣기 싫은 말만 해서"+chr(10)+"{껐다가} 다시 켠 썰","(결국 내가 졌음)",True,False),
 (2,"p05.png","가볍게 {생년월일}만 넣었음","재미로 본 거였음",False,False),
 (3,"p20.png","{안 좋은 것}부터 나옴","달래주는 말이 없었음",False,False),
 (4,"p19.png","기분 나빠서 {껐음}","뭐야 이거",False,False),
 (5,"p07.png","봐주는 게 갓 쓴 {박수무당}인데","말을 안 골라서 함",False,False),
 (6,"p08.png","근데 그 달에 {그렇게} 됐음","할 말이 없었음",False,False),
 (7,"p09.png","그때부터 {적어두고} 봄","듣기 싫은 말이 맞더라",False,False),
 (8,"@jikeon","기본 결과는 {무료}로 나온다","아래에서 볼 수 있음",False,True),
]
JOB = [
 (1,"j01.png","스무 번 미끄러지고"+chr(10)+"{시기}부터 본 썰","(사주 한 번 본 게 다임)",True,False),
 (2,"j02.png","이제 {메일} 열기도 무서웠음","또 떨어졌겠지 하고",False,False),
 (3,"j03.png","친구는 벌써 {붙었대}","축하한다고 했는데 속으론",False,False),
 (4,"j04.png","생년월일 넣으니 {때}가 나뉘어 있었음","지금은 기다리라고 나옴",False,False),
 (5,"j05.png","봐주는 게 갓 쓴 {박수무당}인데","얼굴이 없음;;",False,False),
 (6,"j06.png","{그 달}에 다시 넣어보라길래","반신반의로 넣었음",False,False),
 (7,"j07.png","접어뒀던 데서 {연락}이 왔음","그 달 안이었음",False,False),
 (8,"@daeun","기본 결과는 {무료}로 나온다","아래에서 볼 수 있음",False,True),
]

if __name__ == "__main__":
    for m,pd,out,pre in ((MAP_F,PF,"이미지툰_v2_A_재물_손그림","tA"),(MAP_R,PR,"이미지툰_v2_B_재물_컬러","tB")):
        for (i,p,t,b,c,br) in WEALTH:
            make(os.path.join(OUTROOT,out), i, pd, m.get(p,p), t,b,c,br,pre)
    for cuts,out,pre,pd in ((PAST,"이미지툰_v2_C_과거","tC",PF),(FACE,"이미지툰_v2_D_얼굴","tD",PF),
                            (HARSH,"이미지툰_v2_E_직언","tE",PF),(JOB,"이미지툰_v2_F_취준생","tF",PJ)):
        for (i,p,t,b,c,br) in cuts:
            make(os.path.join(OUTROOT,out), i, pd, p, t,b,c,br,pre)
