"use client";

/**
 * NavigationBar — thanh điều hướng dùng chung mọi trang.
 *
 * Component trình bày (presentational) điều khiển hoàn toàn qua props theo
 * `NavigationBarProps` trong design.md — KHÔNG phụ thuộc trực tiếp vào
 * AuthContext, để tái sử dụng và test dễ dàng. Trang bọc ngoài (layout) có
 * trách nhiệm nối `session`/`currentPath` và các callback từ AuthContext.
 *
 * Trạng thái:
 *   - Chưa đăng nhập (session == null): hiện [Đăng nhập] [Dùng thử ▶].
 *   - Đã đăng nhập: hiện ( Avatar ▾ ) với dropdown Tài khoản / Lịch sử scan /
 *     Đăng xuất (đóng/mở bằng local useState).
 *   - Link đang active được đánh dấu theo `currentPath`.
 *
 * _Requirements: 17.1, 17.2, 17.3, 17.4_
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Session } from "@/lib/types";

export interface NavigationBarProps {
    /** Đường dẫn hiện tại (vd "/pricing") để đánh dấu link active. */
    currentPath: string;
    /** Session hiện tại; `null` => chưa đăng nhập. */
    session: Session | null;
    /** Mở modal xác thực ở chế độ đăng nhập/đăng ký. */
    onOpenAuth: (mode: "login" | "register") => void;
    /** Xử lý đăng xuất. */
    onLogout: () => void;
}

/** Danh sách link điều hướng chính (khớp wireframe §1.1). */
const NAV_LINKS: { label: string; href: string }[] = [
    { label: "Home", href: "/" },
    { label: "Demo", href: "/demo" },
    { label: "Admin", href: "/admin" },
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
    { label: "Chat", href: "/chat" },
];

/**
 * Kiểm tra một link có đang active theo đường dẫn hiện tại hay không.
 * Link gốc "/" chỉ active khi ở đúng "/"; các link khác active khi path
 * bằng hoặc là tiền tố có phân đoạn (vd "/account/history" khớp "/account").
 */
function isActive(href: string, currentPath: string): boolean {
    if (href === "/") {
        return currentPath === "/";
    }
    return currentPath === href || currentPath.startsWith(`${href}/`);
}

/** Lấy chữ cái viết tắt (tối đa 2) từ tên hiển thị cho avatar. */
function getInitials(displayName: string): string {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return "?";
    }
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function NavigationBar({
    currentPath,
    session,
    onOpenAuth,
    onLogout,
}: NavigationBarProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Đóng dropdown khi bấm ra ngoài.
    useEffect(() => {
        if (!menuOpen) {
            return;
        }
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    return (
        <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/90 backdrop-blur">
            <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-2 font-semibold tracking-tight text-neutral-900"
                >
                    <span
                        aria-hidden="true"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-sm text-white"
                    >
                        🛡
                    </span>
                    <span>AI Security Armor</span>
                </Link>

                {/* Link điều hướng chính */}
                <ul className="hidden items-center gap-1 md:flex">
                    {NAV_LINKS.map((link) => {
                        const active = isActive(link.href, currentPath);
                        return (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    aria-current={active ? "page" : undefined}
                                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${active
                                        ? "bg-neutral-100 text-neutral-900"
                                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* Khu vực phải: auth / avatar */}
                <div className="flex items-center gap-2">
                    {session === null ? (
                        <>
                            <button
                                type="button"
                                onClick={() => onOpenAuth("login")}
                                className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                            >
                                Đăng nhập
                            </button>
                            <button
                                type="button"
                                onClick={() => onOpenAuth("register")}
                                className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                            >
                                Dùng thử ▶
                            </button>
                        </>
                    ) : (
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setMenuOpen((open) => !open)}
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                className="flex items-center gap-2 rounded-full border border-neutral-200 py-1 pl-1 pr-2 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50"
                            >
                                <span
                                    aria-hidden="true"
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white"
                                >
                                    {getInitials(session.user.displayName)}
                                </span>
                                <span aria-hidden="true">▾</span>
                            </button>

                            {menuOpen && (
                                <div
                                    role="menu"
                                    className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
                                >
                                    <Link
                                        href="/account"
                                        role="menuitem"
                                        onClick={() => setMenuOpen(false)}
                                        className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                                    >
                                        Tài khoản
                                    </Link>
                                    <Link
                                        href="/account/history"
                                        role="menuitem"
                                        onClick={() => setMenuOpen(false)}
                                        className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                                    >
                                        Lịch sử scan
                                    </Link>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onLogout();
                                        }}
                                        className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                                    >
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
}
