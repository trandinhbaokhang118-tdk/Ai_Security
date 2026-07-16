"use client";

/**
 * Trang CHAT — trải nghiệm thử nhanh có ngữ cảnh (streaming).
 *
 * Mục đích (UI_wireframe §1.5): khách mới dán URL/nội dung email vào ô chat,
 * trợ lý đánh giá độ tin cậy + giải thích lý do theo thời gian thực. Cuối phiên
 * luôn gợi ý cài Extension để "bảo vệ thật".
 *
 * Trách nhiệm (design.md — Chat; Luồng 2 streaming):
 *   - Dùng `useChatSession()` cho messages/sendMessage/isStreaming/error/retryLast.
 *   - Bong bóng chào mừng của assistant khi chưa có tin nhắn nào.
 *   - Danh sách hội thoại render qua <ChatMessage>, con trỏ đang gõ ở bong bóng
 *     assistant cuối cùng khi đang stream.
 *   - Ô nhập dưới cùng: textarea + "Gửi ▶" + affordance "📎 Tải file .eml" +
 *     hiển thị quota "Còn lại hôm nay: X/50 scan" (∞ cho pro/team).
 *   - Chặn câu hỏi rỗng (Req 8.4); kiểm tra quota trước khi gửi; nếu hết quota
 *     hiển thị CTA nâng cấp/Extension và KHÔNG gửi; ngược lại tiêu thụ 1 lượt
 *     rồi gọi sendMessage với context suy ra từ đầu vào (url vs email).
 *   - Banner lỗi khi mất kết nối WS + nút "Thử lại" gọi retryLast() (Req 8.5).
 *
 * An toàn hiển thị (Req 18): mọi nội dung render qua JSX escaping.
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_
 */

import { useEffect, useMemo, useRef, useState } from "react";

import ChatMessage from "@/components/ChatMessage";
import { useAuth } from "@/context/AuthContext";
import { useChatSession, type ChatContext } from "@/hooks/useChatSession";
import { looksLikeUrl } from "@/lib/quick-scan";

/** Nội dung bong bóng chào mừng của trợ lý (UI_wireframe §1.5). */
const WELCOME_TEXT =
    "🛡 Chào bạn! Dán URL hoặc nội dung email vào đây, tôi sẽ đánh giá độ tin cậy và giải thích lý do.";

/** Thông điệp khi người dùng hết lượt quét trong ngày. */
const QUOTA_EXCEEDED_TEXT =
    "Bạn đã hết lượt quét miễn phí hôm nay. Nâng cấp gói hoặc cài Extension để tiếp tục được bảo vệ.";

/**
 * ChatPage — giao diện chat đánh giá có ngữ cảnh.
 */
