import type { Metadata } from "next";
import "./globals.css";
import "./witness.css";
import "./threat-effects.css";
import "./phish-effects.css";
import "./phish-visibility.css";
import "./alarm-effects.css";
import "./footer.css";
import "./scroll-fix.css";
import "./organic-eye.css";
import "./eye-v2.css";
import "./hero-cta.css";
import "./evidence-effects.css";
import "./gaze-safe.css";
import { AuthProvider } from "@/context/AuthContext";
import AppChrome from "@/components/AppChrome";

export const metadata: Metadata = {
  metadataBase: new URL("https://prewise.xyz"),
  title: { default: "Prewise — Thấy rõ rủi ro trước khi quá muộn", template: "%s · Prewise" },
  description: "Phân tích website, email và tin nhắn để phát hiện dấu hiệu lừa đảo, giả mạo và dữ liệu nhạy cảm.",
  applicationName: "Prewise",
  authors: [{ name: "Nguyễn Duy Thuận" }, { name: "Trần Đình Bảo Khang" }],
  keywords: ["Prewise", "phishing detection", "scam detection", "AI security", "an toàn trực tuyến"],
  openGraph: { type: "website", locale: "vi_VN", alternateLocale: "en_US", siteName: "Prewise", title: "Prewise — See the risk before it is too late", description: "Explainable scam analysis for websites, emails and messages." },
  robots: { index: true, follow: true },
};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="vi" suppressHydrationWarning><body suppressHydrationWarning><AuthProvider><AppChrome>{children}</AppChrome></AuthProvider></body></html>}
