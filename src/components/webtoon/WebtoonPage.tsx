// 손님에게 나가는 웹툰 페이지 — 컷을 세로로 이어붙이고 말풍선에 손님 데이터를 채운다.
// 편집기(어드민)가 저장한 컷 배열을 그대로 받는다.

import { WebtoonCut, type WebtoonBubble } from "./WebtoonCut";
import { WebtoonTextCut, type WebtoonTextStyle } from "./WebtoonTextCut";
import { fillWebtoonText } from "@/lib/saju/webtoon-tokens";

/** 편집기가 저장하는 컷 한 장. DB(webtoon_pages.cuts)에 이 모양 그대로 들어간다. */
export type WebtoonCutData = {
  id: string;
  /** "text" = 그림 없이 글만 있는 칸(나레이션). 없으면 그림 컷 — 예전에 저장한 데이터와 호환된다 */
  type?: "image" | "text";
  src: string;
  alt: string;
  ratio?: number;
  bubbles: WebtoonBubble[];
  /** 글 컷일 때만 쓰는 값들 */
  textCut?: WebtoonTextStyle;
};

export const isTextCut = (c: WebtoonCutData) => c.type === "text";

export function WebtoonPage({
  cuts,
  tokens,
  className,
}: {
  cuts: WebtoonCutData[];
  /** buildWebtoonTokens() 결과. 값이 없는 토큰은 키가 아예 없다. */
  tokens: Record<string, string>;
  className?: string;
}) {
  // 아직 안 채운 칸은 손님 화면에서 통째로 뺀다 — 편집 중인 빈 칸이 그대로 나가면 안 된다.
  const ready = cuts.filter((c) => (isTextCut(c) ? !!c.textCut?.text?.trim() : !!c.src));
  if (!ready.length) return null;

  return (
    // 컷 사이 간격 0 — 웹툰 페이지는 빈틈없이 붙는다
    <div className={`flex flex-col ${className ?? ""}`}>
      {ready.map((cut, i) => {
        if (isTextCut(cut)) {
          // 글 컷은 문장 전체가 하나라 토큰을 못 채우면 칸째로 뺀다(반쪽 문장이 나가면 더 이상하다)
          const filled = fillWebtoonText(cut.textCut!.text, tokens);
          if (filled === null) return null;
          return <WebtoonTextCut key={cut.id} {...cut.textCut!} text={filled} />;
        }
        // 채울 수 없는 토큰이 든 말풍선은 뺀다(fillWebtoonText 가 null 을 준다).
        // 손님 화면에 "{전환점}" 이 그대로 보이는 것보다 그 대사가 없는 편이 낫다.
        const bubbles = cut.bubbles
          .map((b) => {
            const text = fillWebtoonText(b.text, tokens);
            return text === null ? null : { ...b, text };
          })
          .filter((b): b is WebtoonBubble => b !== null);

        return (
          <WebtoonCut
            key={cut.id}
            src={cut.src}
            alt={cut.alt}
            ratio={cut.ratio}
            priority={i < 2} // 첫 두 컷은 스크롤 전에 보이므로 먼저 받는다
            bubbles={bubbles}
          />
        );
      })}
    </div>
  );
}
