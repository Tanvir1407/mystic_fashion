import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/app/admin/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/staff/**/*.{js,ts,jsx,tsx,mdx}",
    // Admin-only components
    "./src/components/CancelReasonModal.tsx",
    "./src/components/DeleteWarningModal.tsx",
    "./src/components/HoldReasonModal.tsx",
    "./src/components/StatusAlertModal.tsx",
    // Shared components (used in both portals)
    "./src/components/AdminPagination.tsx",
    "./src/components/CustomSelect.tsx",
    "./src/components/Toaster.tsx",
    "./src/components/UploadedImage.tsx",
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
