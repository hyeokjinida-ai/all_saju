// 결과지 본문 사이에 끼우는 부품들 — **글 벽을 끊는 자리**.
//
// 왜 만들었나(2026-08-24 실측): 은비 결과지 19,888px 중 시각 요소 17개가 전부 머리
// 2,800px 안에 몰려 있었고, y 2,797~14,411 = **11,614px가 연속 산문**이었다.
// 폰으로 13화면을 스크롤하는 동안 그림이 하나도 안 나온다.
//
// 두 경쟁사 실측이 서로 다른 답을 준다:
//   · 청월당(유료 해부) — 장당 이미지 7장, 페이지의 76%를 그림으로 채운다. 우리는 이미지가
//     수동 생산(ChatGPT 웹)이라 그대로는 못 따라간다.
//   · 타이트(랜딩 22,057px 실측) — **그림을 거의 안 쓰고** 날짜 카드·넘버 뱃지·목차 카드로
//     리듬을 만든다. 한 리듬 단위가 폰 1~1.5화면. 「SEP 5 / NOV 14」 카드가 전부 DOM 이다.
//
// 우리가 택한 길은 타이트 쪽이다 — 그리고 우리에겐 저쪽에 없는 게 있다:
// **확정값이 이미 구조화 데이터로 존재한다**(top3·shaky·signals·pattern). 산문 속에 묻어 둘
// 이유가 없다. 코드가 카드로 꺼내면 LLM 토큰 0, 이미지 0장으로 리듬이 생긴다.
//
// 톤 규칙: 이모지·핑크 금지(타이트 문법을 그대로 베끼면 직녀가 아니게 된다).
//          우리 재료 — 달 위상 · 은사 선 · 밤 바탕 · 명조체 — 로만 만든다.
import * as React from "react";
import fs from "node:fs";
import path from "node:path";
import { Moon, phaseOfScore } from "./JiknyeoMoon";
import type { InyeonFacts, InyeonRow } from "@/lib/saju/saju-api";

