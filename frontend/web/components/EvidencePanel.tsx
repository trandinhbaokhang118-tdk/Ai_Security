"use client";

/**
 * Component EvidencePanel — hiển thị bằng chứng SHAP dạng thanh đóng góp
 * kèm giải thích ngôn ngữ tự nhiên ("luôn có vì sao").
 *
 * Trách nhiệm (design.md — Component: EvidencePanel):
 *   - Sắp xếp evidence theo `severity` giảm dần qua `sortEvidenceBySeverity`
 *     (nguồn duy nhất, không mutate mảng gốc).
 *   - Vẽ thanh tỷ lệ đóng góp: ưu tiên `contribution` (SHAP ~0..1 → %), nếu
 *     không có thì suy ra theo thứ hạng `severity`.
 *   - Tô màu thanh theo mức nghiêm trọng (critical/high = đỏ, medium = vàng,
 *     low/info = trung tính/xanh).
 *   - Hiển thị phần `explanation` (giải thích tiếng Việt — Layer 2) khi có.
 *   - Thu gọn/mở rộng: controlled khi có `collapsed`/`onToggle`; ngược lại tự
 *     quản state cục bộ với nút "Xem đầy đủ bằng chứng (SHAP)".
 *
 * An toàn hiển thị (Requirement 18): mọi nội dung do người dùng/kết quả đánh
 * giá cung cấp đều render qua JSX escaping (KHÔNG dùng dangerouslySetInnerHTML).
 *
 * _Requirements: 4.1, 4.2, 4.3, 4.4_
 */

import { useState } from "react";

import { SEVERITY_RANK, sortEvidenceBySeverity } from "@/lib/evidence";
import type { Evidence, Severity } from "@/lib/types";

export interface EvidencePanelProps {
    /** Danh sách bằng chứng SHAP cần hiển thị. */
    evidence: Evidence[];
    /** Giải thích tiếng Việt (Layer 2); ẩn phần giải thích khi không có. */
    explanation?: string;
    /** Trạng thái thu gọn (controlled). Bỏ qua để dùng state cục bộ. */
    collapsed?: boolean;
    /** Callback bật/tắt thu gọn (controlled). Bỏ qua để dùng state cục bộ. */
    onToggle?: () => void;
}

/** Số bằng chứng hiển thị khi ở trạng thái thu gọn. */
const COLLAPSED_COUNT = 2;

/** Thứ hạng cao nhất của severity (critical = 4) để chuẩn hoá về [0, 1]. */
const MAX_SEVERITY_RANK = SEVERITY_RANK.critical;

/** Class Tailwind cho thanh đóng góp theo mức nghiêm trọng. */
const SEVERITY_BAR_CLASSES: Record<Severity, string> = {
    critical: "bg-risk-danger",
    high: "bg-risk-danger",
    medium: "bg-risk-warn",
    low: "bg-risk-safe",
    info: "bg-gray-400",
};

/**
 * Tính bề rộng thanh đóng góp (phần trăm 0..100).
 *
 * Ưu tiên `contribution` (giá trị SHAP kỳ vọng trong ~[0, 1]) khi là số hữu
 * hạn; kẹp về [0, 1] rồi đổi sang phần trăm. Khi không có `contribution`, suy
 * ra từ thứ hạng `severity` (critical → 100%, info → 0%, tối thiểu 8% để thanh
 * luôn thấy được).
 */
function getBarPercent(ev: Evidence): number {
    if (typeof ev.contribution === "number" && Number.isFinite(ev.contribution)) {
        const clamped = Math.max(0, Math.min(1, Math.abs(ev.contribution)));
        return Math.max(8, Math.round(clamped * 100));
    }
    const ratio = SEVERITY_RANK[ev.severity] / MAX_SEVERITY_RANK;
    return Math.max(8, Math.round(ratio * 100));
}

/** Định dạng nhãn đóng góp SHAP dạng "+0.38" khi có giá trị. */
function formatContribution(contribution: number): string {
    const sign = contribution >= 0 ? "+" : "-";
    return `${sign}${Math.abs(contribution).toFixed(2)}`;
}

