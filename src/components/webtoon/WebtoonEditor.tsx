"use client";

// 웹툰 페이지 편집기 (어드민) — 상품 하나의 컷 구성을 만들고 저장한다.
// 사진을 올리면 브라우저에서 webp로 줄여 Storage에 올리고, 돌려받은 공개 URL을 컷 경로로 쓴다.
// 저장은 상품별 1건(kind='teaser'). 덮어쓰기 전 직전 버전이 서버에 쌓여서 되돌릴 수 있다.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  WebtoonCut,
  WEBTOON_FONTS,
  type WebtoonBubble,
  type WebtoonFont,
  type BubbleShape,
  type BubbleTail,
} from "@/components/webtoon/WebtoonCut";
import { honorific, plainName } from "@/lib/saju/display-name";
import { WEBTOON_TOKENS, WEBTOON_SAMPLE_TOKENS, fillWebtoonText } from "@/lib/saju/webtoon-tokens";
import { isTextCut, type WebtoonCutData } from "@/components/webtoon/WebtoonPage";
import { WebtoonTextCut, TEXT_CUT_DEFAULTS, type WebtoonTextStyle } from "@/components/webtoon/WebtoonTextCut";

const SHAPES: { v: BubbleShape; label: string }[] = [
  { v: "none", label: "없음 (그림에 있음)" },
  { v: "round", label: "둥근" },
  { v: "ellipse", label: "타원" },
  { v: "rect", label: "사각" },
  { v: "thought", label: "생각" },
];

const TAILS: BubbleTail[] = [
  "none", "bottom", "bottom-left", "bottom-right",
  "top", "top-left", "top-right", "left", "right",
];

/** 손님 화면 렌더러(WebtoonPage)와 같은 모양이어야 한다 — 저장한 걸 그대로 그리니까 */
export type Cut = WebtoonCutData;
type Sel = { c: number; b: number };
type Version = { id: string; cuts: Cut[]; created_at: string };

const nid = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const newCut = (src = "", alt = "컷"): Cut => ({ id: nid(), src, alt, bubbles: [] });
/** 컷과 컷 사이에 끼우는 나레이션 칸 */
const newTextCut = (): Cut => ({ id: nid(), type: "text", src: "", alt: "글", bubbles: [], textCut: { text: "" } });
const round = (n: number, d = 1) => Number(n.toFixed(d));
const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** 원본 3MB짜리를 그대로 올리면 스토리지가 금방 찬다 — 폭 1125로 줄이고 webp로 굽는다 */
async function shrinkToWebp(file: File, maxW = 1125, quality = 0.85): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxW / bmp.width);
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  } catch {
    return file; // 변환 실패하면 원본으로 — 서버가 크기 상한에서 걸러준다
  }
}

