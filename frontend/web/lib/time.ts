/**
 * Tiện ích thuần định dạng thời gian cho lịch sử scan.
 *
 * `formatScanTimestamp` định dạng một `Date` sang chuỗi `"DD/MM HH:mm"`
 * (zero-padded) dùng cho cột "thời điểm" trong Lịch sử scan (Scan_Record).
 *
 * Nguyên tắc:
 *   - KHÔNG thay đổi (mutate) `date` đầu vào — chỉ đọc.
 *   - Bảo toàn thông tin ngày/tháng/giờ/phút (bỏ giây) để round-trip được.
 *   - Dùng giờ theo múi giờ cục bộ (local time) khớp hiển thị người dùng.
 *
 * Hàm thuần, tất định (cùng input → cùng output), không side-effect.
 *
 * _Requirements: 14.3, 14.4_
 */

// ---------------------------------------------------------------------------
// Tiện ích nội bộ
// ---------------------------------------------------------------------------

/** Đệm số nguyên không âm về đúng 2 chữ số (zero-padded), vd 5 → "05". */
function pad2(value: number): string {
    return String(value).padStart(2, "0");
}

// ---------------------------------------------------------------------------
// formatScanTimestamp — hàm thuần, không mutate
// ---------------------------------------------------------------------------

/**
 * Định dạng `date` sang chuỗi `"DD/MM HH:mm"` (zero-padded, giờ cục bộ).
 *
 * Ví dụ: `02/07 18:32`.
 *
 * **Preconditions**: `date` là `Date` hợp lệ (không phải Invalid Date).
 * **Postconditions**: trả chuỗi đúng dạng `"DD/MM HH:mm"`; không làm thay đổi
 * `date`; bảo toàn ngày/tháng/giờ/phút (bỏ giây) → đọc lại giữ nguyên thông tin.
 *
 * @param date Thời điểm cần định dạng.
 * @returns Chuỗi `"DD/MM HH:mm"`.
 * @throws {RangeError} khi `date` là Invalid Date (vi phạm tiền điều kiện).
 */
export function formatScanTimestamp(date: Date): string {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new RangeError("formatScanTimestamp: `date` không hợp lệ.");
    }

    const day = pad2(date.getDate());
    const month = pad2(date.getMonth() + 1); // getMonth() trả 0..11
    const hours = pad2(date.getHours());
    const minutes = pad2(date.getMinutes());

    return `${day}/${month} ${hours}:${minutes}`;
}
