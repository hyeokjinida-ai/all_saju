"use client";

// 웹툰 연출 킷 — "디자이너 손 탄 느낌"의 실체를 코드로 옮긴 것.
//
// 배경: 「청월당은 이미지라 퀄이 나오고 우리는 코딩이라 안 나온다」는 진단이 있었다.
// 절반만 맞다. 조판(글·카드·표)에서는 코드가 지지 않는다 — 같은 폰트를 자체 호스팅하고 있고,
// 코드 글자는 벡터라 어디서나 선명하다. 걔네도 개인화 값(이름·달·기회 수)은 HTML 오버레이다.
//
// 진짜 간극은 **그림과 글이 섞이는 연출**이었다. 원본 15슬라이스 판독에서 나온 다섯 가지:
//   ① 컷 프레임이 기울어져 붙는다(01번 붓 컷이 사다리꼴)
//   ② 손글씨 효과음이 그림 위에 있다(「멈칫」「갸웃」「어라?」)
//   ③ 섹션이 먹 번짐으로 녹아 붙는다(04번 암전)
//   ④ 목차 카드에 한지 질감이 깔린다
//   ⑤ 목차 사이 코멘트를 SD(2등신) 캐릭터가 한다
//
// ①②③은 코드로 된다(이 파일). ④⑤는 에셋 1~2장이 필요해 발주 시트로 넘겼다.
import { LINE, INK } from "@/components/products/jiknyeo-teaser-kit";

/** 손글씨 효과음 — 「멈칫」「갸웃」. 컷 위에 얹는다.
 *  원본은 그림에 구워 넣었지만 우리는 코드로 얹는다(손님마다 값이 다른 자리와 같은 이유:
 *  한 번 구우면 못 고친다). 회전·크기를 조금씩 어긋내야 손으로 쓴 것처럼 읽힌다. */
export function Sfx({
  children,
  rotate = -8,
  size = 26,
  color = "#fff",
  className = "",
}: {
  children: React.ReactNode;
  rotate?: number;
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

/** 기울어진 컷 프레임 — 원본 01번의 사다리꼴 붓 컷 자리.
 *  컷을 반듯하게만 쌓으면 "카드 목록"으로 보인다. 하나를 기울여 끼우면 콜라주가 된다.
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

/** 먹 번짐 전환 — 섹션과 섹션 사이. 원본 04번(전면 암전)이 하는 일이다.
 *  칼같이 잘린 경계는 "블록 쌓기"로 보이고, 녹아 붙으면 한 편으로 읽힌다.
 *  에셋 없이 CSS 그라데이션만으로 만든다(번짐 이미지가 오면 배경만 갈아끼우면 된다). */
export function InkFade({
  from = "#f3f2ef",
  to = "#0b0f1a",
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
      className="-mx-5"
      style={{
        height,
        background: `linear-gradient(180deg, ${flip ? to : from} 0%, ${flip ? from : to} 100%)`,
      }}
    />
  );
}

/** 구름꼴 말풍선 — 생각·속마음. 기존 ComicSay(각진 대사)와 갈라 쓴다.
 *  말풍선이 한 종류뿐이면 "같은 컴포넌트를 반복한" 티가 난다. */
export function ThoughtBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative inline-block max-w-[86%]">
      <div
        className="px-4 py-3 text-[15px] leading-[22px]"
        style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 22, color: INK }}
      >
        {children}
      </div>
      {/* 꼬리를 점 두 개로 — 생각풍선 문법 */}
      <span
        className="absolute -bottom-2 left-6 block h-2.5 w-2.5 rounded-full"
        style={{ background: "#fff", border: `1px solid ${LINE}` }}
      />
      <span
        className="absolute -bottom-5 left-3 block h-1.5 w-1.5 rounded-full"
        style={{ background: "#fff", border: `1px solid ${LINE}` }}
      />
    </div>
  );
}

/** 한지 질감 — 목차 카드 바탕.
 *  텍스처 이미지가 오면 backgroundImage 한 줄만 갈아끼우면 된다(발주 시트 §연출 에셋).
 *  그전까지는 미세한 얼룩을 CSS 로 깔아 종이처럼 보이게 한다. */
// 2026-08-19: 진짜 한지 스캔 텍스처가 들어와 CSS 얼룩을 대체했다(섬유 결이 CSS 로는 안 나온다).
// 파일이 없으면 backgroundColor 만 남아 카드가 그냥 아이보리 판이 된다 — 페이지는 깨지지 않는다.
export const HANJI_BG: React.CSSProperties = {
  backgroundColor: "#faf7f0",
  backgroundImage: "url(/products/jiknyeo/hanji.png)",
  backgroundSize: "360px 360px",
  backgroundRepeat: "repeat",
};
