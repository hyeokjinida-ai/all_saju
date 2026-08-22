"use client";

// 웹툰 연출 — "디자이너 손 탄 느낌"의 실체를 코드로 옮긴 것. 직녀에서 꺼내 상품 고정을 풀었다(2026-08-23).
//
// 배경: 「청월당은 이미지라 퀄이 나오고 우리는 코딩이라 안 나온다」는 진단이 있었다. 절반만 맞다.
// 조판(글·카드·표)에서는 코드가 지지 않는다 — 같은 폰트를 자체 호스팅하고 있고 코드 글자는 벡터다.
// 진짜 간극은 **그림과 글이 섞이는 연출**이었다. 원본 15슬라이스 판독에서 나온 것들이 아래다.
//
// 크기는 전부 자(FS)에서만 고른다 — 여기 있는 17(대사)·19(나레이션)는 조판 규칙 §2 의 위계다.
import { FS, LH } from "@/components/kit/scale";

/** 손글씨 효과음 — 「멈칫」「갸웃」. 컷 위에 얹는다.
 *  원본은 그림에 구워 넣었지만 우리는 코드로 얹는다(한 번 구우면 못 고친다).
 *  회전·크기를 조금씩 어긋내야 손으로 쓴 것처럼 읽힌다. */
export function Sfx({
  children,
  rotate = -8,
  size = 26,
  color = "#fff",
  className = "",
}: {
  children: React.ReactNode;
  rotate?: number;
  /** 손글씨는 자(FS) 밖이다 — 글이 아니라 그림 요소라 컷 크기에 맞춰 자유롭게 준다 */
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
      style={{
        fontFamily: "var(--font-hand), cursive",
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1,
        color,
        display: "inline-block",
        transform: `rotate(${rotate}deg)`,
        // 밝은 그림 위에서도 읽히게 — 얇은 외곽선. 굵은 그림자는 촌스러워진다.
        textShadow: color === "#fff" ? "0 1px 2px rgba(0,0,0,0.45)" : "0 1px 0 rgba(255,255,255,0.6)",
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </span>
  );
}

/** 기울어진 컷 프레임 — 컷을 반듯하게만 쌓으면 "카드 목록"으로 보인다. 하나 기울이면 콜라주가 된다.
 *  ⚠ 자주 쓰면 어지럽다 — 한 페이지에 한두 번. */
export function TiltCut({
  children,
  deg = -2.5,
  bleed = true,
}: {
  children: React.ReactNode;
  deg?: number;
  /** 화면 끝까지 물릴지 — 기울이면 모서리가 뜨므로 살짝 넓게 깐다 */
  bleed?: boolean;
}) {
  return (
    <div className={bleed ? "-mx-3 overflow-hidden" : "overflow-hidden"}>
      <div
        style={{
          transform: `rotate(${deg}deg) scale(1.04)`,
          boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** 먹 번짐 전환 — 섹션과 섹션 사이. 칼같이 잘린 경계는 "블록 쌓기"로 보이고, 녹아 붙으면 한 편으로 읽힌다.
 *  색을 넘기지 않으면 **스킨 토큰**(.tx-ink)이 알아서 그 세계관의 밤으로 녹인다. */
export function InkFade({
  from,
  to,
  height = 90,
  flip = false,
}: {
  from?: string;
  to?: string;
  height?: number;
  /** 어두운 쪽에서 밝은 쪽으로 나올 때 */
  flip?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`-mx-5 ${flip ? "tx-ink tx-ink-up" : "tx-ink"}`}
      style={{
        ["--tx-ink-h" as string]: `${height}px`,
        ...(from ? { ["--tx-ink-from" as string]: from } : {}),
        ...(to ? { ["--tx-ink-to" as string]: to } : {}),
      }}
    />
  );
}

/** 만화 말풍선 — 흰 박스 + 꼬리 + 어두운 글씨. 무대 위에서 **가장 센 대비**라 말하는 순간이 또렷하다.
 *  명패(`name`)를 좌상단 탭으로 달아 누가 말하는지도 같이 박는다 — 직녀 고정이던 것을 풀었다. */
export function ComicSay({
  children,
  name,
  tail = "none",
}: {
  children: React.ReactNode;
  /** 말하는 사람 — 없으면 명패 없이 말풍선만 */
  name?: string;
  tail?: "down" | "none";
}) {
  return (
    <div className="relative">
      <div
        className="relative rounded-[18px] px-5 py-4"
        style={{ background: "#ffffff", boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}
      >
        {name && (
          <span
            className="font-myeongjo absolute -top-3 left-4 rounded-[3px] px-2.5 py-0.5 font-bold tracking-[0.22em]"
            style={{ fontSize: FS.cap, background: "var(--gold-bright)", color: "var(--wine-deep)" }}
          >
            {name}
          </span>
        )}
        <div className="font-myeongjo font-bold" style={{ fontSize: FS.say, lineHeight: LH.body, color: "var(--wine-deep)" }}>
          {children}
        </div>
      </div>
      {/* 꼬리 — 아래 컷을 가리킬 때만. CSS 삼각형이라 에셋이 필요 없다 */}
      {tail === "down" && (
        <span
          aria-hidden
          className="absolute left-9 block h-0 w-0"
          style={{ borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "12px solid #ffffff" }}
        />
      )}
    </div>
  );
}

/** 구름꼴 말풍선 — 생각·속마음. 각진 대사(ComicSay)와 갈라 쓴다.
 *  말풍선이 한 종류뿐이면 "같은 컴포넌트를 반복한" 티가 난다. */
export function ThoughtBubble({ children }: { children: React.ReactNode }) {
  const dot = { background: "#fff", border: "1px solid var(--gold-line)" };
  return (
    <div className="relative inline-block max-w-[86%]">
      <div
        className="px-4 py-3"
        style={{ fontSize: FS.body, lineHeight: LH.body, background: "#fff", border: "1px solid var(--gold-line)", borderRadius: 22, color: "var(--wine-deep)" }}
      >
        {children}
      </div>
      {/* 꼬리를 점 두 개로 — 생각풍선 문법 */}
      <span className="absolute -bottom-2 left-6 block h-2.5 w-2.5 rounded-full" style={dot} />
      <span className="absolute -bottom-5 left-3 block h-1.5 w-1.5 rounded-full" style={dot} />
    </div>
  );
}

/** 나레이션 — 이야기가 말하는 자리(사각 박스). 캐릭터 대사(말풍선)와 반드시 구분한다.
 *  글씨체로 역할을 가른다: 나레이션은 명조 19, 대사는 명조 17 + 흰 풍선. */
export function Narration({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[4px] px-4 py-3"
      // 바탕은 **그 세계관의 밤**이어야 한다 — 여기에 rgba 를 박으면 모든 스킨이 직녀 밤남색을 물려받는다.
      style={{ background: "color-mix(in srgb, var(--night-edge) 82%, transparent)", border: "1px solid var(--gold-line)", backdropFilter: "blur(2px)" }}
    >
      <p className="font-myeongjo" style={{ fontSize: FS.narr, lineHeight: LH.body, color: "var(--bone-soft)" }}>
        {children}
      </p>
    </div>
  );
}

/** 한지 질감 — 목차·발췌 카드 바탕. 값은 globals.css `.tx-hanji` 한 곳에만 있다. */
export const HANJI_CLASS = "tx-hanji";
