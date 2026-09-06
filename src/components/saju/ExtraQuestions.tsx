"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResultBody } from "@/components/saju/ResultBody";
import { formatKRW } from "@/lib/utils";

export type AnsweredQuestion = {
  id: string;
  question: string;
  answer_md: string | null;
};

// 추가질문권 — 결과지를 다 본 자리에서 하나 더 묻는다.
// 여기가 결과지의 마지막 화면이라, 타이트가 "리뷰 작성 / 이어보기"를 박아둔 자리와 같다.
// 다른 상품으로 넘기기 전에 **같은 상담을 이어가는** 업셀을 먼저 둔다 — 문턱이 제일 낮다.
export function ExtraQuestions({
  resultId,
  price,
  answered,
  tone,
  freeCredit = false,
}: {
  resultId: string;
  /** 유료 값. 상품이 내려가 있으면 null 이고, 그땐 답례 질문권이 있을 때만 이 블록이 선다. */
  price: number | null;
  answered: AnsweredQuestion[];
  tone: "sangun" | "saju";
  /** 후기 답례로 받아 둔, 아직 안 쓴 질문권이 있는가. 있으면 결제창을 안 거친다. */
  freeCredit?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sangun = tone === "sangun";
  const accent = sangun ? "var(--gold-bright, #e8c96a)" : "#c9a8ff";
  const faint = sangun ? "rgba(232,201,106,0.55)" : "#9a8cd0";
  const border = sangun ? "rgba(232,201,106,0.22)" : "rgba(150,90,255,0.28)";
  const panel = sangun ? "rgba(255,255,255,0.03)" : "rgba(150,90,255,0.07)";

  // 답례 질문권이 있으면 **값을 말하지 않는다.** 이미 후기로 치른 것이라
  // 여기서 금액을 다시 꺼내면 「공짜라더니 얼마?」로 읽힌다.
  const copy = sangun
    ? {
        eyebrow: "追問",
        title: "더 물을 것이 있느냐",
        body: freeCredit
          ? "네 소감, 잘 받았다. 답례로 하나는 복채 없이 봐주마.\n걸리는 것 하나만 물어라."
          : "장부는 다 읽어 줬다. 그래도 걸리는 게 있으면 하나만 더 물어라.\n복채를 따로 받고, 그 물음만 정면으로 답해 주마.",
        cta: freeCredit ? "복채 없이 하나 묻기 — 후기 답례" : `복채 ${formatKRW(price ?? 0)} 내고 하나 더 묻기`,
        placeholder: "예) 지금 회사 그만두고 준비하던 일 시작해도 되나",
        submit: "이대로 묻는다",
        answeredTitle: "네가 물은 것",
        busy: freeCredit ? "장부를 다시 펴는 중…" : "장부를 여는 중…",
      }
    : {
        eyebrow: "追問",
        title: "더 여쭤보고 싶은 게 있으세요?",
        body: freeCredit
          ? "후기 고맙습니다. 답례로 질문 하나를 무료로 받아요.\n궁금한 것 하나만 적어 주세요."
          : "결과지를 읽고 나서 생긴 물음이 있다면 하나만 더 받아요.\n같은 명식으로, 그 질문만 정면으로 답해 드려요.",
        cta: freeCredit ? "무료로 하나 여쭤보기 — 후기 답례" : `${formatKRW(price ?? 0)}로 하나 더 여쭤보기`,
        placeholder: "예) 지금 만나는 사람과 계속 가도 될까요",
        submit: "이대로 여쭤보기",
        answeredTitle: "여쭤보신 것",
        busy: freeCredit ? "답을 적는 중…" : "준비하는 중…",
      };

  async function submit() {
    if (question.trim().length < 5) {
      setError("질문을 조금만 더 자세히 적어 주세요 (5자 이상)");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/questions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId, question: question.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "잠시 후 다시 시도해 주세요");
        setBusy(false);
        return;
      }
      // 답례 질문은 결제창을 안 거친다 — 서버가 답까지 만들어 놨으므로
      // 이 화면을 다시 그리면 위 「네가 물은 것」 자리에 답이 붙어 있다.
      if (json.free) {
        setQuestion("");
        setOpen(false);
        router.refresh();
        setBusy(false);
        return;
      }
      router.push(`/checkout/${json.orderId}`);
    } catch {
      setError("네트워크가 불안정해요. 다시 시도해 주세요");
      setBusy(false);
    }
  }

  return (
    // id="ask" — 후기를 쓰고 돌아온 손님이 곧장 여기로 떨어진다(후기 폼이 #ask 로 보낸다).
    // scroll-mt 는 결과지 상단 고정 바 높이만큼 — 없으면 제목이 바 뒤로 숨는다.
    <section id="ask" className="mt-8 scroll-mt-20">
      {/* 이미 답을 받은 질문들 — 결과지의 일부처럼 이어 붙는다 */}
      {answered.length > 0 && (
        <div className="mb-7">
          <p
            className="font-myeongjo mb-3 px-1"
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: accent }}
          >
            {copy.answeredTitle}
          </p>
          {answered.map((a) => (
            <article
              key={a.id}
              className="mb-4 border px-4 py-4"
              style={{ borderColor: border, background: panel }}
            >
              <p className="font-myeongjo text-[14px] leading-[1.7]" style={{ color: accent }}>
                “{a.question}”
              </p>
              <div className="mt-3" style={{ color: "#efe6d2" }}>
                <ResultBody markdown={a.answer_md ?? ""} />
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="border px-5 py-6 text-center" style={{ borderColor: border, background: panel }}>
        <p className="font-myeongjo text-[11px] tracking-[0.22em]" style={{ color: faint }}>
          {copy.eyebrow}
        </p>
        <h3 className="font-myeongjo mt-2 text-[19px] font-bold leading-[1.5]" style={{ color: "#efe6d2" }}>
          {copy.title}
        </h3>
        <p className="font-myeongjo mt-3 whitespace-pre-line text-[13px] leading-[1.8]" style={{ color: faint }}>
          {copy.body}
        </p>

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-myeongjo mt-5 w-full border px-4 py-3 text-[15px] font-bold"
            style={{ borderColor: accent, color: accent, background: "transparent" }}
          >
            {copy.cta}
          </button>
        ) : (
          <div className="mt-5 text-left">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={copy.placeholder}
              rows={4}
              maxLength={500}
              className="font-myeongjo w-full border px-3 py-3 text-[14px] leading-[1.7]"
              style={{ borderColor: border, background: "rgba(0,0,0,0.25)", color: "#efe6d2" }}
            />
            <p className="mt-1 text-right text-[11px]" style={{ color: faint }}>
              {question.length}/500
            </p>
            {error && (
              <p className="font-myeongjo mt-2 text-[13px]" style={{ color: "#d8563f" }}>
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="font-myeongjo mt-3 w-full px-4 py-3 text-[15px] font-bold"
              style={{
                background: busy ? "rgba(255,255,255,0.12)" : accent,
                color: busy ? faint : "#1a1408",
              }}
            >
              {busy
                ? copy.busy
                : freeCredit
                  ? copy.submit
                  : `${copy.submit} · ${formatKRW(price ?? 0)}`}
            </button>
            <p className="font-myeongjo mt-2 text-center text-[11px] leading-[1.7]" style={{ color: faint }}>
              {freeCredit
                ? "결제 없이 바로 답이 붙습니다 · 20~60초 걸려요"
                : "결제 후 이 결과지로 돌아와 답이 붙습니다"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
