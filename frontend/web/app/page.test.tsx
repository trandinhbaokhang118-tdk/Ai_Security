import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import fc from "fast-check";
import HomePage from "./page";
import { AuthProvider } from "@/context/AuthContext";

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        refresh: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        prefetch: vi.fn(),
    }),
}));

describe("Toolchain smoke test", () => {
    it("renders the home page heading (Vitest + RTL + jsdom)", () => {
        // HomePage là Client Component dùng useAuth() nên phải bọc AuthProvider.
        render(
            <AuthProvider>
                <HomePage />
            </AuthProvider>
        );
        expect(
            screen.getByRole("heading", {
                name: /Bạn có chắc mình đang thấy toàn bộ sự thật/i,
            })
        ).toBeInTheDocument();
    });

    it("fast-check is wired up and runs properties", () => {
        fc.assert(
            fc.property(fc.integer(), fc.integer(), (a, b) => {
                return a + b === b + a;
            }),
            { numRuns: 100 }
        );
    });
});
