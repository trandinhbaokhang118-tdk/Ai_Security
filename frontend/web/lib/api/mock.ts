/**
 * MockApiClient — hiện thực stub tất định, chạy in-memory + localStorage.
 *
 * Cho phép Web App UI demo độc lập (standalone) khi Security Gateway chưa
 * chạy. Toàn bộ kết quả đánh giá được sinh từ heuristic TẤT ĐỊNH (cùng đầu
 * vào → cùng điểm số) dựa trên các dấu hiệu:
 *   - URL : homoglyph (giả mạo thương hiệu), thiếu HTTPS, TLD rủi ro, path "login".
 *   - Email/Text : từ khóa khẩn cấp (tiếng Việt), liên kết đáng ngờ, sai lệch người gửi.
 *
 * Streaming chat được giả lập bằng async generator phát từng "token" (chunk
 * theo từ) kèm độ trễ nhỏ. Lịch sử scan, phiên đăng nhập và API key được bền
 * hóa vào `localStorage` khi chạy trong trình duyệt; trên SSR (không có
 * `window`) client vẫn hoạt động bằng trạng thái in-memory.
 *
 * Bất biến quan trọng: mọi `AssessResult` thỏa `riskLevel === getRiskLevel(score).key`,
 * `score ∈ [0,100]`, `confidence ∈ [0,1]`.
 *
 * _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 16.3, 16.4_
 */

import type { ApiClient } from "@/lib/api/client";
import { sortEvidenceBySeverity } from "@/lib/evidence";
import { getRiskLevel } from "@/lib/risk";
import { formatScanTimestamp } from "@/lib/time";
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
    Evidence,
    PlanInfo,
    PlanTier,
    RegisterInput,
    ScanRecord,
    Session,
    Severity,
    UserProfile,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Hằng số & khóa lưu trữ
// ---------------------------------------------------------------------------

/** Khóa localStorage cho lịch sử scan của mock client. */
export const MOCK_HISTORY_KEY = "aisec:mock:history";
/** Khóa localStorage cho phiên đăng nhập giả lập. */
export const MOCK_SESSION_KEY = "aisec:mock:session";
/** Khóa localStorage cho API/MCP key giả lập. */
export const MOCK_APIKEY_KEY = "aisec:mock:apikey";

/** Danh sách TLD rủi ro cao thường gặp trong phishing. */
const RISKY_TLDS = [
    "xyz", "tk", "top", "gq", "ml", "cf", "ga", "work", "click",
    "link", "country", "kim", "science", "party", "review", "stream",
    "download", "loan", "men", "zip", "mov",
];

/** Từ khóa khẩn cấp/lừa đảo tiếng Việt dùng cho heuristic email. */
const URGENCY_KEYWORDS = ["khóa", "ngay", "gấp", "xác minh", "trúng thưởng"];

/** Độ tin cậy cố định cho kết quả mock (nằm trong [0,1]). */
// ---------------------------------------------------------------------------
// Tiện ích thuần
// ---------------------------------------------------------------------------

/** Kẹp `value` về khoảng [min, max]. */
function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/** Chờ `ms` mili-giây (dùng để giả lập streaming). */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sinh một định danh dạng UUID. Ưu tiên `crypto.randomUUID()`; nếu không có
 * (môi trường cũ), dùng bộ sinh dự phòng dựa trên `Math.random`.
 */
