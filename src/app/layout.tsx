import type { Metadata } from "next";
import "./globals.css";
import { Cairo, Inter, JetBrains_Mono } from "next/font/google";
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "نواة | إدارة ورشة الصيانة",
  description: "نظام إدارة ورشة صيانة الهواتف المحمولة",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} ${inter.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
