"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatKRW } from "@/lib/utils";
import { ganToHanja, jiToHanja, type FreeReading } from "@/lib/saju/freeReading";
import { TrustStrip } from "@/components/saju/TrustStrip";
import type { Myeongsik, Pillar } from "@/lib/saju/manseryeok";

export type SimpleProduct = { productId: string; slug: string; name: string; price: number };

type StoredInput = {
  name: string;
  birthDate: string;
  birthTime: string | null;
  timeUnknown: boolean;
  gender: "male" | "female";
  calendar: "solar" | "lunar";
  concerns: string[];
};

export const SAJU_INPUT_KEY = "saju:input";

const O_VAR: Record<string, string> = {
  목: "--o-wood", 화: "--o-fire", 토: "--o-earth", 금: "--o-metal", 수: "--o-water",
};

export function FreeResult({
  basic,
  premium,
  isLoggedIn,
}: {
  basic: SimpleProduct | null;
  premium: SimpleProduct | null;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [input, setInput] = useState<StoredInput | null>(null);
  const [myeongsik, setMyeongsik] = useState<Myeongsik | null>(null);
  const [reading, setReading] = useState<FreeReading | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(SAJU_INPUT_KEY);
    } catch {
      raw = null;
    }
    if (!raw) {
      setState("empty");
      return;
    }
    let parsed: StoredInput;
    try {
      parsed = JSON.parse(raw) as StoredInput;
    } catch {
      setState("empty");
      return;
    }
    setInput(parsed);

    let active = true;
    fetch("/api/saju/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthDate: parsed.birthDate,
        birthTime: parsed.timeUnknown ? null : parsed.birthTime,
        timeUnknown: parsed.timeUnknown,
        gender: parsed.gender,
        calendar: parsed.calendar,
        concern: parsed.concerns[0] ?? null,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d?.myeongsik && d?.reading) {
          setMyeongsik(d.myeongsik);
          setReading(d.reading);
          setState("ready");
        } else setState("error");
      })
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  async function buy(p: SimpleProduct) {
    if (!input) return;
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent("/free-result")}`);
      return;
    }
    setBusy(p.productId);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: p.productId,
          name: input.name,
          birthDate: input.birthDate,
          birthTime: input.timeUnknown ? null : input.birthTime,
          timeUnknown: input.timeUnknown,
          gender: input.gender,
          calendar: input.calendar,
          concerns: input.concerns,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "주문 생성에 실패했습니다");
      router.push(`/checkout/${json.orderId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "오류가 발생했습니다");
      setBusy(null);
    }
  }

  if (state === "loading") {
    return (
      <div className="container py-24 text-center">
        <p className="font-myeongjo text-bone-soft tracking-[0.1em]">명식을 세우는 중…</p>
      </div>
    );
  }

  if (state === "empty" || state === "error") {
    return (
      <div className="container py-24 text-center max-w-md">
        <p className="font-brush text-gold-soft/60 text-2xl mb-4">命</p>
        <p className="font-myeongjo text-bone mb-2">입력 정보가 없어요</p>
        <p className="text-sm text-bone-soft mb-7">생년월일을 입력하면 무료로 내 명식과 흐름을 확인할 수 있어요.</p>
        <Link
          href="/products/basic-saju"
          className="inline-block px-6 py-3.5 font-bold tracking-[0.1em]"
          style={{
            fontFamily: "'Noto Serif KR', serif",
            background: "linear-gradient(180deg,#e8c878,#d4af6a)",
            color: "var(--wine-deep)",
          }}
        >
          무료로 내 명식 확인하기
        </Link>
      </div>
    );
  }

  if (!myeongsik || !reading) return null;

  // ⚠️ 자체 만세력(computeMyeongsik) 정확도 수정 전까지, 계산에 의존하는 무료 노출(명식표·일간·오행·올해)을 보류.
  // 엔진을 luckyloveme 로 교체/수정하면 true 로 되돌리면 됩니다.
  const SHOW_MYEONGSIK = false;

  const name = input?.name?.trim();
  const cols: [string, Pillar | null][] = [
    ["時", myeongsik.hour],
    ["日", myeongsik.day],
    ["月", myeongsik.month],
    ["年", myeongsik.year],
  ];
  const maxCount = Math.max(1, ...reading.ohaeng.map((o) => o.count));

  return (
    <div className="container py-12 max-w-2xl">
      <header className="text-center mb-10">
        <p className="font-brush text-gold-soft/60 text-base tracking-[0.3em] mb-2">命式</p>
        <h1 className="font-myeongjo text-2xl font-semibold tracking-[0.03em] text-bone glow-bone">
          {name ? `${name}님의 무료 명식` : "내 무료 명식"}
        </h1>
        <p className="mt-3 text-xs text-bone-soft tracking-[0.04em]">
          정확한 명식과 풀이는 결제 후 정통 만세력으로 정밀하게 풀어드려요. 아래는 미리보기예요.
        </p>
        <div className="gold-diamond mx-auto mt-5" />
      </header>

      {SHOW_MYEONGSIK && (
      <>
      {/* 1. 명식 8글자 */}
      <section className="mb-9">
        <h2 className="font-myeongjo text-sm font-semibold mb-3 text-gold-bright">내 사주 여덟 글자</h2>
        <div className="border border-gold-pale bg-[rgba(13,6,8,0.5)] rounded-md px-3 py-5">
          <div className="grid grid-cols-4 gap-1.5">
            {cols.map(([label, p]) => (
              <div key={label} className="text-center">
                <span className="font-mono text-[9px] text-bone-faint tracking-[0.2em] block mb-1.5">{label}</span>
                <span className="font-brush text-[30px] block leading-none text-gold-bright glow-gold">
                  {p ? ganToHanja(p.cheongan) : "—"}
                </span>
                <span className="font-brush text-[30px] block mt-0.5 text-bone leading-none">
                  {p ? jiToHanja(p.jiji) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. 일간 성향 */}
      <section className="mb-9">
        <h2 className="font-myeongjo text-sm font-semibold mb-3 text-gold-bright">내 중심 기운</h2>
        <div className="border-l-2 border-gold pl-4">
          <p className="font-myeongjo text-bone">
            당신의 중심은 <b className="text-gold-bright">{reading.ilgan.hanja}</b>
            <span className="text-bone-soft text-sm"> · {reading.ilgan.elementLabel}</span>
            <br />
            <span className="text-[15px]">{reading.ilgan.title}</span>
          </p>
          <p className="mt-3 text-sm text-bone-soft leading-relaxed">{reading.ilgan.trait}</p>
        </div>
      </section>

      {/* 3. 오행 균형 */}
      <section className="mb-9">
        <h2 className="font-myeongjo text-sm font-semibold mb-3 text-gold-bright">오행 균형</h2>
        <div className="space-y-2.5">
          {reading.ohaeng.map((o) => (
            <div key={o.element} className="flex items-center gap-3">
              <span className="font-myeongjo text-xs text-bone-soft w-16 shrink-0">{o.label}</span>
              <div className="flex-1 h-3 bg-[rgba(212,175,106,0.08)] rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${(o.count / maxCount) * 100}%`, background: `var(${O_VAR[o.element]})` }}
                />
              </div>
              <span className="font-mono text-xs text-bone-faint w-5 text-right">{o.count}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="border border-gold-pale rounded-md p-3.5">
            <p className="font-myeongjo text-xs text-gold mb-1">강한 기운 · {reading.strong.label}</p>
            <p className="text-xs text-bone-soft leading-relaxed">{reading.strong.note}</p>
          </div>
          <div className="border border-gold-pale rounded-md p-3.5">
            <p className="font-myeongjo text-xs text-gold mb-1">부족한 기운 · {reading.weak.label}</p>
            <p className="text-xs text-bone-soft leading-relaxed">{reading.weak.note}</p>
          </div>
        </div>
      </section>

      {/* 4. 올해 흐름 */}
      <section className="mb-9">
        <h2 className="font-myeongjo text-sm font-semibold mb-3 text-gold-bright">
          올해({reading.yearFlow.year} {reading.yearFlow.hanja}) 흐름
        </h2>
        <p className="text-sm text-bone-soft leading-relaxed border-l-2 border-gold pl-4">{reading.yearFlow.line}</p>
      </section>
      </>
      )}

      {/* 5. 고민 맛보기 — 첫 문장만 무료, 나머지는 잠금(갈증 유발) */}
      {reading.concernTeaser && (
        <section className="mb-10">
          <h2 className="font-myeongjo text-sm font-semibold mb-3 text-gold-bright">
            {reading.concernTeaser.concern} 흐름 맛보기
          </h2>
          <div className="border-l-2 border-gold pl-4">
            <p className="text-sm text-bone-soft leading-relaxed">{reading.concernTeaser.teaser}</p>
            {reading.concernTeaser.locked && (
              <div className="relative mt-2">
                <p className="text-sm text-bone-soft leading-relaxed svc-blur select-none" aria-hidden>
                  {reading.concernTeaser.locked}
                </p>
                <div className="absolute inset-0 flex items-end justify-start">
                  <span className="font-mono text-[11px] text-gold tracking-[0.08em]">
                    🔒 이어지는 풀이는 결과지에서 —
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 6. 기본 풀이 결제 유도 */}
      {basic && (
        <section className="mt-12 rounded-md p-6 text-center" style={{ border: "1.5px solid var(--gold)", background: "linear-gradient(180deg, rgba(212,175,106,0.10), rgba(13,6,8,0.6))" }}>
          <p className="font-myeongjo text-bone text-[15px] leading-relaxed mb-1">
            여기까지가 무료로 보는 흐름이에요.
          </p>
          <p className="font-myeongjo text-bone-soft text-sm mb-5">
            성향·올해 흐름·선택한 고민·조심할 시기까지 <b className="text-gold-bright">자세히</b> 풀어드립니다.
          </p>
          <button
            type="button"
            onClick={() => buy(basic)}
            disabled={!!busy}
            className="w-full max-w-sm mx-auto py-4 font-bold text-base tracking-[0.08em] disabled:opacity-60"
            style={{
              fontFamily: "'Noto Serif KR', serif",
              background: "linear-gradient(180deg,#e8c878,#d4af6a)",
              color: "var(--wine-deep)",
              boxShadow: "0 0 24px rgba(212,175,106,0.3)",
            }}
          >
            {busy === basic.productId ? "이동 중…" : `내 사주 전체 흐름 자세히 보기 · ${formatKRW(basic.price)}`}
          </button>
          {!isLoggedIn && (
            <p className="mt-3 text-[11px] text-bone-faint">결과는 로그인 후 마이페이지에서 확인할 수 있어요.</p>
          )}

          {/* 인생 종합 풀이 보조 노출 */}
          {premium && (
            <button
              type="button"
              onClick={() => buy(premium)}
              disabled={!!busy}
              className="mt-4 text-xs text-bone-soft underline underline-offset-4 tracking-[0.04em] disabled:opacity-60"
            >
              고민 하나를 더 깊게 보고 싶다면 — 인생 종합 풀이 {formatKRW(premium.price)}
            </button>
          )}
          <TrustStrip className="mt-6" />
        </section>
      )}

      <p className="mt-6 text-center text-[11px] text-bone-faint leading-relaxed">
        입력하신 정보는 명식 계산과 결과 생성에만 사용됩니다.
      </p>
    </div>
  );
}
