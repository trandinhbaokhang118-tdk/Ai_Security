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

import { EyeScrollbar } from "@/components/PrewiseUI";

export interface AppChromeProps {
    children: ReactNode;
}

export default function AppChrome({ children }: AppChromeProps): JSX.Element {
    const pathname = usePathname();

    // The landing page retains only its dedicated visual scrollbar, not legacy chrome.
    if (pathname === "/") {
        return <>{children}<EyeScrollbar topOffset={88} bottomOffset={20} /></>;
    }

    return <>{children}</>;
}
