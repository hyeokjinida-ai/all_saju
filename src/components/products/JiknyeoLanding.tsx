import Link from "next/link";
import { BgMedia } from "@/components/products/BgMedia";
import type { AssetMap, SlotId } from "@/lib/jiknyeo-assets";
import { SLOTS } from "@/lib/jiknyeo-assets";
import { ForecastBoard, ChartEvidence } from "@/components/products/JiknyeoForecast";
import { StoryFooter } from "@/components/products/StoryFooter";

// 직녀 스크롤 랜딩 (/jiknyeo · noindex · 사이트맵 제외 · 어디에도 링크하지 않는다).
//
// ⚠ 2026-08-22 역할 변경: **콜드 광고 착지는 여기가 아니다.**
//   착지는 몰입형 `/products/inyeon-saju`(게이트→설화→입력, 산군과 같은 구조)로 확정했다.
//   착지 페이지의 일은 파는 게 아니라 **입력 시작까지 가장 적게 잃고 데려가는 것**인데,
//   이 페이지는 7,700px 스크롤에 페이지 전환이 한 번 더 있어 입력이 가장 멀다.
//   → 이 페이지는 **리타겟 전용**(한 번 튕긴 손님에겐 길게 파는 게 맞다).
//   CTA 의 `?from=jiknyeo` 는 몰입형에서 게이트·설화를 건너뛰게 한다 — 같은 컷을 두 번 보여주지 않으려고.
//
// 카피는 `직녀/티저_12블록_전문.md` 를 그대로 화면으로 옮긴 것이다. 문구를 여기서 새로 짓지 않는다 —
// 고칠 일이 생기면 그 문서를 먼저 고치고 옮겨 온다(두 곳이 갈리면 나중에 뭐가 맞는지 아무도 모른다).
//
// 이미지·영상은 전부 **슬롯**이다. public/products/jiknyeo/<id>.webp(+.mp4) 를 넣으면 그 자리가 켜지고,
// 없으면 라벨 붙은 달빛 패널로 남는다 → 그림채가 늦어져도 페이지는 오늘 완성된다.
//
// CTA 는 전부 기존 인연 위저드(/products/inyeon-saju)로 보낸다. 퍼널·결제·결과지는 이미 살아 있는 것을
// 그대로 쓴다(엔진 포크 금지). 가격은 현행 17,900/번들 26,900 — R5(3단 인상)는 형님 컨펌 전까지 배선 안 한다.

const INK = "linear-gradient(180deg,#0b0f1a 0%,#141026 100%)";
const SCRIM =
  "linear-gradient(180deg, rgba(7,6,15,0.35) 0%, rgba(7,6,15,0) 30%, rgba(7,6,15,0) 50%, rgba(7,6,15,0.97) 100%)";
const MOON = "#d9c7e8";   // 달빛 — 강조
const SILVER = "#cfd6e6"; // 은사 — 액센트(붉은 실 대체, R4)
const BONE = "#e8e6ef";
const SUB = "#98a0b4";
const LINE = "rgba(207,214,230,0.22)";

const CTA_HREF = "/products/inyeon-saju?from=jiknyeo";

/* ── 부품 ───────────────────────────────────────── */

// 컷 — 슬롯 asset 이 있으면 이미지/영상, 없으면 라벨이 찍힌 달빛 패널.
function Cut({
  id,
  assets,
  minH = 420,
  priority,
  children,
}: {
  id: SlotId;
  assets: AssetMap;
  minH?: number;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  const a = assets[id];
  const meta = SLOTS.find((s) => s.id === id)!;
  return (
    <div className="relative w-full overflow-hidden" style={a?.img || a?.video ? undefined : { minHeight: minH }}>
      {/* BgMedia 는 포스터(img)를 필수로 받는다 — 영상만 넣고 webp 를 빠뜨리면 폴백할 그림이 없다.
          그 경우엔 영상 승격을 포기하고 아래 플레이스홀더로 내려앉힌다(빈 검은 칸보다 낫다). */}
      {a?.video && a.img ? (
        <BgMedia video={a.video} img={a.img} alt={meta.label} className="block w-full" />
      ) : a?.img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={a.img}
          alt={meta.label}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          className="block w-full"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 24%, #241d3f 0%, transparent 70%), radial-gradient(circle 130px at 50% 22%, rgba(207,214,230,0.20) 0%, transparent 100%), linear-gradient(180deg,#141026,#0b0f1a)",
          }}
        >
          <div className="px-6 text-center">
            <p className="font-myeongjo text-[13px] tracking-[0.14em]" style={{ color: SILVER, opacity: 0.85 }}>
              {meta.label}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: SUB }}>
              {meta.note}
            </p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0" style={{ background: SCRIM }} />
      {children}
    </div>
  );
}

