import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Mystic Fashion",
  description: "Sign in to your Mystic Fashion account to track orders and manage your profile.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
