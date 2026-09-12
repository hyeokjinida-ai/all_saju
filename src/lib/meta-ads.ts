// =====================================================
// 메타 광고비 수신 — 일별 손익 트래커의 광고비 칸을 채운다
// =====================================================
// 토큰은 META_ADS_TOKEN(시스템 사용자 토큰, ads_read·read_insights, 만료 없음).
// 토큰이 없거나 실패하면 **null 을 돌려준다. 0 이 아니다** — 0 으로 저장하면 그날이 흑자로 보인다.
//
// ⚠ 날짜 경계 문제(계획서 §0-B 4번):
//   Insights 의 time_increment=1 은 **광고 계정 시간대**로 하루를 자른다. 매출은 KST 로 자르므로,
//   계정이 서울이 아니면 두 숫자가 서로 다른 하루를 말하게 된다.
//   그래서 시간대를 **추정하지 않고 API 에 물어본다**(/act_<id>?fields=timezone_name).
//     · Asia/Seoul  → 일별 그대로 쓴다.
//     · 그 외        → 시간별(hourly_stats_aggregated_by_advertiser_time_zone)로 받아 KST 로 다시 묶는다.
//   **2026-09-12 실측으로 계정 시간대는 Asia/Seoul 로 확정됐다.** 근거 둘:
//     ① 9/9 지출 ₩0. 캠페인은 9/10 00시(KST)부터 돌았고 첫 결제가 9/10 05:16(KST)이라 그 시간대에
//        분명히 지출이 있었다. 계정이 UTC 면 그 9시간이 9/9 로 잡혀야 하는데 0원이다(태평양이면 더 크게 어긋난다).
//     ② 일별 구매 수가 KST 로 자른 DB 결제 수와 3일 연속 정확히 같다(9/10=2 · 9/11=3 · 9/12=2).
//   그래도 이 함수는 계속 API 에 물어본다 — 계정 설정은 바뀔 수 있고, 바뀌면 조용히 틀리는 쪽이 제일 나쁘다.

import { META_AD_ACCOUNT_ID, META_CAMPAIGN_PREFIX } from "@/config/pnl";

const GRAPH = "https://graph.facebook.com/v26.0";

export type DailyAdSpend = {
  /** 사주 캠페인 지출(원). */
  spend: number;
  /** 접두사 밖 캠페인 지출 — 같은 계정에서 다른 사업을 돌릴 때 섞이지 않게 따로 본다. */
  otherSpend: number;
  /** 메타가 잡은 구매 수. DB 결제 수와 나란히 두면 픽셀 누수가 보인다. */
  purchases: number;
};

export function isMetaAdsConfigured(): boolean {
  return !!process.env.META_ADS_TOKEN;
}

