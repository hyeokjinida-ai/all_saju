"use client";

// 직녀 공용 UI — **몰입 랜딩(JiknyeoStory)과 결제 전 티저(SajuWizard)가 같이 쓴다.**
//
// 왜 따로 뺐나: 같은 세계관인데 컷 렌더링 규칙이 파일마다 따로 있으면 반드시 어긋난다
// (실측으로 겪음 — 랜딩은 슬롯 방식인데 티저만 이미지 경로를 손으로 박아 화풍이 갈렸다).
// 슬롯 규칙은 여기 한 곳에만 둔다.
import { BgMedia } from "@/components/products/BgMedia";
import { SLOTS, type Asset, type AssetMap, type SlotId } from "@/lib/jiknyeo-slots";
import { Sfx, TiltCut } from "@/components/products/jiknyeo-comic-kit";

/** 달빛 팔레트 — JiknyeoLanding 과 같은 값(세계관 한 벌) */
export const MOON = "#d9c7e8";
export const SILVER = "#cfd6e6";
export const LINE = "rgba(207,214,230,0.22)";
export const INK = "linear-gradient(180deg,#0b0f1a 0%,#141026 100%)";

/**
 * 슬롯 컷 — 파일이 있으면 그림(영상 있으면 영상), 없으면 **라벨 붙은 달빛 패널**.
 *
 * 그림이 0장이어도 화면이 성립해야 대사·배치를 먼저 확정할 수 있다(형님 지시).
 * 파일을 폴더에 넣고 새로고침하면 그 자리가 그대로 켜진다 — 코드 수정 0.
 */
export function SlotCut({
  id,
  assets,
  overlay,
  ratio = "4 / 5",
  pos = "center 18%",
  priority,
  sayAt = "bottom",
}: {
  id: SlotId;
  assets?: AssetMap;
  /** 컷 위에 얹는 것(말풍선·나레이션) */
  overlay?: React.ReactNode;
  ratio?: string;
  pos?: string;
  priority?: boolean;
  /** 말풍선이 앉는 컷 안 위치 — 인물 얼굴이 없는 쪽 */
  sayAt?: "top" | "bottom";
}) {
  const meta = SLOTS.find((s) => s.id === id);
  const a: Asset | undefined = assets?.[id];
  return (
    <figure className="relative w-full" style={{ aspectRatio: ratio, background: "#0b0f1a" }}>
      {/* ⚠ BgMedia 는 포스터(img)가 필수다 — mp4 만 넣으면 폴백할 그림이 없어 검은 칸이 된다.
          그 경우엔 영상 승격을 포기하고 아래 이미지/플레이스홀더로 내려앉힌다. */}
      {a?.video && a.img ? (
        <BgMedia video={a.video} img={a.img} loopVideo={a.loopVideo} loop={!meta?.once} alt={meta?.label ?? ""} className="absolute inset-0 h-full w-full object-cover" />
      ) : a?.img ? (
        <img
          src={a.img}
          alt={meta?.label ?? ""}
          // 컷은 **즉시** 받는다. lazy 로 뒀더니 화면 안에 들어와도 로딩이 발화하지 않아
          // 그림이 영영 안 뜨는 판이 나왔다(실측: currentSrc 가 빈 채로 남음).
          // 티저 컷은 몇 장뿐이고 전부 스토리의 일부라 지연시킬 이유도 없다.
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: pos }}
        />
      ) : (
        // 그림이 아직 없는 자리. 배경을 하드코딩하면 **밝은 티저 안에서 검은 구멍**이 된다(실측) —
        // 토큰(--gold-pale/--gold-line/--bone-*)으로 그려서 어두운 무대·밝은 티저 양쪽에 앉게 한다.
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "var(--gold-pale)", border: "1px dashed var(--gold-line)" }}
        >
          <div className="px-6 text-center">
            <p className="font-myeongjo text-[13px] tracking-[0.14em]" style={{ color: "var(--bone-faint)" }}>
              {meta?.label ?? id}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "var(--bone-faint)", opacity: 0.75 }}>
              {meta?.note ?? ""}
            </p>
          </div>
        </div>
      )}
      {/* 글자가 앉는 아래쪽만 눌러 준다 — 그림이 들어와도 대사가 그대로 읽힌다 */}
      {overlay && (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(11,15,26,0) 40%, rgba(11,15,26,0.74) 76%, rgba(11,15,26,0.96) 100%)" }}
          />
          {/* ⚠ 한때 청월당처럼 **컷 밖으로 걸치게** 했다가 되돌렸다(2026-08-23).
              저쪽은 페이지 바탕이 연한 종이 한 장이라 말풍선이 그 위에 자연스럽게 뜨는데,
              우리는 **어두운 밤 컷 + 밝은 달빛 판**이라 걸치려고 만든 여백이 밝은 띠가 되어
              「어두운 컷 → 밝은 띠 → 어두운 컷」 줄무늬가 됐다(형님 지적).
              그래서 말풍선은 **컷 안 빈 모서리**에 앉힌다 — 청월당도 어두운 배경 컷에서는
              말풍선을 컷 안에 둔다(result_02 좌상단). 자막이 안 되게 하는 건 걸침이 아니라
              **정원 + 좁은 폭 + 입을 가리키는 꼬리**다. */}
          <div className={`pointer-events-none absolute inset-x-4 ${sayAt === "top" ? "top-5" : "bottom-6"}`}>
            {overlay}
          </div>
        </>
      )}
    </figure>
  );
}

