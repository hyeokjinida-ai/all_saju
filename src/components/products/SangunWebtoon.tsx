"use client";

// "박수무당 사주" 포괄 메인 랜딩 — 타이트 MZ무당사주 구조 이식(2026-07-28 형님 지시).
// 스크롤 설득문이 아니라 "입장 의식": 사운드 게이트 → 신당 입장 → 박수 대면 → 장부 티저 → 페이월.
// 사운드는 파일 없이 Web Audio 합성(저음 바람 + 방울 딸랑) — 자산 의존 제거.
import { useEffect, useRef, useState } from "react";
import { StoryFooter } from "@/components/products/StoryFooter";
import { BgMedia } from "@/components/products/BgMedia";
// 세일즈 블록(예시 결과지·목차·가격 앵커·FAQ)은 티저 화면과 공유한다 — SangunSalesBlocks.tsx 머리말 참고.
import { SampleCard, TocCard, SangunFaq } from "@/components/products/SangunSalesBlocks";
import { SOCIAL_PROOF, hasSocialProof, formatCount } from "@/config/social-proof";
import { track } from "@/lib/analytics";

const INK_BG = "linear-gradient(180deg,#0a0b0f 0%,#171017 100%)";
const SCRIM =
  "linear-gradient(180deg, rgba(5,4,8,0.35) 0%, rgba(5,4,8,0) 30%, rgba(5,4,8,0) 52%, rgba(5,4,8,0.97) 100%)";
const GOLD = "#e8c96a";
const RED = "#8f2b1e";
const SUB = "#9aa3b8";
const P = { color: "#a4552c" };

// ── Web Audio 신당 앰비언스(바람 + 방울) ─────────────────────────
function useShrineAmbience() {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [on, setOn] = useState(false);

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setOn(false);
  };

  const start = () => {
    if (ctxRef.current) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    ctxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);

    // 바람 — 루프 노이즈 버퍼 + 저역 필터
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.5;
    noise.connect(lp).connect(windGain).connect(master);
    noise.start();

    // 방울 — 불규칙하게 딸랑(고음 사인 3개, 짧은 감쇠)
    const jingle = () => {
      const c = ctxRef.current;
      if (!c) return;
      const t0 = c.currentTime;
      [2450, 3100, 3900].forEach((f, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.value = f + Math.random() * 120;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.10 - i * 0.025, t0 + 0.012 + i * 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9 + i * 0.18);
        o.connect(g).connect(master);
        o.start(t0);
        o.stop(t0 + 1.4);
      });
    };
    jingle();
    timerRef.current = setInterval(() => {
      if (Math.random() < 0.55) jingle();
    }, 2600);
    setOn(true);
  };

  useEffect(() => stop, []);
  return { on, toggle: () => (ctxRef.current ? stop() : start()) };
}

// ── 공용 조각(웹툰 랜딩 문법 재사용) ─────────────────────────────
// 영상 파일이 도착하면 자동으로 살아나는 미디어 — 파일이 없으면(404) 포스터/이미지로 조용히 폴백.
// V1~V3(Flow 생성분)을 public/products/sangun/{gate,altar,face}.mp4 로 넣기만 하면 코드 수정 없이 영상화된다.
function Cut({
  src,
  videoSrc,
  alt,
  priority,
  children,
}: {
  src: string;
  videoSrc?: string;
  alt: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative w-full overflow-hidden">
      {videoSrc ? (
        <BgMedia video={videoSrc} img={src} alt={alt} className="block w-full" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={860}
          height={1471}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          className="block w-full"
        />
      )}
      <div className="pointer-events-none absolute inset-0" style={{ background: SCRIM }} />
      {children}
    </div>
  );
}

function Bubble({ who, children }: { who: string; children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-x-4 bottom-5 rounded-[5px] px-5 py-4"
      style={{
        background: "linear-gradient(180deg,#f3ead6,#e9dec2)",
        border: "1px solid #c9b98e",
        boxShadow: "0 10px 30px rgba(0,0,0,0.55), inset 0 0 34px rgba(216,201,163,0.35)",
      }}
    >
      <span
        className="absolute -top-3 right-3 rounded-[2px] px-2.5 pb-[3px] pt-1 text-[11px] font-semibold tracking-[0.22em]"
        style={{ background: RED, color: "#f3e6cf" }}
      >
        {who}
      </span>
      <p className="font-myeongjo text-[17px] font-semibold leading-[1.75] text-[#241d10]">{children}</p>
    </div>
  );
}

