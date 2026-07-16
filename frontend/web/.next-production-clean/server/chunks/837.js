exports.id = 837;
exports.ids = [837];
exports.modules = {

/***/ 7249:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 68977));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 80452));


/***/ }),

/***/ 10855:
/***/ (() => {



/***/ }),

/***/ 12563:
/***/ (() => {



/***/ }),

/***/ 12622:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A: () => (/* binding */ useAuth),
/* harmony export */   AuthProvider: () => (/* binding */ AuthProvider)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(21124);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(38301);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lib_api__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(57125);
/* harmony import */ var _lib_auth_session__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(50224);
/* harmony import */ var _lib_quota__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(84567);
/* __next_internal_client_entry_do_not_use__ SESSION_STORAGE_KEY,AuthProvider,useAuth auto */ 
/**
 * AuthContext — ngữ cảnh client lưu phiên đăng nhập, gói và quota.
 *
 * Trách nhiệm (theo design.md — "Client State: AuthContext (session, plan,
 * quota)" và Sequence Diagram 3 — Đăng nhập & tải dữ liệu tài khoản):
 *   - Lưu `session` (Session | null) cùng `plan` (PlanInfo | null) suy ra từ session.
 *   - Cung cấp một `QuotaGuard` gắn với gói hiện tại; mặc định "free" khi chưa
 *     đăng nhập.
 *   - `setSession(session)`: cập nhật phiên, bền hóa vào localStorage.
 *   - `logout()`: gọi `api.logout()`, xóa phiên khỏi state + localStorage.
 *   - Khi mount: hydrate phiên từ localStorage (SSR-safe) để refresh vẫn giữ
 *     đăng nhập.
 *   - Hook `useAuth()` trả về { session, plan, quota, setSession, logout }.
 *
 * _Requirements: 11.2, 11.3_
 */ 




/** Gói mặc định khi chưa đăng nhập. */ const DEFAULT_PLAN_TIER = "free";
const AuthContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)(null);
/** Kiểm tra có localStorage khả dụng (tránh lỗi khi SSR). */ function hasBrowserStorage() {
    return  false && 0;
}
/** Đọc phiên đã lưu từ localStorage; trả null nếu không có/không hợp lệ. */ function readStoredSession() {
    if (!hasBrowserStorage()) {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(_lib_auth_session__WEBPACK_IMPORTED_MODULE_3__/* .SESSION_STORAGE_KEY */ .J);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        // Kiểm tra tối thiểu cấu trúc để coi là phiên hợp lệ.
        if (parsed && typeof parsed.token === "string" && parsed.user != null && parsed.plan != null) {
            return parsed;
        }
        return null;
    } catch  {
        // Dữ liệu hỏng hoặc localStorage bị chặn → coi như chưa đăng nhập.
        return null;
    }
}
/** Ghi phiên vào localStorage; xóa khóa khi session là null. */ function writeStoredSession(session) {
    if (!hasBrowserStorage()) {
        return;
    }
    try {
        if (session === null) {
            window.localStorage.removeItem(_lib_auth_session__WEBPACK_IMPORTED_MODULE_3__/* .SESSION_STORAGE_KEY */ .J);
        } else {
            window.localStorage.setItem(_lib_auth_session__WEBPACK_IMPORTED_MODULE_3__/* .SESSION_STORAGE_KEY */ .J, JSON.stringify(session));
        }
    } catch  {
    // localStorage đầy/bị chặn → bỏ qua, vẫn giữ trạng thái in-memory.
    }
}
/**
 * Provider bọc toàn ứng dụng, cung cấp session/plan/quota và các hành động.
 */ function AuthProvider({ children }) {
    // Khởi tạo null để server và client render nhất quán (tránh hydration mismatch);
    // phiên thực được nạp trong useEffect sau khi mount.
    const [session, setSessionState] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
    // Gói suy ra từ phiên (nguồn duy nhất là session.plan).
    const plan = session?.plan ?? null;
    const tier = plan?.tier ?? DEFAULT_PLAN_TIER;
    // QuotaGuard gắn với gói hiện tại. Giữ một instance ổn định qua các lần
    // render và chỉ đổi gói (setPlan) khi tier thay đổi, để không mất số lượt
    // đã dùng trong ngày.
    const quotaRef = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
    if (quotaRef.current === null) {
        quotaRef.current = new _lib_quota__WEBPACK_IMPORTED_MODULE_4__/* .QuotaGuard */ .Mt(tier);
    }
    const quota = quotaRef.current;
    // Đồng bộ gói của QuotaGuard khi tier đổi (đăng nhập/đăng xuất/nâng cấp).
    process.env.__NEXT_PRIVATE_MINIMIZE_MACRO_FALSE && (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
        quota.setPlan(tier);
    }, [
        quota,
        tier
    ]);
    // Hydrate phiên từ localStorage sau khi mount (SSR-safe).
    process.env.__NEXT_PRIVATE_MINIMIZE_MACRO_FALSE && (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
        const stored = readStoredSession();
        if (stored !== null) {
            setSessionState(stored);
        }
    }, []);
    // Đặt phiên mới và bền hóa vào localStorage.
    const setSession = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)((next)=>{
        setSessionState(next);
        writeStoredSession(next);
    }, []);
    // Đăng xuất: gọi api.logout(), rồi xóa phiên khỏi state + localStorage.
    const logout = (0,react__WEBPACK_IMPORTED_MODULE_1__.useCallback)(async ()=>{
        try {
            await (0,_lib_api__WEBPACK_IMPORTED_MODULE_2__/* .getApiClient */ .e)().logout();
        } finally{
            // Luôn xóa phiên phía client kể cả khi logout API lỗi.
            setSessionState(null);
            writeStoredSession(null);
        }
    }, []);
    const value = (0,react__WEBPACK_IMPORTED_MODULE_1__.useMemo)(()=>({
            session,
            plan,
            quota,
            setSession,
            logout
        }), [
        session,
        plan,
        quota,
        setSession,
        logout
    ]);
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(AuthContext.Provider, {
        value: value,
        children: children
    });
}
/**
 * Hook truy cập AuthContext.
 *
 * @throws Error nếu được gọi ngoài `AuthProvider`.
 * @returns { session, plan, quota, setSession, logout }
 */ function useAuth() {
    const ctx = (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(AuthContext);
    if (ctx === null) {
        throw new Error("useAuth phải được dùng bên trong <AuthProvider>");
    }
    return ctx;
}


/***/ }),

/***/ 13232:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   EQ: () => (/* binding */ getRiskLevel),
/* harmony export */   QB: () => (/* binding */ getRiskColorToken)
/* harmony export */ });
/* unused harmony exports RISK_COLOR_TOKENS, RISK_LEVELS */
/**
 * Module thang màu rủi ro — NGUỒN DUY NHẤT ánh xạ điểm → mức/màu/nhãn.
 *
 * Mọi component (RiskBadge, EvidencePanel, Lịch sử scan, Hero...) PHẢI gọi
 * `getRiskLevel(score)` thay vì tự tính ngưỡng riêng, để đảm bảo thang màu
 * nhất quán trên toàn ứng dụng (khớp wireframe & Extension badge):
 *
 *   - safe   (Xanh)  : điểm 0–39   → "AN TOÀN"    ✅
 *   - warn   (Vàng)  : điểm 40–69  → "ĐÁNG NGỜ"   ⚠
 *   - danger (Đỏ)    : điểm 70–100 → "RỦI RO CAO" ⛔
 *
 * Hàm thuần, tất định (cùng input → cùng output), không side-effect.
 *
 * _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
 */ /**
 * Bảng token màu Tailwind theo mức rủi ro.
 *
 * Khớp chính xác các token khai báo trong `tailwind.config.ts`:
 *   risk.safe / risk.warn / risk.danger, mỗi nhóm có DEFAULT / fg / bg / border.
 * Component tái sử dụng bảng này để tô màu nhất quán mà không hard-code màu.
 */ const RISK_COLOR_TOKENS = {
    safe: {
        token: "risk-safe",
        text: "text-risk-safe",
        textFg: "text-risk-safe-fg",
        bg: "bg-risk-safe-bg",
        bgSolid: "bg-risk-safe",
        border: "border-risk-safe-border"
    },
    warn: {
        token: "risk-warn",
        text: "text-risk-warn",
        textFg: "text-risk-warn-fg",
        bg: "bg-risk-warn-bg",
        bgSolid: "bg-risk-warn",
        border: "border-risk-warn-border"
    },
    danger: {
        token: "risk-danger",
        text: "text-risk-danger",
        textFg: "text-risk-danger-fg",
        bg: "bg-risk-danger-bg",
        bgSolid: "bg-risk-danger",
        border: "border-risk-danger-border"
    }
};
// ---------------------------------------------------------------------------
// Định nghĩa các mức rủi ro (bất biến)
// ---------------------------------------------------------------------------
/**
 * Ngưỡng & thuộc tính cố định cho từng mức rủi ro.
 *
 * Các khoảng phủ kín và không chồng lấn toàn bộ [0, 100]:
 *   safe [0,39] · warn [40,69] · danger [70,100].
 */ const RISK_LEVELS = {
    safe: {
        key: "safe",
        label: "AN TOÀN",
        color: RISK_COLOR_TOKENS.safe.token,
        icon: "✅",
        min: 0,
        max: 39
    },
    warn: {
        key: "warn",
        label: "ĐÁNG NGỜ",
        color: RISK_COLOR_TOKENS.warn.token,
        icon: "⚠",
        min: 40,
        max: 69
    },
    danger: {
        key: "danger",
        label: "RỦI RO CAO",
        color: RISK_COLOR_TOKENS.danger.token,
        icon: "⛔",
        min: 70,
        max: 100
    }
};
// ---------------------------------------------------------------------------
// getRiskLevel — hàm thuần, tất định
// ---------------------------------------------------------------------------
/**
 * Ánh xạ một điểm rủi ro `score` (0..100) sang mức rủi ro tương ứng.
 *
 * Thang chuẩn (nguồn duy nhất):
 *   - [0, 39]   → safe   ("AN TOÀN",    ✅)
 *   - [40, 69]  → warn   ("ĐÁNG NGỜ",   ⚠)
 *   - [70, 100] → danger ("RỦI RO CAO", ⛔)
 *
 * **Preconditions**: `0 ≤ score ≤ 100` (và `score` là số hữu hạn).
 * **Postconditions**: trả đúng một mức; `result.min ≤ score ≤ result.max`;
 * hàm thuần, tất định (cùng `score` luôn cho cùng kết quả).
 *
 * @param score Điểm rủi ro trong khoảng [0, 100].
 * @returns Mức rủi ro (`RiskLevel`) kèm nhãn/icon/màu và biên min/max.
 * @throws {RangeError} khi `score` nằm ngoài [0, 100] hoặc không phải số hữu hạn
 *   (vi phạm tiền điều kiện — Requirement 1.6).
 */ function getRiskLevel(score) {
    if (!Number.isFinite(score) || score < 0 || score > 100) {
        throw new RangeError(`Risk_Score không hợp lệ: ${score}. Yêu cầu 0 ≤ score ≤ 100.`);
    }
    if (score <= 39) {
        return RISK_LEVELS.safe;
    }
    if (score <= 69) {
        return RISK_LEVELS.warn;
    }
    return RISK_LEVELS.danger;
}
/**
 * Tiện ích: lấy bảng token màu Tailwind cho một mức rủi ro theo `key`.
 *
 * @param key Khóa mức rủi ro (`safe` | `warn` | `danger`).
 * @returns Bộ class/token màu Tailwind tương ứng.
 */ function getRiskColorToken(key) {
    return RISK_COLOR_TOKENS[key];
}


/***/ }),

/***/ 14543:
/***/ (() => {



/***/ }),

/***/ 16383:
/***/ (() => {



/***/ }),

