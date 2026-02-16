import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withOutput = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
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
  reactCompiler: false,
  turbopack: {
    root: __dirname,
  },

  env: {
    // Make the dynamic redirect URI available to the WorkOS SDK
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: getWorkOSRedirectURI(),
  },
  async headers() {
    const headers = [
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
      {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), geolocation=(), browsing-topics=()",
      },
    ];

    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
      headers.push({
        key: "Content-Security-Policy",
        value: "default-src 'self'; script-src 'self' 'sha256-d7OUjcahyX/tkd5XCsTfBJOwC4nLY0fH0sFPd3gTr/w='; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://cdn.jsdelivr.net https://*.googleusercontent.com https://avatars.githubusercontent.com https://*.workos.com; font-src 'self' data:; connect-src 'self' https://*.workos.com;",
      });
    }

    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default withOutput(nextConfig);
