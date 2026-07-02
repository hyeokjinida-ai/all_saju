import type { Myeongsik, Pillar } from "@/lib/saju/manseryeok";

// 천간/지지(한글) → 오행. 명식 8글자만으로 결정론적 계산(추가 데이터 불필요).
const GAN_OH: Record<string, string> = { 갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수" };
const JI_OH: Record<string, string> = { 자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화", 오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수" };

const ELEMENTS = [
  { key: "목", label: "나무", hanja: "木", color: "#6fae5e" },
  { key: "화", label: "불", hanja: "火", color: "#d4624a" },
  { key: "토", label: "흙", hanja: "土", color: "#cda86a" },
  { key: "금", label: "쇠", hanja: "金", color: "#d8d2c2" },
  { key: "수", label: "물", hanja: "水", color: "#5f93bf" },
];

export function OhaengChart({ myeongsik }: { myeongsik: Myeongsik }) {
  const counts: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const add = (p: Pillar | null) => {
    if (!p) return;
    const g = GAN_OH[p.cheongan];
    const j = JI_OH[p.jiji];
    if (g) counts[g] += 1;
    if (j) counts[j] += 1;
  };
  add(myeongsik.year);
  add(myeongsik.month);
  add(myeongsik.day);
  add(myeongsik.hour);

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const max = Math.max(1, ...ELEMENTS.map((e) => counts[e.key]));
  const strongest = ELEMENTS.reduce((a, b) => (counts[b.key] > counts[a.key] ? b : a));
  const missing = ELEMENTS.filter((e) => counts[e.key] === 0);

  return (
    <section className="mb-11">
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="gold-rule flex-1 max-w-[60px] opacity-70" />
        <h2 className="font-myeongjo text-sm font-semibold text-gold tracking-[0.1em]">다섯 기운의 균형 · 오행(五行)</h2>
        <span className="gold-rule flex-1 max-w-[60px] opacity-70" />
      </div>

      <div className="rounded-md border border-gold-line bg-[rgba(36,16,71,0.4)] px-5 py-6 sm:px-7">
        <div className="space-y-3">
          {ELEMENTS.map((e) => {
            const c = counts[e.key];
            return (
              <div key={e.key} className="flex items-center gap-3">
                <span className="font-myeongjo text-xs text-bone-soft w-[68px] shrink-0">
                  {e.label}
                  <span className="text-bone-faint">({e.hanja})</span>
                </span>
                <div className="flex-1 h-3.5 rounded-sm overflow-hidden bg-[rgba(150,90,255,0.07)]">
                  <div
                    className="h-full rounded-sm transition-all"
                    style={{ width: `${(c / max) * 100}%`, background: e.color, opacity: c === 0 ? 0.25 : 0.9 }}
                  />
                </div>
                <span className="font-mono text-xs text-bone-faint w-5 text-right">{c}</span>
              </div>
            );
          })}
        </div>

        <p className="mt-5 pt-4 border-t border-gold-pale text-xs text-bone-soft leading-relaxed">
          여덟 글자 중 <b className="text-gold-bright">{strongest.label}({strongest.hanja})</b> 기운이 가장 강합니다
          {missing.length > 0 && (
            <>
              {" · "}
              <span className="text-bone-faint">
                {missing.map((m) => `${m.label}(${m.hanja})`).join("·")} 기운은 비어 있어요
              </span>
            </>
          )}
          . 강한 기운은 타고난 강점으로, 비거나 약한 기운은 채워주면 좋은 방향으로 풀이에 반영됩니다.
        </p>
      </div>
    </section>
  );
}