/***/ 16953:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ RootLayout),
/* harmony export */   metadata: () => (/* binding */ metadata)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(75338);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _globals_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(82704);
/* harmony import */ var _globals_css__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_globals_css__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _witness_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(19093);
/* harmony import */ var _witness_css__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_witness_css__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _threat_effects_css__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(12563);
/* harmony import */ var _threat_effects_css__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_threat_effects_css__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _phish_effects_css__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(37877);
/* harmony import */ var _phish_effects_css__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_phish_effects_css__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _phish_visibility_css__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(25563);
/* harmony import */ var _phish_visibility_css__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_phish_visibility_css__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _alarm_effects_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(38082);
/* harmony import */ var _alarm_effects_css__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_alarm_effects_css__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var _footer_css__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(16383);
/* harmony import */ var _footer_css__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(_footer_css__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var _scroll_fix_css__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(14543);
/* harmony import */ var _scroll_fix_css__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(_scroll_fix_css__WEBPACK_IMPORTED_MODULE_8__);
/* harmony import */ var _organic_eye_css__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(76291);
/* harmony import */ var _organic_eye_css__WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(_organic_eye_css__WEBPACK_IMPORTED_MODULE_9__);
/* harmony import */ var _eye_v2_css__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(99038);
/* harmony import */ var _eye_v2_css__WEBPACK_IMPORTED_MODULE_10___default = /*#__PURE__*/__webpack_require__.n(_eye_v2_css__WEBPACK_IMPORTED_MODULE_10__);
/* harmony import */ var _hero_cta_css__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(10855);
/* harmony import */ var _hero_cta_css__WEBPACK_IMPORTED_MODULE_11___default = /*#__PURE__*/__webpack_require__.n(_hero_cta_css__WEBPACK_IMPORTED_MODULE_11__);
/* harmony import */ var _evidence_effects_css__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(72184);
/* harmony import */ var _evidence_effects_css__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(_evidence_effects_css__WEBPACK_IMPORTED_MODULE_12__);
/* harmony import */ var _gaze_safe_css__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(35475);
/* harmony import */ var _gaze_safe_css__WEBPACK_IMPORTED_MODULE_13___default = /*#__PURE__*/__webpack_require__.n(_gaze_safe_css__WEBPACK_IMPORTED_MODULE_13__);
/* harmony import */ var _context_AuthContext__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(80452);
/* harmony import */ var _components_AppChrome__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(68977);
















const metadata = {
    metadataBase: new URL("https://prewise.xyz"),
    title: {
        default: "Prewise — Thấy rõ rủi ro trước khi quá muộn",
        template: "%s · Prewise"
    },
    description: "Phân tích website, email và tin nhắn để phát hiện dấu hiệu lừa đảo, giả mạo và dữ liệu nhạy cảm.",
    applicationName: "Prewise",
    authors: [
        {
            name: "Nguyễn Duy Thuận"
        },
        {
            name: "Trần Đình Bảo Khang"
        }
    ],
    keywords: [
        "Prewise",
        "phishing detection",
        "scam detection",
        "AI security",
        "an toàn trực tuyến"
    ],
    openGraph: {
        type: "website",
        locale: "vi_VN",
        alternateLocale: "en_US",
        siteName: "Prewise",
        title: "Prewise — See the risk before it is too late",
        description: "Explainable scam analysis for websites, emails and messages."
    },
    robots: {
        index: true,
        follow: true
    }
};
function RootLayout({ children }) {
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("html", {
        lang: "vi",
        children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("body", {
            children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_context_AuthContext__WEBPACK_IMPORTED_MODULE_14__.AuthProvider, {
                children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_AppChrome__WEBPACK_IMPORTED_MODULE_15__["default"], {
                    children: children
                })
            })
        })
    });
}


/***/ }),

/***/ 19093:
/***/ (() => {



/***/ }),

/***/ 25563:
/***/ (() => {



/***/ }),

/***/ 30615:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 81170, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 23597, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 36893, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 89748, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 6060, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 7184, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 69576, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 73041, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 51384, 23));


/***/ }),

/***/ 31593:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ AppChrome)
});

// EXTERNAL MODULE: ./node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-runtime.js
var react_jsx_runtime = __webpack_require__(21124);
// EXTERNAL MODULE: ./node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js
var react = __webpack_require__(38301);
// EXTERNAL MODULE: ./node_modules/next/dist/api/navigation.js
var navigation = __webpack_require__(42378);
// EXTERNAL MODULE: ./context/AuthContext.tsx
var AuthContext = __webpack_require__(12622);
// EXTERNAL MODULE: ./node_modules/lucide-react/dist/esm/icons/shield-check.mjs
var shield_check = __webpack_require__(33198);
// EXTERNAL MODULE: ./node_modules/lucide-react/dist/esm/icons/x.mjs
var x = __webpack_require__(90386);
// EXTERNAL MODULE: ./node_modules/lucide-react/dist/esm/icons/menu.mjs
var menu = __webpack_require__(9135);
// EXTERNAL MODULE: ./node_modules/next/dist/client/app-dir/link.js
var app_dir_link = __webpack_require__(3991);
var link_default = /*#__PURE__*/__webpack_require__.n(app_dir_link);
;// ./components/NavigationBar.tsx
/* __next_internal_client_entry_do_not_use__ default auto */ 



const NAV_LINKS = [
    {
        label: "Trang chủ",
        href: "/"
    },
    {
        label: "Demo",
        href: "/demo"
    },
    {
        label: "Chat AI",
        href: "/chat"
    },
    {
        label: "Giới thiệu",
        href: "/about"
    },
    {
        label: "Gói dịch vụ",
        href: "/pricing"
    }
];
function isActive(href, currentPath) {
    return href === "/" ? currentPath === "/" : currentPath === href || currentPath.startsWith(`${href}/`);
}
function getInitials(displayName) {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
function NavigationBar({ currentPath, session, onOpenAuth, onLogout }) {
    const [mobileOpen, setMobileOpen] = (0,react.useState)(false);
    const [accountOpen, setAccountOpen] = (0,react.useState)(false);
    const accountRef = (0,react.useRef)(null);
    process.env.__NEXT_PRIVATE_MINIMIZE_MACRO_FALSE && (0,react.useEffect)(()=>{
        setMobileOpen(false);
        setAccountOpen(false);
    }, [
        currentPath
    ]);
    process.env.__NEXT_PRIVATE_MINIMIZE_MACRO_FALSE && (0,react.useEffect)(()=>{
        function handleClickOutside(event) {
            if (accountRef.current && !accountRef.current.contains(event.target)) {
                setAccountOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return ()=>document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const links = NAV_LINKS.map((link)=>{
        const active = isActive(link.href, currentPath);
        return /*#__PURE__*/ (0,react_jsx_runtime.jsx)("li", {
            children: /*#__PURE__*/ (0,react_jsx_runtime.jsx)((link_default()), {
                href: link.href,
                "aria-current": active ? "page" : undefined,
                className: `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"}`,
                children: link.label
            })
        }, link.href);
    });
    return /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("header", {
        className: "sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur",
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("nav", {
                className: "mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8",
                "aria-label": "Điều hướng ch\xednh",
                children: [
                    /*#__PURE__*/ (0,react_jsx_runtime.jsxs)((link_default()), {
                        href: "/",
                        className: "flex min-w-0 items-center gap-2.5 text-neutral-950",
                        children: [
                            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                                className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-white",
                                children: /*#__PURE__*/ (0,react_jsx_runtime.jsx)(shield_check/* default */.A, {
                                    className: "h-5 w-5",
                                    "aria-hidden": "true"
                                })
                            }),
                            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                                className: "truncate text-sm font-bold sm:text-base",
                                children: "AI Security Armor"
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime.jsx)("ul", {
                        className: "ml-auto hidden items-center gap-1 lg:flex",
                        children: links
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime.jsx)("div", {
                        className: "ml-auto hidden items-center gap-2 sm:flex lg:ml-2",
                        children: session === null ? /*#__PURE__*/ (0,react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
                            children: [
                                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                                    type: "button",
                                    onClick: ()=>onOpenAuth("login"),
                                    className: "rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100",
                                    children: "Đăng nhập"
                                }),
                                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                                    type: "button",
                                    onClick: ()=>onOpenAuth("register"),
                                    className: "rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800",
                                    children: "Bắt đầu"
                                })
                            ]
                        }) : /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                            className: "relative",
                            ref: accountRef,
                            children: [
                                /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("button", {
                                    type: "button",
                                    onClick: ()=>setAccountOpen((open)=>!open),
                                    "aria-haspopup": "menu",
                                    "aria-expanded": accountOpen,
                                    className: "flex items-center gap-2 rounded-full border border-neutral-200 p-1 pr-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50",
                                    children: [
                                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                                            className: "flex h-8 w-8 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white",
                                            children: getInitials(session.user.displayName)
                                        }),
                                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                                            children: "T\xe0i khoản"
                                        })
                                    ]
                                }),
                                accountOpen && /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                                    role: "menu",
                                    className: "absolute right-0 mt-2 w-52 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg",
                                    children: [
                                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)((link_default()), {
                                            href: "/account",
                                            role: "menuitem",
                                            className: "block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50",
                                            children: "Tổng quan"
                                        }),
                                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)((link_default()), {
                                            href: "/account/history",
                                            role: "menuitem",
                                            className: "block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50",
                                            children: "Lịch sử qu\xe9t"
                                        }),
                                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                                            type: "button",
                                            role: "menuitem",
                                            onClick: onLogout,
                                            className: "block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50",
                                            children: "Đăng xuất"
                                        })
                                    ]
                                })
                            ]
                        })
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                        type: "button",
                        onClick: ()=>setMobileOpen((open)=>!open),
                        "aria-expanded": mobileOpen,
                        "aria-controls": "mobile-navigation",
                        "aria-label": mobileOpen ? "Đóng menu" : "Mở menu",
                        className: "ml-auto flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 text-neutral-800 lg:hidden",
                        children: mobileOpen ? /*#__PURE__*/ (0,react_jsx_runtime.jsx)(x/* default */.A, {
                            className: "h-5 w-5"
                        }) : /*#__PURE__*/ (0,react_jsx_runtime.jsx)(menu/* default */.A, {
                            className: "h-5 w-5"
                        })
                    })
                ]
            }),
            mobileOpen && /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                id: "mobile-navigation",
                className: "border-t border-neutral-200 bg-white px-4 py-4 lg:hidden",
                children: [
                    /*#__PURE__*/ (0,react_jsx_runtime.jsx)("ul", {
                        className: "mx-auto grid max-w-7xl gap-1",
                        children: links
                    }),
                    session === null && /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                        className: "mx-auto mt-4 grid max-w-7xl grid-cols-2 gap-2 border-t border-neutral-200 pt-4 sm:hidden",
                        children: [
                            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                                type: "button",
                                onClick: ()=>onOpenAuth("login"),
                                className: "rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800",
                                children: "Đăng nhập"
                            }),
                            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                                type: "button",
                                onClick: ()=>onOpenAuth("register"),
                                className: "rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white",
                                children: "Bắt đầu"
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

;// ./components/Footer.tsx
/**
 * Footer — chân trang dùng chung mọi trang.
 *
 * Hiển thị logo nhỏ + danh sách liên kết chân trang. Nhận `links` tùy chọn;
 * nếu không truyền, dùng bộ mặc định (Home, Pricing, About, Privacy, Contact).
 *
 * _Requirements: 17.5_
 */ 