/** 나레이션 — 이야기가 말하는 자리(사각 박스). 캐릭터 대사(말풍선)와 반드시 구분한다. */
export function Narration({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[4px] px-4 py-3"
      style={{ background: "rgba(11,15,26,0.82)", border: `1px solid ${LINE}`, backdropFilter: "blur(2px)" }}
    >
      <p className="font-myeongjo text-[19px] leading-[1.75]" style={{ color: "#cfd0d8" }}>
        {children}
      </p>
    </div>
  );
}

/** 은사 디바이더 — 붉은 실의 대체(직녀는 NO RED) */
export function SilverThread() {
  return (
    <div className="flex justify-center py-6">
      <svg aria-hidden viewBox="0 0 12 72" className="h-16 w-3">
        <path d="M6 0 C 8 14, 4 22, 6 34 C 8 46, 4 56, 6 72" stroke={SILVER} strokeOpacity="0.55" strokeWidth="1.2" fill="none" />
        <circle cx="6" cy="35" r="2.2" fill={SILVER} fillOpacity="0.9" />
      </svg>
    </div>
  );
}

/** 발광 띠 — 청월당은 헤드 뒤에 포인트색 radial 을 깔아 검정과 대비를 만든다.
 *  flat 검정 위 글자만 얹으면 같은 크기여도 약해 보인다(1:1 대조에서 나온 밤티 원인 3). */
export function GlowBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[190%] w-[150%] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(217,199,232,0.30) 0%, transparent 70%)" }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

