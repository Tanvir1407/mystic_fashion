import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | Mystic Fashion",
  description: "Create a Mystic Fashion account to enjoy faster checkout and order tracking.",
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
