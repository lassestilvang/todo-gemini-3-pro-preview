import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MainLayout } from "@/components/layout/MainLayout";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Todo Gemini",
  description: "AI-powered daily task planner",
  manifest: "/manifest.json",
  themeColor: "#7c3aed",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Todo Gemini",
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
};

import { PwaRegister } from "@/components/PwaRegister";
import { LevelUpWatcher } from "@/components/gamification/LevelUpWatcher";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <PwaRegister />
        <LevelUpWatcher />
        <MainLayout>{children}</MainLayout>
        <Toaster />
      </body>
    </html>
  );
}
