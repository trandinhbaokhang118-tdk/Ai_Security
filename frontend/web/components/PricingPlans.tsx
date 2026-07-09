"use client";

/**
 * PricingPlans — phần tương tác của trang Pricing.
 *
 * Hiển thị công tắc chu kỳ thanh toán ([Theo tháng] | [Theo năm -20%]) và
 * render 3 thẻ gói (FREE / PRO ★ / TEAM/API) từ dữ liệu `PricingTier`.
 *
 * Đây là Client Component (cần trạng thái công tắc). Trang cha `app/pricing/page.tsx`
 * là Server Component tĩnh và truyền dữ liệu gói xuống qua props.
 *
 * Quy ước hiển thị giá:
 *   - priceMonthly === null  → "Liên hệ" (áp dụng cho TEAM/API)
 *   - priceMonthly === 0     → "0đ" (gói FREE)
 *   - Khi chọn "Theo năm": dùng `priceYearly` (đã tính -20%) làm giá mỗi tháng.
 *
 * _Requirements: 9.1, 9.2, 9.3, 9.4_
 */

import { useState } from "react";
import type { PricingTier } from "../lib/types";

export interface PricingPlansProps {
    /** Danh sách gói hiển thị (thứ tự FREE → PRO → TEAM). */
    tiers: PricingTier[];
}

/** Chu kỳ thanh toán được chọn. */
type BillingPeriod = "monthly" | "yearly";

/** Định dạng số tiền VND: "99.000đ". */
function formatVnd(amount: number): string {
    return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

/**
 * Tính nhãn giá hiển thị cho một gói theo chu kỳ thanh toán.
 *
 * - Giá null → "Liên hệ" (không có hậu tố).
 * - Giá 0 → "0đ".
 * - Ngược lại → "<giá>đ" kèm hậu tố "/tháng".
 */
function priceDisplay(
    tier: PricingTier,
    period: BillingPeriod,
): { amount: string; suffix: string | null } {
    const raw = period === "yearly" ? tier.priceYearly : tier.priceMonthly;

    if (raw === null) {
        return { amount: "Liên hệ", suffix: null };
    }
    if (raw === 0) {
        return { amount: "0đ", suffix: null };
    }
    return { amount: formatVnd(raw), suffix: "/tháng" };
}

export default function PricingPlans({ tiers }: PricingPlansProps) {
    const [period, setPeriod] = useState<BillingPeriod>("monthly");

    return (
        <div className="flex flex-col items-center">
            {/* Công tắc chu kỳ thanh toán */}
            <div
                role="group"
                aria-label="Chu kỳ thanh toán"
                className="mb-10 inline-flex rounded-full border border-neutral-200 bg-neutral-50 p-1"
            >
                <button
                    type="button"
                    onClick={() => setPeriod("monthly")}
                    aria-pressed={period === "monthly"}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${period === "monthly"
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-600 hover:text-neutral-900"
                        }`}
                >
                    Theo tháng
                </button>
                <button
                    type="button"
                    onClick={() => setPeriod("yearly")}
                    aria-pressed={period === "yearly"}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${period === "yearly"
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-600 hover:text-neutral-900"
                        }`}
                >
                    Theo năm
                    <span
                        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${period === "yearly"
                                ? "bg-white/20 text-white"
                                : "bg-risk-safe-bg text-risk-safe-fg"
                            }`}
                    >
                        -20%
                    </span>
                </button>
            </div>

            {/* Lưới 3 thẻ gói */}
            <div className="grid w-full max-w-5xl grid-cols-1 items-start gap-6 md:grid-cols-3">
                {tiers.map((tier) => {
                    const { amount, suffix } = priceDisplay(tier, period);

                    return (
                        <div
                            key={tier.id}
                            className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${tier.highlighted
                                    ? "border-neutral-900 shadow-md md:-mt-2 md:mb-2"
                                    : "border-neutral-200"
                                }`}
                        >
                            {/* Nhãn nổi bật cho gói highlighted */}
                            {tier.highlighted && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
                                    ★ Phổ biến
                                </span>
                            )}

                            {/* Tên gói */}
                            <h2 className="text-lg font-bold tracking-tight text-neutral-900">
                                {tier.name}
                            </h2>

                            {/* Giá */}
                            <div className="mt-3 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-neutral-900">
                                    {amount}
                                </span>
                                {suffix && (
                                    <span className="text-sm text-neutral-500">
                                        {suffix}
                                    </span>
                                )}
                            </div>
                            {period === "yearly" &&
                                tier.priceYearly !== null &&
                                tier.priceYearly > 0 && (
                                    <p className="mt-1 text-xs text-risk-safe">
                                        Đã tiết kiệm 20% khi trả theo năm
                                    </p>
                                )}

                            {/* Danh sách tính năng */}
                            <ul className="mt-6 flex flex-1 flex-col gap-3">
                                {tier.features.map((feature, index) => (
                                    <li
                                        key={index}
                                        className={`flex items-start gap-2 text-sm ${feature.included
                                                ? "text-neutral-700"
                                                : "text-neutral-400"
                                            }`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={
                                                feature.included
                                                    ? "text-risk-safe"
                                                    : "text-risk-danger"
                                            }
                                        >
                                            {feature.included ? "✓" : "✗"}
                                        </span>
                                        <span
                                            className={
                                                feature.included
                                                    ? ""
                                                    : "line-through"
                                            }
                                        >
                                            {feature.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <button
                                type="button"
                                className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${tier.highlighted
                                        ? "bg-neutral-900 text-white hover:bg-neutral-700"
                                        : "border border-neutral-300 text-neutral-900 hover:bg-neutral-100"
                                    }`}
                            >
                                {tier.ctaLabel}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
