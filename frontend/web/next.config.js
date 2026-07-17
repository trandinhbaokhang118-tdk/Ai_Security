/** @type {import('next').NextConfig} */
const path = require("node:path");
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

/** @param {string} phase */
const createNextConfig = (phase) => ({
    reactStrictMode: true,
    // Keep development artifacts separate from the production build. A stable
    // dev directory also prevents Next from rewriting tsconfig.json on every run.
    distDir: process.env.NEXT_DIST_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"),
    outputFileTracingRoot: path.resolve(__dirname, "../.."),
    env: {
        // Chế độ API client: "mock" (demo standalone) hoặc "real" (gọi Security Gateway)
        NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE || "real",
    },
});

module.exports = createNextConfig;
