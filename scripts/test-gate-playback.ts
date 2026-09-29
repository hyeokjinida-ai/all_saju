import assert from "node:assert/strict";
import { createGatePlayback, type GatePlaybackIssue } from "../src/lib/gate-playback";

function fixture() {
  const issues: GatePlaybackIssue[] = [];
  let reject!: (error: Error) => void;
  const video = {
    isConnected: true, paused: true, ended: false,
    muted: false, defaultMuted: false, playsInline: false,
    readyState: 1, networkState: 2, error: null,
    play() { return new Promise<void>((_resolve, fail) => { reject = fail; }); },
  };
  const playback = createGatePlayback(issue => issues.push(issue));
  return { video, issues, playback, fail: (name: string) => reject(Object.assign(new Error("not collected"), { name })) };
}

async function test() {
  // Navigation tears down the gate before the browser rejects the pending play.
  const left = fixture();
  const pending = left.playback.play(left.video as unknown as HTMLVideoElement, "intro", "auto");
  left.playback.dispose();
  left.video.isConnected = false;
  left.fail("AbortError");
  await pending;
  assert.equal(left.issues.length, 0);

  for (const [name, reason] of [["AbortError", "interrupted"], ["NotAllowedError", "blocked"], ["NotSupportedError", "failed"]]) {
    const f = fixture();
    const result = f.playback.play(f.video as unknown as HTMLVideoElement, "intro", "auto");
    assert.equal(f.video.muted && f.video.defaultMuted && f.video.playsInline, true);
    f.fail(name);
    await result;
    assert.equal(f.issues[0].reason, reason);
    assert.equal(f.issues[0].errorName, name);
    assert.equal(f.issues[0].readyState, 1);
    assert.equal("message" in f.issues[0], false);
  }

  // A superseded request must not overwrite a user-initiated recovery.
  const retry = fixture();
  const first = retry.playback.play(retry.video as unknown as HTMLVideoElement, "idle", "auto");
  const failFirst = retry.fail;
  // Capture the first rejection before replacing the fixture's callback.
  failFirst("NotAllowedError");
  const second = retry.playback.play(retry.video as unknown as HTMLVideoElement, "idle", "retry");
  retry.fail("NotAllowedError");
  await Promise.all([first, second]);
  assert.equal(retry.issues.length, 1);
  assert.equal(retry.issues[0].trigger, "retry");
  assert.equal(retry.issues[0].phase, "idle");

  const recovered = fixture();
  const playing = recovered.playback.play(recovered.video as unknown as HTMLVideoElement, "intro", "auto");
  recovered.video.paused = false;
  recovered.fail("AbortError");
  await playing;
  assert.equal(recovered.issues.length, 0);
  console.log("PASS: navigation cancellation, failure classification, mobile mute setup, recovery races and diagnostic fields");
}

void test().catch(error => { console.error(error); process.exitCode = 1; });
