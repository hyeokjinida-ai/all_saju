import { notFound } from "next/navigation";
import { Preview } from "./Preview";

export default async function Page({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { variant } = await searchParams;
  if (variant === "a" || variant === "b") return <Preview variant={variant} />;
  return <div style={{ background: "#171411", color: "#f5eddf", padding: 24, minHeight: "100vh" }}>
    <h1 style={{ fontSize: 26 }}>A 전체 화면 도약 · B 문 열고 입장</h1>
    <p style={{ margin: "12px 0 24px" }}>문구·폰트·버튼·다음 화면은 동일합니다. 이 화면은 운영 집계에서 제외됩니다.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
      {(["a", "b"] as const).map(v => <section key={v} style={{ width: 390, maxWidth: "100%" }}>
        <h2 style={{ fontSize: 21, marginBottom: 12 }}>{v === "a" ? "A · 전체 화면으로 네 번 도약" : "B · 문을 열고 들어가는 게이트"}</h2>
        <iframe src={`/dev/gate-ab?variant=${v}`} title={`게이트 ${v.toUpperCase()}`} style={{ width: "100%", height: 670, border: 0 }} />
      </section>)}
    </div>
  </div>;
}