/** 서버에서 파일 존재를 확인한다(클라이언트 onError 를 못 쓰는 서버 컴포넌트라서). */
function assetSrc(src: string): string | null {
  const p = path.join(process.cwd(), "public", src.replace(/^\//, ""));
  return fs.existsSync(p) ? src : null;
}

/** 내부 판정어를 손님 말로. 본문은 normalize-voice 가 거르지만 **카드는 그 파이프를 안 탄다** —
 *  여기서 안 바꾸면 태그에 「전체 흐름이 대길」이 그대로 뜬다(2026-08-24 실측). */
function humanize(t: string): string {
  return t
    .replace(/대길/g, "크게 트임")
    .replace(/대흉/g, "크게 눌림")
    .replace(/소길/g, "조금 트임")
    .replace(/소흉/g, "조금 눌림");
}

/* ── 공통 껍데기 ────────────────────────────────────────── */

/** 카드 묶음의 머리 — **라벨이 아니라 직녀의 대사**로 연다.
 *  청월당은 SD 캐릭터가 빈 액자 옆에서 말풍선으로 내용을 소개한다(해부 §2). 그 동행 감각이
 *  저쪽 결과지가 "읽어주는 사람이 있는 물건"으로 느껴지는 이유다 — 삽화 장수가 아니다.
 *  말풍선 규격은 8/23 확정 그대로: **한 덩어리 도형** · 꼬리가 인물 쪽 · 글 두 줄 이내. */
function Band({
  lines,
  children,
  sd = "sdSmile",
  cut,
  sfx,
}: {
  /** 직녀의 대사 — 말맛대로 끊은 줄 배열 */
  lines: string[];
  children: React.ReactNode;
  sd?: "sdSmile" | "sdThink";
  /** 반신 컷 id(j2·w2·w3…). 주면 **컷이 주인공**인 청월당 문법으로 렌더한다 */
  cut?: string;
  /** 손글씨 방백 — 원본은 그림에 구워 넣지만 우리는 코드로 얹는다(8/23 규격) */
  sfx?: string;
}) {
  const cutSrc = cut
    ? assetSrc(`/products/jiknyeo/${cut}.webp`) ?? assetSrc(`/products/jiknyeo/${cut}.png`)
    : null;

  // ── 컷 문법 — 청월당 실물 배치 ──
  if (cutSrc) {
    return (
      <div style={{ margin: "22px 0 0" }}>
        <div style={{ position: "relative", paddingBottom: 58 }}>
          {/* 컷: 폭 86%(실물 80~90%) · 3:2 · 아래를 밤 배경으로 녹여 액자 느낌을 지운다 */}
          <div
            style={{
              position: "relative",
              width: "86%",
              marginLeft: "auto",
              overflow: "hidden",
              borderRadius: 12,
              background: "#0B0F1A",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cutSrc}
              alt=""
              draggable={false}
              className="w-full select-none"
              style={{ aspectRatio: "3 / 2", objectFit: "cover", objectPosition: "center 18%", display: "block" }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0"
              style={{ height: "52%", background: "linear-gradient(180deg, rgba(11,15,26,0), rgba(11,15,26,.92) 72%, #0B0F1A)" }}
            />
            {sfx && (
              <span
                className="font-brush absolute"
                style={{
                  top: "11%",
                  right: "5%",
                  fontSize: 21,
                  color: "#F0E3B8",
                  transform: "rotate(8deg)",
                  textShadow: "0 2px 10px rgba(10,8,26,.9)",
                  letterSpacing: "0.06em",
                }}
              >
                {sfx}
              </span>
            )}
          </div>
          {/* 말풍선이 **컷에 걸친다** — 꼬리는 오른쪽(컷 안 인물) 쪽 */}
          <div style={{ position: "absolute", left: 12, bottom: 18, zIndex: 2 }}>
            <Bubble lines={lines} size="lg" tail="br" />
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      </div>
    );
  }

  // ── SD 문법 — 가벼운 자리(청월당도 반신과 SD 를 섞어 쓴다) ──
  const face = assetSrc(`/products/jiknyeo/${sd}-cut.png`) ?? assetSrc(`/products/jiknyeo/${sd}.png`);
  return (
    <div style={{ margin: "20px 0 0" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4 }}>
        <Bubble lines={lines} size="md" tail="bl" />
        {face ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={face}
            alt=""
            draggable={false}
            className="flex-none select-none"
            style={{ width: 74, height: 96, objectFit: "contain", objectPosition: "bottom", marginBottom: -6, marginLeft: -8 }}
          />
        ) : null}
      </div>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

/** 말풍선 — **청월당 실물 실측을 그대로 옮긴 규격**(2026-08-25 PIL 측정).
 *
 *  원본 750px 폭 기준: 386×352px · 폭비 51% · 종횡 1.10 · 글자높이 33px · 줄높이 54px(lh 1.18)
 *  → 448px 기둥 환산: 폭 228 · 높이 207 · font 27px · lh 1.18
 *
 *  ⚠ 이전 판(2026-08-24)은 실물을 안 보고 만든 높이 40px 짜리 알약이었다. 크기가 5배 틀리면
 *    같은 도형이어도 「캐릭터의 말」이 아니라 「UI 라벨」로 읽힌다 — 그래서 실측으로 다시 세웠다.
 *
 *  줄바꿈은 **말맛대로 손으로 끊는다**(폭 맞춤 아님). 그래서 문자열이 아니라 줄 배열을 받는다. */
export function Bubble({
  lines,
  size = "lg",
  tail = "bl",
}: {
  /** 말맛대로 끊은 줄 배열 — 원본도 폭이 아니라 호흡으로 끊는다 */
  lines: string[];
  /** lg = 실측값(228) · md = 카드 묶음용 축소판 */
  size?: "lg" | "md";
  /** 꼬리 방향 — bl(왼쪽 아래) / br(오른쪽 아래) / 없음 */
  tail?: "bl" | "br" | "none";
}) {
  const w = size === "lg" ? 228 : 190;
  const h = Math.round(w / 1.1);
  const fs = size === "lg" ? 19 : 16.5;
  return (
    <div style={{ position: "relative", width: w, height: h, flex: "none" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: "#FFFFFF",
          border: "2px solid #1B1729",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 10%",
          boxShadow: "0 6px 20px rgba(10,8,26,.45)",
        }}
      >
        {lines.map((t, i) => (
          <span
            key={i}
            className="font-myeongjo"
            style={{
              fontSize: fs,
              lineHeight: 1.18,
              color: "#14111F",
              fontWeight: 700,
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
            }}
          >
            {t}
          </span>
        ))}
      </div>
      {tail !== "none" && (
        // 꼬리는 원과 **한 덩어리**로 보여야 한다 — 흰 삼각을 원에 겹쳐 이음매를 지운다(8/23 규격)
        <svg
          width="30"
          height="26"
          viewBox="0 0 30 26"
          aria-hidden
          style={{
            position: "absolute",
            bottom: -14,
            [tail === "bl" ? "left" : "right"]: "18%",
            transform: tail === "br" ? "scaleX(-1)" : undefined,
          }}
        >
          <path d="M27 2C22 14 12 21 2 24c9-1 18-5 25-11z" fill="#FFFFFF" stroke="#1B1729" strokeWidth="2" strokeLinejoin="round" />
          <path d="M25 3C21 12 13 18 5 22" stroke="#FFFFFF" strokeWidth="3" />
        </svg>
      )}
    </div>
  );
}

/** 카드 한 장 — 좌: 달(또는 번호) / 우: 큰 글씨 + 근거 한 줄 */
function RowCard({
  left,
  big,
  small,
  body,
  tone = "good",
}: {
  left: React.ReactNode;
  big: string;
  small?: string;
  body: string;
  tone?: "good" | "care";
}) {
  const edge = tone === "good" ? "rgba(201,169,78,.42)" : "rgba(155,138,196,.38)";
  const bigColor = tone === "good" ? "#F3EAD3" : "#DCD4EC";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "13px 15px",
        borderRadius: 14,
        background: "linear-gradient(160deg, rgba(30,26,60,.92) 0%, rgba(19,20,38,.86) 100%)",
        border: `1px solid ${edge}`,
      }}
    >
      <div className="flex-none" style={{ width: 34, display: "flex", justifyContent: "center" }}>
        {left}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="font-myeongjo" style={{ fontSize: 25, fontWeight: 700, color: bigColor, lineHeight: 1.1 }}>
            {big}
          </span>
          {small ? <span style={{ fontSize: 11.5, color: "#8F87A8" }}>{small}</span> : null}
        </div>
        <p style={{ marginTop: 5, fontSize: 13, lineHeight: 1.62, color: "#C8C0DC" }}>{body}</p>
      </div>
    </div>
  );
}

/* ── ① 만나는 달 3장 — 4章 뒤 ──────────────────────────── */

export function MonthCards({ rows }: { rows: InyeonRow[] }) {
  if (!rows?.length) return null;
  return (
    <Band lines={["방금 그 세 달,", "달력에 옮겨", "적어 뒀어요."]} cut="j2" sfx="콕—">
      {rows.slice(0, 3).map((r) => (
        <RowCard
          key={r.label}
          left={<Moon phase={phaseOfScore(r.score)} size={30} />}
          big={`${r.month}월`}
          small={`${r.year}년`}
          body={humanize(r.tags.slice(0, 2).join(" · ")) || "흐름이 열리는 달이에요"}
        />
      ))}
    </Band>
  );
}

/* ── ② 조심할 달 — 7章 뒤 ─────────────────────────────── */

export function ShakyCards({ rows }: { rows: InyeonRow[] }) {
  if (!rows?.length) return null;
  return (
    <Band lines={["나쁜 달이 아니에요.", "속도만 늦추면", "되는 달이에요."]} cut="w2">
      {rows.slice(0, 2).map((r) => (
        <RowCard
          key={r.label}
          tone="care"
          left={<Moon phase="cloud" size={30} />}
          big={`${r.month}월`}
          small={`${r.year}년`}
          body={humanize(r.tags.slice(0, 2).join(" · ")) || "마음이 앞서기 쉬운 달이에요"}
        />
      ))}
    </Band>
  );
}

/* ── ③ 알아보는 신호 — 6章 뒤 ─────────────────────────── */

/** 짝의 결(오행)이 관계에서 드러나는 방식 — 세 번째 신호를 여기서 만든다.
 *  (앞의 둘은 확정값의 signals 를 그대로 쓴다. 본문과 카드가 같은 값을 말해야 한다) */
const OH_SIGNAL: Record<string, string> = {
  목: "다음에 할 일을 자기가 먼저 정해 온다",
  화: "좋다는 말을 그 자리에서 한다",
  토: "말보다 손이 먼저 나가 필요한 걸 해둔다",
  금: "시간 약속이 정확하고 어길 것 같으면 미리 알린다",
  수: "내가 지나가듯 말한 걸 기억했다가 되묻는다",
};

export function SignalCards({ inyeon }: { inyeon: InyeonFacts }) {
  const list = [...(inyeon.signals ?? []), OH_SIGNAL[inyeon.spouseOh || "토"]].filter(Boolean).slice(0, 3);
  if (!list.length) return null;
  return (
    <Band lines={["방금 그 셋,", "이렇게만", "기억하세요."]} cut="w3">
      {list.map((s, i) => (
        <RowCard
          key={i}
          left={
            <span
              className="font-myeongjo"
              style={{ fontSize: 19, color: "#C9A94E", fontWeight: 700 }}
            >
              {["一", "二", "三"][i]}
            </span>
          }
          big={["약속", "기억", "속도"][i] ?? "신호"}
          body={s}
        />
      ))}
    </Band>
  );
}

/* ── ③-B 타고난 끌림 신호 — 1章 뒤 ────────────────────── */

/** 명식 용어를 그대로 쓰되 **바로 옆에 풀이를 붙인다.**
 *  청월당·타이트 둘 다 원국 용어를 증거로 노출한다 — 못 읽어도 "이건 내 거"가 되는 덩어리다.
 *  용어만 있으면 불친절하고, 풀이만 있으면 근거가 사라진다. 둘을 붙여야 증거가 된다. */
const CHARM: [string, string][] = [
  ["도화", "처음 만난 자리에서 눈에 걸리는 신호"],
  ["홍염", "가까이서 볼수록 매력이 짙어지는 신호"],
  ["천을귀인", "결정적인 순간에 누가 다리를 놓아 주는 신호"],
  ["금여성", "귀하게 대접받는 관계가 붙는 신호"],
];

export function CharmChips({ inyeon }: { inyeon: InyeonFacts }) {
  const have: [string, string][] = [];
  if (inyeon.dohwaCount > 0) have.push(CHARM[0]);
  if (inyeon.hongyeomCount > 0) have.push(CHARM[1]);
  if (inyeon.hasCheoneul) have.push(CHARM[2]);
  if (inyeon.hasGeumyeo) have.push(CHARM[3]);
  // 신호가 하나도 없는 명식도 있다 — 그 사람에게 빈 카드를 보이면 "나는 없구나"가 된다.
  // 확정값 블록이 같은 자리에서 쓰는 문장("은은한 편 · 꾸준함이 무기")을 그대로 쓴다.
  if (!have.length) have.push(["은은한 편", "튀지 않아도 오래 남는 쪽 — 꾸준함이 무기예요"]);
  return (
    <Band lines={["원래 갖고 계신", "신호예요."]}>
      {have.slice(0, 3).map(([term, how]) => (
        <RowCard
          key={term}
          left={
            <svg width="19" height="19" viewBox="0 0 74 74" aria-hidden>
              <path d="M37 6l7.4 22.6L67 36l-22.6 7.4L37 66l-7.4-22.6L7 36l22.6-7.4z" fill="#C9A94E" opacity=".8" />
            </svg>
          }
          big={term}
          body={how}
        />
      ))}
    </Band>
  );
}

/* ── ④ 짝 카드 재게시 — 5章 **직전** ──────────────────── */

/** 얼굴 카드는 결과지 머리(요약부)에 있고 5章 본문은 한참 아래다.
 *  프롬프트는 5章에게 「바로 위 표를 회수하라」고 시키는데 실제로는 멀어서, 손님이 그 연결을
 *  못 짓는다(2026-08-24 화면 실측). 카드를 옮기는 대신 **작게 다시 세워** 회수 루프를 잇는다.
 *  머리의 큰 카드는 결제 직후 보상으로 그대로 둔다. */
export function PartnerRecall({
  src,
  ohKo,
  keul,
  ageDir,
  place,
}: {
  src: string | null;
  ohKo: string;
  keul: string;
  ageDir: string;
  place: string;
}) {
  const ok = src ? assetSrc(src) : null;
  return (
    <div
      style={{
        margin: "14px 0 0",
        display: "flex",
        gap: 13,
        alignItems: "center",
        padding: "13px 15px",
        borderRadius: 14,
        background: "linear-gradient(160deg, rgba(34,28,66,.94) 0%, rgba(21,20,42,.88) 100%)",
        border: "1px solid rgba(201,169,78,.35)",
      }}
    >
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ok}
          alt=""
          draggable={false}
          className="flex-none select-none object-cover"
          style={{ width: 62, aspectRatio: "3 / 4", borderRadius: 8, border: "1px solid rgba(223,214,238,.5)" }}
        />
      ) : null}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11.5, letterSpacing: "0.14em", color: "#9B8AC4", fontWeight: 600 }}>
          앞에서 본 그 사람
        </p>
        <p className="font-myeongjo" style={{ marginTop: 3, fontSize: 16, fontWeight: 700, color: "#F3EAD3" }}>
          {ohKo}의 결 · {ageDir}
        </p>
        <p style={{ marginTop: 4, fontSize: 12.5, lineHeight: 1.6, color: "#C8C0DC" }}>
          {keul} · {place}
        </p>
      </div>
    </div>
  );
}

