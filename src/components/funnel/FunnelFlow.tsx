"use client";

// 인생사주 퍼널 상태 컨테이너 — 6스텝 스텝퍼 + draft 영속화 + 수정 점프/복귀.
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import type { FunnelState, FunnelCtx, ViewKey, FunnelProfile, FunnelProduct } from "@/lib/funnel/types";
import {
  LoginScreen,
  StateScreen,
  ConcernsScreen,
  SituationScreen,
  WishScreen,
  ProfileScreen,
  ConfirmScreen,
  AnalysisScreen,
  PaymentScreen,
} from "./screens";

const ORDER: ViewKey[] = [
  "login",
  "state",
  "concerns",
  "situation",
  "wish",
  "profile",
  "confirm",
  "analysis",
  "payment",
];
const STEP: Partial<Record<ViewKey, number>> = {
  state: 1,
  concerns: 2,
  situation: 3,
  wish: 4,
  profile: 5,
  confirm: 6,
};
// 기존 사용자 스토리지 키와 겹치지 않게 네임스페이스 고정.
const STORAGE_KEY = "myeongbom_funnel_v1";

const SCREENS: Record<ViewKey, ComponentType<{ ctx: FunnelCtx }>> = {
  login: LoginScreen,
  state: StateScreen,
  concerns: ConcernsScreen,
  situation: SituationScreen,
  wish: WishScreen,
  profile: ProfileScreen,
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

export function FunnelFlow({ isAuthed = false, product = null }: { isAuthed?: boolean; product?: FunnelProduct | null }) {
  const router = useRouter();
  const [state, setState] = useState<FunnelState>(initialState);
  // 이미 로그인돼 있으면(카카오 왕복 복귀 포함) 로그인 화면을 건너뛰고 질문부터.
  const [view, setView] = useState<ViewKey>(isAuthed ? "state" : "login");
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
    } catch {
      /* 스토리지 차단 시 무시 */
    }
    loaded.current = true;
  }, []);

  // draft 저장
  useEffect(() => {
    if (!loaded.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* no-op */
    }
  }, [state]);

  // 뷰 전환 시 상단으로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const ctx: FunnelCtx = {
    state,
    view,
    step: STEP[view] ?? 0,
    product,
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
      setView(ORDER[Math.min(i + 1, ORDER.length - 1)]);
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
  return <Screen ctx={ctx} />;
}
