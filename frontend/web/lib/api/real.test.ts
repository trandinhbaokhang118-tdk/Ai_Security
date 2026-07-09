import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_STORAGE_KEY } from "@/lib/auth-session";
import { RealApiClient } from "@/lib/api/real";


describe("RealApiClient authentication", () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.restoreAllMocks();
    });

    it("sends the stored Bearer token to protected account endpoints", async () => {
        window.localStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({ token: "session-token" }),
        );
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ key: "sk-dev-test", createdAt: "06/07 15:00" }),
        });
        vi.stubGlobal("fetch", fetchMock);

        await new RealApiClient().getApiKey();

        expect(fetchMock).toHaveBeenCalledWith(
            "http://localhost:8000/v1/account/api-key",
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: "Bearer session-token",
                }),
            }),
        );
    });

    it("keeps login public", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ token: "new-token", user: {}, plan: {} }),
        });
        vi.stubGlobal("fetch", fetchMock);

        await new RealApiClient().login({
            email: "demo@aisec.local",
            password: "Demo@123456",
        });

        const request = fetchMock.mock.calls[0][1] as RequestInit;
        expect(request.headers).not.toHaveProperty("Authorization");
    });
});