function ThreadDivider() {
  return (
    <div aria-hidden className="flex justify-center py-1">
      <svg width="12" height="64" viewBox="0 0 12 64" fill="none">
        <path d="M6 0 C 7.8 12, 4.2 20, 6 30 C 7.8 40, 4.2 50, 6 64" stroke="#a63a2b" strokeOpacity="0.75" strokeWidth="1.4" />
        <circle cx="6" cy="31" r="2.6" fill="#8f2b1e" />
      </svg>
    </div>
  );
}

// ▓ 장부 티저 — "장부는 이미 읽혔다"
function LedgerLock({ onOpen }: { onOpen: () => void }) {
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div
      className="flex items-baseline justify-between gap-3 rounded-[4px] px-4 py-3"
      style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(201,162,39,0.22)" }}
    >
      <span className="shrink-0 text-[15px]" style={{ color: SUB }}>
        {label}
      </span>
      <span className="text-right font-myeongjo text-[17px] font-bold tracking-[0.06em]" style={{ color: GOLD }}>
        {value}
      </span>
    </div>
  );
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block w-full rounded-md p-6 text-left"
      style={{
        background: "linear-gradient(160deg,#1a1410,#12100f)",
        border: "1px solid rgba(201,162,39,0.3)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}
    >
      <span
        aria-hidden
        className="absolute -top-3 right-4 flex h-9 w-9 rotate-3 items-center justify-center rounded-[3px] font-myeongjo text-[17px] font-bold"
        style={{ background: RED, color: "#f3e6cf", boxShadow: "0 6px 16px rgba(0,0,0,0.45)" }}
      >
        命
      </span>
      <div className="mb-5 text-center">
        <p className="font-myeongjo text-[17px] font-bold" style={{ color: "#efe6d2" }}>
          장부는 이미 읽혔다 — 네 눈에만 잠겨 있을 뿐
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "#7d8496" }}>
          네 생년월일로 다시 계산해, 아래 빈칸을 채운다
        </p>
      </div>
      <div className="space-y-2.5">
        <Row label="타고난 재물그릇" value={<>▓▓점 / 100점</>} />
        <Row label="돈이 들어오는 달" value={<>20▓▓년 ▓월 · ▓월</>} />
        <Row label="인연이 들어오는 달" value={<>20▓▓년 ▓월 · ▓월</>} />
        <Row label="마음이 흔들리는 달" value={<>20▓▓년 ▓월</>} />
        <Row label="인생이 크게 바뀌는 해" value={<>▓▓▓▓년(▓▓세)</>} />
        <Row label="네 물음의 답" value={<>[산군의 직언] ▓▓▓▓</>} />
      </div>
      <div className="mt-4 text-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-myeongjo text-[13px] font-semibold"
          style={{ background: RED, color: "#f3e6cf", boxShadow: "0 4px 14px rgba(143,43,30,0.4)" }}
        >
          결제 후 전체가 열린다
        </span>
      </div>
    </button>
  );
}

