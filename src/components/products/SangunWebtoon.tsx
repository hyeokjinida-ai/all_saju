"use client";

// "산군 신점" 포괄 메인 랜딩 — 타이트 MZ무당사주 구조 이식(2026-07-28 형님 지시).
// 스크롤 설득문이 아니라 "입장 의식": 사운드 게이트 → 신당 입장 → 박수 대면 → 장부 티저 → 페이월.
// 사운드는 파일 없이 Web Audio 합성(저음 바람 + 방울 딸랑) — 자산 의존 제거.
import { useEffect, useRef, useState } from "react";
import { StoryFooter } from "@/components/products/StoryFooter";
import { BgMedia } from "@/components/products/BgMedia";
import { SOCIAL_PROOF, hasSocialProof, formatCount } from "@/config/social-proof";

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
      <p className="font-myeongjo text-[17px] font-semibold leading-[1.8] text-[#241d10]">{children}</p>
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
      <span className="shrink-0 text-[14px]" style={{ color: SUB }}>
        {label}
      </span>
      <span className="text-right font-myeongjo text-[16.5px] font-bold tracking-[0.06em]" style={{ color: GOLD }}>
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
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-myeongjo text-[12.5px] font-semibold"
          style={{ background: RED, color: "#f3e6cf", boxShadow: "0 4px 14px rgba(143,43,30,0.4)" }}
        >
          결제 후 전체가 열린다
        </span>
      </div>
    </button>
  );
}

// 예시 결과지 — 실제 엔진 출력(1993-05-15 여) 그대로. 손으로 다듬지 않는다.
function SampleCard() {
  return (
    <div className="rounded-md p-6" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(201,162,39,0.2)" }}>
      <p className="mb-1 text-center font-myeongjo text-[15px] font-bold" style={{ color: "#efe6d2" }}>
        이렇게 나온다
      </p>
      <p className="mb-4 text-center text-[12px]" style={{ color: "#7d8496" }}>
        예시 · 1993년생 여성의 실제 결과지에서
      </p>
      <div className="space-y-3 text-[13.5px] leading-[1.85]" style={{ color: "#cfd0d8" }}>
        <p className="font-myeongjo text-[14px] font-bold" style={{ color: GOLD }}>
          3. 돈이 들어오는 달
        </p>
        <p>
          <b style={{ color: "#efe6d2" }}>재물그릇 점수는 65점</b>이다. 특히 <b style={{ color: "#efe6d2" }}>2027년 6월</b>과{" "}
          <b style={{ color: "#efe6d2" }}>2027년 5월</b>이 가장 기대되는 달이더군. 다만 <b style={{ color: "#efe6d2" }}>2027년 1월</b>은
          조심해야 할 달이니, 불필요한 지출을 줄이고 신중히 결정해라.
        </p>
        <div className="pt-1" style={{ borderTop: "1px dashed rgba(201,162,39,0.2)" }}>
          <p className="pt-2 font-myeongjo text-[14px] font-bold" style={{ color: GOLD }}>
            8. 네 물음에 답한다 — &ldquo;올해 이직해도 될까요&rdquo;
          </p>
          <p>
            <b style={{ color: "#efe6d2" }}>이직해도 좋다.</b> 올해는 변화의 때가 다가오고 있다. 이직 시점으로는… <span style={{ color: "#7d8496" }}>(결제 후 계속)</span>
          </p>
        </div>
      </div>
      <p className="mt-4 text-center text-[12px]" style={{ color: "#7d8496" }}>
        여기 적힌 달은 예시다. 네 달은 네 사주에서 다시 계산된다.
      </p>
    </div>
  );
}

