// =====================================================
// 산군 결과지 — 개봉 의식과 章 사이 부품 (SangunResult 전용)
// =====================================================
// 왜 따로 두나: 8/25~26 조판 대공사는 전부 직녀(JiknyeoInterlude)에 들어갔고 산군은 마크다운
// 수리 4줄만 받았다. 직녀 부품은 색·자산·존댓말이 하드코딩(hex 82개)이라 그대로 못 가져온다.
// 그래서 **같은 문법을 산군의 자·목소리로** 다시 세운다. 직녀 파일은 건드리지 않는다
// (다른 세션이 미커밋으로 물고 있다).
//
// 실측 근거:
//  · 「캐릭터가 모든 블록을 소개한다 — 연결 대사가 몰입의 정체」 (타이트 티저 22단계 해부)
//  · 「목차는 계속 판다」 (타이트 목차 카드 6장 — 결과지 안에서도 다음 장을 판다)
//  · 「적어주신 고민, 여기서」 뱃지 = 재실망 공포를 미리 없앤다 (청월당 프롤로그)
//  · 물성 표기(몇 장·몇 자)는 «받은 물건»의 크기를 손에 쥐어 준다 (타이트 5만자/100p 문법.
//    단 저쪽은 실측의 2~5배로 부풀렸다 — 우리는 **계산한 실값만** 적는다)

const GOLD = "#e8c96a";
const GOLD_SOFT = "rgba(232,201,106,0.75)";
const GOLD_PALE = "rgba(232,201,106,0.25)";
const HANJI = "#efe6d2";
const RED = "#8f2b1e";

/** 산군의 공수 판 — 한지 쪽지에 붉은 낙관 배지.
 *  컷 위에 얹히기도 하고(ResultCut) 혼자 서기도 한다(SangunSay). 두 자리가 **같은 옷**이어야
 *  「같은 사람이 계속 말하고 있다」로 읽힌다 — 판이 갈리면 그 순간 화자가 둘이 된다. */
export function SayPlate({ say, compact = false }: { say: string; compact?: boolean }) {
  return (
    <div
      className={`relative rounded-[5px] ${compact ? "px-3.5 py-2" : "px-4 py-2.5"}`}
      style={{
        background: "linear-gradient(180deg,rgba(243,234,214,0.94),rgba(233,222,194,0.92))",
        border: "1px solid rgba(201,185,142,0.8)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
      }}
    >
      <span
        className="absolute -top-2.5 right-2.5 rounded-[2px] px-2 pb-[2px] pt-[3px] text-[11px] font-semibold tracking-[0.22em]"
        style={{ background: RED, color: "#f3e6cf" }}
      >
        산군
      </span>
      <p className="font-myeongjo text-[14.5px] font-semibold leading-[1.7] text-[#241d10]">{say}</p>
    </div>
  );
}

/** 컷 없이 대사만 서는 자리 — 그림이 없는 장(올해·조심할 달·네 물음·마지막 당부)용.
 *
 *  그림을 새로 굽기 전에도 **11장 전부에서 산군이 말을 걸게** 하려는 부품이다.
 *  컷이 있는 장만 말을 걸면 나머지 장에서 화자가 사라져 「사람이 읽어 주는 물건」이 끊긴다. */
export function SangunSay({ say }: { say: string }) {
  return (
    <div className="mt-7">
      <SayPlate say={say} compact />
    </div>
  );
}

/** 장 제목 → 산군의 공수(그리고 컷이 있으면 그 컷).
 *
 *  장 **번호가 아니라 제목**으로 맞춘다 — 9장(구)·11장(신) 결과지 양쪽에서 그 장이 있는
 *  자리에만 알아서 선다(없는 장은 자연 생략 = 하위호환 공짜).
 *  src 가 없는 줄은 대사만 선다(SangunSay). 나중에 컷이 오면 src 만 채우면 된다. */
