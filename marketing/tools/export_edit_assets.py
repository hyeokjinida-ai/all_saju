# -*- coding: utf-8 -*-
"""
export_edit_assets.py — v5 광고를 **캡컷에서 직접 편집**할 수 있게 부품을 낱개로 뽑는다.

  PYTHONUTF8=1 python marketing/tools/export_edit_assets.py                # v5 → 영상/편집용/
  PYTHONUTF8=1 python marketing/tools/export_edit_assets.py --script v7    # 9/6 새 대본 → 영상/편집용_v7/

핵심: 카드·훅·자막을 **1080×1920 투명 PNG(위치까지 반영)** 로 굽는다.
캡컷 타임라인에 그냥 얹으면 제자리에 앉는다 — 크기·좌표를 다시 맞출 필요가 없다.
(잘라낸 원본 크롭도 `_원본크롭/` 에 같이 둔다 — 형님이 다르게 배치하고 싶을 때 쓰라고.)

산출 → marketing/소재/산군/영상/편집용/
"""
import json
import os
import shutil
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_seoyun as B  # noqa: E402

SCRIPT = sys.argv[sys.argv.index("--script") + 1] if "--script" in sys.argv else "v5"
B.use_script(SCRIPT)
OUT = f"{B.OUT}/{B.EDIT_DIR}"
# 편별 「지켜야 할 것」 — README 에 그대로 들어간다
NOTES = {
    "v5": """1. **「기분 나쁘다」 3회** — 22.60 / 28.70 / 40.30초
2. **「긁힘」 수미상관** — 0.20초와 44.50초
3. **정점 5곳** 자막을 다른 줄의 1.8배로
4. **화면과 어긋나면 안 되는 자리 2곳** — 25.4~30초 짝 카드에 「말보다 행동으로 챙긴다」가 글자로 적혀 있고,
   28.9~30초엔 그 카드가 폰 화면에 박힙니다. 여기 대사를 「감각 남다른 사람」류로 바꾸면 그 자리에서 어긋납니다.""",
    "v7": """1. **훅 「사주 봤는데 이거 / 은근히 기분 나쁘네??」** 0~41.5초 고정 — 훅은 자막이 아니라 소재의 뼈대입니다
2. **「긁힘」 수미상관** — 「여기서 좀 긁힘」(28초대)과 「긁힐 준비는 하고」(42초대)
3. **정점 4곳** 자막을 다른 줄의 1.8배로 — 이걸 어떻게 알지? / 여기서 좀 긁힘 / 왜 또 내 스타일인데? / 내 인생을 몰래 읽힌 느낌임
4. **화면과 어긋나면 안 되는 자리** — 22.6~28.1초 짝 카드에 「말보다 행동으로 챙긴다」가 글자로 적혀 있고,
   28.9~30초엔 그 카드가 폰 화면에 박힙니다. 「말보다 행동으로」는 바꾸지 마세요.
5. ⚠ **2.4~7.2초 직언 카드는 가짜 화면입니다** — 서윤 실결과지 문장이 아니라 결과지 조판으로 새로 만든 것(형님 승인 2026-09-06).
   훅 3행 「*실제 사주 서비스 화면입니다」와는 어긋납니다. 고지행을 바꾸려면 `03_훅_투명PNG` 를 다시 뽑습니다(build_seoyun V7_HOOKS).""",
    "v8": """1. **TTS 는 형님이 캡컷에서.** 여기 시각(t0)은 7.0음절/초로 잡은 **목표값**입니다. TTS 길이대로 옮기되 두 앵커만 지키세요 —
   **28.6~30.0초 폰 화면 크로마**(짝 카드가 폰에 박힘)와 **30.2초 얼굴 공개**(풀스크린 짝 카드). 이 둘은 영상에 박혀 있어 못 옮깁니다.
2. 얼굴 공개 앞까지 186음절이라 TTS 가 6.6음절/초면 30.9초로 앵커를 넘습니다 → **TTS 속도 1.1~1.2배**, 또는 `_v8_바탕_카드없음` 판에 카드 PNG 를 직접 놓으세요.
3. **훅 「내 다음 남친 / 사주가 먼저 보여줌」** 0~42.4초 고정 — 훅은 자막이 아니라 소재의 뼈대입니다.
4. **정점 3곳** 1.8배 — 이 정도까지 알려준다고? / 왜 내가 좋아하게 생겼는데? / 다음 연애 미리 스포당한 기분임
5. ⚠ 제품 진실 2건: 짝 카드에 **직업은 없습니다**(8번 줄 「어떤 일을 하는지」는 화면에 근거가 없음 → 「어떤 성격인지」가 제품에 맞는 말).
   「만나는 자리」 항목은 있지만 서윤 샘플 문장이 공급사 경고문이라 화면엔 못 냈습니다(화면 근거 = 시기·외모·성격·나이대).
6. 「스포당한」은 TTS 엔진이 뭉개기 쉬운 단어(8/23 실측) — 캡컷 TTS 뽑고 한 번 들어 보세요.""",
    "v7m": """1. **민지판(두 번째 크리에이터).** 대본·자막·카드는 서윤 v7 과 같고 얼굴·방만 다릅니다. TTS 는 형님이 캡컷에서.
2. **폰 화면 크로마가 없습니다** → 푸티지에 박힌 앵커가 없습니다. 카드 시각은 전부 목표값이라 TTS 길이대로 옮겨도 됩니다.
   짝 카드 블러 슬롯이 22.6~30.1초에 떠 있다가 30.2초 풀스크린으로 얼굴이 공개되는 순서만 지키세요.
3. **훅 「사주 봤는데 이거 / 은근히 기분 나쁘네??」** 0~42.4초 고정. 정점 4곳 1.8배 — 이걸 어떻게 알지? / 여기서 좀 긁힘 / 왜 또 내 스타일인데? / 내 인생을 몰래 읽힌 느낌임
4. ⚠ **2.4~7.2초 직언 카드는 가짜 화면**입니다(서윤 결과지 조판에 형님 문장을 넣은 것, 9/6 승인). 훅 3행 「*실제 사주 서비스 화면입니다」와 어긋납니다.
5. 카드에 「2026년 11월」「2024년 31세」가 보입니다 — 캡처 안 연·월은 허용(8/23 결정 8-1), 자막·TTS 엔 넣지 마세요.""",
    "v8m": """1. **민지판(두 번째 크리에이터).** 대본·자막·카드는 서윤 v8 과 같고 얼굴·방만 다릅니다. TTS 는 형님이 캡컷에서.
2. **폰 화면 크로마가 없습니다** → 푸티지 앵커 없음. 카드 시각은 전부 목표값(7.0음절/초). TTS 가 느려도 그대로 옮기면 됩니다.
   짝 카드 블러 슬롯 24.9~30.1초 → 30.2초 풀스크린 얼굴 공개 순서만 지키세요.
3. **훅 「내 다음 남친 / 사주가 먼저 보여줌」** 0~42.4초 고정. 정점 3곳 1.8배 — 이 정도까지 알려준다고? / 왜 내가 좋아하게 생겼는데? / 다음 연애 미리 스포당한 기분임
4. ⚠ 제품 진실 2건: 짝 카드에 **직업은 없습니다**(8번 줄 「어떤 일을 하는지」 → 제품에 맞는 말은 「어떤 성격인지」). 「만나는 자리」는 샘플 문장이 공급사 경고문이라 화면에 안 냈습니다.
5. 「스포당한」은 TTS 엔진이 뭉개기 쉬운 단어 — 캡컷 TTS 뽑고 한 번 들어 보세요.""",
}
D = {
    "clip": f"{OUT}/01_영상소스",
    "card": f"{OUT}/02_카드_투명PNG",
    "hook": f"{OUT}/03_훅_투명PNG",
    "sub": f"{OUT}/04_자막_투명PNG",
    "aud": f"{OUT}/05_나레이션",
    "end": f"{OUT}/06_엔드카드",
    "raw": f"{OUT}/07_원본재료",
    "crop": f"{OUT}/02_카드_투명PNG/_원본크롭",
}
HAS_TTS = (not getattr(B, "NO_TTS", False)) and os.path.exists(f"{B.AUD}/_lines_meta.json")
if not HAS_TTS:
    D.pop("aud")   # v8: 형님이 캡컷에서 TTS — 나레이션 폴더를 만들지 않는다
