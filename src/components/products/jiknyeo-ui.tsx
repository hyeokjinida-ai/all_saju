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
}: {
  id: SlotId;
  assets?: AssetMap;
  /** 컷 위에 얹는 것(말풍선·나레이션) */
  overlay?: React.ReactNode;
  ratio?: string;
  pos?: string;
  priority?: boolean;
}) {
  const meta = SLOTS.find((s) => s.id === id);
  const a: Asset | undefined = assets?.[id];
  return (
    <figure className="relative w-full" style={{ aspectRatio: ratio }}>
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
          {/* 청월당 실측: 말풍선은 컷 **밖으로 절반 걸쳐** 종이 위에 뜬다.
              컷 안에 가두면(bottom-4/bottom-7) 자막·UI 카드로 읽힌다.
              overflow-visible 이 필요하므로 SlotCut 의 overflow-hidden 은 그림에만 걸고
              오버레이는 이 래퍼 밖으로 나가게 둔다. */}
          <div className="pointer-events-none absolute inset-x-3 bottom-0 translate-y-[38%]">{overlay}</div>
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
/** 직녀(웹툰 세계)의 말풍선 — 청월당 티저원본 실측 규격(2026-08-23).
 *
 *  `경쟁사레퍼런스/청월당/랜딩/연애비책/티저원본/result_02·07·09.png` 를 픽셀로 재서 나온 값:
 *    모양   **정원**(가로세로비 0.95~1.03) · 흰색 · **테두리 없음**
 *    폭     화면의 **41~48%** (46% 를 기본값으로)
 *    위치   **모서리**(중심 x = .26~.30 또는 .69~.72) — 얼굴 위에 절대 안 얹는다
 *    걸침   컷 **밖으로 절반 나와** 종이 위에 떠 있다(컷 안에 갇히면 UI 카드가 된다)
 *    꼬리   짧은 삼각형이 **입 쪽**을 가리킨다 — 누가 하는 말인지는 명패가 아니라 꼬리가 말한다
 *    글     **2줄**, 고딕, 검정, 중앙정렬
 *    명패   **없다**
 *
 *  ⚠ 산군은 실사라 문법이 다르다 — 한지 자막판(CutSay). 그 경로는 건드리지 않는다.
 *  ⚠ 3줄 이상 들어가면 원이 깨진다. 긴 설명은 말풍선이 아니라 컷 아래 나레이션으로 뺀다.
 */
export function ComicSay({
  children,
  tail = "none",
  side = "left",
}: {
  children: React.ReactNode;
  /** 꼬리 방향 = 인물의 입이 있는 쪽. "none" 이면 꼬리 없음(나레이션성 대사) */
  tail?: "down" | "up" | "none";
  /** 말풍선이 앉는 모서리 */
  side?: "left" | "right";
}) {
  return (
    <div className={`relative w-[46%] ${side === "right" ? "ml-auto" : "mr-auto"}`}>
      <div
        className="relative flex items-center justify-center rounded-full text-center"
        style={{ aspectRatio: "1 / 1", background: "#ffffff", padding: "12% 7%" }}
      >
        {/* ⚠ 원 안에서는 브라우저 줄바꿈에 맡기면 안 된다 — 좁은 폭 때문에 어절이 접혀
            2줄로 쓴 대사가 3~4줄이 되고 원이 깨진다(실측). `<br/>` 로 끊은 줄을 그대로 지키도록
            자식 span 을 nowrap 으로 못박고, 넘치면 글자 크기가 줄어들게 한다. */}
        <div
          className="font-gothic font-bold [&>span]:block [&>span]:whitespace-nowrap"
          style={{ color: "#1a1330", fontSize: "min(3.7cqw, 15.5px)", lineHeight: 1.45, whiteSpace: "nowrap" }}
        >
          {children}
        </div>
      </div>
      {tail !== "none" && (
        <span
          aria-hidden
          className="absolute block h-0 w-0"
          style={
            tail === "down"
              ? {
                  bottom: -13,
                  [side === "right" ? "right" : "left"]: "22%",
                  borderLeft: "11px solid transparent",
                  borderRight: "11px solid transparent",
                  borderTop: "16px solid #ffffff",
                }
              : {
                  top: -13,
                  [side === "right" ? "right" : "left"]: "22%",
                  borderLeft: "11px solid transparent",
                  borderRight: "11px solid transparent",
                  borderBottom: "16px solid #ffffff",
                }
          }
        />
      )}
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
  sfx,
  sfxAt = "right",
  tilt,
}: {
  id: SlotId;
  assets?: AssetMap;
  say?: React.ReactNode;
  /** 손글씨 효과음 — 「멈칫」「갸웃」. 원본은 그림에 구워 넣는데 우리는 코드로 얹는다. */
  sfx?: string;
  sfxAt?: "left" | "right";
  /** 한두 컷만 기울여 끼운다 — 전부 반듯하면 「카드 목록」으로 보인다(원본 01번이 사다리꼴). */
  tilt?: number;
}) {
  const cut = (
    <div className="relative">
      <SlotCut id={id} assets={assets} overlay={say} />
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
  return <div className="-mx-5 mt-6 pb-[13%]">{tilt ? <TiltCut deg={tilt}>{cut}</TiltCut> : cut}</div>;
}

