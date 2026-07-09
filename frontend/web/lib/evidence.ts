/**
 * Tiện ích thuần cho bằng chứng (Evidence) — sắp xếp theo mức nghiêm trọng.
 *
 * `sortEvidenceBySeverity` là hàm hỗ trợ EvidencePanel hiển thị bằng chứng
 * SHAP theo `severity` giảm dần (critical > high > medium > low > info).
 *
 * Nguyên tắc:
 *   - KHÔNG mutate mảng gốc (trả về một mảng mới) — an toàn khi dùng trong React.
 *   - Bảo toàn đa tập phần tử (kết quả là một hoán vị của đầu vào).
 *   - Ổn định (stable): các phần tử cùng `severity` giữ nguyên thứ tự tương đối.
 *
 * Hàm thuần, tất định (cùng input → cùng output), không side-effect.
 *
 * _Requirements: 4.1, 4.5_
 */

import type { Evidence, Severity } from "./types";

// ---------------------------------------------------------------------------
// Xếp hạng mức nghiêm trọng (severity)
// ---------------------------------------------------------------------------

/**
 * Trọng số xếp hạng cho từng mức `severity`.
 *
 * Giá trị lớn hơn = nghiêm trọng hơn, được sắp lên trước khi sắp giảm dần:
 *   critical (4) > high (3) > medium (2) > low (1) > info (0).
 */
export const SEVERITY_RANK: Record<Severity, number> = {
    info: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
};

// ---------------------------------------------------------------------------
// sortEvidenceBySeverity — hàm thuần, không mutate, sắp xếp ổn định
// ---------------------------------------------------------------------------

/**
 * Sắp xếp danh sách bằng chứng theo `severity` giảm dần (nghiêm trọng nhất
 * lên đầu), trả về một mảng MỚI mà không làm thay đổi mảng gốc.
 *
 * **Preconditions**: mọi phần tử là `Evidence` hợp lệ (severity thuộc enum).
 * **Postconditions**: kết quả là một hoán vị của `evidence` (cùng đa tập phần
 * tử) theo thứ tự severity không tăng; mảng gốc `evidence` giữ nguyên; các
 * phần tử cùng severity giữ nguyên thứ tự tương đối (ổn định).
 * **Loop Invariants**: tiền tố đã duyệt luôn được sắp đúng thứ tự.
 *
 * @param evidence Danh sách bằng chứng cần sắp xếp.
 * @returns Mảng mới đã sắp theo severity giảm dần (stable).
 */
export function sortEvidenceBySeverity(evidence: Evidence[]): Evidence[] {
    // Sao chép để KHÔNG mutate mảng gốc. Array.prototype.sort của ES2019+ ổn
    // định, nên các phần tử cùng severity giữ nguyên thứ tự tương đối.
    return [...evidence].sort(
        (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
    );
}
