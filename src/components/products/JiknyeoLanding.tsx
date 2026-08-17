import Link from "next/link";
import { BgMedia } from "@/components/products/BgMedia";
import type { AssetMap, SlotId } from "@/lib/jiknyeo-assets";
import { SLOTS } from "@/lib/jiknyeo-assets";

// 직녀 광고 전용 랜딩 (/jiknyeo · noindex · 사이트맵 제외 · 어디에도 링크하지 않는다).
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

function Cta({ label = "무료로 천 펴보기" }: { label?: string }) {
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
        토스페이먼츠 안전결제 · 천이 제대로 짜이지 않으면 실값은 돌려드려요
      </p>
    </div>
  );
}

/* ── 본체 ───────────────────────────────────────── */

export function JiknyeoLanding({ assets }: { assets: AssetMap }) {
  return (
    <div style={{ background: INK }}>
      <div className="mx-auto w-full max-w-[520px] pb-28">
        {/* L1 게이트 히어로 — 첫 3초에 '무늬(=결과)'를 예고한다 */}
        <Cut id="j3" assets={assets} minH={520} priority>
          <div className="absolute inset-x-0 top-7 text-center">
            <p className="font-brush text-[15px] tracking-[0.34em]" style={{ color: SILVER, opacity: 0.9 }}>
              織 女
            </p>
          </div>
          <Say>
            천을 폈어요.
            <br />
            <b style={{ color: MOON }}>무늬가 도는 달</b>이… 보이네요.
          </Say>
        </Cut>

        <div className="pt-7">
          <Cta />
        </div>

        <SilverThread />

        {/* L2 핵심 원리 — 매개가 상품을 설명한다(원국=날실 / 대운=씨실) */}
        <Narration>
          날실은 태어날 때 이미 다 걸려 있어요.
          <br />
          그건 못 바꿔요.
          <br />
          <br />
          제가 세는 건 <b style={{ color: MOON }}>씨실이 언제 지나가느냐</b>예요.
          <br />
          씨실이 지나가야 무늬가 생기거든요.
        </Narration>

        {/* L5 대구 페어 — 죄책감 해제의 ①② 를 그림으로 먼저 깐다 */}
        <div className="grid grid-cols-2 gap-2 px-3">
          <div>
            <Cut id="t2" assets={assets} minH={220} />
            <p className="mt-2 text-center text-[13px] leading-relaxed" style={{ color: SUB }}>
              이건 못 바꿔요
              <br />
              <span style={{ color: BONE }}>태어날 때 걸린 날실</span>
            </p>
          </div>
          <div>
            <Cut id="t3" assets={assets} minH={220} />
            <p className="mt-2 text-center text-[13px] leading-relaxed" style={{ color: SUB }}>
              이건 지나가요
              <br />
              <span style={{ color: BONE }}>올해도 몇 번, 당신 천을</span>
            </p>
          </div>
        </div>

        <SilverThread />

        {/* L3 직녀 소개 — 실적 숫자 0 (R2) */}
        <Cut id="j1" assets={assets} minH={480}>
          <Say>어서 와요. 앉으세요.</Say>
        </Cut>
        <div className="px-8 py-8 text-center">
          <p className="font-myeongjo text-[17px] leading-[1.9]" style={{ color: "#cfd0d8" }}>
            일 년에 하루를 만나도,
            <br />
            만날 사람은 만난다는 걸 아는 이.
            <br />
            <br />
            산군의 장부에서 <b style={{ color: MOON }}>인연 면(緣面)</b>만 받아 읽는 눈.
            <br />
            <br />
            날실은 세어 주어도,
            <br />
            남의 씨실을 대신 던져 주지는 않는다.
          </p>
        </div>

        <SilverThread />

        {/* L4 웹툰 7컷 — 산군에서 직녀로 넘어오는 서사(자극 교체: 공포 → 온기) */}
        <Cut id="w1" assets={assets}>
          <Say>
            여기까지가 내 눈이 닿는 곳이다.
            <br />
            <b style={{ color: MOON }}>천의 일은 직녀가 읽는다.</b>
          </Say>
        </Cut>
        <Cut id="w2" assets={assets}>
          <Say>문틈으로, 달빛이 샜어요.</Say>
        </Cut>
        <Cut id="w3" assets={assets}>
          <Say>당신 천은 여기 걸려 있었어요. 반쯤 짜인 채로.</Say>
        </Cut>
        <Cut id="w4" assets={assets}>
          <Say>여기… 날실과 은사가 만난 자리. 이게 무늬예요.</Say>
        </Cut>
        <Cut id="w5" assets={assets}>
          <Say>까치가 오면, 다리가 놓여요.</Say>
        </Cut>
        <Cut id="w6" assets={assets}>
          <Say>달이 오면, 북을 던져요.</Say>
        </Cut>
        <Cut id="w7" assets={assets}>
          <Say>
            <b style={{ color: MOON }}>당신 천은 지금 어디까지 짜였을까요.</b>
          </Say>
        </Cut>

        <SilverThread />

        {/* L7 목차 — 위: 번호 건너뛰기 / 아래: 전량 공개(잠그는 건 목차가 아니라 내용) */}
        <div className="px-5 py-4">
          <div className="rounded-md p-6" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${LINE}` }}>
            <p className="mb-4 text-center font-myeongjo text-[15px] font-bold" style={{ color: BONE }}>
              받는 것 — 10개 챕터 · 앞으로 12개월 전부
            </p>
            <ul className="space-y-2.5 text-[13px]">
              {[
                ["1장", "네 날실 — 타고난 그릇"],
                ["3장", "인연 달력 — 열두 달 전부"],
                ["4장", "내게 올 사람"],
                ["6장", "무늬인 척 섞인 잡실"],
                ["9장", "네 물음의 답"],
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
                  "1장  네 날실 — 타고난 그릇",
                  "2장  지나온 자리 — 걸어온 길",
                  "3장  인연 달력 — 열두 달 전부",
                  "4장  무늬가 도는 달 셋",
                  "5장  내게 올 사람",
                  "6장  알아보는 신호 셋 + 하지 말 것",
                  "7장  결이 엉키는 달",
                  "8장  무늬가 가장 크게 바뀌는 해",
                  "9장  네 물음의 답",
                  "10장  이번 주에 할 것 셋",
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
                + 8,000자
              </span>
            </p>

            {/* L8 앵커 2종 — 분량(정직한 실측) + 가격(30대 타깃이라 점심값 유지) */}
            <div className="mt-4 border-t pt-4" style={{ borderColor: LINE }}>
              <p className="text-center text-[13px] leading-[1.75]" style={{ color: "#cfd0d8" }}>
                A4 <b style={{ color: MOON }}>여덟 장</b> · 다 읽는 데 <b style={{ color: MOON }}>열다섯 분</b>
                <br />
                끝까지 읽히려고 이만큼만 짰어요.
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
              <b>애매한 위로 말고, 날짜를 원하는 분</b>
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
                "아니에요. 먼저 명식을 코드로 직접 계산해 신강·신약과 용신, 대운 시작 나이까지 확정한 뒤, 그 근거 위에서만 풀이를 써요. 누구에게나 맞는 말은 처음부터 안 넣어요.",
              ],
              [
                "다른 사주 사이트랑 뭐가 다른가요?",
                "대부분 “올해 연애운이 좋다”까지만 말해요. 저는 열두 달을 등급으로 전부 펴고, 그중 어느 달인지를 못 박아요. 거를 사람까지 같이 드려요.",
              ],
              [
                "실값을 치르면 언제, 어떻게 받나요?",
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
            실값이 아깝죠. 저도 알아요.
            <br />
            그런데 <b style={{ color: MOON }}>달을 모르고 보내는 한 달</b>은… 공짜가 아니에요.
          </Say>
        </Cut>

        <div className="pt-8">
          <Cta label="내 천 보러 가기" />
        </div>
      </div>
    </div>
  );
}
