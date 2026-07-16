"use client";

/**
 * Account Layout — khung khu vực Tài khoản kèm guard yêu cầu đăng nhập.
 *
 * Trách nhiệm (theo design.md — "Route: /account/*"; UI_wireframe §1.6 —
 * sidebar tài khoản):
 *   - Guard: nếu chưa đăng nhập (session === null) → KHÔNG render nội dung tài
 *     khoản; thay vào đó hiển thị màn hình "yêu cầu đăng nhập" kèm liên kết về
 *     Trang chủ để mở luồng đăng nhập.
 *   - Khi đã đăng nhập → dựng shell gồm sidebar trái (Hồ sơ / Gói & Thanh toán
 *     / Lịch sử scan / API-MCP key) đánh dấu mục đang active theo `usePathname()`,
 *     và render {children} ở vùng nội dung.
 *
 * Là Client Component vì cần `useAuth()` và `usePathname()`.
 *
 * _Requirements: 12.2_
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";

/** Một mục điều hướng trong sidebar tài khoản. */
interface AccountNavItem {
    /** Đường dẫn đích. */
    href: string;
    /** Nhãn tiếng Việt hiển thị. */
    label: string;
    /**
     * Có so khớp chính xác đường dẫn hay không. Mục "Hồ sơ" (/account) cần khớp
     * chính xác để không active với mọi trang con.
     */
    exact?: boolean;
}

/** Danh sách mục điều hướng của khu vực tài khoản (UI_wireframe §1.6). */
const ACCOUNT_NAV: readonly AccountNavItem[] = [
    { href: "/account", label: "Hồ sơ", exact: true },
    { href: "/account/billing", label: "Gói & Thanh toán" },
    { href: "/account/history", label: "Lịch sử scan" },
    { href: "/account/api-key", label: "API / MCP key" },
] as const;

/** Kiểm tra một mục điều hướng có đang active với đường dẫn hiện tại không. */
function isActive(pathname: string, item: AccountNavItem): boolean {
    if (item.exact) {
        return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function AccountLayout({
    children,
}: {
    children: ReactNode;
}): JSX.Element {
    const { session } = useAuth();
    const pathname = usePathname() ?? "";

    // Guard: chưa đăng nhập → màn hình yêu cầu đăng nhập (Requirement 12.2).
    if (session === null) {
        return (
            <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="rounded-full bg-neutral-100 p-4 text-3xl">
                    🔒
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Bạn cần đăng nhập để xem trang này
                </h1>
                <p className="text-neutral-600">
                    Khu vực Tài khoản yêu cầu đăng nhập. Vui lòng đăng nhập để
                    xem hồ sơ, gói dịch vụ, lịch sử scan và API/MCP key của bạn.
                </p>
                <Link
                    href="/"
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
                >
                    Về Trang chủ để đăng nhập
                </Link>
            </main>
        );
    }

    // Đã đăng nhập → dựng shell với sidebar + vùng nội dung.
    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:flex-row">
            <aside className="w-full shrink-0 md:w-60">
                <h2 className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Tài khoản
                </h2>
                <nav className="flex flex-col gap-1" aria-label="Điều hướng tài khoản">
                    {ACCOUNT_NAV.map((item) => {
                        const active = isActive(pathname, item);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={
                                    active
                                        ? "rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
                                        : "rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                                }
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            <section className="min-w-0 flex-1">{children}</section>
        </div>
    );
}
