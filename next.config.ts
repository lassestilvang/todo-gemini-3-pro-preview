import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

// Dynamic WorkOS redirect URI for Vercel preview deployments
// Priority: NEXT_PUBLIC_WORKOS_REDIRECT_URI > VERCEL_URL > localhost fallback
function getWorkOSRedirectURI(): string {
  if (process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/auth/callback`;
  }
  return "http://localhost:3000/auth/callback";
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  env: {
    // Make the dynamic redirect URI available to the WorkOS SDK
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: getWorkOSRedirectURI(),
  },
};

export default withPWA(nextConfig);
