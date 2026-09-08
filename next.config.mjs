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
        // No client-side code in this app calls out to any host besides
        // itself and Google avatar images (lh3.googleusercontent.com, see
        // `images.remotePatterns` above) — confirmed by grepping app/,
        // components/, lib/, and constants/ for hardcoded external URLs.
        // Google/GitHub OAuth is a full-page redirect handled server-side by
        // better-auth, not a client fetch, so it needs no connect-src entry.
        // 'unsafe-inline' on script-src is required because Next's App
        // Router injects small inline hydration/streaming scripts and this
        // project doesn't run CSP-nonce middleware; still meaningfully
        // narrows the attack surface vs. no policy (blocks external script
        // injection, framing, plugin/object embeds, and multi-origin form
        // submission).
        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https://lh3.googleusercontent.com",
            "font-src 'self' data:",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
        ].join("; ");

        return [
            {
                source: "/:path*",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "Content-Security-Policy", value: csp },
                    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
                ],
            },
        ];
    },
};

export default nextConfig;
