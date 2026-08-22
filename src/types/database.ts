// Supabase 스키마와 동기화된 타입. supabase gen types로 자동 생성하는 것을 권장하지만,
// 보일러플레이트 1차 빌드는 수동 정의로 시작합니다. 스키마 변경 시 함께 업데이트하세요.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus = "pending" | "paid" | "failed";
export type CalendarKind = "solar" | "lunar";
export type GenderKind = "male" | "female";

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  is_admin: boolean;
  created_at: string;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  // 0010 업셀 — 취소선 정가 / 패키지 구성품 / 퍼널 안에서만 파는 상품(홈·목록에서 숨김)
  compare_at_price: number | null;
  bundle_slugs: string[] | null;
  is_addon: boolean;
  // 0011 상품 빌더 — 홈 카드·랜딩 카피를 어드민에서 채운다. 비면 코드 폴백이 답한다.
  category: string | null;
  character_name: string | null;
  card_title: string | null;
  tagline: string | null;
  hero_rank: number | null;
  art: Json;
  pitch: Json | null;
  updated_at: string;
};

/** 결과지 설계(목차·말투) — products 가 아니라 별도 테이블. public read 를 피하려고 갈랐다. */
type ProductStyleRow = {
  product_id: string;
  style: Json;
  updated_at: string;
};

// 웹툰 페이지 — 상품별 컷 구성(그림 경로 + 말풍선). 어드민에서 저장하고 렌더러가 읽는다.
type WebtoonPageRow = {
  id: string;
  product_id: string;
  kind: string;
  slug: string;
  name: string;
  cuts: Json;
  is_published: boolean; // 손님에게 보일지 — 어드민 편집기의 노출 스위치
  updated_at: string;
};

type WebtoonPageVersionRow = {
  id: string;
  page_id: string;
  cuts: Json;
  created_at: string;
};

type OrderRow = {
  id: string;
  order_id: string;
  user_id: string | null;
  guest_email: string | null;
  product_id: string;
  amount: number;
  status: OrderStatus;
  toss_payment_key: string | null;
  paid_at: string | null;
  created_at: string;
  result_attempts: number; // 0006 — 복구 크론 재시도 횟수
  result_last_attempt_at: string | null; // 0006
};

type SajuInputRow = {
  id: string;
  order_id: string;
  name: string | null;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  gender: GenderKind;
  calendar: CalendarKind;
  concerns: string[];
  created_at: string;
};

type SajuResultRow = {
  id: string;
  order_id: string;
  myeongsik: Json;
  interpretation_md: string;
  llm_provider: string;
  llm_model: string;
  raw_analysis: Json | null; // 0005 마이그레이션 — luckyloveme 16종 원본 분석
  // 0010 — 패키지 주문은 한 order_id 에 구성품 수만큼 행이 생긴다. unique(order_id, product_slug).
  product_slug: string;
  created_at: string;
};

// 0010 — 추가질문권. 유료(결제)와 보상(리뷰 작성 시 무료)을 한 테이블로 처리.
type ExtraQuestionRow = {
  id: string;
  parent_order_id: string;
  order_id: string | null;
  source: "paid" | "review_reward";
  status: "credited" | "pending" | "answered" | "failed";
  question: string | null;
  answer_md: string | null;
  created_at: string;
  answered_at: string | null;
};

type ReviewRow = {
  id: string;
  // 0010 — 비회원도 후기를 쓴다(본인 확인은 라우트에서 toss_payment_key capability 로).
  user_id: string | null;
  guest_email: string | null;
  order_id: string;
  product_id: string;
  rating: number;
  content: string;
  is_public: boolean;
  is_approved: boolean; // 어드민 노출 토글
  created_at: string;
};

type SajuApiCallRow = {
  id: string;
  called_at: string;
  success: boolean;
  source: string | null;
};

type SajuAnalysisCacheRow = {
  birth_key: string;
  analysis: Json;
  created_at: string;
};

