/**
 * Component InertContent — hiển thị văn bản do người dùng cung cấp một cách an
 * toàn, với mọi liên kết (URL) được render dưới dạng chữ TRƠ (inert) thay vì thẻ
 * `<a href>` bấm được.
 *
 * Bối cảnh (Requirement 18 — An toàn hiển thị nội dung; design.md — Security
 * Considerations):
 *   - 18.1: Mọi văn bản render qua JSX escaping (React tự escape `{value}`),
 *     không sinh HTML thô.
 *   - 18.2: KHÔNG dùng `dangerouslySetInnerHTML`.
 *   - 18.3: KHÔNG nhúng liên kết sống trong khu vực hiển thị nội dung bị đánh
 *     giá là độc hại — URL được bọc trong `<span>` (không phải `<a>`), không có
 *     thuộc tính `href`, nên không thể bấm/điều hướng.
 *
 * Đây là component thuần trình bày (không state, không hiệu ứng), có thể dùng
 * trong cả Server lẫn Client Component.
 *
 * _Requirements: 18.1, 18.2, 18.3_
 */

import { splitTextIntoSegments } from "@/lib/sanitize";

export interface InertContentProps {
    /** Văn bản cần hiển thị an toàn (có thể là nội dung độc hại người dùng dán). */
    text: string;
    /** Class tùy chọn cho phần tử bao ngoài. */
    className?: string;
    /**
     * Nhãn trợ năng cho phần tử URL trơ (mặc định tiếng Việt). Được đặt vào
     * `title`/`aria-label` để người dùng biết đây là liên kết đã bị vô hiệu hóa.
     */
    inertLinkLabel?: string;
}

/** Nhãn mặc định cho một liên kết đã bị làm trơ. */
const DEFAULT_INERT_LABEL = "Liên kết đã bị vô hiệu hóa vì lý do an toàn";

/**
 * InertContent — render `text` với URL hiển thị dạng chữ trơ, không bấm được.
 *
 * Nội dung được tách thành các đoạn qua `splitTextIntoSegments`; đoạn `text`
 * render bình thường (đã escape), đoạn `url` render trong `<span>` có style nhẹ
 * và KHÔNG có `href`. Ghép các đoạn lại đúng bằng chuỗi gốc (bảo toàn nội dung).
 */
export default function InertContent({
    text,
    className,
    inertLinkLabel = DEFAULT_INERT_LABEL,
}: InertContentProps) {
    const segments = splitTextIntoSegments(text);

    return (
        <span className={className}>
            {segments.map((segment, index) =>
                segment.kind === "url" ? (
                    <span
                        key={index}
                        // KHÔNG phải <a>, KHÔNG có href → hoàn toàn trơ (inert).
                        className="break-all rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.95em] text-neutral-600"
                        title={inertLinkLabel}
                        aria-label={inertLinkLabel}
                        data-inert-link="true"
                    >
                        {segment.value}
                    </span>
                ) : (
                    // Văn bản thường — React tự escape, an toàn với HTML/script.
                    <span key={index}>{segment.value}</span>
                ),
            )}
        </span>
    );
}
