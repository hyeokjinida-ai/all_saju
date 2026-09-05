import Link from "next/link";
import { Moon } from "@/components/products/JiknyeoForecast";
import { StoryFooter } from "@/components/products/StoryFooter";
import { outlineTitles } from "@/lib/saju/prompt";

// 견우(재회) 광고 착지 랜딩 — 2026-09-04 신설.
//
// 왜 만들었나: `/products/reunion-saju` 위쪽이 공용 보라 템플릿(命 · 상품명 + 결과지 미리보기 블러)
// 이었다. 화자는 견우인데 착지 화면엔 세계관이 한 줄도 없어, 광고를 보고 온 손님이
// 티저에서 처음으로 견우를 만나게 된다 — 설득이 시작되는 자리가 비어 있었다.
//
// 문법은 직녀 스크롤 랜딩(JiknyeoLanding)을 따른다: 히어로 → 짧은 나레이션 → 실물(격자) →
// 목차 전량 공개 → 가격 → CTA → 법정 표기. 다른 건 **세계관과 각**뿐이다.
//   직녀 = 아직 안 만난 인연 / 견우 = 이미 만났다가 끊긴 사람. 죄책감 해제가 첫 블록이다.
//
// 카피 규칙(2026-09-02 형님 지시 · 전역):
//   ① 쉬운 말만 — 작가말·비유 남발 금지. 상품을 말하는 순간부터는 직설.
//   ② 분량 앵커(글자수·쪽수·읽는 시간) 금지. 가격 앵커만 남긴다.
//   ③ **구체 연·월 숫자 금지** — 아직 손님 명식이 없다. 12칸 격자에 달 이름을 안 쓰는 이유다.
//   ④ 말투는 견우: 담백한 존댓말(~합니다/~요). 재촉·압박·느끼한 말 금지(GYEONU_VOICE 와 한 벌).
//
// ⚠ 직녀 그림(j1·w1 등 13컷 슬롯)은 한 장도 안 쓴다. 화자가 다른데 직녀 얼굴이 나오면
//    그게 제일 큰 사고다(gyeonu-teaser.tsx 와 같은 금기). 이 랜딩의 그림은 히어로 한 장뿐이다.

/* ── 팔레트 — 밤강·은하수. 직녀의 달빛 보라와 갈라 둔다 ────── */
const INK = "linear-gradient(180deg,#070a12 0%,#0f1524 55%,#131a2c 100%)";
const SCRIM =
  "linear-gradient(180deg, rgba(6,8,15,0.30) 0%, rgba(6,8,15,0) 26%, rgba(6,8,15,0) 46%, rgba(6,8,15,0.96) 100%)";
const STAR = "#cfd6e6"; // 은하수 — 강조
const BONE = "#e9ecf4";
const SUB = "#93a0b8";
const LINE = "rgba(207,214,230,0.22)";

/** 히어로 그림 — 견우 확정 얼굴(견우/fin-face.png)을 1080폭 webp 로 구운 것. 원본 png 는 커밋 안 한다.
 *  세로 5:6 인 이유(2026-09-05 실측): 말풍선이 아래 37% 를 덮는다. 3:2 로 자르면 입과 손이 통째로
 *  가려 눈만 남았다. 5:6 으로 키우니 눈·손·고삐끈이 다 살고 첫 CTA 도 폴드(812) 안에 남는다. */
const HERO = "/products/reunion/gyeonu-hero.webp";
const HERO_W = 1080;
const HERO_H = 1200;

/** CTA 는 전부 이 페이지 아래 위저드로 내린다(#start). 다른 상품으로 새 나가지 않는다. */
const CTA_HREF = "#start";

/* ── 부품 ───────────────────────────────────────── */