export default function ChatPage(): JSX.Element {
    const { messages, sendMessage, isStreaming, error, retryLast } =
        useChatSession();
    const { quota } = useAuth();

    // Nội dung ô nhập (controlled) + thông báo hết quota (client-side).
    const [input, setInput] = useState("");
    const [quotaBlocked, setQuotaBlocked] = useState(false);

    // Vùng cuộn danh sách tin nhắn — tự cuộn tới tin mới nhất.
    const scrollRef = useRef<HTMLDivElement | null>(null);

    // Số lượt còn lại + giới hạn theo gói hiện tại (∞ cho pro/team).
    const remaining = quota.getRemaining();
    const limit = quota.getLimitForPlan();
    const remainingLabel = Number.isFinite(remaining)
        ? `${remaining}/${limit}`
        : "∞";

    // Có ít nhất một kết quả đánh giá từ assistant → hiện CTA cài Extension.
    const hasAssessment = useMemo(
        () => messages.some((m) => m.role === "assistant" && m.assessment),
        [messages],
    );

    // Tự cuộn xuống cuối mỗi khi có tin nhắn mới hoặc delta stream.
    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages, isStreaming]);

    // id của bong bóng assistant cuối cùng (để gắn con trỏ đang gõ khi stream).
    const lastAssistantId = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === "assistant") {
                return messages[i].id;
            }
        }
        return null;
    }, [messages]);

    /** Gửi câu hỏi hiện tại: chặn rỗng, kiểm tra quota, dựng context. */
    function handleSend(): void {
        const question = input.trim();

        // (Req 8.4) Câu hỏi rỗng sau trim → không gửi.
        if (question.length === 0) {
            return;
        }

        // Kiểm tra quota trước khi gửi; hết lượt → hiện CTA, KHÔNG gửi.
        if (!quota.canScan()) {
            setQuotaBlocked(true);
            return;
        }

        // Dựng context từ đầu vào: url nếu trông giống URL, ngược lại email —
        // để trợ lý trả về đánh giá đúng đối tượng (chat có ngữ cảnh).
        const context: ChatContext = {
            content: question,
            modality: looksLikeUrl(question) ? "url" : "email",
        };

        // Tiêu thụ đúng 1 lượt cho lần gửi hợp lệ rồi mở luồng chat.
        quota.consume();
        setQuotaBlocked(false);
        setInput("");
        void sendMessage(question, context);
    }

    /** Gửi bằng Enter (Shift+Enter để xuống dòng). */
    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    const showWelcome = messages.length === 0;

    return (
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col px-4 py-6">
            {/* Danh sách hội thoại (cuộn) */}
            <div
                ref={scrollRef}
                className="flex-1 space-y-4 overflow-y-auto pb-4"
                aria-live="polite"
            >
                {/* Bong bóng chào mừng khi chưa có tin nhắn nào */}
                {showWelcome && (
                    <ChatMessage
                        message={{
                            id: "welcome",
                            role: "assistant",
                            text: WELCOME_TEXT,
                            createdAt: 0,
                        }}
                    />
                )}

                {/* Danh sách tin nhắn thực tế */}
                {messages.map((message) => (
                    <ChatMessage
                        key={message.id}
                        message={message}
                        isStreaming={
                            isStreaming && message.id === lastAssistantId
                        }
                    />
                ))}

                {/* CTA cài Extension sau khi có kết quả đánh giá */}
                {hasAssessment && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        💡 Muốn được bảo vệ tự động khi duyệt web?{" "}
                        <button
                            type="button"
                            className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
                        >
                            Cài Extension
                        </button>
                    </div>
                )}
            </div>

            {/* Banner lỗi mất kết nối WS + nút thử lại (Req 8.5) */}
            {error && (
                <div
                    role="alert"
                    className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
                >
                    <span>⚠ {error}</span>
                    <button
                        type="button"
                        onClick={() => {
                            void retryLast();
                        }}
                        className="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1 font-medium text-red-700 hover:bg-red-100"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Thông báo hết quota + CTA nâng cấp/Extension */}
            {quotaBlocked && (
                <div
                    role="alert"
                    className="mb-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-800"
                >
                    {QUOTA_EXCEEDED_TEXT}{" "}
                    <a
                        href="/pricing"
                        className="font-semibold underline underline-offset-2"
                    >
                        Xem gói nâng cấp
                    </a>
                </div>
            )}

            {/* Ô nhập cố định dưới cùng */}
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="flex items-end gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        placeholder="Dán URL hoặc nội dung email..."
                        aria-label="Nội dung cần đánh giá"
                        className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={isStreaming || input.trim().length === 0}
                        className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Gửi ▶
                    </button>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    {/* Affordance tải file .eml (trang trí — chưa xử lý upload) */}
                    <button
                        type="button"
                        className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
                        aria-label="Tải file .eml"
                    >
                        📎 Tải file .eml
                    </button>

                    {/* Quota còn lại hôm nay theo gói (∞ cho pro/team) */}
                    <span>Còn lại hôm nay: {remainingLabel} scan</span>
                </div>
            </div>
        </div>
    );
}
