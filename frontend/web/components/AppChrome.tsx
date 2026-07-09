"use client";

/**
 * AppChrome — lớp "khung" client bọc mọi trang.
 *
 * `app/layout.tsx` là Server Component (giữ <html>/<body>/metadata) nên không
 * thể dùng hook. AppChrome là Client Component nối AuthContext với các
 * component trình bày (presentational) điều khiển bằng props:
 *   - `useAuth()` → session + logout.
 *   - `usePathname()` → currentPath cho NavigationBar (đánh dấu link active).
 *   - Quản lý trạng thái mở/đóng + chế độ của AuthModal bằng useState.
 *
 * Bố cục: NavigationBar (trên) → {children} (nội dung trang) → Footer (dưới),
 * đảm bảo Nav/Footer hiển thị trên MỌI trang (Requirements 17.1, 17.5).
 * AuthModal được gắn ở đây để bất kỳ trang nào cũng có thể yêu cầu đăng nhập
 * qua nút trên NavigationBar.
 *
 * _Requirements: 17.1, 17.5_
 */

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import NavigationBar from "@/components/NavigationBar";
import Footer from "@/components/Footer";
import AuthModal, { type AuthMode } from "@/components/AuthModal";

export interface AppChromeProps {
    children: ReactNode;
}

export default function AppChrome({ children }: AppChromeProps): JSX.Element {
    const { session, logout } = useAuth();
    const pathname = usePathname();

    // Trạng thái modal xác thực (mở/đóng + chế độ login|register).
    const [authOpen, setAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState<AuthMode>("login");

    // Mở modal ở chế độ tương ứng khi bấm "Đăng nhập"/"Dùng thử ▶".
    function handleOpenAuth(mode: AuthMode): void {
        setAuthMode(mode);
        setAuthOpen(true);
    }

    return (
        <div className="flex min-h-screen flex-col">
            <NavigationBar
                currentPath={pathname ?? "/"}
                session={session}
                onOpenAuth={handleOpenAuth}
                onLogout={() => {
                    void logout();
                }}
            />

            <main className="flex flex-1 flex-col">{children}</main>

            <Footer />

            <AuthModal
                open={authOpen}
                mode={authMode}
                onClose={() => setAuthOpen(false)}
                onModeChange={setAuthMode}
            />
        </div>
    );
}