/** Bộ liên kết chân trang mặc định (tiếng Việt/nhãn ngắn khớp nav). */ const DEFAULT_LINKS = [
    {
        label: "Trang chủ",
        href: "/"
    },
    {
        label: "Demo",
        href: "/demo"
    },
    {
        label: "Chat AI",
        href: "/chat"
    },
    {
        label: "Giới thiệu",
        href: "/about"
    },
    {
        label: "Gói dịch vụ",
        href: "/pricing"
    }
];
function Footer({ links = DEFAULT_LINKS }) {
    const year = new Date().getFullYear();
    return /*#__PURE__*/ (0,react_jsx_runtime.jsx)("footer", {
        className: "mt-auto w-full border-t border-neutral-200 bg-neutral-50",
        children: /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
            className: "mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:px-8",
            children: [
                /*#__PURE__*/ (0,react_jsx_runtime.jsxs)((link_default()), {
                    href: "/",
                    className: "flex items-center gap-2 text-sm font-semibold text-neutral-800",
                    children: [
                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                            "aria-hidden": "true",
                            className: "flex h-6 w-6 items-center justify-center rounded-md bg-neutral-900 text-xs text-white",
                            children: "\uD83D\uDEE1"
                        }),
                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                            children: "AI Security Armor"
                        })
                    ]
                }),
                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("nav", {
                    "aria-label": "Li\xean kết ch\xe2n trang",
                    children: /*#__PURE__*/ (0,react_jsx_runtime.jsx)("ul", {
                        className: "flex flex-wrap items-center justify-center gap-x-5 gap-y-2",
                        children: links.map((link)=>/*#__PURE__*/ (0,react_jsx_runtime.jsx)("li", {
                                children: /*#__PURE__*/ (0,react_jsx_runtime.jsx)((link_default()), {
                                    href: link.href,
                                    className: "text-sm text-neutral-600 transition-colors hover:text-neutral-900",
                                    children: link.label
                                })
                            }, link.href))
                    })
                }),
                /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("p", {
                    className: "text-xs text-neutral-500",
                    children: [
                        "\xa9 ",
                        year,
                        " AI Security Armor"
                    ]
                })
            ]
        })
    });
}

// EXTERNAL MODULE: ./lib/api/index.ts + 1 modules
var lib_api = __webpack_require__(57125);
;// ./components/AuthModal.tsx
/* __next_internal_client_entry_do_not_use__ isValidEmail,default auto */ 
/**
 * Component AuthModal — hộp thoại đăng nhập / đăng ký.
 *
 * Hỗ trợ hai chế độ trong cùng một modal: "login" và "register", có thể chuyển
 * qua lại. Theo Sequence Diagram 3 (design.md — "Đăng nhập & tải dữ liệu tài
 * khoản"):
 *   - Người dùng nhập email/mật khẩu → nhấn Đăng nhập.
 *   - Gọi `getApiClient().login(cred)` (hoặc `.register(cred)` cho đăng ký).
 *   - Nhận Session → `useAuth().setSession(session)` → đóng modal.
 *
 * Trước khi gọi API, modal LUÔN kiểm tra định dạng email phía client
 * (Requirement 11.4): nếu email không hợp lệ → hiển thị lỗi validation và
 * KHÔNG gọi login/register.
 *
 * Khả năng truy cập (accessibility):
 *   - `role="dialog"` + `aria-modal="true"` + gắn `aria-labelledby`.
 *   - Nhấn phím ESC để đóng; nhấp ra ngoài (backdrop) cũng đóng.
 *
 * _Requirements: 11.1, 11.4, 11.5_
 */ 


/**
 * Regex kiểm tra định dạng email cơ bản: có phần trước @, một @, tên miền và
 * TLD. Cố ý giữ đơn giản nhưng đủ chặt để loại các chuỗi rõ ràng không hợp lệ
 * (thiếu @, thiếu miền, có khoảng trắng).
 */ const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Kiểm tra định dạng email hợp lệ (client-side, trước khi gọi API). */ function isValidEmail(email) {
    return EMAIL_PATTERN.test(email.trim());
}
/** Nhãn tiếng Việt theo chế độ. */ const TITLE = {
    login: "Đăng nhập",
    register: "Đăng ký"
};
const SUBMIT_LABEL = {
    login: "Đăng nhập",
    register: "Đăng ký"
};
const INPUT_CLASS = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " + "placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 " + "focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60";
/**
 * AuthModal — form đăng nhập/đăng ký với kiểm tra email trước khi gọi API.
 */ function AuthModal({ open, mode, onClose, onModeChange }) {
    const { setSession } = (0,AuthContext/* useAuth */.A)();
    // Trường nhập liệu.
    const [email, setEmail] = (0,react.useState)("");
    const [password, setPassword] = (0,react.useState)("");
    const [displayName, setDisplayName] = (0,react.useState)("");
    const [showPassword, setShowPassword] = (0,react.useState)(false);
    // Trạng thái lỗi & đang gửi.
    const [error, setError] = (0,react.useState)(null);
    const [submitting, setSubmitting] = (0,react.useState)(false);
    // ID cho aria-labelledby (ổn định qua các render).
    const titleId = (0,react.useId)();
    // Tham chiếu input đầu tiên để auto-focus khi mở.
    const emailInputRef = (0,react.useRef)(null);
    // Reset form mỗi khi mở modal hoặc đổi chế độ.
    process.env.__NEXT_PRIVATE_MINIMIZE_MACRO_FALSE && (0,react.useEffect)(()=>{
        if (open) {
            setError(null);
            setSubmitting(false);
            setShowPassword(false);
        }
    }, [
        open,
        mode
    ]);
    // Auto-focus vào ô email khi modal mở.
    process.env.__NEXT_PRIVATE_MINIMIZE_MACRO_FALSE && (0,react.useEffect)(()=>{
        if (open) {
            emailInputRef.current?.focus();
        }
    }, [
        open
    ]);
    // Đóng modal khi nhấn ESC.
    process.env.__NEXT_PRIVATE_MINIMIZE_MACRO_FALSE && (0,react.useEffect)(()=>{
        if (!open) {
            return;
        }
        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return ()=>window.removeEventListener("keydown", handleKeyDown);
    }, [
        open,
        onClose
    ]);
    // Chuyển chế độ login ⇄ register.
    const switchMode = (0,react.useCallback)((next)=>{
        setError(null);
        onModeChange?.(next);
    }, [
        onModeChange
    ]);
    const handleSubmit = (0,react.useCallback)(async (event)=>{
        event.preventDefault();
        setError(null);
        const trimmedEmail = email.trim();
        // Requirement 11.4: validate định dạng email TRƯỚC khi gọi API.
        if (!isValidEmail(trimmedEmail)) {
            setError("Định dạng email không hợp lệ.");
            return;
        }
        if (password.length === 0) {
            setError("Vui lòng nhập mật khẩu.");
            return;
        }
        if (mode === "register" && displayName.trim().length === 0) {
            setError("Vui lòng nhập tên hiển thị.");
            return;
        }
        setSubmitting(true);
        try {
            const api = (0,lib_api/* getApiClient */.e)();
            if (mode === "login") {
                const cred = {
                    email: trimmedEmail,
                    password
                };
                const session = await api.login(cred);
                setSession(session);
            } else {
                const cred = {
                    email: trimmedEmail,
                    password,
                    displayName: displayName.trim()
                };
                const session = await api.register(cred);
                setSession(session);
            }
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Đã có lỗi xảy ra. Vui lòng thử lại.";
            setError(message);
        } finally{
            setSubmitting(false);
        }
    }, [
        email,
        password,
        displayName,
        mode,
        setSession,
        onClose
    ]);
    if (!open) {
        return null;
    }
    return /*#__PURE__*/ (0,react_jsx_runtime.jsx)("div", {
        className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4",
        onClick: onClose,
        children: /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": titleId,
            className: "w-full max-w-md rounded-2xl bg-white p-6 shadow-xl",
            onClick: (event)=>event.stopPropagation(),
            children: [
                /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                    className: "relative mb-6 text-center",
                    children: [
                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                            type: "button",
                            onClick: onClose,
                            "aria-label": "Đ\xf3ng",
                            className: "absolute right-0 top-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                            children: /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                                "aria-hidden": "true",
                                className: "text-lg leading-none",
                                children: "✕"
                            })
                        }),
                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("div", {
                            className: "text-2xl",
                            "aria-hidden": "true",
                            children: "\uD83D\uDEE1️"
                        }),
                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("div", {
                            className: "text-xs font-medium tracking-wide text-slate-400",
                            children: "AI Security Armor"
                        }),
                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("h2", {
                            id: titleId,
                            className: "mt-2 text-xl font-bold text-slate-900",
                            children: TITLE[mode]
                        })
                    ]
                }),
                error !== null && /*#__PURE__*/ (0,react_jsx_runtime.jsx)("div", {
                    role: "alert",
                    className: "mb-4 rounded-lg border border-risk-danger-border bg-risk-danger-bg px-3 py-2 text-sm text-risk-danger",
                    children: error
                }),
                /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("form", {
                    onSubmit: handleSubmit,
                    noValidate: true,
                    className: "space-y-4",
                    children: [
                        /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                            children: [
                                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("label", {
                                    htmlFor: "auth-email",
                                    className: "mb-1 block text-sm font-medium text-slate-700",
                                    children: "Email"
                                }),
                                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("input", {
                                    id: "auth-email",
                                    ref: emailInputRef,
                                    type: "email",
                                    name: "email",
                                    autoComplete: "email",
                                    placeholder: "ban@example.com",
                                    value: email,
                                    disabled: submitting,
                                    onChange: (e)=>setEmail(e.target.value),
                                    className: INPUT_CLASS
                                })
                            ]
                        }),
                        mode === "register" && /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                            children: [
                                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("label", {
                                    htmlFor: "auth-display-name",
                                    className: "mb-1 block text-sm font-medium text-slate-700",
                                    children: "T\xean hiển thị"
                                }),
                                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("input", {
                                    id: "auth-display-name",
                                    type: "text",
                                    name: "displayName",
                                    autoComplete: "name",
                                    placeholder: "Nguyễn Văn A",
                                    value: displayName,
                                    disabled: submitting,
                                    onChange: (e)=>setDisplayName(e.target.value),
                                    className: INPUT_CLASS
                                })
                            ]
                        }),
                        /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                            children: [
                                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("label", {
                                    htmlFor: "auth-password",
                                    className: "mb-1 block text-sm font-medium text-slate-700",
                                    children: "Mật khẩu"
                                }),
                                /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                                    className: "relative",
                                    children: [
                                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("input", {
                                            id: "auth-password",
                                            type: showPassword ? "text" : "password",
                                            name: "password",
                                            autoComplete: mode === "login" ? "current-password" : "new-password",
                                            placeholder: "••••••••",
                                            value: password,
                                            disabled: submitting,
                                            onChange: (e)=>setPassword(e.target.value),
                                            className: `${INPUT_CLASS} pr-10`
                                        }),
                                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                                            type: "button",
                                            onClick: ()=>setShowPassword((v)=>!v),
                                            "aria-label": showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu",
                                            "aria-pressed": showPassword,
                                            className: "absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600",
                                            children: /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                                                "aria-hidden": "true",
                                                children: showPassword ? "🙈" : "👁"
                                            })
                                        })
                                    ]
                                })
                            ]
                        }),
                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                            type: "submit",
                            disabled: submitting,
                            className: "w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60",
                            children: submitting ? "Đang xử lý…" : SUBMIT_LABEL[mode]
                        })
                    ]
                }),
                mode === "login" && /*#__PURE__*/ (0,react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
                    children: [
                        /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                            className: "my-4 flex items-center gap-3",
                            children: [
                                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                                    className: "h-px flex-1 bg-slate-200"
                                }),
                                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                                    className: "text-xs text-slate-400",
                                    children: "hoặc"
                                }),
                                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                                    className: "h-px flex-1 bg-slate-200"
                                })
                            ]
                        }),
                        /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("button", {
                            type: "button",
                            disabled: submitting,
                            "aria-label": "Tiếp tục với Google",
                            className: "flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60",
                            children: [
                                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                                    "aria-hidden": "true",
                                    className: "font-bold text-[#4285F4]",
                                    children: "G"
                                }),
                                "Tiếp tục với Google"
                            ]
                        }),
                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("div", {
                            className: "mt-4 text-center",
                            children: /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                                type: "button",
                                className: "text-sm text-slate-500 hover:text-slate-700 hover:underline",
                                children: "Qu\xean mật khẩu?"
                            })
                        })
                    ]
                }),
                /*#__PURE__*/ (0,react_jsx_runtime.jsx)("div", {
                    className: "mt-4 text-center text-sm text-slate-600",
                    children: mode === "login" ? /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("span", {
                        children: [
                            "Chưa c\xf3 t\xe0i khoản?",
                            " ",
                            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                                type: "button",
                                onClick: ()=>switchMode("register"),
                                className: "font-semibold text-indigo-600 hover:underline",
                                children: "Đăng k\xfd"
                            })
                        ]
                    }) : /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("span", {
                        children: [
                            "Đ\xe3 c\xf3 t\xe0i khoản?",
                            " ",
                            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                                type: "button",
                                onClick: ()=>switchMode("login"),
                                className: "font-semibold text-indigo-600 hover:underline",
                                children: "Đăng nhập"
                            })
                        ]
                    })
                })
            ]
        })
    });
}