// 견우 대사 — 그림 위에 얹는 말. 캐릭터 대사는 본문(15)보다 큰 17px (조판 위계)
function Say({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-4 bottom-4">
      <div
        className="rounded-[6px] px-5 py-4"
        style={{ background: "rgba(7,10,18,0.72)", border: `1px solid ${LINE}`, backdropFilter: "blur(2px)" }}
      >
        <p className="font-myeongjo text-[17px] leading-[1.75]" style={{ color: BONE }}>
          {children}
        </p>
      </div>
    </div>
  );
}

// 나레이션 — 19px. 화자가 아니라 이야기가 말하는 자리
function Narration({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-10 text-center">
      <p className="font-myeongjo text-[19px] leading-[1.85]" style={{ color: "#cfd0d8" }}>
        {children}
      </p>
    </div>
  );
}

// 은하수 디바이더 — 직녀의 은사(SilverThread)와 같은 자리, 다른 그림(강물 한 줄기)
function StarStream() {
  return (
    <div aria-hidden className="flex justify-center py-2">
      <svg width="14" height="72" viewBox="0 0 14 72" fill="none">
        <path d="M7 0 C 3 16, 11 26, 7 36 C 3 46, 11 58, 7 72" stroke={STAR} strokeOpacity="0.5" strokeWidth="1.2" />
        <circle cx="7" cy="12" r="1.1" fill={STAR} fillOpacity="0.85" />
        <circle cx="7" cy="36" r="2.1" fill={STAR} fillOpacity="0.9" />
        <circle cx="7" cy="60" r="1.1" fill={STAR} fillOpacity="0.85" />
      </svg>
    </div>
  );
}

function Cta({ label, note }: { label: string; note: string }) {
  return (
    <div className="px-5">
      <a
        href={CTA_HREF}
        className="flex min-h-[56px] w-full items-center justify-center rounded-[6px] py-4 font-myeongjo text-[17px] font-semibold tracking-[0.04em]"
        style={{ background: "linear-gradient(180deg,#f2f5fb,#cfd6e6)", color: "#101827" }}
      >
        {label}
      </a>
      <p className="mt-2.5 text-center text-[12px]" style={{ color: SUB }}>
        {note}
      </p>
    </div>
  );
}

/* ── 12칸 격자(정적 보기) ─────────────────────────
   ⚠ 달 이름(1월·2월…)을 **안 쓴다.** 아직 손님 명식이 없는 자리라 숫자를 박으면
   ① 광고 카피 금지(구체 연·월) 위반이고 ② 확정값처럼 읽힌다(8/24 처음눈 검수에서
   예보판이 예시인지 내 것인지 안 밝혀 잡혔던 것과 같은 병). 칸은 열두 개라는 것만 보이면 된다.
   표시는 티저·결과지와 **같은 자**(Moon phase)를 쓴다 — 여기서 새 기호를 만들면 뒤에서 안 맞는다. */
const SAMPLE_12: ("full" | "half" | "cres" | "cloud")[] = [
  "cres", "cloud", "half", "cres",
  "full", "cres", "cloud", "half",
  "cres", "full", "cloud", "half",
];

const LEGEND: { p: "full" | "half" | "cloud"; label: string; desc: string }[] = [
  { p: "full", label: "다리가 놓이는 달", desc: "다시 이어지는 자리가 열립니다" },
  { p: "half", label: "연락해도 되는 달", desc: "보낸 말이 그대로 닿습니다" },
  { p: "cloud", label: "먼저 연락하면 안 되는 달", desc: "보낸 말이 반대로 갑니다" },
];

