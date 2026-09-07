# 실측 JSON 을 y 순서의 '대본'으로 편다 — 손님이 스크롤하며 만나는 순서 그대로.
import json, io, sys, os
sys.stdout.reconfigure(encoding='utf-8')
p = sys.argv[1]
mode = sys.argv[2] if len(sys.argv) > 2 else 'script'
d = json.load(io.open(p, encoding='utf-8'))

VH = 844
def screen(y): return f"{y/VH:5.2f}vh"

if mode == 'script':
    rows = []
    for t in d['texts']:
        rows.append((t['y'], 'T', t))
    for i in d['imgs']:
        rows.append((i['y'], 'I', i))
    for v in d['videos']:
        rows.append((v['y'], 'V', v))
    for b in d['tappable']:
        rows.append((b['y'], 'B', b))
    rows.sort(key=lambda r: (r[0], {'I':0,'V':0,'B':2,'T':1}[r[1]]))
    print(f"# {d['url']}  높이 {d['docH']}px  ({d['docH']/VH:.1f} 화면)  폭 {d['W']}")
    last = -999
    for y, k, o in rows:
        gap = y - last
        gapstr = f" [+{gap}]" if gap > 60 else ""
        last = y
        if k == 'T':
            flag = ''
            if o['bgKind'] in ('image',): flag = ' ~img배경'
            elif o['cr'] < 4.5: flag = f" ⚠대비{o['cr']}"
            print(f"{y:6d} {screen(y)} T fs{o['fs']:<5g} w{o['fw']:<4} {o['color'][:20]:<20}{flag:<12} | {o['t']}")
        elif k == 'I':
            print(f"{y:6d} {screen(y)} IMG {o['w']}x{o['h']} ({o['pctW']}%) nat{o['nw']}x{o['nh']} load={o['loading'] or '-'} ok={o['ok']} :: {o['src'].split('/')[-1]}")
        elif k == 'V':
            print(f"{y:6d} {screen(y)} VID {o['w']}x{o['h']} :: {o['src'].split('/')[-1]}")
        else:
            print(f"{y:6d} {screen(y)} >>> BTN {o['w']}x{o['h']} fs{o['fs']:g} tag={o['tag']} href={o['href'][:40]} | {o['t']}")

elif mode == 'stats':
    ts = d['texts']
    print(f"높이 {d['docH']}px = {d['docH']/VH:.1f} 화면 · 텍스트 {len(ts)} · 이미지 {len(d['imgs'])} · 클릭 {len(d['tappable'])}")
    from collections import Counter
    print("\n[폰트 크기 분포]")
    c = Counter(t['fs'] for t in ts)
    for k in sorted(c): print(f"  {k:5g}px  {c[k]:3d}개  {'#'*c[k]}")
    print("\n[굵기 분포]")
    c = Counter(t['fw'] for t in ts)
    for k in sorted(c, key=lambda x: int(x)): print(f"  {k:5}  {c[k]:3d}개")
    bold = sum(1 for t in ts if int(t['fw']) >= 600)
    print(f"  → 굵은 비율 {bold}/{len(ts)} = {bold/len(ts)*100:.0f}%")
    print("\n[대비 미달 (그림 배경 제외)]")
    bad = [t for t in ts if t['bgKind'] != 'image' and t['cr'] < 4.5]
    for t in sorted(bad, key=lambda x: x['cr'])[:40]:
        print(f"  cr={t['cr']:<6} fs={t['fs']:<5g} y={t['y']:<6} {t['color'][:18]:<18} on {t['bg']:<18} | {t['t'][:60]}")
    print(f"  총 {len(bad)}개")
    print("\n[작은 글씨 <13px]")
    small = [t for t in ts if t['fs'] < 13]
    for t in sorted(small, key=lambda x: x['fs'])[:30]:
        print(f"  {t['fs']:g}px y={t['y']:<6} | {t['t'][:70]}")
    print(f"  총 {len(small)}개")
    print("\n[탭 타깃 <44px 높이]")
    for b in d['tappable']:
        if b['h'] < 44: print(f"  {b['w']}x{b['h']} y={b['y']:<6} | {b['t'][:50]}")
    print("\n[가로 넘침]")
    for o in d['overflow'][:20]: print(f"  {o['tag']}.{o['cls'][:30]} left={o['left']} right={o['right']} y={o['y']} | {o['t']}")
    print("\n[네트워크 상위]")
    tot = sum(n['kb'] for n in d['net'])
    print(f"  총 {tot:.0f}KB")
    for n in sorted(d['net'], key=lambda x: -x['kb'])[:16]:
        print(f"   {n['kb']:8.1f}KB {n['type']:<10} {n['u']}")
    img = sum(n['kb'] for n in d['net'] if n['type'] in ('Image','Media'))
    print(f"  이미지+미디어 {img:.0f}KB")

elif mode == 'outline':
    print(f"# {d['url']}  {d['docH']}px")
    for o in d['outline']:
        print(f"{o['y']:6d} h={o['h']:<6} {o['tag']:<6} {o['cls'][:40]:<42} | {o['t'][:70]}")
