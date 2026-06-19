import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | Mystic Fashion",
  description: "Reset your Mystic Fashion account password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
