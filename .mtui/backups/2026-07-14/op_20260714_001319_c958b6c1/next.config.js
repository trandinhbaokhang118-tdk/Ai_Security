/** @type {import('next').NextConfig} */
const path = require("node:path");

const nextConfig = {
    reactStrictMode: true,
    // Tách cache dev và production để tránh Windows/antivirus khóa vendor chunks.
    distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === "development" ? ".next-dev" : ".next"),
    outputFileTracingRoot: path.resolve(__dirname, "../.."),
    env: {
        // Chế độ API client: "mock" (demo standalone) hoặc "real" (gọi Security Gateway)
        NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE || "mock",
    },
};

module.exports = nextConfig;
