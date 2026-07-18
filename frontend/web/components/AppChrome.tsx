"use client";

/**
 * Root application chrome.
 *
 * Legacy global NavigationBar and Footer were retired. Each active product
 * surface now owns its own navigation (for example PrewiseShell's work rail),
 * so no old header/footer can reappear around a new analysis experience.
 */
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { EyeScrollbar } from "@/components/PrewiseUI";
import { useAuth } from "@/context/AuthContext";

export interface AppChromeProps {
    children: ReactNode;
}

export default function AppChrome({ children }: AppChromeProps): JSX.Element {
    const pathname = usePathname();
    const router = useRouter();
    const { session, isHydrated } = useAuth();
    const isPublicPage = ["/", "/auth", "/about", "/methodology", "/downloads", "/pricing"].includes(pathname);

    useEffect(() => {
        if (!isPublicPage && isHydrated && session === null) {
            const next = `${pathname}${window.location.search}`;
            router.replace(`/auth?next=${encodeURIComponent(next)}`);
        }
    }, [isHydrated, isPublicPage, pathname, router, session]);

    if (!isPublicPage && (!isHydrated || session === null)) {
        return <main aria-busy="true" />;
    }

    // The landing page retains only its dedicated visual scrollbar, not legacy chrome.
    if (pathname === "/") {
        return <>{children}<EyeScrollbar topOffset={88} bottomOffset={20} /></>;
    }

    return <>{children}</>;
}
