"use client";

// 견우(재회) 티저 델타 5블록 — 2026-09-02 신설.
//
// 티저 뼈대(밝은 달빛 판·원국 증거·콜드리딩·구매 카드·잠금 줄)는 직녀판을 그대로 쓰고,
// **재회 전용 다섯 블록만 여기서 갈아 끼운다**(기획서 §6):
//   T1 오프닝 달력 · T2 이별 무렵 채점 · T3 연적 · T4 환승 · T5 반전 절단
//
// 규칙 셋(어기면 상품이 무너진다):
//  ① 값은 전부 `teaser.reunion`(=computeReunionFacts)에서만 온다. 여기서 새로 세지 않는다 —
//     티저가 「먼저 연락하면 안 되는 달」이라 한 달을 결과지가 다르게 부르면 그 자리에서 끝난다.
//  ② 잠긴 칸의 종류(kind)는 **글자로도 그림으로도** 쓰지 않는다. 달 그림을 그리면 범례로 읽혀
//     잠금이 풀린 것과 같다 — 잠긴 칸은 가림 바 하나만 둔다.
//  ③ 말은 견우다: 담백한 존댓말(~합니다/~요). 재촉·압박·느끼한 말 금지, 분량 앵커 금지.
//
// ⚠ 직녀 그림(InyeonCut·SlotCut·SD 캐릭터)은 이 파일에서 한 장도 안 쓴다.
//    화자가 다른데 직녀 얼굴이 나오면 그게 제일 큰 사고다. 견우 컷은 별도 발주 — 그때 슬롯만 채운다.
import { useState } from "react";
import { track } from "@/lib/analytics";
import {
  BrushHead,
  Cap,
  HanjiCard,
  OpenMonthCard,
  T,
  TocChapter,
  INK,
  BODY,
  LINE,
  MUTE,
  PINK,
} from "@/components/products/jiknyeo-teaser-kit";
import { NeonMask } from "@/components/products/jiknyeo-ui";
import { Moon } from "@/components/products/JiknyeoForecast";
import type { SajuTeaser } from "@/lib/saju/teaser";

type Reunion = NonNullable<SajuTeaser["reunion"]>;

/** 호칭 — 이름을 받았으면 「○○님」, 아니면 「손님」. 한 파일 안에서 말이 갈리지 않게 여기 하나만 둔다. */
const callMe = (name: string) => (name ? `${name}님` : "손님");

/** 가려 둔 값 — ▓ 글리프를 그대로 찍으면 자리표시자로 읽힌다(산군 InkMask 와 같은 판단).
 *  견우는 밤·강의 색이라 먹붉은 산군 자국 대신 **은청 가림 바**를 쓴다.
 *  단위 글자(월·년)는 남긴다 — 「달까지 적혀 있는데 가려져 있다」가 눈에 보여야 한다. */
