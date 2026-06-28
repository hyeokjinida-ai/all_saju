// =====================================================
// 결과지 완성 이메일 발송 — Resend REST API (의존성 없이 fetch).
// =====================================================
// RESEND_API_KEY 가 있어야 동작(없으면 조용히 스킵 — 결과 생성은 막지 않음).
// 필요 env: RESEND_API_KEY, EMAIL_FROM(도메인 인증된 발신자), NEXT_PUBLIC_SITE_URL(링크 절대경로).
// 발신 도메인 미인증 시 Resend 테스트 발신자(onboarding@resend.dev)로 폴백 — 본인에게만 전송됨.

export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").replace(/\/$/, "");
}

function resultEmailHtml(url: string, productName: string) {
  return `<!DOCTYPE html><html lang="ko"><body style="margin:0;background:#0f0a1c;padding:32px 16px;font-family:'Apple SD Gothic Neo',Pretendard,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#160e30;border:1px solid rgba(180,140,255,.25);border-radius:18px;overflow:hidden;">
      <tr><td style="padding:28px 28px 0;text-align:center;">
        <div style="font-family:serif;font-weight:800;font-size:20px;letter-spacing:.08em;color:#f3edff;">명운록</div>
        <div style="font-size:9px;font-weight:700;letter-spacing:.22em;color:#c9a8ff;margin-top:4px;">SAJU LAB</div>
      </td></tr>
      <tr><td style="padding:22px 28px 6px;text-align:center;">
        <div style="font-family:serif;font-weight:800;font-size:22px;color:#ffffff;line-height:1.4;">결과지가 도착했어요</div>
        <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#cbb8f0;">${productName} 풀이가 완성됐어요.<br/>아래 버튼으로 평생 다시 볼 수 있어요.</p>
      </td></tr>
      <tr><td style="padding:24px 28px 6px;text-align:center;">
        <a href="${url}" style="display:inline-block;padding:15px 30px;border-radius:14px;background:#ffffff;color:#3a1a8a;font-weight:800;font-size:15px;text-decoration:none;">결과지 확인하기 →</a>
      </td></tr>
      <tr><td style="padding:18px 28px 28px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#9a8cd0;line-height:1.6;">버튼이 안 열리면 아래 주소를 복사해 주세요<br/><span style="color:#b8a4e0;word-break:break-all;">${url}</span></p>
      </td></tr>
    </table>
    <p style="margin:18px 0 0;font-size:11px;color:#6b5e96;">명운록 · SAJU LAB</p>
  </td></tr></table>
  </body></html>`;
}

// 결과지 링크를 이메일로 발송. 베스트 에포트(실패해도 throw 안 함).
export async function sendResultEmail(opts: { to: string; resultId: string; productName: string }): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isEmailConfigured()) return { ok: false, skipped: true };
  const base = siteUrl();
  const url = `${base}/results/${opts.resultId}`;
  const from = process.env.EMAIL_FROM || "명운록 <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: `[명운록] ${opts.productName} 결과지가 도착했어요`,
        html: resultEmailHtml(url, opts.productName),
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: `resend ${res.status} ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
