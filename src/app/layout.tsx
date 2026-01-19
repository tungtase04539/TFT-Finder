import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Optimize font loading with next/font
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TFT Finder - Tìm Trận Đấu Trường Chân Lý",
  description:
    "Tìm đủ 8 người để chơi custom game Đấu Trường Chân Lý cùng nhau",
  keywords: [
    "TFT",
    "Teamfight Tactics",
    "Đấu Trường Chân Lý",
    "8 người",
    "custom game",
    "matchmaking",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={inter.variable}>
      <body className="bg-hex-pattern min-h-screen font-sans" suppressHydrationWarning>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
