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
import type { ReunionTeaser } from "@/lib/saju/teaser";
import { GyeonuWebtoon } from "@/components/products/gyeonu-teaser";

const FIXTURE: ReunionTeaser = {
  calendar: [
    { year: 2026, month: 9, kind: "contactNo", locked: false },
    { year: 2026, month: 10, kind: "quiet", locked: true },
    { year: 2026, month: 11, kind: "contactOk", locked: true },
    { year: 2026, month: 12, kind: "quiet", locked: true },
    { year: 2027, month: 1, kind: "reconnect", locked: true },
    { year: 2027, month: 2, kind: "quiet", locked: true },
    { year: 2027, month: 3, kind: "contactOk", locked: true },
    { year: 2027, month: 4, kind: "quiet", locked: true },
    { year: 2027, month: 5, kind: "contactNo", locked: true },
    { year: 2027, month: 6, kind: "quiet", locked: true },
    { year: 2027, month: 7, kind: "reconnect", locked: true },
    { year: 2027, month: 8, kind: "quiet", locked: true },
  ],
  revealed: { year: 2026, month: 9, kind: "contactNo", desc: "이 달에 보낸 말은 반대로 갑니다." },
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
  return (
    <main style={{ background: "#070a12", minHeight: "100vh" }}>
      {/* 위저드 컨테이너의 px-5 를 흉내 낸다 — 웹툰부의 -mx-5 가 이걸 되물려야 폭이 실물과 같다. */}
      <div className="mx-auto w-full max-w-[430px] px-5">
        <GyeonuWebtoon data={FIXTURE} name="서윤" />
      </div>
    </main>
  );
}
