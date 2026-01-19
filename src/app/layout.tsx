import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="vi" suppressHydrationWarning>
      <body className="bg-hex-pattern min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  );
}
