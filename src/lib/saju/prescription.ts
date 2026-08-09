// =====================================================
// 산군의 처방 — 용신·기신 오행을 생활 지침 표로 바꾼다 (LLM 0원)
// =====================================================
// 타이트 플래그십 실측(24,000자)에서 체감 가치가 가장 크던 게 이 표다 — 방향·색·지갑·운동까지
// 찍어 주면 "내 사주를 계산했다"가 생활로 내려온다. 그런데 이건 창작이 아니라 **조견표**다:
// 용신 오행이 같으면 처방도 같다. LLM 에게 시키면 지어내고, 코드로 두면 공짜고 틀리지 않는다.
//
// 얼굴 카드(partner-face.ts)와 같은 원칙: 코드가 계산하고, 결과지 표와 프롬프트가 **같은 값**을 본다.
import type { SajuAnalysisResponse } from "./saju-api";

export type PrescriptionRow = { label: string; do_: string; avoid: string };
export type Prescription = {
  /** 용신 오행(한글 한 글자) — 카드 근거 줄에 쓴다 */
  yongKo: string;
  heeKo: string;
  giKo: string;
  rows: PrescriptionRow[];
};

// 오행별 생활 코드. do(살릴 것) 문구와 avoid(누를 것) 문구를 따로 둔다 —
// 같은 오행이라도 "네 편일 때"와 "과할 때"는 다른 얼굴이라 한 문장을 뒤집어 쓰면 어색해진다.
const RX: Record<
  string,
  { dir: string; color: string; item: string; place: string; sport: string; avoidNote: string }
> = {
  목: {
    dir: "동쪽",
    color: "초록·청록",
    item: "작은 화분, 나무 소재 소품",
    place: "배우고 키우는 판 — 교육·기획·성장하는 조직",
    sport: "아침 스트레칭, 산길 걷기",
    avoidNote: "일 벌이기·새 판 욕심",
  },
  화: {
    dir: "남쪽",
    color: "붉은색·주황",
    item: "따뜻한 조명, 캔들",
    place: "사람 앞에 서는 판 — 발표·영업·보여주는 일",
    sport: "달리기·유산소로 태우기",
    avoidNote: "감정 과열·욱해서 지르는 결정",
  },
  토: {
    dir: "지금 자리(중앙) — 멀리 옮기지 않는 것",
    color: "노랑·황토·베이지",
    item: "도자기·흙 소재 소품, 원석",
    place: "오래 쌓는 판 — 운영·관리·부동산처럼 버티는 일",
    sport: "매일 같은 시간 걷기, 요가",
    avoidNote: "고집으로 눌러앉기·미련",
  },
  금: {
    dir: "서쪽",
    color: "흰색·회색·은색",
    item: "금속 시계, 은 액세서리, 정돈된 책상",
    place: "숫자와 계약의 판 — 재무·법·시스템이 있는 일",
    sport: "웨이트·필라테스로 몸을 조이기",
    avoidNote: "차갑게 끊어내기·말로 베기",
  },
  수: {
    dir: "북쪽",
    color: "검정·남색",
    item: "검정 지갑, 만년필, 유리 소품",
    place: "흐름을 읽는 판 — 전략·연구·글·기술",
    sport: "수영, 반신욕으로 풀기",
    avoidNote: "생각 과다·혼자 파고들기",
  },
};

/** 격국(억부용신)에서 처방표를 뽑는다. 용신 오행이 없으면 null — 표를 지어내지 않는다. */
export function computePrescription(analysis: SajuAnalysisResponse): Prescription | null {
  const rec = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const gg = rec(analysis.gyeokguk);
  const yongKo = String(rec(gg.yongsin).오행 ?? "").trim();
  const heeKo = String(gg.희신오행 ?? "").trim();
  const giKo = String(gg.기신오행 ?? "").trim();
  const yong = RX[yongKo];
  if (!yong) return null;
  const gi = RX[giKo];

  // avoid 열은 기신 오행의 생활 코드 — 기신이 없으면 "과한 것"이 없다는 뜻이라 빈 문구 대신
  // 용신 반대 결의 일반 경계를 깐다(표에 빈칸이 서면 계산이 덜 된 것처럼 보인다).
  const rows: PrescriptionRow[] = [
    { label: "방향", do_: `${yong.dir} 쪽에 앉고, 머물 곳도 그쪽을 본다`, avoid: gi ? `${gi.dir} 쪽 과열` : "정처 없이 옮겨 다니는 것" },
    { label: "색", do_: yong.color + (RX[heeKo] ? ` (곁들이면 ${RX[heeKo].color})` : ""), avoid: gi ? gi.color : "튀는 원색 도배" },
    { label: "곁에 둘 것", do_: yong.item, avoid: gi ? gi.item : "쓰지 않는 물건 쌓아두기" },
    { label: "맞는 판", do_: yong.place, avoid: gi ? gi.place : "결이 안 맞는 자리에 오래 버티기" },
    { label: "몸 쓰는 법", do_: yong.sport, avoid: gi ? `${gi.avoidNote}` : "몸을 안 쓰고 머리만 굴리기" },
  ];
  return { yongKo, heeKo, giKo, rows };
}

/** 처방 확정값 블록 — '산군의 처방' 장이 표와 같은 말을 하게 프롬프트에 주입한다. */
export function buildPrescriptionBlock(p: Prescription | null): string {
  if (!p) return "";
  const lines = p.rows.map((r) => `- ${r.label}: 해라 → ${r.do_} / 피해라 → ${r.avoid}`);
  return `[처방 확정값 — 이 장 머리에 같은 값이 표로 이미 떠 있다. 표를 다시 나열하지 말고, 이 값들이 **왜** 네 명식에서 나오는지(용신 ${p.yongKo}${p.heeKo ? `·희신 ${p.heeKo}` : ""}${p.giKo ? ` / 기신 ${p.giKo}` : ""})와 **생활 장면**(출근길·책상·주말)으로 풀어라. 표와 다른 방향·색·물건을 말하지 마라]\n${lines.join("\n")}`;
}
