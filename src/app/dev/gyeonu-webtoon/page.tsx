/**
 * 견우 웹툰부 조판 검사대 — `/dev/gyeonu-webtoon`
 *
 * 왜 있나: 웹툰부는 위저드 14스텝을 다 통과해야 나오는데, 그 끝이 **외부 만세력 API** 에
 * 걸려 있다. 2026-09-05 조판을 고치는 도중 그 API 가 `fetch failed` 로 튕겨서 화면을
 * 못 봤다 — 조판 일이 남의 서버 사정에 묶이는 건 말이 안 된다.
 * 여기서는 고정 표본으로 `GyeonuWebtoon` 만 세운다. 숨·컷 크기·말풍선 자리를 잴 때 쓴다.
 *
 * ⚠ 값은 전부 가짜다. 문장·수치의 정본은 `computeReunionFacts` → `buildReunionTeaser` 다.
 *    여기 값을 보고 카피를 고치지 말 것 — 조판만 본다.
 */
"use client";

import { useEffect } from "react";
import type { ReunionTeaser } from "@/lib/saju/teaser";
import { GyeonuWebtoon, ReunionToc, GyeonuComfortCut } from "@/components/products/gyeonu-teaser";

const FIXTURE: ReunionTeaser = {
  calendar: [
    { year: 2026, month: 9, kind: "먼저 연락하면 안 되는 달", locked: false },
    { year: 2026, month: 10, kind: "그냥 지나가는 달", locked: true },
    { year: 2026, month: 11, kind: "연락해도 되는 달", locked: true },
    { year: 2026, month: 12, kind: "그냥 지나가는 달", locked: true },
    { year: 2027, month: 1, kind: "다리가 놓이는 달", locked: true },
    { year: 2027, month: 2, kind: "그냥 지나가는 달", locked: true },
    { year: 2027, month: 3, kind: "연락해도 되는 달", locked: true },
    { year: 2027, month: 4, kind: "그냥 지나가는 달", locked: true },
    { year: 2027, month: 5, kind: "먼저 연락하면 안 되는 달", locked: true },
    { year: 2027, month: 6, kind: "그냥 지나가는 달", locked: true },
    { year: 2027, month: 7, kind: "다리가 놓이는 달", locked: true },
    { year: 2027, month: 8, kind: "그냥 지나가는 달", locked: true },
  ],
  revealed: {
    year: 2026,
    month: 9,
    kind: "먼저 연락하면 안 되는 달",
    desc: "이 달에 보낸 말은 반대로 갑니다.",
  },
  lockedCount: 11,
  reconnectCount: 2,
  contactOkCount: 2,
  breakupCheck: {
    year: 2025,
    month: 4,
    bent: true,
    line: "그 무렵 두 사람 흐름이 같이 꺾여 있었습니다.",
    marks: ["말이 자꾸 어긋났다", "먼저 지쳤다"],
  },
  rival: { basis: "나", strength: "중", lines: ["곁에 사람이 있습니다.", "아직 자리를 잡지는 못했습니다."], when: null },
  moveOn: {
    look: "눈매가 순한 사람",
    nature: "말수가 적고 늦게 데워지는 사람",
    place: "일로 이어진 자리",
    ageDir: "또래이거나 두어 살 위",
    turningYear: { year: 2027, age: 36 },
  },
  cut: { lead: "다리가 놓이는 달은 ", mask: "○", tail: "월." },
  oddsMask: "○○",
  locked: [
    { label: "다리가 놓이는 달", mask: "○○" },
    { label: "첫 줄을 여는 말", mask: "○○○" },
  ],
};

export default function DevGyeonuWebtoonPage() {
  // 캡처 준비 — **hydration 이 끝난 뒤에** 손댄다.
  //  · 컷은 lazy 라 화면 밖이면 안 받는다. 헤드리스로 통짜를 찍으면 아래쪽이 검게 나온다
  //    (2026-09-05 실측: shoot-long 첫 판에서 컷 3~6 이 빈 판이었다).
  //  · ⚠ 이걸 인라인 <script> 로 넣었다가 loading/decoding 이 서버 HTML 과 어긋나
  //    **hydration mismatch** 를 만들었다(같은 날 실측). DOM 조작은 useEffect 안에서만.
  //  · dev 오버레이 배지는 캡처에서 말풍선을 가린다 — 검사대에서만 숨긴다.
  useEffect(() => {
    document.querySelectorAll("img").forEach((i) => {
      i.loading = "eager";
      // ⚠ loading 을 바꾸는 것만으론 **이미 lazy 로 미뤄진 건 안 받는다**(2026-09-05 실측:
      //    속성만 바꾼 판은 등불·강 건너 컷이 빈 판으로 찍혔다).
      //    같은 값을 재할당(`i.src = i.src`)해도 브라우저가 무시한다 — **빈 문자열을 거쳐야** 다시 받는다.
      if (!i.complete) {
        const src = i.src;
        i.src = "";
        i.src = src;
      }
    });
    const s = document.createElement("style");
    s.textContent = "nextjs-portal{display:none!important}";
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  return (
    <main style={{ background: "#070a12", minHeight: "100vh" }}>
      {/* 위저드 12칸 慰 화면 조각 — 여기 있는 이유는 그 화면이 **위저드 12칸을 다 걸어야** 나와서다.
          카드 폭(≤280)·2:3 비율·영상 폴백을 여기서 잰다. 실물 순서상 웹툰부보다 앞이라 위에 둔다. */}
      <div className="mx-auto w-full max-w-[430px] px-5 pt-10 text-center">
        <GyeonuComfortCut />
        <p className="font-myeongjo text-[17px] leading-[1.9]" style={{ color: "var(--bone)" }}>
          저도 일 년에 하루, 강 건너를 바라보는 놈입니다.
          <br />
          기다리는 마음은 압니다.
        </p>
      </div>
      {/* 위저드 컨테이너의 px-5 를 흉내 낸다 — 웹툰부의 -mx-5 가 이걸 되물려야 폭이 실물과 같다. */}
      <div className="mx-auto w-full max-w-[430px] px-5">
        <GyeonuWebtoon data={FIXTURE} name="서윤" eagerAll />
      </div>
      {/* 상품부 조각 — 절단 뒤 **밝은 판**이라 배경 클래스(teaser-light)와 패딩을 실물과 맞춘다.
          전체 상품부는 SajuWizard 안에 흩어져 있어 여기서 못 세운다. 목차처럼 독립 컴포넌트만 올린다. */}
      <div className="teaser-light mx-auto w-full max-w-[430px] px-4 py-10">
        <ReunionToc data={FIXTURE} />
      </div>
    </main>
  );
}
