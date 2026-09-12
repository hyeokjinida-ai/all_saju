"""v6 소재의 자막을 SRT·대본으로 뽑는다 — 형님이 캡컷에서 직접 얹을 때 쓴다.

빌더의 대본 상수를 그대로 읽으므로 **영상과 자막이 어긋날 수 없다**(따로 손으로 적지 않는다).
  PYTHONUTF8=1 python marketing/tools/export_subs.py
산출: marketing/소재/산군/영상/편집용_v6/<코드>/<코드>_자막.srt · _대본.txt
"""
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = f"{ROOT}/marketing/소재/산군/영상/편집용_v6"


def ts(t):
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", ",")


def write(code, rows, note):
    """rows = [(t0, t1, [줄…], 정점여부)]"""
    d = f"{OUT}/{code}"
    os.makedirs(d, exist_ok=True)
    srt = []
    for n, (t0, t1, lines, peak) in enumerate(rows, 1):
        srt.append(f"{n}\n{ts(t0)} --> {ts(t1)}\n" + "\n".join(lines) + "\n")
    io.open(f"{d}/{code}_자막.srt", "w", encoding="utf-8").write("\n".join(srt))

    txt = [f"# {code} 대본 · 자막 {len(rows)}줄", "", note, "",
           "| # | 시작 | 끝 | 자막 | 정점 |", "|---:|---:|---:|---|---|"]
    for n, (t0, t1, lines, peak) in enumerate(rows, 1):
        txt.append(f"| {n} | {t0:.2f}s | {t1:.2f}s | {' / '.join(lines)} | {'★ 1.8배' if peak else ''} |")
    io.open(f"{d}/{code}_대본.txt", "w", encoding="utf-8").write("\n".join(txt) + "\n")
    print(f"  {code}: {len(rows)}줄 -> {d}")


def main():
    os.makedirs(OUT, exist_ok=True)

    # ── vK (28s · TTS 있음) ──────────────────────────────────────
    import build_vk as K
    rows = []
    for k, (i, t0, lines, peak) in enumerate(K.LINES):
        nxt = K.LINES[k + 1][1] if k + 1 < len(K.LINES) else K.END_T
        rows.append((t0 - 0.08, min(nxt - 0.10, t0 + 4.4), lines, peak))
    hook = " / ".join(t for t, _, _ in K.HOOKS["k1"])
    write("vK", rows,
          f"훅(전구간 고정, 자막과 별개): {hook}\n"
          "소리: 힉스필드 seed_audio · Talia(여) · speech_rate 75. 원본 낱개 = `재료/클립/audio/vk/line_01..07.wav`\n"
          "⚠ 다른 TTS 로 갈아끼울 때: 「장부」·「각오」는 seed_audio 가 뭉갠다(v5 실측). 대본에서 이미 뺐다.\n"
          "⚠ 이 소재의 척추는 **과거를 두 번 짚는 것**(2·3번 줄) → **13.7s 「이걸 어떻게 알지?」**다. 이 순서를 바꾸면 W4 공식이 깨진다.")

    # ── vC2 (20s · 무음, 자막이 전부) ─────────────────────────────
    import build_ads as A
    st = A.STORY["vC2_seolhwa"]()
    rows = []
    for e in st["texts"]:
        if e["kind"] != "caption":
            continue
        t0 = e.get("t0", 0.0)
        t1 = e.get("t1", st["dur"])
        txt = e["text"].replace("*", "")
        rows.append((t0, t1, txt.split("\n"), False))
    write("vC2", rows,
          "훅 없음 — 0~2.6s 는 「이」→「이상하다.」→「이상하다..」 **타이핑 연출**이라 SRT 로는 세 줄로 나뉜다.\n"
          "`*별표*` 구간은 **주사색 형광 배경 + 흰 글씨**였다(색 글씨로 하면 촛불 배경에 묻힌다 — 2번 실패 후 확정).\n"
          "형광 단어: 묻기도 전에 읽는다 / 명운록 / 여덟 글자 / 돈이 들어오는 달 / 돌려보냈단다\n"
          "소리 원래 없음(무음판이 본판). CTA 「산군에게 장부 받기 >」는 14.4s 부터 1.2s 주기로 깜빡인다.")

    # ── vA2 (9s · 무음) ─────────────────────────────────────────
    st = A.STORY["vA2_face"]()
    rows = []
    for e in st["texts"]:
        if e["kind"] not in ("caption", "hook"):
            continue
        rows.append((e.get("t0", 0.0), e.get("t1", st["dur"]), e["text"].replace("*", "").split("\n"),
                     e["kind"] == "hook"))
    write("vA2", rows,
          "1번 줄이 **훅**(0~2.15s, 큰 글씨 2줄). 나머지는 하단 자막.\n"
          "3.1~5.7s 카드 구간은 **의도적으로 무자막**이다 — 카드 본문(외모·성격·만나는 자리)과 겹치면 둘 다 안 읽힌다.\n"
          "소리 원래 없음(앰비언스 베드만).")


if __name__ == "__main__":
    main()
