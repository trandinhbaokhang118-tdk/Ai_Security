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

    it("sends EXE bytes only with the explicit provider consent flag", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true }),
        });
        vi.stubGlobal("fetch", fetchMock);
        const file = new File([new Uint8Array([0x4d, 0x5a])], "sample.exe", {
            type: "application/octet-stream",
        });

        await new RealApiClient().sandboxExecutable(file, true);

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("http://localhost:8000/v1/assess/file/exe-quick-scan");
        expect(request.method).toBe("POST");
        const form = request.body as FormData;
        expect(form.get("file")).toBe(file);
        expect(form.get("share_with_provider")).toBe("true");
    });

    it("polls the provider report through the encoded data id endpoint", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: "completed", data_id: "job=1" }),
        });
        vi.stubGlobal("fetch", fetchMock);

        await new RealApiClient().getExecutableProviderReport("job=1");

        expect(fetchMock).toHaveBeenCalledWith(
            "http://localhost:8000/v1/assess/file/exe-quick-scan/provider/job%3D1",
            expect.objectContaining({ method: "GET" }),
        );
    });
});
