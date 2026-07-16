/**
 * Trang Pricing — so sánh các gói FREE / PRO / TEAM/API.
 *
 * Server Component tĩnh (tối ưu SEO): định nghĩa dữ liệu `PricingTier` và
 * render tiêu đề + phần tương tác `PricingPlans` (công tắc tháng/năm + 3 thẻ)
 * cùng khu vực FAQ. Nội dung tiếng Việt, khớp wireframe §1.3.
 *
 * Quy ước giá:
 *   - FREE: priceMonthly = 0 → "0đ".
 *   - PRO: priceMonthly = 99.000đ/tháng; priceYearly = 79.000đ (đã giảm 20%,
 *     hiển thị như giá mỗi tháng khi trả theo năm).
 *   - TEAM/API: priceMonthly/Yearly = null → "Liên hệ".
 *
 * _Requirements: 9.1, 9.2, 9.3, 9.4_
 */

import type { Metadata } from "next";
import type { PricingTier } from "../../lib/types";
import PricingPlans from "../../components/PricingPlans";

export const metadata: Metadata = {
    title: "Bảng giá — AI Security Armor",
    description:
        "Chọn gói phù hợp: FREE để thử nhanh, PRO cho cá nhân dùng thật, TEAM/API cho đội nhóm và tích hợp MCP.",
};

/** Giá PRO theo tháng (đồng). */
const PRO_MONTHLY = 99_000;
/** Giá PRO khi trả theo năm — quy về mỗi tháng, đã giảm 20%. */
const PRO_YEARLY = Math.round((PRO_MONTHLY * 0.8) / 1000) * 1000; // 79.000đ

/**
 * Dữ liệu 3 gói theo wireframe §1.3.
 * Features dùng ✓ (included=true) / ✗ (included=false).
 */
const PRICING_TIERS: PricingTier[] = [
    {
        id: "free",
        name: "FREE",
        priceMonthly: 0,
        priceYearly: 0,
        highlighted: false,
        ctaLabel: "Bắt đầu",
        features: [
            { label: "50 scan/ngày", included: true },
            { label: "Extension", included: true },
            { label: "Chat cơ bản", included: true },
            { label: "Email scan", included: false },
            { label: "MCP", included: false },
        ],
    },
    {
        id: "pro",
        name: "PRO",
        priceMonthly: PRO_MONTHLY,
        priceYearly: PRO_YEARLY,
        highlighted: true,
        ctaLabel: "Dùng thử 7 ngày",
        features: [
            { label: "Không giới hạn", included: true },
            { label: "Extension + App", included: true },
            { label: "Chat + giải thích", included: true },
            { label: "Email scan", included: true },
            { label: "MCP", included: false },
        ],
    },
    {
        id: "team",
        name: "TEAM / API",
        priceMonthly: null,
        priceYearly: null,
        highlighted: false,
        ctaLabel: "Liên hệ",
        features: [
            { label: "Tất cả Pro", included: true },
            { label: "MCP endpoint", included: true },
            { label: "API key", included: true },
            { label: "SLA + support", included: true },
            { label: "Dashboard", included: true },
        ],
    },
];

/** Mục FAQ theo wireframe §1.3. */
const FAQ_ITEMS: { question: string; answer: string }[] = [
    {
        question: "Dữ liệu của tôi có bị lưu không?",
        answer:
            "Chúng tôi chỉ xử lý nội dung bạn gửi để đánh giá rủi ro và không dùng cho mục đích khác. Lịch sử scan được lưu trong tài khoản của bạn và có thể xóa bất cứ lúc nào. Ở gói FREE, dữ liệu được xử lý tạm thời để trả kết quả.",
    },
    {
        question: "MCP endpoint dùng với ChatGPT/Claude thế nào?",
        answer:
            "Gói TEAM/API cung cấp một MCP endpoint và API key. Bạn khai báo endpoint này trong cấu hình MCP của trợ lý (ChatGPT, Claude...) để agent tự gọi kiểm tra độ tin cậy URL/email trước khi hành động.",
    },
    {
        question: "Có hỗ trợ tiếng Việt không?",
        answer:
            "Có. Toàn bộ giao diện, lý do đánh giá và phần giải thích đều bằng tiếng Việt. Mô hình được huấn luyện để hiểu ngữ cảnh phishing và thư lừa đảo tiếng Việt.",
    },
];

export default function PricingPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-16">
            {/* Tiêu đề */}
            <header className="mb-10 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                    Chọn gói phù hợp với bạn
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-neutral-600">
                    Thử nhanh miễn phí, nâng cấp khi cần dùng thật. Mọi gói đều đi kèm
                    thang màu rủi ro nhất quán và bằng chứng minh bạch.
                </p>
            </header>

            {/* Công tắc chu kỳ + 3 thẻ gói (Client Component) */}
            <PricingPlans tiers={PRICING_TIERS} />

            {/* FAQ */}
            <section className="mx-auto mt-20 max-w-3xl">
                <h2 className="mb-6 text-center text-2xl font-bold tracking-tight text-neutral-900">
                    Câu hỏi thường gặp
                </h2>
                <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
                    {FAQ_ITEMS.map((item, index) => (
                        <details key={index} className="group px-5 py-4">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-neutral-900">
                                <span className="flex items-center gap-2">
                                    <span
                                        aria-hidden="true"
                                        className="text-neutral-400 transition-transform group-open:rotate-90"
                                    >
                                        ▸
                                    </span>
                                    {item.question}
                                </span>
                            </summary>
                            <p className="mt-3 pl-6 text-sm leading-relaxed text-neutral-600">
                                {item.answer}
                            </p>
                        </details>
                    ))}
                </div>
            </section>
        </main>
    );
}
