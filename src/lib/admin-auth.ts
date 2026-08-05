// =====================================================
// 어드민 인증 — .env 의 ADMIN_PASSWORD 기반 단일 비밀번호 게이트
// =====================================================
// 회원/권한 모델 없이 비밀번호 1개로 /admin 을 막는다. /admin 뒤엔 주문·매출·고객 정보가
// 그대로 있으므로, 비밀번호 하나가 유일한 자물쇠다. 그래서 최소한 이 셋은 지킨다:
//   ① 시도 횟수 제한 — 짧은 비밀번호는 제한이 없으면 사실상 없는 자물쇠다.
//   ② 쿠키에 비밀번호 원문을 넣지 않는다 — 파생 토큰만 넣는다.
//   ③ 비교는 타이밍 안전하게.
// 그래도 근본 대책은 **긴 비밀번호**다. 여기 코드로는 짧은 비밀번호를 길게 만들 수 없다.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

const COOKIE_NAME = "admin_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7일

// ── 시도 횟수 제한 ────────────────────────────────
// 인스턴스 메모리에 둔다. 서버리스라 인스턴스가 갈리면 카운터도 갈리므로 완벽한 차단은 아니지만,
// 무제한 시도를 "인스턴스마다 5회"로 낮춘다 — 자동 대입의 비용을 수백 배로 올린다.
// (완전한 차단은 DB 테이블이 필요하고 마이그레이션을 동반한다 — 지금은 여기까지.)
const FAIL_LIMIT = 5;
const LOCK_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; lockedUntil: number }>();

async function clientKey(): Promise<string> {
  const h = await headers();
  // Vercel 은 x-forwarded-for 첫 항목이 실제 클라이언트다
  const fwd = h.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** 남은 잠금 시간(ms). 0 이면 시도 가능. */
export async function adminLockRemainingMs(): Promise<number> {
  const rec = attempts.get(await clientKey());
  if (!rec) return 0;
  const left = rec.lockedUntil - Date.now();
  return left > 0 ? left : 0;
}

function noteFailure(key: string) {
  const rec = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= FAIL_LIMIT) {
    rec.lockedUntil = Date.now() + LOCK_MS;
    rec.count = 0; // 잠금 후 리셋 — 풀리면 다시 5회
  }
  attempts.set(key, rec);
}

// ── 비교·토큰 ────────────────────────────────
function safeEqual(a: string, b: string): boolean {
  // 길이가 다르면 timingSafeEqual 이 던진다 — 해시로 길이를 고정해 두고 비교한다
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** 쿠키에 넣을 값 — 비밀번호 원문이 아니라 파생값. 쿠키가 새도 비밀번호 자체는 안 샌다. */
function sessionToken(password: string): string {
  return createHash("sha256").update(`myeongunrok-admin:${password}`).digest("hex");
}

export function isAdminConfigured(): boolean {
  return serverEnv().ADMIN_PASSWORD.length > 0;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const expected = serverEnv().ADMIN_PASSWORD;
  if (!expected) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return safeEqual(token, sessionToken(expected));
}

// 어드민 페이지의 상단에서 호출 — 미인증이면 /admin/login 으로 리다이렉트
export async function requireAdminPassword(redirectFrom: string) {
  if (!isAdminConfigured()) {
    redirect(`/admin/login?from=${encodeURIComponent(redirectFrom)}&unconfigured=1`);
  }
  if (!(await isAdminAuthenticated())) {
    redirect(`/admin/login?from=${encodeURIComponent(redirectFrom)}`);
  }
}

export type AdminLoginResult = "ok" | "wrong" | "locked";

export async function setAdminCookie(password: string): Promise<AdminLoginResult> {
  const expected = serverEnv().ADMIN_PASSWORD;
  if (!expected) return "wrong";

  const key = await clientKey();
  const rec = attempts.get(key);
  if (rec && rec.lockedUntil > Date.now()) return "locked";

  if (!safeEqual(password, expected)) {
    noteFailure(key);
    return "wrong";
  }

  attempts.delete(key); // 성공하면 카운터 리셋
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sessionToken(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
  return "ok";
}

export async function clearAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
