/** @type {import('next').NextConfig} */
const path = require("node:path");
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

/** @param {string} phase */
module.exports = (phase) => ({
    reactStrictMode: true,
    // Tách cache của từng dev server để manifest/chunk không ghi đè lẫn nhau.
    // Production vẫn dùng thư mục .next ổn định.
    distDir: process.env.NEXT_DIST_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? `.next-dev-${process.pid}` : ".next"),
    outputFileTracingRoot: path.resolve(__dirname, "../.."),
    env: {
        // Chế độ API client: "mock" (demo standalone) hoặc "real" (gọi Security Gateway)
        NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE || "real",
    },
});
