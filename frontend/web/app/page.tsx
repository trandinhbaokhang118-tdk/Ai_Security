"use client";

/**
 * Trang Home (Landing) — `app/page.tsx`.
 *
 * Client Component vì phải nối (wire) luồng quét nhanh (`quickScan`) với quota
 * lấy từ `useAuth()` và Api_Client hiện hành. Cấu trúc trang bám sát wireframe
 * §1.2 (phiên bản mới):
 *
 *   1. <ScrollHero> — Hero "Scroll-driven Product Reveal" + ô quét nhanh + CTA.
 *   2. Khu vực kết quả quét nhanh: RiskBadge + danh sách lý do + EvidencePanel +
 *      CTA "Cài Extension" (khi thành công); hoặc thông báo lỗi validation/quota
 *      kèm CTA nâng cấp/cài extension (khi bị chặn).
 *   3. "3 TRỤ CỘT": Robust Risk Core 🧠 · Robustness Lab 🔬 · MCP Armor 🛡.
 *   4. "CÁCH HOẠT ĐỘNG (3 bước)": Nhập/duyệt → AI đánh giá + giải thích → Quyết định.
 *   5. "SỐ LIỆU TIN CẬY": F1-score · Latency p95 · Số URL đã quét · Uptime.
 *
 * Luồng quét nhanh tuân theo Sequence Diagram "Luồng 1" (design.md) và các bất
 * biến của `quickScan`: đầu vào rỗng → ValidationError (không gọi API, không đổi
 * quota); hết quota → QuotaError (chặn + CTA nâng cấp); thành công → hiển thị
 * RiskBadge + reasons + EvidencePanel + CTA "Cài Extension".
 *
 * _Requirements: 5.7, 6.1, 6.5_
 */

import Link from "next/link";
import { useCallback, useState } from "react";

import AdvancedSandboxPanel from "@/components/AdvancedSandboxPanel";
import EvidencePanel from "@/components/EvidencePanel";
import RiskBadge from "@/components/RiskBadge";
import SandboxPanel from "@/components/SandboxPanel";
import ScrollHero from "@/components/ScrollHero";
import { useAuth } from "@/context/AuthContext";
import { getApiClient } from "@/lib/api";
import { isAppError, looksLikeUrl, quickScan } from "@/lib/quick-scan";
import type { AppError, AssessResult, BrowserSandboxResult, SandboxResult } from "@/lib/types";

/** Đường dẫn cài Chrome Extension (placeholder — sẽ trỏ Web Store khi phát hành). */
const EXTENSION_URL = "#cai-extension";

function buildBrowserSandboxError(url: string, error: unknown): BrowserSandboxResult {
    return {
        ok: false,
        execution_status: "failed",
        url,
        final_url: "",
        status_code: null,
        page_title: "",
        isolation: {},
        canary: {
            enabled: true,
            mode: "dry_run",
            clone_email: "",
            fields_filled: 0,
            field_types: {},
            form_submissions_blocked: 0,
            exfiltration_blocked: false,
            notes: [],
        },
        network_events: [],
        browser_events: [],
        console_errors: [],
        elapsed_ms: 0,
        scan_steps: [
            {
                key: "browser_sandbox_request_failed",
                label: "Run advanced browser sandbox",
                status: "failed",
                detail: error instanceof Error ? error.message : String(error),
            },
        ],
        issues: [
            {
                code: "browser_sandbox_request_failed",
                severity: "high",
                category: "execution",
                message: "Khong goi duoc browser sandbox nang cao.",
                detail: error instanceof Error ? error.message : String(error),
            },
        ],
    };
}

// ---------------------------------------------------------------------------
// Dữ liệu tĩnh của các khối marketing (tiếng Việt, khớp wireframe §1.2)
// ---------------------------------------------------------------------------

interface Pillar {
    icon: string;
    title: string;
    description: string;
    ctaLabel: string;
    href: string;
}

/** 3 trụ cột sản phẩm. */
const PILLARS: Pillar[] = [
    {
        icon: "🧠",
        title: "Robust Risk Core",
        description:
            "Lõi đánh giá rủi ro đa phương thức (URL, email) với thang màu chuẩn và bằng chứng SHAP — luôn kèm lý do.",
        ctaLabel: "Tìm hiểu",
        href: "/about",
    },
    {
        icon: "🔬",
        title: "Robustness Lab",
        description:
            "Kiểm thử đối kháng (homoglyph, chèn ký tự, né tránh) để mô hình vững trước tấn công thực tế.",
        ctaLabel: "Xem kết quả",
        href: "/about",
    },
    {
        icon: "🛡",
        title: "MCP Armor",
        description:
            "Lớp giáp cho AI agent qua MCP endpoint: kiểm tra độ tin cậy trước khi agent hành động thay bạn.",
        ctaLabel: "Docs cho dev",
        href: "/pricing",
    },
];

