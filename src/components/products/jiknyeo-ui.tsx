"use client";

// 직녀 공용 UI — **몰입 랜딩(JiknyeoStory)과 결제 전 티저(SajuWizard)가 같이 쓴다.**
//
// 왜 따로 뺐나: 같은 세계관인데 컷 렌더링 규칙이 파일마다 따로 있으면 반드시 어긋난다
// (실측으로 겪음 — 랜딩은 슬롯 방식인데 티저만 이미지 경로를 손으로 박아 화풍이 갈렸다).
// 슬롯 규칙은 여기 한 곳에만 둔다.
import { useRef } from "react";
import { BgMedia } from "@/components/products/BgMedia";
import { SLOTS, type Asset, type AssetMap, type SlotId } from "@/lib/jiknyeo-slots";
import { Sfx, TiltCut } from "@/components/products/jiknyeo-comic-kit";
import { type SayBox, setSayBox, useSayBox } from "@/lib/jiknyeo-say-box";

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
  sayBox,
}: {
  id: SlotId;
  assets?: AssetMap;
  /** 컷 위에 얹는 것(말풍선·나레이션) */
  overlay?: React.ReactNode;
  ratio?: string;
  pos?: string;
  priority?: boolean;
  /**
   * 말풍선이 앉는 자리 — **컷 폭 기준 %**(x·w)와 **컷 높이 기준 %**(y).
   *
   * 왜 좌표인가: 예전엔 `sayAt="top"|"bottom"` 으로 모서리만 골랐다. 그런데 우리 컷은
   * 2:3 원본을 4:5 로 자른 것이라 인물이 프레임을 거의 다 채운다 — "빈 모서리"가 컷마다
   * 다른 자리에 있고, 어떤 컷은 아예 없다. 모서리 이름으로 고르면 반드시 얼굴이나 손 위에
   * 떨어진다(운영 실측: 5컷 중 눈 1·손 2). 컷마다 그림을 재서 좌표를 박는다 —
   * 값의 근거는 호출부(SajuWizard) 배치표에 컷별로 적어 둔다.
   */
  sayBox?: SayBox;
}) {
  const meta = SLOTS.find((s) => s.id === id);
  const a: Asset | undefined = assets?.[id];
  // `?edit=say` 면 브라우저에 저장된 자리를, 아니면 코드에 박힌 자리를 쓴다.
  const { box, font, edit } = useSayBox(id, sayBox);
  const figRef = useRef<HTMLElement | null>(null);
  const drag = useRef<{ mode: "move" | "size"; sx: number; sy: number; b: SayBox } | null>(null);

  const startDrag = (mode: "move" | "size") => (e: React.PointerEvent) => {
    if (!edit || !box) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, sx: e.clientX, sy: e.clientY, b: box };
  };
  const onDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    const fig = figRef.current;
    if (!d || !fig) return;
    const r = fig.getBoundingClientRect();
    const dx = ((e.clientX - d.sx) / r.width) * 100;
    const dy = ((e.clientY - d.sy) / r.height) * 100;
    const r1 = (n: number) => Math.round(n * 10) / 10;
    setSayBox(
      id,
      d.mode === "move"
        ? { ...d.b, x: r1(d.b.x + dx), y: r1(d.b.y + dy) }
        : { ...d.b, w: Math.max(14, Math.min(92, r1(d.b.w + dx))) },
    );
  };
  const endDrag = () => {
    drag.current = null;
  };
  return (
    <figure ref={figRef} className="relative w-full" style={{ aspectRatio: ratio, background: "#0b0f1a" }}>
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
      {/* ⚠ 예전엔 컷 아래 60% 에 검은 그라데를 깔았다. 자막 상자를 쓰던 시절 글자 받침이었는데,
          말풍선(흰 원)으로 바꾼 뒤에도 남아서 **직녀 그림의 아랫절반을 죽이고 있었다**
          (j1 실측: 하단 1/3 밝기가 원본의 51%). 흰 원은 자기 테두리와 그림자로 이미 뜬다. */}
      {overlay &&
        (box ? (
          // 좌표 배치 — 폭은 이 상자가 정하므로 안에 든 말풍선의 자기 폭(46%)을 덮어쓴다.
          // 글씨 크기는 CSS 변수로 흘려보낸다(ComicSay 가 저장소를 몰라도 되게).
          <div
            // 폭은 아래 `--say-w` 로만 넘긴다. 예전엔 `[&>*:first-child]:!w-full` 로 넘겼는데
            // 그 클래스가 실제로 안 먹어(2026-09-02 실측) 말풍선이 46% 로 남아 글자가 터졌다.
            // 변수로 주면 편집 모드의 크기 손잡이(span)도 영향을 안 받는다 — 그게 first-child 로
            // 좁혔던 원래 이유였다(손잡이까지 100% 를 먹으면 원이 알약으로 늘어난다).
            className={`absolute ${edit ? "cursor-move touch-none" : "pointer-events-none"}`}
            style={
              {
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.w}%`,
                "--say-font": `${font}px`,
                // 말풍선이 이 상자를 꽉 채우게 한다(자기 기본 폭 46% 를 덮어쓰는 통로).
                "--say-w": "100%",
                ...(edit ? { outline: "1.5px dashed rgba(255,224,122,0.9)", outlineOffset: 2 } : null),
              } as React.CSSProperties
            }
            onPointerDown={startDrag("move")}
            onPointerMove={onDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {overlay}
            {edit && (
              // 오른쪽 아래 손잡이 — 좌우로 끌면 원이 커지고 작아진다.
              <span
                onPointerDown={startDrag("size")}
                onPointerMove={onDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="absolute -bottom-1 -right-1 block h-7 w-7 cursor-ew-resize touch-none rounded-full"
                style={{ background: "#ffe07a", border: "2px solid #1a1330" }}
              />
            )}
          </div>
        ) : (
          // 좌표를 안 준 자리(상품 상세의 나레이션 등)는 예전 그대로 아래쪽에 앉힌다.
          <div className="pointer-events-none absolute inset-x-4 bottom-6">{overlay}</div>
        ))}
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
  point = "right",
}: {
  children: React.ReactNode;
  /** 꼬리가 뻗는 세로 방향. "none" 이면 꼬리 없음 */
  tail?: "down" | "up" | "none";
  /** 꼬리가 가리키는 가로 쪽 = **인물이 있는 방향**. 말풍선이 앉는 자리와는 무관하다 */
  point?: "left" | "right";
}) {
  // 정원 100 + 꼬리 22. `preserveAspectRatio` 를 **건드리지 않는다** —
  // 한때 "none" 으로 두고 꼬리 없는 경우만 상자를 1:1 로 줬더니, viewBox 122 를 100 높이에
  // 욱여넣어 원이 세로로 82% 눌린 타원이 됐다(t14 실측). 상자 비율과 viewBox 비율을 같게 두면
  // 브라우저 기본값(xMidYMid meet)이 정원을 지켜 준다.
  const H = tail === "none" ? 100 : 122;
  const cy = tail === "up" ? 72 : 50;
  // 꼬리는 원 둘레 안쪽 두 점에서 시작해 뾰족하게 나간다(겹쳐 칠하므로 이음매가 안 생긴다).
  // 청월당 원본보다 뭉툭하면 "말풍선 아이콘"이 되므로 밑변을 좁게 잡는다.
  const tailPath =
    tail === "down"
      ? point === "right"
        ? "M56 97 L88 121 L70 91 Z"
        : "M44 97 L12 121 L30 91 Z"
      : tail === "up"
        ? point === "right"
          ? "M56 25 L88 1 L70 31 Z"
          : "M44 25 L12 1 L30 31 Z"
        : "";

  return (
    // 폭은 sayBox 가 있으면 부모가 덮어쓴다 — 컷마다 인물이 다른 자리에 서 있어서
    // 말풍선이 스스로 모서리를 고르면 반드시 어딘가에서 얼굴·손 위에 떨어진다(실측 5컷 중 3컷).
    // 여기 46% 는 좌표를 안 주는 자리(상품 상세)용 기본값이다.
    //
    // ⚠ 부모가 폭을 넘기는 통로를 유틸리티(`[&>*:first-child]:!w-full`)에서 **변수로 바꿨다**.
    //    그 클래스가 실제로는 적용되지 않아(2026-09-02 실측: 부모 161px 인데 자식이 46% = 74px)
    //    말풍선이 원 크기보다 큰 글자를 물고 있었다 — w3 컷에서 대사가 원 밖으로 29px 삐져나가
    //    화면 왼쪽 끝을 넘었다(가로 넘침 3건). 변수는 `--say-font` 와 같은 통로라 규칙이 하나로 선다.
    <div className="relative" style={{ width: "var(--say-w, 46%)", aspectRatio: `100 / ${H}` }}>
      <svg
        viewBox={`0 0 100 ${H}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden
        style={{ filter: "drop-shadow(0 6px 14px rgba(12,10,28,0.45))" }}
      >
        <g fill="#ffffff" stroke="#15121f" strokeWidth="1.1" strokeLinejoin="round">
          {/* 테두리를 원·꼬리에 따로 그으면 맞닿는 자리에 선이 지나간다.
              같은 도형을 두 번 칠한다: ① 테두리까지 함께 → ② 안쪽을 흰색으로 덮어 이음매를 지운다. */}
          <circle cx="50" cy={cy} r="49.4" />
          {tailPath && <path d={tailPath} />}
        </g>
        <g fill="#ffffff">
          <circle cx="50" cy={cy} r="48.8" />
          {tailPath && <path d={tailPath} />}
        </g>
      </svg>
      {/* 글은 원 안쪽에만 앉는다 — 꼬리 영역을 피해 위/아래로 밀어준다 */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          paddingLeft: "12%",
          paddingRight: "12%",
          paddingTop: tail === "up" ? "20%" : "4%",
          paddingBottom: tail === "down" ? "20%" : "4%",
        }}
      >
        <div
          className="font-gothic text-center font-bold [&>span]:block [&>span]:whitespace-nowrap"
          // 크기는 컷마다 다르면 안 된다 — 폭이 36~47% 로 갈리는데 폭에 비례시키면 같은 화면에서
          // 대사 크기가 들쭉날쭉해진다. 화면 전체에 하나의 값을 쓰고(`--say-font`), 줄이 넘치면
          // 폭을 키워 받는다. 값은 `?edit=say` 편집 모드에서 형님이 직접 조절한다.
          style={{ color: "#1a1330", fontSize: "var(--say-font, 16px)", lineHeight: 1.4, whiteSpace: "nowrap" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function Hi({ children }: { children: React.ReactNode }) {
  return (
    // ⚠ 글자색을 먹색으로 하드코딩했다가 밝은 티저에서 안 보였다 — 거기선 --gold-bright 가
    //    진보라(#6B4C9A)로 뒤집혀 먹색 글자와 대비가 2.6:1 로 무너진다(형님 실측 스샷).
    //    「아직이에요」 펀치와 같은 병·같은 처방: 배경이 어느 판에서든 짙은 색이므로 글자는 흰색.
    <span className="rounded-[3px] px-1.5 py-0.5" style={{ background: "var(--gold-bright)", color: "#ffffff" }}>
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
  sayBox,
  pos,
  padTop = 0,
  sfx,
  sfxAt = "right",
  tilt,
}: {
  id: SlotId;
  assets?: AssetMap;
  say?: React.ReactNode;
  /** 말풍선 자리 — 컷 폭 기준 %(x·w) / 컷 높이 기준 %(y). 컷마다 그림을 재서 넣는다 */
  sayBox?: { x: number; y: number; w: number };
  /** 크롭 위치 — 기본은 SlotCut 의 `center 18%` */
  pos?: string;
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
      <SlotCut id={id} assets={assets} overlay={say} sayBox={sayBox} {...(pos ? { pos } : {})} />
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

