"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Language = "vi" | "en";

const STORAGE_KEY = "prewise-language";
const SETTINGS_KEY = "prewise-settings";
const LANGUAGE_EVENT = "prewise-language-change";

const ENGLISH_TRANSLATIONS: Record<string, string> = {
  "Bỏ qua đến nội dung chính": "Skip to main content",
  "Điều hướng chức năng": "Feature navigation",
  "Phân tích": "Analyze",
  "Phân tích mới": "New analysis",
  "Mở chức năng phân tích": "Open analysis",
  "Lịch sử": "History",
  "Mở lịch sử phân tích": "Open analysis history",
  "Minh bạch": "Transparency",
  "Mở thông tin minh bạch": "Open transparency information",
  "Quản lý API key": "Manage API key",
  "Tải ứng dụng & tiện ích": "Download apps & extensions",
  "Tải ứng dụng và tiện ích mở rộng": "Download apps and browser extensions",
  "Môi trường giả lập Windows": "Windows sandbox",
  "Mở môi trường giả lập Windows": "Open Windows sandbox",
  "Mở menu tài khoản": "Open account menu",
  "Người dùng Prewise": "Prewise user",
  "Tài khoản cá nhân": "Personal account",
  "Tài khoản": "Account",
  "Gói dịch vụ": "Plans",
  "Cài đặt": "Settings",
  "Về trang chủ": "Back to home",
  "Nghiêm trọng": "Critical",
  "Cao": "High",
  "Trung bình": "Medium",
  "Thấp": "Low",
  "An toàn": "Safe",
  "Ngôn ngữ hiện tại": "Current language",
  "Tiếng Việt": "Vietnamese",
  "tiếng Việt": "Vietnamese",
  "tiếng Anh": "English",
  "Chuyển sang": "Switch to",
  "Đã lưu thay đổi": "Changes saved",
  "Đã xóa toàn bộ lịch sử cục bộ": "All local history has been deleted",
  "Điều chỉnh Prewise theo cách bạn đọc, làm việc và bảo vệ dữ liệu.": "Adjust Prewise to how you read, work, and protect data.",
  "Danh mục cài đặt": "Settings categories",
  "Giao diện": "Appearance",
  "Quyền riêng tư": "Privacy",
  "Dữ liệu": "Data",
  "Ngôn ngữ": "Language",
  "Chuyển động": "Motion",
  "Điều chỉnh animation và hiệu ứng không gian.": "Adjust animations and spatial effects.",
  "Đầy đủ": "Full",
  "Cinematic và phản hồi vật lý": "Cinematic with physical feedback",
  "Cân bằng": "Balanced",
  "Mượt mà, tối ưu hiệu năng": "Smooth and performance-optimized",
  "Tối giản": "Reduced",
  "Chỉ chuyển trạng thái thiết yếu": "Essential transitions only",
  "Mật độ giao diện": "Interface density",
  "Khoảng cách giữa các thành phần trong workspace.": "Spacing between workspace elements.",
  "Thoải mái": "Comfortable",
  "Gọn": "Compact",
  "Lưu lịch sử trên thiết bị": "Save history on this device",
  "Giữ tối đa 20 lần phân tích gần nhất trong trình duyệt.": "Keep up to 20 recent analyses in this browser.",
  "Che dữ liệu nhạy cảm": "Mask sensitive data",
  "Ẩn mật khẩu, OTP và thông tin thanh toán trong bản xem trước.": "Hide passwords, OTPs, and payment details in previews.",
  "Dữ liệu thuộc quyền kiểm soát của bạn": "Your data stays under your control",
  "Prewise không dùng webcam hoặc microphone. Nội dung chỉ được xử lý khi bạn chủ động nhấn Phân tích.": "Prewise does not use your webcam or microphone. Content is processed only when you choose Analyze.",
  "Dữ liệu được lưu cục bộ": "Locally stored data",
  "Lịch sử phân tích và tùy chọn giao diện được lưu trong trình duyệt này. Chúng không tự đồng bộ sang thiết bị khác.": "Analysis history and interface preferences are stored in this browser. They are not automatically synced to other devices.",
  "Xóa lịch sử phân tích": "Delete analysis history",
  "Thao tác này không thể hoàn tác.": "This action cannot be undone.",
  "Hủy": "Cancel",
  "Xác nhận xóa": "Confirm deletion",
  "Xóa dữ liệu": "Delete data",
  "Ngôn ngữ giao diện": "Interface language",
  "Lựa chọn được lưu cho các phiên truy cập tiếp theo.": "Your choice is saved for future visits.",
  "Interface preference": "Interface preference",
  "Bản dịch tiếng Anh đầy đủ sẽ được áp dụng khi gói ngôn ngữ hoàn tất.": "English is fully available across the website.",
  "Lịch sử phân tích": "Analysis history",
  "Các lần kiểm tra được lưu cục bộ trên thiết bị này để bạn có thể xem lại.": "Checks are stored locally on this device so you can review them.",
  "Tìm theo nội dung hoặc loại…": "Search by content or type…",
  "Tất cả": "All",
  "Website": "Website",
  "Không tìm thấy kết quả": "No results found",
  "Chưa có tín hiệu nào": "No signals yet",
  "Hãy thử từ khóa hoặc bộ lọc khác.": "Try another keyword or filter.",
  "Những lần phân tích của bạn sẽ xuất hiện ở đây. Dữ liệu demo chỉ lưu trên trình duyệt.": "Your analyses will appear here. Demo data is stored only in this browser.",
  "Bắt đầu phân tích →": "Start analyzing →",
  "Minh bạch, không phải hộp đen.": "Transparent, not a black box.",
  "Prewise giải thích cách từng tín hiệu đóng góp vào kết quả — và luôn nói rõ những điều hệ thống chưa chắc chắn.": "Prewise explains how every signal contributes to the result—and clearly states what remains uncertain.",
  "Cách đọc kết quả": "How to read results",
  "Quy trình đánh giá": "Assessment process",
  "Giới hạn": "Limitations",
  "Một điểm số không phải là một phán quyết.": "A score is not a verdict.",
  "Điểm rủi ro từ 0 đến 100 biểu thị cường độ của các tín hiệu nguy hiểm được phát hiện. Điểm càng cao, người dùng càng nên thận trọng.": "A risk score from 0 to 100 reflects the strength of detected danger signals. The higher the score, the more cautious you should be.",
  "Từ nội dung thô đến bằng chứng.": "From raw content to evidence.",
  "Chuẩn hóa": "Normalize",
  "Bảo toàn ngữ cảnh của URL, email và tin nhắn.": "Preserve the context of URLs, emails, and messages.",
  "Phát hiện": "Detect",
  "Nhận diện giả mạo, thúc ép và thu thập dữ liệu.": "Identify impersonation, pressure tactics, and data harvesting.",
  "Đối chiếu": "Correlate",
  "Liên kết từng kết luận với bằng chứng cụ thể.": "Link every conclusion to specific evidence.",
  "AI có thể sai.": "AI can be wrong.",
  "Website mới, ngữ cảnh thiếu hoặc kỹ thuật tấn công chưa từng thấy có thể tạo ra kết quả không chính xác. Hãy coi Prewise là lớp hỗ trợ quyết định và luôn xác minh qua kênh chính thức.": "New websites, missing context, or unseen attack techniques can produce inaccurate results. Treat Prewise as decision support and always verify through official channels.",
  "Bạn kiểm soát dữ liệu của mình.": "You control your data.",
  "Nội dung chỉ được gửi khi bạn chủ động nhấn Phân tích. Webcam và microphone không được sử dụng. Lịch sử bản demo được lưu cục bộ và có thể xóa bất kỳ lúc nào.": "Content is sent only when you choose Analyze. Webcam and microphone are never used. Demo history is stored locally and can be deleted at any time.",
  "Phân tích tín hiệu": "Analyze a signal",
  "Phân tích thật": "Live analysis",
  "Loại nội dung": "Content type",
  "Tin nhắn": "Message",
  "Nội dung cần kiểm tra": "Content to inspect",
  "Không dán mật khẩu, mã OTP, mã khôi phục hoặc dữ liệu tài chính bí mật.": "Do not paste passwords, OTPs, recovery codes, or confidential financial data.",
  "Cách Prewise xử lý dữ liệu": "How Prewise processes data",
  "Website / URL được gửi đến Security Gateway để phân tích thật. Khi chọn Chuyên sâu, URL được kiểm tra trong browser sandbox cô lập bằng dữ liệu canary tổng hợp.": "The website or URL is sent to the Security Gateway for live analysis. In Deep mode, it is inspected in an isolated browser sandbox using synthetic canary data.",
  "ký tự": "characters",
  "Đang kiểm tra:": "Checking:",
  "Phạm vi phân tích": "Analysis scope",
  "Dấu hiệu lừa đảo": "Scam indicators",
  "Độ tin cậy & giả mạo": "Trust & impersonation",
  "Dữ liệu nhạy cảm": "Sensitive data",
  "Thao túng & thúc ép": "Manipulation & pressure",
  "Bật hoặc tắt": "Toggle",
  "Mức độ phân tích": "Analysis depth",
  "Nhanh": "Quick",
  "Chuyên sâu": "Deep",
  "Chuyên sâu sẽ chạy browser sandbox cô lập; không gửi dữ liệu thật vào biểu mẫu.": "Deep mode runs an isolated browser sandbox and never submits real data to forms.",
  "URL được xử lý khi bạn chọn phân tích. Kết quả hiển thị là phản hồi trực tiếp từ backend, không phải điểm cố định của giao diện.": "The URL is processed when you choose Analyze. Results come directly from the backend and are not hard-coded UI scores.",
  "Phân tích nội dung": "Analyze content",
  "Đang mở không gian phân tích…": "Opening analysis workspace…",
  "Chuẩn hóa URL": "Normalizing URL",
  "Phân tích tên miền và giả mạo": "Analyzing domain and impersonation",
  "Chấm điểm rủi ro": "Scoring risk",
  "Tổng hợp bằng chứng": "Compiling evidence",
  "Hãy dán URL, email hoặc tin nhắn cần kiểm tra rồi thử lại.": "Paste a URL, email, or message to inspect, then try again.",
  "Luồng kiểm tra thật hiện đã được bật cho Website / URL. Email và SMS sẽ được kết nối ở bước tiếp theo.": "Live inspection is currently available for websites and URLs. Email and SMS support is coming next.",
  "Máy chủ không thể phân tích URL này.": "The server could not analyze this URL.",
  "Không thể kết nối dịch vụ phân tích.": "Could not connect to the analysis service.",
  "Về chúng tôi": "About us",
  "Vì sao chúng tôi xây sản phẩm này": "Why we built this product",
  "Prompt injection = phishing dành cho AI.": "Prompt injection is phishing for AI.",
  "Mô hình mối đe dọa": "Threat model",
  "Kẻ tấn công": "Attacker",
  "Nội dung độc hại": "Malicious content",
  "Người": "Human",
  "Đội ngũ": "Team",
  "Công nghệ": "Technology",
  "Nền tảng được xây trên các công nghệ ML và hạ tầng hiện đại.": "The platform is built with modern ML and infrastructure technologies.",
  "Mở demo kỹ thuật": "Open technical demo"
};

