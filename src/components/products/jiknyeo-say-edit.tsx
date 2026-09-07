"use client";

// 말풍선 자리 편집 패널 — `?edit=say` 에서만 뜬다.
//
// 쓰는 법: 티저 주소 뒤에 `&edit=say` 를 붙이고 들어가면 말풍선에 점선 테두리가 생긴다.
//   · 말풍선을 **끌면** 자리가 옮겨진다(폰에서는 손가락으로)
//   · 오른쪽 아래 **모서리 손잡이**를 끌면 크기가 바뀐다
//   · 아래 패널에서 글씨 크기를 조절하고, 다 맞췄으면 「코드 복사」를 누른다
//
// 복사한 조각은 `src/lib/jiknyeo-say-box.ts` 의 SAY_BOX_DEFAULT 를 그대로 대체한다.
// 값은 브라우저에만 저장되므로 손님 화면과 운영 배포에는 영향이 없다.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  SAY_BOX_DEFAULT,
  isSayEditMode,
  resetSayBoxes,
  setSayBox,
  setSayFont,
  useSayCodeSnippet,
  useSayStore,
} from "@/lib/jiknyeo-say-box";

function Nudge({ id, axis, dir }: { id: string; axis: "x" | "y" | "w"; dir: 1 | -1 }) {
  const s = useSayStore();
  const box = s.boxes[id] ?? SAY_BOX_DEFAULT[id];
  return (
    <button
      type="button"
      onClick={() => setSayBox(id, { ...box, [axis]: Math.round((box[axis] + dir) * 10) / 10 })}
      className="h-6 w-6 rounded text-[13px] leading-none"
      style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}
    >
      {dir > 0 ? "+" : "−"}
    </button>
  );
}

export function SayEditPanel() {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  // 패널이 펴진 채로 화면 아래 절반을 먹으면 정작 **옮기려는 말풍선이 그 뒤에 가린다**.
  // 기본은 한 줄만, 숫자를 직접 만질 때만 편다.
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const s = useSayStore();
  const snippet = useSayCodeSnippet();
  useEffect(() => setMounted(true), []);
  if (!mounted || !isSayEditMode()) return null;

  const ids = Object.keys(SAY_BOX_DEFAULT);
  return createPortal(
    <div
      data-say-edit-panel
      className="fixed inset-x-0 bottom-0 z-[60] max-h-[52vh] overflow-y-auto px-3 py-2"
      style={{ background: "rgba(12,10,24,0.86)", borderTop: "1px solid rgba(217,199,232,0.4)", color: "#fff", backdropFilter: "blur(6px)" }}
    >
      <div className="mx-auto w-full max-w-[560px]">
        <div className="flex items-center gap-2">
          <span className="text-[12px]" style={{ color: "#cfc6e0" }}>
            글씨
          </span>
          <button
            type="button"
            onClick={() => setSayFont(s.font - 1)}
            className="h-7 w-7 rounded text-[15px] leading-none"
            style={{ background: "rgba(255,255,255,0.14)" }}
          >
            −
          </button>
          <span className="w-10 text-center text-[13px] font-bold">{s.font}px</span>
          <button
            type="button"
            onClick={() => setSayFont(s.font + 1)}
            className="h-7 w-7 rounded text-[15px] leading-none"
            style={{ background: "rgba(255,255,255,0.14)" }}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              const text = snippet();
              setShown(text); // 클립보드가 막힌 환경(인앱 브라우저 등)에서도 눈으로 가져갈 수 있게 항상 펼친다
              navigator.clipboard?.writeText(text).then(
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                },
                () => {
                  /* 아래 상자에 그대로 떠 있으니 따로 알릴 것이 없다 */
                },
              );
            }}
            className="ml-auto rounded px-3 py-1.5 text-[12px] font-bold"
            style={{ background: "#d9c7e8", color: "#1a1330" }}
          >
            {copied ? "복사됨!" : "코드 복사"}
          </button>
          <button
            type="button"
            onClick={() => resetSayBoxes()}
            className="rounded px-2.5 py-1.5 text-[12px]"
            style={{ background: "rgba(255,255,255,0.14)" }}
          >
            초기화
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded px-2.5 py-1.5 text-[12px]"
            style={{ background: "rgba(255,255,255,0.14)" }}
          >
            {open ? "▼ 숫자" : "▲ 숫자"}
          </button>
        </div>

        {!open && !shown && (
          <p className="mt-1.5 text-[11px]" style={{ color: "#9a92b0" }}>
            말풍선을 끌어서 옮기고, 노란 동그라미로 크기를 바꾸세요. 다 맞추면 「코드 복사」.
          </p>
        )}

        {shown && (
          <div className="mt-2">
            <textarea
              readOnly
              value={shown}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded p-2 font-mono text-[11px] leading-[1.5]"
              style={{ background: "#0d0b16", color: "#e8e2f4", border: "1px solid rgba(217,199,232,0.35)", height: 132 }}
            />
            <button
              type="button"
              onClick={() => setShown(null)}
              className="mt-1 rounded px-2.5 py-1 text-[11px]"
              style={{ background: "rgba(255,255,255,0.14)" }}
            >
              닫기
            </button>
          </div>
        )}

        <table className={`mt-2.5 w-full text-[12px] ${open ? "" : "hidden"}`}>
          <tbody>
            {ids.map((id) => {
              const b = s.boxes[id] ?? SAY_BOX_DEFAULT[id];
              const dirty = !!s.boxes[id];
              return (
                <tr key={id}>
                  <td className="py-1 pr-2 font-bold" style={{ color: dirty ? "#ffe07a" : "#cfc6e0" }}>
                    {id}
                  </td>
                  {(["x", "y", "w"] as const).map((axis) => (
                    <td key={axis} className="py-1 pr-2">
                      <span className="mr-1" style={{ color: "#9a92b0" }}>
                        {axis}
                      </span>
                      <span className="mr-1 inline-block w-9 text-right font-mono">{b[axis]}</span>
                      <Nudge id={id} axis={axis} dir={-1} />
                      <Nudge id={id} axis={axis} dir={1} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>,
    document.body,
  );
}