for p in D.values():
    os.makedirs(p, exist_ok=True)


def log(*a):
    print("[export]", *a, flush=True)


def place(layer_im, pos, W=1080, H=1920):
    """레이어를 캔버스 좌표에 얹은 투명 PNG."""
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(layer_im.convert("RGBA"), (int(pos[0]), int(pos[1])))
    return canvas


def main():
    W, H = 1080, 1920
    idx = []

    # ── 01 영상 소스 ──────────────────────────────────────────
    P = B.PERSON
    for n, fn in zip(("A", "B", "C"), B.CLIP_FILES):
        src = f"{B.CLIPS}/{fn}"
        seg = {"A": "0~15초", "B": "15~30초", "C": "30초~끝"}[n]
        dst = f"{D['clip']}/{P}_{n}_{seg}.mp4"
        if os.path.exists(src):
            shutil.copyfile(src, dst)
            log("clip", os.path.basename(dst))
    # 이어붙인 45초 + 정지 3초(= 완성본 바탕)
    joined = f"{B.TMP}/base_9x16.mp4" if B.FOOT == "seo" else f"{B.TMP}/base_{B.FOOT}_9x16.mp4"
    if os.path.exists(joined):
        shutil.copyfile(joined, f"{D['clip']}/{P}_이어붙인_48초_바탕.mp4")
        log(f"clip {P}_이어붙인_48초_바탕.mp4")

    # ── 02 카드 (투명 PNG, 위치 반영) ─────────────────────────
    for kind, name, t0, t1, opt in B.CARDS:
        if name.startswith("__win"):
            # 스크롤은 PNG 로 못 만든다 — 원본 페이지를 1080 폭으로 주고 속도만 적어 둔다
            src = f"{B.WIN}/win{name[-1]}.png"
            if not os.path.exists(src):
                src = B.PAN_FALLBACK.get(name[-1], src)   # %TEMP% 가 비면 v5 편집용 세트의 페이지원본
            if os.path.exists(src):
                Image.MAX_IMAGE_PIXELS = None
                page = Image.open(src).convert("RGB")
                page = page.resize((W, int(page.height * W / page.width)), Image.LANCZOS)
                out = f"{D['card']}/스크롤_{t0:05.2f}s_페이지원본.png"
                page.save(out)
                idx.append((t0, t1, "스크롤(직접)", os.path.basename(out),
                            f"세로로 훑기 · 570 px/s · {t1 - t0:.2f}초 동안 {int(570 * (t1 - t0))}px"))
                log("pan", os.path.basename(out), page.size)
            continue
        p = f"{B.CAPS}/{name}"
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert("RGB")
        shutil.copyfile(p, f"{D['crop']}/{name}")
        if kind == "slot":
            card = B.rounded(B.fit_width(im, int(W * 0.52)))
            pos = (int(W * 0.45), int(H * 0.615))
        elif kind == "pin":
            card = B.rounded(B.fit_width(im, int(W * 0.90)), pad=18)
            pos = (int((W - card.width) / 2), int(H * 0.638))
        else:  # full
            side = int(W * 0.98)
            body = B.fit_width(im, side)
            if body.height > H * 0.90:
                body = body.resize((int(body.width * H * 0.90 / body.height), int(H * 0.90)), Image.LANCZOS)
            card = Image.new("RGBA", (W, H), (8, 6, 5, 255))
            card.alpha_composite(body.convert("RGBA"), ((W - body.width) // 2, (H - body.height) // 2))
            pos = (0, 0)
        out = f"{D['card']}/{t0:05.2f}s_{kind}_{os.path.splitext(name)[0]}.png"
        place(card, pos).save(out)
        idx.append((t0, t1, kind, os.path.basename(out), f"{t1 - t0:.2f}초 노출"))
        log("card", os.path.basename(out))

    # ── 03 훅 (투명 PNG) ─────────────────────────────────────
    cta = B.VARIANTS[next(iter(B.VARIANTS))][1]   # 본판의 CTA 마지막 줄
    for key in B.HOOKS:
        layers = B.make_layers("9x16", key, cta)
        hook = layers[0]["im"]           # 첫 레이어가 훅
        nm = {"h24": "V0_긁힘·미련", "h25": "V2_전남친취향", "h26": "V3_얼굴", "h27": "V7_은근히기분나쁘네",
              "h28": "V8_다음남친"}.get(key, key)
        out = f"{D['hook']}/훅_{nm}.png"
        hook.save(out)
        log("hook", os.path.basename(out))

    # ── 04 자막 (투명 PNG) ───────────────────────────────────
    layers = B.make_layers("9x16", next(iter(B.HOOKS)), cta)
    subs = [l for l in layers[1:] if l["im"] is not None and l["t0"] < B.END_T]
    for (i, t0, spoken, rows, peak), l in zip(B.LINES, subs):
        tag = "정점" if peak else "본문"
        safe = rows[0].replace("?", "").replace("!", "").replace(",", "")[:14]
        out = f"{D['sub']}/{i:02d}_{t0:05.2f}s_{tag}_{safe}.png"
        l["im"].save(out)
    log("subs", len(subs), "장")

    # ── 05 나레이션 (TTS 가 있을 때만) ───────────────────────
    if HAS_TTS:
        for i, t0, spoken, rows, peak in B.LINES:
            src = f"{B.AUD}/line_{i:02d}.wav"
            if os.path.exists(src):
                shutil.copyfile(src, f"{D['aud']}/{i:02d}_{t0:05.2f}s.wav")
        mix = B.narr_wav()
        if os.path.exists(mix):
            shutil.copyfile(mix, f"{D['aud']}/_통짜_{B.CUT_T:.0f}초.wav")
        log("audio", len(B.LINES), "줄 + 통짜")
    else:
        log("audio 없음 — 형님이 캡컷에서 TTS")

    # ── 06 엔드카드 ─────────────────────────────────────────
    B.endcard(W, H).save(f"{D['end']}/엔드카드_1080x1920.png")
    B.endcard(1080, 1350).save(f"{D['end']}/엔드카드_1080x1350.png")
    log("endcard 2장")

    # ── 07 원본재료 ─────────────────────────────────────────
    STILL = {"서윤": f"{B.MAT}/UGC/seoyun_01.png", "민지": f"{B.MAT}/UGC/minji/minji_01_base.png"}
    for src, dst in [
        (STILL.get(B.PERSON, ""), f"{B.PERSON}_정지컷.png"),
        (f"{B.CAPS}/seo_result_full.png", "서윤_결과지_통짜.png"),
        (f"{B.CAPS}/seo_partner_card_ad.png", "짝카드_얼굴공개.png"),
        (f"{B.CAPS}/seo_partner_card_ad_blur.png", "짝카드_얼굴블러.png"),
        (f"{B.ROOT}/public/brand/logo-h-ivory.png", "로고_가로_아이보리.png"),
    ]:
        if os.path.exists(src):
            shutil.copyfile(src, f"{D['raw']}/{dst}")
    log("원본재료")

    # ── README ─────────────────────────────────────────────
    idx.sort()
    rows = "\n".join(
        f"| {t0:05.2f} | {t1:05.2f} | {k} | `02_카드_투명PNG/{f}` | {note} |" for t0, t1, k, f, note in idx)
    sub_rows = "\n".join(
        f"| {t0:05.2f} | {'★' if peak else ''} | {' / '.join(rows_)} | {spoken} |"
        for i, t0, spoken, rows_, peak in B.LINES)
    pan_note = " · ".join(f"{t0:.2f}~{t1:.2f}" for _k, _n, t0, t1, _o in B.CARDS if _n.startswith("__win"))
    open(f"{OUT}/00_읽어보세요.md", "w", encoding="utf-8").write(f"""# {SCRIPT} 광고 편집 부품 — 캡컷용 (서윤 무성 UGC)

전부 **1080×1920 투명 PNG(위치까지 반영)** 입니다. 캡컷 타임라인에 그냥 얹으면 제자리에 앉습니다.
크기·좌표를 다시 맞출 필요가 없습니다. 다르게 배치하고 싶으면 `02_카드_투명PNG/_원본크롭/` 의 낱장을 쓰세요.

## 폴더

| 폴더 | 내용 |
|---|---|
| `01_영상소스` | {B.PERSON} 클립 3개 + 이어붙인 48초 바탕. **소리 없음** |
| `02_카드_투명PNG` | 결과지 카드. 파일명 앞 숫자가 **들어가는 시각(초)** |
| `03_훅_투명PNG` | 상단 고정 훅 {len(B.HOOKS)}종. 0~{B.END_T - 2:.1f}초 내내 깔면 됩니다 |
| `04_자막_투명PNG` | 자막 {len(B.LINES)}장. 파일명에 시각·정점 표시 |
| `05_나레이션` | {"TTS " + str(len(B.LINES)) + "줄 낱개 + 통짜 " + format(B.CUT_T, ".0f") + "초" if HAS_TTS else "없음 — TTS 는 형님이 캡컷에서. 카드 시각은 아래 표의 목표값"} |
| `06_엔드카드` | {B.END_T:.1f}~{B.CUT_T:.1f}초 |
| `07_원본재료` | 서윤 정지컷·결과지 통짜·짝 카드·로고 |

## 타임라인 — 카드

| 들어감 | 나감 | 종류 | 파일 | 비고 |
|---|---|---|---|---|
{rows}

## 타임라인 — 자막·나레이션 (★ = 정점, 글자 1.8배)

| 초 | ★ | 자막 | 나레이션 |
|---|---|---|---|
{sub_rows}

## 지켜야 할 것 (이게 대본의 척추입니다)

{NOTES[SCRIPT]}

## 손대기 어려운 것 두 개 (완성본에서 가져다 쓰세요)

- **28.9~30.0초 폰 화면 크로마** — 서윤이 폰을 돌리면 화면에 짝 카드가 박히는 부분.
  네 꼭짓점 원근 정합이라 캡컷으로 다시 만들기 어렵습니다. 완성본/무음판의 그 구간을 잘라 쓰세요.
- **스크롤 2곳**({pan_note}초) — `스크롤_*_페이지원본.png` 를 570 px/s 로 위→아래.
  캡컷에서 키프레임 2개(시작 y, 끝 y)로 만들 수 있습니다.

## 그 밖

- 15.00초에 **화이트 플래시 0.4초** (A→B 이음매 감추기)
- 소리: 룸톤 베드 −28dB + 카드 팝 효과음. 최종 −16 LUFS
""")
    log("README 완료 →", OUT)


if __name__ == "__main__":
    main()
