/**
 * Footer — chân trang dùng chung mọi trang.
 *
 * Hiển thị logo nhỏ + danh sách liên kết chân trang. Nhận `links` tùy chọn;
 * nếu không truyền, dùng bộ mặc định (Home, Pricing, About, Privacy, Contact).
 *
 * _Requirements: 17.5_
 */

import Link from "next/link";

/** Một liên kết chân trang. */
export interface FooterLink {
    label: string;
    href: string;
}

export interface FooterProps {
    /** Danh sách liên kết chân trang; mặc định gồm 5 mục chuẩn. */
    links?: FooterLink[];
}

/** Bộ liên kết chân trang mặc định (tiếng Việt/nhãn ngắn khớp nav). */
const DEFAULT_LINKS: FooterLink[] = [
    { label: "Home", href: "/" },
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
    { label: "Privacy", href: "/privacy" },
    { label: "Contact", href: "/contact" },
];

export default function Footer({ links = DEFAULT_LINKS }: FooterProps) {
    const year = new Date().getFullYear();

    return (
        <footer className="mt-auto w-full border-t border-neutral-200 bg-neutral-50">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
                {/* Logo nhỏ */}
                <Link
                    href="/"
                    className="flex items-center gap-2 text-sm font-semibold text-neutral-800"
                >
                    <span
                        aria-hidden="true"
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-900 text-xs text-white"
                    >
                        🛡
                    </span>
                    <span>AI Security Armor</span>
                </Link>

                {/* Liên kết chân trang */}
                <nav aria-label="Liên kết chân trang">
                    <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                        {links.map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <p className="text-xs text-neutral-500">
                    © {year} AI Security Armor
                </p>
            </div>
        </footer>
    );
}