export const SANGUN_VOICE: { match: RegExp; say: string; src?: string; alt?: string; pos?: string }[] = [
  {
    match: /그릇부터/,
    src: "/products/sangun/t2-read.webp",
    alt: "탁자 너머로 고개를 숙이고 마주 앉은 산군",
    say: "네 본바탕부터 읽는다.",
    pos: "center 28%",
  },
  { match: /걸어온 길/, src: "/products/sangun/t1-open.webp", alt: "옛 장부를 펴 든 손", say: "지나온 장부터 넘긴다." },
  // 컷 없음 — 3장. 앞장(걸어온 길)에서 과거를 맞혔으니 여기서 올해로 넘어온다는 이음매를 준다.
  { match: /올해 네게|오는 것/, say: "지나온 건 됐고, 올해로 오자." },
  {
    match: /돈이 들어오는/,
    src: "/products/sangun/money.webp",
    alt: "엽전 꾸러미를 든 손과 펼친 장부",
    say: "돈 얘기다. 몇 월인지까지 적어 뒀다.",
  },
  { match: /일과 자리/, src: "/products/sangun/t3-snap.webp", alt: "부채를 접어 쥔 손", say: "움직일 때와 엎드릴 때가 갈린다." },
  {
    match: /인연이 들어오는/,
    src: "/products/sangun/t5-thread.webp",
    alt: "손가락에 붉은 실을 감고 장부를 짚은 손",
    say: "네 짝이 적힌 자리다.",
  },
  // 컷 없음 — 7장. 겁주는 장이라 대사에서 미리 대처 쪽으로 틀어 둔다(결과지 톤 규칙).
  { match: /조심할 달/, say: "겁주려는 게 아니다. 알고 지나가면 덜 다친다." },
  {
    match: /크게 바뀌는 해/,
    src: "/products/sangun/t6-mark.webp",
    alt: "붉은 붓으로 장부의 한 해에 동그라미를 치는 손",
    say: "장부에 붉게 적힌 해가 있다.",
  },
  // 컷 없음 — 9장. 손님이 적어 온 물음에 답하는 자리. 프롤로그 뱃지가 예고한 곳이다.
  { match: /네 물음|물음에 답/, say: "네가 적어 온 것, 이제 답한다." },
  {
    match: /산군의 처방/,
    src: "/products/sangun/altar.webp",
    alt: "촛불 제단 앞에 선 박수의 뒷모습",
    say: "마지막으로, 네가 지니고 살 것들이다.",
    pos: "center 40%",
  },
  // 컷 없음 — 11장. 맺음 컷(close.webp)은 판 맨 끝에 따로 서므로 여기선 대사만.
  { match: /마지막 당부|당부/, say: "여기까지다. 한 가지만 더 이르마." },
];

/** ── 개봉 의식 ─────────────────────────────────────────
 *
 *  표지 다음, 본문 앞. 손님이 결제하고 처음 마주하는 자리다.
 *  지금까지 산군 결과지엔 **목차가 아예 없었다** — 뭘 받았는지 모른 채 1장부터 읽기 시작했다.
 *
 *  세 가지를 한다:
 *   ① 산군이 먼저 말을 건다(결제 전 세계관을 결과지가 이어받는다)
 *   ② 받은 물건의 크기를 실값으로 적는다(몇 장·몇 자·짚은 달 몇 개)
 *   ③ 차례를 펴 보인다 — 그리고 물음 장에 뱃지를 달아 「내 고민은 어디서 답하나」를 먼저 없앤다 */
