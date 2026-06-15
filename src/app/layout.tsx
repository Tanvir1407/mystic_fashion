import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals-storefront.css";
import Toaster from "@/components/Toaster";


const inter = Inter({ subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Mystic Fashion | Premium Jersey & Apparel",
  description: "Experience the luxury of premium jerseys and fashion apparel.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: '/favicon.ico?v=2' },
      { url: '/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png?v=2' }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${cormorant.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