// 직녀 대사 — 컷 위에 얹는 말풍선. 캐릭터 대사는 본문(15)보다 큰 17px (조판 위계)
function Say({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-4 bottom-5">
      <div
        className="rounded-[6px] px-5 py-4"
        style={{ background: "rgba(11,15,26,0.72)", border: `1px solid ${LINE}`, backdropFilter: "blur(2px)" }}
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

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] leading-[1.8]" style={{ color: "#cfd0d8" }}>
      {children}
    </p>
  );
}

// 은사 디바이더 — 붉은 실 모티프의 대체(R4). 기존 인연 랜딩의 ThreadDivider 는 건드리지 않는다.
function SilverThread() {
  return (
    <div aria-hidden className="flex justify-center py-2">
      <svg width="12" height="72" viewBox="0 0 12 72" fill="none">
        <path
          d="M6 0 C 8 14, 4 22, 6 34 C 8 46, 4 56, 6 72"
          stroke={SILVER}
          strokeOpacity="0.55"
          strokeWidth="1.2"
        />
        <circle cx="6" cy="35" r="2.2" fill={SILVER} fillOpacity="0.9" />
      </svg>
    </div>
  );
}

// note 분기 — 무료 버튼 밑에 결제 보증이 붙으면 "무료야 유료야"부터 계산하게 된다(8/24 처음눈 검수).
// 결제 문구는 가격을 본 다음인 마지막 CTA 에만 붙인다.
function Cta({
  label = "무료로 먼저 보기",
  note = "결제 없이 볼 수 있어요 · 생일만 있으면 돼요",
}: {
  label?: string;
  note?: string;
}) {
  return (
    <div className="px-5">
      <Link
        href={CTA_HREF}
        className="flex w-full items-center justify-center rounded-[6px] py-4 font-myeongjo text-[17px] font-semibold tracking-[0.04em]"
        style={{ background: `linear-gradient(180deg,#efeaf6,#d9c7e8)`, color: "#1a1330" }}
      >
        {label}
      </Link>
      <p className="mt-2.5 text-center text-[12px]" style={{ color: SUB }}>
        {note}
      </p>
    </div>
  );
}

/* ── 본체 ───────────────────────────────────────── */