function generateId(): string {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/** Có đang chạy trong trình duyệt (có localStorage) không. */
function hasBrowserStorage(): boolean {
    return (
        typeof window !== "undefined" &&
        typeof window.localStorage !== "undefined"
    );
}

/** Đọc + parse JSON từ localStorage; trả về null nếu vắng/hỏng/không phải browser. */
function readStored<T>(key: string): T | null {
    if (!hasBrowserStorage()) {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
}

/** Ghi JSON vào localStorage (no-op trên SSR hoặc khi bị chặn). */
function writeStored(key: string, value: unknown): void {
    if (!hasBrowserStorage()) {
        return;
    }
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // localStorage đầy hoặc bị chặn → bỏ qua, giữ trạng thái in-memory.
    }
}

// ---------------------------------------------------------------------------
// Heuristic: nhận dạng đầu vào & dấu hiệu URL/email (thuần, tất định)
// ---------------------------------------------------------------------------

/**
 * Đoán một chuỗi có "trông giống URL" hay không.
 *
 * Quy tắc (tất định): có scheme http(s)://, hoặc bắt đầu bằng "www.", hoặc
 * là một token liền không khoảng trắng chứa dấu chấm với phần đuôi trông
 * giống TLD (2+ ký tự chữ). Chuỗi nhiều dòng/nhiều khoảng trắng (đặc trưng
 * email) sẽ KHÔNG được coi là URL.
 *
 * @param input Chuỗi cần phân loại.
 * @returns `true` nếu trông giống URL.
 */
export function looksLikeUrl(input: string): boolean {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
        return false;
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return true;
    }
    // Có khoảng trắng bên trong → nhiều khả năng là nội dung email/văn bản.
    if (/\s/.test(trimmed)) {
        return false;
    }
    if (/^www\./i.test(trimmed)) {
        return true;
    }
    // domain.tld[/path] — một token, có ít nhất một dấu chấm và TLD chữ.
    return /^[^\s@]+\.[a-z]{2,}(?:[/:?#].*)?$/i.test(trimmed);
}

/**
 * Phát hiện dấu hiệu homoglyph / giả mạo thương hiệu trong URL.
 *
 * Tất định. Nhận diện hai nhóm:
 *   1) Trộn chữ Latin với ký tự ngoài ASCII (vd chữ Cyrillic nhìn giống Latin).
 *   2) Tên miền có chữ số thay thế chữ cái (0↔o, 1↔l/i, 3↔e, 5↔s...) nằm
 *      xen giữa các chữ cái trong nhãn miền (dấu hiệu điển hình của đánh lừa).
 */
export function hasHomoglyph(url: string): boolean {
    const host = extractHost(url);

    // (1) Trộn ASCII và ký tự Unicode "trông giống" chữ Latin.
    const hasAscii = /[a-z]/i.test(host);
    const hasNonAscii = /[^\u0000-\u007f]/.test(host);
    if (hasAscii && hasNonAscii) {
        return true;
    }

    // (2) Chữ số thay thế chữ cái, nằm giữa các chữ cái (vd "vietc0mbank").
    //     Bỏ qua trường hợp số đứng độc lập/ở biên để giảm dương tính giả.
    if (/[a-z][013457]+[a-z]/i.test(host)) {
        return true;
    }

    return false;
}

/** Trích host (không scheme, không path) từ một chuỗi URL. */
function extractHost(url: string): string {
    let s = url.trim();
    s = s.replace(/^https?:\/\//i, "");
    s = s.replace(/^www\./i, "");
    // Cắt tại ký tự đầu tiên của path/query/port/fragment.
    const cut = s.search(/[/:?#]/);
    return cut === -1 ? s : s.slice(0, cut);
}

/** Kiểm tra URL có dùng TLD rủi ro cao không. */
export function hasRiskyTld(url: string): boolean {
    const host = extractHost(url).toLowerCase();
    const lastDot = host.lastIndexOf(".");
    if (lastDot === -1) {
        return false;
    }
    const tld = host.slice(lastDot + 1);
    return RISKY_TLDS.includes(tld);
}

// ---------------------------------------------------------------------------
// Heuristic đánh giá (thuần, tất định) → AssessResult
// ---------------------------------------------------------------------------

/** Lấy tối đa `n` thông điệp đầu tiên (theo thứ tự đã sắp) làm "lý do chính". */
function topReasons(sorted: Evidence[], n = 3): string[] {
    return sorted.slice(0, n).map((e) => e.message);
}

function estimateConfidence(score: number, evidence: Evidence[]): number {
    const risk = clamp(score, 0, 100) / 100;
    const boundaryCertainty = Math.abs(risk - 0.5) * 2;
    const severityWeight: Record<Severity, number> = {
        critical: 1,
        high: 0.8,
        medium: 0.55,
        low: 0.3,
        info: 0.12,
    };
    const evidenceStrength = Math.min(
        1,
        evidence.reduce((sum, item) => sum + severityWeight[item.severity], 0) / 3,
    );
    const ambiguousPenalty = risk >= 0.35 && risk <= 0.65 ? 0.08 : 0;
    return clamp(
        0.35 + boundaryCertainty * 0.38 + evidenceStrength * 0.17 + 0.03 - ambiguousPenalty,
        0.2,
        0.98,
    );
}

/**
 * Đóng gói một `AssessResult` nhất quán từ điểm + bằng chứng.
 *
 * Đảm bảo bất biến: `score ∈ [0,100]`, `riskLevel === getRiskLevel(score).key`,
 * evidence được sắp theo severity giảm dần, reasons là top thông điệp.
 */
function buildResult(
    rawScore: number,
    evidence: Evidence[],
    modality: AssessResult["modality"],
    explanation: string,
): AssessResult {
    const score = clamp(Math.round(rawScore), 0, 100);
    const sorted = sortEvidenceBySeverity(evidence);
    const level = getRiskLevel(score);
    return {
        score,
        riskLevel: level.key,
        confidence: estimateConfidence(score, sorted),
        reasons: topReasons(sorted),
        evidence: sorted,
        explanation,
        modality,
        modelVersion: "mock-heuristic-1",
        latencyMs: 0,
        requestId: generateId(),
    };
}

/**
 * Đánh giá rủi ro cho một URL bằng heuristic tất định (theo pseudocode design.md).
 *
 * Base score 5; +45 homoglyph, +20 nếu không https://, +18 TLD rủi ro,
 * +9 nếu path chứa "login"; kẹp về [0,100].
 *
 * **Postconditions**: `score ∈ [0,100]`; `riskLevel === getRiskLevel(score).key`;
 * tất định với cùng `url`.
 */
export function mockAssessUrl(url: string): AssessResult {
    const evidence: Evidence[] = [];
    let score = 5;

    if (hasHomoglyph(url)) {
        score += 45;
        evidence.push({
            source: "url_adapter",
            message: "Domain giả mạo thương hiệu (homoglyph)",
            severity: "critical",
            feature: "homoglyph_score",
            contribution: 0.38,
        });
    }
    if (!/^https:\/\//i.test(url.trim())) {
        score += 20;
        evidence.push({
            source: "url_adapter",
            message: "Không dùng HTTPS",
            severity: "medium",
            feature: "no_https",
            contribution: 0.21,
        });
    }
    if (hasRiskyTld(url)) {
        score += 18;
        evidence.push({
            source: "url_adapter",
            message: "TLD rủi ro cao",
            severity: "medium",
            feature: "risky_tld",
            contribution: 0.17,
        });
    }
    if (url.toLowerCase().includes("login")) {
        score += 9;
        evidence.push({
            source: "url_adapter",
            message: "Path chứa 'login'",
            severity: "low",
            feature: "login_path",
            contribution: 0.09,
        });
    }

    if (evidence.length === 0) {
        evidence.push({
            source: "url_adapter",
            message: "Không phát hiện dấu hiệu rủi ro rõ rệt",
            severity: "info",
            contribution: 0.02,
        });
    }

    const explanation = buildUrlExplanation(evidence);
    return buildResult(score, evidence, "url", explanation);
}

/**
 * Đánh giá rủi ro cho một đoạn văn bản/email bằng heuristic tất định.
 *
 * Base score 5; mỗi từ khóa khẩn cấp (tiếng Việt) +14; liên kết đáng ngờ
 * (http:// không bảo mật, TLD rủi ro, hoặc homoglyph) +22; dấu hiệu sai lệch
 * người gửi (địa chỉ email trên tên miền công cộng mạo danh tổ chức) +16.
 * Kẹp về [0,100].
 */
export function mockAssessText(text: string): AssessResult {
    const evidence: Evidence[] = [];
    const lower = text.toLowerCase();
    let score = 5;

    // (1) Từ khóa khẩn cấp/lừa đảo.
    const foundKeywords = URGENCY_KEYWORDS.filter((k) => lower.includes(k));
    if (foundKeywords.length > 0) {
        score += 14 * foundKeywords.length;
        evidence.push({
            source: "text_adapter",
            message: `Ngôn từ hối thúc/đe dọa (${foundKeywords.join(", ")})`,
            severity: foundKeywords.length >= 2 ? "high" : "medium",
            feature: "urgency_keywords",
            contribution: 0.12 * foundKeywords.length,
        });
    }

    // (2) Liên kết đáng ngờ trong nội dung.
    const urlMatches = text.match(/\b(?:https?:\/\/|www\.)[^\s]+/gi) ?? [];
    const suspiciousLink = urlMatches.some(
        (u) =>
            /^http:\/\//i.test(u) || hasRiskyTld(u) || hasHomoglyph(u),
    );
    if (suspiciousLink) {
        score += 22;
        evidence.push({
            source: "text_adapter",
            message: "Chứa liên kết đáng ngờ (không HTTPS / TLD rủi ro / giả mạo)",
            severity: "high",
            feature: "suspicious_link",
            contribution: 0.24,
        });
    }

    // (3) Sai lệch người gửi: mạo danh tổ chức nhưng dùng email miền công cộng.
    if (hasSenderMismatch(text)) {
        score += 16;
        evidence.push({
            source: "text_adapter",
            message: "Người gửi mạo danh (địa chỉ không khớp tổ chức)",
            severity: "medium",
            feature: "sender_mismatch",
            contribution: 0.15,
        });
    }

    if (evidence.length === 0) {
        evidence.push({
            source: "text_adapter",
            message: "Không phát hiện dấu hiệu lừa đảo rõ rệt",
            severity: "info",
            contribution: 0.02,
        });
    }

    const explanation = buildTextExplanation(evidence);
    return buildResult(score, evidence, "email", explanation);
}

/**
 * Dấu hiệu sai lệch người gửi: nội dung nhắc tới tổ chức/ngân hàng nhưng địa
 * chỉ gửi lại nằm trên tên miền email công cộng (gmail/yahoo/outlook...).
 */
function hasSenderMismatch(text: string): boolean {
    const lower = text.toLowerCase();
    const mentionsOrg =
        /ngân hàng|bank|ngÂn|tổ chức|công ty|bộ phận|phòng|dịch vụ/i.test(text);
    const publicMail =
        /@(?:gmail|yahoo|outlook|hotmail|proton|mail)\.[a-z.]+/i.test(lower);
    return mentionsOrg && publicMail;
}

/** Sinh giải thích tiếng Việt cho kết quả URL từ danh sách bằng chứng. */
function buildUrlExplanation(evidence: Evidence[]): string {
    const points = evidence.map((e) => `• ${e.message}`).join("\n");
    return `Đánh giá URL dựa trên các dấu hiệu sau:\n${points}`;
}

/** Sinh giải thích tiếng Việt cho kết quả email/văn bản. */
function buildTextExplanation(evidence: Evidence[]): string {
    const points = evidence.map((e) => `• ${e.message}`).join("\n");
    return `Đánh giá nội dung email dựa trên các dấu hiệu sau:\n${points}`;
}

// ---------------------------------------------------------------------------
// Session / Plan helpers
// ---------------------------------------------------------------------------

/** Suy ra gói dịch vụ từ email (cho mục đích demo). */
function inferPlanTier(email: string): PlanTier {
    const lower = email.toLowerCase();
    if (lower.includes("team")) {
        return "team";
    }
    if (lower.includes("pro")) {
        return "pro";
    }
    return "free";
}

/** Tạo PlanInfo mặc định theo gói. */
function buildPlanInfo(tier: PlanTier): PlanInfo {
    const labels: Record<PlanTier, string> = {
        free: "FREE",
        pro: "PRO",
        team: "TEAM",
        enterprise: "ENTERPRISE",
    };
    return {
        tier,
        label: labels[tier],
        renewsAt: tier === "free" ? undefined : "02/08/2026",
        dailyScanLimit: tier === "free" ? 50 : Number.POSITIVE_INFINITY,
    };
}

/** Suy ra tên hiển thị từ phần local của email. */
function displayNameFromEmail(email: string): string {
    const local = email.split("@")[0] ?? email;
    if (local.length === 0) {
        return email;
    }
    return local.charAt(0).toUpperCase() + local.slice(1);
}

/** Tạo Session giả lập từ email. */
function buildSession(email: string): Session {
    const tier = inferPlanTier(email);
    const user: UserProfile = {
        id: generateId(),
        email,
        displayName: displayNameFromEmail(email),
    };
    return {
        token: `mock-jwt.${btoaSafe(email)}.${generateId()}`,
        user,
        plan: buildPlanInfo(tier),
    };
}

/** base64 an toàn cho cả browser và node (không dùng cho bảo mật). */
function btoaSafe(input: string): string {
    try {
        if (typeof btoa === "function") {
            return btoa(unescape(encodeURIComponent(input)));
        }
    } catch {
        // fall through
    }
    // Node fallback
    try {
        return Buffer.from(input, "utf-8").toString("base64");
    } catch {
        return input;
    }
}

// ---------------------------------------------------------------------------
// MockApiClient
// ---------------------------------------------------------------------------

export class MockApiClient implements ApiClient {
    /** Lịch sử scan in-memory (đồng bộ với localStorage khi ở browser). */
    private history: ScanRecord[];
    /** Phiên đăng nhập hiện tại (null nếu chưa đăng nhập). */
    private session: Session | null;
    /** API/MCP key hiện tại (lazy khởi tạo). */
    private apiKey: ApiKeyInfo | null;

    constructor() {
        this.history = readStored<ScanRecord[]>(MOCK_HISTORY_KEY) ?? [];
        this.session = readStored<Session>(MOCK_SESSION_KEY);
        this.apiKey = readStored<ApiKeyInfo>(MOCK_APIKEY_KEY);
    }

    async assessUrl(url: string): Promise<AssessResult> {
        const result = mockAssessUrl(url);
        this.recordScan("URL", result);
        return result;
    }

    async sandboxUrl(url: string): Promise<import("@/lib/types").SandboxResult> {
        return {
            ok: false,
            execution_status: "failed",
            url,
            final_url: "",
            status_code: null,
            http_reason: "",
            content_type: "",
            bytes_read: 0,
            resolved_ip: "",
            redirects: [],
            tls: {},
            page_title: "",
            page_signals: {},
            elapsed_ms: 0,
            scan_steps: [
                {
                    key: "mock_mode",
                    label: "Run direct sandbox",
                    status: "failed",
                    detail: "Real API is required.",
                },
            ],
            issues: [
                {
                    code: "mock_mode",
                    severity: "info",
                    category: "execution",
                    message: "Sandbox trực tiếp chỉ hoạt động khi ứng dụng dùng API thật.",
                },
            ],
        };
    }

    async browserSandboxUrl(url: string): Promise<BrowserSandboxResult> {
        return {
            ok: false,
            execution_status: "failed",
            url,
            final_url: "",
            status_code: null,
            page_title: "",
            isolation: { mode: "mock" },
            canary: {
                enabled: true,
                mode: "dry_run",
                clone_email: "",
                fields_filled: 0,
                field_types: {},
                form_submissions_blocked: 0,
                exfiltration_blocked: false,
                notes: ["Advanced browser sandbox only runs against the real API."],
            },
            network_events: [],
            browser_events: [],
            console_errors: [],
            elapsed_ms: 0,
            scan_steps: [
                {
                    key: "mock_mode",
                    label: "Run advanced browser sandbox",
                    status: "failed",
                    detail: "Real API is required.",
                },
            ],
            issues: [
                {
                    code: "mock_mode",
                    severity: "info",
                    category: "execution",
                    message: "Browser sandbox nang cao chi hoat dong khi ung dung dung API that.",
                },
            ],
        };
    }

    async sandboxExecutable(file: File): Promise<ExeSandboxResult> {
        return { ok: false, execution_status: "failed", filename: file.name, sha256: "", size_bytes: file.size, sandbox: "mock", network: "disabled", verdict: "unknown", risk_score: 0, issues: ["Hãy đặt NEXT_PUBLIC_API_MODE=real để chạy Windows Sandbox thật."], processes: [], files_created: [], network_attempts: [], elapsed_ms: 0 };
    }

    async assessText(
        text: string,
        _metadata?: AssessMetadata,
    ): Promise<AssessResult> {
        const result = mockAssessText(text);
        this.recordScan("Email", result);
        return result;
    }

    async *openChatStream(
        payload: ChatRequest,
    ): AsyncGenerator<ChatChunk, ChatFinal, void> {
        // Nếu có ngữ cảnh nội dung, chạy đánh giá tương ứng trước.
        let assessment: AssessResult | undefined;
        if (payload.context && payload.context.content.trim().length > 0) {
            const { content, modality } = payload.context;
            if (modality === "url" || looksLikeUrl(content)) {
                assessment = await this.assessUrl(content);
            } else {
                assessment = await this.assessText(content);
            }
        }

        // Xây câu trả lời tiếng Việt và stream theo từng từ.
        const answer = this.composeChatAnswer(payload, assessment);
        const words = answer.split(/(\s+)/); // giữ khoảng trắng làm token riêng
        for (const word of words) {
            if (word.length === 0) {
                continue;
            }
            await delay(15);
            yield { delta: word };
        }

        return {
            messageId: generateId(),
            assessment,
        };
    }

    async login(cred: Credentials): Promise<Session> {
        const session = buildSession(cred.email);
        this.session = session;
        writeStored(MOCK_SESSION_KEY, session);
        return session;
    }

    async register(cred: RegisterInput): Promise<Session> {
        const session = buildSession(cred.email);
        // Ưu tiên displayName người dùng nhập khi đăng ký.
        if (cred.displayName && cred.displayName.trim().length > 0) {
            session.user.displayName = cred.displayName.trim();
        }
        this.session = session;
        writeStored(MOCK_SESSION_KEY, session);
        return session;
    }

    async requestPasswordReset(): Promise<{ok:boolean;message:string;resetToken?:string}> {
        return {ok:true,message:"Đã tạo yêu cầu đặt lại mật khẩu trong chế độ demo.",resetToken:"mock-reset-token-1234567890"};
    }

    async resetPassword(): Promise<void> {}

    async logout(): Promise<void> {
        this.session = null;
        if (hasBrowserStorage()) {
            try {
                window.localStorage.removeItem(MOCK_SESSION_KEY);
            } catch {
                // bỏ qua
            }
        }
    }

    async updateProfile(displayName: string): Promise<Session["user"]> {
        if (!this.session) throw new Error("Bạn cần đăng nhập.");
        this.session = {
            ...this.session,
            user: { ...this.session.user, displayName: displayName.trim() },
        };
        writeStored(MOCK_SESSION_KEY, this.session);
        return this.session.user;
    }

    async changePassword(): Promise<void> {
        if (!this.session) throw new Error("Bạn cần đăng nhập.");
    }

    async getPlan(): Promise<PlanInfo> {
        return this.session?.plan ?? buildPlanInfo("free");
    }

    async cancelSubscription(): Promise<PlanInfo> {
        if (!this.session) throw new Error("Bạn cần đăng nhập.");
        const plan = buildPlanInfo("free");
        this.session = { ...this.session, plan };
        writeStored(MOCK_SESSION_KEY, this.session);
        return plan;
    }

    async getScanHistory(): Promise<ScanRecord[]> {
        // Trả bản sao để tránh mutate trạng thái nội bộ từ bên ngoài.
        return [...this.history];
    }

    async getApiKey(): Promise<ApiKeyInfo> {
        if (!this.apiKey) {
            this.apiKey = this.createApiKey();
            writeStored(MOCK_APIKEY_KEY, this.apiKey);
        }
        return this.apiKey;
    }

    async rotateApiKey(): Promise<ApiKeyInfo> {
        this.apiKey = this.createApiKey();
        writeStored(MOCK_APIKEY_KEY, this.apiKey);
        return this.apiKey;
    }

    // -----------------------------------------------------------------------
    // Nội bộ
    // -----------------------------------------------------------------------

    /** Ghi một bản ghi lịch sử scan (mới nhất lên đầu) + bền hóa. */
    private recordScan(type: ScanRecord["type"], result: AssessResult): void {
        const record: ScanRecord = {
            id: result.requestId,
            timestamp: formatScanTimestamp(new Date()),
            type,
            score: result.score,
            riskLevel: result.riskLevel,
        };
        this.history = [record, ...this.history].slice(0, 200);
        writeStored(MOCK_HISTORY_KEY, this.history);
    }

    /** Tạo một ApiKeyInfo giả lập mới. */
    private createApiKey(): ApiKeyInfo {
        const raw = generateId().replace(/-/g, "");
        const key = `pw_live_mock_${raw}`;
        return {
            key,
            createdAt: formatScanTimestamp(new Date()),
            prefix: key.slice(0, 16),
            lastUsedAt: null,
            scopes: ["mcp:invoke"],
            status: "active",
            secretAvailable: true,
        };
    }

    /** Soạn câu trả lời tiếng Việt dựa trên câu hỏi + kết quả đánh giá. */
    private composeChatAnswer(
        payload: ChatRequest,
        assessment?: AssessResult,
    ): string {
        if (assessment) {
            const level = getRiskLevel(assessment.score);
            const reasons =
                assessment.reasons.length > 0
                    ? assessment.reasons.map((r) => `- ${r}`).join(" ")
                    : "không có dấu hiệu nổi bật.";
            return (
                `Kết quả đánh giá: ${level.icon} ${assessment.score}/100 — ${level.label}. ` +
                `Các lý do chính: ${reasons} ` +
                `Bạn nên cẩn trọng và cân nhắc cài đặt tiện ích để được bảo vệ tự động.`
            );
        }
        const q = payload.question.trim();
        return (
            `Mình đã nhận câu hỏi của bạn: "${q}". ` +
            `Hãy dán một URL hoặc nội dung email để mình phân tích rủi ro chi tiết nhé.`
        );
    }
}
