"use client";

/**
 * Root application chrome.
 *
 * Legacy global NavigationBar and Footer were retired. Each active product
 * surface now owns its own navigation (for example PrewiseShell's work rail),
 * so no old header/footer can reappear around a new analysis experience.
 */
import { type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { PrewiseShell } from "@/components/PrewiseUI";

export interface AppChromeProps {
    children: ReactNode;
}

export default function AppChrome({ children }: AppChromeProps): JSX.Element {
    const pathname = usePathname();

    // Keep the product work rail available from the landing page as well. The
    // landing page still owns its header and footer inside this shared shell.
    if (pathname === "/") {
        return <PrewiseShell>{children}</PrewiseShell>;
    }

    return <>{children}</>;
}
