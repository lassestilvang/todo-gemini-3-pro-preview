import type { Metadata, Viewport } from "next";
import { Inter, Quicksand, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { MainLayout } from "@/components/layout/MainLayout";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-quicksand" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "Todo Gemini",
  description: "AI-powered daily task planner",
  manifest: "/manifest.json",
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

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { PwaRegister } from "@/components/PwaRegister";
import { LevelUpWatcher } from "@/components/gamification/LevelUpWatcher";
import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${quicksand.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={["light", "dark", "glassmorphism", "neubrutalism", "minimalist"]}
        >
          <PwaRegister />
          <LevelUpWatcher />
          <MainLayout>{children}</MainLayout>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
