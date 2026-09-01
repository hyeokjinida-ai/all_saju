"use client";

// 직녀의 결혼예보 상세페이지 — 청월당 시공법 1:1 클론.
//
// 베끼는 것은 **시공법**이다: 타입 스케일·색·여백·그라데이션·말풍선 규격·섹션 리듬.
// 그림·문장은 우리 것을 쓴다(13컷 슬롯 + 확정 카피).
//
// 수치 근거 — 청월당 재회비책 랜딩 캡처를 픽셀 분석한 값(375px 폭 환산):
//   훅 헤드 45.0px / 섹션 헤드 42.7·44.7 / 중간 강조 26.3·25.0 / 본문 15.3 / 각주 7.3~8.3
//   카드 좌우 여백 20px · 카드 폭 333px · 인용 말풍선 폭 263px(=70%)
//   바닥 #0c0c0c · 포인트 #fb38ac(→ 우리는 달빛 #d9c7e8) · 밝은 섹션 #faf2f7
// 그들 랜딩은 통이미지 18장이라 CSS 가 없다 — 그래서 눈이 아니라 픽셀에서 뜬 값이다.
//
// ⚠ 붉은 실은 쓰지 않는다. 청월당 연애 라인의 시그니처(캐릭터명 홍연·일러·목차·티저 도입 4곳)라
//    직녀가 쓰면 아류로 읽힌다.
import { PRODUCT_PITCH } from "@/config/product-pitch";
import {
  SlotCut,
  ComicSay,
  Hi,
  GlowBand,
  NeonMask,
  ScribbleLine,
  ScribbleStar,
  Narration,
  SilverThread,
} from "@/components/products/jiknyeo-ui";
import type { AssetMap } from "@/lib/jiknyeo-slots";

/** 섹션 리드 — 얇고 넓게. 헤드와 3배 이상 차이를 둬야 헤드가 선다(그들 공통 문법). */
function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-gothic text-center text-[13px] font-bold tracking-[0.2em]" style={{ color: "var(--bone-faint)" }}>
      {children}
    </p>
  );
}

/** 섹션 헤드 — 두껍고 좁게(실측 38~45px, 900, 자간 음수) */
function Head({ children, size = 38 }: { children: React.ReactNode; size?: number }) {
  return (
    <p
      className="font-gothic mt-3 text-center leading-[1.3] tracking-[-0.03em]"
      style={{ fontSize: size, fontWeight: 900, color: "var(--bone)" }}
    >
      {children}
    </p>
  );
}

/** 본문 — 15px/1.75 (실측 15.3) */
function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-myeongjo mt-4 text-center text-[15px] leading-[1.75]" style={{ color: "var(--bone-soft)" }}>
      {children}
    </p>
  );
}

/** 손님 고민 인용 — 폭 70% 편향 배치(실측 263/375).
 *  ⚠ 일주 배지·이름은 넣지 않는다. 실손님이 0명인데 인물을 만들면 가짜 후기와 같은 선이 된다. */
function AskBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex justify-start">
      <div
        className="rounded-[16px] px-4 py-3"
        style={{ width: "70%", background: "rgba(217,199,232,0.12)", border: "1px solid var(--gold-line)" }}
      >
        <p className="font-myeongjo text-[15px] leading-[1.7]" style={{ color: "var(--bone-soft)" }}>
          {children}
        </p>
      </div>
    </div>
  );
}

/** 밝은 섹션 — 풀블리드로 깔아 색으로 장을 가른다(그들은 검정↔크림 교차로 리듬을 만든다) */
function CreamBand({ children }: { children: React.ReactNode }) {
  return (
    <section className="px-5 py-14" style={{ background: "linear-gradient(180deg,#f3ead6,#e9dec2)" }}>
      {children}
    </section>
  );
}

