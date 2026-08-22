// 상품 빌더가 주고받는 값의 모양 한 곳 — 폼(클라)과 API(서버)가 같은 스키마를 본다.
//
// ⚠ 0011 마이그레이션 전에도 어드민이 죽지 않아야 한다. 새 컬럼을 읽을 때는
//    `hasBuilderColumns()` 로 먼저 물어보고, 없으면 화면이 "SQL 부터 붙이세요"를 띄운다.
import { z } from "zod";

export const CATEGORIES = [
  { key: "love", label: "연애·결혼" },
  { key: "sinjeom", label: "신점" },
  { key: "wealth", label: "재물" },
  { key: "life", label: "종합" },
  { key: "family", label: "가족" },
  { key: "career", label: "직장" },
] as const;

export const LENGTHS = [
  { key: "짧게(각 장 300자 내외)", label: "짧게 — 가볍게 읽는 풀이" },
  { key: "보통(각 장 500자 내외)", label: "보통 — 기본" },
  { key: "길게(각 장 800자 이상)", label: "길게 — 깊은 풀이" },
] as const;

const artSlot = z
  .object({
    url: z.string().url().or(z.literal("")).optional(),
    pos: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional(),
  })
  .optional();

export const productFormSchema = z.object({
  // ① 기본 — slug 는 만들고 나면 못 바꾼다(주문·결과지가 이걸로 상품을 찾는다)
  slug: z
    .string()
    .regex(/^[a-z0-9-]{3,40}$/, "영문 소문자·숫자·하이픈 3~40자"),
  name: z.string().min(1, "이름을 적어주세요").max(30, "30자 안으로"),
  description: z.string().min(1, "설명을 적어주세요").max(120, "120자 안으로"),
  price: z.coerce.number().int().min(0),
  compare_at_price: z.coerce.number().int().min(0).nullable().optional(),
  display_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(false),
  is_addon: z.boolean().default(false),
  bundle_slugs: z.array(z.string()).nullable().optional(),

  // ② 홈 카드
  category: z.string().nullable().optional(),
  character_name: z.string().max(30).nullable().optional(),
  card_title: z.string().max(12).nullable().optional(),
  tagline: z.string().max(30).nullable().optional(),
  hero_rank: z.coerce.number().int().min(1).max(9).nullable().optional(),
  // lettering = 표면까지 입힌 제목 그림(ChatGPT 웹 산출물). 있으면 히어로가 글자 대신 이걸 쓴다.
  art: z.object({ hero: artSlot, big: artSlot, row: artSlot, lettering: artSlot }).default({}),

  // ③ 랜딩 카피 — 상품 상세가 그대로 찍는다
  pitch: z
    .object({
      eyebrow: z.string().max(40).optional(),
      headline: z.array(z.string()).optional(),
      pains: z.array(z.string()).optional(),
      includes: z.array(z.string()).optional(),
      forWhom: z.string().max(80).optional(),
      hasCharts: z.boolean().optional(),
    })
    .nullable()
    .optional(),

  // ④ 결과지 설계 — 별도 테이블(product_styles)로 간다
  style: z
    .object({
      title: z.string().max(60),
      length: z.string(),
      outline: z.array(z.string()).min(3, "장을 3개 이상 적어주세요").max(12, "12개까지"),
      voice: z.string().max(2000).optional(),
      banmal: z.boolean().optional(),
    })
    .nullable()
    .optional(),
});

export type ProductForm = z.infer<typeof productFormSchema>;

/** 정가가 판매가보다 싸면 취소선이 거짓말이 된다 — DB 제약(0010)과 같은 규칙을 폼에서도 */
export function priceIssue(f: { price: number; compare_at_price?: number | null }): string | null {
  if (f.compare_at_price != null && f.compare_at_price > 0 && f.compare_at_price < f.price) {
    return "정가는 판매가보다 크거나 같아야 합니다";
  }
  return null;
}

export const emptyForm = (): ProductForm => ({
  slug: "",
  name: "",
  description: "",
  price: 0,
  compare_at_price: null,
  display_order: 100,
  is_active: false,
  is_addon: false,
  bundle_slugs: null,
  category: null,
  character_name: null,
  card_title: null,
  tagline: null,
  hero_rank: null,
  art: {},
  pitch: null,
  style: null,
});
