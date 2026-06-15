import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/app/page.tsx",
    "./src/app/layout.tsx",
    "./src/app/not-found.tsx",
    "./src/app/about/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/account/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/auth/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/checkout/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/contact/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/faq/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/privacy/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/product/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/products/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/search/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/staff/login/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/terms/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/track/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: '0.75rem',
      screens: {
        ms: '320px',
        ml: '375px',
        mm: '425px',
        sm: '540px',
        md: '720px',
        lg: '960px',
        xl: '1140px',
        '2xl': '1320px',
      },
    },
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#800020",
        gold: "#FFD700",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "serif"],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