/** 형광펜 밑줄 낙서 — 청월당이 가림 박스 아래에 긋는 그 거친 스트로크(손맛 요소). */
export function ScribbleLine({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 10" preserveAspectRatio="none" className={`block h-2 w-full ${className}`}>
      <path d="M3 6 C 40 2, 70 8, 104 4 C 138 1, 168 7, 197 3" fill="none" stroke="var(--gold-bright)" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M10 8 C 46 5, 78 9, 112 6 C 146 4, 172 8, 192 6" fill="none" stroke="var(--gold-bright)" strokeOpacity="0.3" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** 한붓 별 낙서 — 숫자 옆에 하나만. 있으면 화면이 '만든 것'처럼 보이고 없으면 밋밋하다. */
export function ScribbleStar({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`inline-block h-4 w-4 ${className}`}>
      <path d="M12 2 L15 9 L22 9.5 L16.5 14 L18.5 21 L12 17 L5.5 21 L7.5 14 L2 9.5 L9 9 Z" fill="none" stroke="var(--gold-bright)" strokeOpacity="0.75" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 네온 가림 — 청월당의 모자이크는 '처리'가 아니라 **오브젝트**다.
 * 발광 라운드 박스 + 흐린 더미 글자 + 아래 형광펜 낙서. 가려 놓은 자리가 오히려 눈에 띈다.
 * ⚠ 안에 실값을 넣지 않는다 — 흐리게만 하면 소스에서 그대로 읽힌다(청월당도 더미를 깐다).
 */
export function NeonMask({ text = "○○○○○○", scribble = true }: { text?: string; scribble?: boolean }) {
  return (
    <span className="inline-block align-middle">
      <span
        className="inline-flex items-center justify-center rounded-[10px] px-3.5 py-1.5"
        style={{
          border: "1.5px solid var(--gold-bright)",
          boxShadow: "0 0 10px rgba(217,199,232,0.55), 0 0 26px rgba(217,199,232,0.28), inset 0 0 14px rgba(217,199,232,0.22)",
          background: "rgba(217,199,232,0.08)",
        }}
      >
        <span
          className="font-myeongjo text-[15px] font-bold"
          style={{ color: "var(--bone)", filter: "blur(5px)", userSelect: "none" }}
        >
          {text}
        </span>
      </span>
      {scribble && <ScribbleLine className="-mt-0.5" />}
    </span>
  );
}

/**
 * 직녀 만화 말풍선 — 청월당 실측 문법(흰 박스 + 꼬리 + 검정 글씨).
 *
 * 밤하늘 무대 위에서 **가장 세게 튀는 대비**라 캐릭터가 말하는 순간이 또렷하게 잡힌다.
 * 우리 판은 명패(「직녀」)를 좌상단 탭으로 달아 누가 말하는지도 같이 박는다.
 */
/** 직녀(웹툰 세계)의 말풍선 — **원과 꼬리를 하나의 SVG path 로 그린다.**
 *
 *  ⚠ 전에는 `rounded-full` div + CSS 삼각형 span 을 겹쳐 만들었다. 그러면
 *     ① 원과 꼬리 사이에 이음매(색 경계)가 보이고 ② 그림자가 두 조각에 따로 걸려 뜨고
 *     ③ 꼬리 위치를 % 로 맞춰야 해서 컷마다 어긋났다(형님 지적 2026-08-23).
 *     하나의 도형으로 그리면 이음매가 **구조적으로 생길 수 없다**.
 *
 *  청월당 티저원본 실측 규격(result_02·07·09):
 *    정원 · 흰색 · 테두리 없음 · 명패 없음 · 폭 41~48% · 글 2줄 · 꼬리가 입 쪽
 *
 *  tail: 꼬리가 나가는 방향(= 인물이 있는 쪽). 글은 원 안에 중앙 정렬로 얹는다.
 */
export function ComicSay({
  children,
  tail = "none",
  side = "left",
}: {
  children: React.ReactNode;
  /** 꼬리 방향 = 인물의 입이 있는 쪽. "none" 이면 꼬리 없음 */
  tail?: "down" | "up" | "none";
  /** 말풍선이 앉는 모서리 */
  side?: "left" | "right";
}) {
  // viewBox 100x122 — 원(지름 100)에 꼬리 길이 22 를 더한 높이.
  // 꼬리는 원의 둘레에서 자라나 한 붓으로 이어진다(이음매 없음).
  const flip = side === "right";
  const tailPath =
    tail === "down"
      ? // 아래로 뻗는 꼬리 — 원 하단 좌측(또는 우측)에서 시작해 뾰족하게 내려간다
        flip
        ? "M72 94 L86 120 L58 99 Z"
        : "M28 94 L14 120 L42 99 Z"
      : tail === "up"
        ? flip
          ? "M72 28 L86 2 L58 23 Z"
          : "M28 28 L14 2 L42 23 Z"
        : "";

  return (
    <div className={`relative w-[46%] ${flip ? "ml-auto" : "mr-auto"}`}>
      <div className="relative" style={{ aspectRatio: tail === "none" ? "1 / 1" : "100 / 122" }}>
        <svg
          viewBox="0 0 100 122"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
          style={{ filter: "drop-shadow(0 8px 18px rgba(12,10,28,0.34))" }}
        >
          {/* 원 + 꼬리를 **한 덩어리**로 칠한다. 두 도형이지만 같은 fill 이고 겹쳐 있어
              경계선이 나오지 않는다(따로 그린 CSS 삼각형과 결정적으로 다른 점). */}
          <g fill="#ffffff">
            <circle cx="50" cy={tail === "up" ? 72 : 50} r="50" />
            {tailPath && <path d={tailPath} />}
          </g>
        </svg>
        {/* 글은 원 안쪽에만 앉는다 — 꼬리 영역을 피해 위/아래로 밀어준다 */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            paddingLeft: "13%",
            paddingRight: "13%",
            paddingTop: tail === "up" ? "22%" : "4%",
            paddingBottom: tail === "down" ? "22%" : "4%",
          }}
        >
          <div
            className="font-gothic text-center font-bold [&>span]:block [&>span]:whitespace-nowrap"
            style={{ color: "#1a1330", fontSize: "min(3.7cqw, 15.5px)", lineHeight: 1.45, whiteSpace: "nowrap" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hi({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[3px] px-1.5 py-0.5" style={{ background: "var(--gold-bright)", color: "#1a1330" }}>
      {children}
    </span>
  );
}

/**
 * 직녀 컷 — 그림 자리는 **슬롯**이다. 파일이 없으면 라벨 붙은 달빛 패널로 서고,
 * 폴더에 파일을 넣는 순간 그 자리가 그림(영상 있으면 영상)으로 켜진다.
 * 컬럼 끝까지 나간다(규칙: 그림은 끝까지, 판·카드는 한 단 안쪽).
 */
export function InyeonCut({
  id,
  assets,
  say,
  sayAt = "bottom",
  padTop = 0,
  sfx,
  sfxAt = "right",
  tilt,
}: {
  id: SlotId;
  assets?: AssetMap;
  say?: React.ReactNode;
  /** 말풍선이 앉는 컷 안 위치 */
  sayAt?: "top" | "bottom";
  /** 앞 블록과의 간격 — **밤 배경 안에서** 준다(바깥 margin 은 흰 띠가 된다) */
  padTop?: number;
  /** 손글씨 효과음 — 「멈칫」「갸웃」. 원본은 그림에 구워 넣는데 우리는 코드로 얹는다. */
  sfx?: string;
  sfxAt?: "left" | "right";
  /** 한두 컷만 기울여 끼운다 — 전부 반듯하면 「카드 목록」으로 보인다(원본 01번이 사다리꼴). */
  tilt?: number;
}) {
  const cut = (
    <div className="relative">
      <SlotCut id={id} assets={assets} overlay={say} sayAt={sayAt} />
      {/* 효과음은 **컷 안에 완전히** 들어가야 한다. top 14% 는 컷을 -mx-5 로 넓힌 뒤라
          기울임(rotate)까지 겹치면 위·옆이 잘려 글자 쓰레기처럼 보였다(형님 지적 2026-08-23).
          충분히 안쪽(22%)으로 내리고 좌우 여백도 넓힌다. */}
      {sfx && (
        <span
          className="absolute top-[22%]"
          style={sfxAt === "right" ? { right: "14%" } : { left: "14%" }}
        >
          <Sfx rotate={sfxAt === "right" ? 9 : -9}>{sfx}</Sfx>
        </span>
      )}
    </div>
  );
  // 말풍선이 컷 밖으로 38% 걸치므로 **아래 여백**을 그만큼 비워 다음 블록과 안 겹치게 한다.
  // (청월당도 컷 아래 종이 여백을 크게 두고 그 위에 말풍선을 띄운다 — 실측 result_02/07)
  // ⚠ 직녀 티저는 **밝은 판(teaser-light)** 위에 얹히는데 컷은 **어두운 밤 그림**이다.
  // mt-6 으로 컷 사이를 띄우면 그 틈으로 밝은 판이 드러나 **흰 가로 띠**가 생긴다
  // (형님 폰 실측 2026-08-23: 컷마다 위아래로 흰 줄). 디자인 문서의 원칙도
  // 「바탕은 밤, 정보 판만 달빛으로 띄운다」인데 컷 구간만 그걸 안 따르고 있었다.
  // → 컷을 밤 배경 블록으로 감싸고 틈을 없앤다. 컷끼리 이어져 웹툰이 죽 흐르고,
  //   정보 카드(원국표·달력·가격)는 밝은 판 그대로 둔다 — 청월당 유료 결과지와 같은 리듬.
  return (
    // 간격은 **밤 배경 안쪽**에서 준다. 바깥에 margin 을 주면 그 틈으로 밝은 판이 드러나
    // 흰 가로 띠가 된다(형님 폰 실측 2026-08-23 — 호출부의 mt-6 이 진짜 범인이었다).
    <div className="-mx-5" style={{ background: "#0b0f1a", paddingTop: padTop }}>
      {tilt ? <TiltCut deg={tilt}>{cut}</TiltCut> : cut}
    </div>
  );
}

