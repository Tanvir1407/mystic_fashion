/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },

    // ─── Image Configuration ───────────────────────────────────────────────────
    // Setting minimumCacheTTL to 0 ensures the Next.js image optimizer does NOT
    // hold cached versions indefinitely — newly uploaded images appear immediately
    // without needing to restart PM2.
    images: {
        minimumCacheTTL: 0,
        formats: ["image/avif", "image/webp"],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 64, 96, 128, 256, 384],
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