;// ./components/AppChrome.tsx
/* __next_internal_client_entry_do_not_use__ default auto */ 
/**
 * AppChrome — lớp "khung" client bọc mọi trang.
 *
 * `app/layout.tsx` là Server Component (giữ <html>/<body>/metadata) nên không
 * thể dùng hook. AppChrome là Client Component nối AuthContext với các
 * component trình bày (presentational) điều khiển bằng props:
 *   - `useAuth()` → session + logout.
 *   - `usePathname()` → currentPath cho NavigationBar (đánh dấu link active).
 *   - Quản lý trạng thái mở/đóng + chế độ của AuthModal bằng useState.
 *
 * Bố cục: NavigationBar (trên) → {children} (nội dung trang) → Footer (dưới),
 * đảm bảo Nav/Footer hiển thị trên MỌI trang (Requirements 17.1, 17.5).
 * AuthModal được gắn ở đây để bất kỳ trang nào cũng có thể yêu cầu đăng nhập
 * qua nút trên NavigationBar.
 *
 * _Requirements: 17.1, 17.5_
 */ 





function AppChrome({ children }) {
    const { session, logout } = (0,AuthContext/* useAuth */.A)();
    const pathname = (0,navigation.usePathname)();
    // Trạng thái modal xác thực (mở/đóng + chế độ login|register).
    const [authOpen, setAuthOpen] = (0,react.useState)(false);
    const [authMode, setAuthMode] = (0,react.useState)("login");
    // Các trải nghiệm Prewise mới sử dụng shell riêng, tập trung và không kế thừa UI cũ.
    if (pathname === "/armor-console" || pathname === "/" || pathname?.startsWith("/analyze") || pathname?.startsWith("/result") || pathname === "/history" || pathname === "/methodology" || pathname === "/settings") {
        return /*#__PURE__*/ (0,react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, {
            children: children
        });
    }
    // Mở modal ở chế độ tương ứng khi bấm "Đăng nhập"/"Dùng thử ▶".
    function handleOpenAuth(mode) {
        setAuthMode(mode);
        setAuthOpen(true);
    }
    return /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
        className: "flex min-h-screen flex-col",
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime.jsx)(NavigationBar, {
                currentPath: pathname ?? "/",
                session: session,
                onOpenAuth: handleOpenAuth,
                onLogout: ()=>{
                    void logout();
                }
            }),
            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("main", {
                className: "flex flex-1 flex-col",
                children: children
            }),
            /*#__PURE__*/ (0,react_jsx_runtime.jsx)(Footer, {}),
            /*#__PURE__*/ (0,react_jsx_runtime.jsx)(AuthModal, {
                open: authOpen,
                mode: authMode,
                onClose: ()=>setAuthOpen(false),
                onModeChange: setAuthMode
            })
        ]
    });
}


/***/ }),

/***/ 33381:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  MG: () => (/* binding */ MockApiClient),
  h0: () => (/* binding */ looksLikeUrl)
});

// UNUSED EXPORTS: MOCK_APIKEY_KEY, MOCK_HISTORY_KEY, MOCK_SESSION_KEY, hasHomoglyph, hasRiskyTld, mockAssessText, mockAssessUrl

// EXTERNAL MODULE: ./lib/evidence.ts
var lib_evidence = __webpack_require__(76230);
// EXTERNAL MODULE: ./lib/risk.ts
var risk = __webpack_require__(13232);
;// ./lib/time.ts
/**
 * Tiện ích thuần định dạng thời gian cho lịch sử scan.
 *
 * `formatScanTimestamp` định dạng một `Date` sang chuỗi `"DD/MM HH:mm"`
 * (zero-padded) dùng cho cột "thời điểm" trong Lịch sử scan (Scan_Record).
 *
 * Nguyên tắc:
 *   - KHÔNG thay đổi (mutate) `date` đầu vào — chỉ đọc.
 *   - Bảo toàn thông tin ngày/tháng/giờ/phút (bỏ giây) để round-trip được.
 *   - Dùng giờ theo múi giờ cục bộ (local time) khớp hiển thị người dùng.
 *
 * Hàm thuần, tất định (cùng input → cùng output), không side-effect.
 *
 * _Requirements: 14.3, 14.4_
 */ // ---------------------------------------------------------------------------
// Tiện ích nội bộ
// ---------------------------------------------------------------------------
/** Đệm số nguyên không âm về đúng 2 chữ số (zero-padded), vd 5 → "05". */ function pad2(value) {
    return String(value).padStart(2, "0");
}
// ---------------------------------------------------------------------------
// formatScanTimestamp — hàm thuần, không mutate
// ---------------------------------------------------------------------------
/**
 * Định dạng `date` sang chuỗi `"DD/MM HH:mm"` (zero-padded, giờ cục bộ).
 *
 * Ví dụ: `02/07 18:32`.
 *
 * **Preconditions**: `date` là `Date` hợp lệ (không phải Invalid Date).
 * **Postconditions**: trả chuỗi đúng dạng `"DD/MM HH:mm"`; không làm thay đổi
 * `date`; bảo toàn ngày/tháng/giờ/phút (bỏ giây) → đọc lại giữ nguyên thông tin.
 *
 * @param date Thời điểm cần định dạng.
 * @returns Chuỗi `"DD/MM HH:mm"`.
 * @throws {RangeError} khi `date` là Invalid Date (vi phạm tiền điều kiện).
 */ function formatScanTimestamp(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new RangeError("formatScanTimestamp: `date` không hợp lệ.");
    }
    const day = pad2(date.getDate());
    const month = pad2(date.getMonth() + 1); // getMonth() trả 0..11
    const hours = pad2(date.getHours());
    const minutes = pad2(date.getMinutes());
    return `${day}/${month} ${hours}:${minutes}`;
}

;// ./lib/api/mock.ts
/**
 * MockApiClient — hiện thực stub tất định, chạy in-memory + localStorage.
 *
 * Cho phép Web App UI demo độc lập (standalone) khi Security Gateway chưa
 * chạy. Toàn bộ kết quả đánh giá được sinh từ heuristic TẤT ĐỊNH (cùng đầu
 * vào → cùng điểm số) dựa trên các dấu hiệu:
 *   - URL : homoglyph (giả mạo thương hiệu), thiếu HTTPS, TLD rủi ro, path "login".
 *   - Email/Text : từ khóa khẩn cấp (tiếng Việt), liên kết đáng ngờ, sai lệch người gửi.
 *
 * Streaming chat được giả lập bằng async generator phát từng "token" (chunk
 * theo từ) kèm độ trễ nhỏ. Lịch sử scan, phiên đăng nhập và API key được bền
 * hóa vào `localStorage` khi chạy trong trình duyệt; trên SSR (không có
 * `window`) client vẫn hoạt động bằng trạng thái in-memory.
 *
 * Bất biến quan trọng: mọi `AssessResult` thỏa `riskLevel === getRiskLevel(score).key`,
 * `score ∈ [0,100]`, `confidence ∈ [0,1]`.
 *
 * _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 16.3, 16.4_
 */ 


