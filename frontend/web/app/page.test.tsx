import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import fc from "fast-check";
import HomePage from "./page";
import { AuthProvider } from "@/context/AuthContext";

describe("Toolchain smoke test", () => {
    it("renders the home page hero heading (Vitest + RTL + jsdom)", () => {
        // HomePage là Client Component dùng useAuth() nên phải bọc AuthProvider.
        render(
            <AuthProvider>
                <HomePage />
            </AuthProvider>
        );
        expect(
            screen.getByRole("heading", {
                name: /Bạn có chắc mình đang thấy toàn bộ sự thật\?/i,
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
