import type { WebtoonCutData } from "@/components/webtoon/WebtoonPage";

// Published admin cuts predate the approved terminology. Adapt copy before filling
// profile tokens, so the stored artwork/layout and the visitor's own name stay intact.
const sajuText = (text: string) => text
  .replaceAll("나머지는 네 장부가 말해준다.", "나머지는 네 사주에 나와 있다.")
  .replaceAll("장부", "사주");

export function sangunSajuCuts(cuts: WebtoonCutData[]): WebtoonCutData[] {
  return cuts.map(cut => ({
    ...cut,
    alt: cut.alt.replaceAll("장부", "사주책"),
    bubbles: cut.bubbles.map(bubble => ({ ...bubble, text: sajuText(bubble.text) })),
    ...(cut.textCut ? { textCut: { ...cut.textCut, text: sajuText(cut.textCut.text) } } : {}),
  }));
}