// ---------------------------------------------------------------------------
// Hằng số & khóa lưu trữ
// ---------------------------------------------------------------------------
/** Khóa localStorage cho lịch sử scan của mock client. */ const MOCK_HISTORY_KEY = "aisec:mock:history";
/** Khóa localStorage cho phiên đăng nhập giả lập. */ const MOCK_SESSION_KEY = "aisec:mock:session";
/** Khóa localStorage cho API/MCP key giả lập. */ const MOCK_APIKEY_KEY = "aisec:mock:apikey";
/** Danh sách TLD rủi ro cao thường gặp trong phishing. */ const RISKY_TLDS = [
    "xyz",
    "tk",
    "top",
    "gq",
    "ml",
    "cf",
    "ga",
    "work",
    "click",
    "link",
    "country",
    "kim",
    "science",
    "party",
    "review",
    "stream",
    "download",
    "loan",
    "men",
    "zip",
    "mov"
];
/** Từ khóa khẩn cấp/lừa đảo tiếng Việt dùng cho heuristic email. */ const URGENCY_KEYWORDS = [
    "khóa",
    "ngay",
    "gấp",
    "xác minh",
    "trúng thưởng"
];
/** Độ tin cậy cố định cho kết quả mock (nằm trong [0,1]). */ // ---------------------------------------------------------------------------
// Tiện ích thuần
// ---------------------------------------------------------------------------
/** Kẹp `value` về khoảng [min, max]. */ function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
/** Chờ `ms` mili-giây (dùng để giả lập streaming). */ function delay(ms) {
    return new Promise((resolve)=>setTimeout(resolve, ms));
}
/**
 * Sinh một định danh dạng UUID. Ưu tiên `crypto.randomUUID()`; nếu không có
 * (môi trường cũ), dùng bộ sinh dự phòng dựa trên `Math.random`.
 */ function generateId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c)=>{
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : r & 0x3 | 0x8;
        return v.toString(16);
    });
}
/** Có đang chạy trong trình duyệt (có localStorage) không. */ function hasBrowserStorage() {
    return  false && 0;
}
/** Đọc + parse JSON từ localStorage; trả về null nếu vắng/hỏng/không phải browser. */ function readStored(key) {
    if (!hasBrowserStorage()) {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch  {
        return null;
    }
}
/** Ghi JSON vào localStorage (no-op trên SSR hoặc khi bị chặn). */ function writeStored(key, value) {
    if (!hasBrowserStorage()) {
        return;
    }
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch  {
    // localStorage đầy hoặc bị chặn → bỏ qua, giữ trạng thái in-memory.
    }
}
// ---------------------------------------------------------------------------
// Heuristic: nhận dạng đầu vào & dấu hiệu URL/email (thuần, tất định)
// ---------------------------------------------------------------------------
/**
 * Đoán một chuỗi có "trông giống URL" hay không.
 *
 * Quy tắc (tất định): có scheme http(s)://, hoặc bắt đầu bằng "www.", hoặc
 * là một token liền không khoảng trắng chứa dấu chấm với phần đuôi trông
 * giống TLD (2+ ký tự chữ). Chuỗi nhiều dòng/nhiều khoảng trắng (đặc trưng
 * email) sẽ KHÔNG được coi là URL.
 *
 * @param input Chuỗi cần phân loại.
 * @returns `true` nếu trông giống URL.
 */ function looksLikeUrl(input) {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
        return false;
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return true;
    }
    // Có khoảng trắng bên trong → nhiều khả năng là nội dung email/văn bản.
    if (/\s/.test(trimmed)) {
        return false;
    }
    if (/^www\./i.test(trimmed)) {
        return true;
    }
    // domain.tld[/path] — một token, có ít nhất một dấu chấm và TLD chữ.
    return /^[^\s@]+\.[a-z]{2,}(?:[/:?#].*)?$/i.test(trimmed);
}
/**
 * Phát hiện dấu hiệu homoglyph / giả mạo thương hiệu trong URL.
 *
 * Tất định. Nhận diện hai nhóm:
 *   1) Trộn chữ Latin với ký tự ngoài ASCII (vd chữ Cyrillic nhìn giống Latin).
 *   2) Tên miền có chữ số thay thế chữ cái (0↔o, 1↔l/i, 3↔e, 5↔s...) nằm
 *      xen giữa các chữ cái trong nhãn miền (dấu hiệu điển hình của đánh lừa).
 */ function hasHomoglyph(url) {
    const host = extractHost(url);
    // (1) Trộn ASCII và ký tự Unicode "trông giống" chữ Latin.
    const hasAscii = /[a-z]/i.test(host);
    const hasNonAscii = /[^\u0000-\u007f]/.test(host);
    if (hasAscii && hasNonAscii) {
        return true;
    }
    // (2) Chữ số thay thế chữ cái, nằm giữa các chữ cái (vd "vietc0mbank").
    //     Bỏ qua trường hợp số đứng độc lập/ở biên để giảm dương tính giả.
    if (/[a-z][013457]+[a-z]/i.test(host)) {
        return true;
    }
    return false;
}
/** Trích host (không scheme, không path) từ một chuỗi URL. */ function extractHost(url) {
    let s = url.trim();
    s = s.replace(/^https?:\/\//i, "");
    s = s.replace(/^www\./i, "");
    // Cắt tại ký tự đầu tiên của path/query/port/fragment.
    const cut = s.search(/[/:?#]/);
    return cut === -1 ? s : s.slice(0, cut);
}
/** Kiểm tra URL có dùng TLD rủi ro cao không. */ function hasRiskyTld(url) {
    const host = extractHost(url).toLowerCase();
    const lastDot = host.lastIndexOf(".");
    if (lastDot === -1) {
        return false;
    }
    const tld = host.slice(lastDot + 1);
    return RISKY_TLDS.includes(tld);
}
// ---------------------------------------------------------------------------
// Heuristic đánh giá (thuần, tất định) → AssessResult
// ---------------------------------------------------------------------------
/** Lấy tối đa `n` thông điệp đầu tiên (theo thứ tự đã sắp) làm "lý do chính". */ function topReasons(sorted, n = 3) {
    return sorted.slice(0, n).map((e)=>e.message);
}
function estimateConfidence(score, evidence) {
    const risk = clamp(score, 0, 100) / 100;
    const boundaryCertainty = Math.abs(risk - 0.5) * 2;
    const severityWeight = {
        critical: 1,
        high: 0.8,
        medium: 0.55,
        low: 0.3,
        info: 0.12
    };
    const evidenceStrength = Math.min(1, evidence.reduce((sum, item)=>sum + severityWeight[item.severity], 0) / 3);
    const ambiguousPenalty = risk >= 0.35 && risk <= 0.65 ? 0.08 : 0;
    return clamp(0.35 + boundaryCertainty * 0.38 + evidenceStrength * 0.17 + 0.03 - ambiguousPenalty, 0.2, 0.98);
}
/**
 * Đóng gói một `AssessResult` nhất quán từ điểm + bằng chứng.
 *
 * Đảm bảo bất biến: `score ∈ [0,100]`, `riskLevel === getRiskLevel(score).key`,
 * evidence được sắp theo severity giảm dần, reasons là top thông điệp.
 */ function buildResult(rawScore, evidence, modality, explanation) {
    const score = clamp(Math.round(rawScore), 0, 100);
    const sorted = (0,lib_evidence/* sortEvidenceBySeverity */.U)(evidence);
    const level = (0,risk/* getRiskLevel */.EQ)(score);
    return {
        score,
        riskLevel: level.key,
        confidence: estimateConfidence(score, sorted),
        reasons: topReasons(sorted),
        evidence: sorted,
        explanation,
        modality,
        modelVersion: "mock-heuristic-1",
        latencyMs: 0,
        requestId: generateId()
    };
}
/**
 * Đánh giá rủi ro cho một URL bằng heuristic tất định (theo pseudocode design.md).
 *
 * Base score 5; +45 homoglyph, +20 nếu không https://, +18 TLD rủi ro,
 * +9 nếu path chứa "login"; kẹp về [0,100].
 *
 * **Postconditions**: `score ∈ [0,100]`; `riskLevel === getRiskLevel(score).key`;
 * tất định với cùng `url`.
 */ function mockAssessUrl(url) {
    const evidence = [];
    let score = 5;
    if (hasHomoglyph(url)) {
        score += 45;
        evidence.push({
            source: "url_adapter",
            message: "Domain giả mạo thương hiệu (homoglyph)",
            severity: "critical",
            feature: "homoglyph_score",
            contribution: 0.38
        });
    }
    if (!/^https:\/\//i.test(url.trim())) {
        score += 20;
        evidence.push({
            source: "url_adapter",
            message: "Không dùng HTTPS",
            severity: "medium",
            feature: "no_https",
            contribution: 0.21
        });
    }
    if (hasRiskyTld(url)) {
        score += 18;
        evidence.push({
            source: "url_adapter",
            message: "TLD rủi ro cao",
            severity: "medium",
            feature: "risky_tld",
            contribution: 0.17
        });
    }
    if (url.toLowerCase().includes("login")) {
        score += 9;
        evidence.push({
            source: "url_adapter",
            message: "Path chứa 'login'",
            severity: "low",
            feature: "login_path",
            contribution: 0.09
        });
    }
    if (evidence.length === 0) {
        evidence.push({
            source: "url_adapter",
            message: "Không phát hiện dấu hiệu rủi ro rõ rệt",
            severity: "info",
            contribution: 0.02
        });
    }
    const explanation = buildUrlExplanation(evidence);
    return buildResult(score, evidence, "url", explanation);
}
/**
 * Đánh giá rủi ro cho một đoạn văn bản/email bằng heuristic tất định.
 *
 * Base score 5; mỗi từ khóa khẩn cấp (tiếng Việt) +14; liên kết đáng ngờ
 * (http:// không bảo mật, TLD rủi ro, hoặc homoglyph) +22; dấu hiệu sai lệch
 * người gửi (địa chỉ email trên tên miền công cộng mạo danh tổ chức) +16.
 * Kẹp về [0,100].
 */ function mockAssessText(text) {
    const evidence = [];
    const lower = text.toLowerCase();
    let score = 5;
    // (1) Từ khóa khẩn cấp/lừa đảo.
    const foundKeywords = URGENCY_KEYWORDS.filter((k)=>lower.includes(k));
    if (foundKeywords.length > 0) {
        score += 14 * foundKeywords.length;
        evidence.push({
            source: "text_adapter",
            message: `Ngôn từ hối thúc/đe dọa (${foundKeywords.join(", ")})`,
            severity: foundKeywords.length >= 2 ? "high" : "medium",
            feature: "urgency_keywords",
            contribution: 0.12 * foundKeywords.length
        });
    }
    // (2) Liên kết đáng ngờ trong nội dung.
    const urlMatches = text.match(/\b(?:https?:\/\/|www\.)[^\s]+/gi) ?? [];
    const suspiciousLink = urlMatches.some((u)=>/^http:\/\//i.test(u) || hasRiskyTld(u) || hasHomoglyph(u));
    if (suspiciousLink) {
        score += 22;
        evidence.push({
            source: "text_adapter",
            message: "Chứa liên kết đáng ngờ (không HTTPS / TLD rủi ro / giả mạo)",
            severity: "high",
            feature: "suspicious_link",
            contribution: 0.24
        });
    }
    // (3) Sai lệch người gửi: mạo danh tổ chức nhưng dùng email miền công cộng.
    if (hasSenderMismatch(text)) {
        score += 16;
        evidence.push({
            source: "text_adapter",
            message: "Người gửi mạo danh (địa chỉ không khớp tổ chức)",
            severity: "medium",
            feature: "sender_mismatch",
            contribution: 0.15
        });
    }
    if (evidence.length === 0) {
        evidence.push({
            source: "text_adapter",
            message: "Không phát hiện dấu hiệu lừa đảo rõ rệt",
            severity: "info",
            contribution: 0.02
        });
    }
    const explanation = buildTextExplanation(evidence);
    return buildResult(score, evidence, "email", explanation);
}
/**
 * Dấu hiệu sai lệch người gửi: nội dung nhắc tới tổ chức/ngân hàng nhưng địa
 * chỉ gửi lại nằm trên tên miền email công cộng (gmail/yahoo/outlook...).
 */ function hasSenderMismatch(text) {
    const lower = text.toLowerCase();
    const mentionsOrg = /ngân hàng|bank|ngÂn|tổ chức|công ty|bộ phận|phòng|dịch vụ/i.test(text);
    const publicMail = /@(?:gmail|yahoo|outlook|hotmail|proton|mail)\.[a-z.]+/i.test(lower);
    return mentionsOrg && publicMail;
}
/** Sinh giải thích tiếng Việt cho kết quả URL từ danh sách bằng chứng. */ function buildUrlExplanation(evidence) {
    const points = evidence.map((e)=>`• ${e.message}`).join("\n");
    return `Đánh giá URL dựa trên các dấu hiệu sau:\n${points}`;
}
/** Sinh giải thích tiếng Việt cho kết quả email/văn bản. */ function buildTextExplanation(evidence) {
    const points = evidence.map((e)=>`• ${e.message}`).join("\n");
    return `Đánh giá nội dung email dựa trên các dấu hiệu sau:\n${points}`;
}
// ---------------------------------------------------------------------------
// Session / Plan helpers
// ---------------------------------------------------------------------------
/** Suy ra gói dịch vụ từ email (cho mục đích demo). */ function inferPlanTier(email) {
    const lower = email.toLowerCase();
    if (lower.includes("team")) {
        return "team";
    }
    if (lower.includes("pro")) {
        return "pro";
    }
    return "free";
}
/** Tạo PlanInfo mặc định theo gói. */ function buildPlanInfo(tier) {
    const labels = {
        free: "FREE",
        pro: "PRO",
        team: "TEAM"
    };
    return {
        tier,
        label: labels[tier],
        renewsAt: tier === "free" ? undefined : "02/08/2026",
        dailyScanLimit: tier === "free" ? 50 : Number.POSITIVE_INFINITY
    };
}
/** Suy ra tên hiển thị từ phần local của email. */ function displayNameFromEmail(email) {
    const local = email.split("@")[0] ?? email;
    if (local.length === 0) {
        return email;
    }
    return local.charAt(0).toUpperCase() + local.slice(1);
}
/** Tạo Session giả lập từ email. */ function buildSession(email) {
    const tier = inferPlanTier(email);
    const user = {
        id: generateId(),
        email,
        displayName: displayNameFromEmail(email)
    };
    return {
        token: `mock-jwt.${btoaSafe(email)}.${generateId()}`,
        user,
        plan: buildPlanInfo(tier)
    };
}
/** base64 an toàn cho cả browser và node (không dùng cho bảo mật). */ function btoaSafe(input) {
    try {
        if (typeof btoa === "function") {
            return btoa(unescape(encodeURIComponent(input)));
        }
    } catch  {
    // fall through
    }
    // Node fallback
    try {
        return Buffer.from(input, "utf-8").toString("base64");
    } catch  {
        return input;
    }
}
// ---------------------------------------------------------------------------
// MockApiClient
// ---------------------------------------------------------------------------
class MockApiClient {
    constructor(){
        this.history = readStored(MOCK_HISTORY_KEY) ?? [];
        this.session = readStored(MOCK_SESSION_KEY);
        this.apiKey = readStored(MOCK_APIKEY_KEY);
    }
    async assessUrl(url) {
        const result = mockAssessUrl(url);
        this.recordScan("URL", result);
        return result;
    }
    async sandboxUrl(url) {
        return {
            ok: false,
            execution_status: "failed",
            url,
            final_url: "",
            status_code: null,
            http_reason: "",
            content_type: "",
            bytes_read: 0,
            resolved_ip: "",
            redirects: [],
            tls: {},
            page_title: "",
            page_signals: {},
            elapsed_ms: 0,
            scan_steps: [
                {
                    key: "mock_mode",
                    label: "Run direct sandbox",
                    status: "failed",
                    detail: "Real API is required."
                }
            ],
            issues: [
                {
                    code: "mock_mode",
                    severity: "info",
                    category: "execution",
                    message: "Sandbox trực tiếp chỉ hoạt động khi ứng dụng dùng API thật."
                }
            ]
        };
    }
    async browserSandboxUrl(url) {
        return {
            ok: false,
            execution_status: "failed",
            url,
            final_url: "",
            status_code: null,
            page_title: "",
            isolation: {
                mode: "mock"
            },
            canary: {
                enabled: true,
                mode: "dry_run",
                clone_email: "",
                fields_filled: 0,
                field_types: {},
                form_submissions_blocked: 0,
                exfiltration_blocked: false,
                notes: [
                    "Advanced browser sandbox only runs against the real API."
                ]
            },
            network_events: [],
            browser_events: [],
            console_errors: [],
            elapsed_ms: 0,
            scan_steps: [
                {
                    key: "mock_mode",
                    label: "Run advanced browser sandbox",
                    status: "failed",
                    detail: "Real API is required."
                }
            ],
            issues: [
                {
                    code: "mock_mode",
                    severity: "info",
                    category: "execution",
                    message: "Browser sandbox nang cao chi hoat dong khi ung dung dung API that."
                }
            ]
        };
    }
    async assessText(text, _metadata) {
        const result = mockAssessText(text);
        this.recordScan("Email", result);
        return result;
    }
    async *openChatStream(payload) {
        // Nếu có ngữ cảnh nội dung, chạy đánh giá tương ứng trước.
        let assessment;
        if (payload.context && payload.context.content.trim().length > 0) {
            const { content, modality } = payload.context;
            if (modality === "url" || looksLikeUrl(content)) {
                assessment = await this.assessUrl(content);
            } else {
                assessment = await this.assessText(content);
            }
        }
        // Xây câu trả lời tiếng Việt và stream theo từng từ.
        const answer = this.composeChatAnswer(payload, assessment);
        const words = answer.split(/(\s+)/); // giữ khoảng trắng làm token riêng
        for (const word of words){
            if (word.length === 0) {
                continue;
            }
            await delay(15);
            yield {
                delta: word
            };
        }
        return {
            messageId: generateId(),
            assessment
        };
    }
    async login(cred) {
        const session = buildSession(cred.email);
        this.session = session;
        writeStored(MOCK_SESSION_KEY, session);
        return session;
    }
    async register(cred) {
        const session = buildSession(cred.email);
        // Ưu tiên displayName người dùng nhập khi đăng ký.
        if (cred.displayName && cred.displayName.trim().length > 0) {
            session.user.displayName = cred.displayName.trim();
        }
        this.session = session;
        writeStored(MOCK_SESSION_KEY, session);
        return session;
    }
    async logout() {
        this.session = null;
        if (hasBrowserStorage()) {
            try {
                window.localStorage.removeItem(MOCK_SESSION_KEY);
            } catch  {
            // bỏ qua
            }
        }
    }
    async updateProfile(displayName) {
        if (!this.session) throw new Error("Bạn cần đăng nhập.");
        this.session = {
            ...this.session,
            user: {
                ...this.session.user,
                displayName: displayName.trim()
            }
        };
        writeStored(MOCK_SESSION_KEY, this.session);
        return this.session.user;
    }
    async changePassword() {
        if (!this.session) throw new Error("Bạn cần đăng nhập.");
    }
    async getPlan() {
        return this.session?.plan ?? buildPlanInfo("free");
    }
    async cancelSubscription() {
        if (!this.session) throw new Error("Bạn cần đăng nhập.");
        const plan = buildPlanInfo("free");
        this.session = {
            ...this.session,
            plan
        };
        writeStored(MOCK_SESSION_KEY, this.session);
        return plan;
    }
    async getScanHistory() {
        // Trả bản sao để tránh mutate trạng thái nội bộ từ bên ngoài.
        return [
            ...this.history
        ];
    }
    async getApiKey() {
        if (!this.apiKey) {
            this.apiKey = this.createApiKey();
            writeStored(MOCK_APIKEY_KEY, this.apiKey);
        }
        return this.apiKey;
    }
    async rotateApiKey() {
        this.apiKey = this.createApiKey();
        writeStored(MOCK_APIKEY_KEY, this.apiKey);
        return this.apiKey;
    }
    // -----------------------------------------------------------------------
    // Nội bộ
    // -----------------------------------------------------------------------
    /** Ghi một bản ghi lịch sử scan (mới nhất lên đầu) + bền hóa. */ recordScan(type, result) {
        const record = {
            id: result.requestId,
            timestamp: formatScanTimestamp(new Date()),
            type,
            score: result.score,
            riskLevel: result.riskLevel
        };
        this.history = [
            record,
            ...this.history
        ].slice(0, 200);
        writeStored(MOCK_HISTORY_KEY, this.history);
    }
    /** Tạo một ApiKeyInfo giả lập mới. */ createApiKey() {
        const raw = generateId().replace(/-/g, "");
        return {
            key: `sk-mock-${raw}`,
            createdAt: formatScanTimestamp(new Date())
        };
    }
    /** Soạn câu trả lời tiếng Việt dựa trên câu hỏi + kết quả đánh giá. */ composeChatAnswer(payload, assessment) {
        if (assessment) {
            const level = (0,risk/* getRiskLevel */.EQ)(assessment.score);
            const reasons = assessment.reasons.length > 0 ? assessment.reasons.map((r)=>`- ${r}`).join(" ") : "không có dấu hiệu nổi bật.";
            return `Kết quả đánh giá: ${level.icon} ${assessment.score}/100 — ${level.label}. ` + `Các lý do chính: ${reasons} ` + `Bạn nên cẩn trọng và cân nhắc cài đặt tiện ích để được bảo vệ tự động.`;
        }
        const q = payload.question.trim();
        return `Mình đã nhận câu hỏi của bạn: "${q}". ` + `Hãy dán một URL hoặc nội dung email để mình phân tích rủi ro chi tiết nhé.`;
    }
}


/***/ }),

/***/ 35475:
/***/ (() => {



/***/ }),

/***/ 37877:
/***/ (() => {



/***/ }),

/***/ 38082:
/***/ (() => {



/***/ }),

/***/ 50224:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   J: () => (/* binding */ SESSION_STORAGE_KEY),
/* harmony export */   d: () => (/* binding */ readStoredAccessToken)
/* harmony export */ });
const SESSION_STORAGE_KEY = "aisec:session";
function readStoredAccessToken() {
    if (true) {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        return typeof session.token === "string" && session.token.length > 0 ? session.token : null;
    } catch  {
        return null;
    }
}


/***/ }),

