/**
 * Hàm quét nhanh có kiểm soát quota — quickScan.
 *
 * Điều phối một lần "quét nhanh" URL/email từ Hero (Home) hoặc Chat theo đúng
 * pseudocode `quickScan` trong design.md, đảm bảo các bất biến (invariants):
 *
 *   1. Đầu vào rỗng/chỉ khoảng trắng  → trả `ValidationError`,
 *      KHÔNG gọi Api_Client và KHÔNG thay đổi quota.
 *   2. Hết quota (`!quota.canScan()`) → trả `QuotaError`,
 *      KHÔNG gọi Api_Client và KHÔNG thay đổi quota.
 *   3. Trường hợp hợp lệ → chọn modality (`url` nếu trông giống URL, ngược lại
 *      `email`), tiêu thụ ĐÚNG 1 lượt quota, rồi gọi Api_Client tương ứng.
 *   4. Kết quả trả về nhất quán nội tại: `riskLevel === getRiskLevel(score).key`.
 *
 * Quota chỉ giảm đúng 1 KHI VÀ CHỈ KHI một lần quét thực sự được thực thi.
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4_
 */

import type { ApiClient } from "@/lib/api/client";
// Tái sử dụng `looksLikeUrl` từ MockApiClient để tránh phân kỳ (divergence)
// logic phân loại đầu vào giữa mock và quét nhanh.
import { looksLikeUrl } from "@/lib/api/mock";
import type { QuotaGuard } from "@/lib/quota";
import { getRiskLevel } from "@/lib/risk";
import type {
    AppError,
    AssessResult,
    QuotaError,
    ValidationError,
} from "@/lib/types";

// Re-export để phần còn lại của UI có thể dùng `looksLikeUrl` từ một nơi thống
// nhất (lib/quick-scan) mà không cần biết nó bắt nguồn từ mock client.
export { looksLikeUrl };

/** Thông điệp lỗi khi đầu vào rỗng/chỉ khoảng trắng. */
export const EMPTY_INPUT_MESSAGE = "Vui lòng nhập URL hoặc nội dung email";

/** Thông điệp lỗi khi đã hết lượt quét trong ngày. */
export const QUOTA_EXCEEDED_MESSAGE = "Đã hết lượt quét hôm nay";

/**
 * Kiểm tra một giá trị trả về từ `quickScan` có phải lỗi ứng dụng hay không.
 *
 * Hữu ích cho phía gọi để phân biệt `AssessResult` với `AppError`
 * (`ValidationError` | `QuotaError`).
 *
 * @param value Giá trị trả về từ `quickScan`.
 * @returns `true` nếu `value` là `AppError`.
 */
export function isAppError(value: AssessResult | AppError): value is AppError {
    return typeof (value as AppError).error === "string";
}

/**
 * Thực hiện một lần quét nhanh có kiểm soát quota.
 *
 * **Preconditions**: `apiClient` đã khởi tạo; `quota` phản ánh gói hiện tại.
 * **Postconditions**:
 *   - Đầu vào rỗng sau khi trim → trả `ValidationError`; quota không đổi; không gọi API.
 *   - Hết quota → trả `QuotaError`; quota không đổi; không gọi API.
 *   - Thành công → trả `AssessResult` với `riskLevel === getRiskLevel(score).key`,
 *     và quota giảm đúng 1.
 *
 * @param input Chuỗi người dùng nhập (URL hoặc nội dung email).
 * @param quota Bộ quản lý quota hiện hành.
 * @param apiClient Lớp API (mock/real) để đánh giá.
 * @returns `AssessResult` khi thành công, hoặc `AppError` khi bị chặn.
 */
export async function quickScan(
    input: string,
    quota: QuotaGuard,
    apiClient: ApiClient,
): Promise<AssessResult | AppError> {
    const trimmed = input.trim();

    // (1) Đầu vào rỗng/chỉ khoảng trắng → ValidationError, không gọi API/không giảm quota.
    if (trimmed.length === 0) {
        const err: ValidationError = {
            error: "validation",
            message: EMPTY_INPUT_MESSAGE,
        };
        return err;
    }

    // (2) Hết quota → QuotaError, không gọi API/không giảm quota.
    if (!quota.canScan()) {
        const err: QuotaError = {
            error: "quota",
            message: QUOTA_EXCEEDED_MESSAGE,
        };
        return err;
    }

    // (3) Chọn modality theo dạng đầu vào rồi tiêu thụ đúng 1 lượt quota.
    const modality: "url" | "email" = looksLikeUrl(trimmed) ? "url" : "email";
    quota.consume();

    const result =
        modality === "url"
            ? await apiClient.assessUrl(trimmed)
            : await apiClient.assessText(trimmed);

    // (4) Kiểm chứng bất biến nhất quán nội tại của kết quả.
    const expectedLevel = getRiskLevel(result.score).key;
    if (result.riskLevel !== expectedLevel) {
        throw new Error(
            `AssessResult không nhất quán: riskLevel="${result.riskLevel}" ` +
            `nhưng getRiskLevel(${result.score}).key="${expectedLevel}".`,
        );
    }

    return result;
}