export function JiknyeoDetail({
  assets,
  priceLabel,
  compareLabel,
  children,
}: {
  assets?: AssetMap;
  priceLabel: string;
  compareLabel?: string;
  children: React.ReactNode; // 입력 위저드(#start) — CTA 가 여기로 스크롤한다
}) {
  const pitch = PRODUCT_PITCH["marriage-saju"];
  return (
    <div className="world-jiknyeo story-immersive min-h-screen w-full" style={{ background: "#0b0f1a" }}>
      <div className="mx-auto w-full max-w-[520px]">
        {/* ── 1. 훅 — 검정 + 글로우. 리드 → 헤드 40px → 형광박스 ── */}
        <header className="px-5 pb-10 pt-12">
          <p className="font-myeongjo text-center text-[13px] tracking-[0.22em]" style={{ color: "var(--gold-bright)" }}>
            {pitch.eyebrow}
          </p>
          <div className="mt-8">
            <GlowBand>
              <Lead>{pitch.headline[0]}</Lead>
              <p
                className="font-gothic mt-3 text-center leading-[1.25] tracking-[-0.03em]"
                style={{ fontSize: 40, fontWeight: 900, color: "var(--bone)" }}
              >
                결혼하는 해는
                <br />
                <span
                  className="mt-2 inline-block rounded-[6px] px-3 py-1"
                  style={{ background: "var(--gold-bright)", color: "#1a1330" }}
                >
                  정해져 있어요
                </span>
              </p>
            </GlowBand>
          </div>
          <Body>사람이 지어낸 말이 아니라, 만세력 계산에서 나온 해예요.</Body>
        </header>

        {/* ── 2. 손실 — 모르고 지나간 해 ── */}
        <SlotCut id="w6" assets={assets} overlay={<Narration>몇 해가, 그냥 지나갔어요.</Narration>} />
        <section className="px-5 py-12">
          <Lead>때 되면 하겠지</Lead>
          <Head>
            그 때가
            <br />
            언제인지 모른 채
          </Head>
          <Body>
            준비를 시작할 해도, 말을 꺼낼 달도
            <br />
            아무도 알려주지 않았으니까요.
          </Body>
        </section>

        {/* ── 3. 반전 — 결과는 공개하고 값을 가린다(그들 모자이크 방향 그대로) ── */}
        <section className="px-5 pb-14">
          <GlowBand>
            <Lead>그런데</Lead>
            <Head size={34}>
              당신이 결혼하는 해는
              <br />
              이미 정해져 있어요
            </Head>
            <div className="mt-7 text-center">
              <NeonMask text="○○○○년" />
            </div>
            <p className="font-myeongjo mt-4 text-center text-[15px]" style={{ color: "var(--bone-soft)" }}>
              그 해가 <Hi>몇 년도인지</Hi>, 사주에 적혀 있거든요.
            </p>
          </GlowBand>
        </section>

        {/* ── 4. 증거 — 우리가 가진 진짜 증거는 계산이다(가짜 후기·집계 없음) ── */}
        <CreamBand>
          <p className="font-gothic text-center text-[13px] font-bold tracking-[0.2em]" style={{ color: "#8a7f66" }}>
            사람이 고른 게 아니에요
          </p>
          <p
            className="font-gothic mt-3 text-center leading-[1.3] tracking-[-0.03em]"
            style={{ fontSize: 30, fontWeight: 900, color: "#241d10" }}
          >
            만세력 계산에서
            <br />
            나온 해예요
          </p>
          <div className="mt-7 rounded-md bg-white/70 px-4 py-5" style={{ border: "1px solid rgba(36,29,16,0.14)" }}>
            <p className="font-myeongjo text-center text-[13px]" style={{ color: "#6b6350" }}>
              생년월일에서 세운 여덟 글자
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                ["해", "癸"],
                ["달", "丁"],
                ["나", "丙"],
                ["시", "乙"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-[4px] py-3" style={{ background: "rgba(36,29,16,0.06)" }}>
                  <p className="font-myeongjo text-[11px]" style={{ color: "#8a7f66" }}>
                    {k}
                  </p>
                  <p className="font-myeongjo text-[24px] font-bold" style={{ color: "#241d10" }}>
                    {v}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px]" style={{ color: "#8a7f66" }}>
              * 예시예요. 당신 여덟 글자는 생년월일로 다시 세워요.
            </p>
          </div>
        </CreamBand>

        {/* ── 5. 전환 — 캐릭터가 처음 말을 건다 ── */}
        <SlotCut
          id="j1"
          assets={assets}
          overlay={
            <ComicSay>
              몇 년도인지, 알려드릴게요.
              <br />
              그 해 안에서 서두를 달까지요.
            </ComicSay>
          }
        />

        {/* ── 6. 목차 — 한자 근거는 작게, 손님 이득은 크게(그들 목차 문법) ── */}
        <section className="px-5 py-14">
          <Lead>받는 것</Lead>
          <Head size={30}>10개 챕터</Head>
          <ul className="mt-8 space-y-4">
            {[
              ["日干 · 日支", pitch.includes[0]],
              ["歲運 · 月運", pitch.includes[1]],
              ["官星 · 財星", pitch.includes[2]],
              ["合 · 沖 · 刑", pitch.includes[3]],
              ["五行 · 用神", pitch.includes[4]],
            ].map(([badge, text]) => (
              <li
                key={text}
                className="rounded-md px-4 py-4"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--gold-line)" }}
              >
                <p className="font-myeongjo text-[11px] tracking-[0.15em]" style={{ color: "var(--gold-soft)" }}>
                  {badge}
                </p>
                <p className="font-gothic mt-1.5 text-[17px] font-bold leading-[1.5]" style={{ color: "var(--bone)" }}>
                  {text}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-center">
            <span
              className="font-myeongjo inline-block rounded-full px-4 py-1.5 text-[13px]"
              style={{
                background: "rgba(217,199,232,0.12)",
                border: "1px solid var(--gold-line)",
                color: "var(--gold-bright)",
              }}
            >
              A4 여덟 쪽 · 다 읽는 데 열다섯 분
            </span>
          </p>
        </section>

        <SilverThread />

        {/* ── 7. 캐릭터 소개 ── */}
        <SlotCut
          id="j3"
          assets={assets}
          overlay={<Narration>날을 세며 기다린 여자가, 당신 달력을 봅니다.</Narration>}
        />

        {/* ── 8. 손님 고민 인용 + 직녀가 직접 대답 ── */}
        <section className="px-5 py-14">
          <Lead>이런 마음이라면</Lead>
          <Head size={28}>여기서 답을 찾으세요</Head>
          <div className="mt-8">
            {pitch.pains.map((p) => (
              <AskBubble key={p}>{p}</AskBubble>
            ))}
          </div>
          <div className="mt-7">
            <ComicSay>
              그 마음, 미룬 게 아니라
              <br />
              <Hi>때를 몰랐던 거예요.</Hi>
            </ComicSay>
          </div>
        </section>

        {/* ── 9. 가격 앵커 — 사실 범위만. 가짜 비교·가짜 집계 없음 ── */}
        <CreamBand>
          <p className="font-gothic text-center text-[13px] font-bold tracking-[0.2em]" style={{ color: "#8a7f66" }}>
            같은 답을 다른 데서 들으면
          </p>
          <div className="mt-6 space-y-2">
            {[
              ["철학관·점집 대면", "5만 ~ 30만원"],
              ["전화 상담", "회당 3만 ~ 10만원"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-[4px] px-4 py-3"
                style={{ background: "rgba(36,29,16,0.06)" }}
              >
                <span className="font-myeongjo text-[15px]" style={{ color: "#4a4231" }}>
                  {k}
                </span>
                <span className="font-myeongjo text-[15px] font-bold" style={{ color: "#241d10" }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
          <p className="font-gothic mt-6 text-center text-[13px] font-bold tracking-[0.2em]" style={{ color: "#8a7f66" }}>
            직녀의 결혼예보
          </p>
          <p className="mt-2 text-center">
            {compareLabel && (
              <span className="font-myeongjo mr-2 text-[17px] line-through" style={{ color: "#a2977f" }}>
                {compareLabel}
              </span>
            )}
            <span className="font-gothic text-[34px] tracking-[-0.03em]" style={{ fontWeight: 900, color: "#241d10" }}>
              {priceLabel}
            </span>
          </p>
          <p className="mt-2 text-center text-[13px]" style={{ color: "#6b6350" }}>
            점심 한 번 값 · 몇 분 안에 도착 · 마이페이지에 보관
          </p>
        </CreamBand>

        {/* ── 10. 마지막 CTA — 아래 위저드로 내린다 ── */}
        <SlotCut
          id="w7"
          assets={assets}
          overlay={
            <ComicSay>
              당신이 결혼하는 해,
              <br />
              지금 확인해요.
            </ComicSay>
          }
        />
        <section className="px-5 py-12 text-center">
          <ScribbleStar />
          <a
            href="#start"
            className="mt-4 flex min-h-[58px] w-full items-center justify-center text-[17px] font-bold tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-serif-kr), serif",
              background: "linear-gradient(180deg,#efeaf6,#d9c7e8)",
              color: "#1a1330",
              boxShadow: "0 8px 26px rgba(217,199,232,0.3)",
            }}
          >
            내 결혼하는 해 확인하기
          </a>
          <ScribbleLine className="mt-1" />
        </section>

        {/* ── 11. 입력 위저드 — 이 페이지가 소유한다(상세 → 게이트로 보내면 훅을 두 번 읽는다) ── */}
        <section id="start" className="scroll-mt-4 px-5 pb-16">
          {children}
        </section>
      </div>
    </div>
  );
}
