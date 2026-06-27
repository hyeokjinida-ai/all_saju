import type { Config } from "tailwindcss";

/* 명운록 디자인 시스템 — 밤하늘 먹빛 + 금 + 자수정 (붓글씨·명조·Pretendard)
   디자인 토큰: src/app/globals.css :root 및 design_handoff_saju_funnel/README.md */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1100px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))", // line/border #2C2F52
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ── 보일러플레이트 alias 재매핑 — 자수정(amethyst) 다크 ──
        // 기존 className 그대로 두고 색만 바꿔서 모든 페이지 자동 적용됨
        ink: "#F1EEF9",                          // 강조 텍스트
        canvas: "#1b0d3c",                       // 화면 배경 (screen)
        "surface-soft": "#241047",               // 카드 표면
        "surface-dark": "#120726",               // 가장 깊은 밤
        charcoal: "#cbb8f0",                     // 서브 텍스트
        body: "#cbb8f0",                         // 본문
        mute: "#9a8cd0",                         // 보조 텍스트
        hairline: "#3a2f5e",                     // 카드/입력 테두리
        "hairline-strong": "#4a3a6e",            // 강한 테두리(차트 셀)

        // ── 명운록 명시적 토큰 (직접 사용: bg-wine, text-gold[보라], text-violet 등) ──
        // 호환 위해 wine*/gold* 이름은 유지하되 값은 자수정으로 재매핑
        wine: "#1b0d3c",          // 화면 배경
        "wine-2": "#241047",      // 카드
        "wine-deep": "#1c0e3e",   // 잠긴 카드·서브
        "wine-soft": "#2a1a5c",   // 차트 셀 등 밝은 표면
        screen: "#1b0d3c",
        night: "#120726",
        "night-2": "#231052",
        "night-3": "#2c1668",
        "night-edge": "#0c0420",
        divider: "#2a2350",

        bone: "#F1EEF9",
        "bone-soft": "#cbb8f0",
        "bone-faint": "#9a8cd0",

        // 1차 강조 = 자수정 보라 (이름은 gold 유지). CTA 그라데이션은 흰색.
        gold: "#c9a8ff",
        "gold-bright": "#dcc8ff",
        "gold-soft": "#b794ff",
        "gold-grad-start": "#ffffff",
        "gold-grad-end": "#f1eaff",
        "gold-pale": "rgba(150, 90, 255, 0.16)",
        "gold-line": "rgba(180, 140, 255, 0.3)",

        // 자수정 (violet) — 코어 액센트
        violet: "#8A6BF2",
        "violet-strong": "#6541F2",
        "violet-text": "#B7A0F5",
        "violet-line": "#4A3A6E",
        "violet-pale": "rgba(138, 107, 242, 0.12)",

        seal: "#8b1e1e",
        "seal-dim": "#6e1818",

        paper: "#e8dfd0",
        "paper-warm": "#ede4d4",
        "paper-deep": "#d4c8af",
        brown: "#7d5a3a",

        kakao: "#FEE500",
        "kakao-text": "#2b2b2b",
        naver: "#03c75a",
        toss: "#3182f6",
        success: "#6FBE8B",
        "star-blue": "#4D8BFF",

        // 오행 (五行) — 자수정 디자인 팔레트
        "o-wood":  "#7fc8a0",
        "o-fire":  "#ff9a7a",
        "o-earth": "#e4c878",
        "o-metal": "#c8cdd4",
        "o-water": "#88a8e0",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 3px)",
        sm: "calc(var(--radius) - 5px)",
      },
      fontFamily: {
        // 본문·UI = Pretendard (또렷한 가독성)
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        // 제목·전통 = 명조 (Gowun Batang)
        serif: [
          "Gowun Batang",
          "Noto Serif KR",
          "Nanum Myeongjo",
          "serif",
        ],
        myeongjo: [
          "Gowun Batang",
          "Nanum Myeongjo",
          "Noto Serif KR",
          "serif",
        ],
        batang: [
          "Gowun Batang",
          "Noto Serif KR",
          "serif",
        ],
        // 감성 헤드라인·워드마크 = 붓글씨
        brush: [
          "Nanum Brush Script",
          "Gowun Batang",
          "cursive",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      letterSpacing: {
        wider: "0.1em",
        widest: "0.2em",
        "kr-tight": "0.04em",
        "kr-loose": "0.16em",
        "label": "0.25em",
        "mini": "0.4em",
      },
      boxShadow: {
        "gold-glow": "0 0 24px rgba(180, 140, 255, 0.25)",
        "gold-cta": "0 12px 26px rgba(120, 60, 240, 0.4)",
        "violet-cta": "0 8px 24px rgba(138, 107, 242, 0.35)",
        "violet-glow": "0 0 50px rgba(138, 107, 242, 0.45)",
        "card-float": "0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
        "kakao": "0 0 0 1px rgba(0,0,0,0.06), 0 6px 18px rgba(254, 229, 0, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
