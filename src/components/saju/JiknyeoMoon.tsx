// 달 위상 한 벌 — 티저(JiknyeoForecast)·결과지 본문·달 카드가 **같은 그림**을 쓴다.
// 2026-08-24 분리: 결과지 인터루드(달 카드)가 같은 달을 그려야 하는데 JiknyeoResult 안에
// 갇혀 있어 순환 import 없이는 못 가져왔다. 모양이 갈리면 한 결과지 안에서 달이 두 종류가 된다.
import * as React from "react";

export type Phase = "full" | "half" | "cres" | "cloud";

/** 티저 달력의 등급 기호(●◎○△) → 달 위상 */
export const GRADE_TO_PHASE: Record<string, Phase> = {
  "●": "full",
  "◎": "half",
  "○": "cres",
  "△": "cloud",
};

/** 인연점수 → 달 위상. 달 카드는 등급 기호가 아니라 점수를 들고 오므로 여기서 환산한다.
 *  경계값은 티저 달력이 쓰는 등급 컷과 같은 감각으로 잡았다(높을수록 찬 달). */
export function phaseOfScore(score: number): Phase {
  if (score >= 20) return "full";
  if (score >= 10) return "half";
  if (score >= 0) return "cres";
  return "cloud";
}

export function Moon({ phase, size = 30 }: { phase: Phase; size?: number }) {
  const c = { width: size, height: size, viewBox: "0 0 74 74" } as const;
  if (phase === "full")
    return (
      <svg {...c} aria-hidden>
        <defs>
          <radialGradient id="jr-full">
            <stop offset="0%" stopColor="#FFFDF2" />
            <stop offset="100%" stopColor="#EFE3BE" />
          </radialGradient>
        </defs>
        <circle cx="37" cy="37" r="27" fill="url(#jr-full)" stroke="#C9A94E" strokeWidth="2.5" />
        <circle cx="30" cy="30" r="5" fill="#E4D6A8" opacity=".7" />
        <circle cx="45" cy="42" r="7" fill="#E4D6A8" opacity=".55" />
      </svg>
    );
  if (phase === "half")
    return (
      <svg {...c} aria-hidden>
        <circle cx="37" cy="37" r="27" fill="#FBF5E6" stroke="#C7AE72" strokeWidth="2.5" />
        <path d="M37 10a27 27 0 0 1 0 54z" fill="#DCC793" />
      </svg>
    );
  if (phase === "cres")
    return (
      <svg {...c} aria-hidden>
        <circle cx="37" cy="37" r="27" fill="#F2ECDD" stroke="#D5C9A9" strokeWidth="2.5" />
        <path d="M31 11a27 27 0 1 0 0 52 31 31 0 0 1 0-52z" fill="#FCFAFE" />
      </svg>
    );
  return (
    <svg {...c} aria-hidden>
      <circle cx="41" cy="30" r="21" fill="#EFECF6" stroke="#A9A2BE" strokeWidth="2.5" />
      <path d="M20 52h34a12 12 0 0 0 0-24 17 17 0 0 0-32 5 10 10 0 0 0-2 19z" fill="#8F87A8" />
    </svg>
  );
}