function ReunionGridPreview() {
  return (
    <div className="px-5 py-2">
      <div className="rounded-md p-5" style={{ background: "rgba(255,255,255,0.035)", border: `1px solid ${LINE}` }}>
        <p className="text-center font-myeongjo text-[17px] font-bold" style={{ color: BONE }}>
          재회 예보
        </p>
        <p className="mt-1.5 text-center text-[12px]" style={{ color: SUB }}>
          보기 화면입니다 — 생일을 넣으면 내 열두 달로 바뀝니다
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {SAMPLE_12.map((p, i) => {
            const big = p === "full";
            return (
              <div
                key={i}
                className="flex items-center justify-center rounded-[9px] py-3"
                style={
                  big
                    ? { background: "rgba(207,214,230,0.16)", border: `1.5px solid ${STAR}` }
                    : { background: "rgba(255,255,255,0.04)", border: `1px solid ${LINE}` }
                }
              >
                <Moon phase={p} size={28} />
              </div>
            );
          })}
        </div>

        <ul className="mt-5 space-y-3 border-t pt-4" style={{ borderColor: LINE }}>
          {LEGEND.map((l) => (
            <li key={l.label} className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0">
                <Moon phase={l.p} size={22} />
              </span>
              <span className="text-[14px] leading-[1.6]">
                <b style={{ color: BONE }}>{l.label}</b>
                <br />
                <span style={{ color: SUB }}>{l.desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── 본체 ───────────────────────────────────────── */

export function GyeonuLanding({
  priceLabel,
  compareLabel,
  children,
}: {
  priceLabel: string;
  compareLabel?: string;
  /** 입력 위저드(#start) — CTA 가 여기로 내린다. 페이지가 소유하고 이 랜딩은 자리만 판다. */
  children: React.ReactNode;
}) {
  // 목차는 **결과지 아우트라인에서 직접 가져온다**(prompt.ts). 손으로 옮겨 적으면
  // 장이 바뀌었을 때 랜딩만 옛말을 하게 된다 — 그게 그대로 거짓말이 된다.
  const toc = outlineTitles("reunion-saju");

  return (
    // world-jiknyeo: 아래로 주입되는 위저드·티저가 쓰는 세계관 변수(먹빛·은청) 한 벌.
    // story-immersive: 위저드 무대(보라 코스모스)를 먹빛으로 눌러 이질감을 없앤다.
    <div className="world-jiknyeo story-immersive min-h-screen w-full" style={{ background: INK }}>
      <div className="mx-auto w-full max-w-[520px] pb-10">
        {/* ── 1. 히어로 — 견우와 은하수. 첫 마디는 인사가 아니라 「나도 기다리는 쪽」이다
               (GYEONU_VOICE 의 첫 마디 규칙과 같은 순서: 나도 기다린다 → 그러니 안다). ── */}
        <div className="relative w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO}
            alt="은하수 아래 강 건너를 보는 견우"
            // 치수를 준다 — 없으면 로드 전 높이가 0 이라 첫 화면이 읽는 도중에 자란다
            // (직녀 랜딩 실측: 이미지가 뜨면서 페이지가 +42% 자랐다).
            width={HERO_W}
            height={HERO_H}
            fetchPriority="high"
            className="block h-auto w-full"
          />
          <div className="pointer-events-none absolute inset-0" style={{ background: SCRIM }} />
          <div className="absolute inset-x-0 top-5 text-center">
            <p className="font-brush text-[16px] tracking-[0.34em]" style={{ color: STAR, opacity: 0.92 }}>
              견 우
            </p>
          </div>
          <Say>
            저도 일 년에 하루, 강 건너를 봅니다.
            <br />
            기다리는 마음은 <b style={{ color: STAR }}>압니다.</b>
          </Say>
        </div>

        {/* 첫 CTA 는 폴드 안에 둔다 — 히어로가 화면을 다 먹으면 첫 화면에 누를 것이 없다(직녀 실측). */}
        <div className="pt-7">
          <Cta label="무료로 먼저 보기" note="결제 없이 볼 수 있습니다 · 생일만 있으면 됩니다" />
        </div>

        <StarStream />

        {/* ── 2. 죄책감 해제 — 이 상품의 첫 일이다. 다만 없는 꺾임을 지어내지 않는다는 것까지
               같은 자리에서 말한다(reunion.ts breakupCheck 가 실제로 그렇게 갈린다). ── */}
        <Narration>
          그날 강이 갈라진 건
          <br />
          <b style={{ color: STAR }}>당신이 모자라서가 아닙니다.</b>
          <br />
          <br />
          그 무렵 두 사람 흐름이 같이 꺾여 있었는지부터 봅니다.
          <br />
          꺾여 있지 않았으면, 그렇다고 말합니다.
        </Narration>

        <StarStream />

        {/* ── 3. 핵심 약속 — 이 상품이 파는 것 한 줄. 열두 달을 두 갈래로 가른다 ── */}
        <div className="px-5 py-4">
          <p className="text-center font-myeongjo text-[19px] leading-[1.7]" style={{ color: BONE }}>
            연락해도 되는 달이 있고,
            <br />
            <b style={{ color: STAR }}>먼저 연락하면 안 되는 달</b>이 있습니다.
          </p>
          <p className="mt-3 text-center text-[15px] leading-[1.8]" style={{ color: "#cfd0d8" }}>
            지금이 어느 쪽인지부터 봅시다.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <div className="rounded-md p-4" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${LINE}` }}>
              <p className="font-myeongjo text-[15px] font-bold" style={{ color: STAR }}>
                연락해도 되는 달
              </p>
              <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: SUB }}>
                첫 줄을 뭐라고 열지, 무엇을 묻지 말지까지 적어 드립니다
              </p>
            </div>
            <div className="rounded-md p-4" style={{ background: "rgba(0,0,0,0.28)", border: `1px solid ${LINE}` }}>
              <p className="font-myeongjo text-[15px] font-bold" style={{ color: BONE }}>
                먼저 연락하면
                <br />
                안 되는 달
              </p>
              <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: SUB }}>
                왜 반대로 가는지 말씀드리고, 대신 할 것을 드립니다
              </p>
            </div>
          </div>
        </div>

        {/* ── 4. 12칸 격자(보기) — 주장 바로 뒤라야 실물로 받아친 게 된다 ── */}
        <ReunionGridPreview />

        <StarStream />

        {/* ── 5. 정직 판정 — 재회 레인 최강 장치의 우리 판(거절 대신 정직 판정 + 다음 길) ── */}
        <div className="px-5 py-4">
          <div className="rounded-md p-6" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${LINE}` }}>
            <p className="font-myeongjo text-[19px] leading-[1.75]" style={{ color: BONE }}>
              가능성이 낮으면
              <br />
              <b style={{ color: STAR }}>낮다고 말합니다.</b>
            </p>
            <p className="mt-3 text-[15px] leading-[1.8]" style={{ color: "#cfd0d8" }}>
              대신 그다음까지 같이 봅니다. 듣기 좋은 말로 달래 놓고 끝내지 않습니다.
            </p>
          </div>
        </div>

        <StarStream />

        {/* ── 6. 목차 — 전량 공개. 잠그는 건 목차가 아니라 내용이다(청월당 방식) ──
             ⚠ 제목은 prompt.ts 아우트라인에서 직접 온다. 여기 손으로 적지 말 것. */}
        <div className="px-5 py-4">
          <div className="rounded-md p-6" style={{ background: "rgba(255,255,255,0.035)", border: `1px solid ${LINE}` }}>
            <p className="mb-4 text-center font-myeongjo text-[15px] font-bold" style={{ color: BONE }}>
              받으시는 것 — 열 장
            </p>
            <ul className="space-y-2.5 text-[13px]">
              {toc.map((t, i) => (
                <li key={t} className="flex items-baseline gap-3">
                  <span className="font-myeongjo" style={{ color: STAR }}>
                    {i + 1}장
                  </span>
                  <span style={{ color: "#cfd0d8" }}>{t}</span>
                </li>
              ))}
            </ul>

            {/* ── 7. 가격 — 분량 앵커는 안 쓴다. 남기는 앵커는 정가 하나뿐이다 ── */}
            <div className="mt-5 border-t pt-4" style={{ borderColor: LINE }}>
              <p className="text-center text-[13px]" style={{ color: SUB }}>
                {compareLabel && <s className="mr-1.5 opacity-70">{compareLabel}</s>}
                <b className="text-[15px]" style={{ color: STAR }}>
                  {priceLabel}
                </b>
                {" — 몇 분 안에 도착 · 마이페이지에 보관"}
              </p>
            </div>
          </div>
        </div>

        {/* ── 8. 마지막 CTA — 가격을 본 다음이라 여기에만 결제 문구를 붙인다 ── */}
        <div className="pt-6">
          <Cta
            label="내 열두 달 보러 가기"
            note="토스페이먼츠 안전결제 · 결과지가 제대로 안 나오면 전액 돌려드립니다"
          />
        </div>

        {/* ── 9. 입력 위저드 — 이 페이지가 소유한다(다른 화면으로 보내면 훅을 두 번 읽힌다).
               ⚠ 위저드에는 **좌우 여백을 주지 않는다.** 위저드·티저가 자기 여백을 이미 들고 있어서
                 한 겹 더 씌우면 티저 카드가 그만큼 좁아진다(실측 2026-09-04: px-5 를 씌웠더니
                 티저 섹션이 인연 318px 대비 278px 로 40px 좁았다 — 카드 여백 규격이 통째로 어긋난다). */}
        <section id="start" className="mt-12 scroll-mt-4">
          <div className="px-5">
            <h2 className="mb-2 text-center font-myeongjo text-lg font-semibold" style={{ color: BONE }}>
              여기서부터 같이 봅시다
            </h2>
            <p className="mb-3 text-center text-sm" style={{ color: SUB }}>
              하나씩만 답하시면 됩니다 — 2분이면 됩니다.
            </p>
            <p className="mb-4 text-center text-[13px] leading-relaxed" style={{ color: SUB }}>
              <span style={{ color: STAR }}>✓</span> 태어난 시각 몰라도 됩니다&nbsp;&nbsp;
              <span style={{ color: STAR }}>✓</span> 음력 생일만 알아도 됩니다&nbsp;&nbsp;
              <span style={{ color: STAR }}>✓</span> 마이페이지에 보관됩니다
            </p>
          </div>

          {children}

          {/* 안심 — 리스크 역전. 공용 startSection 의 해요체 대신 견우 말로 다시 쓴다
              (화자가 다른데 같은 화면에서 말투가 갈리면 그 자리에서 캐릭터가 깨진다). */}
          <div className="px-5">
            <div
              className="mt-6 rounded-md p-5"
              style={{ background: "rgba(255,255,255,0.035)", border: `1px solid ${LINE}`, boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}
            >
              <p className="mb-3 text-center font-myeongjo text-[15px] font-bold tracking-[0.06em]" style={{ color: STAR }}>
                안심하셔도 됩니다
              </p>
              <ul className="space-y-2.5 text-[13px] leading-relaxed" style={{ color: "#cfd0d8" }}>
                {[
                  "결과지가 제대로 만들어지지 않으면 전액 돌려드립니다",
                  "결과지를 열기 전이면, 구매 후 7일 안에 취소하실 수 있습니다",
                  "적어 주신 것은 사주 계산에만 쓰고, 마이페이지에 보관됩니다",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="shrink-0" style={{ color: STAR }}>
                      ✓
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                href="/legal/refund-policy"
                className="mt-3 inline-block text-xs underline underline-offset-2"
                style={{ color: SUB }}
              >
                환불 안내 자세히 →
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* 법정 표기 — 이 라우트는 크롬을 떼고 받는다(ChromeGate). 떼기만 하면 사업자 정보·약관·
          개인정보·환불정책이 통째로 사라지므로 직녀 랜딩과 같은 자체 푸터를 세운다. */}
      <div className="mx-auto w-full max-w-[520px]">
        <StoryFooter />
      </div>
    </div>
  );
}