/** Một dòng bằng chứng: thanh đóng góp + mô tả + (tùy chọn) giá trị SHAP. */
function EvidenceRow({ ev }: { ev: Evidence }) {
    const percent = getBarPercent(ev);
    const barClass = SEVERITY_BAR_CLASSES[ev.severity];
    const hasContribution =
        typeof ev.contribution === "number" && Number.isFinite(ev.contribution);

    return (
        <li className="flex items-center gap-3 py-1.5">
            {/* Thanh tỷ lệ đóng góp */}
            <div
                className="h-2.5 w-24 shrink-0 overflow-hidden rounded-full bg-gray-100"
                role="img"
                aria-label={`Mức đóng góp ${percent}%`}
            >
                <div
                    className={`h-full rounded-full ${barClass}`}
                    style={{ width: `${percent}%` }}
                />
            </div>

            {/* Mô tả bằng chứng (JSX escaping — an toàn với nội dung độc hại) */}
            <span className="min-w-0 flex-1 text-sm text-gray-800">
                {ev.message}
            </span>

            {/* Giá trị SHAP nếu có */}
            {hasContribution && (
                <span className="shrink-0 tabular-nums text-sm font-medium text-gray-500">
                    {formatContribution(ev.contribution as number)}
                </span>
            )}
        </li>
    );
}

/**
 * EvidencePanel — panel bằng chứng SHAP + giải thích tiếng Việt.
 */
export default function EvidencePanel({
    evidence,
    explanation,
    collapsed,
    onToggle,
}: EvidencePanelProps) {
    // Controlled khi cả `collapsed` được cung cấp; ngược lại dùng state cục bộ.
    const isControlled = collapsed !== undefined;
    const [localCollapsed, setLocalCollapsed] = useState(true);
    const effectiveCollapsed = isControlled
        ? (collapsed as boolean)
        : localCollapsed;

    const handleToggle = () => {
        if (isControlled) {
            onToggle?.();
        } else {
            setLocalCollapsed((prev) => !prev);
        }
    };

    // Sắp xếp theo severity giảm dần (không mutate mảng gốc).
    const sorted = sortEvidenceBySeverity(evidence);
    const hasMore = sorted.length > COLLAPSED_COUNT;
    const visible =
        effectiveCollapsed && hasMore ? sorted.slice(0, COLLAPSED_COUNT) : sorted;

    return (
        <section
            className="rounded-lg border border-gray-200 bg-white p-4"
            aria-label="Bằng chứng đánh giá rủi ro"
        >
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Bằng chứng (SHAP)
            </h3>

            {sorted.length === 0 ? (
                <p className="text-sm text-gray-500">Không có bằng chứng.</p>
            ) : (
                <ul className="divide-y divide-gray-50">
                    {visible.map((ev, index) => (
                        <EvidenceRow key={`${ev.source}-${index}`} ev={ev} />
                    ))}
                </ul>
            )}

            {/* Nút thu gọn/mở rộng — chỉ hiện khi có nhiều hơn ngưỡng thu gọn */}
            {hasMore && (
                <button
                    type="button"
                    onClick={handleToggle}
                    aria-expanded={!effectiveCollapsed}
                    className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                    {effectiveCollapsed
                        ? "▸ Xem đầy đủ bằng chứng (SHAP)"
                        : "▾ Thu gọn bằng chứng"}
                </button>
            )}

            {/* Giải thích ngôn ngữ tự nhiên (Layer 2) — chỉ khi có */}
            {explanation && (
                <div className="mt-3 rounded-md bg-gray-50 p-3">
                    <p className="text-sm leading-relaxed text-gray-700">
                        <span className="mr-1" aria-hidden="true">
                            📋
                        </span>
                        <span className="font-semibold">GIẢI THÍCH: </span>
                        {explanation}
                    </p>
                </div>
            )}
        </section>
    );
}
