"use client";

// 상품 빌더 폼 — 새 상품을 코드 수정 없이 만든다.
//
// 네 칸으로 나눈 이유는 각 칸이 **화면 하나씩**을 책임지기 때문이다:
//   ① 기본     → 결제·목록 (가격, 판매중)
//   ② 홈 카드  → 홈·전체 풀이의 카드 (그림·레터링 글자)
//   ③ 랜딩 카피 → /products/<slug> 상세 (통증·가치)
//   ④ 결과지    → 결제 뒤 손님이 받는 글의 목차·말투
//
// 오른쪽 미리보기는 **홈에서 쓰는 부품을 그대로** 세운다(ProductCard·HeroLettering).
// 따로 흉내 낸 미리보기를 두면 그게 실물과 어긋나는 순간 아무도 못 믿는다.
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES, LENGTHS, emptyForm, priceIssue, type ProductForm as FormValues } from "@/lib/admin-products";
import { ProductCard } from "@/components/home/ProductCard";
import { HeroLettering, RankRibbon } from "@/components/home/HeroLettering";
import type { HomeProduct } from "@/lib/home-data";
import { homeArt, shortDesc } from "@/config/home";

type Slot = "hero" | "big" | "row";

export function ProductForm({
  id,
  initial,
  ready,
  orderCount,
}: {
  /** 있으면 수정, 없으면 새 상품 */
  id?: string;
  initial?: Partial<FormValues>;
  /** 0011 마이그레이션이 붙었는가 */
  ready: boolean;
  orderCount?: number;
}) {
  const router = useRouter();
  const [f, setF] = useState<FormValues>({ ...emptyForm(), ...initial } as FormValues);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [uploading, setUploading] = useState<Slot | null>(null);

  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) => setF((p) => ({ ...p, [k]: v }));

  const preview: HomeProduct = useMemo(
    () => ({
      id: id ?? "preview",
      slug: f.slug || "preview",
      name: f.name || "상품 이름",
      description: f.description || "설명이 여기 들어갑니다",
      price: f.price,
      category: (f.category as HomeProduct["category"]) ?? null,
      heroRank: f.hero_rank ?? null,
      characterName: f.character_name ?? null,
      cardTitle: f.card_title ?? null,
      tagline: f.tagline ?? null,
      art: {
        hero: f.art?.hero?.url || undefined,
        big: f.art?.big?.url || undefined,
        row: f.art?.row?.url || undefined,
      },
    }),
    [f, id],
  );

  async function upload(slot: Slot, file: File) {
    setUploading(slot);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("slot", slot);
      fd.set("slug", f.slug || "misc");
      fd.set("posX", String(f.art?.[slot]?.pos?.x ?? 50));
      fd.set("posY", String(f.art?.[slot]?.pos?.y ?? 50));
      const res = await fetch("/api/admin/products/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "업로드 실패");
      setF((p) => ({
        ...p,
        art: { ...p.art, [slot]: { ...(p.art?.[slot] ?? {}), url: json.url } },
      }));
      setMsg({ kind: "ok", text: `${SLOT_LABEL[slot]} 그림을 올렸습니다 (${Math.round(json.bytes / 1024)}KB)` });
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    const issue = priceIssue(f);
    if (issue) {
      setMsg({ kind: "err", text: issue });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(id ? `/api/admin/products/${id}` : "/api/admin/products", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "저장 실패");
      setMsg({ kind: "ok", text: "저장했습니다" });
      if (!id && json.id) router.replace(`/admin/products/${json.id}`);
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!id) return;
    if (!confirm(`'${f.name}' 를 지웁니다. 되돌릴 수 없습니다.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "삭제 실패");
      router.push("/admin/products");
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        {!ready && (
          <Box tone="warn">
            <b className="text-ink">0011 마이그레이션이 아직 안 붙었습니다.</b>
            <p className="mt-1 leading-relaxed">
              지금은 <b>기본</b> 칸만 저장됩니다(이름·가격·판매중). 홈 카드·랜딩 카피·결과지 설계를 쓰려면
              <code className="mx-1 font-mono text-ink">supabase/migrations/0011_product_builder.sql</code>
              을 Supabase SQL Editor 에 붙여넣고 Run 하세요.
            </p>
          </Box>
        )}

        {/* ① 기본 */}
        <Section n="①" title="기본" desc="결제와 목록이 쓰는 값">
          <Row label="주소(slug)" hint={id ? "만든 뒤에는 못 바꿉니다 — 주문·결과지가 이걸로 상품을 찾습니다" : "영문 소문자·숫자·하이픈. /products/여기"}>
            <input
              className={INPUT}
              value={f.slug}
              disabled={!!id}
              onChange={(e) => set("slug", e.target.value.toLowerCase())}
              placeholder="wealth-saju"
            />
          </Row>
          <Row label="이름" hint="카드와 결제창에 그대로 나옵니다">
            <input className={INPUT} value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={30} />
          </Row>
          <Row label="설명" hint="카드 아래 한 줄. 「—」 앞부분만 카드에 쓰입니다">
            <textarea className={INPUT} rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={120} />
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="판매가">
              <input type="number" className={INPUT} value={f.price} onChange={(e) => set("price", Number(e.target.value))} />
            </Row>
            <Row label="정가(취소선)" hint="비우면 할인 표기 없음">
              <input
                type="number"
                className={INPUT}
                value={f.compare_at_price ?? ""}
                onChange={(e) => set("compare_at_price", e.target.value === "" ? null : Number(e.target.value))}
              />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="정렬 순서" hint="작을수록 앞">
              <input type="number" className={INPUT} value={f.display_order} onChange={(e) => set("display_order", Number(e.target.value))} />
            </Row>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <Check label="판매중" checked={f.is_active} onChange={(v) => set("is_active", v)} />
              <Check label="퍼널 안에서만 판매(홈·목록에서 숨김)" checked={f.is_addon} onChange={(v) => set("is_addon", v)} />
            </div>
          </div>
        </Section>

        {/* ② 홈 카드 */}
        <Section n="②" title="홈 카드" desc="홈과 전체 풀이에 서는 모습" dim={!ready}>
          <div className="grid grid-cols-2 gap-3">
            <Row label="분류" hint="같은 분류끼리 한 줄에 선다">
              <select className={INPUT} value={f.category ?? ""} onChange={(e) => set("category", e.target.value || null)}>
                <option value="">— 없음(맨 아래로) —</option>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </Row>
            <Row label="히어로 TOP" hint="비우면 히어로에 안 선다">
              <input
                type="number"
                min={1}
                max={9}
                className={INPUT}
                value={f.hero_rank ?? ""}
                onChange={(e) => set("hero_rank", e.target.value === "" ? null : Number(e.target.value))}
              />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="캐릭터 줄" hint="제목 위 작은 글자">
              <input className={INPUT} value={f.character_name ?? ""} onChange={(e) => set("character_name", e.target.value || null)} placeholder="직녀" />
            </Row>
            <Row label="카드 제목" hint="4글자가 가장 예쁩니다(원본 기준). 비우면 이름">
              <input className={INPUT} value={f.card_title ?? ""} onChange={(e) => set("card_title", e.target.value || null)} maxLength={12} placeholder="연애예보" />
            </Row>
          </div>
          <Row label="카드 한 줄" hint="비우면 설명 앞부분">
            <input className={INPUT} value={f.tagline ?? ""} onChange={(e) => set("tagline", e.target.value || null)} maxLength={30} placeholder="만나는 달과 조심할 달" />
          </Row>

          <div className="mt-2 space-y-4">
            {(["hero", "big", "row"] as Slot[]).map((slot) => (
              <ArtSlot
                key={slot}
                slot={slot}
                url={f.art?.[slot]?.url ?? ""}
                pos={f.art?.[slot]?.pos ?? { x: 50, y: 50 }}
                busy={uploading === slot}
                onPos={(pos) => setF((p) => ({ ...p, art: { ...p.art, [slot]: { ...(p.art?.[slot] ?? {}), pos } } }))}
                onFile={(file) => upload(slot, file)}
                onClear={() => setF((p) => ({ ...p, art: { ...p.art, [slot]: { ...(p.art?.[slot] ?? {}), url: "" } } }))}
              />
            ))}
          </div>
        </Section>

        {/* ③ 랜딩 카피 */}
        <Section n="③" title="랜딩 카피" desc="상세 페이지의 통증·가치" dim={!ready}>
          <Row label="작은 머리글">
            <input className={INPUT} value={f.pitch?.eyebrow ?? ""} onChange={(e) => setPitch(setF, "eyebrow", e.target.value)} placeholder="財 · 재물 풀이" />
          </Row>
          <Row label="헤드라인" hint="한 줄에 하나씩">
            <textarea className={INPUT} rows={2} value={(f.pitch?.headline ?? []).join("\n")} onChange={(e) => setPitch(setF, "headline", lines(e.target.value))} />
          </Row>
          <Row label="이런 고민 있으세요?" hint="한 줄에 하나씩 · 3개 권장">
            <textarea className={INPUT} rows={3} value={(f.pitch?.pains ?? []).join("\n")} onChange={(e) => setPitch(setF, "pains", lines(e.target.value))} />
          </Row>
          <Row label="이 풀이에 담기는 것" hint="한 줄에 하나씩 · 3~6개">
            <textarea className={INPUT} rows={4} value={(f.pitch?.includes ?? []).join("\n")} onChange={(e) => setPitch(setF, "includes", lines(e.target.value))} />
          </Row>
          <Row label="이런 분께">
            <input className={INPUT} value={f.pitch?.forWhom ?? ""} onChange={(e) => setPitch(setF, "forWhom", e.target.value)} />
          </Row>
          <Check label="오행 그래프·차트를 강조" checked={!!f.pitch?.hasCharts} onChange={(v) => setPitch(setF, "hasCharts", v)} />
        </Section>

        {/* ④ 결과지 */}
        <Section n="④" title="결과지 설계" desc="결제 뒤 손님이 받는 글의 목차와 말투" dim={!ready}>
          <Row label="결과지 제목">
            <input className={INPUT} value={f.style?.title ?? ""} onChange={(e) => setStyle(setF, "title", e.target.value)} placeholder="돈 들어오는 달" />
          </Row>
          <Row label="분량">
            <select className={INPUT} value={f.style?.length ?? LENGTHS[1].key} onChange={(e) => setStyle(setF, "length", e.target.value)}>
              {LENGTHS.map((l) => (
                <option key={l.key} value={l.key}>{l.label}</option>
              ))}
            </select>
          </Row>
          <Row label="목차" hint="한 줄에 한 장(章) · 3~12개. 이게 상품을 가르는 핵심입니다">
            <textarea className={INPUT} rows={6} value={(f.style?.outline ?? []).join("\n")} onChange={(e) => setStyle(setF, "outline", lines(e.target.value))} />
          </Row>
          <Row label="말투 지시" hint="누가 어떤 목소리로 말하는가">
            <textarea className={INPUT} rows={3} value={f.style?.voice ?? ""} onChange={(e) => setStyle(setF, "voice", e.target.value)} />
          </Row>
          <Check label="반말(하대체)로 쓴다" checked={!!f.style?.banmal} onChange={(v) => setStyle(setF, "banmal", v)} />
        </Section>

        {msg && <Box tone={msg.kind === "ok" ? "ok" : "err"}>{msg.text}</Box>}

        <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
          <button type="button" onClick={save} disabled={busy} className="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-wine-deep disabled:opacity-50">
            {busy ? "저장 중…" : id ? "저장" : "만들기"}
          </button>
          {id && (
            <>
              <Link href={`/products/${f.slug}`} target="_blank" className="text-sm text-body underline underline-offset-2 hover:text-ink">
                랜딩 보기 →
              </Link>
              <Link href={`/admin/webtoon/${id}`} className="text-sm text-body underline underline-offset-2 hover:text-ink">
                티저 웹툰 편집 →
              </Link>
              <button
                type="button"
                onClick={remove}
                disabled={busy || (orderCount ?? 0) > 0}
                title={(orderCount ?? 0) > 0 ? `이미 ${orderCount}건 팔렸습니다 — 판매중을 끄세요` : undefined}
                className="ml-auto text-sm text-mute underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 미리보기: 홈이 쓰는 부품 그대로 ── */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-3 text-xs font-semibold tracking-wide text-mute">미리보기 — 홈에 서는 모습</p>
        <div className="space-y-5 rounded-lg p-4" style={{ background: "#000", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div>
            <p className="mb-2 text-[11px] text-white/40">히어로</p>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl" style={{ background: "#18181B", border: "1px solid rgba(255,255,255,0.10)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.art?.hero || homeArt(preview.slug, "hero")} alt="" className="h-full w-full object-cover" onError={hideImg} />
              <HeroLettering
                character={preview.characterName ?? ""}
                title={preview.cardTitle || preview.name}
                tagline={preview.tagline || shortDesc(preview.description)}
              />
              {f.hero_rank ? <RankRibbon rank={f.hero_rank} /> : null}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] text-white/40">큰 카드</p>
            <div className="w-[70%]">
              <ProductCard product={preview} variant="big" via="admin-preview" />
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] text-white/40">행 카드</p>
            <div className="w-[56%]">
              <ProductCard product={preview} variant="row" via="admin-preview" />
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-mute">
          그림을 안 올리면 <code className="font-mono">/home/{preview.slug}-*.webp</code> 를 찾습니다.
        </p>
      </aside>
    </div>
  );
}

/* ── 조각들 ─────────────────────────────────────────── */

const SLOT_LABEL: Record<Slot, string> = { hero: "히어로", big: "큰 카드", row: "행 카드" };
const SLOT_DESC: Record<Slot, string> = {
  hero: "864×1080 로 잘라 넣습니다",
  big: "600×752",
  row: "400×500",
};

const INPUT =
  "w-full rounded-md border border-hairline bg-wine-2/40 px-3 py-2 text-sm text-ink outline-none focus:border-gold disabled:opacity-50";

const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

type Setter = React.Dispatch<React.SetStateAction<FormValues>>;

function setPitch(setF: Setter, k: string, v: unknown) {
  setF((p) => ({ ...p, pitch: { ...(p.pitch ?? {}), [k]: v } }));
}
function setStyle(setF: Setter, k: string, v: unknown) {
  setF((p) => ({
    ...p,
    style: { title: "", length: LENGTHS[1].key, outline: [], ...(p.style ?? {}), [k]: v } as FormValues["style"],
  }));
}
const hideImg = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = "hidden";
};

function Section({
  n,
  title,
  desc,
  dim,
  children,
}: {
  n: string;
  title: string;
  desc: string;
  dim?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={dim ? "opacity-50" : undefined}>
      <h2 className="mb-1 text-[15px] font-semibold text-ink">
        <span className="mr-1.5 text-mute">{n}</span>
        {title}
      </h2>
      <p className="mb-4 text-xs text-mute">{desc}</p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-body">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-relaxed text-mute">{hint}</span>}
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-body">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--gold)]" />
      {label}
    </label>
  );
}

function Box({ tone, children }: { tone: "ok" | "err" | "warn"; children: React.ReactNode }) {
  const color =
    tone === "ok" ? "rgba(111,190,139,.4)" : tone === "err" ? "rgba(190,90,80,.5)" : "rgba(228,200,120,.45)";
  return (
    <div className="rounded-md px-4 py-3 text-xs leading-relaxed text-body" style={{ border: `1px solid ${color}`, background: "rgba(255,255,255,.03)" }}>
      {children}
    </div>
  );
}

function ArtSlot({
  slot,
  url,
  pos,
  busy,
  onPos,
  onFile,
  onClear,
}: {
  slot: Slot;
  url: string;
  pos: { x: number; y: number };
  busy: boolean;
  onPos: (p: { x: number; y: number }) => void;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-md border border-hairline p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-ink">
          {SLOT_LABEL[slot]} <span className="ml-1 font-normal text-mute">{SLOT_DESC[slot]}</span>
        </span>
        <div className="flex items-center gap-3">
          {url && (
            <button type="button" onClick={onClear} className="text-[11px] text-mute underline underline-offset-2">
              지우기
            </button>
          )}
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={busy}
            className="rounded border border-hairline px-2.5 py-1 text-[11px] text-body disabled:opacity-50"
          >
            {busy ? "올리는 중…" : url ? "바꾸기" : "그림 올리기"}
          </button>
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-3 text-[11px] text-mute">
        <span className="w-16 shrink-0">세로 위치</span>
        <input
          type="range"
          min={0}
          max={100}
          value={pos.y}
          onChange={(e) => onPos({ ...pos, y: Number(e.target.value) })}
          className="w-full accent-[var(--gold)]"
        />
        <span className="w-9 shrink-0 text-right font-mono">{pos.y}%</span>
      </div>
      <p className="mt-1 text-[11px] text-mute">
        {url ? "위치를 바꾸면 다시 올려야 반영됩니다(자르기는 서버에서 합니다)." : "안 올리면 public/home 의 기본 그림을 씁니다."}
      </p>
    </div>
  );
}