// 후기·누적 숫자 — 값은 src/config/social-proof.ts 에서만 들고 온다.
// 비어 있으면 아무것도 그리지 않는다. 숫자 0이나 빈 카드가 노출되는 게 없느니만 못하다.
function SocialProofBlock() {
  const { totalUsers, totalReviews, reviews } = SOCIAL_PROOF;
  if (!hasSocialProof()) return null;
  return (
    <div className="px-5 pb-4 pt-1">
      {(totalUsers > 0 || totalReviews > 0) && (
        <p className="text-center font-myeongjo text-[12.5px] tracking-[0.04em]" style={{ color: "#9aa0b0" }}>
          {totalUsers > 0 && <>지금까지 <b style={{ color: GOLD }}>{formatCount(totalUsers)}</b>명이 장부를 열었다</>}
          {totalUsers > 0 && totalReviews > 0 && " · "}
          {totalReviews > 0 && <>후기 <b style={{ color: GOLD }}>{formatCount(totalReviews)}</b></>}
        </p>
      )}
      {reviews.length > 0 && (
        <ul className="mt-3 space-y-2">
          {reviews.map((r, i) => (
            <li key={i} className="rounded-md px-3.5 py-2.5" style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(201,162,39,0.16)" }}>
              <p className="text-[13px] leading-relaxed" style={{ color: "#cfd0d8" }}>{r.body}</p>
              <p className="mt-1 text-[11.5px]" style={{ color: "#7d8496" }}>
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

// 받는 것 — 9챕터 목차
function TocCard({ priceLabel }: { priceLabel: string }) {
  const rows: [string, string][] = [
    // 수위는 '중간 — 호기심만'(형님 결정). 타이트처럼 성적 표현·열등감 저격까지는 가지 않는다.
    ["1. 타고난 네 그릇", "남들은 못 보는 네 결 하나"],
    ["2. 올해 오는 것, 떠나는 것", "올해 네게서 빠져나갈 것 하나"],
    ["3. 돈이 들어오는 달", "몇 월인지 · 어디로 새는지"],
    ["4. 인연이 들어오는 달", "네 짝이 지나가는 달"],
    ["5. 일과 자리의 시기", "지금 움직일 때인지, 엎드릴 때인지"],
    ["6. 조심할 달", "네가 흔들리는 달 — 미리 알고 넘겨라"],
    ["7. 인생이 크게 바뀌는 해", "몇 살에 갈리는지, 그때 뭐가 달라지는지"],
    ["8. 네 물음의 답", "하라 · 말라로 답을 정해서"],
    ["9. 마지막 당부", "이번 주에 당장 할 것 셋"],
  ];
  return (
    <div className="rounded-md p-6" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(201,162,39,0.2)" }}>
      <p className="mb-4 text-center font-myeongjo text-[15px] font-bold" style={{ color: "#efe6d2" }}>
        받는 것 — 9장 · 확답 일곱 이상 · 앞으로 12개월 전부
      </p>
      <ul className="space-y-2.5">
        {rows.map(([t, d]) => (
          <li key={t} className="flex items-baseline justify-between gap-3 text-[13.5px]">
            <span style={{ color: "#cfd0d8" }}>{t}</span>
            <span className="text-right" style={{ color: "#7d8496" }}>
              {d}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-[13px]" style={{ color: SUB }}>
        {/* "점심 한 번 값"은 뺐다 — 4050 에게 '싸다'는 '부실하다'로 읽힌다(모의구매 3/3 이 거슬려 함).
            같은 리포의 재물 랜딩(WealthWebtoon.tsx:269)처럼 철학관 가격으로 상향 앵커를 건다. */}
        신당에 몸소 들면 복채가 <b style={{ color: GOLD }}>5만에서 20만</b>이다. 나는 서고에서 장부를 읽어 주니{" "}
        <b style={{ color: GOLD }}>{priceLabel}</b>만 받는다 — 몇 분 안에 도착 · 마이페이지에 계속 보관
      </p>
    </div>
  );
}

const FAQ: [string, string][] = [
  [
    "무서운 말이 나오지는 않나요?",
    "겁주는 풀이는 하지 않아요. 산군의 말투는 단호하지만, 조심할 달에는 반드시 대처법을 함께 일러주고 마지막은 해줄 일로 맺어요. 이별·사별 같은 단정은 아예 쓰지 않게 설계돼 있어요.",
  ],
  [
    "무료 사주랑 뭐가 다른가요?",
    "무료 사주는 '올해 좋은 일이 있겠네요'에서 끝나요. 여기서는 연도와 달을 집어서 확답해요. 돈이 들어오는 달, 인연이 들어오는 달, 인생이 크게 바뀌는 해까지 — 그 달들은 사람이 골라주는 게 아니라 만세력 계산에서 나와요.",
  ],
  [
    "왜 반말인가요?",
    "산군은 산신을 받든 박수예요. 신당에서 듣는 것처럼 단호한 반말로 확답하지만, 무례하게 하대하지는 않아요. 편하게 들으시면 돼요.",
  ],
  [
    "태어난 시각을 몰라요. 음력 생일만 알아요.",
    "둘 다 괜찮아요. 시각을 모르시면 '시각 몰라요'를 누르시면 태어난 날을 중심으로 풀어드리고, 음력을 고르시면 양력으로 정확히 바꿔서 사주를 세워요.",
  ],
  [
    "결제랑 제 생년월일은 안전한가요?",
    "토스페이먼츠 안전결제로 진행돼요. 적어주신 생년월일은 사주 계산과 결과지 만드는 데만 쓰고 광고에 쓰지 않아요. 결과지가 제대로 만들어지지 않으면 전액 돌려드리고, 결과지를 열기 전이면 7일 안에 취소돼요.",
  ],
];

// ── 비주얼노벨 스토리(타이트 MZ무당 구조 이식) ─────────────────────
// 선택지는 장식(참여감 전용)이다 — 타이트도 스토리 선택지로는 아무것도 수집하지 않는다
// ("당황하며 주변을 둘러보기" 같은 반응뿐). 실제 질문은 전부 입력 단계에 몰려 있다.
// 2026-08-03: 연애·직업·인연 방향 수집을 되살렸고, 위치는 타이트와 같이 **입력 단계**다.
// 여기 씬 대사에서 "아무것도 묻지 않으마"를 뺀 이유도 그것 — 다음 화면에서 물으니 앞뒤가 맞아야 한다.

export function SangunStory({
  priceLabel,
  wizard,
}: {
  priceLabel: string;
  wizard: React.ReactNode; // 몰입 위저드(immersive SajuWizard) — 입력 스테이지가 풀스크린으로 소유
}) {
  const [stage, setStage] = useState<"gate" | "story" | "main" | "input">("gate");
  const [scene, setScene] = useState(0);
  const { on, toggle } = useShrineAmbience();

  const toMain = () => {
    setStage("main");
    setTimeout(() => window.scrollTo(0, 0), 0);
  };
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
      <div className="story-immersive relative min-h-screen w-full overflow-hidden" style={{ background: "#070609" }}>
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
            <h1 className="font-myeongjo text-[22px] font-bold leading-[1.7]" style={{ color: "#efe6d2" }}>
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
              className="block w-full rounded-[6px] py-4 text-center font-bold tracking-[0.04em]"
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
        choices: [
          { label: "생년월일 알려주기", act: toInput, primary: true },
          { label: "장부에 뭐가 적혔는지 먼저 볼래", act: toMain },
        ],
      },
    ] as { img: string; video: string; line: React.ReactNode; choices: { label: string; act: () => void; primary?: boolean }[] }[];
    const s = scenes[Math.min(scene, scenes.length - 1)];

    return (
      <div className="story-immersive relative min-h-screen w-full overflow-hidden" style={{ background: "#070609" }}>
        <BgMedia video={s.video} img={s.img} alt="신당" className="absolute inset-0 h-full w-full object-cover opacity-85" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(7,6,9,0.55) 0%, rgba(7,6,9,0.15) 40%, rgba(7,6,9,0.94) 100%)" }}
        />
        <div key={scene} className="svc-fade relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-between px-5 pb-8 pt-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] tracking-[0.3em]" style={{ color: GOLD, opacity: 0.85 }}>
              명운록 · 신당
            </span>
            <button type="button" onClick={() => toMain()} className="px-2 py-1 text-[12.5px]" style={{ color: "#8b91a3" }}>
              건너뛰기 &gt;
            </button>
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
              <p className="font-myeongjo text-[17px] font-semibold leading-[1.8] text-[#241d10]">{s.line}</p>
            </div>
            <div className="space-y-2">
              {s.choices.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={c.act}
                  className="block w-full rounded-[6px] px-4 py-3.5 text-center text-[15px] font-semibold tracking-[0.02em]"
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
      <div className="story-immersive relative w-full" style={{ background: "#070609" }}>
        {/* 상단은 표제만. '신당으로' 되돌아가기 버튼은 제거했다 —
            누르면 위저드가 언마운트돼 그때까지 입력한 값이 전부 날아갔고(초안 저장은 로그인 경로에만 걸려 있음),
            바로 아래 위저드 자체 '‹' 와 뒤로가기가 겹쳐 보였다. */}
        <div className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-[560px] items-center justify-center px-5 pt-4">
          <span className="text-[12px] tracking-[0.3em]" style={{ color: GOLD, opacity: 0.85 }}>
            명운록 · 산군 신점
          </span>
        </div>
        {wizard}
      </div>
    );
  }

  // ── 신당 내부(입장 후) ──────────────────────────────────────────
  return (
    <div className="story-immersive min-h-screen w-full" style={{ background: INK_BG }}>
      <div className="mx-auto w-full max-w-[480px]">
        <header className="px-6 pb-5 pt-9 text-center">
          <a href="/" className="inline-block text-[13px] tracking-[0.4em]" style={{ color: GOLD }}>
            명운록 · 산군 신점
          </a>
          <p className="mt-4 text-[12.5px]" style={{ color: "#7d8496" }}>
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

        <div className="px-8 py-9 text-center">
          <p className="font-myeongjo text-[16px] leading-[1.9]" style={{ color: "#cfd0d8" }}>
            산군(山君) — 산신을 받든 박수.
            <br />
            얼굴을 들지 않고 명운록 서고의 <b style={{ color: GOLD }}>운명 장부</b>를 읽는 이.
          </p>
        </div>

        <ThreadDivider />

        {/* ▓ 장부 티저 */}
        <div className="px-5 pb-2 pt-3">
          <LedgerLock onOpen={toInput} />
          <p className="mt-2 text-center">
            <a href="#sample" className="text-[13px] underline underline-offset-2" style={{ color: SUB }}>
              먼저 예시 결과지를 보겠다 →
            </a>
          </p>
        </div>

        {/* 예시 결과지 */}
        <div id="sample" className="scroll-mt-4 px-5 pb-2 pt-6">
          <SampleCard />
        </div>

        <ThreadDivider />

        {/* 목차 */}
        <div className="px-5 pb-4 pt-3">
          <TocCard priceLabel={priceLabel} />
          <p className="mt-3 text-center text-[12.5px] leading-relaxed" style={{ color: "#7d8496" }}>
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
              <p className="font-myeongjo text-[17px] font-semibold leading-[1.8] text-[#241d10]">
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
              className="block w-full rounded-[6px] py-[18px] text-center font-bold tracking-[0.04em]"
              style={{
                background: `linear-gradient(135deg,#efe6d2,${GOLD} 60%,#a9861f)`,
                boxShadow: "0 8px 26px rgba(201,162,39,0.35), inset 0 1px 0 #ffe9a8",
                color: "#241a08",
                fontSize: 17,
              }}
            >
              내 운명 장부 열기
              <span className="mt-0.5 block text-[12.5px] font-normal opacity-80">
                {priceLabel} · 2분이면 끝 · 시각·성별·인연·하는 일까지 반영
              </span>
            </button>
            <p className="mt-2 text-center text-[12.5px]" style={{ color: SUB }}>
              결과지가 제대로 만들어지지 않으면 전액 환불해요. 결과지를 열기 전이면 7일 안에 취소돼요.
            </p>
          </div>
        </Cut>

        {/* FAQ */}
        <section className="px-5 pb-10 pt-4">
          <p className="mb-4 text-center font-myeongjo text-[15px] font-bold" style={{ color: "#efe6d2" }}>
            자주 묻는 물음
          </p>
          <ul className="divide-y" style={{ borderColor: "rgba(201,162,39,0.15)" }}>
            {FAQ.map(([q, a]) => (
              <li key={q} className="py-4" style={{ borderColor: "rgba(201,162,39,0.15)" }}>
                <p className="mb-1.5 font-myeongjo text-[15px] font-semibold" style={{ color: "#efe6d2" }}>
                  Q. {q}
                </p>
                <p className="text-[13.5px] leading-relaxed" style={{ color: "#cfd0d8" }}>
                  {a}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <StoryFooter />
      </div>
    </div>
  );
}
