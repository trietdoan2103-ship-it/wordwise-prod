import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GameProvider } from "@/context/GameContext";
import { SessionProvider } from "@/context/SessionContext";
import BackgroundMusicPlayer from "@/components/layout/BackgroundMusicPlayer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wordwise — English Learning Adventure",
  description:
    "Wordwise là cuộc phiêu lưu học tiếng Anh dành cho học sinh trung học Việt Nam.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <SessionProvider>
          <GameProvider>
            {children}
            <BackgroundMusicPlayer />
          </GameProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
