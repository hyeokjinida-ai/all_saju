"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { createGatePlayback, type GatePlaybackIssue, type GateVideoPhase } from "@/lib/gate-playback";
import styles from "./SangunEntry.module.css";

type Variant = "a" | "b";
let pendingAssignment: Promise<{ variant: Variant; qa: boolean } | null> | undefined;
function assign(): Promise<{ variant: Variant; qa: boolean } | null> {
  const qaVariant = new URLSearchParams(location.search).get("gate_qa");
  return pendingAssignment ??= fetch("/api/experiments/sangun-gate", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qaVariant }), signal: AbortSignal.timeout(4000) })
    .then(async r => {
      const data = await r.json();
      if (!r.ok || !data.enabled || (data.variant !== "a" && data.variant !== "b")) return null;
      try { sessionStorage.setItem("mr_gate_qa", data.qa ? "1" : "0"); } catch { /* first-party server tags remain authoritative */ }
      return { variant: data.variant as Variant, qa: data.qa === true };
    }).catch(() => null);
}

type MediaDetails = Record<string, string | number | boolean>;
function GateVideo({ variant, report }: { variant: Variant; report: (event: string, ms?: number, details?: MediaDetails) => void }) {
  const main = useRef<HTMLVideoElement>(null);
  const idle = useRef<HTMLVideoElement>(null);
  const started = useRef(0);
  const reported = useRef(new Set<string>());
  const playback = useRef<ReturnType<typeof createGatePlayback> | null>(null);
  const retryPhase = useRef<GateVideoPhase | null>(null);
  const [phase, setPhase] = useState<"intro" | "idle">("intro");
  const [fallback, setFallback] = useState(false);
  const [needsRetry, setNeedsRetry] = useState(false);
  const a = variant === "a";
  const poster = a ? "/products/sangun/gate-ab/props-matched-start.webp" : "/products/sangun/gate.webp";
  const once = (event: string, details: MediaDetails = {}) => {
    const key = details.errorName ? `${event}:${details.errorName}` : event;
    if (reported.current.has(key)) return;
    reported.current.add(key);
    report(event, Math.round(performance.now() - started.current), details);
  };

  const retry = (trigger: GatePlaybackIssue["trigger"]) => {
    const target = retryPhase.current;
    const video = target === "idle" ? idle.current : main.current;
    if (!target || !video) return;
    if (video.error) video.load();
    void playback.current?.play(video, target, trigger);
  };

  const playing = (target: GateVideoPhase) => {
    retryPhase.current = null;
    setNeedsRetry(false);
    setFallback(false);
    if (target === "idle") setPhase("idle");
    once(target === "intro" ? "gate_media_playing" : "gate_idle_playing");
  };

  const mediaError = (target: GateVideoPhase) => {
    const video = target === "intro" ? main.current : idle.current;
    // A preloaded idle video must not cover an intro that is still playing.
    if (target === "intro" || main.current?.ended) {
      retryPhase.current = target;
      setNeedsRetry(true);
      setFallback(true);
    }
    once(target === "intro" ? "gate_media_error" : "gate_idle_error", {
      phase: target, mediaCode: video?.error?.code ?? 0,
      readyState: video?.readyState ?? 0, networkState: video?.networkState ?? 0,
      visibility: document.visibilityState,
    });
  };

  useEffect(() => {
    started.current = performance.now();
    const controller = createGatePlayback(issue => {
      const { reason, ...details } = issue;
      // Interruptions stay available for diagnosis, outside the failure counter.
      const event = reason === "interrupted" ? "gate_play_interrupted"
        : reason === "failed" ? (issue.phase === "intro" ? "gate_media_error" : "gate_idle_error")
        : (issue.phase === "intro" ? "gate_media_blocked" : "gate_idle_blocked");
      once(event, { ...details, visibility: document.visibilityState });
      retryPhase.current = issue.phase;
      setNeedsRetry(true);
      if (reason === "failed") setFallback(true);
    });
    playback.current = controller;
    const el = main.current;
    if (el) void controller.play(el, "intro", "auto");
    const slow = setTimeout(() => {
      if (document.visibilityState === "visible" && !reported.current.has("gate_media_playing")) once("gate_media_slow", { readyState: el?.readyState ?? 0 });
    }, 5000);
    const visible = () => { if (document.visibilityState === "visible") retry("visible"); };
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.dispose();
      playback.current = null;
      clearTimeout(slow);
      document.removeEventListener("visibilitychange", visible);
    };
    // Mounted once per assigned gate; re-rendering must not restart its video.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>
    <div className={`${styles.portrait} ${a ? styles.ritualPortrait : ""}`} aria-hidden>
    <>
        <video ref={main} src={a ? "/products/sangun/gate-ab/four-jumps.mp4" : "/products/sangun/gate.mp4"}
          poster={poster} autoPlay muted playsInline className={styles.video}
          aria-label={a ? "부채와 방울을 들고 네 번 도약하는 산군" : "문을 열고 신당으로 들어가는 장면"}
          onPlaying={() => playing("intro")}
          onError={() => mediaError("intro")}
          onEnded={() => { if (idle.current) void playback.current?.play(idle.current, "idle", "auto"); }} />
        <video ref={idle} src={a ? "/products/sangun/gate-ab/idle.mp4" : "/products/sangun/gate-idle.mp4"}
          muted playsInline loop preload="auto" aria-hidden className={styles.video}
          style={{ opacity: phase === "idle" ? 1 : 0 }}
          onPlaying={() => playing("idle")}
          onError={() => mediaError("idle")} />
    </>
    {fallback &&
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster} alt="" className={styles.video} />}
    {!a && <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 100% 100%, rgba(7,6,9,0.92) 0%, rgba(7,6,9,0.55) 22%, rgba(7,6,9,0) 42%)" }} />}
    </div>
    {needsRetry && <button type="button" className={styles.retry} onClick={() => retry("retry")}>영상 다시 재생</button>}
  </>;
}