/** 광고 계정의 시간대·통화. 실패하면 null. */
export async function fetchAccountInfo(): Promise<{ timezoneName: string; currency: string } | null> {
  const token = process.env.META_ADS_TOKEN;
  if (!token) return null;
  try {
    const url = `${GRAPH}/act_${META_AD_ACCOUNT_ID}?fields=timezone_name,currency&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as { timezone_name?: string; currency?: string };
    if (!j.timezone_name) return null;
    return { timezoneName: j.timezone_name, currency: j.currency ?? "KRW" };
  } catch {
    return null;
  }
}

type InsightRow = {
  campaign_name?: string;
  spend?: string;
  date_start?: string;
  actions?: { action_type: string; value: string }[];
  hourly_stats_aggregated_by_advertiser_time_zone?: string;
};

async function fetchInsights(from: string, to: string, hourly: boolean): Promise<InsightRow[] | null> {
  const token = process.env.META_ADS_TOKEN;
  if (!token) return null;
  const params = new URLSearchParams({
    level: "campaign",
    fields: "campaign_name,spend,actions",
    time_range: JSON.stringify({ since: from, until: to }),
    time_increment: "1",
    limit: "500",
    access_token: token,
  });
  if (hourly) params.set("breakdowns", "hourly_stats_aggregated_by_advertiser_time_zone");

  const rows: InsightRow[] = [];
  let url = `${GRAPH}/act_${META_AD_ACCOUNT_ID}/insights?${params.toString()}`;
  try {
    // 페이지가 넘어갈 수 있다(시간별이면 하루 24행 × 캠페인 수).
    for (let page = 0; page < 20 && url; page++) {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      const j = (await res.json()) as { data?: InsightRow[]; paging?: { next?: string } };
      rows.push(...(j.data ?? []));
      url = j.paging?.next ?? "";
    }
    return rows;
  } catch {
    return null;
  }
}

function purchaseCount(row: InsightRow): number {
  const a = (row.actions ?? []).find(
    (x) => x.action_type === "offsite_conversion.fb_pixel_purchase" || x.action_type === "purchase",
  );
  return a ? Math.round(Number(a.value) || 0) : 0;
}

const isOurs = (name: string) => name.toLowerCase().startsWith(META_CAMPAIGN_PREFIX.toLowerCase());

/** "0"~"23" 시간 문자열을 앞 숫자로. (형식 예: "00:00:00 - 00:59:59") */
function hourOf(bucket: string | undefined): number {
  const m = /^(\d{1,2})/.exec(bucket ?? "");
  return m ? Number(m[1]) : 0;
}

/**
 * from~to(KST 날짜) 구간의 일별 광고비.
 *
 * 실패하면 **null** — 호출부는 이걸 「미수신」으로 다뤄야 한다(0 으로 채우지 말 것).
 */
export async function fetchDailyAdSpend(from: string, to: string): Promise<Map<string, DailyAdSpend> | null> {
  const info = await fetchAccountInfo();
  if (!info) return null;

  const seoul = info.timezoneName === "Asia/Seoul";
  // 계정 시간대가 서울이 아니면 하루가 밀리므로, 앞뒤로 하루씩 더 받아 KST 로 다시 자른다.
  const pad = (d: string, days: number) =>
    new Date(new Date(`${d}T00:00:00.000Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
  const rows = await fetchInsights(seoul ? from : pad(from, -1), seoul ? to : pad(to, 1), !seoul);
  if (!rows) return null;

  // 계정 시간대와 KST 의 시차(시간). 서울이면 0.
  const offsetHours = seoul ? 0 : accountToKstOffsetHours(info.timezoneName);

  const out = new Map<string, DailyAdSpend>();
  const bump = (day: string, ours: boolean, spend: number, purchases: number) => {
    let d = out.get(day);
    if (!d) out.set(day, (d = { spend: 0, otherSpend: 0, purchases: 0 }));
    if (ours) {
      d.spend += spend;
      d.purchases += purchases;
    } else {
      d.otherSpend += spend;
    }
  };

  for (const r of rows) {
    const spend = Number(r.spend) || 0;
    const ours = isOurs(r.campaign_name ?? "");
    const base = r.date_start ?? "";
    if (!base) continue;
    if (seoul) {
      bump(base, ours, spend, purchaseCount(r));
      continue;
    }
    // 계정 시간대의 (날짜, 시각) → KST 날짜
    const t = new Date(`${base}T00:00:00.000Z`).getTime() + (hourOf(r.hourly_stats_aggregated_by_advertiser_time_zone) + offsetHours) * 3600_000;
    bump(new Date(t).toISOString().slice(0, 10), ours, spend, purchaseCount(r));
  }

  // 요청 구간 밖(패딩분)은 버린다.
  for (const day of [...out.keys()]) {
    if (day < from || day > to) out.delete(day);
  }
  return out;
}

/** 계정 시간대 → KST 로 옮길 때 더할 시간. Intl 로 실제 오프셋을 구한다(서머타임 포함). */
function accountToKstOffsetHours(timezoneName: string): number {
  try {
    const now = new Date();
    const inTz = (tz: string) =>
      new Date(now.toLocaleString("en-US", { timeZone: tz })).getTime();
    const diffMs = inTz("Asia/Seoul") - inTz(timezoneName);
    return Math.round(diffMs / 3600_000);
  } catch {
    return 0; // 모르는 시간대면 옮기지 않는다(틀린 값보다 안 옮긴 값이 낫다)
  }
}