/***/ 57125:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  e: () => (/* binding */ getApiClient)
});

// UNUSED EXPORTS: resetApiClient

// EXTERNAL MODULE: ./lib/api/mock.ts + 1 modules
var mock = __webpack_require__(33381);
// EXTERNAL MODULE: ./lib/auth-session.ts
var auth_session = __webpack_require__(50224);
// EXTERNAL MODULE: ./lib/risk.ts
var risk = __webpack_require__(13232);
;// ./lib/api/real.ts
/**
 * RealApiClient — hiện thực gọi REST `/v1/assess/*` và WebSocket `/v1/chat`.
 *
 * Đây là khung (scaffold) type-safe hiện thực đầy đủ interface `ApiClient`
 * bằng `fetch` (REST) + `WebSocket` (chat streaming). Nó KHÔNG phụ thuộc vào
 * một backend đang chạy để biên dịch; khi Security Gateway sẵn sàng và
 * `NEXT_PUBLIC_API_MODE=real`, UI dùng client này mà không cần sửa mã.
 *
 * Base URL đọc từ biến môi trường (có mặc định cho môi trường phát triển):
 *   - `NEXT_PUBLIC_API_BASE_URL` (mặc định `http://localhost:8000`)
 *   - `NEXT_PUBLIC_WS_BASE_URL`  (mặc định `ws://localhost:8000`)
 *
 * Ánh xạ contract backend (§7 API Contract của design.md + mcp-tool-schema):
 *   AssessResponse{ risk_level, confidence, reasons, evidence, model_version,
 *   latency_ms, risk_score(0..1), request_id } → AssessResult{ score(0..100),
 *   riskLevel, confidence, reasons, evidence, ... }.
 *
 * Nguyên tắc nhất quán: `riskLevel` LUÔN được tính lại từ `score` bằng
 * `getRiskLevel(score).key` (nguồn duy nhất), bất kể backend trả `risk_level`
 * dạng gì — bảo đảm bất biến `riskLevel === getRiskLevel(score).key`.
 *
 * _Requirements: 16.2, 16.3_
 */ 