export function WebtoonEditor({
  productId,
  productSlug,
  productName,
  initialCuts,
  initialVersions,
  initialPublished,
}: {
  productId: string;
  productSlug: string;
  productName: string;
  initialCuts: Cut[];
  initialVersions: Version[];
  initialPublished: boolean;
}) {
  const draftKey = `webtoon-draft-${productId}`;
  const [cuts, setCuts] = useState<Cut[]>(initialCuts.length ? initialCuts : [newCut()]);
  const [sel, setSel] = useState<Sel>({ c: 0, b: 0 });
  const [name, setName] = useState("김지훈");
  const [width, setWidth] = useState(390);
  const [grid, setGrid] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [published, setPublished] = useState(initialPublished);
  const [versions] = useState<Version[]>(initialVersions);
  const dragRef = useRef<{ c: number; b: number; el: HTMLElement } | null>(null);
  const draggedRef = useRef(false);

  // 저장 안 한 작업이 새로고침으로 날아가지 않게 브라우저에도 임시 보관
  useEffect(() => {
    if (!dirty) return;
    try { localStorage.setItem(draftKey, JSON.stringify(cuts)); } catch { /* 용량 초과는 무시 */ }
  }, [cuts, dirty, draftKey]);

  const edit = useCallback((next: Cut[]) => { setCuts(next); setDirty(true); }, []);

  const editCut = useCallback((ci: number, p: Partial<Cut>) => {
    setCuts((cs) => cs.map((c, i) => (i === ci ? { ...c, ...p } : c)));
    setDirty(true);
  }, []);

  /** 글 컷 전용 값 고치기 */
  const editText = useCallback((ci: number, p: Partial<WebtoonTextStyle>) => {
    setCuts((cs) => cs.map((c, i) => (i === ci ? { ...c, textCut: { text: "", ...c.textCut, ...p } } : c)));
    setDirty(true);
  }, []);

  const patch = useCallback((ci: number, bi: number, p: Partial<WebtoonBubble>) => {
    setCuts((cs) =>
      cs.map((c, i) => (i === ci ? { ...c, bubbles: c.bubbles.map((b, k) => (k === bi ? { ...b, ...p } : b)) } : c)),
    );
    setDirty(true);
  }, []);

  // 컷마다 그림 비율 자동 감지 — 로딩 전에 자리를 잡아 레이아웃이 안 튀게
  useEffect(() => {
    cuts.forEach((c, i) => {
      if (!c.src || c.ratio) return;
      const img = new Image();
      img.onload = () => {
        if (!img.naturalWidth || !img.naturalHeight) return;
        setCuts((cs) => cs.map((k, ki) => (ki === i ? { ...k, ratio: img.naturalWidth / img.naturalHeight } : k)));
      };
      img.src = /\.(webp|png|jpe?g|avif|gif|svg)$/i.test(c.src) || c.src.startsWith("http") ? c.src : `${c.src}.webp`;
    });
  }, [cuts]);

  const pctIn = (el: HTMLElement, e: { clientX: number; clientY: number }) => {
    const r = el.getBoundingClientRect();
    return { x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) };
  };

  const addAt = (ci: number) => (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedRef.current) { draggedRef.current = false; return; } // 끌기 끝의 click은 흘린다
    const { x, y } = pctIn(e.currentTarget, e);
    edit(cuts.map((c, i) =>
      i === ci
        ? { ...c, bubbles: [...c.bubbles, { x: round(x), y: round(y), text: "대사", bubble: "round", tail: "bottom-left" }] }
        : c,
    ));
    setSel({ c: ci, b: cuts[ci].bubbles.length });
  };

  // 드래그 — 이동/놓기를 window에서 받는다.
  // 손잡이에 포인터 캡처가 걸리면 pointermove가 손잡이로 재타겟돼 컷 핸들러가 못 받는 경우가 있다.
  const onHandleDown = (ci: number, bi: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setSel({ c: ci, b: bi });
    const stage = e.currentTarget.closest<HTMLElement>("[data-cut]");
    if (!stage) return;
    dragRef.current = { c: ci, b: bi, el: stage };
    draggedRef.current = false;

    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      draggedRef.current = true;
      const { x, y } = pctIn(d.el, ev);
      patch(d.c, d.b, { x: round(x), y: round(y) });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  // 방향키 미세 이동
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const step = e.shiftKey ? 1 : 0.2;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      setCuts((cs) =>
        cs.map((c, ci) =>
          ci !== sel.c ? c : {
            ...c,
            bubbles: c.bubbles.map((b, bi) =>
              bi === sel.b ? { ...b, x: round(clamp(b.x + d[0])), y: round(clamp(b.y + d[1])) } : b,
            ),
          },
        ),
      );
      setDirty(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  // ── 업로드 ───────────────────────────────────
  const upload = async (files: FileList | null, replaceAt?: number) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setBusy(true);
    setStatus(`사진 ${list.length}장 올리는 중…`);
    const made: Cut[] = [];
    try {
      for (const [i, f] of list.entries()) {
        setStatus(`사진 올리는 중… ${i + 1}/${list.length}`);
        const small = await shrinkToWebp(f);
        const fd = new FormData();
        fd.append("file", small);
        fd.append("folder", productSlug);
        const res = await fetch("/api/admin/webtoon/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "업로드 실패");
        if (replaceAt !== undefined) {
          editCut(replaceAt, { src: json.url, ratio: undefined });
          setStatus(`사진 교체됨 (${Math.round(json.bytes / 1024)}KB)`);
          return;
        }
        made.push({ ...newCut(json.url, f.name.replace(/\.[^.]+$/, "")) });
      }
      edit([...cuts, ...made]);
      setSel({ c: cuts.length, b: 0 });
      setStatus(`${made.length}장 추가됨`);
    } catch (err) {
      setStatus(`오류: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  // ── 저장 ─────────────────────────────────────
  const save = async () => {
    setBusy(true);
    setStatus("저장 중…");
    try {
      const res = await fetch("/api/admin/webtoon", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, kind: "teaser", name: productName, cuts, isPublished: published }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "저장 실패");
      setDirty(false);
      try { localStorage.removeItem(draftKey); } catch { /* 무시 */ }
      setStatus(`저장됨 · ${new Date().toLocaleTimeString("ko-KR")}`);
    } catch (err) {
      setStatus(`오류: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const moveCut = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= cuts.length) return;
    const next = [...cuts];
    [next[from], next[to]] = [next[to], next[from]];
    edit(next);
    setSel({ c: to, b: 0 });
  };

  const who = plainName(name);      // 반말용 — 산군
  const whoPolite = honorific(name); // 존댓말용
  // 미리보기 — 이름만 위에서 입력한 값으로 바꾸고 나머지는 샘플값.
  // 오타 난 토큰은 fillWebtoonText 가 null 을 주므로 원문을 그대로 남겨 눈에 띄게 한다.
  const previewTokens = { ...WEBTOON_SAMPLE_TOKENS, "{이름}": who, "{이름님}": whoPolite };
  const fillTokens = (s: string) => fillWebtoonText(s, previewTokens) ?? s;
  const cut = cuts[sel.c];
  const cur = cut?.bubbles[sel.b];

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      {/* ── 페이지 미리보기 (컷을 세로로 이어붙인 것) ── */}
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="text-bone-faint">폭 {width}px</label>
          <input type="range" min={280} max={760} value={width} onChange={(e) => setWidth(+e.target.value)} className="w-36" />
          <label className="flex items-center gap-1 text-bone-faint">
            <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> 10% 격자
          </label>
          <span className="text-bone-faint">미리보기 이름</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-24 rounded border border-hairline bg-wine px-2 py-1" />
          <span className="text-gold">{who}</span>
          <span className="text-bone-faint">/ {whoPolite}</span>
        </div>

        <div className="mt-4 flex justify-center">
          {/* 컷 사이 간격 0 — 웹툰 페이지는 빈틈없이 붙인다 */}
          <div className="flex flex-col" style={{ width }}>
            {cuts.map((c, ci) => (
              <div
                key={c.id}
                data-cut={ci}
                className={isTextCut(c) ? "relative cursor-pointer" : "relative cursor-crosshair"}
                style={{ outline: ci === sel.c ? "2px solid rgba(255,200,90,.75)" : "none", outlineOffset: -2 }}
                onClick={isTextCut(c) ? () => setSel({ c: ci, b: 0 }) : addAt(ci)}
              >
                {isTextCut(c) ? (
                  c.textCut?.text?.trim() ? (
                    <WebtoonTextCut {...c.textCut} text={fillTokens(c.textCut.text)} />
                  ) : (
                    <div className="flex h-24 items-center justify-center border border-dashed border-hairline text-xs text-bone-faint">
                      글 컷 {ci + 1} — 오른쪽에 글을 적으세요
                    </div>
                  )
                ) : c.src ? (
                  <WebtoonCut
                    src={c.src}
                    alt={c.alt}
                    ratio={c.ratio}
                    priority={ci < 2}
                    bubbles={c.bubbles.map((b) => ({ ...b, text: fillTokens(b.text) }))}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center border border-dashed border-hairline text-xs text-bone-faint">
                    컷 {ci + 1} — 오른쪽에서 사진을 올리세요
                  </div>
                )}

                {grid && (
                  <div
                    className="pointer-events-none absolute inset-0 z-20"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to right, rgba(255,80,80,.35) 0 1px, transparent 1px 10%)," +
                        "repeating-linear-gradient(to bottom, rgba(80,160,255,.35) 0 1px, transparent 1px 10%)",
                    }}
                  />
                )}

                {/* 손잡이 — 실제 렌더는 WebtoonCut이 하고 여기선 잡는 점만 얹는다.
                    글 컷에는 말풍선을 놓을 그림이 없으므로 손잡이도 없다. */}
                <div className="absolute inset-0 z-30">
                  {(isTextCut(c) ? [] : c.bubbles).map((b, bi) => {
                    const on = sel.c === ci && sel.b === bi;
                    return (
                      <button
                        key={bi}
                        onPointerDown={onHandleDown(ci, bi)}
                        onClick={(e) => { e.stopPropagation(); setSel({ c: ci, b: bi }); }}
                        title={`컷 ${ci + 1} · 말풍선 ${bi + 1}`}
                        className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border-2 text-[9px] font-bold text-white"
                        style={{
                          left: `${b.x}%`,
                          top: `${b.y}%`,
                          borderColor: on ? "#ffd479" : "rgba(255,255,255,.65)",
                          background: on ? "rgba(255,180,60,.5)" : "rgba(0,0,0,.35)",
                          touchAction: "none",
                        }}
                      >
                        {bi + 1}
                      </button>
                    );
                  })}
                </div>

                <span className="pointer-events-none absolute left-1 top-1 z-40 rounded bg-black/60 px-1.5 text-[10px] text-gold">
                  {ci + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 조작판 ────────────────────────────── */}
      <div className="w-full shrink-0 space-y-4 text-xs lg:w-80">
        {/* 저장 */}
        <div className="sticky top-2 z-50 rounded-lg border border-gold-line bg-surface-soft p-3">
          <button
            onClick={save}
            disabled={busy}
            className="w-full rounded bg-gold py-2 text-sm font-bold text-wine disabled:opacity-50"
          >
            {dirty ? "저장하기 (수정됨)" : "저장하기"}
          </button>

          {/* 노출 스위치 — 기본 꺼짐. 만들다 만 웹툰이 손님에게 나가면 안 된다. */}
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => { setPublished(e.target.checked); setDirty(true); }}
            />
            <span className={published ? "text-gold" : "text-bone-faint"}>
              {published ? "손님에게 보이는 중" : "숨김 (나만 봄)"}
            </span>
          </label>

          {status && <p className="mt-1.5 text-[11px] text-bone-soft">{status}</p>}
          {versions.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-bone-faint">되돌리기 ({versions.length}개 보관)</summary>
              {versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { edit(v.cuts); setSel({ c: 0, b: 0 }); setStatus("불러왔습니다 — 저장해야 반영됩니다"); }}
                  className="mt-1 block w-full rounded border border-hairline px-2 py-1 text-left text-[11px] hover:border-gold"
                >
                  {new Date(v.created_at).toLocaleString("ko-KR")} · 컷 {v.cuts.length}개
                </button>
              ))}
            </details>
          )}
        </div>

        <details className="rounded-lg border border-hairline bg-surface-soft p-3">
          <summary className="cursor-pointer text-[11px] font-bold tracking-wider text-gold">사용법</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-bone-soft">
            <li><b>사진 여러 장 올리기</b> → 위에서 아래로 이어붙습니다.</li>
            <li>순서는 아래 컷 목록에서 ▲▼로 바꿉니다.</li>
            <li>그림 위를 <b>클릭</b>하면 말풍선이 생깁니다.</li>
            <li>손잡이를 <b>끌어서</b> 옮기고 <b>방향키</b>로 미세조정(Shift=크게).</li>
            <li>대사에 <b>토큰</b>을 넣으면 손님 데이터가 들어갑니다.</li>
            <li><b>저장하기</b>를 눌러야 반영됩니다.</li>
          </ol>
        </details>

        <Box
          title={`컷 ${cuts.length}개`}
          right={
            <span className="flex gap-1">
              <Mini onClick={() => { edit([...cuts, newTextCut()]); setSel({ c: cuts.length, b: 0 }); }}>+ 글 컷</Mini>
              <Mini onClick={() => { edit([...cuts, newCut()]); setSel({ c: cuts.length, b: 0 }); }}>+ 빈 컷</Mini>
            </span>
          }
        >
          <label className={`block cursor-pointer rounded border border-dashed border-gold-line px-2 py-2 text-center text-gold hover:bg-violet-pale ${busy ? "opacity-50" : ""}`}>
            사진 여러 장 올리기
            <input type="file" accept="image/*" multiple disabled={busy} className="hidden" onChange={(e) => upload(e.target.files)} />
          </label>

          <div className="mt-2 space-y-1">
            {cuts.map((c, ci) => (
              <div
                key={c.id}
                className={`flex items-center gap-1 rounded px-1.5 py-1 ${ci === sel.c ? "bg-violet-pale" : ""}`}
                onClick={() => setSel({ c: ci, b: 0 })}
              >
                <span className="w-4 shrink-0 text-gold">{ci + 1}</span>
                <span className="flex-1 truncate text-bone-faint">
                  {isTextCut(c)
                    ? `글 · ${c.textCut?.text?.trim() ? c.textCut.text.slice(0, 12) : "비어 있음"}`
                    : c.src ? c.alt : "사진 없음"}
                </span>
                <span className="text-bone-faint">{isTextCut(c) ? "글" : `${c.bubbles.length}💬`}</span>
                <Mini onClick={() => moveCut(ci, -1)}>▲</Mini>
                <Mini onClick={() => moveCut(ci, 1)}>▼</Mini>
                <Mini onClick={() => { edit(cuts.filter((_, i) => i !== ci)); setSel({ c: Math.max(0, ci - 1), b: 0 }); }}>✕</Mini>
              </div>
            ))}
          </div>
        </Box>

        {cut && isTextCut(cut) && (
          <Box title={`글 컷 ${sel.c + 1}`}>
            <textarea
              value={cut.textCut?.text ?? ""}
              onChange={(e) => editText(sel.c, { text: e.target.value })}
              rows={4}
              placeholder={"그날 밤, 나는 장부를 보았다.\n\n{이름}, 네 이름도 거기 적혀 있더군."}
              className={`${INPUT} leading-relaxed`}
              style={{ fontFamily: WEBTOON_FONTS[cut.textCut?.font ?? TEXT_CUT_DEFAULTS.font].css }}
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {WEBTOON_TOKENS.map((t) => (
                <button
                  key={t.token}
                  title={`${t.hint} → ${t.sample}`}
                  onClick={() => editText(sel.c, { text: (cut.textCut?.text ?? "") + t.token })}
                  className="rounded border border-hairline px-1 py-0.5 text-[10px] text-gold-soft hover:border-gold"
                >
                  {t.token}
                </button>
              ))}
            </div>

            <Row label="글씨체">
              <select
                value={cut.textCut?.font ?? TEXT_CUT_DEFAULTS.font}
                onChange={(e) => editText(sel.c, { font: e.target.value as WebtoonFont })}
                className={INPUT}
                style={{ fontFamily: WEBTOON_FONTS[cut.textCut?.font ?? TEXT_CUT_DEFAULTS.font].css }}
              >
                {(Object.keys(WEBTOON_FONTS) as WebtoonFont[]).map((k) => (
                  <option key={k} value={k} style={{ fontFamily: WEBTOON_FONTS[k].css }}>{WEBTOON_FONTS[k].label}</option>
                ))}
              </select>
            </Row>
            <Row label="정렬">
              <select
                value={cut.textCut?.align ?? TEXT_CUT_DEFAULTS.align}
                onChange={(e) => editText(sel.c, { align: e.target.value as "left" | "center" | "right" })}
                className={INPUT}
              >
                <option value="center">가운데</option><option value="left">왼쪽</option><option value="right">오른쪽</option>
              </select>
            </Row>
            <Num label="글자크기" value={cut.textCut?.size ?? TEXT_CUT_DEFAULTS.size} step={0.1}
                 onChange={(v) => editText(sel.c, { size: v })} />
            <Num label="위아래 여백" value={cut.textCut?.padY ?? TEXT_CUT_DEFAULTS.padY} step={0.5}
                 onChange={(v) => editText(sel.c, { padY: v })} />
            <Num label="줄간격" value={cut.textCut?.lineHeight ?? TEXT_CUT_DEFAULTS.lineHeight} step={0.05}
                 onChange={(v) => editText(sel.c, { lineHeight: v })} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Color label="글자" value={cut.textCut?.color ?? TEXT_CUT_DEFAULTS.color}
                     onChange={(v) => editText(sel.c, { color: v })} />
              <Color label="배경" value={cut.textCut?.bg ?? TEXT_CUT_DEFAULTS.bg}
                     onChange={(v) => editText(sel.c, { bg: v })} />
            </div>
          </Box>
        )}

        {cut && !isTextCut(cut) && (
          <Box title={`컷 ${sel.c + 1} 그림`}>
            <Row label="설명">
              <input value={cut.alt} onChange={(e) => editCut(sel.c, { alt: e.target.value })} className={INPUT} />
            </Row>
            <label className="mt-2 block cursor-pointer text-[11px] text-gold underline">
              이 컷 사진 바꾸기
              <input type="file" accept="image/*" disabled={busy} className="hidden" onChange={(e) => upload(e.target.files, sel.c)} />
            </label>
            <p className="mt-1 break-all text-[11px] text-bone-faint">
              {cut.src || "사진 없음"} · 비율 {cut.ratio ? round(cut.ratio, 4) : "—"}
            </p>
          </Box>
        )}

        {/* 글 컷에는 말풍선이 없다 — 그림이 없으니 얹을 자리가 없다 */}
        {cut && !isTextCut(cut) && (
        <Box
          title={cur ? `말풍선 ${sel.b + 1} / ${cut.bubbles.length}` : "말풍선 (없음)"}
          right={
            cur && (
              <span className="flex gap-1">
                <Mini onClick={() => {
                  edit(cuts.map((c, i) => i === sel.c ? { ...c, bubbles: [...c.bubbles, { ...cur, x: round(clamp(cur.x + 4)), y: round(clamp(cur.y + 4)) }] } : c));
                  setSel({ c: sel.c, b: cut.bubbles.length });
                }}>복제</Mini>
                <Mini onClick={() => {
                  edit(cuts.map((c, i) => i === sel.c ? { ...c, bubbles: c.bubbles.filter((_, k) => k !== sel.b) } : c));
                  setSel({ c: sel.c, b: Math.max(0, sel.b - 1) });
                }}>삭제</Mini>
              </span>
            )
          }
        >
          {!cur ? (
            <p className="text-bone-faint">컷 그림 위를 클릭해서 말풍선을 놓으세요.</p>
          ) : (
            <>
              <textarea
                value={cur.text}
                onChange={(e) => patch(sel.c, sel.b, { text: e.target.value })}
                rows={4}
                className={`${INPUT} leading-relaxed`}
                style={{ fontFamily: WEBTOON_FONTS[cur.font ?? "sans"].css }}
              />

              <div className="mt-1 flex flex-wrap gap-1">
                {WEBTOON_TOKENS.map((t) => (
                  <button
                    key={t.token}
                    title={`${t.hint} → ${t.sample}`}
                    onClick={() => patch(sel.c, sel.b, { text: cur.text + t.token })}
                    className="rounded border border-hairline px-1 py-0.5 text-[10px] text-gold-soft hover:border-gold"
                  >
                    {t.token}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-bone-faint">
                토큰은 표본 50명 전원 채워지는 것만 넣어뒀습니다. 그래도 못 채우면 그 말풍선만 조용히 빠집니다.
              </p>

              <Row label="글씨체">
                <select
                  value={cur.font ?? "sans"}
                  onChange={(e) => patch(sel.c, sel.b, { font: e.target.value as WebtoonFont })}
                  className={INPUT}
                  style={{ fontFamily: WEBTOON_FONTS[cur.font ?? "sans"].css }}
                >
                  {(Object.keys(WEBTOON_FONTS) as WebtoonFont[]).map((k) => (
                    <option key={k} value={k} style={{ fontFamily: WEBTOON_FONTS[k].css }}>
                      {WEBTOON_FONTS[k].label}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="모양">
                <select value={cur.bubble ?? "none"} onChange={(e) => patch(sel.c, sel.b, { bubble: e.target.value as BubbleShape })} className={INPUT}>
                  {SHAPES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                </select>
              </Row>
              <Row label="꼬리">
                <select value={cur.tail ?? "none"} onChange={(e) => patch(sel.c, sel.b, { tail: e.target.value as BubbleTail })} className={INPUT}>
                  {TAILS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Row>
              <Row label="정렬">
                <select value={cur.align ?? "center"} onChange={(e) => patch(sel.c, sel.b, { align: e.target.value as "left" | "center" | "right" })} className={INPUT}>
                  <option value="center">가운데</option><option value="left">왼쪽</option><option value="right">오른쪽</option>
                </select>
              </Row>

              <Num label="글자크기" value={cur.size ?? 4.6} step={0.1} onChange={(v) => patch(sel.c, sel.b, { size: v })} />
              {/* 0 = 글자 길이대로. 값을 주면 그 폭 고정 — 실사 사진용 하단 대사 띠를 만들 때 쓴다 */}
              <Num label="말풍선폭(0=자동)" value={cur.width ?? 0} step={2} min={0} max={100}
                   onChange={(v) => patch(sel.c, sel.b, { width: v || undefined })} />
              <Num label="굵기" value={cur.weight ?? 500} step={100} min={100} max={900} onChange={(v) => patch(sel.c, sel.b, { weight: v })} />
              <Num label="줄간격" value={cur.lineHeight ?? 1.45} step={0.05} onChange={(v) => patch(sel.c, sel.b, { lineHeight: v })} />
              <Num label="기울기°" value={cur.rotate ?? 0} step={1} onChange={(v) => patch(sel.c, sel.b, { rotate: v || undefined })} />
              <Num label="최대폭%" value={cur.maxWidth ?? 0} step={2} onChange={(v) => patch(sel.c, sel.b, { maxWidth: v || undefined })} />
              <Num label="테두리" value={cur.strokeWidth ?? 0.42} step={0.02} onChange={(v) => patch(sel.c, sel.b, { strokeWidth: v })} />

              <div className="mt-2 grid grid-cols-3 gap-2">
                <Color label="글자" value={cur.color ?? "#111111"} onChange={(v) => patch(sel.c, sel.b, { color: v })} />
                <Color label="채움" value={cur.fill ?? "#ffffff"} onChange={(v) => patch(sel.c, sel.b, { fill: v })} />
                <Color label="선" value={cur.stroke ?? "#111111"} onChange={(v) => patch(sel.c, sel.b, { stroke: v })} />
              </div>

              <p className="mt-2 text-[11px] text-bone-faint">위치 {round(cur.x)}% , {round(cur.y)}%</p>
            </>
          )}
        </Box>
        )}
      </div>
    </div>
  );
}

/* ── 작은 조각들 ─────────────────────────────── */
const INPUT = "w-full rounded border border-hairline bg-wine px-2 py-1 text-bone";

function Box({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-hairline bg-surface-soft p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[11px] font-bold tracking-wider text-gold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-1.5 flex items-center gap-2">
      <span className="w-14 shrink-0 text-bone-faint">{label}</span>
      {children}
    </label>
  );
}

function Num({ label, value, onChange, step = 1, min, max }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number;
}) {
  return (
    <Row label={label}>
      <input type="number" value={value} step={step} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} className={INPUT} />
    </Row>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-bone-faint">{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-full rounded border border-hairline bg-wine" />
    </label>
  );
}

function Mini({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="rounded border border-hairline px-1.5 py-0.5 text-[11px] text-bone-soft hover:border-gold"
    >
      {children}
    </button>
  );
}
