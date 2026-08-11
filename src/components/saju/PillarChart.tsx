// =====================================================
// 원국 한 판 — 티저(SajuWizard)와 결과지(SangunResult)가 같이 쓴다.
// =====================================================
// 원래 티저 전용이었는데, 결제 전엔 한자 위아래로 십성·12운성이 붙은 판을 보여주고
// 결제 후엔 한자만 덩그러니 나왔다 — 돈 내면 정보가 줄어드는 셈. 같은 컴포넌트를
// 양쪽에 꽂아서 "결제 전에 본 표 그대로, 그 이상"이 되게 한다.
import type { ResultView } from "@/lib/saju/result-view";
import type { ChartRow } from "@/lib/saju/teaser";

// 원국 4기둥 — /api/saju/chart(티저) 와 buildResultView(결과지) 의 view.pillars 가 같은 모양이다.
type Pillar = ResultView["pillars"][number];

/** 오행 → 한자 칸 바탕색.
 *  타이트는 오행을 금·빨강·초록 원색 카드로 칠한다. 우리는 먹+금 세계관이라 그대로 쓰면
 *  배경 사진(촛불·놋쇠의 호박색)과 UI 가 따로 논다 — 색상만 빌리고 채도를 낮춰 은은하게 깐다.
 *  글자는 금색을 유지해 신당 톤을 지킨다. */
const ELEMENT_TINT: Record<string, string> = {
  wood: "rgba(96,150,116,0.20)",
  fire: "rgba(160,54,38,0.26)",
  earth: "rgba(232,201,106,0.15)",
  metal: "rgba(198,204,212,0.14)",
  water: "rgba(96,118,168,0.22)",
};

/** 원국 한 판 — 한자·십성·기운을 기둥별 세로줄로 세운다.
 *
 *  실측(2026-08-06)으로 배운 것: 한자 카드와 십성 표를 따로 두면 「비견·겁재·묘」가
 *  어느 글자 얘긴지 연결이 끊긴다. 타이트는 글자 바로 위아래에 십성을 붙여 눈으로 잇는다.
 *
 *      해      달      나      ← 기둥
 *     비견    겁재  나 자신    ← 천간이 무슨 자리인지
 *     [甲]    [己]    [戊]     ← 천간 (오행 바탕)
 *     [戌]    [巳]    [午]     ← 지지 (오행 바탕)
 *     갑술    기사    무오     ← 한글 읽기
 *     비견    편인    정인     ← 지지가 무슨 자리인지
 *   ─────────────────
 *      묘     건록    제왕     ← 12운성
 *
 *  rows(십성·기운)는 없을 수 있다(티저 생성 실패, 옛 결과지의 raw_analysis 부재).
 *  그때도 한자 판은 서야 하므로 빈칸으로 둔다. */
export function PillarChart({ shown, rows }: { shown: Pillar[]; rows: ChartRow[] }) {
  if (shown.length === 0) return null;
  // shown 은 년→월→일(→시), rows 도 같은 순서로 만들어진다(teaser.ts buildChartRows).
  // 시 모름일 때 거르는 조건이 서로 달라 길이가 어긋날 수 있으므로 인덱스로만 조심해서 집는다.
  const cols = shown.map((p, i) => ({ p, r: rows[i] }));
  const hasMeta = rows.length > 0;
  const grid = { display: "grid", gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))` } as const;

  const Glyph = ({ char, element, isDay }: { char: string; element: string; isDay?: boolean }) => (
    <span
      className="font-brush block py-1.5 text-[26px] leading-none text-gold-bright"
      style={{
        background: ELEMENT_TINT[element] ?? "rgba(255,255,255,0.035)",
        border: `1px solid ${isDay ? "var(--gold)" : "var(--gold-pale)"}`,
      }}
    >
      {char}
    </span>
  );

  return (
    <div className="mt-2.5 border border-gold-pale px-2 py-3" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div style={grid} className="gap-x-1.5 gap-y-1 text-center">
        {/* 기둥 이름 — 일주는 "나" 라서 내가 어디인지 바로 보인다(타이트의 「일간(나)」와 같은 자리) */}
        {cols.map(({ p, r }, i) => (
          <span key={`pos-${i}`} className="font-myeongjo text-[11px]" style={{ color: p.isDay ? "var(--gold-bright)" : "var(--gold-soft)" }}>
            {r?.pos ?? "—"}
          </span>
        ))}
        {hasMeta &&
          cols.map(({ r }, i) => (
            <span key={`gs-${i}`} className="font-myeongjo text-[13px] text-bone-soft">{r?.ganSip || "—"}</span>
          ))}
        {cols.map(({ p }, i) => (
          <Glyph key={`g-${i}`} char={p.gan.char} element={p.gan.element} isDay={p.isDay} />
        ))}
        {cols.map(({ p }, i) => (
          <Glyph key={`j-${i}`} char={p.ji.char} element={p.ji.element} isDay={p.isDay} />
        ))}
        {/* 한글 읽기(갑술·기사·무오) — 11px bone-faint 는 표 안에서 가장 안 보이는 줄이었다.
            한자를 못 읽는 사람이 유일하게 붙잡는 줄이라 여기서 흐리면 표 전체가 그림이 된다.
            12px + 또렷한 색으로. (13 으로 올리면 아래 십성 줄과 위계가 뒤집힌다) */}
        {cols.map(({ p }, i) => (
          <span key={`r-${i}`} className="font-myeongjo text-[12px]" style={{ color: "rgba(215,206,188,0.86)" }}>
            {p.gan.read}
            {p.ji.read}
          </span>
        ))}
        {hasMeta &&
          cols.map(({ r }, i) => (
            <span key={`js-${i}`} className="font-myeongjo text-[13px] text-bone-soft">{r?.jiSip || "—"}</span>
          ))}
        {hasMeta && (
          <>
            {/* 구분선은 표 전체 폭으로 한 번만 — 기운은 글자가 아니라 그 자리의 세기라 성격이 다르다 */}
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--gold-pale)", marginTop: 4 }} />
            {cols.map(({ r }, i) => (
              <span key={`f-${i}`} className="font-myeongjo text-[13px]" style={{ color: "var(--gold-soft)" }}>
                {r?.fortune || "—"}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
