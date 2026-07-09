/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
        // Chế độ API client: "mock" (demo standalone) hoặc "real" (gọi Security Gateway)
        NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE || "mock",
    },
};

module.exports = nextConfig;