export function JiknyeoLanding({ assets }: { assets: AssetMap }) {
  return (
    <div style={{ background: INK }}>
      <div className="mx-auto w-full max-w-[520px] pb-28">
        {/* L1 히어로 — 가장 깊은 불안("있긴 한가")에 먼저 답하고, 상품("몇 월")으로 꺾는다.
            카피 원칙(2026-08-17 형님 확정): 이야기는 은유를 써도 되지만, 상품을 말하는 순간부터는
            직설만 쓴다 — 다시 읽게 만드는 문장 금지. 날실·씨실·무늬·천 어휘는 전면 폐기했다. */}
        <Cut id="j3" assets={assets} minH={520} priority>
          <div className="absolute inset-x-0 top-7 text-center">
            <p className="font-brush text-[16px] tracking-[0.34em]" style={{ color: SILVER, opacity: 0.9 }}>
              직 녀
            </p>
          </div>
          <Say>
            만날 사람, 있어요.
            <br />
            <b style={{ color: MOON }}>몇 월인지</b>가 문제죠.
          </Say>
        </Cut>

        <div className="pt-7">
          <Cta />
        </div>

        <SilverThread />

        {/* L2 핵심 원리 — 전부 즉답형 문장. "세다"는 서비스 동사로 쓰지 않는다(찾아드리다). */}
        <Narration>
          만날 사람은 만나요.
          <br />
          다만 아무 때나 만나지지는 않아요.
          <br />
          <b style={{ color: MOON }}>만나는 달이, 따로 있어요.</b>
          <br />
          <br />
          저는 그 달을 찾아드리는 사람이에요.
        </Narration>

        {/* L2-B 예보판 — 열두 달을 달 위상으로 편다. 계산은 전부 공개하고 이름만 잠근다.
            L2 의 주장("만나는 달이 따로 있어요") 바로 뒤라야 실물로 받아친 게 된다. */}
        <ForecastBoard />

        {/* L2-C 원국 증거 — 위 예보가 어디서 나왔는지 명식 실물로 보인다.
            경쟁사는 "명리이론 폭넓게 적용"이라고 주장만 하는데 우리는 실제로 계산하므로 보여줄 수 있다. */}
        <ChartEvidence />

        {/* L5 대구 페어 — "다리 없는 밤 / 다리가 놓이는 밤" 두 장. 죄책감 해제의 밑돌 */}
        <div className="grid grid-cols-2 gap-2 px-3">
          <div>
            <Cut id="t2" assets={assets} minH={220} />
            <p className="mt-2 text-center text-[13px] leading-relaxed" style={{ color: SUB }}>
              까치 다리가 없는 밤
              <br />
              <span style={{ color: BONE }}>이런 달이 대부분이에요</span>
            </p>
          </div>
          <div>
            <Cut id="t3" assets={assets} minH={220} />
            <p className="mt-2 text-center text-[13px] leading-relaxed" style={{ color: SUB }}>
              까치가 다리를 놓는 밤
              <br />
              <span style={{ color: BONE }}>올해도 몇 번, 있어요</span>
            </p>
          </div>
        </div>

        <SilverThread />

        {/* L3 직녀 소개 — 실적 숫자 0 (R2). 산군 언급 없음(독립 캐릭터, 형님 확정) */}
        <Cut id="j1" assets={assets} minH={480}>
          <Say>어서 와요. 앉으세요.</Say>
        </Cut>
        <div className="px-8 py-8 text-center">
          <p className="font-myeongjo text-[17px] leading-[1.9]" style={{ color: "#cfd0d8" }}>
            일 년에 하루만 만날 수 있었지만,
            <br />
            그 하루를 놓친 적이 없는 사람.
            <br />
            <br />
            <b style={{ color: MOON }}>만나는 날을 알고 있었으니까요.</b>
            <br />
            <br />
            당신 달을 찾아드릴 수는 있어도,
            <br />
            대신 만나 드리지는 않아요.
          </p>
        </div>

        <SilverThread />

        {/* L4 웹툰 7컷 — 견우직녀 설화(전 국민이 아는 이야기 = 설명 0초) → 능력 → 당신에게로 전이.
            "세다"는 기다림(설화)에서만 허용, 약속(상품)은 알려드릴게요/콕 집어드릴게요. */}
        <Cut id="w1" assets={assets}>
          <Say>일 년에 하루만, 만날 수 있었던 여자가 있어요.</Say>
        </Cut>
        <Cut id="w2" assets={assets}>
          <Say>
            날을 세며, 기다렸거든요.
            <br />
            그래서 한 번도 놓치지 않았어요.
          </Say>
        </Cut>
        <Cut id="w3" assets={assets}>
          <Say>
            <b style={{ color: MOON }}>만나는 날을 알고 있었어요.</b>
          </Say>
        </Cut>
        <Cut id="w4" assets={assets}>
          <Say>
            까치가 다리를 놓는 날 —
            <br />일 년에 단 하루.
          </Say>
        </Cut>
        <Cut id="w5" assets={assets}>
          <Say>
            당신에게도 그런 날이 와요.
            <br />
            올해도, 몇 번.
          </Say>
        </Cut>
        <Cut id="w6" assets={assets}>
          <Say>몰라서 지나갔을 뿐이에요.</Say>
        </Cut>
        <Cut id="w7" assets={assets}>
          <Say>
            이번엔 알고 만나요.
            <br />
            <b style={{ color: MOON }}>몇 월인지, 알려드릴게요.</b>
          </Say>
        </Cut>

        <SilverThread />

        {/* L7 목차 — 위: 번호 건너뛰기 / 아래: 전량 공개(잠그는 건 목차가 아니라 내용) */}
        <div className="px-5 py-4">
          <div className="rounded-md p-6" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${LINE}` }}>
            <p className="mb-4 text-center font-myeongjo text-[15px] font-bold" style={{ color: BONE }}>
              받는 것 — 10개 챕터 · 앞으로 12개월 전부
            </p>
            {/* ⚠ 아래 제목은 결과지(prompt.ts outline) 실제 챕터명과 1:1 이어야 한다 — 다르면 들통.
                고칠 땐 prompt.ts outline · blueprint.ts 배정표 정규식과 **같은 커밋**으로 움직인다. */}
            <ul className="space-y-2.5 text-[13px]">
              {[
                ["1장", "내 인연 그릇"],
                ["4장", "만나는 달 세 개"],
                ["5장", "내게 올 사람"],
                ["6장", "그 사람을 알아보는 신호 셋"],
                ["9장", "내 고민, 정면으로 답해요"],
              ].map(([n, t]) => (
                <li key={n} className="flex items-baseline gap-3">
                  <span className="font-myeongjo" style={{ color: MOON }}>
                    {n}
                  </span>
                  <span style={{ color: "#cfd0d8" }}>{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px]" style={{ color: SUB }}>
              + 그 외 5장 더
            </p>

            <details className="mt-4">
              <summary className="cursor-pointer text-center text-[13px] underline underline-offset-4" style={{ color: MOON }}>
                전체 목차 살펴보기
              </summary>
              <ul className="mt-4 space-y-2 text-[13px]" style={{ color: "#cfd0d8" }}>
                {[
                  "1장  내 인연 그릇",
                  "2장  당신이 걸어온 길",
                  "3장  내가 놓치는 패턴",
                  "4장  만나는 달 세 개",
                  "5장  내게 올 사람",
                  "6장  그 사람을 알아보는 신호 셋",
                  "7장  조심할 달",
                  "8장  크게 바뀌는 해",
                  "9장  내 고민, 정면으로 답해요",
                  "10장  이번 주에 할 것 3가지",
                ].map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </details>

            <p className="mt-5 text-center">
              <span
                className="inline-block rounded-full px-3.5 py-1 font-myeongjo text-[13px]"
                style={{ background: "rgba(217,199,232,0.12)", border: `1px solid ${LINE}`, color: MOON }}
              >
                {/* 실측 10,291자(2026-08-29, 실물 결과지)인데 8,000 이라 적어 우리 분량을
                    자진해서 작게 보이고 있었다. 경쟁은 20,000(타이트)·23,000(청월당)으로 판다.
                    「밑으로 약속하고 위로 지킨다」는 관례는 지키되, 실측보다 2,000 낮게 적을 이유는 없다. */}
                + 10,000자
              </span>
            </p>

            {/* L8 앵커 2종 — 분량(정직한 실측) + 가격(30대 타깃이라 점심값 유지) */}
            <div className="mt-4 border-t pt-4" style={{ borderColor: LINE }}>
              <p className="text-center text-[13px] leading-[1.75]" style={{ color: "#cfd0d8" }}>
                A4 <b style={{ color: MOON }}>여덟 쪽</b> · 다 읽는 데 <b style={{ color: MOON }}>열다섯 분</b>
                <br />
                끝까지 읽으시라고 이만큼만 썼어요.
              </p>
              <p className="mt-3 text-center text-[13px]" style={{ color: SUB }}>
                <s className="mr-1.5 opacity-70">24,900원</s>
                <b style={{ color: MOON }}>17,900원</b> — 점심 한 번 값 · 몇 분 안에 도착
              </p>
            </div>
          </div>
        </div>

        {/* L6 누가 보면 좋은가 — 마지막 줄이 역선택 */}
        <div className="px-5 py-6">
          <p className="mb-3 text-center font-myeongjo text-[15px] font-bold" style={{ color: BONE }}>
            이런 분이 보면 좋아요
          </p>
          <ul className="space-y-2.5">
            {[
              "소개는 들어오는데, 마음이 가는 사람이 없어요",
              "마음이 가면 꼭 어긋나요",
              "올해는 진짜 만나고 싶어요 — 언제인지가 궁금해요",
              "지금 만나는 사람, 이 사람이 맞는지 확신이 없어요",
            ].map((t) => (
              <li key={t} className="flex gap-2.5 text-[15px]" style={{ color: "#cfd0d8" }}>
                <span style={{ color: SILVER }}>·</span>
                {t}
              </li>
            ))}
            <li className="flex gap-2.5 text-[15px]" style={{ color: BONE }}>
              <span style={{ color: MOON }}>·</span>
              <b>애매한 위로 말고, 몇 월인지를 원하는 분</b>
            </li>
          </ul>
        </div>

        <SilverThread />

        {/* L9 Q&A — 4사 전부 AI 를 저격한다. 저들은 주장, 우리는 증거(대운 실측 검증) */}
        <div className="px-5 py-4">
          <p className="mb-4 text-center font-myeongjo text-[15px] font-bold" style={{ color: BONE }}>
            자주 묻는 물음
          </p>
          <ul className="divide-y" style={{ borderColor: LINE }}>
            {[
              [
                "그냥 AI가 쓴 두루뭉술한 글 아닌가요?",
                "아니에요. 누구에게나 맞는 말은 처음부터 안 넣어요. 생일로 명식을 코드로 직접 계산해 확정한 다음, 그 근거 위에서만 풀이를 써요 — 신강·신약, 용신, 대운 시작 나이까지요.",
              ],
              [
                "다른 사주 사이트랑 뭐가 다른가요?",
                "대부분 “올해 연애운이 좋다”까지만 말해요. 저는 열두 달 전부에 좋고 나쁨을 매기고, 몇 월인지 콕 집어요. 거를 사람까지 같이 알려드려요.",
              ],
              [
                "결제하면 언제, 어떻게 받나요?",
                "바로 이 화면에서 열려요. 링크는 카카오톡으로도 보내드려요.",
              ],
            ].map(([q, a]) => (
              <li key={q} className="py-4" style={{ borderColor: LINE }}>
                <p className="mb-1.5 font-myeongjo text-[15px] font-semibold" style={{ color: BONE }}>
                  Q. {q}
                </p>
                <Body>{a}</Body>
              </li>
            ))}
          </ul>
        </div>

        <SilverThread />

        {/* L10 반론 처리 */}
        <Cut id="j2" assets={assets} minH={460}>
          <Say>
            돈 쓰기 아깝죠. 저도 알아요.
            <br />
            그런데 <b style={{ color: MOON }}>달을 모르고 보내는 한 달</b>은… 공짜가 아니에요.
          </Say>
        </Cut>

        <div className="pt-8">
          <Cta label="내 달 보러 가기" note="토스페이먼츠 안전결제 · 결과지가 제대로 안 나오면 전액 돌려드려요" />
        </div>

        {/* 법정 표기 — ChromeGate 가 이 라우트를 bare 로 돌린 것과 **같은 커밋**에서 세운다.
            사이트 푸터를 떼는 이유(광고 트래픽에 헤더·푸터 링크가 새면 안 된다)는 옳지만,
            떼기만 하면 사업자 정보·약관·개인정보·환불정책이 이 페이지에서 통째로 사라진다.
            산군·돈·인연 구판은 셋 다 자체 StoryFooter 를 그리고 있었고 직녀 랜딩만 없었다. */}
        <StoryFooter />
      </div>
    </div>
  );
}