function MaskWord({ text, tone = "dark" }: { text: string; tone?: "dark" | "light" }) {
  const parts = text.match(/▓+|[^▓]+/g) ?? [];
  return (
    <span className="inline-flex items-center gap-[0.16em] whitespace-nowrap align-middle">
      {parts.map((p, i) =>
        p.startsWith("▓") ? (
          <span
            key={i}
            aria-hidden
            className="inline-block align-middle"
            style={{
              width: `${Math.max(1.5, p.length * 0.72)}em`,
              height: "0.98em",
              borderRadius: 3,
              background:
                tone === "dark"
                  ? "linear-gradient(97deg,#2b3350,#3d4a72 40%,#232a44)"
                  : "linear-gradient(97deg,#cfd6e6,#b9c2da 45%,#cfd6e6)",
              boxShadow: tone === "dark" ? "inset 0 1px 3px rgba(0,0,0,0.55)" : "inset 0 1px 2px rgba(0,0,0,0.18)",
            }}
          />
        ) : (
          <span key={i} style={{ color: "inherit" }}>
            {p}
          </span>
        ),
      )}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────
   T1 — 오프닝 달력
   「언제」를 파는 상품이라 첫 화면이 달력이다(청월당 재회 티저도 달력 3장으로 연다).
   열두 칸을 다 세워 계산을 보여주되, 종류는 **한 칸만** 연다.
   여는 칸은 「먼저 연락하면 안 되는 달」 — 손님이 오늘 밤 하려던 일을 한 번 멈추게 만든다.
   ───────────────────────────────────────────────────────── */
export function ReunionCalendar({ data, name }: { data: Reunion; name: string }) {
  const cal = data.calendar;
  if (cal.length === 0) return null;
  const openKey = data.revealed ? `${data.revealed.year}-${data.revealed.month}` : "";

  return (
    <section>
      <T>앞으로 열두 달</T>
      <div className="mt-2">
        <BrushHead lines={["열두 칸을 다 세워 두었습니다"]} />
      </div>
      <p className="mt-3 text-center text-[16px] leading-[24px]" style={{ color: BODY }}>
        칸은 다 보여드립니다. 이름은 한 칸만 먼저 엽니다.
      </p>

      <div className="mt-6 grid grid-cols-4 gap-2">
        {cal.map((c) => {
          const open = `${c.year}-${c.month}` === openKey;
          return (
            <div
              key={`${c.year}-${c.month}`}
              className="rounded-[9px] px-1 py-2 text-center"
              style={
                open
                  ? { background: "#ffffff", border: `2px solid ${PINK}`, boxShadow: "0 4px 12px rgba(107,76,154,.22)" }
                  : { background: "rgba(255,255,255,0.42)", border: `1px solid ${LINE}` }
              }
            >
              <p className="text-[12px] font-bold" style={{ color: open ? PINK : MUTE }}>
                {c.month}월
              </p>
              <div className="mt-1.5 flex justify-center">
                {open ? (
                  // 열린 칸에만 달을 그린다. 잠긴 칸에 달을 그리면 범례로 읽혀 잠금이 풀린다.
                  <Moon phase="cloud" size={30} />
                ) : (
                  <span
                    aria-label="아직 덮어 둔 칸"
                    className="inline-block"
                    style={{
                      width: 30,
                      height: 10,
                      borderRadius: 3,
                      background: "linear-gradient(90deg, rgba(126,118,152,0.30), rgba(126,118,152,0.16))",
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[13px] leading-[20px]" style={{ color: MUTE, letterSpacing: "normal" }}>
        열두 칸 가운데 {data.lockedCount}칸은 아직 덮어 두었습니다
      </p>

      {data.revealed ? (
        <OpenMonthCard
          year={data.revealed.year}
          month={data.revealed.month}
          desc="먼저 연락하면 안 되는 달입니다"
          note={`그 달 흐름 — ${data.revealed.desc}. 이 달에 보낸 연락은 반대로 갑니다.`}
          moon={<Moon phase="cloud" size={30} />}
          locks={[
            ...Array.from({ length: Math.min(2, data.reconnectCount) }, () => ({ label: "다리가 놓이는 달" })),
            ...Array.from({ length: Math.min(1, data.contactOkCount) }, () => ({ label: "연락해도 되는 달" })),
          ]}
        />
      ) : (
        <p className="mt-6 text-center text-[15px] leading-[24px]" style={{ color: INK, fontWeight: 700 }}>
          {callMe(name)} 달력에는 먼저 연락하면 안 되는 달이 없습니다. 그것도 답입니다.
        </p>
      )}

      <p className="mt-5 text-center text-[15px] leading-[24px]" style={{ color: BODY }}>
        다리가 놓이는 달 {data.reconnectCount} · 연락해도 되는 달 {data.contactOkCount} —
        <br />
        달 이름은 결과지에서 엽니다.
      </p>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   T2 — 이별 무렵 채점
   과거 검증의 재회판. 미래는 채점이 안 되지만 **이미 살아 본 그 달**은 손님이 그 자리에서 맞다·아니다를
   말할 수 있다. 답을 받은 뒤에 죄책감 해제로 넘어간다(3사 공통 3단: 네 탓 아님 → 원인은 흐름 → 여기서 끝내라).
   ⚠ 꺾여 있지 않았으면 꺾였다고 하지 않는다 — facts.bent 가 그대로 문장을 가른다.
   ───────────────────────────────────────────────────────── */
export function ReunionBreakupCheck({ data, name }: { data: Reunion; name: string }) {
  const b = data.breakupCheck;
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  if (!b) return null;

  const pick = (v: "yes" | "no") => {
    setAnswer(v);
    track("reunion_breakup_answer", { answer: v });
  };

  return (
    <section className="mt-14">
      <T>강이 갈라지던 무렵</T>
      <div className="mt-2">
        <BrushHead lines={[`${b.year}년${b.month ? ` ${b.month}월` : ""}, 그 무렵 흐름`]} />
      </div>

      <div
        className="mt-5 bg-white px-5 py-5"
        style={{ borderRadius: 14, border: `1px solid ${LINE}`, boxShadow: "0 10px 26px rgba(20,12,40,0.10)" }}
      >
        <p className="text-[17px] leading-[27px]" style={{ color: INK, fontWeight: 700 }}>
          {b.line}
        </p>
        {b.marks.length > 1 && (
          <ul className="mt-3 space-y-1.5">
            {b.marks.slice(1, 3).map((m) => (
              <li key={m} className="flex items-start gap-2 text-[15px] leading-[23px]" style={{ color: BODY }}>
                <span className="shrink-0" style={{ color: PINK }}>
                  ·
                </span>
                {m}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 border-t pt-4" style={{ borderColor: "#EFE9F8" }}>
          {answer === null ? (
            <>
              <p className="text-center text-[15px] leading-[23px]" style={{ color: BODY }}>
                그 무렵, 이랬습니까?
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {(
                  [
                    ["yes", "맞아요"],
                    ["no", "아니에요"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => pick(v)}
                    className="min-h-[48px] text-[15px]"
                    style={{ border: `1px solid ${PINK}55`, borderRadius: 10, color: INK, fontWeight: 700, background: "#fff" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[16px] leading-[26px]" style={{ color: INK }}>
              {answer === "yes"
                ? b.bent
                  ? `그러면 그날 갈라진 건 ${callMe(name)}이 모자라서가 아닙니다. 두 사람 흐름이 그 달에 같이 꺾여 있었습니다. 자책은 여기서 끝내셔도 됩니다.`
                  : `흐름이 꺾여 있진 않았습니다. 그러니 흐름 탓으로 덮지 않고, 무엇이 어긋났는지를 결과지에서 정면으로 짚어 드립니다.`
                : `아니라면 그것도 답입니다. 흐름으로 덮지 않고, 두 분 사이에서 어긋난 자리를 결과지에서 그대로 짚습니다.`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   T3 — 연적
   청월당 실측 최강 구간(「그 사람 옆에 다른 사람이 보이는데?」)의 우리 판.
   외모·직업은 안 그린다 — **행동 패턴**만 그린다. 문장은 확정값(rival.lines) 그대로 쓴다.
   근거가 상대 명식인지 내 흐름인지는 아래 한 줄로 밝힌다(우리는 계산을 파는 쪽이다).
   ───────────────────────────────────────────────────────── */
export function ReunionRival({ data }: { data: Reunion }) {
  const r = data.rival;
  if (!r || r.lines.length === 0) return null;
  return (
    <section className="mt-14">
      <T>그 사람 옆자리</T>
      <div className="mt-2">
        <BrushHead lines={["비어 있는지부터 봤습니다"]} />
      </div>
      <div
        className="mt-5 px-5 py-5"
        style={{ background: "rgba(255,255,255,0.62)", borderRadius: 14, border: `1px solid ${LINE}` }}
      >
        {r.lines.map((line, i) => (
          <p
            key={i}
            className={`text-[16px] leading-[26px] ${i > 0 ? "mt-3" : ""}`}
            style={i === r.lines.length - 1 ? { color: INK, fontWeight: 700 } : { color: BODY }}
          >
            {line}
          </p>
        ))}
      </div>
      <div className="mt-2">
        <Cap>
          {r.basis === "상대"
            ? "그 사람 생년월일로 그쪽 흐름까지 같이 읽은 자리예요"
            : "그 사람 생년월일이 없어 곁자리 흐름으로 읽은 자리예요"}
        </Cap>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   T4 — 환승(강을 건너지 않는다면)
   재회가 안 될 손님에게도 유효한 결과지가 있다는 것을 **반 발만** 보여준다(결과지 9장 예고).
   결·나이대까지만 열고 「처음 마주치는 자리」는 잠근다 — 다 열면 9장이 안 팔린다.
   ───────────────────────────────────────────────────────── */
export function ReunionMoveOn({ data }: { data: Reunion }) {
  const m = data.moveOn;
  if (!m) return null;
  return (
    <section className="mt-14">
      <T>강을 건너지 않는다면</T>
      <div className="mt-2">
        <BrushHead lines={["다음 사람도 같은 장부에 있습니다"]} />
      </div>
      <div
        className="mt-5 overflow-hidden bg-white"
        style={{ borderRadius: 14, border: `1px solid ${LINE}`, boxShadow: "0 10px 26px rgba(20,12,40,0.10)" }}
      >
        {[
          ["어떤 결", m.nature],
          ["첫인상", m.look],
          ["나이대", m.ageDir],
        ].map(([k, v], i) => (
          <div
            key={k}
            className="flex gap-3 px-4 py-3"
            style={{ background: i % 2 ? "rgba(255,255,255,0.5)" : "transparent", borderTop: i ? `1px solid ${LINE}` : undefined }}
          >
            <span className="w-[68px] flex-none text-[13px]" style={{ color: PINK, fontWeight: 700 }}>
              {k}
            </span>
            <span className="flex-1 text-[15px] leading-[23px]" style={{ color: INK }}>
              {v}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderTop: `1px solid ${LINE}` }}>
          <span className="w-[68px] flex-none text-[13px]" style={{ color: PINK, fontWeight: 700 }}>
            만나는 자리
          </span>
          <NeonMask text="○○○○○○" scribble={false} />
        </div>
      </div>
      {/* ⚠ 「크게 바뀌는 해」는 여기서 말하지 않는다 — 바로 아래 붓 동그라미 카드가 같은 해를 크게 쓴다.
          여기에 한 줄 더 두면 같은 숫자를 2초 안에 두 번 읽힌다(운영 실측에서 잡힌 중복). */}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   T5 — 반전 절단
   흰 판으로 읽어 오다 **검정 판 흰 글자**로 한 번 뒤집고 끊는다(카카오웹툰 회차 마지막 대사 문법).
   ⚠ 한 판에 딱 한 번. 재회 티저에서 반전은 여기 하나뿐이다 — 두 번 쓰면 절단이 사라진다.
   ───────────────────────────────────────────────────────── */
export function ReunionCut({ data }: { data: Reunion }) {
  const c = data.cut;
  if (!c) return null;
  return (
    // 정점 앞 큰 숨 — 앞 블록에 붙여 두면 절단이 앞 카드의 각주로 읽힌다(칠흑 여백 눈금 56).
    <section className="mt-14">
      <div
        className="relative px-5 pb-6 pt-7"
        style={{
          background: "linear-gradient(180deg,#14121f,#08070c)",
          borderRadius: 6,
          border: "1px solid rgba(207,214,230,0.35)",
          boxShadow: "0 12px 34px rgba(0,0,0,0.55)",
        }}
      >
        <span
          className="absolute -top-2.5 right-4 rounded-[2px] px-2 pb-[2px] pt-[3px] text-[11px] font-semibold tracking-[0.22em]"
          style={{ background: "#cfd6e6", color: "#14121f" }}
        >
          견우
        </span>
        <p className="font-myeongjo text-[19px] leading-[1.75]" style={{ color: "#f3f0ea", fontWeight: 600 }}>
          {c.lead} <MaskWord text={c.mask} />.
          <br />
          <span style={{ color: "rgba(243,240,234,0.72)" }}>…{c.tail}</span>
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   목차 — 결과지 10장과 1:1. 잠글 것은 값이지 목차가 아니다(청월당 전량 공개 방식).
   ⚠ prompt.ts 의 reunion-saju outline 열 장과 순서·개수를 맞춘다. 여기 없는 걸 적으면 그게 거짓말이 된다.
   ───────────────────────────────────────────────────────── */
const TOC_REUNION: { title: string; items: string[] }[] = [
  { title: "1장. 두 사람의 별", items: ["내가 사랑할 때 하는 것", "그 사람과 어긋나던 자리"] },
  { title: "2장. 강이 갈라진 날", items: ["그 무렵 흐름은 어땠는지", "그래서 왜 내 탓이 아닌지"] },
  { title: "3장. 그 사람의 지금", items: ["연락 없는 동안 그 사람이 하는 것", "마음이 식었을 때 나오는 행동"] },
  { title: "4장. 아직 이어져 있는 것", items: ["재회 가능성 — 높음·보통·낮음", "적어 보내신 물음에 대한 답"] },
  { title: "5장. 다리가 놓이는 달", items: ["열두 달 중 다시 이어지는 달", "그 달에 미리 해 둘 준비"] },
  { title: "6장. 연락의 달", items: ["연락해도 되는 달", "먼저 연락하면 안 되는 달", "보낼 첫 줄과 묻지 말 것"] },
  { title: "7장. 하면 안 되는 것", items: ["매달릴 때 되풀이되는 행동 셋", "대신 할 행동"] },
  { title: "8장. 다시 보고 싶은 사람으로", items: ["내 쪽에서 바꾸는 것 셋", "이번 달 안에 되는 것으로"] },
  { title: "9장. 강을 건너지 않는다면", items: ["그 사람이 아니어도 되는 이유", "다음에 올 사람의 결과 나이대"] },
  { title: "10장. 견우의 배웅", items: ["이번 주에 할 것 셋", "가장 가까운 연락의 달에 맞춰"] },
];

export function ReunionToc() {
  return (
    <section className="mt-14">
      <T>받으시는 것</T>
      <div className="mt-2">
        <BrushHead lines={["열 장을 다 펴서 보여드립니다"]} accent={0} />
      </div>
      <div className="mt-7">
        <HanjiCard>
          <div
            className="bg-white px-3 py-2.5 text-center text-[13px]"
            style={{ border: `1px solid ${LINE}`, color: INK, fontWeight: 700 }}
          >
            *전체 풀이 내용이에요. 결제하시면 이 열 장이 다 열립니다.
          </div>
          {TOC_REUNION.map((c, i) => (
            <div key={c.title} className={i > 0 ? "mt-10" : "mt-5"}>
              <TocChapter title={c.title} items={c.items} />
            </div>
          ))}
        </HanjiCard>
      </div>
      <div className="mt-4">
        <Cap>마이페이지에 계속 보관돼요 · 언제든 다시 열어볼 수 있어요</Cap>
      </div>
    </section>
  );
}
