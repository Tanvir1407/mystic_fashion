/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },

    // ─── Image Configuration ───────────────────────────────────────────────────
    // Uploaded images are stored in public/uploads/ at runtime on the VPS.
    // Setting minimumCacheTTL to 0 ensures Next.js image optimizer does NOT cache
    // optimized images indefinitely — new uploads appear immediately without
    // restarting PM2 / the Next.js server.
    images: {
        minimumCacheTTL: 0,
        // Allow images served from the same origin (local uploads)
        remotePatterns: [],
        // Allow local uploaded images via /uploads/* path
        localPatterns: [
            {
                pathname: '/uploads/**',
                search: '',
            },
        ],
    },

    // ─── Custom HTTP Headers ───────────────────────────────────────────────────
    // Prevent browsers from caching uploaded images, so new product images
    // show up immediately without a hard refresh.
    async headers() {
        return [
            {
                source: '/uploads/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                    {
                        key: 'Pragma',
                        value: 'no-cache',
                    },
                    {
                        key: 'Expires',
                        value: '0',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
