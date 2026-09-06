/** @type {import('next').NextConfig} */
const nextConfig = {
    // Avatars only ever come from Google sign-in (lh3.googleusercontent.com);
    // "avatar.vercel.sh" was leftover config for a domain nothing in this app
    // requests. `domains` is also deprecated in favor of `remotePatterns`.
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "lh3.googleusercontent.com" },
        ],
    },
    // Drops the "X-Powered-By: Next.js" response header, which otherwise
    // hands attackers a free framework/version fingerprint for free.
    poweredByHeader: false,
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                    { key: "X-Frame-Options", value: "DENY" },
                ],
            },
        ];
    },
};

export default nextConfig;
