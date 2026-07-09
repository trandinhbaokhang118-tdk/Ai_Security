"use client";

/**
 * Account Billing — trang "Gói & Thanh toán".
 *
 * Trách nhiệm (theo requirements.md — Requirement 13; UI_wireframe §1.6 —
 * "GÓI HIỆN TẠI: { PRO } hạn đến 02/08/2026 / [ Nâng cấp ] [ Hủy gia hạn ]"):
 *   - Hiển thị tên gói hiện tại và ngày gia hạn nếu có (Requirement 13.1).
 *   - Hiển thị giới hạn quét hằng ngày theo gói: Free = 50/ngày; Pro/Team = vô
 *     hạn → "Không giới hạn" (Requirement 13.2).
 *   - Hai nút hành động "Nâng cấp" và "Hủy gia hạn" (stub/mock, chưa nối API).
 *   - Phòng thủ: khi chưa đăng nhập (session/plan null) → hiển thị màn hình gọn
 *     yêu cầu đăng nhập (dù AccountLayout đã guard, vẫn phòng khi render trực
 *     tiếp).
 *
 * Là Client Component vì cần `useAuth()` để đọc gói hiện tại.
 *
 * _Requirements: 13.1, 13.2_
 */

import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
import { getLimitForPlan } from "@/lib/quota";
import type { PlanInfo } from "@/lib/types";

/**
 * Định dạng giới hạn quét hằng ngày để hiển thị.
 *
 * Ưu tiên dùng `plan.dailyScanLimit` (nguồn từ session); nếu không hữu hạn/không
 * hợp lệ thì suy ra từ gói qua `getLimitForPlan`. Giới hạn vô hạn → "Không giới
 * hạn"; hữu hạn → "X/ngày".
 */
function formatDailyLimit(plan: PlanInfo): string {
    const raw = plan.dailyScanLimit;
    const limit =
        typeof raw === "number" && Number.isFinite(raw) && raw >= 0
            ? raw
            : getLimitForPlan(plan.tier);

    if (!Number.isFinite(limit)) {
        return "Không giới hạn";
    }
    return `${limit}/ngày`;
}

export default function AccountBillingPage(): JSX.Element {
    const { session, plan } = useAuth();

    // Phòng thủ: chưa đăng nhập → màn hình gọn yêu cầu đăng nhập.
    // (AccountLayout đã guard, đây là lớp bảo vệ bổ sung.)
    if (session === null || plan === null) {
        return (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
                <div className="rounded-full bg-neutral-100 p-4 text-3xl">
                    🔒
                </div>
                <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                    Bạn cần đăng nhập để xem Gói & Thanh toán
                </h1>
                <Link
                    href="/"
                    className="mt-1 inline-flex items-center justify-center rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
                >
                    Về Trang chủ để đăng nhập
                </Link>
            </div>
        );
    }

    const dailyLimit = formatDailyLimit(plan);

    return (
        <div className="flex flex-col gap-8">
            {/* Tiêu đề trang */}
            <header>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                    Gói & Thanh toán
                </h1>
                <p className="mt-1 text-sm text-neutral-600">
                    Xem gói hiện tại, ngày gia hạn và giới hạn quét hằng ngày của
                    bạn.
                </p>
            </header>

            {/* Thẻ gói hiện tại (Requirement 13.1, 13.2) */}
            <section className="rounded-xl border border-neutral-200 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                            Gói hiện tại
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                            <span className="inline-flex items-center rounded-lg bg-neutral-900 px-3 py-1 text-sm font-semibold text-white">
                                {plan.label}
                            </span>
                            {plan.renewsAt ? (
                                <span className="text-sm text-neutral-600">
                                    Hạn đến{" "}
                                    <span className="font-medium text-neutral-900">
                                        {plan.renewsAt}
                                    </span>
                                </span>
                            ) : (
                                <span className="text-sm text-neutral-500">
                                    Không có ngày gia hạn
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Giới hạn quét hằng ngày (Requirement 13.2) */}
                <dl className="mt-6 border-t border-neutral-100 pt-4">
                    <div className="flex items-center justify-between">
                        <dt className="text-sm text-neutral-600">
                            Giới hạn quét hằng ngày
                        </dt>
                        <dd className="text-sm font-semibold text-neutral-900">
                            {dailyLimit}
                        </dd>
                    </div>
                </dl>

                {/* Hành động (stub/mock — chưa nối cổng thanh toán) */}
                <div className="mt-6 flex flex-wrap gap-3">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
                    >
                        Nâng cấp
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                        Hủy gia hạn
                    </button>
                </div>
            </section>

            {/* Gợi ý xem bảng giá đầy đủ */}
            <p className="text-sm text-neutral-500">
                Muốn xem chi tiết quyền lợi từng gói?{" "}
                <Link
                    href="/pricing"
                    className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
                >
                    Xem bảng giá
                </Link>
                .
            </p>
        </div>
    );
}
