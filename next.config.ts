import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withOutput = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    runtimeCaching: [
      {
        // Cache page navigations (HTML) with network-first strategy
        urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          networkTimeoutSeconds: 3,
        },
      },
      {
        // Cache static assets (JS, CSS) with stale-while-revalidate
        urlPattern: /\/_next\/static\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-assets-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
      {
        // Cache images with cache-first strategy
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        // Cache fonts with cache-first strategy
        urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'fonts-cache',
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      {
        // Cache API responses with network-first (for fresh data)
        urlPattern: /\/api\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60, // 5 minutes
          },
          networkTimeoutSeconds: 5,
        },
      },
    ],
  },
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
    if (process.env.NODE_ENV === "production") {
      return [
        {
          source: "/:path*",
          headers: [
            {
              key: "X-DNS-Prefetch-Control",
              value: "on",
            },
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
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
              value: "origin-when-cross-origin",
            },
            {
              key: "Content-Security-Policy",
              value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:;",
            },
          ],
        },
      ];
    }
    return [];
  },
};

export default withOutput(withPWA(nextConfig));