type AnalyticsEventRow = {
  id: number;
  visitor_id: string | null;
  session_id: string | null;
  event: string;
  path: string | null;
  referrer: string | null;
  props: Json;
  ua: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          phone?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      products: {
        Row: ProductRow;
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          price: number;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          compare_at_price?: number | null;
          bundle_slugs?: string[] | null;
          is_addon?: boolean;
          category?: string | null;
          character_name?: string | null;
          card_title?: string | null;
          tagline?: string | null;
          hero_rank?: number | null;
          art?: Json;
          pitch?: Json | null;
          updated_at?: string;
        };
        Update: Partial<ProductRow>;
        Relationships: [];
      };
      product_styles: {
        Row: ProductStyleRow;
        Insert: { product_id: string; style: Json; updated_at?: string };
        Update: Partial<ProductStyleRow>;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: {
          id?: string;
          order_id: string;
          user_id?: string | null;
          guest_email?: string | null;
          product_id: string;
          amount: number;
          status?: OrderStatus;
          toss_payment_key?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: Partial<OrderRow>;
        Relationships: [];
      };
      saju_inputs: {
        Row: SajuInputRow;
        Insert: {
          id?: string;
          order_id: string;
          name?: string | null;
          birth_date: string;
          birth_time?: string | null;
          time_unknown?: boolean;
          gender: GenderKind;
          calendar?: CalendarKind;
          concerns?: string[];
          created_at?: string;
        };
        Update: Partial<SajuInputRow>;
        Relationships: [];
      };
      saju_results: {
        Row: SajuResultRow;
        Insert: {
          id?: string;
          order_id: string;
          myeongsik: Json;
          interpretation_md: string;
          llm_provider: string;
          llm_model: string;
          raw_analysis?: Json | null;
          product_slug: string;
          created_at?: string;
        };
        Update: Partial<SajuResultRow>;
        Relationships: [];
      };
      reviews: {
        Row: ReviewRow;
        Insert: {
          id?: string;
          user_id?: string | null;
          guest_email?: string | null;
          order_id: string;
          product_id: string;
          rating: number;
          content: string;
          is_public?: boolean;
          is_approved?: boolean;
          created_at?: string;
        };
        Update: Partial<ReviewRow>;
        Relationships: [];
      };
      extra_questions: {
        Row: ExtraQuestionRow;
        Insert: {
          id?: string;
          parent_order_id: string;
          order_id?: string | null;
          source: "paid" | "review_reward";
          status?: "credited" | "pending" | "answered" | "failed";
          question?: string | null;
          answer_md?: string | null;
          created_at?: string;
          answered_at?: string | null;
        };
        Update: Partial<ExtraQuestionRow>;
        Relationships: [];
      };
      saju_api_calls: {
        Row: SajuApiCallRow;
        Insert: {
          id?: string;
          called_at?: string;
          success: boolean;
          source?: string | null;
        };
        Update: Partial<SajuApiCallRow>;
        Relationships: [];
      };
      saju_analysis_cache: {
        Row: SajuAnalysisCacheRow;
        Insert: {
          birth_key: string;
          analysis: Json;
          created_at?: string;
        };
        Update: Partial<SajuAnalysisCacheRow>;
        Relationships: [];
      };
      webtoon_pages: {
        Row: WebtoonPageRow;
        Insert: {
          id?: string;
          product_id: string;
          kind?: string;
          slug: string;
          name?: string;
          cuts?: Json;
          is_published?: boolean;
          updated_at?: string;
        };
        Update: Partial<WebtoonPageRow>;
        Relationships: [];
      };
      webtoon_page_versions: {
        Row: WebtoonPageVersionRow;
        Insert: {
          id?: string;
          page_id: string;
          cuts: Json;
          created_at?: string;
        };
        Update: Partial<WebtoonPageVersionRow>;
        Relationships: [];
      };
      analytics_events: {
        Row: AnalyticsEventRow;
        Insert: {
          id?: number;
          visitor_id?: string | null;
          session_id?: string | null;
          event: string;
          path?: string | null;
          referrer?: string | null;
          props?: Json;
          ua?: string | null;
          created_at?: string;
        };
        Update: Partial<AnalyticsEventRow>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      order_status: OrderStatus;
      calendar_kind: CalendarKind;
      gender_kind: GenderKind;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