export function SangunGateExperiment({ onEnter, soundOn, toggleSound, previewVariant }: {
  onEnter: () => void; soundOn: boolean; toggleSound: () => void; previewVariant?: Variant;
}) {
  const [variant, setVariant] = useState<Variant | null | undefined>(previewVariant);
  const [qa, setQa] = useState(false);
  const seen = useRef(false);
  const clicked = useRef(false);
  useEffect(() => {
    if (previewVariant) return;
    let active = true;
    void assign().then(v => { if (active) { setVariant(v?.variant ?? null); setQa(v?.qa ?? false); } });
    return () => { active = false; };
  }, [previewVariant]);
  useEffect(() => {
    if (variant === undefined || seen.current || previewVariant) return;
    seen.current = true;
    track("gate_view", { slug: "sangun-sinjeom" });
    track(variant ? "gate_exposure" : "gate_assignment_failed", { slug: "sangun-sinjeom" });
  }, [variant, previewVariant]);
  const report = (event: string, ms?: number, details: MediaDetails = {}) => {
    if (!previewVariant && variant) track(event, { slug: "sangun-sinjeom", ms, ...details });
  };
  const enter = () => {
    if (clicked.current) return;
    clicked.current = true;
    if (variant) report("gate_click");
    onEnter();
  };
  const a = variant === "a";
  return <div className={`world-sangun story-immersive ${styles.gate}`} data-gate-variant={variant ?? "unassigned"} data-gate-qa={qa}>
    <div className={`${styles.frame} ${a ? styles.fullBleed : ""}`}>
      {variant !== undefined && <GateVideo variant={variant ?? "b"} report={report} />}
      <div className={styles.scrim} aria-hidden />
      <div className={styles.topbar}>
        <span className={styles.brand}>명운록</span>
        <button type="button" className={styles.sound} onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? "배경음 끄기" : "배경음 켜기"}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M11 5 6 9H3v6h3l5 4V5Z" />{soundOn ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /> : <path d="m16 9 5 6m0-6-5 6" />}</svg>
        </button>
      </div>
      <div className={styles.content}>
        <h1 className={styles.title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/home/lettering/sangun-sinjeom.webp" alt="박수무당" width={896} height={232} className={styles.lettering} />
          <span className={styles.saju}>사주</span>
        </h1>
        <p className={styles.hook}>내 운이 풀리는 때는 언제일까?</p>
        <button type="button" disabled={variant === undefined} onClick={enter} className={styles.start}>{variant === undefined ? "준비 중…" : "내 사주 보러가기"} <span aria-hidden>→</span></button>
        <p className={styles.note}>무료 사주풀이 먼저 확인 · 전체 풀이는 유료</p>
      </div>
    </div>
  </div>;
}
