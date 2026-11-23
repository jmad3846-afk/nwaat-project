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

// Applies the saved theme before first paint so there is no flash of the
// wrong colour scheme while React hydrates.
const themeInit = `try{var t=localStorage.getItem("nwaat-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}`;

export const metadata: Metadata = {
  title: "نواة | إدارة ورشة الصيانة",
  description: "نظام إدارة ورشة صيانة الهواتف المحمولة",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${cairo.variable} ${inter.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