// ---------------------------------------------------------------------------
// Cấu hình base URL
// ---------------------------------------------------------------------------
const DEFAULT_API_BASE = "http://localhost:8000";
const DEFAULT_WS_BASE = "ws://localhost:8000";
/** Bỏ dấu `/` thừa ở cuối để nối path an toàn. */ function trimTrailingSlash(url) {
    return url.replace(/\/+$/, "");
}
function getApiBase() {
    return trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE);
}
function getWsBase() {
    return trimTrailingSlash(process.env.NEXT_PUBLIC_WS_BASE_URL ?? DEFAULT_WS_BASE);
}
// ---------------------------------------------------------------------------
// Helpers ánh xạ backend → frontend
// ---------------------------------------------------------------------------
const VALID_SEVERITIES = [
    "info",
    "low",
    "medium",
    "high",
    "critical"
];
/** Chuẩn hóa severity backend → Severity frontend (mặc định "info"). */ function normalizeSeverity(severity) {
    if (severity && VALID_SEVERITIES.includes(severity)) {
        return severity;
    }
    return "info";
}
/** Map một BackendEvidence → Evidence frontend, loại bỏ null. */ function mapEvidence(raw) {
    const evidence = {
        source: raw.source ?? "unknown",
        message: raw.message ?? "",
        severity: normalizeSeverity(raw.severity)
    };
    if (raw.feature != null) {
        evidence.feature = raw.feature;
    }
    if (typeof raw.contribution === "number" && Number.isFinite(raw.contribution)) {
        evidence.contribution = raw.contribution;
    }
    return evidence;
}
/**
 * Điểm đại diện khi backend chỉ trả `risk_level` (không có `risk_score`).
 * Chọn giá trị nằm giữa khoảng của mỗi mức theo thang frontend.
 */ function scoreFromRiskLevel(level) {
    switch(level){
        case "safe":
            return 10; // 0..39 → safe
        case "low":
            return 30; // vẫn thuộc safe theo thang 3 bậc frontend
        case "medium":
            return 55; // 40..69 → warn
        case "high":
            return 80; // 70..100 → danger
        case "critical":
            return 95; // danger
        default:
            return 0;
    }
}
/** Kẹp một số về khoảng [min, max]. */ function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
/**
 * Ánh xạ phản hồi backend → `AssessResult` của frontend.
 *
 * - `score`: ưu tiên `risk_score`(0..1)×100; nếu thiếu, suy ra từ `risk_level`.
 * - `riskLevel`: LUÔN tính lại bằng `getRiskLevel(score).key` để giữ bất biến
 *   `riskLevel === getRiskLevel(score).key`.
 * - `confidence`: kẹp về [0,1].
 */ function mapAssessResponse(raw, modality) {
    const rawScore = typeof raw.risk_score === "number" && Number.isFinite(raw.risk_score) ? raw.risk_score * 100 : scoreFromRiskLevel(raw.risk_level);
    const score = clamp(Math.round(rawScore), 0, 100);
    const riskLevel = (0,risk/* getRiskLevel */.EQ)(score).key;
    const confidence = typeof raw.confidence === "number" && Number.isFinite(raw.confidence) ? clamp(raw.confidence, 0, 1) : 0;
    const result = {
        score,
        riskLevel,
        confidence,
        reasons: Array.isArray(raw.reasons) ? raw.reasons : [],
        evidence: Array.isArray(raw.evidence) ? raw.evidence.map(mapEvidence) : [],
        modality,
        requestId: raw.request_id ?? generateRequestId()
    };
    if (typeof raw.explanation === "string") {
        result.explanation = raw.explanation;
    }
    if (typeof raw.model_version === "string") {
        result.modelVersion = raw.model_version;
    }
    if (typeof raw.latency_ms === "number") {
        result.latencyMs = raw.latency_ms;
    }
    return result;
}
/** Sinh request id dự phòng khi backend không trả (crypto khi có sẵn). */ function generateRequestId() {
    const g = globalThis;
    if (g.crypto?.randomUUID) {
        return g.crypto.randomUUID();
    }
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
/**
 * Gửi một yêu cầu JSON và trả về body đã parse.
 *
 * @throws {Error} khi phản hồi không thành công (status ngoài 2xx).
 */ async function requestJson(path, init) {
    const url = `${getApiBase()}${path}`;
    const response = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...init.headers ?? {}
        }
    });
    if (!response.ok) {
        let detail = "";
        try {
            detail = await response.text();
        } catch  {
        // bỏ qua lỗi đọc body
        }
        throw new Error(`Yêu cầu ${path} thất bại: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`);
    }
    return await response.json();
}
function withAuthentication(init) {
    const token = (0,auth_session/* readStoredAccessToken */.d)();
    if (!token) return init;
    return {
        ...init,
        headers: {
            ...init.headers ?? {},
            Authorization: `Bearer ${token}`
        }
    };
}
// ---------------------------------------------------------------------------
// RealApiClient
// ---------------------------------------------------------------------------
class RealApiClient {
    /** Đánh giá rủi ro cho một URL qua REST `POST /v1/assess/url`.
     *  Khớp contract gateway: body `{ url, context }`. */ async assessUrl(url) {
        const raw = await requestJson("/v1/assess/url", {
            ...withAuthentication({
                method: "POST"
            }),
            body: JSON.stringify({
                url,
                context: ""
            })
        });
        return mapAssessResponse(raw, "url");
    }
    async sandboxUrl(url) {
        return requestJson("/v1/assess/url/sandbox", withAuthentication({
            method: "POST",
            body: JSON.stringify({
                url
            })
        }));
    }
    /** Đánh giá rủi ro cho văn bản/email qua REST `POST /v1/assess/text`.
     *  Khớp contract gateway: body `{ text, modality, metadata }`. */ async browserSandboxUrl(url) {
        return requestJson("/v1/assess/url/browser-sandbox", withAuthentication({
            method: "POST",
            body: JSON.stringify({
                url,
                canary_mode: "dry_run"
            })
        }));
    }
    async assessText(text, metadata) {
        const rawModality = metadata?.modality ?? "email";
        // Gateway chỉ nhận modality "email" | "text" | "sms" cho endpoint text.
        const modality = rawModality === "url" ? "text" : rawModality;
        const raw = await requestJson("/v1/assess/text", {
            ...withAuthentication({
                method: "POST"
            }),
            body: JSON.stringify({
                text,
                modality,
                metadata: metadata ?? null
            })
        });
        return mapAssessResponse(raw, modality);
    }
    /**
     * Mở luồng chat qua WebSocket `${wsBase}/v1/chat`.
     *
     * - Kết nối WS, gửi `payload` một lần khi mở.
     * - Yield từng `ChatChunk` (delta) khi message tới.
     * - Trả về `ChatFinal` (kèm assessment nếu có) khi nhận message `final`
     *   hoặc khi kết nối đóng bình thường.
     * - Ném lỗi khi kết nối lỗi/đóng bất thường để hook hiển thị "mất kết nối".
     */ async *openChatStream(payload) {
        const wsUrl = `${getWsBase()}/v1/chat`;
        const socket = new WebSocket(wsUrl);
        // Hàng đợi delta + cơ chế đánh thức generator khi có sự kiện mới.
        const queue = [];
        let finalResult = null;
        let streamError = null;
        let closed = false;
        let notify = null;
        const wake = ()=>{
            if (notify) {
                const fn = notify;
                notify = null;
                fn();
            }
        };
        const waitForEvent = ()=>new Promise((resolve)=>{
                notify = resolve;
            });
        socket.onopen = ()=>{
            try {
                socket.send(JSON.stringify(payload));
            } catch (err) {
                streamError = err instanceof Error ? err : new Error(String(err));
                wake();
            }
        };
        socket.onmessage = (event)=>{
            try {
                const msg = JSON.parse(String(event.data));
                if (msg.type === "delta" && typeof msg.delta === "string") {
                    queue.push({
                        delta: msg.delta
                    });
                } else if (msg.type === "final") {
                    finalResult = {
                        messageId: msg.message_id ?? generateRequestId(),
                        ...msg.assessment ? {
                            assessment: mapAssessResponse(msg.assessment, msg.modality ?? "text")
                        } : {}
                    };
                } else if (msg.type === "error") {
                    streamError = new Error(msg.error ?? "Lỗi luồng chat từ máy chủ");
                }
            } catch (err) {
                streamError = err instanceof Error ? err : new Error(String(err));
            }
            wake();
        };
        socket.onerror = ()=>{
            streamError = new Error("Mất kết nối tới máy chủ chat (WebSocket error)");
            wake();
        };
        socket.onclose = (event)=>{
            closed = true;
            if (!event.wasClean && finalResult === null && streamError === null) {
                streamError = new Error(`Kết nối chat bị đóng bất thường (mã ${event.code})`);
            }
            wake();
        };
        try {
            // Vòng lặp tiêu thụ: phát delta, dừng khi có final/error/close.
            // eslint-disable-next-line no-constant-condition
            while(true){
                while(queue.length > 0){
                    yield queue.shift();
                }
                if (streamError !== null) {
                    throw streamError;
                }
                if (finalResult !== null && queue.length === 0) {
                    return finalResult;
                }
                if (closed) {
                    // Đóng sạch mà không có final rõ ràng → trả final rỗng.
                    return finalResult ?? {
                        messageId: generateRequestId()
                    };
                }
                await waitForEvent();
            }
        } finally{
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close();
            }
        }
    }
    /** Đăng nhập qua REST `POST /v1/auth/login`. */ async login(cred) {
        return requestJson("/v1/auth/login", {
            method: "POST",
            body: JSON.stringify(cred)
        });
    }
    /** Đăng ký qua REST `POST /v1/auth/register`. */ async register(cred) {
        return requestJson("/v1/auth/register", {
            method: "POST",
            body: JSON.stringify(cred)
        });
    }
    /** Đăng xuất qua REST `POST /v1/auth/logout`. */ async logout() {
        await requestJson("/v1/auth/logout", withAuthentication({
            method: "POST"
        }));
    }
    /** Lấy thông tin gói qua REST `GET /v1/account/plan`. */ async getPlan() {
        return requestJson("/v1/account/plan", withAuthentication({
            method: "GET"
        }));
    }
    /** Lấy lịch sử quét qua REST `GET /v1/account/history`. */ async getScanHistory() {
        return requestJson("/v1/account/history", withAuthentication({
            method: "GET"
        }));
    }
    /** Lấy API/MCP key qua REST `GET /v1/account/api-key`. */ async getApiKey() {
        return requestJson("/v1/account/api-key", withAuthentication({
            method: "GET"
        }));
    }
    /** Tạo lại API/MCP key qua REST `POST /v1/account/api-key/rotate`. */ async rotateApiKey() {
        return requestJson("/v1/account/api-key/rotate", withAuthentication({
            method: "POST"
        }));
    }
    async cancelSubscription() {
        return requestJson("/v1/account/subscription/cancel", withAuthentication({
            method: "POST"
        }));
    }
    async updateProfile(displayName) {
        return requestJson("/v1/account/profile", withAuthentication({
            method: "PATCH",
            body: JSON.stringify({
                displayName
            })
        }));
    }
    async changePassword(input) {
        await requestJson("/v1/account/password", withAuthentication({
            method: "POST",
            body: JSON.stringify(input)
        }));
    }
}

;// ./lib/api/index.ts
/**
 * Factory chọn hiện thực ApiClient theo môi trường.
 *
 * `getApiClient()` đọc biến môi trường `NEXT_PUBLIC_API_MODE`:
 *   - "real" => RealApiClient (gọi REST `/v1/assess/*` + WS `/v1/chat`)
 *   - "mock" (mặc định) => MockApiClient (demo standalone, in-memory)
 *
 * Trả về một singleton (cache instance) để toàn ứng dụng dùng chung một
 * client và một trạng thái. Nhờ interface chung, đổi `NEXT_PUBLIC_API_MODE`
 * giữa "mock"/"real" không cần sửa mã UI.
 *
 * _Requirements: 16.1, 16.2, 16.3, 16.5_
 */ 

/** Singleton cache — đảm bảo dùng chung một instance trên toàn ứng dụng. */ let cachedClient = null;
/** Chuẩn hóa giá trị env thành ApiMode; mặc định "mock". */ function resolveApiMode() {
    return  false ? 0 : "mock";
}
/**
 * Lấy ApiClient phù hợp với môi trường hiện tại (singleton).
 *
 * @returns instance ApiClient dùng chung.
 */ function getApiClient() {
    if (cachedClient === null) {
        cachedClient = resolveApiMode() === "real" ? new RealApiClient() : new mock/* MockApiClient */.MG();
    }
    return cachedClient;
}
/**
 * Reset singleton đã cache. Hữu ích cho kiểm thử để buộc khởi tạo lại
 * client theo giá trị `NEXT_PUBLIC_API_MODE` mới.
 */ function resetApiClient() {
    cachedClient = null;
}


/***/ }),

/***/ 67407:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 54160, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 31603, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 68495, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 75170, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 77526, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 78922, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 29234, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 12263, 23));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 82146));


/***/ }),

/***/ 68977:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(97954);
/* harmony import */ var react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0__);
// This file is generated by the Webpack next-flight-loader.

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((0,react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0__.registerClientReference)(
function() { throw new Error("Attempted to call the default export of \"C:\\\\NDT\\\\PJ\\\\Ai_Security-main\\\\frontend\\\\web\\\\components\\\\AppChrome.tsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component."); },
"C:\\NDT\\PJ\\Ai_Security-main\\frontend\\web\\components\\AppChrome.tsx",
"default",
));


/***/ }),

/***/ 72184:
/***/ (() => {



/***/ }),

/***/ 76230:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   U: () => (/* binding */ sortEvidenceBySeverity),
/* harmony export */   f: () => (/* binding */ SEVERITY_RANK)
/* harmony export */ });
/**
 * Tiện ích thuần cho bằng chứng (Evidence) — sắp xếp theo mức nghiêm trọng.
 *
 * `sortEvidenceBySeverity` là hàm hỗ trợ EvidencePanel hiển thị bằng chứng
 * SHAP theo `severity` giảm dần (critical > high > medium > low > info).
 *
 * Nguyên tắc:
 *   - KHÔNG mutate mảng gốc (trả về một mảng mới) — an toàn khi dùng trong React.
 *   - Bảo toàn đa tập phần tử (kết quả là một hoán vị của đầu vào).
 *   - Ổn định (stable): các phần tử cùng `severity` giữ nguyên thứ tự tương đối.
 *
 * Hàm thuần, tất định (cùng input → cùng output), không side-effect.
 *
 * _Requirements: 4.1, 4.5_
 */ // ---------------------------------------------------------------------------
