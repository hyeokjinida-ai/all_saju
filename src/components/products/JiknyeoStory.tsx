"use client";

// 직녀 몰입 랜딩 — 게이트 → 웹툰 스토리 4씬 → 입력(위저드).
//
// 산군(SangunWebtoon)의 스테이지 구조를 그대로 따르되 세계관만 갈아끼운다.
// 왜 문서형(InyeonWebtoon)이 아니라 이 구조인가: 경쟁사(청월당) 캐릭터 랜딩 두 개를 판독한 결론이
// **랜딩 = 웹툰 한 편, 오퍼는 뒤로**였다. 가격·목차·스펙을 앞에 깔면 세일즈 페이지가 되고,
// 그 순간 「이야기를 보러 온 사람」이 「값을 재는 사람」으로 바뀐다.
//
// 그림은 전부 **슬롯**이다(public/products/jiknyeo/). 파일이 없으면 라벨 패널로 서고,
// 넣는 순간 그 자리가 켜진다 — 그래서 그림이 0장인 지금도 대사·배치를 확정할 수 있다.
import React, { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { SlotCut, Narration } from "@/components/products/jiknyeo-ui";
import type { AssetMap } from "@/lib/jiknyeo-slots";

/** 만화 말풍선 — 청월당 실측 문법(흰 박스 + 명패). 티저(SajuWizard)의 ComicSay 와 같은 옷이다. */
function Say({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-[18px] px-5 py-4" style={{ background: "#ffffff", boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}>
      <span
        className="font-myeongjo absolute -top-3 left-4 rounded-[3px] px-2.5 py-0.5 text-[11px] font-bold tracking-[0.22em]"
        style={{ background: "var(--gold-bright)", color: "#1a1330" }}
      >
        직녀
      </span>
      <p className="font-myeongjo text-[17px] font-bold leading-[1.75]" style={{ color: "#1a1330" }}>
        {children}
      </p>
    </div>
  );
}

/** 스토리 4씬 — 컷 대사는 public/products/jiknyeo/README.md 의 확정 카피(w1~w7)를 그대로 쓴다. */
const SCENES: { id: Parameters<typeof SlotCut>[0]["id"]; narration?: React.ReactNode; say?: React.ReactNode }[] = [
  { id: "w1", narration: <>일 년에 하루만, 만날 수 있었던 여자가 있어요.</> },
  {
    id: "w2",
    narration: <>만나는 날을 알고 있었어요.</>,
    say: <>날을 세며, 기다렸거든요.<br />그래서 한 번도 놓치지 않았어요.</>,
  },
  {
    id: "w4",
    narration: <>까치가 다리를 놓는 날 — 일 년에 단 하루.</>,
    say: <>당신에게도 그런 날이 와요.<br />올해도, 몇 번.</>,
  },
  {
    id: "w7",
    narration: <>몰라서 지나갔을 뿐이에요.</>,
    say: <>이번엔 알고 만나요.<br />몇 월인지, 알려드릴게요.</>,
  },
];

export function JiknyeoStory({
  wizard,
  assets,
  initialStage,
}: {
  wizard: React.ReactNode;
  assets?: AssetMap;
  /** "input" = ?demo= (게이트·스토리 건너뛰고 티저 확인) · "main" 은 문서형이 따로 있어 쓰지 않는다 */
  initialStage?: "main" | "input";
}) {
  const [stage, setStage] = useState<"gate" | "story" | "input">(initialStage === "input" ? "input" : "gate");
  const [scene, setScene] = useState(0);
  const viewed = useRef(false);

  // 게이트를 벗어나는 모든 경로에서 한 번만 — 게이트 이탈과 본문 이탈을 가르는 유일한 지점이다.
  useEffect(() => {
    if (stage === "gate" || viewed.current) return;
    viewed.current = true;
    track("product_view", { slug: "inyeon-saju" });
  }, [stage]);

  // 로그인 왕복 복귀 — 위저드 초안이 남아 있으면 이야기를 다시 태우지 않는다.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("myeongunrok:order-wizard-draft");
      if (raw && (JSON.parse(raw) as { slug?: string })?.slug === "inyeon-saju") setStage("input");
    } catch {
      /* 무시 */
    }
  }, []);

  const toInput = () => {
    setStage("input");
    setTimeout(() => window.scrollTo(0, 0), 0);
  };

  // ── 게이트 ──
  // ⚠ 여기에 헤드라인·가격·목차를 얹지 않는다(산군 게이트와 같은 금기).
  //    문장이 늘어나는 순간 문이 뒤로 밀리고 세일즈 페이지가 된다.
  if (stage === "gate") {
    return (
      <div className="world-jiknyeo relative min-h-screen w-full overflow-hidden" style={{ background: "#0b0f1a" }}>
        <div className="absolute inset-0">
          <SlotCut id="j3" assets={assets} ratio="9 / 16" pos="center 30%" priority />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(11,15,26,0.82) 0%, rgba(11,15,26,0.14) 38%, rgba(11,15,26,0.2) 58%, rgba(11,15,26,0.92) 100%)",
          }}
        />
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[520px] flex-col items-center justify-end px-6 pb-14">
          <p className="font-gothic text-center text-[13px] font-bold tracking-[0.2em]" style={{ color: "var(--bone-faint)" }}>
            만날 사람은 있어요
          </p>
          <p
            className="font-gothic text-moonlit mt-3 text-center text-[34px] leading-[1.3] tracking-[-0.02em]"
            style={{ fontWeight: 900 }}
          >
            몇 월인지가
            <br />
            문제죠
          </p>
          <button
            type="button"
            onClick={() => setStage("story")}
            className="mt-9 w-full min-h-[56px] border-none text-[17px] font-bold tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-serif-kr), serif",
              background: "linear-gradient(180deg,#efeaf6,#d9c7e8)",
              color: "#1a1330",
              boxShadow: "0 8px 26px rgba(217,199,232,0.3)",
            }}
          >
            달력 펴러 들어가기
          </button>
        </div>
      </div>
    );
  }

  // ── 스토리 ──
  if (stage === "story") {
    const s = SCENES[scene];
    const last = scene === SCENES.length - 1;
    return (
      <div className="world-jiknyeo relative min-h-screen w-full overflow-hidden" style={{ background: "#0b0f1a" }}>
        {/* key 로 씬을 통째로 갈아 끼운다 — .svc-fade 가 전환을 맡는다(산군과 같은 방식) */}
        <div key={scene} className="svc-fade absolute inset-0">
          <SlotCut id={s.id} assets={assets} ratio="9 / 16" pos="center 26%" />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(11,15,26,0.7) 0%, rgba(11,15,26,0.16) 34%, rgba(11,15,26,0.3) 56%, rgba(11,15,26,0.95) 100%)",
          }}
        />
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[520px] flex-col justify-end px-6 pb-12">
          {/* 나레이션(사각 박스)과 캐릭터 대사(말풍선)를 눈으로 구분되게 둔다 — 청월당도 이 둘을 분리한다 */}
          {s.narration && <Narration>{s.narration}</Narration>}
          {s.say && <div className="mt-3">
            <Say>{s.say}</Say>
          </div>}
          <button
            type="button"
            onClick={() => (last ? toInput() : setScene((n) => n + 1))}
            className="mt-8 w-full min-h-[56px] border-none text-[17px] font-bold tracking-[0.15em]"
            style={
              last
                ? {
                    fontFamily: "var(--font-serif-kr), serif",
                    background: "linear-gradient(180deg,#efeaf6,#d9c7e8)",
                    color: "#1a1330",
                    boxShadow: "0 8px 26px rgba(217,199,232,0.3)",
                  }
                : {
                    fontFamily: "var(--font-serif-kr), serif",
                    background: "rgba(217,199,232,0.12)",
                    color: "var(--bone)",
                    border: "1px solid var(--gold-line)",
                  }
            }
          >
            {last ? "내 달력 펴 보기" : "다음"}
          </button>
          {/* 스토리를 건너뛰는 문 — 이야기를 강제하면 값을 재러 온 손님이 갇힌다 */}
          {!last && (
            <button
              type="button"
              onClick={toInput}
              className="font-myeongjo mt-2.5 w-full py-2 text-[13px] tracking-[0.15em]"
              style={{ color: "var(--bone-faint)" }}
            >
              바로 시작할게
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── 입력 ──
  // 되돌아가기 버튼을 두지 않는다: 누르면 위저드가 언마운트되어 입력이 통째로 사라진다(산군 실측).
  return (
    <div className="world-jiknyeo story-immersive relative w-full" style={{ background: "#0b0f1a" }}>
      <div className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-[560px] items-center justify-center px-5 pt-4">
        <a href="/" className="font-myeongjo text-[13px] tracking-[0.22em]" style={{ color: "var(--gold-bright)" }}>
          명운록 · 직녀의 연애예보
        </a>
      </div>
      {/* Fragment 로 감싸 키를 준다 — 위저드 엘리먼트는 page.tsx 에서 만들어져 내려오는데,
          그대로 두면 React 가 이 자리를 리스트로 보고 key 경고를 낸다(실측). */}
      <React.Fragment key="wizard">{wizard}</React.Fragment>
    </div>
  );
}
