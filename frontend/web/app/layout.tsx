import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";
import AppChrome from "@/components/AppChrome";

export const metadata: Metadata = {
    title: "AI Security Armor — Lá chắn an ninh cho quy trình AI",
    description:
        "Đánh giá rủi ro URL và email tức thì với bằng chứng minh bạch. Web = thử nhanh, Extension = dùng thật.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="vi">
            <body>
                <AuthProvider>
                    <AppChrome>{children}</AppChrome>
                </AuthProvider>
            </body>
        </html>
    );
}
