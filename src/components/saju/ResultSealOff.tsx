// 결과지 맺음 — 「기록 완료」 낙관.
//
// 왜 도장인가: 브랜드 이름이 命運**錄**(기록)이고, 로고 세트의 세 조각 중 낙관이 여기 자리를 맡는다
// (기획서 `design/brand/로고_기획_2026-08-23.md` §2). 손님 쪽에서 보면 **끝났다는 신호**이자
// 「적어 준 달이 오거든 다시 열어봐라」라는 재열람 씨앗의 마침표다.
//
// ⚠ 잠금(무료) 결과지엔 찍지 않는다 — 기록이 안 끝났는데 「기록 완료」는 거짓이고,
//    그 자리는 퍼널 결제 CTA 가 쓴다.
import { LogoSeal } from "@/components/brand/Logo";

type Tone = "night" | "ink" | "paper";

// 서버·클라가 같은 문자열을 만들어야 한다(hydration).
// `toLocaleDateString` 은 런타임 로케일·타임존을 타므로 쓰지 않고, KST 로 고정 변환해 직접 조립한다.
function kstDate(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const d = new Date(t + 9 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

export function ResultSealOff({ at, tone = "night" }: { at?: string | null; tone?: Tone }) {
  // 날짜가 없으면(데모·개발 미리보기) 문구만 — `new Date()` 를 쓰면 서버/클라 시각이 갈려 hydration 이 깨진다.
  const day = at ? kstDate(at) : "";
  const color = tone === "paper" ? "#5b4e3c" : tone === "ink" ? "rgba(243,234,214,0.5)" : "rgba(203,184,240,0.6)";
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "28px 20px 10px" }}
    >
      <LogoSeal size={56} />
      <div style={{ fontSize: 11, letterSpacing: ".08em", color }}>
        {day ? `${day} · ` : ""}명운록이 기록함
      </div>
    </div>
  );
}
