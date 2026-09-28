"use client";
import { useEffect, useRef, useState } from "react";
import { SangunGateExperiment } from "@/components/products/SangunGateExperiment";

export function Preview({ variant }: { variant: "a" | "b" }) {
  const [entered, setEntered] = useState(false);
  const [sound, setSound] = useState(false);
  const intro = useRef<HTMLAudioElement | null>(null);
  const bed = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { intro.current?.pause(); bed.current?.pause(); }, []);
  const toggle = () => {
    if (sound) { intro.current?.pause(); bed.current?.pause(); setSound(false); return; }
    bed.current = new Audio("/products/sangun/shrine-bed.m4a");
    bed.current.loop = true;
    bed.current.volume = 0.5;
    intro.current = new Audio("/products/sangun/shrine-gate.m4a");
    intro.current.volume = 0.5;
    intro.current.onended = () => { void bed.current?.play().catch(() => {}); };
    void intro.current.play().catch(() => { void bed.current?.play().catch(() => {}); });
    setSound(true);
  };
  if (entered) return <div style={{ padding: 30, minHeight: "100svh", background: "#080706", color: "#f5eddf" }}>
    <h1>두 버전 모두 같은 사주 소개로 이어집니다.</h1><p>검수 화면에서는 주문을 생성하지 않습니다.</p>
    <button onClick={() => setEntered(false)}>게이트 다시 보기</button>
  </div>;
  return <SangunGateExperiment previewVariant={variant} onEnter={() => { intro.current?.pause(); bed.current?.pause(); setSound(false); setEntered(true); }} soundOn={sound} toggleSound={toggle} />;
}