export function SangunPrologue({
  who,
  entries,
  charCount,
  monthCount,
  concern,
}: {
  who: string | null;
  /** 화면에 서는 차례 그대로. no 는 한자 장번호. */
  entries: { idx: number; no: string; title: string; isConcern: boolean }[];
  charCount: number;
  monthCount: number;
  concern: string | null;
}) {
  // A4 한 장 ≈ 1,050자(본문 실측 7,905~8,836자가 판매 카피의 「A4 여덟 장」과 맞는 눈금).
  // 저쪽처럼 부풀리지 않는다 — 손님이 세어 볼 수 있는 숫자다.
  const pages = Math.max(1, Math.round(charCount / 1050));
  const facts = [
    { v: `${entries.length}장`, k: "장부의 장" },
    { v: `A4 ${pages}장`, k: "적힌 분량" },
    { v: `${monthCount}개`, k: "짚어 둔 달" },
  ];

  return (
    <div className="mt-6">
      {/* 첫 공수 — 신당 문을 여는 컷 위에. 결제 직전 게이트에서 본 그 문이다. */}
      <div className="relative -mx-4 h-[190px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/products/sangun/gate.webp"
          alt="촛불이 새어 나오는 신당 문"
          className="h-full w-full select-none object-cover"
          draggable={false}
          style={{ objectPosition: "center 45%" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(0deg,rgba(8,7,6,0.72) 0%,rgba(8,7,6,0.18) 46%,rgba(8,7,6,0) 68%)" }}
        />
        <div className="absolute inset-x-4 bottom-3.5 z-10">
          <SayPlate say={who ? `왔느냐, ${who}. 네 장부는 진작 적어 두었다.` : "왔느냐. 네 장부는 진작 적어 두었다."} />
        </div>
      </div>

      {/* 물성 3칸 — 「받은 물건」의 크기. 글을 읽기 전에 부피가 먼저 손에 잡혀야 한다. */}
      <div className="mt-5 grid grid-cols-3" style={{ border: `1px solid ${GOLD_PALE}` }}>
        {facts.map((f, i) => (
          <div
            key={f.k}
            className="px-2 py-3 text-center"
            style={{ borderLeft: i === 0 ? "none" : `1px solid ${GOLD_PALE}` }}
          >
            <p className="font-myeongjo text-[17px] font-bold leading-none" style={{ color: GOLD }}>
              {f.v}
            </p>
            <p className="font-myeongjo mt-1.5 text-[11px] tracking-[0.06em] text-bone-faint">{f.k}</p>
          </div>
        ))}
      </div>

      {/* 장부 차례 — 목차가 없던 자리. 타이트는 목차 카드에서도 계속 판다. */}
      <div className="mt-5" style={{ border: `1px solid ${GOLD_PALE}` }}>
        <div
          className="px-3.5 py-2.5"
          style={{ background: "rgba(232,201,106,0.08)", borderBottom: `1px solid ${GOLD_PALE}` }}
        >
          <span className="font-myeongjo text-[13px] font-bold" style={{ color: HANJI }}>
            장부의 차례
          </span>
        </div>
        <ol>
          {entries.map((e, i) => (
            <li key={e.idx} style={{ borderTop: i === 0 ? "none" : `1px solid rgba(232,201,106,0.12)` }}>
              <a href={`#jang-${e.idx}`} className="flex items-baseline gap-2.5 px-3.5 py-2.5">
                <span className="font-brush shrink-0 text-[15px]" style={{ color: GOLD_SOFT }}>
                  {e.no}
                </span>
                <span className="font-myeongjo text-[13.5px] leading-snug" style={{ color: HANJI }}>
                  {e.title}
                  {/* 「내 고민은 어디서 답해 주나」 — 결과지에서 가장 큰 불안이다.
                      물음 장에 미리 못을 박아 두면 읽는 내내 그 걱정을 안 하고 읽는다. */}
                  {e.isConcern && (
                    <span
                      className="ml-1.5 inline-block rounded-[2px] px-1.5 pb-[1px] pt-[2px] align-middle text-[10px] font-semibold tracking-[0.08em]"
                      style={{ background: RED, color: "#f3e6cf" }}
                    >
                      네 물음 여기
                    </span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ol>
        {concern && (
          <div className="px-3.5 pb-3 pt-1">
            <p className="font-myeongjo text-[11.5px] leading-relaxed text-bone-faint">
              네가 적어 온 것 — <span style={{ color: GOLD_SOFT }}>{concern}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
