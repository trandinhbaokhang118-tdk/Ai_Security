/**
 * Interface trừu tượng hóa mọi lời gọi backend của Web App UI.
 *
 * Đây là hợp đồng (contract) duy nhất mà UI phụ thuộc vào; hai hiện thực
 * `MockApiClient` (demo standalone) và `RealApiClient` (gọi Security Gateway)
 * đều phải tuân thủ interface này. Việc chọn hiện thực do `getApiClient()`
 * quyết định dựa trên biến môi trường `NEXT_PUBLIC_API_MODE`.
 *
 * Khớp mục "Service: API Client (interface + 2 implementations)" trong design.md.
 *
 * _Requirements: 16.1, 16.2, 16.3, 16.5_
 */

import type {
    ApiKeyInfo,
    AssessMetadata,
    AssessResult,
    BrowserSandboxResult,
    ExeSandboxResult,
    ChatChunk,
    ChatFinal,
    ChatRequest,
    Credentials,
    PlanInfo,
    PasswordChangeInput,
    PasswordResetRequestResult,
    RegisterInput,
    SandboxResult,
    ScanRecord,
    Session,
    UserProfile,
} from "@/lib/types";

/**
 * Hợp đồng chung cho lớp API. Mọi hiện thực (mock/real) phải cung cấp
 * đầy đủ các phương thức dưới đây với cùng chữ ký.
 */
export interface ApiClient {
    /** Đánh giá rủi ro cho một URL. */
    assessUrl(url: string): Promise<AssessResult>;

    /** Truy cập URL trong worker cô lập và trả về lỗi HTTP/TLS/nội dung thực tế. */
    sandboxUrl(url: string): Promise<SandboxResult>;

    browserSandboxUrl(url: string): Promise<BrowserSandboxResult>;

    /** Chạy tệp EXE trong Windows Sandbox thật, không chạy trực tiếp trên máy chủ. */
    sandboxExecutable(file: File): Promise<ExeSandboxResult>;

    /** Đánh giá rủi ro cho một đoạn văn bản/email, kèm metadata tùy chọn. */
    assessText(text: string, metadata?: AssessMetadata): Promise<AssessResult>;

    /**
     * Mở luồng chat streaming. Trả về async generator phát các đoạn
     * `ChatChunk` (delta token) và kết thúc bằng `ChatFinal`
     * (kèm assessment nếu có).
     */
    openChatStream(
        payload: ChatRequest
    ): AsyncGenerator<ChatChunk, ChatFinal, void>;

    /** Đăng nhập; trả về Session gồm token, hồ sơ người dùng và thông tin gói. */
    login(cred: Credentials): Promise<Session>;

    /** Đăng ký tài khoản mới; trả về Session cho tài khoản mới. */
    register(cred: RegisterInput): Promise<Session>;
    requestPasswordReset(email: string): Promise<PasswordResetRequestResult>;
    resetPassword(token: string, newPassword: string): Promise<void>;

    /** Đăng xuất; xóa phiên hiện tại. */
    logout(): Promise<void>;

    /** Cập nhật tên hiển thị của tài khoản hiện tại. */
    updateProfile(displayName: string): Promise<UserProfile>;

    /** Đổi mật khẩu sau khi xác minh mật khẩu hiện tại. */
    changePassword(input: PasswordChangeInput): Promise<void>;

    /** Lấy thông tin gói hiện tại. */
    getPlan(): Promise<PlanInfo>;

    /** Hủy gói trả phí hiện tại và trả về gói có hiệu lực mới. */
    cancelSubscription(): Promise<PlanInfo>;

    /** Lấy lịch sử các lần quét. */
    getScanHistory(): Promise<ScanRecord[]>;

    /** Lấy API/MCP key hiện tại. */
    getApiKey(): Promise<ApiKeyInfo>;

    /** Tạo lại (rotate) API/MCP key; trả về key mới. */
    rotateApiKey(): Promise<ApiKeyInfo>;
}

/** Chế độ API được cấu hình qua `NEXT_PUBLIC_API_MODE`. */
export type ApiMode = "mock" | "real";
