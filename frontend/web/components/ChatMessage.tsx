"use client";

/**
 * Component ChatMessage — render một bong bóng hội thoại (user hoặc assistant).
 *
 * Trách nhiệm (design.md — Component: ChatMessage):
 *   - Phân biệt vai trò `user` / `assistant`:
 *       · user      → bong bóng canh phải, nền đậm, KHÔNG avatar.
 *       · assistant → bong bóng canh trái, nền nhạt, có avatar 🛡.
 *   - Khi `message.assessment` tồn tại (assistant trả kết quả đánh giá) →
 *     nhúng `RiskBadge` (điểm + nhãn) + danh sách "Lý do chính" (reasons) +
 *     `EvidencePanel` (bằng chứng SHAP + giải thích) ngay trong bong bóng.
 *   - Khi `isStreaming` → hiển thị con trỏ nhấp nháy (hiệu ứng đang gõ).
 *
 * An toàn hiển thị (Requirement 18): mọi văn bản (message.text, reasons,
 * evidence...) đều render qua JSX escaping — KHÔNG dùng dangerouslySetInnerHTML.
 * Riêng bong bóng của người dùng echo lại nội dung do họ dán vào (có thể là
 * URL/email độc hại đang được đánh giá) → render qua <InertContent> để mọi liên
 * kết bên trong hiển thị dạng chữ TRƠ, không phải link sống bấm được (Req 18.3).
 *
 * _Requirements: 8.2, 8.3, 8.6, 18.1, 18.3_
 */

import type { ChatMessageModel } from "@/lib/types";

import EvidencePanel from "./EvidencePanel";
import InertContent from "./InertContent";
import RiskBadge from "./RiskBadge";

export interface ChatMessageProps {
    /** Dữ liệu một tin nhắn hội thoại (user hoặc assistant). */
    message: ChatMessageModel;
    /** Đang stream phản hồi → hiển thị con trỏ nhấp nháy. Mặc định false. */
    isStreaming?: boolean;
}

/** Con trỏ nhấp nháy biểu thị trạng thái đang gõ (streaming). */
function TypingCursor() {
    return (
        <span
            className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-current align-middle"
            role="status"
            aria-label="Đang trả lời"
        />
    );
}

/**
 * ChatMessage — bong bóng hội thoại phân biệt vai trò user/assistant.
 */
export default function ChatMessage({
    message,
    isStreaming = false,
}: ChatMessageProps) {
    const isUser = message.role === "user";
    const assessment = message.assessment;

    // Canh lề: user bên phải, assistant bên trái.
    const rowClass = isUser
        ? "flex justify-end gap-2"
        : "flex justify-start gap-2";

    // Kiểu bong bóng theo vai trò.
    const bubbleClass = isUser
        ? "max-w-[80%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2.5 text-white"
        : "max-w-[80%] rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-2.5 text-gray-800";

    return (
        <div
            className={rowClass}
            data-role={message.role}
            aria-label={isUser ? "Tin nhắn của bạn" : "Tin nhắn trợ lý"}
        >
            {/* Avatar 🛡 chỉ cho assistant, canh trái */}
            {!isUser && (
                <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg"
                    aria-hidden="true"
                >
                    🛡
                </span>
            )}

            <div className={bubbleClass}>
                {/* Kết quả đánh giá (chỉ assistant): RiskBadge + reasons + Evidence */}
                {!isUser && assessment && (
                    <div className="mb-2">
                        <RiskBadge
                            score={assessment.score}
                            showScore
                            showLabel
                        />
                    </div>
                )}

                {/* Nội dung văn bản — JSX escaping, an toàn với nội dung độc hại.
                    whitespace-pre-wrap giữ xuống dòng; break-words tránh tràn.
                    Bong bóng người dùng echo nội dung họ dán (URL/email đang xét,
                    có thể độc hại) → dùng <InertContent> để mọi liên kết là chữ
                    trơ, không phải link sống (Req 18.3). Bong bóng assistant là
                    văn bản của hệ thống (tin cậy) → render thẳng đã escape. */}
                {message.text && (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {isUser ? (
                            <InertContent text={message.text} />
                        ) : (
                            message.text
                        )}
                        {isStreaming && <TypingCursor />}
                    </p>
                )}

                {/* Con trỏ nhấp nháy khi chưa có text nhưng đang stream */}
                {!message.text && isStreaming && (
                    <p className="text-sm leading-relaxed" aria-label="Đang trả lời">
                        <TypingCursor />
                    </p>
                )}

                {/* Phần đánh giá chi tiết: reasons + EvidencePanel */}
                {!isUser && assessment && (
                    <div className="mt-3 space-y-3">
                        {/* Danh sách "Lý do chính" */}
                        {assessment.reasons.length > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-gray-700">
                                    Lý do chính:
                                </p>
                                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-gray-700">
                                    {assessment.reasons.map((reason, index) => (
                                        <li key={index}>{reason}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Bằng chứng SHAP + giải thích ngôn ngữ tự nhiên */}
                        <EvidencePanel
                            evidence={assessment.evidence}
                            explanation={assessment.explanation}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