// Xếp hạng mức nghiêm trọng (severity)
// ---------------------------------------------------------------------------
/**
 * Trọng số xếp hạng cho từng mức `severity`.
 *
 * Giá trị lớn hơn = nghiêm trọng hơn, được sắp lên trước khi sắp giảm dần:
 *   critical (4) > high (3) > medium (2) > low (1) > info (0).
 */ const SEVERITY_RANK = {
    info: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
};
// ---------------------------------------------------------------------------
// sortEvidenceBySeverity — hàm thuần, không mutate, sắp xếp ổn định
// ---------------------------------------------------------------------------
/**
 * Sắp xếp danh sách bằng chứng theo `severity` giảm dần (nghiêm trọng nhất
 * lên đầu), trả về một mảng MỚI mà không làm thay đổi mảng gốc.
 *
 * **Preconditions**: mọi phần tử là `Evidence` hợp lệ (severity thuộc enum).
 * **Postconditions**: kết quả là một hoán vị của `evidence` (cùng đa tập phần
 * tử) theo thứ tự severity không tăng; mảng gốc `evidence` giữ nguyên; các
 * phần tử cùng severity giữ nguyên thứ tự tương đối (ổn định).
 * **Loop Invariants**: tiền tố đã duyệt luôn được sắp đúng thứ tự.
 *
 * @param evidence Danh sách bằng chứng cần sắp xếp.
 * @returns Mảng mới đã sắp theo severity giảm dần (stable).
 */ function sortEvidenceBySeverity(evidence) {
    // Sao chép để KHÔNG mutate mảng gốc. Array.prototype.sort của ES2019+ ổn
    // định, nên các phần tử cùng severity giữ nguyên thứ tự tương đối.
    return [
        ...evidence
    ].sort((a, b)=>SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}


/***/ }),

/***/ 76291:
/***/ (() => {



/***/ }),

/***/ 80452:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AuthProvider: () => (/* binding */ AuthProvider)
/* harmony export */ });
/* unused harmony exports SESSION_STORAGE_KEY, useAuth */
/* harmony import */ var react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(97954);
/* harmony import */ var react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0__);
// This file is generated by the Webpack next-flight-loader.

const SESSION_STORAGE_KEY = (0,react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0__.registerClientReference)(
function() { throw new Error("Attempted to call SESSION_STORAGE_KEY() from the server but SESSION_STORAGE_KEY is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component."); },
"C:\\NDT\\PJ\\Ai_Security-main\\frontend\\web\\context\\AuthContext.tsx",
"SESSION_STORAGE_KEY",
);const AuthProvider = (0,react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0__.registerClientReference)(
function() { throw new Error("Attempted to call AuthProvider() from the server but AuthProvider is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component."); },
"C:\\NDT\\PJ\\Ai_Security-main\\frontend\\web\\context\\AuthContext.tsx",
"AuthProvider",
);const useAuth = (0,react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0__.registerClientReference)(
function() { throw new Error("Attempted to call useAuth() from the server but useAuth is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component."); },
"C:\\NDT\\PJ\\Ai_Security-main\\frontend\\web\\context\\AuthContext.tsx",
"useAuth",
);

/***/ }),

/***/ 82704:
/***/ (() => {



/***/ }),

/***/ 84567:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Mt: () => (/* binding */ QuotaGuard),
/* harmony export */   OB: () => (/* binding */ getLimitForPlan)
/* harmony export */ });
/* unused harmony exports FREE_DAILY_SCAN_LIMIT, QUOTA_STORAGE_KEY, getScanQuotaRemaining, getDayKey */
/**
 * Module quản lý quota quét — QuotaGuard.
 *
 * Quản lý "còn lại hôm nay: X/Y scan" theo gói dịch vụ (Plan_Tier):
 *   - free       : 50 lượt/ngày → còn lại = max(0, 50 - usedToday)
 *   - pro / team : vô hạn (Number.POSITIVE_INFINITY)
 *
 * Nguyên tắc:
 *   - `getScanQuotaRemaining(plan, usedToday)` là hàm THUẦN, tất định, KHÔNG
 *     side-effect: chỉ tính toán số còn lại từ tham số đầu vào.
 *   - `QuotaGuard` là lớp trạng thái: lưu số lượt đã dùng + ngày sử dụng, tự
 *     reset về 0 khi sang ngày mới (theo lịch, so sánh chuỗi YYYY-MM-DD local),
 *     và bền hóa (persist) vào `localStorage` khi chạy trong trình duyệt.
 *     Trên môi trường SSR (không có `window`), QuotaGuard vẫn hoạt động bằng
 *     trạng thái in-memory mà không đụng tới `localStorage`.
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
 */ // ---------------------------------------------------------------------------
// Hằng số
// ---------------------------------------------------------------------------
/** Giới hạn quét hằng ngày của gói `free`. */ const FREE_DAILY_SCAN_LIMIT = 50;
/** Khóa lưu trạng thái quota trong localStorage. */ const QUOTA_STORAGE_KEY = "aisec:quota";
// ---------------------------------------------------------------------------
// Hàm thuần: giới hạn theo gói & số lượt còn lại
// ---------------------------------------------------------------------------
/**
 * Trả về giới hạn quét hằng ngày cho một gói.
 *
 * **Postconditions**: `free` → 50; `pro`/`team` → `Number.POSITIVE_INFINITY`;
 * kết quả luôn ≥ 0. Hàm thuần, tất định.
 *
 * @param plan Gói dịch vụ (`free` | `pro` | `team`).
 * @returns Giới hạn quét hằng ngày (số hữu hạn ≥ 0 hoặc vô hạn).
 */ function getLimitForPlan(plan) {
    return plan === "free" ? FREE_DAILY_SCAN_LIMIT : Number.POSITIVE_INFINITY;
}
/**
 * Tính số lượt quét còn lại hôm nay theo gói và số lượt đã dùng.
 *
 * Hàm THUẦN, tất định, KHÔNG side-effect (không đọc/ghi localStorage, không đọc
 * đồng hồ hệ thống): chỉ phụ thuộc vào tham số đầu vào.
 *
 * **Preconditions**: `usedToday ≥ 0`.
 * **Postconditions**:
 *   - `free`       → `max(0, 50 - usedToday)`;
 *   - `pro`/`team` → `Number.POSITIVE_INFINITY`;
 *   - kết quả luôn KHÔNG âm.
 *
 * @param plan Gói dịch vụ (`free` | `pro` | `team`).
 * @param usedToday Số lượt đã dùng trong ngày (≥ 0).
 * @returns Số lượt còn lại (không âm), hoặc vô hạn với gói pro/team.
 */ function getScanQuotaRemaining(plan, usedToday) {
    const limit = getLimitForPlan(plan);
    if (limit === Number.POSITIVE_INFINITY) {
        return Number.POSITIVE_INFINITY;
    }
    // Phòng thủ: kẹp usedToday về [0, ∞) để kết quả luôn không âm dù đầu vào lệch.
    const used = Number.isFinite(usedToday) && usedToday > 0 ? usedToday : 0;
    return Math.max(0, limit - used);
}
// ---------------------------------------------------------------------------
// Tiện ích ngày & lưu trữ
// ---------------------------------------------------------------------------
/**
 * Khóa ngày theo lịch địa phương dạng `YYYY-MM-DD`.
 *
 * Dùng để phát hiện "sang ngày mới" nhằm reset số lượt đã dùng về 0.
 *
 * @param date Thời điểm cần lấy khóa ngày (mặc định: hiện tại).
 * @returns Chuỗi `YYYY-MM-DD` theo múi giờ địa phương.
 */ function getDayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
/** Kiểm tra có đang chạy trong trình duyệt (có localStorage) hay không. */ function hasBrowserStorage() {
    return  false && 0;
}
/** Đọc trạng thái quota từ localStorage; trả về null nếu không có/không hợp lệ. */ function readStoredState() {
    if (!hasBrowserStorage()) {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(QUOTA_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (typeof parsed.used === "number" && Number.isFinite(parsed.used) && typeof parsed.day === "string") {
            return {
                used: Math.max(0, parsed.used),
                day: parsed.day
            };
        }
        return null;
    } catch  {
        // localStorage bị chặn hoặc dữ liệu hỏng → bỏ qua, dùng in-memory.
        return null;
    }
}
/** Ghi trạng thái quota vào localStorage (bỏ qua lỗi khi bị chặn). */ function writeStoredState(state) {
    if (!hasBrowserStorage()) {
        return;
    }
    try {
        window.localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(state));
    } catch  {
    // Quota storage đầy hoặc bị chặn → bỏ qua, vẫn giữ trạng thái in-memory.
    }
}
// ---------------------------------------------------------------------------
// QuotaGuard — lớp trạng thái quản lý số lượt còn lại theo ngày
// ---------------------------------------------------------------------------
/**
 * QuotaGuard: quản lý số lượt quét còn lại trong ngày cho một gói.
 *
 * - Bền hóa `used` + `day` vào localStorage khi ở trình duyệt; hoạt động
 *   bằng in-memory trên SSR (không đụng localStorage).
 * - Tự reset `used` về 0 khi phát hiện đã sang ngày mới (so khóa ngày local).
 *
 * @example
 * const guard = new QuotaGuard("free");
 * guard.getRemaining(); // 50
 * guard.consume();
 * guard.getRemaining(); // 49
 */ class QuotaGuard {
    /**
     * @param plan Gói dịch vụ hiện tại (`free` | `pro` | `team`).
     * @param now Thời điểm khởi tạo (mặc định hiện tại) — hữu ích cho test.
     */ constructor(plan, now = new Date()){
        this.plan = plan;
        const today = getDayKey(now);
        const stored = readStoredState();
        if (stored && stored.day === today) {
            this.used = stored.used;
            this.day = stored.day;
        } else {
            // Không có trạng thái, hoặc trạng thái thuộc ngày cũ → bắt đầu mới.
            this.used = 0;
            this.day = today;
            if (stored) {
                // Chỉ ghi đè khi từng có dữ liệu cũ cần reset.
                this.persist();
            }
        }
    }
    /** Gói dịch vụ hiện tại. */ getPlan() {
        return this.plan;
    }
    /**
     * Đổi gói dịch vụ (vd sau khi nâng cấp). Không reset số lượt đã dùng.
     * @param plan Gói mới.
     */ setPlan(plan) {
        this.plan = plan;
    }
    /**
     * Giới hạn quét hằng ngày của gói hiện tại.
     * @param plan Gói cần tra (mặc định: gói hiện tại).
     * @returns Free=50, Pro/Team=∞.
     */ getLimitForPlan(plan = this.plan) {
        return getLimitForPlan(plan);
    }
    /**
     * Số lượt còn lại hôm nay. Tự reset khi sang ngày mới trước khi tính.
     *
     * **Postconditions**: kết quả không âm; free → `max(0, 50 - used)`;
     * pro/team → `Number.POSITIVE_INFINITY`.
     */ getRemaining() {
        this.rolloverIfNeeded();
        return getScanQuotaRemaining(this.plan, this.used);
    }
    /**
     * Cho biết còn lượt để quét hay không.
     *
     * **Postconditions**: trả `true` khi và chỉ khi `getRemaining() > 0`.
     */ canScan() {
        return this.getRemaining() > 0;
    }
    /**
     * Tiêu thụ 1 lượt quét (tăng `used` thêm 1) và bền hóa trạng thái.
     * Tự reset trước khi tiêu thụ nếu đã sang ngày mới.
     *
     * Với gói pro/team (vô hạn), vẫn tăng `used` để thống kê nhưng không ảnh
     * hưởng tới số còn lại (luôn vô hạn).
     */ consume() {
        this.rolloverIfNeeded();
        this.used += 1;
        this.persist();
    }
    /** Số lượt đã dùng hôm nay (sau khi cân nhắc reset theo ngày). */ getUsedToday() {
        this.rolloverIfNeeded();
        return this.used;
    }
    /** Nếu đã sang ngày mới, đặt lại số lượt đã dùng về 0 và bền hóa. */ rolloverIfNeeded() {
        const today = getDayKey();
        if (today !== this.day) {
            this.day = today;
            this.used = 0;
            this.persist();
        }
    }
    /** Bền hóa trạng thái hiện tại vào localStorage (no-op trên SSR). */ persist() {
        writeStoredState({
            used: this.used,
            day: this.day
        });
    }
}


/***/ }),

/***/ 97521:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 31593));
;
Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 12622));


/***/ }),

/***/ 99038:
/***/ (() => {



/***/ })

};
;
//# sourceMappingURL=837.js.map