const normalizedTranslations = new Map(
  Object.entries(ENGLISH_TRANSLATIONS).map(([source, target]) => [normalize(source), target]),
);

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function translateText(value: string): string | null {
  const normalized = normalize(value);
  if (!normalized) return null;
  const exact = normalizedTranslations.get(normalized);
  if (exact) return value.replace(normalized, exact);

  let translated = value;
  let changed = false;
  const entries = [...Object.entries(ENGLISH_TRANSLATIONS)].sort((a, b) => b[0].length - a[0].length);
  for (const [source, target] of entries) {
    if (translated.includes(source)) {
      translated = translated.split(source).join(target);
      changed = true;
    }
  }
  return changed ? translated : null;
}

function translateDocument(language: Language): void {
  const root = document.body;
  if (!root) return;
  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style, textarea, [data-i18n-ignore]")) return NodeFilter.FILTER_REJECT;
      return normalize(node.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const textNodes: Text[] = [];
  while (textWalker.nextNode()) textNodes.push(textWalker.currentNode as Text);
  for (const node of textNodes) {
    const element = node.parentElement;
    if (!element) continue;
    if (language === "en") {
      if (!node.parentElement?.dataset.i18nOriginalText) node.parentElement!.dataset.i18nOriginalText = node.nodeValue || "";
      const translated = translateText(node.nodeValue || "");
      if (translated) node.nodeValue = translated;
    } else if (element.dataset.i18nOriginalText !== undefined) {
      node.nodeValue = element.dataset.i18nOriginalText;
      delete element.dataset.i18nOriginalText;
    }
  }

  for (const element of root.querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label]")) {
    for (const attribute of ["placeholder", "title", "aria-label"] as const) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const backup = `i18nOriginal${attribute.replace("-", "")}`;
      if (language === "en") {
        if (!element.dataset[backup]) element.dataset[backup] = value;
        const translated = translateText(value);
        if (translated) element.setAttribute(attribute, translated);
      } else if (element.dataset[backup]) {
        element.setAttribute(attribute, element.dataset[backup]);
        delete element.dataset[backup];
      }
    }
  }
}

function readLanguage(): Language {
  if (typeof window === "undefined") return "vi";
  const direct = localStorage.getItem(STORAGE_KEY);
  if (direct === "en" || direct === "vi") return direct;
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    return settings?.language === "en" ? "en" : "vi";
  } catch {
    return "vi";
  }
}

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; toggleLanguage: () => void };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("vi");

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    localStorage.setItem(STORAGE_KEY, next);
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, language: next }));
    } catch { /* Ignore unavailable or invalid storage. */ }
    document.documentElement.lang = next;
    document.documentElement.dataset.language = next;
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: next }));
  }, []);

  useEffect(() => {
    const initial = readLanguage();
    setLanguageState(initial);
    document.documentElement.lang = initial;
    document.documentElement.dataset.language = initial;
  }, []);

  useEffect(() => {
    let scheduled = false;
    const apply = () => {
      scheduled = false;
      translateDocument(language);
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(apply);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage(language === "vi" ? "en" : "vi"),
  }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
