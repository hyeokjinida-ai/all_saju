"use client";
import { useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { track } from "@/lib/analytics";
type Assignment = { variant: "a" | "b"; qa: boolean };
let pending: Promise<Assignment | null> | undefined;
function assign() {
  const query = new URLSearchParams(location.search);
  return pending ??= fetch("/api/experiments/sangun-cta", { method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(4000),
    body: JSON.stringify({ qaVariant: query.get("cta_qa"), qa: ["demo", "detail_qa", "gate_qa"].some(k => query.has(k)) }),
  }).then(async r => {
    const data = await r.json();
    if (!r.ok || !data.enabled || !["a", "b"].includes(data.variant)) return null;
    try { sessionStorage.setItem("mr_cta_qa", data.qa ? "1" : "0"); } catch { /* server marker remains authoritative */ }
    return { variant: data.variant, qa: data.qa === true } as Assignment;
  }).catch(() => null);
}
export function SangunCtaButton({ onEnter, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children"> & { onEnter: () => void }) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const exposed = useRef(false);
  const clicked = useRef(false);
  useEffect(() => { let active = true; void assign().then(a => { if (active) setAssignment(a); }); return () => { active = false; }; }, []);
  const expose = () => {
    if (!assignment || exposed.current) return;
    exposed.current = true;
    track("cta_exposure", { slug: "sangun-sinjeom" });
  };
  useEffect(() => { expose(); }, [assignment]); // eslint-disable-line react-hooks/exhaustive-deps
  return <button {...props} type="button" data-cta-variant={assignment?.variant ?? "unassigned"} onClick={() => {
    if (clicked.current) return;
    clicked.current = true;
    expose();
    if (assignment) track("cta_click", { slug: "sangun-sinjeom" });
    onEnter();
  }}>{assignment?.variant === "b" ? "내 사주 보러 가기" : "신당으로 입장하기"}</button>;
}
