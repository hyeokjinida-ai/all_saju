"use client";

// 걸어온 길 검증 — 결과지의 **유일한 인터랙션**. (2026-08-29 신설)
//
// 왜 만들었나: 결과지 실물을 폰 448 로 재 보니 **버튼이 0개**였다(34,447px 내내 읽기만 한다).
// 청월당은 선택·도장을, 타이트는 「열기」를 넣어 손을 쓰게 만든다 —
// 손님이 한 번 대답하면 그 순간 「읽는 사람」에서 「대답한 사람」이 되고,
// 자기가 맞다고 답한 예언은 자기 것이 된다. 판정 근거: `직녀_결과지_몰입_판정_2026-08-29.md`.
//
// 왜 여기냐: 앞 장에서 직녀가 **지나간 일**을 짚었다(pastEvents = 대운·세운 연도에서만 뽑는다).
// 미래는 검증이 안 되지만 과거는 손님이 그 자리에서 채점할 수 있다 — 신뢰를 만들 유일한 자리다.
//
// ⚠ 문구는 **생활어**로 쓴다([[myeongunrok-teaser-craft]] §8). 세계관 단어·한자를 넣지 않는다 —
//    "사주 모르는 손님이 1초 안에 뜻을 말할 수 있나"가 판정 기준이다.
import { useCallback, useEffect, useRef, useState } from "react";
import { LogoSeal } from "@/components/brand/Logo";
import { track } from "@/lib/analytics";

type Answer = "yes" | "no";

/** 답은 브라우저에만 남긴다(서버 저장 없음). 되돌아왔을 때 버튼이 초기화되면
 *  "내가 답한 적 없나?" 싶어져 몰입이 깨진다. 키는 결과지 주소별로 가른다. */
function storageKey(): string {
  try {
    return `pastcheck:${location.pathname}`;
  } catch {
    return "pastcheck:unknown";
  }
}

export function PastCheck({ who }: { who: string }) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [ready, setReady] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const seenRef = useRef(false);

  // 저장된 답 복원 — 렌더 중에 localStorage 를 읽으면 서버/클라 결과가 갈려 hydration 이 깨진다.
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey());
      if (v === "yes" || v === "no") setAnswer(v);
    } catch {
      /* 사생활 보호 모드 등 — 없으면 없는 대로 */
    }
    setReady(true);
  }, []);

  // 노출 계측은 **마운트가 아니라 스크롤 진입**에. 결과지가 34,000px 라
  // 마운트를 노출로 세면 탭률 분모가 통째로 거짓이 된다(판정선이 무의미해진다).
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || seenRef.current) continue;
          seenRef.current = true;
          track("past_check_view");
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pick = useCallback((v: Answer) => {
    setAnswer(v);
    try {
      localStorage.setItem(storageKey(), v);
    } catch {
      /* 저장 실패가 답을 막지 않는다 */
    }
    track("past_check_answer", { answer: v });
  }, []);

  const name = who ? `${who}님` : "손님";

  return (
    <div
      ref={boxRef}
      style={{
        marginTop: 18,
        borderRadius: 14,
        backgroundColor: "#FCFAF4",
        backgroundImage:
          "linear-gradient(rgba(255,253,248,.6), rgba(255,253,248,.6)), url(/products/jiknyeo/hanji.png)",
        backgroundSize: "auto, 360px 360px",
        border: "1px solid rgba(107,76,154,.22)",
        padding: "20px 20px 22px",
        boxShadow: "0 14px 34px rgba(10,8,26,.45)",
      }}
    >
      {/* 이 부품에서만 쓰는 규칙 — 공유 globals.css 를 건드리지 않는다(다른 세션과 겹치는 파일이다).
          ⚠ prefers-reduced-motion 에서는 **클래스 없는 선택자에도** 완성형을 걸어야 한다
          (그러지 않으면 모션 줄인 손님에게 답이 통째로 안 보인다 — 조판 규칙 §3 실측 사고). */}
      <style>{`
        .jk-pastbtn { transition: background-color .18s ease, border-color .18s ease; }
        .jk-pastbtn:focus-visible { outline: 3px solid #A98BD9; outline-offset: 2px; }
        .jk-pastans { animation: jkPastIn .55s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes jkPastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .jk-pastbtn { transition: none; }
          .jk-pastans { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <div
        className="font-myeongjo"
        style={{ fontSize: 13, letterSpacing: ".18em", color: "#8A82A2", textIndent: ".18em" }}
      >
        지나온 자리
      </div>
      <p
        className="font-myeongjo"
        style={{ marginTop: 10, fontSize: 17, lineHeight: 1.65, color: "#332C4A" }}
      >
        {name}, 방금 읽으신 지난 이야기 — 그때가 그랬나요?
      </p>

      {/* 답하기 전에만 버튼을 보인다. 답한 뒤에도 버튼이 남아 있으면 "다시 눌러야 하나" 싶어진다 */}
      {ready && !answer && (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={() => pick("yes")}
            className="font-myeongjo jk-pastbtn"
            style={{
              flex: 1,
              padding: "13px 8px",
              fontSize: 15,
              borderRadius: 12,
              cursor: "pointer",
              background: "#3A2F55",
              color: "#F3ECFF",
              border: "1.5px solid #3A2F55",
            }}
          >
            맞아요, 그랬어요
          </button>
          <button
            type="button"
            onClick={() => pick("no")}
            className="font-myeongjo jk-pastbtn"
            style={{
              flex: 1,
              padding: "13px 8px",
              fontSize: 15,
              borderRadius: 12,
              cursor: "pointer",
              background: "transparent",
              color: "#5C5474",
              border: "1.5px solid #CFC5E4",
            }}
          >
            잘 모르겠어요
          </button>
        </div>
      )}

      {/* 답한 뒤 — 직녀가 받아 준다. 「맞아요」에만 낙관을 찍는다(검증이 끝난 자리라서) */}
      {answer === "yes" && (
        <div
          className="jk-pastans"
          style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}
        >
          <p className="font-myeongjo" style={{ flex: 1, fontSize: 17, lineHeight: 1.65, color: "#332C4A" }}>
            그럼 앞으로 적어 드린 달도 믿으셔도 돼요.<br />
            같은 손으로 짚은 거니까요.
          </p>
          <div style={{ flex: "none", textAlign: "center" }}>
            <LogoSeal size={46} />
            <div style={{ marginTop: 3, fontSize: 10, letterSpacing: ".16em", color: "#9A6B62", textIndent: ".16em" }}>
              맞춰 봄
            </div>
          </div>
        </div>
      )}
      {answer === "no" && (
        <p
          className="font-myeongjo jk-pastans"
          style={{ marginTop: 16, fontSize: 17, lineHeight: 1.65, color: "#332C4A" }}
        >
          괜찮아요. 지난 일은 흐릿할 수 있어요.<br />
          앞으로 올 달은 또렷하게 짚어 드릴게요.
        </p>
      )}
    </div>
  );
}
