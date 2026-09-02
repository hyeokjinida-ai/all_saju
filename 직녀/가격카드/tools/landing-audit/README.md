# 랜딩·티저 판독기 (2026-08-30 신설)

폰 뷰포트에서 **DOM 실측**으로 랜딩/티저를 전수 판독하는 도구 묶음.
캡처 픽셀 판독 금지(규칙 4) — 전부 `getBoundingClientRect` + `getComputedStyle` + CDP Network 다.

| 파일 | 하는 일 |
|---|---|
| `audit.mjs` | 텍스트 전수(크기·굵기·색·유효배경·대비) · 이미지 · 클릭요소 · 가로넘침 · 섹션골격 · 전송량 → JSON |
| `read.py` | 그 JSON 을 y 순서 **대본**(`script`) / 통계(`stats`) / 골격(`outline`) 으로 편다 |
| `flow.mjs` | 게이트 → 설화 → 입력 → 분석 → 티저를 **자동 주행**하며 단계별 탭·시간·누적 전송 기록 |
| `speed.mjs` | Slow4G/3G + CPU 감속에서 FCP·DCL·load 와 시점별 수신 바이트 |
| `probe.mjs` | 임의 JS 를 폰 뷰포트에서 실행(+`--scroll 1` 훑기) — `p1~p4.js` 와 함께 씀 |
| `shot.mjs` | **훑기 후** 구간 캡처. `shoot-long.mjs` 는 훑기가 없어 lazy 이미지가 통째로 빈다 |

```bash
node audit.mjs --url "https://myeongunrok.com/products/inyeon-saju?demo=1" --out t.json --wait 25000
PYTHONUTF8=1 python read.py t.json script     # stats · outline 도 가능
node flow.mjs  --url "https://myeongunrok.com/products/inyeon-saju" --out flow.json
node speed.mjs --url "..." --net slow4g --cpu 4
node probe.mjs --url "..." --jsfile p4.js --width 360 --height 640
node shot.mjs  --url "..." --out shots/x --width 390 --slice 2600
```

## 함정 (실측으로 배운 것)

1. **그라데이션 배경을 투명으로 읽으면 대비가 가짜로 미달**이 된다 → `effBg` 가 `background-image` 의 첫 불투명색을 쓴다.
2. **SVG 말풍선·`████` 마스크바는 여전히 가짜 판정**이다(배경이 조상에 없다). 집계에서 뺄 것.
3. **접힌 `<details>` 의 자식도 좌표를 돌려준다**(`content-visibility:hidden` 의 옛 박스). 열림 여부를 따로 확인할 것.
4. **`useInView` 연출과 lazy 이미지는 훑어야 깨어난다** — 모든 도구가 스크롤 2패스를 돈다.
5. 로컬 dev 는 **워킹트리**를 서빙한다. 운영 결함인지 브랜치 지체인지 반드시 운영 도메인과 대조할 것.

판독 결과: `00_랜딩티저_정밀판독_2026-08-30.md`
