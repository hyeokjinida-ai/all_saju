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
 *  「같은 사람이 계속 말하고 있다」로 읽힌다 — 판이 갈리면 그 순간 화자가 둘이 된다.
 *
 *  `invert` = **반전 절단.** 카카오웹툰 「칠흑이 삼킨 여름」 54화 실측(2026-08-29): 회차 내내
 *  흰 말풍선·먹 글자로 가다가 **마지막 대사 하나만 검정 판 + 흰 글자로 뒤집고 거기서 끊는다.**
 *  같은 옷을 한 번 뒤집는 것만으로 「지금까지와 다른 말」이 된다 — 새 부품을 만드는 것보다 세다.
 *  한 판에 **딱 한 번만** 쓴다. 두 번 쓰면 반전이 평상복이 되고 절단이 사라진다. */
export function SayPlate({
  say,
  compact = false,
  invert = false,
}: {
  say: string;
  compact?: boolean;
  invert?: boolean;
}) {
  return (
    <div
      className={`relative rounded-[5px] ${compact ? "px-3.5 py-2" : "px-4 py-2.5"}`}
      style={
        invert
          ? {
              background: "linear-gradient(180deg,#14100a,#080605)",
              border: `1px solid ${RED}`,
              boxShadow: "0 10px 30px rgba(0,0,0,0.75)",
            }
          : {
              background: "linear-gradient(180deg,rgba(243,234,214,0.94),rgba(233,222,194,0.92))",
              border: "1px solid rgba(201,185,142,0.8)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
            }
      }
    >
      <span
        className="absolute -top-2.5 right-2.5 rounded-[2px] px-2 pb-[2px] pt-[3px] text-[11px] font-semibold tracking-[0.22em]"
        style={invert ? { background: "#f3e6cf", color: RED } : { background: RED, color: "#f3e6cf" }}
      >
        산군
      </span>
      <p
        className="font-myeongjo text-[14.5px] font-semibold leading-[1.7]"
        style={{ color: invert ? "#f3e6cf" : "#241d10" }}
      >
        {say}
      </p>
    </div>
  );
}

/** 컷 없이 대사만 서는 자리 — 그림이 없는 장(올해·조심할 달·네 물음·마지막 당부)용.
 *
 *  그림을 새로 굽기 전에도 **11장 전부에서 산군이 말을 걸게** 하려는 부품이다.
 *  컷이 있는 장만 말을 걸면 나머지 장에서 화자가 사라져 「사람이 읽어 주는 물건」이 끊긴다.
 *
 *  ⚠ 여백이 연출이다 — 웹툰 실측(같은 회차)에서 **화면의 33%가 흰 여백**이었고, 말풍선이
 *  그림 없이 여백에 혼자 앉는 자리가 계속 나온다. 우리는 28px 로 붙여 놔서 앞 블록에 묻혀
 *  「끼워 넣은 캡션」으로 읽혔다. 위를 크게 벌려 **대사가 혼자 서는 자리**를 만든다. */
export function SangunSay({ say }: { say: string }) {
  return (
    <div className="mt-14">
      <SayPlate say={say} compact />
    </div>
  );
}

/** 표·카드 바로 아래에 붙는 산군의 한마디 — **손님이 다음에 할 행동**을 시킨다.
 *
 *  청월당·타이트가 결과지 안에서 캡처와 달력 저장을 유도하는 자리다. 둘 다 «읽고 끝»을
 *  «가지고 나감»으로 바꾼다 — 캡처는 바이럴이고(타이트는 짝 얼굴이 유일한 캡처 컷이라 적었다),
 *  달력은 재열람의 씨앗이다(적어 준 달이 오면 다시 열러 온다).
 *  장식이 아니라 명령이라 산군의 반말로 쓴다. */
export function SangunNudge({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-myeongjo mt-2.5 flex items-baseline gap-1.5 text-[11.5px] leading-[1.7]"
      style={{ color: GOLD_SOFT }}
    >
      <span aria-hidden style={{ color: RED }}>
        ▪
      </span>
      <span>{children}</span>
    </p>
  );
}

/** 장 제목 → 산군의 공수(그리고 컷이 있으면 그 컷).
 *
 *  장 **번호가 아니라 제목**으로 맞춘다 — 9장(구)·11장(신) 결과지 양쪽에서 그 장이 있는
 *  자리에만 알아서 선다(없는 장은 자연 생략 = 하위호환 공짜).
 *  src 가 없는 줄은 대사만 선다(SangunSay). 나중에 컷이 오면 src 만 채우면 된다. */
