import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
      },
      colors: {
        background:  "var(--background)",
        foreground:  "var(--foreground)",
        card: {
          DEFAULT:    "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT:    "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT:    "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT:    "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT:    "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT:    "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT:    "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border:  "var(--border)",
        input:   "var(--input)",
        ring:    "var(--ring)",
        glass: {
          bg:          "var(--glass-bg)",
          "bg-hover":  "var(--glass-bg-hover)",
          border:      "var(--glass-border)",
          "border-strong": "var(--glass-border-strong)",
          sidebar:     "var(--glass-sidebar-bg)",
          card:        "var(--glass-card-bg)",
          modal:       "var(--glass-modal-bg)",
        },
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT:            "var(--sidebar)",
          foreground:         "var(--sidebar-foreground)",
          primary:            "var(--sidebar-primary)",
          "primary-foreground":"var(--sidebar-primary-foreground)",
          accent:             "var(--sidebar-accent)",
          "accent-foreground":"var(--sidebar-accent-foreground)",
          border:             "var(--sidebar-border)",
          ring:               "var(--sidebar-ring)",
        },
      },
      backdropBlur: {
        glass:  "16px",
        "glass-heavy": "24px",
      },
      backgroundImage: {
        "glass-gradient": "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
        "primary-gradient": "linear-gradient(135deg, #6366f1, #4f46e5)",
        "scene-sky": "linear-gradient(180deg, #04021a 0%, #0a0535 25%, #0d0840 45%, #111560 65%, #0f2060 80%, #0a1a50 100%)",
      },
      boxShadow: {
        glass:     "0 4px 24px rgba(0, 0, 0, 0.30), inset 0 1px 0 rgba(255,255,255,0.10)",
        "glass-lg":"0 8px 40px rgba(0, 0, 0, 0.40), inset 0 1px 0 rgba(255,255,255,0.12)",
        primary:   "0 4px 20px rgba(99, 102, 241, 0.40)",
        "primary-lg":"0 8px 32px rgba(99, 102, 241, 0.50)",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.7" },
          "50%":      { opacity: "1.0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to:   { transform: "translateX(0)" },
        },
      },
      animation: {
        twinkle:  "twinkle 8s ease-in-out infinite alternate",
        "fade-in":"fade-in 0.3s ease-out",
        "slide-in":"slide-in 0.3s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;