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
import { StoryFooter } from "@/components/products/StoryFooter";
import type { AssetMap } from "@/lib/jiknyeo-slots";

/** 만화 말풍선 — 청월당 실측 문법(흰 박스 + 명패). 티저(SajuWizard)의 ComicSay 와 같은 옷이다. */
function Say({ children }: { children: React.ReactNode }) {
  return (
    // 청월당 실측 문법: 말풍선은 화면 폭을 다 먹지 않고 **꼬리로 인물에 붙는다.**
    // 폭을 88% 로 묶고 아래쪽에 꼬리를 달아 "누가 하는 말인지"를 위치로 말한다.
    <div className="relative mr-auto w-[90%] rounded-[18px] px-5 py-4" style={{ background: "#ffffff", boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}>
      {/* 꼬리 — 왼쪽 아래. 오른쪽 정렬이면 인물 없는 컷(까치 떼)에서 꼬리가 허공을 가리킨다 */}
      <span
        aria-hidden
        className="absolute -bottom-2 left-7 block h-4 w-4 rotate-45"
        style={{ background: "#ffffff" }}
      />
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

  // QA 딥링크 — `?scene=2` 로 스토리 특정 씬을 바로 연다(배치 검수용).
  // ⚠ useState 초기값으로 읽으면 서버(파라미터 모름)와 클라이언트가 달라져 hydration 이 깨진다.
  //    반드시 **마운트 후** effect 에서 적용한다. 파라미터가 없으면 동작은 그대로다.
  useEffect(() => {
    // ⚠ raw 를 먼저 null 검사한다. Number(null) === 0 이라, 그냥 Number() 로 감싸면
    //    파라미터가 **없을 때도** 0 이 되어 게이트를 건너뛰고 스토리로 점프한다
    //    (2026-08-23 실측: 이 버그로 게이트가 통째로 사라진 채 배포됐다).
    const raw = new URLSearchParams(window.location.search).get("scene");
    if (raw === null || raw === "") return;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0 && n < SCENES.length) {
      setScene(n);
      setStage("story");
    }
  }, []);
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
          <SlotCut id="j3" assets={assets} ratio="9 / 16" pos="center 22%" priority />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              // 하단 34% 를 글 띠로 못 박는다 — 그 위로는 그림을 최대한 열어 둔다.
              // 형님 폰 실측: 헤드라인이 직녀 몸에 얹혀 글도 그림도 죽었다.
              "linear-gradient(180deg, rgba(11,15,26,0.72) 0%, rgba(11,15,26,0.06) 26%, rgba(11,15,26,0.10) 48%, rgba(11,15,26,0.70) 66%, rgba(11,15,26,0.96) 82%, rgba(11,15,26,0.99) 100%)",
          }}
        />
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[520px] flex-col items-center justify-end px-6 pb-14">
          <p className="font-gothic whitespace-nowrap text-center text-[13px] font-bold tracking-[0.2em]" style={{ color: "var(--bone-faint)" }}>
            만날 사람은 있어요
          </p>
          {/* 손실회피 훅(2026-08-23 형님 지시). 「놓치지 마세요」 같은 경고는 방어를 부르지만,
              「이미 지나쳤을지도」는 **의심**이라 확인하러 들어가게 만든다.
              ⚠ 이 문장은 약속이 아니라 질문이므로 퍼널이 답을 줘야 끝난다:
                 설화 w7「몰라서 지나갔을 뿐이에요 / 이번엔 알고 만나요」가 면책으로 받고,
                 페이월이 「올해 남은 보름 N번」이라는 실제 계산값으로 닫는다.
              ⚠ 과거 달 등급은 못 보여준다 — 만세력 API 가 currentWeolun/nextWeolun/upcoming 만 준다(전부 미래).
                 그래서 버튼은 「달력 펴러 들어가기」를 유지한다. 「지나간 달 확인하기」는 거짓이 된다.

              헤드라인은 **어절 단위로 내가 끊는다.** 브라우저에 맡기면 폰 글자배율(카톡 「가가」)에서
              「몇 월 / 인지가 / 문제죠」로 부서진다(형님 폰 실측). clamp 로 좁은 폭·큰 배율에서도
              두 줄을 유지하고, nowrap 으로 각 줄 안에서는 절대 안 쪼개지게 못 박는다. */}
          <p
            className="font-gothic text-moonlit headline-kr mt-3 text-center leading-[1.28] tracking-[-0.02em]"
            style={{ fontWeight: 900, fontSize: "clamp(26px, 8.2vw, 34px)" }}
          >
            <span className="block whitespace-nowrap">이미 한 번,</span>
            <span className="block whitespace-nowrap">지나쳤을지도…</span>
          </p>
          <button
            type="button"
            onClick={() => setStage("story")}
            className="mt-9 w-full min-h-[56px] whitespace-nowrap border-none text-[17px] font-bold tracking-[0.15em]"
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
              "linear-gradient(180deg, rgba(11,15,26,0.62) 0%, rgba(11,15,26,0.06) 30%, rgba(11,15,26,0.14) 52%, rgba(11,15,26,0.86) 82%, rgba(11,15,26,0.97) 100%)",
          }}
        />
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[520px] flex-col justify-end px-5 pb-9">
          {/* 나레이션(사각 박스)과 캐릭터 대사(말풍선)를 눈으로 구분되게 둔다 — 청월당도 이 둘을 분리한다 */}
          {/* 나레이션은 **박스를 두르지 않는다.** 박스+말풍선+버튼+스킵이 4단으로 쌓이면
              화면 하단 절반이 막혀 그림(까치 떼·은하수)이 글 뒤로 사라진다 — 형님 폰 실측.
              청월당도 나레이션은 맨글, 말풍선만 흰 판이다. 대신 글 그림자로 가독을 잡는다. */}
          {s.narration && (
            <p
              className="font-myeongjo text-[17px] leading-[1.7]"
              style={{ color: "#e8e6ef", textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 26px rgba(0,0,0,0.75)" }}
            >
              {s.narration}
            </p>
          )}
          {s.say && <div className="mt-3.5">
            <Say>{s.say}</Say>
          </div>}
          <button
            type="button"
            onClick={() => (last ? toInput() : setScene((n) => n + 1))}
            className="mt-8 w-full min-h-[56px] whitespace-nowrap border-none text-[17px] font-bold tracking-[0.15em]"
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
        </div>

        {/* 스토리를 건너뛰는 문 — 이야기를 강제하면 값을 재러 온 손님이 갇힌다.
            하단 스택에 두면 글이 한 단 더 쌓여 그림을 먹는다 → 우상단으로 뺐다. */}
        {!last && (
          <button
            type="button"
            onClick={toInput}
            className="font-myeongjo absolute right-4 top-4 z-20 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] tracking-[0.12em]"
            style={{ color: "var(--bone-faint)", background: "rgba(11,15,26,0.55)", border: "1px solid var(--gold-line)" }}
          >
            바로 시작할게
          </button>
        )}
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

      {/* 법정 표기 — 2026-08-30 신설.
          ChromeGate 가 `/products/inyeon-saju` 를 bare 로 두어 사이트 푸터가 안 붙는데,
          여기(무대)가 자체 푸터를 안 그리고 있었다. **결과: 착지·입력·티저·결제 시트 전 구간에
          사업자 정보·약관·개인정보·환불정책이 하나도 없었다**(운영 실측: 티저 257블록 전수 검색에서
          「환불」 0건 · 「사업자」 0건). 산군·돈·인연 구판은 셋 다 StoryFooter 를 그린다 — 직녀만 빠져 있었다.
          같은 푸터가 가평한석봉 라이선스의 출처 표기도 함께 진다.
          ⤷ 이상적인 자리는 티저 꼬리다(산군은 `TeaserSalesTail` 이 티저에서만 이걸 문다).
             그쪽은 SajuWizard 를 건드려야 하는데 지금 다른 세션이 미커밋으로 물고 있어,
             전 스테이지 공통인 이 자리에 먼저 세운다. 입력 화면에선 첫 화면 아래로 밀린다. */}
      <StoryFooter />
    </div>
  );
}
