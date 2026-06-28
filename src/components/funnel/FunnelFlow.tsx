"use client";

// 인생사주 퍼널 상태 컨테이너 — 6스텝 스텝퍼 + draft 영속화 + 수정 점프/복귀.
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import type { FunnelState, FunnelCtx, ViewKey, FunnelProfile, FunnelProduct } from "@/lib/funnel/types";
import {
  LoginScreen,
  ConcernsScreen,
  ProfileScreen,
  ExtraScreen,
  ConfirmScreen,
  AnalysisScreen,
  PaymentScreen,
} from "./screens";

// 로그인은 맨 앞이 아니라 결제 직전 게이트(무료 퍼널은 로그인 없이 다 보게).
const ORDER: ViewKey[] = [
  "concerns",
  "profile",
  "extra",
  "confirm",
  "analysis",
  "payment",
];
const STEP: Partial<Record<ViewKey, number>> = {
  concerns: 1,
  profile: 2,
  extra: 3,
  confirm: 4,
};
// 기존 사용자 스토리지 키와 겹치지 않게 네임스페이스 고정.
const STORAGE_KEY = "myeongbom_funnel_v1";
const VIEW_KEY = "myeongbom_funnel_view_v1"; // OAuth 왕복 후 같은 화면으로 복귀

const SCREENS: Record<ViewKey, ComponentType<{ ctx: FunnelCtx }>> = {
  login: LoginScreen,
  concerns: ConcernsScreen,
  profile: ProfileScreen,
  extra: ExtraScreen,
  confirm: ConfirmScreen,
  analysis: AnalysisScreen,
  payment: PaymentScreen,
};

const initialState: FunnelState = {
  concerns: [],
  situationText: "",
  wishText: "",
  profile: { nickname: "", gender: undefined, birthDate: "", calendar: "solar", birthTime: "", unknownTime: false },
};

export function FunnelFlow({ isAuthed = false, product = null, products = [] }: { isAuthed?: boolean; product?: FunnelProduct | null; products?: FunnelProduct[] }) {
  const router = useRouter();
  const [state, setState] = useState<FunnelState>(initialState);
  const [view, setView] = useState<ViewKey>("concerns");
  const [returnTo, setReturnTo] = useState<ViewKey | null>(null);
  const loaded = useRef(false);

  // draft 복원(로그인 왕복/재방문). 기존 키 덮어쓰지 않음.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<FunnelState>;
        if (d && typeof d === "object") {
          setState((s) => ({ ...s, ...d, profile: { ...s.profile, ...(d.profile ?? {}) } }));
        }
      }
      const v = sessionStorage.getItem(VIEW_KEY) as ViewKey | null;
      if (v && ORDER.includes(v)) setView(v);
    } catch {
      /* 스토리지 차단 시 무시 */
    }
    loaded.current = true;
  }, []);

  // draft + 현재 화면 저장
  useEffect(() => {
    if (!loaded.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      sessionStorage.setItem(VIEW_KEY, view);
    } catch {
      /* no-op */
    }
  }, [state, view]);

  // 뷰 전환 시 상단으로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const ctx: FunnelCtx = {
    state,
    view,
    step: STEP[view] ?? 0,
    product,
    products,
    isAuthed,
    setLifeStage: (s) => setState((p) => ({ ...p, lifeStage: s })),
    toggleConcern: (c) =>
      setState((p) => ({
        ...p,
        concerns: p.concerns.includes(c) ? p.concerns.filter((x) => x !== c) : [...p.concerns, c],
      })),
    setField: (k, v) => setState((p) => ({ ...p, [k]: v })),
    setProfile: (k, v) =>
      setState((p) => {
        const profile = { ...p.profile, [k]: v } as FunnelProfile;
        if (k === "unknownTime" && v) profile.birthTime = "";
        return { ...p, profile };
      }),
    next: () => {
      if (returnTo) {
        const r = returnTo;
        setReturnTo(null);
        setView(r);
        return;
      }
      const i = ORDER.indexOf(view);
      let nextView = ORDER[Math.min(i + 1, ORDER.length - 1)];
      if (nextView === "login" && isAuthed) nextView = "payment"; // 이미 로그인했으면 결제로 직행
      setView(nextView);
    },
    prev: () => {
      setReturnTo(null);
      const i = ORDER.indexOf(view);
      if (i <= 0) {
        router.push("/");
        return;
      }
      setView(ORDER[i - 1]);
    },
    goTo: (v) => {
      setReturnTo("confirm");
      setView(v);
    },
  };

  const Screen = SCREENS[view];
  return (
    <div key={view} className="view-fade">
      <Screen ctx={ctx} />
    </div>
  );
}