// 후기·누적 숫자 — 값은 src/config/social-proof.ts 에서만 들고 온다.
// 비어 있으면 아무것도 그리지 않는다. 숫자 0이나 빈 카드가 노출되는 게 없느니만 못하다.
function SocialProofBlock() {
  const { totalUsers, totalReviews, reviews } = SOCIAL_PROOF;
  if (!hasSocialProof()) return null;
  return (
    <div className="px-5 py-4">
      {(totalUsers > 0 || totalReviews > 0) && (
        <p className="text-center font-myeongjo text-[13px] tracking-[0.06em]" style={{ color: "#9aa0b0" }}>
          {totalUsers > 0 && <>지금까지 <b style={{ color: GOLD }}>{formatCount(totalUsers)}</b>명이 장부를 열었다</>}
          {totalUsers > 0 && totalReviews > 0 && " · "}
          {totalReviews > 0 && <>후기 <b style={{ color: GOLD }}>{formatCount(totalReviews)}</b></>}
        </p>
      )}
      {reviews.length > 0 && (
        <ul className="mt-3 space-y-2">
          {reviews.map((r, i) => (
            <li key={i} className="rounded-md px-3.5 py-2.5" style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(201,162,39,0.16)" }}>
              <p className="text-[13px] leading-[1.75]" style={{ color: "#cfd0d8" }}>{r.body}</p>
              <p className="mt-1 text-[11px]" style={{ color: "#7d8496" }}>
                {r.handle}
                {r.when ? ` · ${r.when}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── 비주얼노벨 스토리(타이트 MZ무당 구조 이식) ─────────────────────
// 선택지는 장식(참여감 전용)이다 — 타이트도 스토리 선택지로는 아무것도 수집하지 않는다
// ("당황하며 주변을 둘러보기" 같은 반응뿐). 실제 질문은 전부 입력 단계에 몰려 있다.
// 2026-08-03: 연애·직업·인연 방향 수집을 되살렸고, 위치는 타이트와 같이 **입력 단계**다.
// 여기 씬 대사에서 "아무것도 묻지 않으마"를 뺀 이유도 그것 — 다음 화면에서 물으니 앞뒤가 맞아야 한다.

export function SangunStory({
  priceLabel,
  wizard,
  initialStage,
}: {
  priceLabel: string;
  wizard: React.ReactNode; // 몰입 위저드(immersive SajuWizard) — 입력 스테이지가 풀스크린으로 소유
  initialStage?: "main"; // ?view=detail — 광고를 세일즈 페이지로 직접 받을 때(page.tsx 주석 참고)
}) {
  const [stage, setStage] = useState<"gate" | "story" | "main" | "input">(initialStage ?? "gate");
  const [scene, setScene] = useState(0);
  const { on, toggle } = useShrineAmbience();
  const viewed = useRef(false);

  // 퍼널 첫 칸 — 게이트를 넘어 상품을 실제로 본 지점. 이게 없으면 "광고 클릭 → 게이트 이탈"과
  // "상품까지 보고 이탈"을 구분할 수 없다(게이트 이탈률이 이 세션 분석의 최대 미지수였다).
  // 전에는 세일즈 페이지 진입에서만 쐈다. 그 화면이 동선에서 빠지면서 스토리로 넘어간 손님이
  // 통째로 집계에서 사라지므로, 게이트를 벗어나는 **모든** 경로에서 한 번만 쏘게 바꿨다.
  useEffect(() => {
    if (stage === "gate" || viewed.current) return;
    viewed.current = true;
    track("product_view", { slug: "sangun-sinjeom" });
  }, [stage]);

  // (setStage("main") 로 가는 화면 안 경로는 없다 — 세일즈 페이지 입구는 ?view=detail 하나뿐이다)
  const toInput = () => {
    setStage("input");
    setTimeout(() => window.scrollTo(0, 0), 0);
  };

  // 로그인 왕복 복귀: 위저드 초안이 남아 있으면 게이트·스토리를 다시 태우지 않고 바로 입력 스테이지로
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("myeongunrok:order-wizard-draft");
      if (raw && (JSON.parse(raw) as { slug?: string })?.slug === "sangun-sinjeom") setStage("input");
    } catch {
      /* 무시 */
    }
  }, []);

  // ── 입장 게이트(MZ무당사주 구조) — 입장 전에는 이것만 보인다 ──
  if (stage === "gate") {
    return (
      <div className="world-sangun story-immersive relative min-h-screen w-full overflow-hidden" style={{ background: "#070609" }}>
        <BgMedia
          video="/products/sangun/gate.mp4"
          img="/products/sangun/gate.webp"
          alt="신당 문을 지나 제단 앞으로 들어가는 장면"
          className="absolute inset-0 h-full w-full object-cover opacity-95"
          loop={false}
        />
        {/* 첫 화면은 문이 주인공이다. 예전 값은 문과 빛줄기를 거의 검정으로 눌렀다(화면 밝기 8.6/11.2/7.5).
            글자는 위·아래 끝에만 있으므로 가운데(문)를 열어주고 위아래만 눌러 대비를 잡는다. */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(7,6,9,0.82) 0%, rgba(7,6,9,0.08) 40%, rgba(7,6,9,0.10) 58%, rgba(7,6,9,0.90) 100%)" }}
        />
        <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-between px-6 pb-10 pt-14 text-center">
          {/* 첫 화면은 '읽는 곳'이 아니라 '들어가는 곳'이다(타이트 게이트 = 검은 화면 + 입장 버튼뿐).
              헤드라인·상품 설명·신뢰 문구를 여기 얹으면 문이 뒤로 밀리고 세일즈 페이지가 된다.
              뺀 것들의 제자리: 상품 설명 → main 스테이지 / "만세력 계산에서 나온 달" → 티저(원국을 보여준 뒤라야 힘이 있다). */}
          <div>
            {/* 타이트 게이트 실측(2026-08-03): 브랜드·상품명·가격·설명이 전부 없고,
                대신 캐릭터가 1인칭으로 부르는 한 줄만 있다("나를 마주할 자신이 있다면 들어오거라").
                헤드라인을 다 걷어내되 그 한 줄은 남겨야 부르는 힘이 생긴다.
                브랜드는 바로 다음 스토리 화면 상단("명운록 · 신당")에서 노출된다. */}
            <h1 className="font-myeongjo text-[23px] font-bold leading-[1.75]" style={{ color: "#efe6d2" }}>
              네 운명은 이미 여기 적혀 있다.
              <br />
              <span style={{ color: GOLD }}>들어와라.</span>
            </h1>
          </div>

          <div className="w-full">
            <button
              type="button"
              onClick={toggle}
              className="mx-auto mb-4 flex items-center gap-2 rounded-full px-4 py-2 text-[13px]"
              style={{
                border: `1px solid ${on ? GOLD : "rgba(232,201,106,0.4)"}`,
                color: on ? GOLD : "#cfc6ae",
                background: "rgba(0,0,0,0.4)",
              }}
            >
              <span aria-hidden>{on ? "🔔" : "🔕"}</span>
              {on ? "방울 소리가 울리는 중" : "소리를 켜면 신당이 열린다 — 터치"}
            </button>
            <button
              type="button"
              onClick={() => setStage("story")}
              className="block w-full rounded-[6px] py-4 text-center font-bold tracking-[0.06em]"
              style={{
                background: `linear-gradient(135deg,#efe6d2,${GOLD} 60%,#a9861f)`,
                boxShadow: "0 8px 26px rgba(201,162,39,0.35), inset 0 1px 0 #ffe9a8",
                color: "#241a08",
                fontSize: 17,
              }}
            >
              신당으로 입장하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 스토리(비주얼노벨) — 4씬: 대면 → 직업 → 연애상태 → 생년월일 진입 ──
  if (stage === "story") {
    const scenes = [
      {
        img: "/products/sangun/altar.webp",
        video: "/products/sangun/altar.mp4",
        line: (
          <>
            …왔군.
            <br />
            <em className="not-italic" style={P}>네 장부</em>, 내가 먼저 봤다.
          </>
        ),
        choices: [
          { label: "(내 장부…?) 따라 들어간다", act: () => setScene(1) },
          { label: "무, 무슨 소리예요?", act: () => setScene(1) },
        ],
      },
      {
        img: "/products/sangun/altar.webp",
        video: "/products/sangun/altar.mp4",
        line: (
          <>
            몇 가지만 답해라.
            <br />
            장부와 <em className="not-italic" style={P}>맞춰볼 것이 있다.</em>
            <br />…겁먹었나.
          </>
        ),
        choices: [
          { label: "(아니라고 하고 싶다) 아니요", act: () => setScene(2) },
          { label: "(솔직하게) …조금요", act: () => setScene(2) },
        ],
      },
      {
        img: "/products/sangun/face.webp",
        video: "/products/sangun/face.mp4",
        line: (
          <>
            기다리고 있었다.
            <br />
            들을 <em className="not-italic" style={P}>준비는 됐나.</em>
          </>
        ),
        choices: [
          { label: "듣겠습니다", act: () => setScene(3) },
          { label: "(침을 꿀꺽 삼킨다)", act: () => setScene(3) },
        ],
      },
      {
        img: "/products/sangun/face.webp",
        video: "/products/sangun/face.mp4",
        line: (
          <>
            됐다. 장부를 펴려면
            <br />네 <em className="not-italic" style={P}>생년월일</em>이 필요하다.
          </>
        ),
        // 마지막 씬만 선택지가 하나다. 앞 씬들의 두 선택지는 같은 반응의 맛 차이라 어느 쪽을 골라도
        // 손해가 없지만, 여기는 스토리에서 유일하게 전환이 걸리는 칸이다. 둘로 나누면 목적지가 같은데
        // 의도가 다른 두 선택으로 읽혀 고민만 얹는다(형님 지적). 타이트도 마지막 씬은 버튼 하나다.
        //
        // 전에는 두 번째 선택지가 세일즈 페이지로 갔다. 도착하면 산군이 방금 한 인사("…왔군. 네 장부,
        // 내가 먼저 봤다")를 같은 그림으로 또 하고 자기소개를 다시 해서, 대화를 마친 손님이 처음 만난
        // 사람 취급을 받았다. 가격·목차·예시 결과지는 티저 아래로 옮겨 두었다.
        choices: [{ label: "생년월일 알려주기", act: toInput, primary: true }],
      },
    ] as { img: string; video: string; line: React.ReactNode; choices: { label: string; act: () => void; primary?: boolean }[] }[];
    const s = scenes[Math.min(scene, scenes.length - 1)];

    return (
      <div className="world-sangun story-immersive relative min-h-screen w-full overflow-hidden" style={{ background: "#070609" }}>
        <BgMedia video={s.video} img={s.img} alt="신당" className="absolute inset-0 h-full w-full object-cover opacity-85" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(7,6,9,0.55) 0%, rgba(7,6,9,0.15) 40%, rgba(7,6,9,0.94) 100%)" }}
        />
        <div key={scene} className="svc-fade relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-between px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] tracking-[0.22em]" style={{ color: GOLD, opacity: 0.85 }}>
              명운록 · 신당
            </span>
            {/* 스킵의 도착지도 입력이다(위 선택지 주석 참고). 광고 진입 랜딩으로서의 세일즈 페이지는
                URL 로 살아 있지만, 스토리를 탄 손님의 동선에서는 빠진다.
                마지막 씬에서는 숨긴다 — 바로 아래 금색 버튼과 목적지가 같은데 회색 잔글씨로 또 있으면
                "이건 뭐가 다르지" 하고 멈추는 자리가 된다. 갈 길이 남은 앞 씬에서만 지름길로 쓴다. */}
            {scene < scenes.length - 1 ? (
              <button type="button" onClick={toInput} className="px-2 py-1 text-[13px]" style={{ color: "#8b91a3" }}>
                건너뛰기 &gt;
              </button>
            ) : (
              <span aria-hidden />
            )}
          </div>

          <div>
            <div
              className="relative mb-3 rounded-[5px] px-5 py-4"
              style={{
                background: "linear-gradient(180deg,#f3ead6,#e9dec2)",
                border: "1px solid #c9b98e",
                boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
              }}
            >
              <span
                className="absolute -top-3 right-3 rounded-[2px] px-2.5 pb-[3px] pt-1 text-[11px] font-semibold tracking-[0.22em]"
                style={{ background: RED, color: "#f3e6cf" }}
              >
                박수
              </span>
              <p className="font-myeongjo text-[17px] font-semibold leading-[1.75] text-[#241d10]">{s.line}</p>
            </div>
            <div className="space-y-2">
              {s.choices.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={c.act}
                  className="block w-full rounded-[6px] px-4 py-3.5 text-center text-[15px] font-semibold"
                  style={
                    c.primary
                      ? {
                          background: `linear-gradient(135deg,#efe6d2,${GOLD} 60%,#a9861f)`,
                          color: "#241a08",
                          boxShadow: "0 8px 26px rgba(201,162,39,0.35)",
                        }
                      : {
                          background: "rgba(10,9,14,0.72)",
                          border: "1px solid rgba(232,201,106,0.38)",
                          color: "#e9e2cf",
                        }
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 입력 스테이지 — 씬과 같은 풀블리드(테두리·여백 없음). 상단 바만 오버레이 ──
  if (stage === "input") {
    return (
      <div className="world-sangun story-immersive relative w-full" style={{ background: "#070609" }}>
        {/* 상단은 표제만. '신당으로' 되돌아가기 버튼은 제거했다 —
            누르면 위저드가 언마운트돼 그때까지 입력한 값이 전부 날아갔고(초안 저장은 로그인 경로에만 걸려 있음),
            바로 아래 위저드 자체 '‹' 와 뒤로가기가 겹쳐 보였다. */}
        <div className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-[560px] items-center justify-center px-5 pt-4">
          <span className="text-[13px] tracking-[0.22em]" style={{ color: GOLD, opacity: 0.85 }}>
            명운록 · 박수무당 사주
          </span>
        </div>
        {wizard}
      </div>
    );
  }

  // ── 신당 내부(입장 후) ──────────────────────────────────────────
  return (
    <div className="world-sangun story-immersive min-h-screen w-full" style={{ background: INK_BG }}>
      <div className="mx-auto w-full max-w-[480px]">
        <header className="px-6 pb-5 pt-8 text-center">
          <a href="/" className="inline-block text-[13px] tracking-[0.22em]" style={{ color: GOLD }}>
            명운록 · 박수무당 사주
          </a>
          <p className="mt-4 text-[13px]" style={{ color: "#7d8496" }}>
            신당에 들었다 — 산군이 장부를 편다 · {priceLabel}
          </p>
        </header>

        {/* 컷1 — 제단 앞 박수(뒷모습): 대면. altar.mp4 가 도착하면 자동 영상화 */}
        <Cut src="/products/sangun/altar.webp" videoSrc="/products/sangun/altar.mp4" alt="촛불 제단 앞에 선 박수의 뒷모습" priority>
          <Bubble who="박수">
            …왔군.
            <br />
            <em className="not-italic" style={P}>네 장부</em>, 내가 먼저 봤다.
          </Bubble>
        </Cut>

        <div className="px-8 py-8 text-center">
          <p className="font-myeongjo text-[17px] leading-[1.75]" style={{ color: "#cfd0d8" }}>
            산군(山君) — 산신을 받든 박수.
            <br />
            얼굴을 들지 않고 명운록 서고의 <b style={{ color: GOLD }}>운명 장부</b>를 읽는 이.
          </p>
        </div>

        <ThreadDivider />

        {/* ▓ 장부 티저 */}
        <div className="px-5 py-4">
          <LedgerLock onOpen={toInput} />
          <p className="mt-2 text-center">
            <a href="#sample" className="text-[13px] underline underline-offset-2" style={{ color: SUB }}>
              먼저 예시 결과지를 보겠다 →
            </a>
          </p>
        </div>

        {/* 예시 결과지 */}
        <div id="sample" className="scroll-mt-4 px-5 py-4">
          <SampleCard />
        </div>

        <ThreadDivider />

        {/* 목차 */}
        <div className="px-5 py-4">
          <TocCard priceLabel={priceLabel} />
          <p className="mt-3 text-center text-[13px] leading-[1.75]" style={{ color: "#7d8496" }}>
            이번 달이 네 &lsquo;열리는 달&rsquo;일 수도 있다 — 지나간 달은 다음 계산에서 빠진다.
          </p>
        </div>

        {/* 소셜프루프 — src/config/social-proof.ts 에 값이 들어오면 그때 나온다(빈 껍데기 노출 방지) */}
        <SocialProofBlock />

        <ThreadDivider />

        {/* 컷2 — 갓 그림자 정면 + CTA. face.mp4 가 도착하면 자동 영상화 */}
        <Cut src="/products/sangun/face.webp" videoSrc="/products/sangun/face.mp4" alt="갓 그림자에 얼굴이 가려진 박수의 정면">
          <div className="absolute inset-x-4 bottom-4">
            <div
              className="relative mb-3 rounded-[5px] px-5 py-4"
              style={{
                background: "linear-gradient(180deg,#f3ead6,#e9dec2)",
                border: "1px solid #c9b98e",
                boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
              }}
            >
              <span
                className="absolute -top-3 right-3 rounded-[2px] px-2.5 pb-[3px] pt-1 text-[11px] font-semibold tracking-[0.22em]"
                style={{ background: RED, color: "#f3e6cf" }}
              >
                박수
              </span>
              <p className="font-myeongjo text-[17px] font-semibold leading-[1.75] text-[#241d10]">
                <em className="not-italic" style={P}>
                  네 장부,
                </em>
                <br />
                열어 보겠나.
              </p>
            </div>
            <button
              type="button"
              onClick={toInput}
              className="block w-full rounded-[6px] py-[18px] text-center font-bold tracking-[0.06em]"
              style={{
                background: `linear-gradient(135deg,#efe6d2,${GOLD} 60%,#a9861f)`,
                boxShadow: "0 8px 26px rgba(201,162,39,0.35), inset 0 1px 0 #ffe9a8",
                color: "#241a08",
                fontSize: 17,
              }}
            >
              내 운명 장부 열기
              <span className="mt-0.5 block text-[13px] font-normal opacity-80">
                {priceLabel} · 2분이면 끝 · 시각·성별·인연·하는 일까지 반영
              </span>
            </button>
            <p className="mt-2 text-center text-[13px]" style={{ color: SUB }}>
              결과지가 제대로 만들어지지 않으면 전액 환불해요. 결과지를 열기 전이면 7일 안에 취소돼요.
            </p>
          </div>
        </Cut>

        <SangunFaq className="px-5 pb-10 pt-4" />

        <StoryFooter />
      </div>
    </div>
  );
}