export const SANGUN_VOICE: { match: RegExp; say: string; src?: string; alt?: string; pos?: string; ratio?: string }[] = [
  {
    match: /그릇부터/,
    src: "/products/sangun/t2-read.webp",
    alt: "탁자 너머로 고개를 숙이고 마주 앉은 산군",
    say: "네 본바탕부터 읽는다.",
  },
  { match: /걸어온 길/, src: "/products/sangun/t1-open.webp", alt: "옛 장부를 펴 든 손", say: "지나온 장부터 넘긴다." },
  {
    // 3장 — 부름의 장. 방울은 바이블 §1-5 소품인데 컷이 없어 대사만 서 있던 자리(8/29 수급)
    match: /올해 네게|오는 것/,
    src: "/products/sangun/bell.webp",
    alt: "놋쇠 무당방울을 흔드는 노인의 손",
    say: "지나온 건 됐고, 올해로 오자.",
  },
  {
    match: /돈이 들어오는/,
    src: "/products/sangun/money.webp",
    alt: "엽전 꾸러미를 든 손과 펼친 장부",
    say: "돈 얘기다. 몇 월인지까지 적어 뒀다.",
  },
  // 「엎드릴 때」는 사극 말(형님 지적 2026-09-02) — 티저·목차와 같은 말로 통일.
  { match: /일과 자리/, src: "/products/sangun/t3-snap.webp", alt: "부채를 접어 쥔 손", say: "밀어붙일 때와 기다릴 때가 갈린다." },
  {
    match: /인연이 들어오는/,
    src: "/products/sangun/t5-thread.webp",
    alt: "손가락에 붉은 실을 감고 장부를 짚은 손",
    say: "네 짝이 적힌 자리다.",
  },
  {
    // 7장 — 겁주는 장이 아니라 **덮어 두는** 장이라 그림도 장부를 덮는 손이다(대사와 한 몸)
    match: /조심할 달/,
    src: "/products/sangun/close-book.webp",
    alt: "장부를 덮으려는 두 손과 책장 사이로 흘러나온 붉은 실",
    say: "겁주려는 게 아니다. 알고 지나가면 덜 다친다.",
  },
  {
    match: /크게 바뀌는 해/,
    src: "/products/sangun/t6-mark.webp",
    alt: "붉은 붓으로 장부의 한 해에 동그라미를 치는 손",
    say: "장부에 붉게 적힌 해가 있다.",
  },
  {
    // 9장 — 프롤로그 뱃지가 예고한 자리. 장부를 이쪽으로 미는 시점 컷이 「이제 네 차례」를 만든다
    match: /네 물음|물음에 답/,
    src: "/products/sangun/hand-over.webp",
    alt: "펼친 장부를 탁자 너머로 밀어 건네는 두 손",
    say: "네가 적어 온 것, 이제 답한다.",
  },
  {
    match: /산군의 처방/,
    src: "/products/sangun/altar.webp",
    alt: "촛불 제단 앞에 선 박수의 뒷모습",
    say: "마지막으로, 네가 지니고 살 것들이다.",
    // 제단 컷만 세로가 길다(860×1528) — 원본 그대로 세운다
    ratio: "860 / 1528",
  },
  // 컷 없음 — 11장. 맺음 컷(close.webp)은 판 맨 끝에 따로 서므로 여기선 대사만.
  { match: /마지막 당부|당부/, say: "여기까지다. 한 가지만 더 이르마." },
];

/** 산군의 주석 — 장 끝에 붙는 **정적** 읽을거리(LLM 토큰 0).
 *
 *  청월당 실측(해부 §5): 각 장 맨 끝에 `saju_sense` 가 4,000~4,600px 씩 붙는다. 개인화가
 *  0인 통짜 강의인데 ①체류시간 ②「이 회사 진짜 안다」 신뢰 ③**분량 +20%를 0원으로** 만든다.
 *
 *  조판은 일부러 본문 종이와 다르게 간다 — 여기는 손님 얘기가 아니라 **일반 지식**이라,
 *  같은 종이에 얹으면 「내 풀이」와 섞여 읽힌다. 밤 무대 위 접힌 쪽지로 세워 결을 가른다. */
/** 주석 본문의 `**굵게**` 만 살린다. 주석은 마크다운 파이프를 안 타므로(ReactMarkdown 을
 *  이 한 조각 때문에 또 부르지 않는다) 별표가 글자로 새어 나온다 — 실측에서 「\*\*식힐 물과
 *  담을 그릇\*\*이다」로 찍혔다. 문단마다 잡히는 구절 하나를 굵게 두는 건 우리 조판 규칙이라
 *  표시를 없애는 대신 여기서 칠한다. */
function withBold(text: string): React.ReactNode {
  const parts = text.split("**");
  if (parts.length < 3) return text;
  return parts.map((s, i) => (i % 2 ? <strong key={i}>{s}</strong> : s));
}

