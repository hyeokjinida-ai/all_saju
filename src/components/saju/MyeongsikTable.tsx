import type { Myeongsik } from "@/lib/saju/manseryeok";

// Ollama: flat 1px hairline table on canvas, mono headers, no shadows.
export function MyeongsikTable({ myeongsik }: { myeongsik: Myeongsik }) {
  const headers = ["시주", "일주", "월주", "년주"] as const;
  const pillars = [myeongsik.hour, myeongsik.day, myeongsik.month, myeongsik.year];
  return (
    <div className="rounded-lg border border-hairline overflow-hidden bg-night-2/40">
      <table className="w-full text-center">
        <thead>
          <tr className="border-b border-hairline">
            {headers.map((h) => (
              <th key={h} className="py-2.5 text-[11px] font-mono uppercase tracking-wider text-gold-soft">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {pillars.map((p, i) => (
              <td key={`c-${i}`} className="py-5 text-2xl font-myeongjo font-semibold text-gold-bright">
                {p ? p.cheongan : "—"}
              </td>
            ))}
          </tr>
          <tr className="border-t border-hairline">
            {pillars.map((p, i) => (
              <td key={`j-${i}`} className="py-5 text-2xl font-myeongjo font-semibold text-bone">
                {p ? p.jiji : "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
