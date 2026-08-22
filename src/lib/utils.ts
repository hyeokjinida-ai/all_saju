import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

/** "방금 전 · 14분 전 · 3시간 전 · 2일 전 · 2026.08.01" — 홈 후기 카드용 */
export function timeAgo(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (!Number.isFinite(min) || min < 0) return "방금 전";
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day}일 전`;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