export function SangunNote({ note }: { note: { title: string; lead: string; body: string[] } }) {
  return (
    <aside className="mt-12" style={{ border: `1px solid ${GOLD_PALE}`, background: "rgba(232,201,106,0.035)" }}>
      <div
        className="flex items-baseline gap-2 px-4 py-2.5"
        style={{ background: "rgba(232,201,106,0.07)", borderBottom: `1px solid ${GOLD_PALE}` }}
      >
        <span className="font-brush shrink-0 text-[13px]" style={{ color: RED }}>
          註
        </span>
        <span className="font-myeongjo text-[12px] tracking-[0.08em]" style={{ color: GOLD_SOFT }}>
          산군의 주석
        </span>
      </div>
      <div className="px-4 pb-5 pt-4">
        <p className="font-myeongjo text-[15px] font-bold leading-snug" style={{ color: HANJI }}>
          {note.title}
        </p>
        <p className="font-myeongjo mt-1.5 text-[13px] leading-[1.7]" style={{ color: GOLD_SOFT }}>
          {note.lead}
        </p>
        {note.body.map((para, i) => (
          <p key={i} className="font-myeongjo mt-3.5 text-[14px] leading-[1.85] text-bone-soft">
            {withBold(para)}
          </p>
        ))}
        {/* 개인화가 아니라는 걸 밝혀 둔다 — 「내 얘기인 줄 알았는데 남한테도 똑같더라」가
            제일 나쁜 결말이다. 미리 말하면 상식란이고, 숨기면 들통이다. */}
        <p className="font-myeongjo mt-4 text-[10.5px] leading-[1.6] text-bone-faint">
          이 주석은 네 명식 풀이가 아니라 같은 일간을 쓰는 사람 모두에게 해당하는 이야기다.
          네 얘기는 앞뒤 장에 적어 뒀다.
        </p>
      </div>
    </aside>
  );
}

/** 빈 액자 — **액자·질감은 구운 그림, 내용물은 DOM.**
 *
 *  청월당 해부 §2 의 기법이다. 저쪽은 종이·제목·캐릭터까지 PNG 로 굽고 개인화 값만 절대배치로
 *  얹는다. 그래서 손님이 몇 명이든 그림은 한 장이면 되고, **상품당 6~7장이면 디자인이 끝난다.**
 *  우리도 글자를 굽지 않는다 — 비워 둔 종이 위에 코드가 손님 값을 앉힌다.
 *
 *  padX/padY 는 그림 안 «빈 종이» 영역의 안쪽 여백(%)이다. 액자를 다시 구우면 이 값만 고친다. */
