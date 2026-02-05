import path from 'node:path';
import { generateSW } from 'workbox-build';

async function buildSW() {
    console.log('Generating Service Worker...');

    const { count, size, warnings } = await generateSW({
        // Where to output the file
        swDest: path.join(process.cwd(), 'public/sw.js'),

        // Where to look for files to cache
        globDirectory: '.next',
        globPatterns: [
            // Cache static chunks (JS/CSS)
            'static/**/*.{js,css}',
            // Cache images if prioritized
            'static/media/**/*.{png,jpg,jpeg,svg,webp,ico}',
        ],
        // Ignore maps and middleware
        globIgnores: ['**/node_modules/**/*', '**/*.map', 'server/middleware*', 'server/**'],

        // Fix path prefix for Next.js static assets
        modifyURLPrefix: {
            'static/': '/_next/static/',
        },

        // PWA Config (Migrated from next.config.ts)
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,

        // Runtime Caching Strategies (Migrated from next.config.ts)
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
                // Explicitly targeting next/static if not covered by preconcache
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
    });

    if (warnings.length > 0) {
        console.warn('Service Worker Generation Warnings:', warnings);
    }

    console.log(`Generated Service Worker: ${count} files, ${size} bytes.`);
}

buildSW();
