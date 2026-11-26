/** @type {import('tailwindcss').Config} */
const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: rgb("base"),
        surface: rgb("surface"),
        "surface-2": rgb("surface-2"),
        elevated: rgb("elevated"),
        line: rgb("line"),
        "line-strong": rgb("line-strong"),
        ink: rgb("text"),
        muted: rgb("muted"),
        dim: rgb("dim"),
        accent: {
          DEFAULT: rgb("accent"),
          soft: "rgb(var(--accent) / 0.1)",
          text: rgb("accent-text"),
        },
        info: {
          DEFAULT: rgb("info"),
          soft: "rgb(var(--info) / 0.1)",
        },
        warning: {
          DEFAULT: rgb("warning"),
          soft: "rgb(var(--warning) / 0.1)",
        },
        danger: {
          DEFAULT: rgb("danger"),
          soft: "rgb(var(--danger) / 0.1)",
        },
      },
      fontFamily: {
        sans: [
          '"Segoe UI Variable Text"',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Microsoft YaHei UI"',
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"Cascadia Code"',
          '"SF Mono"',
          "Consolas",
          '"Microsoft YaHei"',
          "monospace",
        ],
      },
      borderRadius: {
        panel: "14px",
      },
      boxShadow: {
        panel: "0 18px 48px -28px rgba(0, 0, 0, 0.8)",
        glow: "0 0 0 3px rgb(var(--accent) / 0.12)",
      },
    },
  },
  plugins: [],
};
