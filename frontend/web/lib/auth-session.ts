import type { Session } from "@/lib/types";

export const SESSION_STORAGE_KEY = "aisec:session";

export function readStoredAccessToken(): string | null {
    if (
        typeof window === "undefined" ||
        typeof window.localStorage === "undefined"
    ) {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;

        const session = JSON.parse(raw) as Partial<Session>;
        return typeof session.token === "string" && session.token.length > 0
            ? session.token
            : null;
    } catch {
        return null;
    }
}