export function EmptyFrame({
  src,
  alt,
  children,
  padX = 16,
  padY = 13,
  ink = "#241d10",
}: {
  src: string;
  alt: string;
  children: React.ReactNode;
  padX?: number;
  padY?: number;
  ink?: string;
}) {
  return (
    <div className="relative mt-6 overflow-hidden" style={{ aspectRatio: "4 / 5" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" draggable={false} />
      <div
        className="absolute overflow-y-auto"
        style={{ left: `${padX}%`, right: `${padX}%`, top: `${padY}%`, bottom: `${padY}%`, color: ink }}
      >
        {children}
      </div>
    </div>
  );
}

/** 부적 — 처방표의 **핵심 세 줄만** 부적 종이에 옮겨 적는다.
 *
 *  왜: 처방이 표로만 있으면 «정보»고, 부적 위에 얹히면 «지니고 다니는 물건»이 된다.
 *  표는 위에 그대로 두고(다섯 줄 전부) 여기선 줄여 적는다 — 같은 값을 두 번 보여 주는 게
 *  아니라, 표는 읽는 것이고 부적은 담아 가는 것이다(캡처 정점).
 *  글자는 굽지 않았다(빈 액자) — 손님 값이 여기 앉는다. */
export function BujeokCard({
  src,
  yongKo,
  rows,
}: {
  src: string;
  yongKo: string;
  rows: { label: string; do_: string }[];
}) {
  // 부적은 «지니는 것»이라 표보다 짧아야 한다 — 설명 절(「, 머물 곳도…」)은 떼고 값만 남긴다.
  const pick = (["방향", "색", "곁에 둘 것"] as const)
    .map((k) => rows.find((r) => r.label === k))
    .filter(Boolean)
    .map((r) => ({ label: r!.label, do_: r!.do_.split(/[,(]/)[0].replace(/에 앉고$/, "").trim() }));
  if (!pick.length) return null;
  return (
    <>
      <EmptyFrame src={src} alt="붉은 주사로 테두리를 두른 한지 부적" padX={19} padY={15}>
        <div className="flex h-full flex-col justify-center text-center">
          <p className="font-brush text-[15px] leading-none" style={{ color: "#7a2418" }}>
            {yongKo}
          </p>
          <p className="font-myeongjo mt-1 text-[10px] tracking-[0.16em]" style={{ color: "rgba(52,34,12,0.82)" }}>
            네게 이로운 결
          </p>
          <div className="mt-3.5 space-y-2.5">
            {pick.map((r) => (
              <div key={r.label}>
                <p className="font-myeongjo text-[10px] tracking-[0.1em]" style={{ color: "rgba(52,34,12,0.78)" }}>
                  {r.label}
                </p>
                <p className="font-myeongjo mt-0.5 text-[12.5px] font-semibold leading-[1.5]">{r.do_}</p>
              </div>
            ))}
          </div>
        </div>
      </EmptyFrame>
      <SangunNudge>이 석 줄이 네 부적이다. 화면째 담아 두고 지니고 다녀라.</SangunNudge>
    </>
  );
}

/** 마치며 — 서찰 한 장. **3사 공통 표준**(마지막 장 = 캐릭터의 편지)의 산군판.
 *
 *  청월당 연애비책 「홍연의 마지막 편지」·정통사주 「마치며」(410자, 14장 중 최소)와 같은 자리다.
 *  본문(11장 당부)은 위 종이에 그대로 두고, 여기서는 **짧게 맺는다** — 정보가 아니라 배웅이다.
 *  글은 정적 템플릿에 **이름과 가장 가까운 좋은 달만 치환** = LLM 토큰 0. */
export function ClosingLetter({
  src,
  who,
  nearMonth,
}: {
  src: string;
  who: string | null;
  nearMonth: string | null;
}) {
  const name = who || "너";
  return (
    <EmptyFrame src={src} alt="촛불 아래 반쯤 펼쳐진 한지 서찰" padX={17} padY={16}>
      <div className="flex h-full flex-col">
        <p className="font-myeongjo text-[13px] font-bold leading-[1.7]">{name}에게.</p>
        {/* ⚠ 액자 안은 219×282 뿐이다(실측). 길게 쓰면 종이 밖으로 넘쳐 스크롤이 생기고
            «편지»가 아니라 잘린 글이 된다 — 청월당 마치며도 410자로 14장 중 가장 짧다.
            여기는 정보가 아니라 배웅이라, 세 문장이면 족하다. */}
        <p className="font-myeongjo mt-2 text-[12px] leading-[1.75]">
          좋은 것만 적지는 않았다. 좋은 것만 적는 장부는 쓸모가 없다.
        </p>
        <p className="font-myeongjo mt-1.5 text-[12px] leading-[1.75]">
          {nearMonth ? (
            <>
              가장 먼저 오는 건 <span className="font-bold">{nearMonth}</span>이다. 그달이 오거든 다시 펴 보아라.
            </>
          ) : (
            <>적어 둔 달이 오거든 다시 펴 보아라.</>
          )}
        </p>
        <p className="font-myeongjo mt-1.5 text-[12px] leading-[1.75]">
          팔자는 정해진 길이 아니라 <span className="font-bold">지형</span>이다. 어디가 오르막인지 알고 걸으면 덜
          다친다. 그러라고 적어 준 것이다.
        </p>
        <p className="font-myeongjo mt-auto pt-2 text-right text-[11.5px] font-bold" style={{ color: "#7a2418" }}>
          山君
        </p>
      </div>
    </EmptyFrame>
  );
}

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
  // A4 분량 칸은 형님 지시로 걷어냈다(2026-09-02) — 파는 화면에서 분량 앵커(A4·글자 수)를
  // 전부 뺐으므로 받은 물건에서도 같은 자를 안 꺼낸다. 그 칸은 「앞으로 12달」로 —
  // 파는 카피의 「앞으로 12개월 전부」와 같은 말이라 새 어휘가 아니다.
  // charCount 는 시그니처 호환으로만 남긴다(호출부를 안 건드리는 값싼 쪽).
  void charCount;
  const facts = [
    { v: `${entries.length}장`, k: "장부의 장" },
    { v: "12달", k: "앞으로 전부" },
    { v: `${monthCount}개`, k: "짚어 둔 달" },
  ];

  return (
    <div className="mt-6">
      {/* 첫 공수 — 신당 문을 여는 컷 위에. 결제 직전 게이트에서 본 그 문이다.
          정사각으로 세운다: 원본(860×1528)을 그대로 펴면 693px 인데 바로 위 표지가 이미
          420px 라 글자에 닿기까지 1,100px 이 그림만 된다. 「문」은 통과하는 자리지 머무는
          자리가 아니라 절반만 쓴다(190 → 390, 2배). 머무는 자리는 장 컷들이 맡는다. */}
      <div className="relative -mx-4 aspect-square overflow-hidden">
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
