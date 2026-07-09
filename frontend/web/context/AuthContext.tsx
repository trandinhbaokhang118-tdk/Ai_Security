"use client";

/**
 * AuthContext — ngữ cảnh client lưu phiên đăng nhập, gói và quota.
 *
 * Trách nhiệm (theo design.md — "Client State: AuthContext (session, plan,
 * quota)" và Sequence Diagram 3 — Đăng nhập & tải dữ liệu tài khoản):
 *   - Lưu `session` (Session | null) cùng `plan` (PlanInfo | null) suy ra từ session.
 *   - Cung cấp một `QuotaGuard` gắn với gói hiện tại; mặc định "free" khi chưa
 *     đăng nhập.
 *   - `setSession(session)`: cập nhật phiên, bền hóa vào localStorage.
 *   - `logout()`: gọi `api.logout()`, xóa phiên khỏi state + localStorage.
 *   - Khi mount: hydrate phiên từ localStorage (SSR-safe) để refresh vẫn giữ
 *     đăng nhập.
 *   - Hook `useAuth()` trả về { session, plan, quota, setSession, logout }.
 *
 * _Requirements: 11.2, 11.3_
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

import { getApiClient } from "@/lib/api";
import { SESSION_STORAGE_KEY } from "@/lib/auth-session";
import { QuotaGuard } from "@/lib/quota";
import type { PlanInfo, PlanTier, Session } from "@/lib/types";

export { SESSION_STORAGE_KEY } from "@/lib/auth-session";

/** Gói mặc định khi chưa đăng nhập. */
const DEFAULT_PLAN_TIER: PlanTier = "free";

/** Giá trị mà context cung cấp cho toàn ứng dụng. */
export interface AuthContextValue {
    /** Phiên hiện tại, hoặc null khi chưa đăng nhập. */
    session: Session | null;
    /** Thông tin gói suy ra từ phiên; null khi chưa đăng nhập. */
    plan: PlanInfo | null;
    /** QuotaGuard gắn với gói hiện tại (mặc định "free" khi chưa đăng nhập). */
    quota: QuotaGuard;
    /** Đặt phiên mới và bền hóa vào localStorage. */
    setSession: (session: Session | null) => void;
    /** Đăng xuất: gọi api.logout(), xóa phiên khỏi state + localStorage. */
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Kiểm tra có localStorage khả dụng (tránh lỗi khi SSR). */
function hasBrowserStorage(): boolean {
    return (
        typeof window !== "undefined" &&
        typeof window.localStorage !== "undefined"
    );
}

/** Đọc phiên đã lưu từ localStorage; trả null nếu không có/không hợp lệ. */
function readStoredSession(): Session | null {
    if (!hasBrowserStorage()) {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as Partial<Session>;
        // Kiểm tra tối thiểu cấu trúc để coi là phiên hợp lệ.
        if (
            parsed &&
            typeof parsed.token === "string" &&
            parsed.user != null &&
            parsed.plan != null
        ) {
            return parsed as Session;
        }
        return null;
    } catch {
        // Dữ liệu hỏng hoặc localStorage bị chặn → coi như chưa đăng nhập.
        return null;
    }
}

/** Ghi phiên vào localStorage; xóa khóa khi session là null. */
function writeStoredSession(session: Session | null): void {
    if (!hasBrowserStorage()) {
        return;
    }
    try {
        if (session === null) {
            window.localStorage.removeItem(SESSION_STORAGE_KEY);
        } else {
            window.localStorage.setItem(
                SESSION_STORAGE_KEY,
                JSON.stringify(session),
            );
        }
    } catch {
        // localStorage đầy/bị chặn → bỏ qua, vẫn giữ trạng thái in-memory.
    }
}

/** Props cho AuthProvider. */
export interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Provider bọc toàn ứng dụng, cung cấp session/plan/quota và các hành động.
 */
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
    // Khởi tạo null để server và client render nhất quán (tránh hydration mismatch);
    // phiên thực được nạp trong useEffect sau khi mount.
    const [session, setSessionState] = useState<Session | null>(null);

    // Gói suy ra từ phiên (nguồn duy nhất là session.plan).
    const plan: PlanInfo | null = session?.plan ?? null;
    const tier: PlanTier = plan?.tier ?? DEFAULT_PLAN_TIER;

    // QuotaGuard gắn với gói hiện tại. Giữ một instance ổn định qua các lần
    // render và chỉ đổi gói (setPlan) khi tier thay đổi, để không mất số lượt
    // đã dùng trong ngày.
    const quotaRef = useRef<QuotaGuard | null>(null);
    if (quotaRef.current === null) {
        quotaRef.current = new QuotaGuard(tier);
    }
    const quota = quotaRef.current;

    // Đồng bộ gói của QuotaGuard khi tier đổi (đăng nhập/đăng xuất/nâng cấp).
    useEffect(() => {
        quota.setPlan(tier);
    }, [quota, tier]);

    // Hydrate phiên từ localStorage sau khi mount (SSR-safe).
    useEffect(() => {
        const stored = readStoredSession();
        if (stored !== null) {
            setSessionState(stored);
        }
    }, []);

    // Đặt phiên mới và bền hóa vào localStorage.
    const setSession = useCallback((next: Session | null): void => {
        setSessionState(next);
        writeStoredSession(next);
    }, []);

    // Đăng xuất: gọi api.logout(), rồi xóa phiên khỏi state + localStorage.
    const logout = useCallback(async (): Promise<void> => {
        try {
            await getApiClient().logout();
        } finally {
            // Luôn xóa phiên phía client kể cả khi logout API lỗi.
            setSessionState(null);
            writeStoredSession(null);
        }
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({ session, plan, quota, setSession, logout }),
        [session, plan, quota, setSession, logout],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

/**
 * Hook truy cập AuthContext.
 *
 * @throws Error nếu được gọi ngoài `AuthProvider`.
 * @returns { session, plan, quota, setSession, logout }
 */
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (ctx === null) {
        throw new Error("useAuth phải được dùng bên trong <AuthProvider>");
    }
    return ctx;
}