/* ── ⑤ 컷 인터루드 — 숨 쉬는 자리 ─────────────────────── */

/** 티저가 쓰는 설화 컷을 결과지 본문 사이에 한 장씩 눕힌다.
 *  새 이미지를 만들지 않는다 — 이미 있는 자산(public/products/jiknyeo)의 재배치다. */
export function CutInterlude({ id, say }: { id: string; say: string }) {
  const src = assetSrc(`/products/jiknyeo/${id}.webp`) ?? assetSrc(`/products/jiknyeo/${id}.png`);
  if (!src) return null;
  return (
    // 풀블리드 — 청월당은 테두리 컷과 **가장자리까지 꽉 찬 컷**을 번갈아 써서 리듬을 만든다
    // (해부 §3: 우리에게 없던 장치 3개 중 하나). 페이지 좌우 패딩(12px)을 음수 마진으로 상쇄한다.
    <figure style={{ margin: "18px -12px 0" }}>
      <div style={{ position: "relative", overflow: "hidden", background: "#0B0F1A" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="w-full select-none object-cover"
          style={{ aspectRatio: "3 / 2", objectPosition: "center 22%", display: "block" }}
        />
        {/* 위·아래를 페이지 바탕으로 녹인다 — 액자 대신 페이드로 잇는 게 청월당 문법이다 */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{ height: "22%", background: "linear-gradient(180deg, #0B0F1A, rgba(11,15,26,0))" }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ height: "62%", background: "linear-gradient(180deg, rgba(11,15,26,0), rgba(11,15,26,.92) 78%, #0B0F1A)" }}
        />
        <figcaption
          className="font-myeongjo absolute inset-x-0 bottom-0 px-5 pb-4 text-center"
          style={{ fontSize: 15, lineHeight: 1.6, color: "#F1EAFB" }}
        >
          {say}
        </figcaption>
      </div>
    </figure>
  );
}

/* ── ⑥ 프롤로그 — 결과지의 첫 화면 ────────────────────── */

/** 청월당은 프롤로그 한 장(19,052px)을 통째로 인사에 쓴다. 타이트는 표지+목차 카드 6장으로 연다.
 *  우리는 달력부터 들이밀고 있었다 — 결제 직후 1초가 원하는 건 정보가 아니라 **환대**다.
 *
 *  세 가지를 한 블록에서 끝낸다:
 *   ① 호명 인사(관계)  ② 받은 분량을 숫자로(물성)  ③ 목차 + 「고민은 9장에서」 예고(재실망 공포 선해소)
 *  ③이 중요한 이유: 확답이 스크롤 85% 지점에 있어서, 손님이 거기 닿기 전에 판정을 내려 버린다. */
export function Prologue({
  who,
  chapters,
  charCount,
  monthCount,
  isMarriage,
}: {
  who: string;
  /** 장 제목 목록 — 목차 카드에 그대로 쓴다 */
  chapters: string[];
  charCount: number;
  monthCount: number;
  isMarriage: boolean;
}) {
  const name = who || "그대";
  // 고민에 답하는 장 — 제목으로 찾는다(장 수가 바뀌어도 따라오게)
  const askIdx = chapters.findIndex((t) => /고민|물음/.test(t));
  const num = (n: number) => n.toLocaleString("ko-KR");
  return (
    <div style={{ margin: "18px 0 0" }}>
      {/* 인사 — 말풍선이 화면의 주인공(실측 규격 lg) */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2 }}>
        <Bubble
          lines={[`${name}님,`, "기다리고 있었어요.", "오늘 것부터 열게요."]}
          size="lg"
          tail="bl"
        />
        {(() => {
          const face = assetSrc("/products/jiknyeo/sdSmile-cut.png");
          if (!face) return null;
          // eslint-disable-next-line @next/next/no-img-element
          return <img src={face} alt="" draggable={false} className="flex-none select-none"
            style={{ width: 92, height: 120, objectFit: "contain", objectPosition: "bottom", marginBottom: -8, marginLeft: -10 }} />;
        })()}
      </div>

      {/* 물성 — 받은 양을 숫자로 못박는다. 21,838px 를 손님은 셀 수 없다 */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        {[
          [`${chapters.length}`, "장"],
          [num(charCount), "자"],
          [`${monthCount}`, isMarriage ? "개 시기" : "개 달"],
        ].map(([big, small]) => (
          <div
            key={small}
            style={{
              textAlign: "center",
              padding: "11px 6px",
              borderRadius: 12,
              background: "linear-gradient(160deg, rgba(30,26,60,.92), rgba(19,20,38,.86))",
              border: "1px solid rgba(201,169,78,.34)",
            }}
          >
            <p className="font-myeongjo" style={{ fontSize: 21, fontWeight: 700, color: "#F3EAD3", lineHeight: 1.1 }}>{big}</p>
            <p style={{ marginTop: 3, fontSize: 11.5, color: "#9B8AC4" }}>{small}</p>
          </div>
        ))}
      </div>

      {/* 자기 증명 — 우리만 하는 것을 우리만 한다고 말한다.
          랜딩엔 있는 문구가 정작 결과지 안엔 없었다(손님은 비교 대상이 없어 유일함을 모른다) */}
      <p style={{ marginTop: 10, textAlign: "center", fontSize: 12, lineHeight: 1.7, color: "#A99FC4" }}>
        여기 적힌 달은 지어낸 말이 아니라
        <br />
        <b style={{ color: "#E4D9F6" }}>{name}님 만세력 계산에서 나온 값</b>이에요.
      </p>

      {/* 목차 — 탭하면 그 장으로. 고민 장에는 뱃지를 달아 미리 약속한다 */}
      {chapters.length > 0 && (
        <div
          style={{
            marginTop: 14,
            padding: "14px 15px",
            borderRadius: 14,
            background: "rgba(19,20,38,.72)",
            border: "1px solid rgba(199,176,236,.20)",
          }}
        >
          <p style={{ fontSize: 11.5, letterSpacing: "0.18em", color: "#9B8AC4", fontWeight: 600, textAlign: "center" }}>
            오늘 여는 것
          </p>
          <ol style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
            {chapters.map((t, i) => (
              <li key={i}>
                <a
                  href={`#ch-${i}`}
                  style={{ display: "flex", alignItems: "baseline", gap: 8, textDecoration: "none" }}
                >
                  <span className="font-myeongjo" style={{ fontSize: 12, color: "#C9A94E", flex: "none", width: 18 }}>
                    {["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][i] ?? i + 1}
                  </span>
                  <span className="font-myeongjo" style={{ fontSize: 14, color: "#E4DCF2", lineHeight: 1.45 }}>
                    {t.replace(/^\s*\d+\s*[.·)]\s*/, "")}
                    {i === askIdx && (
                      <b
                        style={{
                          marginLeft: 6,
                          fontSize: 10.5,
                          padding: "2px 7px",
                          borderRadius: 999,
                          background: "rgba(201,169,78,.18)",
                          border: "1px solid rgba(201,169,78,.45)",
                          color: "#E8D9A8",
                          whiteSpace: "nowrap",
                        }}
                      >
                        적어주신 고민, 여기서
                      </b>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ── ⑦ 마치며 — 결과지의 마지막 10초 ─────────────────── */

/** 3사 공통 표준(청월당 14장 「마치며」·음양관·귀신사주). 후기·공유 직전의 감정을 정하는 자리다.
 *  청월당도 410자뿐 — 길 필요가 없다. 정적 템플릿 + 이름·가장 가까운 좋은 달만 치환(토큰 0). */
export function ClosingLetter({ who, nearest }: { who: string; nearest?: { year: number; month: number } | null }) {
  const name = who || "그대";
  return (
    <div
      style={{
        margin: "20px 0 0",
        padding: "22px 20px 24px",
        borderRadius: 16,
        background: "linear-gradient(160deg, rgba(34,28,66,.94), rgba(19,20,38,.9))",
        border: "1px solid rgba(201,169,78,.34)",
      }}
    >
      <p className="font-myeongjo" style={{ fontSize: 13, letterSpacing: "0.22em", color: "#C9A94E", textAlign: "center" }}>
        마치며
      </p>
      <div
        className="font-myeongjo"
        style={{ marginTop: 14, fontSize: 14.5, lineHeight: 2, color: "#DCD4EC", textAlign: "center" }}
      >
        <p>여기까지 읽어 주셔서 고마워요.</p>
        <p style={{ marginTop: 12 }}>
          제가 짚어 드린 건 <b style={{ color: "#F3EAD3" }}>달</b>이지
          <br />
          {name}님의 마음까지는 아니에요.
        </p>
        <p style={{ marginTop: 12 }}>
          {nearest ? (
            <>
              가장 가까운 문은{" "}
              <b style={{ color: "#F3EAD3" }}>
                {nearest.year}년 {nearest.month}월
              </b>
              이에요.
              <br />그 달이 오면, 오늘 읽은 걸 한 번 더 펴 보세요.
            </>
          ) : (
            <>문이 열리는 달이 오면, 오늘 읽은 걸 한 번 더 펴 보세요.</>
          )}
        </p>
        <p style={{ marginTop: 12 }}>기다리는 일은 제가 잘해요.</p>
        <p style={{ marginTop: 12, color: "#B6ABD2" }}>그때까지, 잘 지내고 계세요.</p>
      </div>
      <p className="font-brush" style={{ marginTop: 16, textAlign: "center", fontSize: 15, color: "#C9A94E", letterSpacing: "0.3em" }}>
        織 女
      </p>
    </div>
  );
}
