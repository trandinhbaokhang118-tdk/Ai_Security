/** @type {import('next').NextConfig} */
const path = require("node:path");

const nextConfig = {
    reactStrictMode: true,
    // NODE_ENV đôi khi bị công cụ ngoài đặt giá trị không chuẩn; production build
    // vẫn phải dùng thư mục ổn định thay vì cache dev gắn PID.
    distDir: process.env.NEXT_DIST_DIR || (process.env.NEXT_PHASE === "phase-development-server" ? `.next-dev-${process.pid}` : ".next"),
    outputFileTracingRoot: path.resolve(__dirname, "../.."),
    env: {
        // Chế độ API client: "mock" (demo standalone) hoặc "real" (gọi Security Gateway)
        NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE || "real",
    },
};

module.exports = nextConfig;