interface Step {
    index: number;
    title: string;
    description: string;
}

/** Cách hoạt động — 3 bước. */
const STEPS: Step[] = [
    {
        index: 1,
        title: "Nhập / duyệt",
        description: "Dán URL hoặc nội dung email — hoặc để Extension bắt link khi bạn duyệt web.",
    },
    {
        index: 2,
        title: "AI đánh giá + giải thích",
        description: "Mô hình chấm điểm rủi ro và trình bày bằng chứng SHAP kèm giải thích tiếng Việt.",
    },
    {
        index: 3,
        title: "Quyết định",
        description: "Bạn (hoặc AI agent) quyết định tiếp tục, thận trọng, hay chặn — dựa trên vì sao rõ ràng.",
    },
];

interface TrustMetric {
    label: string;
    value: string;
}

/** Số liệu tin cậy (giá trị placeholder cho bản demo). */
const TRUST_METRICS: TrustMetric[] = [
    { label: "F1-score", value: "0.94" },
    { label: "Latency p95", value: "180ms" },
    { label: "Số URL đã quét", value: "1.2M+" },
    { label: "Uptime", value: "99.9%" },
];

// ---------------------------------------------------------------------------
// Component trang Home
// ---------------------------------------------------------------------------

export default function HomePage() {
    const { quota } = useAuth();

    // Trạng thái luồng quét nhanh.
    const [result, setResult] = useState<AssessResult | null>(null);
    const [error, setError] = useState<AppError | null>(null);
    const [loading, setLoading] = useState(false);
    const [sandboxResult, setSandboxResult] = useState<SandboxResult | null>(null);
    const [sandboxLoading, setSandboxLoading] = useState(false);
    const [browserSandboxResult, setBrowserSandboxResult] =
        useState<BrowserSandboxResult | null>(null);
    const [browserSandboxLoading, setBrowserSandboxLoading] = useState(false);

    /**
     * Xử lý quét nhanh từ ô nhập của Hero (Luồng 1).
     *
     * Ủy quyền toàn bộ bất biến (validation/quota/modality/tiêu thụ quota) cho
     * `quickScan`; tại đây chỉ phân nhánh hiển thị kết quả hoặc lỗi.
     */
    const handleQuickScan = useCallback(
        async (input: string) => {
            setLoading(true);
            setError(null);
            setResult(null);
            setSandboxResult(null);
            setBrowserSandboxResult(null);
            setSandboxLoading(false);
            setBrowserSandboxLoading(false);
            try {
                const api = getApiClient();
                const trimmed = input.trim();
                const outcome = await quickScan(trimmed, quota, api);
                if (isAppError(outcome)) {
                    setError(outcome);
                } else {
                    setResult(outcome);
                    setLoading(false);
                    if (looksLikeUrl(trimmed)) {
                        setSandboxLoading(true);
                        setBrowserSandboxLoading(true);
                        try {
                            const [httpSandbox, browserSandbox] = await Promise.allSettled([
                                api.sandboxUrl(trimmed),
                                api.browserSandboxUrl(trimmed),
                            ]);
                            if (httpSandbox.status === "fulfilled") {
                                setSandboxResult(httpSandbox.value);
                            }
                            if (browserSandbox.status === "fulfilled") {
                                setBrowserSandboxResult(browserSandbox.value);
                            } else {
                                setBrowserSandboxResult(
                                    buildBrowserSandboxError(trimmed, browserSandbox.reason),
                                );
                            }
                        } finally {
                            setSandboxLoading(false);
                            setBrowserSandboxLoading(false);
                        }
                    }
                }
            } catch {
                setError({
                    error: "unknown",
                    message: "Có lỗi xảy ra khi quét. Vui lòng thử lại.",
                });
            } finally {
                setLoading(false);
            }
        },
        [quota],
    );

    const hasOutput =
        loading ||
        error !== null ||
        result !== null ||
        sandboxLoading ||
        browserSandboxLoading;

    return (
        <main className="flex min-h-screen flex-col">
            {/* Tiêu đề thương hiệu cho SEO/trợ năng (ẩn khỏi giao diện). */}
            <h1 className="sr-only">
                AI Security Armor — Lá chắn an ninh cho quy trình AI
            </h1>

            {/* 1. HERO — Scroll-driven Product Reveal */}
            <ScrollHero onQuickScan={handleQuickScan} />

            {/* 2. KẾT QUẢ QUÉT NHANH */}
            {hasOutput && (
                <section
                    id="ket-qua-quet-nhanh"
                    aria-label="Kết quả quét nhanh"
                    aria-live="polite"
                    className="mx-auto w-full max-w-3xl scroll-mt-24 px-6 py-12"
                >
                    <h2 className="mb-4 text-lg font-semibold text-neutral-900">
                        Kết quả quét nhanh
                    </h2>

                    {/* Đang xử lý */}
                    {loading && (
                        <p className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
                            Đang đánh giá rủi ro…
                        </p>
                    )}

                    {/* Lỗi validation / quota / khác */}
                    {!loading && error !== null && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-medium text-amber-900">
                                {error.message}
                            </p>
                            {error.error === "quota" && (
                                <div className="mt-3 flex flex-wrap gap-3">
                                    <Link
                                        href="/pricing"
                                        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                                    >
                                        Nâng cấp gói
                                    </Link>
                                    <a
                                        href={EXTENSION_URL}
                                        className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100"
                                    >
                                        ▶ Cài Extension
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Thành công: RiskBadge + reasons + EvidencePanel + CTA */}
                    {!loading && result !== null && (
                        <div className="flex flex-col gap-4 border border-neutral-200 bg-white p-5">
                            <div className="flex items-center gap-3">
                                <RiskBadge
                                    score={result.score}
                                    size="lg"
                                    showScore
                                    showLabel
                                />
                                <span className="text-sm text-neutral-500">
                                    Độ tin cậy:{" "}
                                    {Math.round(result.confidence * 100)}%
                                </span>
                            </div>

                            {/* Danh sách lý do chính */}
                            {result.reasons.length > 0 && (
                                <div>
                                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                                        Lý do chính
                                    </h3>
                                    <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-800">
                                        {result.reasons.map((reason, index) => (
                                            <li key={index}>{reason}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Bằng chứng SHAP + giải thích */}
                            <EvidencePanel
                                evidence={result.evidence}
                                explanation={result.explanation}
                            />

                            {/* CTA "Cài Extension" (Requirement 6.5) */}
                            <div>
                                <a
                                    href={EXTENSION_URL}
                                    className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
                                >
                                    ▶ Cài Extension
                                </a>
                            </div>
                        </div>
                    )}

                    <div className={result ? "mt-4" : ""}>
                        <SandboxPanel result={sandboxResult} loading={sandboxLoading} />
                    </div>
                    <div className={sandboxResult || sandboxLoading ? "mt-4" : ""}>
                        <AdvancedSandboxPanel
                            result={browserSandboxResult}
                            loading={browserSandboxLoading}
                        />
                    </div>
                </section>
            )}

            {/* 3. BA TRỤ CỘT */}
            <section
                aria-label="Ba trụ cột sản phẩm"
                className="mx-auto w-full max-w-6xl px-6 py-16"
            >
                <h2 className="mb-8 text-center text-2xl font-bold text-neutral-900">
                    3 trụ cột
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {PILLARS.map((pillar) => (
                        <article
                            key={pillar.title}
                            className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6"
                        >
                            <span
                                className="text-3xl"
                                aria-hidden="true"
                            >
                                {pillar.icon}
                            </span>
                            <h3 className="mt-3 text-lg font-semibold text-neutral-900">
                                {pillar.title}
                            </h3>
                            <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600">
                                {pillar.description}
                            </p>
                            <Link
                                href={pillar.href}
                                className="mt-4 inline-flex w-fit items-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100"
                            >
                                {pillar.ctaLabel}
                            </Link>
                        </article>
                    ))}
                </div>
            </section>

            {/* 4. CÁCH HOẠT ĐỘNG (3 bước) */}
            <section
                aria-label="Cách hoạt động"
                className="bg-neutral-50 py-16"
            >
                <div className="mx-auto w-full max-w-5xl px-6">
                    <h2 className="mb-8 text-center text-2xl font-bold text-neutral-900">
                        Cách hoạt động
                    </h2>
                    <ol className="grid gap-6 sm:grid-cols-3">
                        {STEPS.map((step) => (
                            <li
                                key={step.index}
                                className="flex flex-col items-center rounded-xl bg-white p-6 text-center"
                            >
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-base font-bold text-white">
                                    {step.index}
                                </span>
                                <h3 className="mt-3 text-base font-semibold text-neutral-900">
                                    {step.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                                    {step.description}
                                </p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* 5. SỐ LIỆU TIN CẬY */}
            <section
                aria-label="Số liệu tin cậy"
                className="mx-auto w-full max-w-6xl px-6 py-16"
            >
                <h2 className="mb-8 text-center text-2xl font-bold text-neutral-900">
                    Số liệu tin cậy
                </h2>
                <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                    {TRUST_METRICS.map((metric) => (
                        <div
                            key={metric.label}
                            className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-6 text-center"
                        >
                            <dt className="order-2 mt-2 text-sm text-neutral-500">
                                {metric.label}
                            </dt>
                            <dd className="order-1 text-3xl font-bold text-neutral-900">
                                {metric.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </section>
        </main>
    );
}
