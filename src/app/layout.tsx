import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Quicksand, Space_Grotesk, Orbitron, Sora } from "next/font/google";
import "./globals.css";
import { MainLayout } from "@/components/layout/MainLayout";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

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
  userScalable: true,
  viewportFit: "cover",
};

import { PwaRegister } from "@/components/PwaRegister";
import { LevelUpWatcher } from "@/components/gamification/LevelUpWatcher";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { OnboardingProvider } from "@/components/providers/OnboardingProvider";
import { validateEnv } from "@/lib/env";
import { WebVitals } from "@/components/WebVitals";
import { AVAILABLE_THEMES } from "@/lib/themes";
import { ZenModeProvider } from "@/components/providers/ZenModeProvider";
import { LazyMotionProvider } from "@/components/providers/LazyMotionProvider";
import { PerformanceProvider } from "@/components/providers/PerformanceContext";
import { SyncProvider } from "@/components/providers/sync-provider";

// Validate env vars at startup
validateEnv();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${quicksand.variable} ${spaceGrotesk.variable} ${orbitron.variable} ${sora.variable}`}
    >
      <head>
        {/*process.env.NODE_ENV === "development" && (
          <>
            <Script
              src="https://unpkg.com/react-grab/dist/index.global.js"
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
          </>
        )*/}
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <QueryProvider>
          <SyncProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
              themes={[...AVAILABLE_THEMES].filter(t => t !== "system")}
            >
              <ZenModeProvider>
                <PerformanceProvider>
                  <LazyMotionProvider>
                    <OnboardingProvider>
                      <PwaRegister />
                      <WebVitals />
                      <LevelUpWatcher />
                      <MainLayout>{children}</MainLayout>
                      <Toaster />
                    </OnboardingProvider>
                  </LazyMotionProvider>
                </PerformanceProvider>
              </ZenModeProvider>
            </ThemeProvider>
          </SyncProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
