// 인생사주 감정이입 퍼널 — 상태 모델 (핸드오프 CLAUDE.md §3 기준)
export type LifeStage = "early" | "prime" | "turning" | "late";
export type Concern =
  | "wealth"
  | "career"
  | "relationship"
  | "marriage"
  | "family"
  | "health"
  | "overall";
export type Gender = "M" | "F";
export type Calendar = "solar" | "lunar";

export interface FunnelProfile {
  nickname: string;
  gender?: Gender;
  birthDate: string; // "YYYY-MM-DD"
  calendar: Calendar;
  birthTime: string; // "" | "HH:mm"
  unknownTime: boolean;
}

export interface FunnelState {
  lifeStage?: LifeStage;
  concerns: Concern[]; // 선택 순서 보존(결과 우선순위)
  situationText: string;
  wishText: string;
  profile: FunnelProfile;
}

// 화면(뷰) 순서: 로그인 → 状惑述望 → 명식 → 확인 → 무료분석 → 결제
export type ViewKey =
  | "login"
  | "concerns"
  | "situation"
  | "wish"
  | "profile"
  | "confirm"
  | "analysis"
  | "payment";

export interface FunnelProduct {
  id: string;
  price: number;
  name: string;
}

export interface FunnelCtx {
  state: FunnelState;
  view: ViewKey;
  step: number; // 1..6 진행 인디케이터(해당 없으면 0)
  product: FunnelProduct | null; // 결제 대상 상품(서버 해석). null이면 기존 상품페이지로 폴백.
  isAuthed: boolean; // 로그인 여부 — 결제 직전 로그인 게이트 건너뛰기용
  setLifeStage: (s: LifeStage) => void;
  toggleConcern: (c: Concern) => void;
  setField: <K extends keyof FunnelState>(k: K, v: FunnelState[K]) => void;
  setProfile: <K extends keyof FunnelProfile>(k: K, v: FunnelProfile[K]) => void;
  next: () => void;
  prev: () => void;
  goTo: (v: ViewKey) => void;
}
