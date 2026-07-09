"use client";

/**
 * Account Profile Page — trang "Hồ sơ" trong khu vực Tài khoản.
 *
 * Trách nhiệm (theo UI_wireframe §1.6 — "HỒ SƠ": avatar, tên hiển thị,
 * email (khóa), [Đổi mật khẩu] [Lưu thay đổi]):
 *   - Hiển thị email và tên hiển thị của người dùng đã đăng nhập lấy từ
 *     `useAuth().session.user` (Requirement 12.1).
 *   - Avatar dạng chữ cái đầu (initials) suy ra từ tên hiển thị/email.
 *   - Form: ô "Tên hiển thị" (chỉnh sửa được, điền sẵn), ô "Email" (khóa,
 *     read-only). Nút "Đổi mật khẩu" và "Lưu thay đổi".
 *   - "Lưu thay đổi" chỉ cập nhật state cục bộ (stub — trang này thiên về
 *     hiển thị; luồng lưu thật sẽ nối API ở bước sau).
 *
 * Là Client Component vì cần `useAuth()` và quản lý state form.
 *
 * Ghi chú guard: `app/account/layout.tsx` đã chặn truy cập khi chưa đăng nhập,
 * nên tới đây `session` thường khác null. Vẫn guard phòng thủ để an toàn kiểu
 * và tránh render khi thiếu dữ liệu.
 *
 * _Requirements: 12.1_
 */

import { useState, type FormEvent } from "react";

import { useAuth } from "@/context/AuthContext";

/**
 * Suy ra chữ cái đầu (tối đa 2 ký tự) từ tên hiển thị; fallback về email khi
 * tên rỗng. Dùng cho avatar dạng initials.
 */
function getInitials(displayName: string, email: string): string {
    const source = displayName.trim() || email.trim();
    if (source.length === 0) {
        return "?";
    }
    // Tách theo khoảng trắng để lấy chữ cái đầu của tối đa 2 từ đầu tiên.
    const words = source.split(/\s+/).filter((w) => w.length > 0);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
}

export default function AccountProfilePage(): JSX.Element | null {
    const { session } = useAuth();

    // Guard phòng thủ: nếu vì lý do nào đó chưa có phiên, không render nội dung
    // (layout đã hiển thị màn hình yêu cầu đăng nhập).
    if (session === null) {
        return null;
    }

    return <ProfileForm email={session.user.email} initialName={session.user.displayName} />;
}

/**
 * Form hồ sơ tách riêng để giữ hook state ổn định (không gọi hook sau early
 * return trong component cha).
 */
function ProfileForm({
    email,
    initialName,
}: {
    email: string;
    initialName: string;
}): JSX.Element {
    const [displayName, setDisplayName] = useState<string>(initialName);
    const [saved, setSaved] = useState<boolean>(false);

    const initials = getInitials(displayName, email);
    const trimmedName = displayName.trim();
    const isDirty = trimmedName !== initialName.trim();
    const canSave = isDirty && trimmedName.length > 0;

    // "Lưu thay đổi" — stub cục bộ: hiển thị xác nhận đã lưu (chưa nối API).
    function handleSave(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (!canSave) {
            return;
        }
        setDisplayName(trimmedName);
        setSaved(true);
    }

    return (
        <div className="flex flex-col gap-8">
            <header>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                    Hồ sơ
                </h1>
                <p className="mt-1 text-sm text-neutral-500">
                    Xem và cập nhật thông tin cá nhân của bạn.
                </p>
            </header>

            {/* Avatar + tóm tắt danh tính */}
            <div className="flex items-center gap-4">
                <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xl font-semibold text-white"
                    aria-hidden="true"
                >
                    {initials}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-base font-medium text-neutral-900">
                        {trimmedName || "Chưa đặt tên"}
                    </p>
                    <p className="truncate text-sm text-neutral-500">{email}</p>
                </div>
            </div>

            <form className="flex max-w-md flex-col gap-5" onSubmit={handleSave}>
                {/* Tên hiển thị — chỉnh sửa được */}
                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="displayName"
                        className="text-sm font-medium text-neutral-700"
                    >
                        Tên hiển thị
                    </label>
                    <input
                        id="displayName"
                        name="displayName"
                        type="text"
                        value={displayName}
                        onChange={(event) => {
                            setDisplayName(event.target.value);
                            setSaved(false);
                        }}
                        placeholder="Nhập tên hiển thị"
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                    />
                </div>

                {/* Email — khóa (read-only) */}
                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="email"
                        className="text-sm font-medium text-neutral-700"
                    >
                        Email
                        <span className="ml-2 text-xs font-normal text-neutral-400">
                            (khóa)
                        </span>
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        readOnly
                        aria-readonly="true"
                        className="cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
                    />
                </div>

                {saved && (
                    <p
                        role="status"
                        className="text-sm font-medium text-emerald-600"
                    >
                        Đã lưu thay đổi.
                    </p>
                )}

                {/* Nút hành động */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                    >
                        Đổi mật khẩu
                    </button>
                    <button
                        type="submit"
                        disabled={!canSave}
                        className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Lưu thay đổi
                    </button>
                </div>
            </form>
        </div>
    );
}
