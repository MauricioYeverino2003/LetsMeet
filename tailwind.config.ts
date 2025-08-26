import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./pages/**/*.{ts,tsx,js,jsx}",   // if you ever use the Pages router
  ],
  theme: {
    extend: {
      colors: {
        // === semantic palette recreated from your Figma dump ===
        primary: "#030213",
        "primary-foreground": "#ffffff",               // oklch(1 0 0)
        secondary: "oklch(.95 .0058 264.53)",
        "secondary-foreground": "#030213",
        muted: "#ececf0",
        "muted-foreground": "#717182",
        card: "#ffffff",
        "card-foreground": "oklch(.145 0 0)",
        accent: "#e9ebef",
        "accent-foreground": "#030213",
        ring: "oklch(.708 0 0)",

        // helpful base tokens to match your old UI
        background: "#ffffff",
        foreground: "#030213",
        border: "#e5e7eb", // light gray border you used on cards/inputs
      },

      // Your dump only exposed a tiny radius var; keep Tailwind defaults and
      // add/override if your components expect specific sizes.
      borderRadius: {
        xs: "0.125rem",
        // md/lg/xl/2xl already provided by Tailwind, tweak here if you need.
      },

      // Optional: mirror your old shadow
      boxShadow: {
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
