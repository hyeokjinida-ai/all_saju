import type { Config } from "tailwindcss";

/* 명운록 디자인 시스템 — 다크 와인 + 골드 + 명조체
   디자인 토큰: src/app/globals.css :root 및 design_handoff_myeongunrok/README.md */
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
        border: "hsl(var(--border) / 0.4)", // 골드 라인 (자동 alpha)
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

        // ── 보일러플레이트 alias 재매핑 (Ollama 페이퍼화이트 → 명운록 와인/본/골드) ──
        // 기존 className 그대로 두고 색만 바꿔서 모든 페이지 자동 적용됨
        ink: "#f0e6d2",                          // was #000 — bone (다크 위 본문 텍스트)
        canvas: "#3a0d18",                       // was #fff — wine (페이지 배경)
        "surface-soft": "#4a0e1a",               // was #fafafa — wine-2 (살짝 더 밝은 표면)
        "surface-dark": "#0d0608",               // was #171717 — night (가장 어두운 배경)
        charcoal: "#d8cdb6",                     // was #525252 — 짙은 본 (서브 텍스트)
        body: "rgba(240, 230, 210, 0.72)",       // was #737373 — bone-soft (본문 회색 톤)
        mute: "rgba(240, 230, 210, 0.40)",       // was #a3a3a3 — bone-faint (희미한 텍스트)
        hairline: "rgba(212, 175, 106, 0.4)",    // was #e5e5e5 — gold-line (구분선)
        "hairline-strong": "#a88b53",            // was #d4d4d4 — gold-soft (강한 구분선)

        // ── 명운록 명시적 토큰 (직접 사용: bg-wine, text-gold 등) ──
        wine: "#3a0d18",
        "wine-2": "#4a0e1a",
        "wine-deep": "#2a0a12",
        "wine-soft": "#5a1822",
        night: "#0d0608",
        "night-2": "#1a0810",
        "night-3": "#2a0a14",
        "night-edge": "#050204",

        bone: "#f0e6d2",
        "bone-soft": "rgba(240, 230, 210, 0.72)",
        "bone-faint": "rgba(240, 230, 210, 0.40)",

        gold: "#d4af6a",
        "gold-bright": "#e8c878",
        "gold-soft": "#a88b53",
        "gold-pale": "rgba(212, 175, 106, 0.18)",
        "gold-line": "rgba(212, 175, 106, 0.4)",

        seal: "#8b1e1e",
        "seal-dim": "#6e1818",

        paper: "#e8dfd0",
        "paper-warm": "#ede4d4",
        "paper-deep": "#d4c8af",
        brown: "#7d5a3a",

        kakao: "#FEE500",
        "kakao-text": "#191919",

        // 오행 (五行)
        "o-wood":  "#4a6b3a",
        "o-fire":  "#8b1e1e",
        "o-earth": "#a8896b",
        "o-metal": "#c9b896",
        "o-water": "#1f2937",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // 기본 sans도 한국 명조계열로 (명운록 톤 통일)
        sans: [
          "Noto Serif KR",
          "Nanum Myeongjo",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "Noto Serif KR",
          "Nanum Myeongjo",
          "serif",
        ],
        myeongjo: [
          "Nanum Myeongjo",
          "Noto Serif KR",
          "serif",
        ],
        batang: [
          "Gowun Batang",
          "Noto Serif KR",
          "serif",
        ],
        brush: [
          "Ma Shan Zheng",
          "Nanum Myeongjo",
          "serif",
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
        "gold-glow": "0 0 24px rgba(212, 175, 106, 0.15)",
        "kakao": "0 0 0 1px rgba(0,0,0,0.06), 0 6px 18px rgba(254, 229, 0, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
