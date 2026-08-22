// 부품함 카탈로그 — **개발 전용**. (2026-08-23)
//
// 부품을 새 상품에 처음 쓰는 자리에서 처음 보면, 안 맞는 걸 그 상품 코드에서 고치게 된다 —
// 그러면 부품이 아니라 또 전용 코드가 된다. 그래서 부품은 **여기서 먼저 선다.**
// 스킨 4벌을 나란히 세워 「세계관을 바꾸면 색이 따라오는가」를 눈이 아니라 화면으로 본다.
//
// `?skin=` 없이 열면 4벌 전부, `?skin=world-wealth` 처럼 주면 그 한 벌만.
import { KitCatalog } from "@/components/kit/_catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "부품함 카탈로그 (dev)" };

const SKINS = [
  { cls: "world-sangun", label: "산군 — 먹 + 금 + 주사" },
  { cls: "world-jiknyeo", label: "직녀 — 밤남색 + 달빛 + 은사" },
  { cls: "world-wealth", label: "돈달 — 먹 + 금 + 주홍" },
  { cls: "teaser-light", label: "밝은 티저 — 달빛 판" },
] as const;

export default async function DevKitPage({
  searchParams,
}: {
  searchParams: Promise<{ skin?: string }>;
}) {
  const { skin } = await searchParams;
  const shown = skin ? SKINS.filter((s) => s.cls === skin) : SKINS;

  return (
    <main style={{ background: "var(--night-edge)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-[420px] px-5 py-8">
        <h1 className="font-myeongjo text-[19px] font-bold" style={{ color: "var(--bone)" }}>
          부품함 카탈로그
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: "var(--bone-faint)" }}>
          같은 부품 · 스킨만 바꿔 나란히. 크기는 자(--fs-*)에서만 고른다.
        </p>
      </div>
      {shown.map((s) => (
        <section key={s.cls} className={s.cls} style={{ background: "var(--night)" }}>
          <div className="mx-auto max-w-[420px] px-5 py-10">
            <p
              className="mb-6 inline-block rounded-full px-3 py-1 text-[11px] tracking-[0.18em]"
              style={{ border: "1px solid var(--gold-line)", color: "var(--gold)" }}
            >
              .{s.cls} — {s.label}
            </p>
            <KitCatalog />
          </div>
        </section>
      ))}
    </main>
  );
}
