/**
 * Tiện ích an toàn hiển thị nội dung do người dùng cung cấp.
 *
 * Bối cảnh (Requirement 18 — An toàn hiển thị nội dung):
 *   - 18.1: Mọi văn bản do người dùng cung cấp phải được render qua escaping
 *     của JSX/`textContent`. React tự escape khi render `{text}`, nên các hàm ở
 *     đây KHÔNG sinh HTML — chỉ tách chuỗi thành các đoạn thuần để component
 *     render an toàn.
 *   - 18.2: KHÔNG dùng `dangerouslySetInnerHTML`. Module này thuần (pure), chỉ
 *     trả về dữ liệu, không đụng tới DOM/HTML.
 *   - 18.3: KHÔNG nhúng liên kết sống trong khu vực hiển thị nội dung bị đánh
 *     giá là độc hại. `splitTextIntoSegments` phát hiện URL bên trong văn bản để
 *     component (`InertContent`) render chúng dưới dạng chữ trơ (inert),
 *     KHÔNG phải thẻ `<a href>` bấm được.
 *
 * Thiết kế: hàm thuần, tất định, dễ kiểm thử (không phụ thuộc DOM/React).
 *
 * _Requirements: 18.1, 18.2, 18.3_
 */

/** Một đoạn văn bản sau khi tách: chữ thường hoặc một URL được nhận diện. */
export interface TextSegment {
    /** `text` = văn bản thường; `url` = chuỗi trông giống liên kết. */
    kind: "text" | "url";
    /** Nội dung nguyên văn của đoạn (chưa/không được biến đổi). */
    value: string;
}

/**
 * Regex nhận diện các chuỗi trông giống liên kết bên trong văn bản tự do:
 *   - `http://` hoặc `https://` theo sau bởi ký tự không phải khoảng trắng.
 *   - `www.` theo sau bởi ký tự không phải khoảng trắng.
 *
 * Cố ý giữ đơn giản và thiên về "bắt rộng" trong khu vực nội dung độc hại: mục
 * tiêu là làm TRƠ (inert) mọi thứ trông giống liên kết, không phải phân tích
 * URL hoàn hảo. Cờ `gi` để quét toàn chuỗi, không phân biệt hoa thường.
 */
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/**
 * Tách một chuỗi thành các đoạn xen kẽ giữa văn bản thường và URL.
 *
 * Hàm KHÔNG biến đổi nội dung: ghép `value` của mọi đoạn theo thứ tự sẽ khôi
 * phục chính xác chuỗi gốc (bảo toàn round-trip). Điều này bảo đảm không mất mát
 * hay chèn thêm ký tự khi render.
 *
 * @param text Văn bản tùy ý (có thể là nội dung độc hại do người dùng dán vào).
 * @returns Danh sách đoạn theo thứ tự xuất hiện; chuỗi rỗng → mảng rỗng.
 */
export function splitTextIntoSegments(text: string): TextSegment[] {
    if (typeof text !== "string" || text.length === 0) {
        return [];
    }

    const segments: TextSegment[] = [];
    // Tạo bản sao regex có state riêng để hàm thuần, an toàn khi gọi song song.
    const pattern = new RegExp(URL_PATTERN.source, "gi");
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        const start = match.index;
        const matched = match[0];

        // Đoạn văn bản thường trước URL (nếu có).
        if (start > lastIndex) {
            segments.push({ kind: "text", value: text.slice(lastIndex, start) });
        }

        // Bản thân URL — sẽ được render dạng chữ trơ (inert).
        segments.push({ kind: "url", value: matched });
        lastIndex = start + matched.length;

        // Bảo hiểm tránh vòng lặp vô hạn với match rỗng (không kỳ vọng xảy ra).
        if (matched.length === 0) {
            pattern.lastIndex += 1;
        }
    }

    // Phần văn bản còn lại sau URL cuối cùng.
    if (lastIndex < text.length) {
        segments.push({ kind: "text", value: text.slice(lastIndex) });
    }

    return segments;
}

/**
 * Cho biết một chuỗi có chứa ít nhất một liên kết được nhận diện hay không.
 *
 * Hữu ích để component quyết định có cần xử lý inert hay hiển thị thẳng.
 */
export function containsUrl(text: string): boolean {
    if (typeof text !== "string" || text.length === 0) {
        return false;
    }
    return new RegExp(URL_PATTERN.source, "i").test(text);
}
