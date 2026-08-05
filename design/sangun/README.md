# 산군 이미지 원본 (서빙 안 됨)

여기 있는 PNG 는 **원본**이다. `public/` 이 아니라서 사이트로 나가지 않는다 —
원본을 `public/` 에 두면 9MB 짜리 파일이 방문자에게 그대로 서빙되고 배포마다 실린다.

사이트가 쓰는 건 여기서 뽑은 webp 뿐이다.

## 지금 연결된 것

| 원본 | → | 쓰이는 곳 |
|---|---|---|
| `ads/a5-thread.png` | `public/products/sangun/t5-thread.webp` (840×1050) | 티저 컷 — 붉은 실 |
| `ads/a4-mark.png` | `public/products/sangun/t6-mark.webp` (840×1050) | 티저 컷 — 붉은 동그라미 |
| `master/m1-front.png` | `public/products/sangun/cover.webp` (840×1260) | 결과지 표지 |
| `master/m1-alt-set.png` | — | 예비(같은 구도 다른 조명) |
| `master/m3-hands.png` | — | 미배치 |

## 새 컷을 받았을 때

1. 밝기부터 잰다 — 말풍선이 앉을 쪽 30% 구간의 평균 밝기가 **45 이하**여야 흰 글씨가 읽힌다.
   (현재 채택분은 상단 6.7 / 7.5. 이전 v1 컷은 26~33 이었다.)
2. webp 로 뽑는다. 컬럼이 최대 420px 이므로 2배인 **가로 840px** 이면 충분하다.
   ```
   Image.open(src).convert('RGB').resize((840, round(h*840/w))).save(dst,'WEBP',quality=82,method=6)
   ```
3. 세로 4:5 원본이면 `TeaserCut` 에 `size` 대신 `tall` 을 준다 — 비율 그대로 서서 말풍선 자리가 생긴다.
