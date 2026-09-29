export type GateVideoPhase = "intro" | "idle";
export type GatePlaybackIssue = {
  phase: GateVideoPhase;
  trigger: "auto" | "retry" | "visible";
  reason: "interrupted" | "blocked" | "failed";
  errorName: string;
  readyState: number;
  networkState: number;
  mediaCode: number;
};

// A rejected play() after navigation is not a playback failure for the visitor.
// Keep each attempt tied to the mounted gate, and never collect error messages/URLs.
export function createGatePlayback(onIssue: (issue: GatePlaybackIssue) => void) {
  let active = true;
  const attempts = new WeakMap<HTMLVideoElement, number>();
  return {
    async play(video: HTMLVideoElement, phase: GateVideoPhase, trigger: GatePlaybackIssue["trigger"]) {
      const attempt = (attempts.get(video) ?? 0) + 1;
      attempts.set(video, attempt);
      // Set properties before play() as well as the JSX attributes for mobile webviews.
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      try {
        await video.play();
      } catch (error) {
        if (!active || !video.isConnected || attempts.get(video) !== attempt || !video.paused || video.ended) return;
        const name = error && typeof error === "object" && "name" in error ? String(error.name) : "UnknownError";
        onIssue({
          phase, trigger,
          reason: name === "AbortError" ? "interrupted" : name === "NotAllowedError" ? "blocked" : "failed",
          errorName: name.slice(0, 60),
          readyState: video.readyState,
          networkState: video.networkState,
          mediaCode: video.error?.code ?? 0,
        });
      }
    },
    dispose() { active = false; },
  };
}
