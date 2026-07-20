import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0E0F13",
          secondary: "#12141A",
        },
        accent: {
          DEFAULT: "#47C2FF",
          blue: "#1E6BFF",
        },
        gold: "#D6B25E",
        success: "#3CE37D",
        warning: "#FFC857",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        mega:    ["clamp(2.75rem, 8.5vw, 7.5rem)", { lineHeight: "0.98", letterSpacing: "-0.045em" }],
        hero:    ["clamp(2rem, 5vw, 4.75rem)",     { lineHeight: "1.0",  letterSpacing: "-0.035em" }],
        chapter: ["clamp(1.85rem, 4.2vw, 3.75rem)",{ lineHeight: "1.04", letterSpacing: "-0.04em" }],
        display: ["clamp(1.15rem, 2.4vw, 2rem)",   { lineHeight: "1.2",  letterSpacing: "-0.02em" }],
      },
      backdropBlur: {
        xs: "2px",
        "2xl": "40px",
      },
      boxShadow: {
        card:        "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px -8px rgba(0,0,0,0.4)",
        "card-hover":"inset 0 1px 0 rgba(255,255,255,0.1), 0 20px 60px -20px rgba(0,0,0,0.5), 0 0 30px -10px rgba(0,212,255,0.12)",
        btn:         "inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 24px -8px rgba(255,255,255,0.15), 0 2px 8px -2px rgba(0,0,0,0.2)",
        "btn-hover": "inset 0 1px 0 rgba(255,255,255,0.4), 0 12px 32px -8px rgba(255,255,255,0.25), 0 4px 12px -2px rgba(0,0,0,0.3)",
        "glow-accent":"0 0 24px rgba(0,212,255,0.3)",
        "glow-gold":  "0 0 24px rgba(214,178,94,0.3)",
        cyber:       "0 0 20px rgba(0,212,255,0.08), 0 0 40px rgba(0,212,255,0.04)",
        "cyber-strong":"0 0 30px rgba(0,212,255,0.15), 0 0 60px rgba(0,212,255,0.08)",
      },
      animation: {
        "float-slow":  "float 8s ease-in-out infinite",
        "shimmer":     "shimmer 3s linear infinite",
        "pulse-glow":  "pulseGlow 4s ease-in-out infinite",
        "grain-shift": "grainShift 8s steps(1) infinite",
        "status-pulse":"statusPulse 2.4s ease-in-out infinite",
        "pulse-ring":  "pulseRing 2s ease-out infinite",
        "count-up":    "countUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGlow: {
          "0%,100%": { opacity: "0.35" },
          "50%":     { opacity: "0.85" },
        },
        grainShift: {
          "0%":   { transform: "translate(0,0)" },
          "20%":  { transform: "translate(-2%,-3%)" },
          "40%":  { transform: "translate(3%,1%)" },
          "60%":  { transform: "translate(-1%,4%)" },
          "80%":  { transform: "translate(4%,-2%)" },
          "100%": { transform: "translate(0,0)" },
        },
        statusPulse: {
          "0%,100%": { opacity: "0.4", transform: "scale(1)" },
          "50%":     { opacity: "1", transform: "scale(1.1)" },
        },
        pulseRing: {
          "0%":   { boxShadow: "0 0 0 0 rgba(0, 212, 255, 0.15)" },
          "70%":  { boxShadow: "0 0 0 8px rgba(0, 212, 255, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(0, 212, 255, 0)" },
        },
        countUp: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      transitionTimingFunction: {
        lux: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        400: "400ms",
        600: "600ms",
      },
    },
  },
  plugins: [],
};

export default config;
