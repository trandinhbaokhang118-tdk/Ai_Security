"use client";

/**
 * Trang Tài khoản — API / MCP key (`/account/api-key`).
 *
 * Trách nhiệm (theo requirements.md — Requirement 15; UI_wireframe §1.6 —
 * "API/MCP key"; design.md — Security Considerations):
 *   - Nạp API key hiện tại khi mount qua `getApiClient().getApiKey()`
 *     (Requirement 15.1).
 *   - Hiển thị key ở dạng CHE MỘT PHẦN mặc định (8 ký tự đầu + "••••" + 4 ký
 *     tự cuối). Có nút hiện/ẩn để xem đầy đủ khi cần (Requirement 15.1).
 *   - Nút "Sao chép" dùng `navigator.clipboard` (có guard) để chép giá trị key.
 *     TUYỆT ĐỐI KHÔNG ghi giá trị key ra console ở bất kỳ đâu (Requirement 15.3).
 *   - Nút "Tạo lại key" gọi `getApiClient().rotateApiKey()`; vì thao tác này làm
 *     mất hiệu lực key cũ nên yêu cầu XÁC NHẬN hai bước trước khi thực hiện. Key
 *     mới hiển thị ở dạng che một phần (Requirement 15.2).
 *   - Hiển thị `createdAt`.
 *   - Gợi ý đây là tính năng cho gói Team/MCP, nhưng vẫn render cho mọi người
 *     dùng đã đăng nhập (layout đã guard xác thực).
 *
 * Là Client Component vì cần `useEffect`/`useState` để nạp dữ liệu bất đồng bộ
 * và xử lý tương tác (sao chép/tạo lại/hiện-ẩn).
 *
 * _Requirements: 15.1, 15.2, 15.3_
 */

import { useEffect, useState } from "react";

import { getApiClient } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { ApiKeyInfo } from "@/lib/types";

/**
 * Che một phần giá trị key: giữ 8 ký tự đầu và 4 ký tự cuối, phần giữa thay
 * bằng dấu chấm. Với key quá ngắn (không đủ để lộ hai đầu) → che toàn bộ.
 *
 * Hàm thuần, không ghi log — an toàn để gọi trong render.
 */
function maskKey(key: string): string {
    const HEAD = 8;
    const TAIL = 4;
    if (key.length <= HEAD + TAIL) {
        return "•".repeat(Math.max(key.length, 8));
    }
    return `${key.slice(0, HEAD)}••••${key.slice(-TAIL)}`;
}

export default function AccountApiKeyPage(): JSX.Element {
    const { plan } = useAuth();

    // Trạng thái key: undefined = đang tải; null = lỗi/không có; ApiKeyInfo = đã tải.
    const [apiKey, setApiKey] = useState<ApiKeyInfo | null | undefined>(
        undefined
    );
    // Hiện đầy đủ key hay che một phần (mặc định che).
    const [revealed, setRevealed] = useState<boolean>(false);
    // Trạng thái xác nhận tạo lại key (bước 2 của thao tác nguy hiểm).
    const [confirmingRotate, setConfirmingRotate] = useState<boolean>(false);
    // Đang gọi rotate.
    const [rotating, setRotating] = useState<boolean>(false);
    // Thông báo phản hồi ngắn (sao chép thành công / lỗi).
    const [notice, setNotice] = useState<string | null>(null);

    // Nạp key hiện tại khi mount (Requirement 15.1).
    useEffect(() => {
        let active = true;

        void getApiClient()
            .getApiKey()
            .then((info) => {
                if (active) {
                    setApiKey(info);
                }
            })
            .catch(() => {
                if (active) {
                    setApiKey(null);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    // Sao chép key qua clipboard (có guard) — KHÔNG log giá trị key.
    async function handleCopy(): Promise<void> {
        if (!apiKey) {
            return;
        }
        setNotice(null);
        try {
            if (
                typeof navigator !== "undefined" &&
                navigator.clipboard &&
                typeof navigator.clipboard.writeText === "function"
            ) {
                await navigator.clipboard.writeText(apiKey.key);
                setNotice("Đã sao chép key vào clipboard.");
            } else {
                setNotice(
                    "Trình duyệt không hỗ trợ sao chép tự động. Vui lòng hiện key và chép thủ công."
                );
            }
        } catch {
            // Không log giá trị key; chỉ báo lỗi chung.
            setNotice("Không thể sao chép key. Vui lòng thử lại.");
        }
    }

    // Tạo lại key (Requirement 15.2) — chỉ gọi sau khi đã xác nhận.
    async function handleRotate(): Promise<void> {
        setRotating(true);
        setNotice(null);
        try {
            const info = await getApiClient().rotateApiKey();
            setApiKey(info);
            setRevealed(false); // key mới hiển thị dạng che một phần.
            setNotice("Đã tạo lại key mới. Key cũ không còn hiệu lực.");
        } catch {
            setNotice("Không thể tạo lại key. Vui lòng thử lại.");
        } finally {
            setRotating(false);
            setConfirmingRotate(false);
        }
    }

    const isLoading = apiKey === undefined;
    const hasKey = apiKey !== null && apiKey !== undefined;
    const isTeam = plan?.tier === "team";

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                    API / MCP key
                </h1>
                <p className="text-sm text-neutral-600">
                    Dùng key này để tích hợp AI Security Armor vào quy trình của
                    bạn qua API hoặc MCP endpoint.
                </p>
            </header>

            {/* Gợi ý gói Team/MCP (không chặn hiển thị) */}
            {!isTeam && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    API/MCP key dành cho gói{" "}
                    <span className="font-semibold">Team</span>. Bạn vẫn có thể
                    xem key demo bên dưới; nâng cấp để dùng trên môi trường thật.
                </div>
            )}

            {isLoading ? (
                <p className="text-sm text-neutral-500">Đang tải…</p>
            ) : !hasKey ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-600">
                    Chưa có API key. Vui lòng thử lại sau.
                </div>
            ) : (
                <section className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-6">
                    {/* Hiển thị key (che một phần mặc định) */}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                            Khóa bí mật
                        </span>
                        <code
                            className="block break-all rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 font-mono text-sm text-neutral-900"
                            aria-label="Giá trị API key"
                        >
                            {revealed ? apiKey!.key : maskKey(apiKey!.key)}
                        </code>
                        <span className="text-xs text-neutral-500">
                            Tạo lúc: {apiKey!.createdAt}
                        </span>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setRevealed((prev) => !prev);
                                setNotice(null);
                            }}
                            className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                        >
                            {revealed ? "Ẩn key" : "Hiện key"}
                        </button>

                        <button
                            type="button"
                            onClick={() => void handleCopy()}
                            className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                        >
                            Sao chép
                        </button>

                        {/* Tạo lại key — xác nhận hai bước (thao tác nguy hiểm) */}
                        {confirmingRotate ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-neutral-600">
                                    Tạo lại sẽ vô hiệu hóa key cũ. Tiếp tục?
                                </span>
                                <button
                                    type="button"
                                    onClick={() => void handleRotate()}
                                    disabled={rotating}
                                    className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {rotating ? "Đang tạo lại…" : "Xác nhận"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmingRotate(false)}
                                    disabled={rotating}
                                    className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setConfirmingRotate(true);
                                    setNotice(null);
                                }}
                                className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
                            >
                                Tạo lại key
                            </button>
                        )}
                    </div>

                    {notice && (
                        <p
                            role="status"
                            className="text-sm font-medium text-neutral-700"
                        >
                            {notice}
                        </p>
                    )}
                </section>
            )}
        </div>
    );
}
