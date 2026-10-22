export const PASSWORD_UPDATE_PATH = "/reset/update";

export function safeAuthRedirect(raw: string | null | undefined): string {
  if (!raw?.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(raw)) return "/mypage";
  try {
    const base = "https://auth.internal";
    const target = new URL(raw, base);
    const decodedPath = decodeURIComponent(target.pathname);
    if (target.origin !== base || decodedPath.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decodedPath)) return "/mypage";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/mypage";
  }
}

export function passwordResetCallbackUrl(siteUrl: string): string {
  const callback = new URL("/auth/callback", siteUrl);
  callback.searchParams.set("next", PASSWORD_UPDATE_PATH);
  return callback.toString();
}
