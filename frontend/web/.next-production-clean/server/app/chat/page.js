(() => {
var exports = {};
exports.id = 457;
exports.ids = [457];
exports.modules = {

/***/ 261:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/shared/lib/router/utils/app-paths");

/***/ }),

/***/ 3295:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ 9052:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 87386));


/***/ }),

/***/ 10846:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.prod.js");

/***/ }),

/***/ 19121:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/action-async-storage.external.js");

/***/ }),

/***/ 26713:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/shared/lib/router/utils/is-bot");

/***/ }),

/***/ 28354:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ 29294:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ 33873:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 41025:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/dynamic-access-async-storage.external.js");

/***/ }),

/***/ 52822:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A: () => (/* binding */ RiskBadge)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(21124);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _lib_risk__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(13232);
/**
 * Component RiskBadge — huy hiệu rủi ro theo thang màu chuẩn.
 *
 * Hiển thị màu/icon/nhãn tương ứng với một Risk_Score, LẤY TRỰC TIẾP từ
 * `getRiskLevel(score)` trong `lib/risk.ts` (nguồn duy nhất). RiskBadge KHÔNG
 * tự tính ngưỡng riêng — mọi ánh xạ điểm → mức đều ủy quyền cho Risk_Module
 * và dùng bảng token màu Tailwind (`RISK_COLOR_TOKENS`) để tô màu nhất quán.
 *
 * Đây là component trình bày thuần (presentational): không dùng hook, không state,
 * nên render được ở cả Server lẫn Client Component.
 *
 * Robustness: `getRiskLevel` ném lỗi khi điểm ngoài [0, 100]. Để một điểm số
 * lạc (vd dữ liệu API bất thường) không làm sập cả trang, RiskBadge **kẹp
 * (clamp)** điểm về [0, 100] trước khi tra mức — vẫn giữ ánh xạ qua Risk_Module.
 *
 * _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
 */ 

/** Class Tailwind theo kích thước badge. */ const SIZE_CLASSES = {
    sm: "gap-1 rounded px-1.5 py-0.5 text-xs",
    md: "gap-1.5 rounded-md px-2.5 py-1 text-sm",
    lg: "gap-2 rounded-lg px-3.5 py-1.5 text-base"
};
/** Class cỡ icon theo kích thước badge. */ const ICON_SIZE_CLASSES = {
    sm: "text-sm leading-none",
    md: "text-base leading-none",
    lg: "text-lg leading-none"
};
/** Kẹp điểm về [0, 100]; điểm không hữu hạn coi như 0 để hiển thị an toàn. */ function clampScore(score) {
    if (!Number.isFinite(score)) {
        return 0;
    }
    if (score < 0) {
        return 0;
    }
    if (score > 100) {
        return 100;
    }
    return score;
}
/**
 * RiskBadge — hiển thị icon + (tùy chọn) điểm + (tùy chọn) nhãn với màu theo
 * mức rủi ro do `getRiskLevel` xác định.
 */ function RiskBadge({ score, size = "md", showScore = false, showLabel = false }) {
    const safeScore = clampScore(score);
    const level = (0,_lib_risk__WEBPACK_IMPORTED_MODULE_1__/* .getRiskLevel */ .EQ)(safeScore);
    const colors = (0,_lib_risk__WEBPACK_IMPORTED_MODULE_1__/* .getRiskColorToken */ .QB)(level.key);
    // Hiển thị điểm dạng số nguyên "X/100" (Requirement 2.2).
    const displayScore = Math.round(safeScore);
    const className = [
        "inline-flex items-center font-semibold",
        SIZE_CLASSES[size],
        colors.bg,
        colors.textFg,
        "border",
        colors.border
    ].join(" ");
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", {
        className: className,
        role: "status",
        "aria-label": `Mức rủi ro: ${level.label}, điểm ${displayScore} trên 100`,
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                className: ICON_SIZE_CLASSES[size],
                "aria-hidden": "true",
                children: level.icon
            }),
            showScore && /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", {
                className: "tabular-nums",
                children: [
                    displayScore,
                    "/100"
                ]
            }),
            showLabel && /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                children: level.label
            })
        ]
    });
}


/***/ }),

/***/ 59123:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(97954);
/* harmony import */ var react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0__);
// This file is generated by the Webpack next-flight-loader.

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((0,react_server_dom_webpack_server__WEBPACK_IMPORTED_MODULE_0__.registerClientReference)(
function() { throw new Error("Attempted to call the default export of \"C:\\\\NDT\\\\PJ\\\\Ai_Security-main\\\\frontend\\\\web\\\\app\\\\chat\\\\page.tsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component."); },
"C:\\NDT\\PJ\\Ai_Security-main\\frontend\\web\\app\\chat\\page.tsx",
"default",
));


/***/ }),

/***/ 63033:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ 86439:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/shared/lib/no-fallback-error.external");

/***/ }),

/***/ 87386:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ ChatPage)
});

// EXTERNAL MODULE: ./node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-runtime.js
var react_jsx_runtime = __webpack_require__(21124);
// EXTERNAL MODULE: ./node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js
var react = __webpack_require__(38301);
// EXTERNAL MODULE: ./lib/evidence.ts
var lib_evidence = __webpack_require__(76230);
;// ./components/EvidencePanel.tsx
/* __next_internal_client_entry_do_not_use__ default auto */ 
/**
 * Component EvidencePanel — hiển thị bằng chứng SHAP dạng thanh đóng góp
 * kèm giải thích ngôn ngữ tự nhiên ("luôn có vì sao").
 *
 * Trách nhiệm (design.md — Component: EvidencePanel):
 *   - Sắp xếp evidence theo `severity` giảm dần qua `sortEvidenceBySeverity`
 *     (nguồn duy nhất, không mutate mảng gốc).
 *   - Vẽ thanh tỷ lệ đóng góp: ưu tiên `contribution` (SHAP ~0..1 → %), nếu
 *     không có thì suy ra theo thứ hạng `severity`.
 *   - Tô màu thanh theo mức nghiêm trọng (critical/high = đỏ, medium = vàng,
 *     low/info = trung tính/xanh).
 *   - Hiển thị phần `explanation` (giải thích tiếng Việt — Layer 2) khi có.
 *   - Thu gọn/mở rộng: controlled khi có `collapsed`/`onToggle`; ngược lại tự
 *     quản state cục bộ với nút "Xem đầy đủ bằng chứng (SHAP)".
 *
 * An toàn hiển thị (Requirement 18): mọi nội dung do người dùng/kết quả đánh
 * giá cung cấp đều render qua JSX escaping (KHÔNG dùng dangerouslySetInnerHTML).
 *
 * _Requirements: 4.1, 4.2, 4.3, 4.4_
 */ 

/** Số bằng chứng hiển thị khi ở trạng thái thu gọn. */ const COLLAPSED_COUNT = 2;
/** Thứ hạng cao nhất của severity (critical = 4) để chuẩn hoá về [0, 1]. */ const MAX_SEVERITY_RANK = lib_evidence/* SEVERITY_RANK */.f.critical;
/** Class Tailwind cho thanh đóng góp theo mức nghiêm trọng. */ const SEVERITY_BAR_CLASSES = {
    critical: "bg-risk-danger",
    high: "bg-risk-danger",
    medium: "bg-risk-warn",
    low: "bg-risk-safe",
    info: "bg-gray-400"
};
/**
 * Tính bề rộng thanh đóng góp (phần trăm 0..100).
 *
 * Ưu tiên `contribution` (giá trị SHAP kỳ vọng trong ~[0, 1]) khi là số hữu
 * hạn; kẹp về [0, 1] rồi đổi sang phần trăm. Khi không có `contribution`, suy
 * ra từ thứ hạng `severity` (critical → 100%, info → 0%, tối thiểu 8% để thanh
 * luôn thấy được).
 */ function getBarPercent(ev) {
    if (typeof ev.contribution === "number" && Number.isFinite(ev.contribution)) {
        const clamped = Math.max(0, Math.min(1, Math.abs(ev.contribution)));
        return Math.max(8, Math.round(clamped * 100));
    }
    const ratio = lib_evidence/* SEVERITY_RANK */.f[ev.severity] / MAX_SEVERITY_RANK;
    return Math.max(8, Math.round(ratio * 100));
}
/** Định dạng nhãn đóng góp SHAP dạng "+0.38" khi có giá trị. */ function formatContribution(contribution) {
    const sign = contribution >= 0 ? "+" : "-";
    return `${sign}${Math.abs(contribution).toFixed(2)}`;
}
/** Một dòng bằng chứng: thanh đóng góp + mô tả + (tùy chọn) giá trị SHAP. */ function EvidenceRow({ ev }) {
    const percent = getBarPercent(ev);
    const barClass = SEVERITY_BAR_CLASSES[ev.severity];
    const hasContribution = typeof ev.contribution === "number" && Number.isFinite(ev.contribution);
    return /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("li", {
        className: "flex items-center gap-3 py-1.5",
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("div", {
                className: "h-2.5 w-24 shrink-0 overflow-hidden rounded-full bg-gray-100",
                role: "img",
                "aria-label": `Mức đóng góp ${percent}%`,
                children: /*#__PURE__*/ (0,react_jsx_runtime.jsx)("div", {
                    className: `h-full rounded-full ${barClass}`,
                    style: {
                        width: `${percent}%`
                    }
                })
            }),
            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                className: "min-w-0 flex-1 text-sm text-gray-800",
                children: ev.message
            }),
            hasContribution && /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                className: "shrink-0 tabular-nums text-sm font-medium text-gray-500",
                children: formatContribution(ev.contribution)
            })
        ]
    });
}
/**
 * EvidencePanel — panel bằng chứng SHAP + giải thích tiếng Việt.
 */ function EvidencePanel({ evidence, explanation, collapsed, onToggle }) {
    // Controlled khi cả `collapsed` được cung cấp; ngược lại dùng state cục bộ.
    const isControlled = collapsed !== undefined;
    const [localCollapsed, setLocalCollapsed] = (0,react.useState)(true);
    const effectiveCollapsed = isControlled ? collapsed : localCollapsed;
    const handleToggle = ()=>{
        if (isControlled) {
            onToggle?.();
        } else {
            setLocalCollapsed((prev)=>!prev);
        }
    };
    // Sắp xếp theo severity giảm dần (không mutate mảng gốc).
    const sorted = (0,lib_evidence/* sortEvidenceBySeverity */.U)(evidence);
    const hasMore = sorted.length > COLLAPSED_COUNT;
    const visible = effectiveCollapsed && hasMore ? sorted.slice(0, COLLAPSED_COUNT) : sorted;
    return /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("section", {
        className: "rounded-lg border border-gray-200 bg-white p-4",
        "aria-label": "Bằng chứng đ\xe1nh gi\xe1 rủi ro",
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("h3", {
                className: "mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500",
                children: "Bằng chứng (SHAP)"
            }),
            sorted.length === 0 ? /*#__PURE__*/ (0,react_jsx_runtime.jsx)("p", {
                className: "text-sm text-gray-500",
                children: "Kh\xf4ng c\xf3 bằng chứng."
            }) : /*#__PURE__*/ (0,react_jsx_runtime.jsx)("ul", {
                className: "divide-y divide-gray-50",
                children: visible.map((ev, index)=>/*#__PURE__*/ (0,react_jsx_runtime.jsx)(EvidenceRow, {
                        ev: ev
                    }, `${ev.source}-${index}`))
            }),
            hasMore && /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                type: "button",
                onClick: handleToggle,
                "aria-expanded": !effectiveCollapsed,
                className: "mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline",
                children: effectiveCollapsed ? "▸ Xem đầy đủ bằng chứng (SHAP)" : "▾ Thu gọn bằng chứng"
            }),
            explanation && /*#__PURE__*/ (0,react_jsx_runtime.jsx)("div", {
                className: "mt-3 rounded-md bg-gray-50 p-3",
                children: /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("p", {
                    className: "text-sm leading-relaxed text-gray-700",
                    children: [
                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                            className: "mr-1",
                            "aria-hidden": "true",
                            children: "\uD83D\uDCCB"
                        }),
                        /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                            className: "font-semibold",
                            children: "GIẢI TH\xcdCH: "
                        }),
                        explanation
                    ]
                })
            })
        ]
    });
}

;// ./lib/sanitize.ts
/**
 * Tiện ích an toàn hiển thị nội dung do người dùng cung cấp.
 *
 * Bối cảnh (Requirement 18 — An toàn hiển thị nội dung):
 *   - 18.1: Mọi văn bản do người dùng cung cấp phải được render qua escaping
 *     của JSX/`textContent`. React tự escape khi render `{text}`, nên các hàm ở
 *     đây KHÔNG sinh HTML — chỉ tách chuỗi thành các đoạn thuần để component
 *     render an toàn.
 *   - 18.2: KHÔNG dùng `dangerouslySetInnerHTML`. Module này thuần (pure), chỉ
 *     trả về dữ liệu, không đụng tới DOM/HTML.
 *   - 18.3: KHÔNG nhúng liên kết sống trong khu vực hiển thị nội dung bị đánh
 *     giá là độc hại. `splitTextIntoSegments` phát hiện URL bên trong văn bản để
 *     component (`InertContent`) render chúng dưới dạng chữ trơ (inert),
 *     KHÔNG phải thẻ `<a href>` bấm được.
 *
 * Thiết kế: hàm thuần, tất định, dễ kiểm thử (không phụ thuộc DOM/React).
 *
 * _Requirements: 18.1, 18.2, 18.3_
 */ /** Một đoạn văn bản sau khi tách: chữ thường hoặc một URL được nhận diện. */ /**
 * Regex nhận diện các chuỗi trông giống liên kết bên trong văn bản tự do:
 *   - `http://` hoặc `https://` theo sau bởi ký tự không phải khoảng trắng.
 *   - `www.` theo sau bởi ký tự không phải khoảng trắng.
 *
 * Cố ý giữ đơn giản và thiên về "bắt rộng" trong khu vực nội dung độc hại: mục
 * tiêu là làm TRƠ (inert) mọi thứ trông giống liên kết, không phải phân tích
 * URL hoàn hảo. Cờ `gi` để quét toàn chuỗi, không phân biệt hoa thường.
 */ const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
/**
 * Tách một chuỗi thành các đoạn xen kẽ giữa văn bản thường và URL.
 *
 * Hàm KHÔNG biến đổi nội dung: ghép `value` của mọi đoạn theo thứ tự sẽ khôi
 * phục chính xác chuỗi gốc (bảo toàn round-trip). Điều này bảo đảm không mất mát
 * hay chèn thêm ký tự khi render.
 *
 * @param text Văn bản tùy ý (có thể là nội dung độc hại do người dùng dán vào).
 * @returns Danh sách đoạn theo thứ tự xuất hiện; chuỗi rỗng → mảng rỗng.
 */ function splitTextIntoSegments(text) {
    if (typeof text !== "string" || text.length === 0) {
        return [];
    }
    const segments = [];
    // Tạo bản sao regex có state riêng để hàm thuần, an toàn khi gọi song song.
    const pattern = new RegExp(URL_PATTERN.source, "gi");
    let lastIndex = 0;
    let match;
    while((match = pattern.exec(text)) !== null){
        const start = match.index;
        const matched = match[0];
        // Đoạn văn bản thường trước URL (nếu có).
        if (start > lastIndex) {
            segments.push({
                kind: "text",
                value: text.slice(lastIndex, start)
            });
        }
        // Bản thân URL — sẽ được render dạng chữ trơ (inert).
        segments.push({
            kind: "url",
            value: matched
        });
        lastIndex = start + matched.length;
        // Bảo hiểm tránh vòng lặp vô hạn với match rỗng (không kỳ vọng xảy ra).
        if (matched.length === 0) {
            pattern.lastIndex += 1;
        }
    }
    // Phần văn bản còn lại sau URL cuối cùng.
    if (lastIndex < text.length) {
        segments.push({
            kind: "text",
            value: text.slice(lastIndex)
        });
    }
    return segments;
}
/**
 * Cho biết một chuỗi có chứa ít nhất một liên kết được nhận diện hay không.
 *
 * Hữu ích để component quyết định có cần xử lý inert hay hiển thị thẳng.
 */ function containsUrl(text) {
    if (typeof text !== "string" || text.length === 0) {
        return false;
    }
    return new RegExp(URL_PATTERN.source, "i").test(text);
}

;// ./components/InertContent.tsx
/**
 * Component InertContent — hiển thị văn bản do người dùng cung cấp một cách an
 * toàn, với mọi liên kết (URL) được render dưới dạng chữ TRƠ (inert) thay vì thẻ
 * `<a href>` bấm được.
 *
 * Bối cảnh (Requirement 18 — An toàn hiển thị nội dung; design.md — Security
 * Considerations):
 *   - 18.1: Mọi văn bản render qua JSX escaping (React tự escape `{value}`),
 *     không sinh HTML thô.
 *   - 18.2: KHÔNG dùng `dangerouslySetInnerHTML`.
 *   - 18.3: KHÔNG nhúng liên kết sống trong khu vực hiển thị nội dung bị đánh
 *     giá là độc hại — URL được bọc trong `<span>` (không phải `<a>`), không có
 *     thuộc tính `href`, nên không thể bấm/điều hướng.
 *
 * Đây là component thuần trình bày (không state, không hiệu ứng), có thể dùng
 * trong cả Server lẫn Client Component.
 *
 * _Requirements: 18.1, 18.2, 18.3_
 */ 

/** Nhãn mặc định cho một liên kết đã bị làm trơ. */ const DEFAULT_INERT_LABEL = "Liên kết đã bị vô hiệu hóa vì lý do an toàn";
/**
 * InertContent — render `text` với URL hiển thị dạng chữ trơ, không bấm được.
 *
 * Nội dung được tách thành các đoạn qua `splitTextIntoSegments`; đoạn `text`
 * render bình thường (đã escape), đoạn `url` render trong `<span>` có style nhẹ
 * và KHÔNG có `href`. Ghép các đoạn lại đúng bằng chuỗi gốc (bảo toàn nội dung).
 */ function InertContent({ text, className, inertLinkLabel = DEFAULT_INERT_LABEL }) {
    const segments = splitTextIntoSegments(text);
    return /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
        className: className,
        children: segments.map((segment, index)=>segment.kind === "url" ? /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                // KHÔNG phải <a>, KHÔNG có href → hoàn toàn trơ (inert).
                className: "break-all rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.95em] text-neutral-600",
                title: inertLinkLabel,
                "aria-label": inertLinkLabel,
                "data-inert-link": "true",
                children: segment.value
            }, index) : // Văn bản thường — React tự escape, an toàn với HTML/script.
            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                children: segment.value
            }, index))
    });
}

// EXTERNAL MODULE: ./components/RiskBadge.tsx
var RiskBadge = __webpack_require__(52822);
;// ./components/ChatMessage.tsx
/* __next_internal_client_entry_do_not_use__ default auto */ 



/** Con trỏ nhấp nháy biểu thị trạng thái đang gõ (streaming). */ function TypingCursor() {
    return /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
        className: "ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-current align-middle",
        role: "status",
        "aria-label": "Đang trả lời"
    });
}
/**
 * ChatMessage — bong bóng hội thoại phân biệt vai trò user/assistant.
 */ function ChatMessage({ message, isStreaming = false }) {
    const isUser = message.role === "user";
    const assessment = message.assessment;
    // Canh lề: user bên phải, assistant bên trái.
    const rowClass = isUser ? "flex justify-end gap-2" : "flex justify-start gap-2";
    // Kiểu bong bóng theo vai trò.
    const bubbleClass = isUser ? "max-w-[80%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2.5 text-white" : "max-w-[80%] rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-2.5 text-gray-800";
    return /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
        className: rowClass,
        "data-role": message.role,
        "aria-label": isUser ? "Tin nhắn của bạn" : "Tin nhắn trợ lý",
        children: [
            !isUser && /*#__PURE__*/ (0,react_jsx_runtime.jsx)("span", {
                className: "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg",
                "aria-hidden": "true",
                children: "\uD83D\uDEE1"
            }),
            /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                className: bubbleClass,
                children: [
                    !isUser && assessment && /*#__PURE__*/ (0,react_jsx_runtime.jsx)("div", {
                        className: "mb-2",
                        children: /*#__PURE__*/ (0,react_jsx_runtime.jsx)(RiskBadge/* default */.A, {
                            score: assessment.score,
                            showScore: true,
                            showLabel: true
                        })
                    }),
                    message.text && /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("p", {
                        className: "whitespace-pre-wrap break-words text-sm leading-relaxed",
                        children: [
                            isUser ? /*#__PURE__*/ (0,react_jsx_runtime.jsx)(InertContent, {
                                text: message.text
                            }) : message.text,
                            isStreaming && /*#__PURE__*/ (0,react_jsx_runtime.jsx)(TypingCursor, {})
                        ]
                    }),
                    !message.text && isStreaming && /*#__PURE__*/ (0,react_jsx_runtime.jsx)("p", {
                        className: "text-sm leading-relaxed",
                        "aria-label": "Đang trả lời",
                        children: /*#__PURE__*/ (0,react_jsx_runtime.jsx)(TypingCursor, {})
                    }),
                    !isUser && assessment && /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                        className: "mt-3 space-y-3",
                        children: [
                            assessment.reasons.length > 0 && /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                                children: [
                                    /*#__PURE__*/ (0,react_jsx_runtime.jsx)("p", {
                                        className: "text-sm font-semibold text-gray-700",
                                        children: "L\xfd do ch\xednh:"
                                    }),
                                    /*#__PURE__*/ (0,react_jsx_runtime.jsx)("ul", {
                                        className: "mt-1 list-inside list-disc space-y-0.5 text-sm text-gray-700",
                                        children: assessment.reasons.map((reason, index)=>/*#__PURE__*/ (0,react_jsx_runtime.jsx)("li", {
                                                children: reason
                                            }, index))
                                    })
                                ]
                            }),
                            /*#__PURE__*/ (0,react_jsx_runtime.jsx)(EvidencePanel, {
                                evidence: assessment.evidence,
                                explanation: assessment.explanation
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

// EXTERNAL MODULE: ./context/AuthContext.tsx
var AuthContext = __webpack_require__(12622);
// EXTERNAL MODULE: ./lib/api/index.ts + 1 modules
var lib_api = __webpack_require__(57125);
;// ./hooks/useChatSession.ts
/* __next_internal_client_entry_do_not_use__ useChatSession auto */ /**
 * Hook quản lý một phiên chat streaming có ngữ cảnh.
 *
 * Bọc `ApiClient.openChatStream()` (một AsyncGenerator phát các `ChatChunk`
 * delta và kết thúc bằng `ChatFinal`) thành một API React thân thiện:
 * danh sách tin nhắn, hàm gửi, cờ đang stream, lỗi và hàm thử lại.
 *
 * Luồng gửi (khớp Luồng 2 trong design.md):
 *   1. Thêm bong bóng `user` với câu hỏi.
 *   2. Tạo bong bóng `assistant` rỗng làm placeholder (hiệu ứng đang gõ).
 *   3. Mở `openChatStream({ question, context, history })` và lặp generator,
 *      nối từng `chunk.delta` vào text của bong bóng assistant.
 *   4. Khi generator kết thúc, gắn `ChatFinal.assessment` (nếu có) để render
 *      RiskBadge + EvidencePanel trong bong bóng phản hồi.
 *
 * Xử lý lỗi (Requirement 8.5): nếu luồng ném lỗi (WS đóng giữa chừng), đặt
 * thông báo lỗi tiếng Việt mà KHÔNG mất lịch sử hội thoại; `retryLast()` gửi
 * lại câu hỏi gần nhất của người dùng.
 *
 * _Requirements: 8.1, 8.5_
 */ 

/** Thông báo hiển thị khi kết nối bị gián đoạn giữa chừng. */ const DISCONNECT_MESSAGE = "Mất kết nối, đang thử lại";
/** Sinh id duy nhất cho một tin nhắn (không phụ thuộc backend). */ function createMessageId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
/**
 * Quản lý trạng thái một phiên chat streaming.
 *
 * @returns {@link UseChatSessionResult} gồm messages, sendMessage,
 *   isStreaming, error và retryLast.
 */ function useChatSession() {
    const [messages, setMessages] = (0,react.useState)([]);
    const [isStreaming, setIsStreaming] = (0,react.useState)(false);
    const [error, setError] = (0,react.useState)(null);
    /**
     * Câu hỏi + ngữ cảnh của lần gửi gần nhất, giữ trong ref để `retryLast`
     * truy cập được mà không tạo phụ thuộc closure gây stale.
     */ const lastRequestRef = (0,react.useRef)(null);
    /**
     * Chạy một luồng chat cho `question` đã cho.
     *
     * Giả định bong bóng `user` đã (hoặc sẽ) tồn tại; hàm này chỉ tạo bong
     * bóng assistant, mở luồng và cập nhật tăng dần. `history` được chụp từ
     * `messages` hiện tại thông qua functional update để tránh stale closure.
     */ const runStream = (0,react.useCallback)(async (question, context)=>{
        const assistantId = createMessageId("assistant");
        // Tạo placeholder assistant; đồng thời chụp history hiện có.
        let history = [];
        setMessages((prev)=>{
            history = prev;
            const placeholder = {
                id: assistantId,
                role: "assistant",
                text: "",
                createdAt: Date.now()
            };
            return [
                ...prev,
                placeholder
            ];
        });
        setIsStreaming(true);
        setError(null);
        try {
            const api = (0,lib_api/* getApiClient */.e)();
            const stream = api.openChatStream({
                question,
                context,
                history
            });
            // Lặp generator: nối từng delta vào bong bóng assistant.
            let result = await stream.next();
            while(!result.done){
                const { delta } = result.value;
                setMessages((prev)=>prev.map((msg)=>msg.id === assistantId ? {
                            ...msg,
                            text: msg.text + delta
                        } : msg));
                result = await stream.next();
            }
            // Giá trị trả về của generator là ChatFinal (kèm assessment).
            const final = result.value;
            if (final && final.assessment) {
                const assessment = final.assessment;
                setMessages((prev)=>prev.map((msg)=>msg.id === assistantId ? {
                            ...msg,
                            assessment
                        } : msg));
            }
        } catch  {
            // WS đóng giữa chừng: giữ nguyên lịch sử, chỉ báo lỗi.
            setError(DISCONNECT_MESSAGE);
        } finally{
            setIsStreaming(false);
        }
    }, []);
    const sendMessage = (0,react.useCallback)(async (text, context)=>{
        const question = text.trim();
        // Bỏ qua câu hỏi rỗng sau trim: không thêm bong bóng user (8.1/8.4).
        if (question.length === 0) {
            return;
        }
        // Thêm bong bóng user và ghi nhớ lần gửi để retry.
        const userMessage = {
            id: createMessageId("user"),
            role: "user",
            text: question,
            createdAt: Date.now()
        };
        setMessages((prev)=>[
                ...prev,
                userMessage
            ]);
        lastRequestRef.current = {
            question,
            context
        };
        await runStream(question, context);
    }, [
        runStream
    ]);
    const retryLast = (0,react.useCallback)(async ()=>{
        const last = lastRequestRef.current;
        if (last === null) {
            return;
        }
        // Gửi lại câu hỏi gần nhất mà KHÔNG thêm bong bóng user mới.
        await runStream(last.question, last.context);
    }, [
        runStream
    ]);
    return {
        messages,
        sendMessage,
        isStreaming,
        error,
        retryLast
    };
}

// EXTERNAL MODULE: ./lib/api/mock.ts + 1 modules
var mock = __webpack_require__(33381);
// EXTERNAL MODULE: ./lib/risk.ts
var risk = __webpack_require__(13232);
;// ./lib/quick-scan.ts
/**
 * Hàm quét nhanh có kiểm soát quota — quickScan.
 *
 * Điều phối một lần "quét nhanh" URL/email từ Hero (Home) hoặc Chat theo đúng
 * pseudocode `quickScan` trong design.md, đảm bảo các bất biến (invariants):
 *
 *   1. Đầu vào rỗng/chỉ khoảng trắng  → trả `ValidationError`,
 *      KHÔNG gọi Api_Client và KHÔNG thay đổi quota.
 *   2. Hết quota (`!quota.canScan()`) → trả `QuotaError`,
 *      KHÔNG gọi Api_Client và KHÔNG thay đổi quota.
 *   3. Trường hợp hợp lệ → chọn modality (`url` nếu trông giống URL, ngược lại
 *      `email`), tiêu thụ ĐÚNG 1 lượt quota, rồi gọi Api_Client tương ứng.
 *   4. Kết quả trả về nhất quán nội tại: `riskLevel === getRiskLevel(score).key`.
 *
 * Quota chỉ giảm đúng 1 KHI VÀ CHỈ KHI một lần quét thực sự được thực thi.
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4_
 */ // Tái sử dụng `looksLikeUrl` từ MockApiClient để tránh phân kỳ (divergence)
// logic phân loại đầu vào giữa mock và quét nhanh.


// Re-export để phần còn lại của UI có thể dùng `looksLikeUrl` từ một nơi thống
// nhất (lib/quick-scan) mà không cần biết nó bắt nguồn từ mock client.

/** Thông điệp lỗi khi đầu vào rỗng/chỉ khoảng trắng. */ const EMPTY_INPUT_MESSAGE = "Vui lòng nhập URL hoặc nội dung email";
/** Thông điệp lỗi khi đã hết lượt quét trong ngày. */ const QUOTA_EXCEEDED_MESSAGE = "Đã hết lượt quét hôm nay";
/**
 * Kiểm tra một giá trị trả về từ `quickScan` có phải lỗi ứng dụng hay không.
 *
 * Hữu ích cho phía gọi để phân biệt `AssessResult` với `AppError`
 * (`ValidationError` | `QuotaError`).
 *
 * @param value Giá trị trả về từ `quickScan`.
 * @returns `true` nếu `value` là `AppError`.
 */ function isAppError(value) {
    return typeof value.error === "string";
}
/**
 * Thực hiện một lần quét nhanh có kiểm soát quota.
 *
 * **Preconditions**: `apiClient` đã khởi tạo; `quota` phản ánh gói hiện tại.
 * **Postconditions**:
 *   - Đầu vào rỗng sau khi trim → trả `ValidationError`; quota không đổi; không gọi API.
 *   - Hết quota → trả `QuotaError`; quota không đổi; không gọi API.
 *   - Thành công → trả `AssessResult` với `riskLevel === getRiskLevel(score).key`,
 *     và quota giảm đúng 1.
 *
 * @param input Chuỗi người dùng nhập (URL hoặc nội dung email).
 * @param quota Bộ quản lý quota hiện hành.
 * @param apiClient Lớp API (mock/real) để đánh giá.
 * @returns `AssessResult` khi thành công, hoặc `AppError` khi bị chặn.
 */ async function quickScan(input, quota, apiClient) {
    const trimmed = input.trim();
    // (1) Đầu vào rỗng/chỉ khoảng trắng → ValidationError, không gọi API/không giảm quota.
    if (trimmed.length === 0) {
        const err = {
            error: "validation",
            message: EMPTY_INPUT_MESSAGE
        };
        return err;
    }
    // (2) Hết quota → QuotaError, không gọi API/không giảm quota.
    if (!quota.canScan()) {
        const err = {
            error: "quota",
            message: QUOTA_EXCEEDED_MESSAGE
        };
        return err;
    }
    // (3) Chọn modality theo dạng đầu vào rồi tiêu thụ đúng 1 lượt quota.
    const modality = looksLikeUrl(trimmed) ? "url" : "email";
    quota.consume();
    const result = modality === "url" ? await apiClient.assessUrl(trimmed) : await apiClient.assessText(trimmed);
    // (4) Kiểm chứng bất biến nhất quán nội tại của kết quả.
    const expectedLevel = getRiskLevel(result.score).key;
    if (result.riskLevel !== expectedLevel) {
        throw new Error(`AssessResult không nhất quán: riskLevel="${result.riskLevel}" ` + `nhưng getRiskLevel(${result.score}).key="${expectedLevel}".`);
    }
    return result;
}

;// ./app/chat/page.tsx
/* __next_internal_client_entry_do_not_use__ default auto */ 
/**
 * Trang CHAT — trải nghiệm thử nhanh có ngữ cảnh (streaming).
 *
 * Mục đích (UI_wireframe §1.5): khách mới dán URL/nội dung email vào ô chat,
 * trợ lý đánh giá độ tin cậy + giải thích lý do theo thời gian thực. Cuối phiên
 * luôn gợi ý cài Extension để "bảo vệ thật".
 *
 * Trách nhiệm (design.md — Chat; Luồng 2 streaming):
 *   - Dùng `useChatSession()` cho messages/sendMessage/isStreaming/error/retryLast.
 *   - Bong bóng chào mừng của assistant khi chưa có tin nhắn nào.
 *   - Danh sách hội thoại render qua <ChatMessage>, con trỏ đang gõ ở bong bóng
 *     assistant cuối cùng khi đang stream.
 *   - Ô nhập dưới cùng: textarea + "Gửi ▶" + affordance "📎 Tải file .eml" +
 *     hiển thị quota "Còn lại hôm nay: X/50 scan" (∞ cho pro/team).
 *   - Chặn câu hỏi rỗng (Req 8.4); kiểm tra quota trước khi gửi; nếu hết quota
 *     hiển thị CTA nâng cấp/Extension và KHÔNG gửi; ngược lại tiêu thụ 1 lượt
 *     rồi gọi sendMessage với context suy ra từ đầu vào (url vs email).
 *   - Banner lỗi khi mất kết nối WS + nút "Thử lại" gọi retryLast() (Req 8.5).
 *
 * An toàn hiển thị (Req 18): mọi nội dung render qua JSX escaping.
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_
 */ 




/** Nội dung bong bóng chào mừng của trợ lý (UI_wireframe §1.5). */ const WELCOME_TEXT = "🛡 Chào bạn! Dán URL hoặc nội dung email vào đây, tôi sẽ đánh giá độ tin cậy và giải thích lý do.";
/** Thông điệp khi người dùng hết lượt quét trong ngày. */ const QUOTA_EXCEEDED_TEXT = "Bạn đã hết lượt quét miễn phí hôm nay. Nâng cấp gói hoặc cài Extension để tiếp tục được bảo vệ.";
/**
 * ChatPage — giao diện chat đánh giá có ngữ cảnh.
 */ function ChatPage() {
    const { messages, sendMessage, isStreaming, error, retryLast } = useChatSession();
    const { quota } = (0,AuthContext/* useAuth */.A)();
    // Nội dung ô nhập (controlled) + thông báo hết quota (client-side).
    const [input, setInput] = (0,react.useState)("");
    const [quotaBlocked, setQuotaBlocked] = (0,react.useState)(false);
    // Vùng cuộn danh sách tin nhắn — tự cuộn tới tin mới nhất.
    const scrollRef = (0,react.useRef)(null);
    // Số lượt còn lại + giới hạn theo gói hiện tại (∞ cho pro/team).
    const remaining = quota.getRemaining();
    const limit = quota.getLimitForPlan();
    const remainingLabel = Number.isFinite(remaining) ? `${remaining}/${limit}` : "∞";
    // Có ít nhất một kết quả đánh giá từ assistant → hiện CTA cài Extension.
    const hasAssessment = (0,react.useMemo)(()=>messages.some((m)=>m.role === "assistant" && m.assessment), [
        messages
    ]);
    // Tự cuộn xuống cuối mỗi khi có tin nhắn mới hoặc delta stream.
    process.env.__NEXT_PRIVATE_MINIMIZE_MACRO_FALSE && (0,react.useEffect)(()=>{
        const el = scrollRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [
        messages,
        isStreaming
    ]);
    // id của bong bóng assistant cuối cùng (để gắn con trỏ đang gõ khi stream).
    const lastAssistantId = (0,react.useMemo)(()=>{
        for(let i = messages.length - 1; i >= 0; i--){
            if (messages[i].role === "assistant") {
                return messages[i].id;
            }
        }
        return null;
    }, [
        messages
    ]);
    /** Gửi câu hỏi hiện tại: chặn rỗng, kiểm tra quota, dựng context. */ function handleSend() {
        const question = input.trim();
        // (Req 8.4) Câu hỏi rỗng sau trim → không gửi.
        if (question.length === 0) {
            return;
        }
        // Kiểm tra quota trước khi gửi; hết lượt → hiện CTA, KHÔNG gửi.
        if (!quota.canScan()) {
            setQuotaBlocked(true);
            return;
        }
        // Dựng context từ đầu vào: url nếu trông giống URL, ngược lại email —
        // để trợ lý trả về đánh giá đúng đối tượng (chat có ngữ cảnh).
        const context = {
            content: question,
            modality: (0,mock/* looksLikeUrl */.h0)(question) ? "url" : "email"
        };
        // Tiêu thụ đúng 1 lượt cho lần gửi hợp lệ rồi mở luồng chat.
        quota.consume();
        setQuotaBlocked(false);
        setInput("");
        void sendMessage(question, context);
    }
    /** Gửi bằng Enter (Shift+Enter để xuống dòng). */ function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }
    const showWelcome = messages.length === 0;
    return /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
        className: "mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col px-4 py-6",
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                ref: scrollRef,
                className: "flex-1 space-y-4 overflow-y-auto pb-4",
                "aria-live": "polite",
                children: [
                    showWelcome && /*#__PURE__*/ (0,react_jsx_runtime.jsx)(ChatMessage, {
                        message: {
                            id: "welcome",
                            role: "assistant",
                            text: WELCOME_TEXT,
                            createdAt: 0
                        }
                    }),
                    messages.map((message)=>/*#__PURE__*/ (0,react_jsx_runtime.jsx)(ChatMessage, {
                            message: message,
                            isStreaming: isStreaming && message.id === lastAssistantId
                        }, message.id)),
                    hasAssessment && /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                        className: "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800",
                        children: [
                            "\uD83D\uDCA1 Muốn được bảo vệ tự động khi duyệt web?",
                            " ",
                            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                                type: "button",
                                className: "font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950",
                                children: "C\xe0i Extension"
                            })
                        ]
                    })
                ]
            }),
            error && /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                role: "alert",
                className: "mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700",
                children: [
                    /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("span", {
                        children: [
                            "⚠ ",
                            error
                        ]
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                        type: "button",
                        onClick: ()=>{
                            void retryLast();
                        },
                        className: "shrink-0 rounded-md border border-red-300 bg-white px-3 py-1 font-medium text-red-700 hover:bg-red-100",
                        children: "Thử lại"
                    })
                ]
            }),
            quotaBlocked && /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                role: "alert",
                className: "mb-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-800",
                children: [
                    QUOTA_EXCEEDED_TEXT,
                    " ",
                    /*#__PURE__*/ (0,react_jsx_runtime.jsx)("a", {
                        href: "/pricing",
                        className: "font-semibold underline underline-offset-2",
                        children: "Xem g\xf3i n\xe2ng cấp"
                    })
                ]
            }),
            /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                className: "rounded-xl border border-gray-200 bg-white p-3 shadow-sm",
                children: [
                    /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                        className: "flex items-end gap-2",
                        children: [
                            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("textarea", {
                                value: input,
                                onChange: (e)=>setInput(e.target.value),
                                onKeyDown: handleKeyDown,
                                rows: 2,
                                placeholder: "D\xe1n URL hoặc nội dung email...",
                                "aria-label": "Nội dung cần đ\xe1nh gi\xe1",
                                className: "flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                            }),
                            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                                type: "button",
                                onClick: handleSend,
                                disabled: isStreaming || input.trim().length === 0,
                                className: "shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50",
                                children: "Gửi ▶"
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("div", {
                        className: "mt-2 flex items-center justify-between text-xs text-gray-500",
                        children: [
                            /*#__PURE__*/ (0,react_jsx_runtime.jsx)("button", {
                                type: "button",
                                className: "rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100",
                                "aria-label": "Tải file .eml",
                                children: "\uD83D\uDCCE Tải file .eml"
                            }),
                            /*#__PURE__*/ (0,react_jsx_runtime.jsxs)("span", {
                                children: [
                                    "C\xf2n lại h\xf4m nay: ",
                                    remainingLabel,
                                    " scan"
                                ]
                            })
                        ]
                    })
                ]
            })
        ]
    });
}


/***/ }),

/***/ 89527:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GlobalError: () => (/* reexport default from dynamic */ next_dist_client_components_builtin_global_error_js__WEBPACK_IMPORTED_MODULE_26___default.a),
/* harmony export */   __next_app__: () => (/* binding */ __next_app__),
/* harmony export */   handler: () => (/* binding */ handler),
/* harmony export */   pages: () => (/* binding */ pages),
/* harmony export */   routeModule: () => (/* binding */ routeModule),
/* harmony export */   tree: () => (/* binding */ tree)
/* harmony export */ });
/* harmony import */ var next_dist_server_route_modules_app_page_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(49754);
/* harmony import */ var next_dist_server_route_modules_app_page_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_page_module_compiled__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(9117);
/* harmony import */ var next_dist_server_instrumentation_utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(46595);
/* harmony import */ var next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(32324);
/* harmony import */ var next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(39326);
/* harmony import */ var next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(38928);
/* harmony import */ var next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var next_dist_server_app_render_interop_default__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(20175);
/* harmony import */ var next_dist_server_app_render_strip_flight_headers__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(12);
/* harmony import */ var next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(54290);
/* harmony import */ var next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_8__);
/* harmony import */ var next_dist_server_lib_experimental_ppr__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(12696);
/* harmony import */ var next_dist_server_lib_experimental_ppr__WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_experimental_ppr__WEBPACK_IMPORTED_MODULE_9__);
/* harmony import */ var next_dist_server_lib_is_rsc_request__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(52574);
/* harmony import */ var next_dist_server_request_fallback_params__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(82802);
/* harmony import */ var next_dist_server_app_render_encryption_utils__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(77533);
/* harmony import */ var next_dist_server_app_render_encryption_utils__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_app_render_encryption_utils__WEBPACK_IMPORTED_MODULE_12__);
/* harmony import */ var next_dist_server_lib_streaming_metadata__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(45229);
/* harmony import */ var next_dist_server_lib_streaming_metadata__WEBPACK_IMPORTED_MODULE_13___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_streaming_metadata__WEBPACK_IMPORTED_MODULE_13__);
/* harmony import */ var next_dist_server_app_render_action_utils__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(32822);
/* harmony import */ var next_dist_server_app_render_action_utils__WEBPACK_IMPORTED_MODULE_14___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_app_render_action_utils__WEBPACK_IMPORTED_MODULE_14__);
/* harmony import */ var next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(261);
/* harmony import */ var next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_15___default = /*#__PURE__*/__webpack_require__.n(next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_15__);
/* harmony import */ var next_dist_server_lib_server_action_request_meta__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(26453);
/* harmony import */ var next_dist_server_lib_server_action_request_meta__WEBPACK_IMPORTED_MODULE_16___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_server_action_request_meta__WEBPACK_IMPORTED_MODULE_16__);
/* harmony import */ var next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(52474);
/* harmony import */ var next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17___default = /*#__PURE__*/__webpack_require__.n(next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__);
/* harmony import */ var next_dist_shared_lib_router_utils_is_bot__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(26713);
/* harmony import */ var next_dist_shared_lib_router_utils_is_bot__WEBPACK_IMPORTED_MODULE_18___default = /*#__PURE__*/__webpack_require__.n(next_dist_shared_lib_router_utils_is_bot__WEBPACK_IMPORTED_MODULE_18__);
/* harmony import */ var next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(51356);
/* harmony import */ var next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__);
/* harmony import */ var next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(62685);
/* harmony import */ var next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20___default = /*#__PURE__*/__webpack_require__.n(next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__);
/* harmony import */ var next_dist_server_render_result__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(36225);
/* harmony import */ var next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(63446);
/* harmony import */ var next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22___default = /*#__PURE__*/__webpack_require__.n(next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__);
/* harmony import */ var next_dist_server_stream_utils_encoded_tags__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(2762);
/* harmony import */ var next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(45742);
/* harmony import */ var next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__);
/* harmony import */ var next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(86439);
/* harmony import */ var next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_25___default = /*#__PURE__*/__webpack_require__.n(next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_25__);
/* harmony import */ var next_dist_client_components_builtin_global_error_js__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(81170);
/* harmony import */ var next_dist_client_components_builtin_global_error_js__WEBPACK_IMPORTED_MODULE_26___default = /*#__PURE__*/__webpack_require__.n(next_dist_client_components_builtin_global_error_js__WEBPACK_IMPORTED_MODULE_26__);
/* harmony import */ var next_dist_server_app_render_entry_base__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(62506);
/* harmony import */ var next_dist_server_app_render_entry_base__WEBPACK_IMPORTED_MODULE_27___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_app_render_entry_base__WEBPACK_IMPORTED_MODULE_27__);
/* harmony import */ var next_dist_client_components_redirect_status_code__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(91203);
/* harmony import */ var next_dist_client_components_redirect_status_code__WEBPACK_IMPORTED_MODULE_28___default = /*#__PURE__*/__webpack_require__.n(next_dist_client_components_redirect_status_code__WEBPACK_IMPORTED_MODULE_28__);
/* harmony reexport (unknown) */ var __WEBPACK_REEXPORT_OBJECT__ = {};
/* harmony reexport (unknown) */ for(const __WEBPACK_IMPORT_KEY__ in next_dist_server_app_render_entry_base__WEBPACK_IMPORTED_MODULE_27__) if(["default","tree","pages","GlobalError","__next_app__","routeModule","handler"].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = () => next_dist_server_app_render_entry_base__WEBPACK_IMPORTED_MODULE_27__[__WEBPACK_IMPORT_KEY__]
/* harmony reexport (unknown) */ __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
const module0 = () => Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 16953));
const module1 = () => Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 81170, 23));
const module2 = () => Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 87028, 23));
const module3 = () => Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 90461, 23));
const module4 = () => Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 32768, 23));
const page5 = () => Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 59123));


























// We inject the tree and pages here so that we can use them in the route
// module.
const tree = {
        children: [
        '',
        {
        children: [
        'chat',
        {
        children: ['__PAGE__', {}, {
          page: [page5, "C:\\NDT\\PJ\\Ai_Security-main\\frontend\\web\\app\\chat\\page.tsx"],
          
        }]
      },
        {
        
        
      }
      ]
      },
        {
        'layout': [module0, "C:\\NDT\\PJ\\Ai_Security-main\\frontend\\web\\app\\layout.tsx"],
'global-error': [module1, "next/dist/client/components/builtin/global-error.js"],
'not-found': [module2, "next/dist/client/components/builtin/not-found.js"],
'forbidden': [module3, "next/dist/client/components/builtin/forbidden.js"],
'unauthorized': [module4, "next/dist/client/components/builtin/unauthorized.js"],
        
      }
      ]
      }.children;
const pages = ["C:\\NDT\\PJ\\Ai_Security-main\\frontend\\web\\app\\chat\\page.tsx"];



const __next_app_require__ = __webpack_require__
const __next_app_load_chunk__ = () => Promise.resolve()
const __next_app__ = {
    require: __next_app_require__,
    loadChunk: __next_app_load_chunk__
};



// Create and export the route module that will be consumed.
const routeModule = new next_dist_server_route_modules_app_page_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppPageRouteModule({
    definition: {
        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_PAGE,
        page: "/chat/page",
        pathname: "/chat",
        // The following aren't used in production.
        bundlePath: '',
        filename: '',
        appPaths: []
    },
    userland: {
        loaderTree: tree
    },
    distDir: ".next-production-clean" || 0,
    relativeProjectDir:  false || ''
});
async function handler(req, res, ctx) {
    var _this;
    let srcPage = "/chat/page";
    // turbopack doesn't normalize `/index` in the page name
    // so we need to to process dynamic routes properly
    // TODO: fix turbopack providing differing value from webpack
    if (false) {} else if (srcPage === '/index') {
        // we always normalize /index specifically
        srcPage = '/';
    }
    const multiZoneDraftMode = false;
    const initialPostponed = (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'postponed');
    // TODO: replace with more specific flags
    const minimalMode = (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'minimalMode');
    const prepareResult = await routeModule.prepare(req, res, {
        srcPage,
        multiZoneDraftMode
    });
    if (!prepareResult) {
        res.statusCode = 400;
        res.end('Bad Request');
        ctx.waitUntil == null ? void 0 : ctx.waitUntil.call(ctx, Promise.resolve());
        return null;
    }
    const { buildId, query, params, parsedUrl, pageIsDynamic, buildManifest, nextFontManifest, reactLoadableManifest, serverActionsManifest, clientReferenceManifest, subresourceIntegrityManifest, prerenderManifest, isDraftMode, resolvedPathname, revalidateOnlyGenerated, routerServerContext, nextConfig, interceptionRoutePatterns } = prepareResult;
    const pathname = parsedUrl.pathname || '/';
    const normalizedSrcPage = (0,next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_15__.normalizeAppPath)(srcPage);
    let { isOnDemandRevalidate } = prepareResult;
    const prerenderInfo = routeModule.match(pathname, prerenderManifest);
    const isPrerendered = !!prerenderManifest.routes[resolvedPathname];
    let isSSG = Boolean(prerenderInfo || isPrerendered || prerenderManifest.routes[normalizedSrcPage]);
    const userAgent = req.headers['user-agent'] || '';
    const botType = (0,next_dist_shared_lib_router_utils_is_bot__WEBPACK_IMPORTED_MODULE_18__.getBotType)(userAgent);
    const isHtmlBot = (0,next_dist_server_lib_streaming_metadata__WEBPACK_IMPORTED_MODULE_13__.isHtmlBotRequest)(req);
    /**
   * If true, this indicates that the request being made is for an app
   * prefetch request.
   */ const isPrefetchRSCRequest = (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'isPrefetchRSCRequest') ?? req.headers[next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.NEXT_ROUTER_PREFETCH_HEADER] === '1' // exclude runtime prefetches, which use '2'
    ;
    // NOTE: Don't delete headers[RSC] yet, it still needs to be used in renderToHTML later
    const isRSCRequest = (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'isRSCRequest') ?? (0,next_dist_server_lib_is_rsc_request__WEBPACK_IMPORTED_MODULE_10__/* .isRSCRequestHeader */ .f)(req.headers[next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.RSC_HEADER]);
    const isPossibleServerAction = (0,next_dist_server_lib_server_action_request_meta__WEBPACK_IMPORTED_MODULE_16__.getIsPossibleServerAction)(req);
    /**
   * If the route being rendered is an app page, and the ppr feature has been
   * enabled, then the given route _could_ support PPR.
   */ const couldSupportPPR = (0,next_dist_server_lib_experimental_ppr__WEBPACK_IMPORTED_MODULE_9__.checkIsAppPPREnabled)(nextConfig.experimental.ppr);
    // When enabled, this will allow the use of the `?__nextppronly` query to
    // enable debugging of the static shell.
    const hasDebugStaticShellQuery =  false && 0;
    // When enabled, this will allow the use of the `?__nextppronly` query
    // to enable debugging of the fallback shell.
    const hasDebugFallbackShellQuery = hasDebugStaticShellQuery && query.__nextppronly === 'fallback';
    // This page supports PPR if it is marked as being `PARTIALLY_STATIC` in the
    // prerender manifest and this is an app page.
    const isRoutePPREnabled = couldSupportPPR && (((_this = prerenderManifest.routes[normalizedSrcPage] ?? prerenderManifest.dynamicRoutes[normalizedSrcPage]) == null ? void 0 : _this.renderingMode) === 'PARTIALLY_STATIC' || // Ideally we'd want to check the appConfig to see if this page has PPR
    // enabled or not, but that would require plumbing the appConfig through
    // to the server during development. We assume that the page supports it
    // but only during development.
    hasDebugStaticShellQuery && (routeModule.isDev === true || (routerServerContext == null ? void 0 : routerServerContext.experimentalTestProxy) === true));
    const isDebugStaticShell = hasDebugStaticShellQuery && isRoutePPREnabled;
    // We should enable debugging dynamic accesses when the static shell
    // debugging has been enabled and we're also in development mode.
    const isDebugDynamicAccesses = isDebugStaticShell && routeModule.isDev === true;
    const isDebugFallbackShell = hasDebugFallbackShellQuery && isRoutePPREnabled;
    // If we're in minimal mode, then try to get the postponed information from
    // the request metadata. If available, use it for resuming the postponed
    // render.
    const minimalPostponed = isRoutePPREnabled ? initialPostponed : undefined;
    // If PPR is enabled, and this is a RSC request (but not a prefetch), then
    // we can use this fact to only generate the flight data for the request
    // because we can't cache the HTML (as it's also dynamic).
    const isDynamicRSCRequest = isRoutePPREnabled && isRSCRequest && !isPrefetchRSCRequest;
    // Need to read this before it's stripped by stripFlightHeaders. We don't
    // need to transfer it to the request meta because it's only read
    // within this function; the static segment data should have already been
    // generated, so we will always either return a static response or a 404.
    const segmentPrefetchHeader = (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'segmentPrefetchRSCRequest');
    // TODO: investigate existing bug with shouldServeStreamingMetadata always
    // being true for a revalidate due to modifying the base-server this.renderOpts
    // when fixing this to correct logic it causes hydration issue since we set
    // serveStreamingMetadata to true during export
    let serveStreamingMetadata = !userAgent ? true : (0,next_dist_server_lib_streaming_metadata__WEBPACK_IMPORTED_MODULE_13__.shouldServeStreamingMetadata)(userAgent, nextConfig.htmlLimitedBots);
    if (isHtmlBot && isRoutePPREnabled) {
        isSSG = false;
        serveStreamingMetadata = false;
    }
    // In development, we always want to generate dynamic HTML.
    let supportsDynamicResponse = // If we're in development, we always support dynamic HTML, unless it's
    // a data request, in which case we only produce static HTML.
    routeModule.isDev === true || // If this is not SSG or does not have static paths, then it supports
    // dynamic HTML.
    !isSSG || // If this request has provided postponed data, it supports dynamic
    // HTML.
    typeof initialPostponed === 'string' || // If this is a dynamic RSC request, then this render supports dynamic
    // HTML (it's dynamic).
    isDynamicRSCRequest;
    // When html bots request PPR page, perform the full dynamic rendering.
    const shouldWaitOnAllReady = isHtmlBot && isRoutePPREnabled;
    let ssgCacheKey = null;
    if (!isDraftMode && isSSG && !supportsDynamicResponse && !isPossibleServerAction && !minimalPostponed && !isDynamicRSCRequest) {
        ssgCacheKey = resolvedPathname;
    }
    // the staticPathKey differs from ssgCacheKey since
    // ssgCacheKey is null in dev since we're always in "dynamic"
    // mode in dev to bypass the cache, but we still need to honor
    // dynamicParams = false in dev mode
    let staticPathKey = ssgCacheKey;
    if (!staticPathKey && routeModule.isDev) {
        staticPathKey = resolvedPathname;
    }
    // If this is a request for an app path that should be statically generated
    // and we aren't in the edge runtime, strip the flight headers so it will
    // generate the static response.
    if (!routeModule.isDev && !isDraftMode && isSSG && isRSCRequest && !isDynamicRSCRequest) {
        (0,next_dist_server_app_render_strip_flight_headers__WEBPACK_IMPORTED_MODULE_7__/* .stripFlightHeaders */ .d)(req.headers);
    }
    const ComponentMod = {
        ...next_dist_server_app_render_entry_base__WEBPACK_IMPORTED_MODULE_27__,
        tree,
        pages,
        GlobalError: (next_dist_client_components_builtin_global_error_js__WEBPACK_IMPORTED_MODULE_26___default()),
        handler,
        routeModule,
        __next_app__
    };
    // Before rendering (which initializes component tree modules), we have to
    // set the reference manifests to our global store so Server Action's
    // encryption util can access to them at the top level of the page module.
    if (serverActionsManifest && clientReferenceManifest) {
        (0,next_dist_server_app_render_encryption_utils__WEBPACK_IMPORTED_MODULE_12__.setReferenceManifestsSingleton)({
            page: srcPage,
            clientReferenceManifest,
            serverActionsManifest,
            serverModuleMap: (0,next_dist_server_app_render_action_utils__WEBPACK_IMPORTED_MODULE_14__.createServerModuleMap)({
                serverActionsManifest
            })
        });
    }
    const method = req.method || 'GET';
    const tracer = (0,next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_3__.getTracer)();
    const activeSpan = tracer.getActiveScopeSpan();
    try {
        const varyHeader = routeModule.getVaryHeader(resolvedPathname, interceptionRoutePatterns);
        res.setHeader('Vary', varyHeader);
        const invokeRouteModule = async (span, context)=>{
            const nextReq = new next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_8__.NodeNextRequest(req);
            const nextRes = new next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_8__.NodeNextResponse(res);
            // TODO: adapt for putting the RDC inside the postponed data
            // If we're in dev, and this isn't a prefetch or a server action,
            // we should seed the resume data cache.
            if (false) {}
            return routeModule.render(nextReq, nextRes, context).finally(()=>{
                if (!span) return;
                span.setAttributes({
                    'http.status_code': res.statusCode,
                    'next.rsc': false
                });
                const rootSpanAttributes = tracer.getRootSpanAttributes();
                // We were unable to get attributes, probably OTEL is not enabled
                if (!rootSpanAttributes) {
                    return;
                }
                if (rootSpanAttributes.get('next.span_type') !== next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_5__.BaseServerSpan.handleRequest) {
                    console.warn(`Unexpected root span type '${rootSpanAttributes.get('next.span_type')}'. Please report this Next.js issue https://github.com/vercel/next.js`);
                    return;
                }
                const route = rootSpanAttributes.get('next.route');
                if (route) {
                    const name = `${method} ${route}`;
                    span.setAttributes({
                        'next.route': route,
                        'http.route': route,
                        'next.span_name': name
                    });
                    span.updateName(name);
                } else {
                    span.updateName(`${method} ${req.url}`);
                }
            });
        };
        const doRender = async ({ span, postponed, fallbackRouteParams })=>{
            const context = {
                query,
                params,
                page: normalizedSrcPage,
                sharedContext: {
                    buildId
                },
                serverComponentsHmrCache: (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'serverComponentsHmrCache'),
                fallbackRouteParams,
                renderOpts: {
                    App: ()=>null,
                    Document: ()=>null,
                    pageConfig: {},
                    ComponentMod,
                    Component: (0,next_dist_server_app_render_interop_default__WEBPACK_IMPORTED_MODULE_6__/* .interopDefault */ .T)(ComponentMod),
                    params,
                    routeModule,
                    page: srcPage,
                    postponed,
                    shouldWaitOnAllReady,
                    serveStreamingMetadata,
                    supportsDynamicResponse: typeof postponed === 'string' || supportsDynamicResponse,
                    buildManifest,
                    nextFontManifest,
                    reactLoadableManifest,
                    subresourceIntegrityManifest,
                    serverActionsManifest,
                    clientReferenceManifest,
                    setIsrStatus: routerServerContext == null ? void 0 : routerServerContext.setIsrStatus,
                    dir:  true ? (__webpack_require__(33873).join)(/* turbopackIgnore: true */ process.cwd(), routeModule.relativeProjectDir) : 0,
                    isDraftMode,
                    isRevalidate: isSSG && !postponed && !isDynamicRSCRequest,
                    botType,
                    isOnDemandRevalidate,
                    isPossibleServerAction,
                    assetPrefix: nextConfig.assetPrefix,
                    nextConfigOutput: nextConfig.output,
                    crossOrigin: nextConfig.crossOrigin,
                    trailingSlash: nextConfig.trailingSlash,
                    previewProps: prerenderManifest.preview,
                    deploymentId: nextConfig.deploymentId,
                    enableTainting: nextConfig.experimental.taint,
                    htmlLimitedBots: nextConfig.htmlLimitedBots,
                    devtoolSegmentExplorer: nextConfig.experimental.devtoolSegmentExplorer,
                    reactMaxHeadersLength: nextConfig.reactMaxHeadersLength,
                    multiZoneDraftMode,
                    incrementalCache: (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'incrementalCache'),
                    cacheLifeProfiles: nextConfig.experimental.cacheLife,
                    basePath: nextConfig.basePath,
                    serverActions: nextConfig.experimental.serverActions,
                    ...isDebugStaticShell || isDebugDynamicAccesses ? {
                        nextExport: true,
                        supportsDynamicResponse: false,
                        isStaticGeneration: true,
                        isRevalidate: true,
                        isDebugDynamicAccesses: isDebugDynamicAccesses
                    } : {},
                    experimental: {
                        isRoutePPREnabled,
                        expireTime: nextConfig.expireTime,
                        staleTimes: nextConfig.experimental.staleTimes,
                        cacheComponents: Boolean(nextConfig.experimental.cacheComponents),
                        clientSegmentCache: Boolean(nextConfig.experimental.clientSegmentCache),
                        clientParamParsing: Boolean(nextConfig.experimental.clientParamParsing),
                        dynamicOnHover: Boolean(nextConfig.experimental.dynamicOnHover),
                        inlineCss: Boolean(nextConfig.experimental.inlineCss),
                        authInterrupts: Boolean(nextConfig.experimental.authInterrupts),
                        clientTraceMetadata: nextConfig.experimental.clientTraceMetadata || []
                    },
                    waitUntil: ctx.waitUntil,
                    onClose: (cb)=>{
                        res.on('close', cb);
                    },
                    onAfterTaskError: ()=>{},
                    onInstrumentationRequestError: (error, _request, errorContext)=>routeModule.onRequestError(req, error, errorContext, routerServerContext),
                    err: (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'invokeError'),
                    dev: routeModule.isDev
                }
            };
            const result = await invokeRouteModule(span, context);
            const { metadata } = result;
            const { cacheControl, headers = {}, // Add any fetch tags that were on the page to the response headers.
            fetchTags: cacheTags } = metadata;
            if (cacheTags) {
                headers[next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.NEXT_CACHE_TAGS_HEADER] = cacheTags;
            }
            // Pull any fetch metrics from the render onto the request.
            ;
            req.fetchMetrics = metadata.fetchMetrics;
            // we don't throw static to dynamic errors in dev as isSSG
            // is a best guess in dev since we don't have the prerender pass
            // to know whether the path is actually static or not
            if (isSSG && (cacheControl == null ? void 0 : cacheControl.revalidate) === 0 && !routeModule.isDev && !isRoutePPREnabled) {
                const staticBailoutInfo = metadata.staticBailoutInfo;
                const err = Object.defineProperty(new Error(`Page changed from static to dynamic at runtime ${resolvedPathname}${(staticBailoutInfo == null ? void 0 : staticBailoutInfo.description) ? `, reason: ${staticBailoutInfo.description}` : ``}` + `\nsee more here https://nextjs.org/docs/messages/app-static-to-dynamic-error`), "__NEXT_ERROR_CODE", {
                    value: "E132",
                    enumerable: false,
                    configurable: true
                });
                if (staticBailoutInfo == null ? void 0 : staticBailoutInfo.stack) {
                    const stack = staticBailoutInfo.stack;
                    err.stack = err.message + stack.substring(stack.indexOf('\n'));
                }
                throw err;
            }
            return {
                value: {
                    kind: next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__.CachedRouteKind.APP_PAGE,
                    html: result,
                    headers,
                    rscData: metadata.flightData,
                    postponed: metadata.postponed,
                    status: metadata.statusCode,
                    segmentData: metadata.segmentData
                },
                cacheControl
            };
        };
        const responseGenerator = async ({ hasResolved, previousCacheEntry, isRevalidating, span })=>{
            const isProduction = routeModule.isDev === false;
            const didRespond = hasResolved || res.writableEnded;
            // skip on-demand revalidate if cache is not present and
            // revalidate-if-generated is set
            if (isOnDemandRevalidate && revalidateOnlyGenerated && !previousCacheEntry && !minimalMode) {
                if (routerServerContext == null ? void 0 : routerServerContext.render404) {
                    await routerServerContext.render404(req, res);
                } else {
                    res.statusCode = 404;
                    res.end('This page could not be found');
                }
                return null;
            }
            let fallbackMode;
            if (prerenderInfo) {
                fallbackMode = (0,next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.parseFallbackField)(prerenderInfo.fallback);
            }
            // When serving a HTML bot request, we want to serve a blocking render and
            // not the prerendered page. This ensures that the correct content is served
            // to the bot in the head.
            if (fallbackMode === next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.FallbackMode.PRERENDER && (0,next_dist_shared_lib_router_utils_is_bot__WEBPACK_IMPORTED_MODULE_18__.isBot)(userAgent)) {
                if (!isRoutePPREnabled || isHtmlBot) {
                    fallbackMode = next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.FallbackMode.BLOCKING_STATIC_RENDER;
                }
            }
            if ((previousCacheEntry == null ? void 0 : previousCacheEntry.isStale) === -1) {
                isOnDemandRevalidate = true;
            }
            // TODO: adapt for PPR
            // only allow on-demand revalidate for fallback: true/blocking
            // or for prerendered fallback: false paths
            if (isOnDemandRevalidate && (fallbackMode !== next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.FallbackMode.NOT_FOUND || previousCacheEntry)) {
                fallbackMode = next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.FallbackMode.BLOCKING_STATIC_RENDER;
            }
            if (!minimalMode && fallbackMode !== next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.FallbackMode.BLOCKING_STATIC_RENDER && staticPathKey && !didRespond && !isDraftMode && pageIsDynamic && (isProduction || !isPrerendered)) {
                // if the page has dynamicParams: false and this pathname wasn't
                // prerendered trigger the no fallback handling
                if (// In development, fall through to render to handle missing
                // getStaticPaths.
                (isProduction || prerenderInfo) && // When fallback isn't present, abort this render so we 404
                fallbackMode === next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.FallbackMode.NOT_FOUND) {
                    throw new next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_25__.NoFallbackError();
                }
                let fallbackResponse;
                if (isRoutePPREnabled && !isRSCRequest) {
                    const cacheKey = typeof (prerenderInfo == null ? void 0 : prerenderInfo.fallback) === 'string' ? prerenderInfo.fallback : isProduction ? normalizedSrcPage : null;
                    // We use the response cache here to handle the revalidation and
                    // management of the fallback shell.
                    fallbackResponse = await routeModule.handleResponse({
                        cacheKey,
                        req,
                        nextConfig,
                        routeKind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_PAGE,
                        isFallback: true,
                        prerenderManifest,
                        isRoutePPREnabled,
                        responseGenerator: async ()=>doRender({
                                span,
                                // We pass `undefined` as rendering a fallback isn't resumed
                                // here.
                                postponed: undefined,
                                fallbackRouteParams: // If we're in production or we're debugging the fallback
                                // shell then we should postpone when dynamic params are
                                // accessed.
                                isProduction || isDebugFallbackShell ? (0,next_dist_server_request_fallback_params__WEBPACK_IMPORTED_MODULE_11__/* .getFallbackRouteParams */ .u)(normalizedSrcPage) : null
                            }),
                        waitUntil: ctx.waitUntil
                    });
                    // If the fallback response was set to null, then we should return null.
                    if (fallbackResponse === null) return null;
                    // Otherwise, if we did get a fallback response, we should return it.
                    if (fallbackResponse) {
                        // Remove the cache control from the response to prevent it from being
                        // used in the surrounding cache.
                        delete fallbackResponse.cacheControl;
                        return fallbackResponse;
                    }
                }
            }
            // Only requests that aren't revalidating can be resumed. If we have the
            // minimal postponed data, then we should resume the render with it.
            const postponed = !isOnDemandRevalidate && !isRevalidating && minimalPostponed ? minimalPostponed : undefined;
            // When we're in minimal mode, if we're trying to debug the static shell,
            // we should just return nothing instead of resuming the dynamic render.
            if ((isDebugStaticShell || isDebugDynamicAccesses) && typeof postponed !== 'undefined') {
                return {
                    cacheControl: {
                        revalidate: 1,
                        expire: undefined
                    },
                    value: {
                        kind: next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__.CachedRouteKind.PAGES,
                        html: next_dist_server_render_result__WEBPACK_IMPORTED_MODULE_21__["default"].EMPTY,
                        pageData: {},
                        headers: undefined,
                        status: undefined
                    }
                };
            }
            // If this is a dynamic route with PPR enabled and the default route
            // matches were set, then we should pass the fallback route params to
            // the renderer as this is a fallback revalidation request.
            const fallbackRouteParams = pageIsDynamic && isRoutePPREnabled && ((0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'renderFallbackShell') || isDebugFallbackShell) ? (0,next_dist_server_request_fallback_params__WEBPACK_IMPORTED_MODULE_11__/* .getFallbackRouteParams */ .u)(pathname) : null;
            // Perform the render.
            return doRender({
                span,
                postponed,
                fallbackRouteParams
            });
        };
        const handleResponse = async (span)=>{
            var _cacheEntry_value, _cachedData_headers;
            const cacheEntry = await routeModule.handleResponse({
                cacheKey: ssgCacheKey,
                responseGenerator: (c)=>responseGenerator({
                        span,
                        ...c
                    }),
                routeKind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_PAGE,
                isOnDemandRevalidate,
                isRoutePPREnabled,
                req,
                nextConfig,
                prerenderManifest,
                waitUntil: ctx.waitUntil
            });
            if (isDraftMode) {
                res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
            }
            // In dev, we should not cache pages for any reason.
            if (routeModule.isDev) {
                res.setHeader('Cache-Control', 'no-store, must-revalidate');
            }
            if (!cacheEntry) {
                if (ssgCacheKey) {
                    // A cache entry might not be generated if a response is written
                    // in `getInitialProps` or `getServerSideProps`, but those shouldn't
                    // have a cache key. If we do have a cache key but we don't end up
                    // with a cache entry, then either Next.js or the application has a
                    // bug that needs fixing.
                    throw Object.defineProperty(new Error('invariant: cache entry required but not generated'), "__NEXT_ERROR_CODE", {
                        value: "E62",
                        enumerable: false,
                        configurable: true
                    });
                }
                return null;
            }
            if (((_cacheEntry_value = cacheEntry.value) == null ? void 0 : _cacheEntry_value.kind) !== next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__.CachedRouteKind.APP_PAGE) {
                var _cacheEntry_value1;
                throw Object.defineProperty(new Error(`Invariant app-page handler received invalid cache entry ${(_cacheEntry_value1 = cacheEntry.value) == null ? void 0 : _cacheEntry_value1.kind}`), "__NEXT_ERROR_CODE", {
                    value: "E707",
                    enumerable: false,
                    configurable: true
                });
            }
            const didPostpone = typeof cacheEntry.value.postponed === 'string';
            if (isSSG && // We don't want to send a cache header for requests that contain dynamic
            // data. If this is a Dynamic RSC request or wasn't a Prefetch RSC
            // request, then we should set the cache header.
            !isDynamicRSCRequest && (!didPostpone || isPrefetchRSCRequest)) {
                if (!minimalMode) {
                    // set x-nextjs-cache header to match the header
                    // we set for the image-optimizer
                    res.setHeader('x-nextjs-cache', isOnDemandRevalidate ? 'REVALIDATED' : cacheEntry.isMiss ? 'MISS' : cacheEntry.isStale ? 'STALE' : 'HIT');
                }
                // Set a header used by the client router to signal the response is static
                // and should respect the `static` cache staleTime value.
                res.setHeader(next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.NEXT_IS_PRERENDER_HEADER, '1');
            }
            const { value: cachedData } = cacheEntry;
            // Coerce the cache control parameter from the render.
            let cacheControl;
            // If this is a resume request in minimal mode it is streamed with dynamic
            // content and should not be cached.
            if (minimalPostponed) {
                cacheControl = {
                    revalidate: 0,
                    expire: undefined
                };
            } else if (minimalMode && isRSCRequest && !isPrefetchRSCRequest && isRoutePPREnabled) {
                cacheControl = {
                    revalidate: 0,
                    expire: undefined
                };
            } else if (!routeModule.isDev) {
                // If this is a preview mode request, we shouldn't cache it
                if (isDraftMode) {
                    cacheControl = {
                        revalidate: 0,
                        expire: undefined
                    };
                } else if (!isSSG) {
                    if (!res.getHeader('Cache-Control')) {
                        cacheControl = {
                            revalidate: 0,
                            expire: undefined
                        };
                    }
                } else if (cacheEntry.cacheControl) {
                    // If the cache entry has a cache control with a revalidate value that's
                    // a number, use it.
                    if (typeof cacheEntry.cacheControl.revalidate === 'number') {
                        var _cacheEntry_cacheControl;
                        if (cacheEntry.cacheControl.revalidate < 1) {
                            throw Object.defineProperty(new Error(`Invalid revalidate configuration provided: ${cacheEntry.cacheControl.revalidate} < 1`), "__NEXT_ERROR_CODE", {
                                value: "E22",
                                enumerable: false,
                                configurable: true
                            });
                        }
                        cacheControl = {
                            revalidate: cacheEntry.cacheControl.revalidate,
                            expire: ((_cacheEntry_cacheControl = cacheEntry.cacheControl) == null ? void 0 : _cacheEntry_cacheControl.expire) ?? nextConfig.expireTime
                        };
                    } else {
                        cacheControl = {
                            revalidate: next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.CACHE_ONE_YEAR,
                            expire: undefined
                        };
                    }
                }
            }
            cacheEntry.cacheControl = cacheControl;
            if (typeof segmentPrefetchHeader === 'string' && (cachedData == null ? void 0 : cachedData.kind) === next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__.CachedRouteKind.APP_PAGE && cachedData.segmentData) {
                var _cachedData_headers1;
                // This is a prefetch request issued by the client Segment Cache. These
                // should never reach the application layer (lambda). We should either
                // respond from the cache (HIT) or respond with 204 No Content (MISS).
                // Set a header to indicate that PPR is enabled for this route. This
                // lets the client distinguish between a regular cache miss and a cache
                // miss due to PPR being disabled. In other contexts this header is used
                // to indicate that the response contains dynamic data, but here we're
                // only using it to indicate that the feature is enabled — the segment
                // response itself contains whether the data is dynamic.
                res.setHeader(next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.NEXT_DID_POSTPONE_HEADER, '2');
                // Add the cache tags header to the response if it exists and we're in
                // minimal mode while rendering a static page.
                const tags = (_cachedData_headers1 = cachedData.headers) == null ? void 0 : _cachedData_headers1[next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.NEXT_CACHE_TAGS_HEADER];
                if (minimalMode && isSSG && tags && typeof tags === 'string') {
                    res.setHeader(next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.NEXT_CACHE_TAGS_HEADER, tags);
                }
                const matchedSegment = cachedData.segmentData.get(segmentPrefetchHeader);
                if (matchedSegment !== undefined) {
                    // Cache hit
                    return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                        req,
                        res,
                        generateEtags: nextConfig.generateEtags,
                        poweredByHeader: nextConfig.poweredByHeader,
                        result: next_dist_server_render_result__WEBPACK_IMPORTED_MODULE_21__["default"].fromStatic(matchedSegment, next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.RSC_CONTENT_TYPE_HEADER),
                        cacheControl: cacheEntry.cacheControl
                    });
                }
                // Cache miss. Either a cache entry for this route has not been generated
                // (which technically should not be possible when PPR is enabled, because
                // at a minimum there should always be a fallback entry) or there's no
                // match for the requested segment. Respond with a 204 No Content. We
                // don't bother to respond with 404, because these requests are only
                // issued as part of a prefetch.
                res.statusCode = 204;
                return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                    req,
                    res,
                    generateEtags: nextConfig.generateEtags,
                    poweredByHeader: nextConfig.poweredByHeader,
                    result: next_dist_server_render_result__WEBPACK_IMPORTED_MODULE_21__["default"].EMPTY,
                    cacheControl: cacheEntry.cacheControl
                });
            }
            // If there's a callback for `onCacheEntry`, call it with the cache entry
            // and the revalidate options.
            const onCacheEntry = (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'onCacheEntry');
            if (onCacheEntry) {
                const finished = await onCacheEntry({
                    ...cacheEntry,
                    // TODO: remove this when upstream doesn't
                    // always expect this value to be "PAGE"
                    value: {
                        ...cacheEntry.value,
                        kind: 'PAGE'
                    }
                }, {
                    url: (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'initURL')
                });
                if (finished) {
                    // TODO: maybe we have to end the request?
                    return null;
                }
            }
            // If the request has a postponed state and it's a resume request we
            // should error.
            if (didPostpone && minimalPostponed) {
                throw Object.defineProperty(new Error('Invariant: postponed state should not be present on a resume request'), "__NEXT_ERROR_CODE", {
                    value: "E396",
                    enumerable: false,
                    configurable: true
                });
            }
            if (cachedData.headers) {
                const headers = {
                    ...cachedData.headers
                };
                if (!minimalMode || !isSSG) {
                    delete headers[next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.NEXT_CACHE_TAGS_HEADER];
                }
                for (let [key, value] of Object.entries(headers)){
                    if (typeof value === 'undefined') continue;
                    if (Array.isArray(value)) {
                        for (const v of value){
                            res.appendHeader(key, v);
                        }
                    } else if (typeof value === 'number') {
                        value = value.toString();
                        res.appendHeader(key, value);
                    } else {
                        res.appendHeader(key, value);
                    }
                }
            }
            // Add the cache tags header to the response if it exists and we're in
            // minimal mode while rendering a static page.
            const tags = (_cachedData_headers = cachedData.headers) == null ? void 0 : _cachedData_headers[next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.NEXT_CACHE_TAGS_HEADER];
            if (minimalMode && isSSG && tags && typeof tags === 'string') {
                res.setHeader(next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.NEXT_CACHE_TAGS_HEADER, tags);
            }
            // If the request is a data request, then we shouldn't set the status code
            // from the response because it should always be 200. This should be gated
            // behind the experimental PPR flag.
            if (cachedData.status && (!isRSCRequest || !isRoutePPREnabled)) {
                res.statusCode = cachedData.status;
            }
            // Redirect information is encoded in RSC payload, so we don't need to use redirect status codes
            if (!minimalMode && cachedData.status && next_dist_client_components_redirect_status_code__WEBPACK_IMPORTED_MODULE_28__.RedirectStatusCode[cachedData.status] && isRSCRequest) {
                res.statusCode = 200;
            }
            // Mark that the request did postpone.
            if (didPostpone) {
                res.setHeader(next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.NEXT_DID_POSTPONE_HEADER, '1');
            }
            // we don't go through this block when preview mode is true
            // as preview mode is a dynamic request (bypasses cache) and doesn't
            // generate both HTML and payloads in the same request so continue to just
            // return the generated payload
            if (isRSCRequest && !isDraftMode) {
                // If this is a dynamic RSC request, then stream the response.
                if (typeof cachedData.rscData === 'undefined') {
                    if (cachedData.postponed) {
                        throw Object.defineProperty(new Error('Invariant: Expected postponed to be undefined'), "__NEXT_ERROR_CODE", {
                            value: "E372",
                            enumerable: false,
                            configurable: true
                        });
                    }
                    return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                        req,
                        res,
                        generateEtags: nextConfig.generateEtags,
                        poweredByHeader: nextConfig.poweredByHeader,
                        result: cachedData.html,
                        // Dynamic RSC responses cannot be cached, even if they're
                        // configured with `force-static` because we have no way of
                        // distinguishing between `force-static` and pages that have no
                        // postponed state.
                        // TODO: distinguish `force-static` from pages with no postponed state (static)
                        cacheControl: isDynamicRSCRequest ? {
                            revalidate: 0,
                            expire: undefined
                        } : cacheEntry.cacheControl
                    });
                }
                // As this isn't a prefetch request, we should serve the static flight
                // data.
                return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                    req,
                    res,
                    generateEtags: nextConfig.generateEtags,
                    poweredByHeader: nextConfig.poweredByHeader,
                    result: next_dist_server_render_result__WEBPACK_IMPORTED_MODULE_21__["default"].fromStatic(cachedData.rscData, next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.RSC_CONTENT_TYPE_HEADER),
                    cacheControl: cacheEntry.cacheControl
                });
            }
            // This is a request for HTML data.
            let body = cachedData.html;
            // If there's no postponed state, we should just serve the HTML. This
            // should also be the case for a resume request because it's completed
            // as a server render (rather than a static render).
            if (!didPostpone || minimalMode || isRSCRequest) {
                // If we're in test mode, we should add a sentinel chunk to the response
                // that's between the static and dynamic parts so we can compare the
                // chunks and add assertions.
                if (false) {}
                return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                    req,
                    res,
                    generateEtags: nextConfig.generateEtags,
                    poweredByHeader: nextConfig.poweredByHeader,
                    result: body,
                    cacheControl: cacheEntry.cacheControl
                });
            }
            // If we're debugging the static shell or the dynamic API accesses, we
            // should just serve the HTML without resuming the render. The returned
            // HTML will be the static shell so all the Dynamic API's will be used
            // during static generation.
            if (isDebugStaticShell || isDebugDynamicAccesses) {
                // Since we're not resuming the render, we need to at least add the
                // closing body and html tags to create valid HTML.
                body.push(new ReadableStream({
                    start (controller) {
                        controller.enqueue(next_dist_server_stream_utils_encoded_tags__WEBPACK_IMPORTED_MODULE_23__.ENCODED_TAGS.CLOSED.BODY_AND_HTML);
                        controller.close();
                    }
                }));
                return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                    req,
                    res,
                    generateEtags: nextConfig.generateEtags,
                    poweredByHeader: nextConfig.poweredByHeader,
                    result: body,
                    cacheControl: {
                        revalidate: 0,
                        expire: undefined
                    }
                });
            }
            // If we're in test mode, we should add a sentinel chunk to the response
            // that's between the static and dynamic parts so we can compare the
            // chunks and add assertions.
            if (false) {}
            // This request has postponed, so let's create a new transformer that the
            // dynamic data can pipe to that will attach the dynamic data to the end
            // of the response.
            const transformer = new TransformStream();
            body.push(transformer.readable);
            // Perform the render again, but this time, provide the postponed state.
            // We don't await because we want the result to start streaming now, and
            // we've already chained the transformer's readable to the render result.
            doRender({
                span,
                postponed: cachedData.postponed,
                // This is a resume render, not a fallback render, so we don't need to
                // set this.
                fallbackRouteParams: null
            }).then(async (result)=>{
                var _result_value;
                if (!result) {
                    throw Object.defineProperty(new Error('Invariant: expected a result to be returned'), "__NEXT_ERROR_CODE", {
                        value: "E463",
                        enumerable: false,
                        configurable: true
                    });
                }
                if (((_result_value = result.value) == null ? void 0 : _result_value.kind) !== next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__.CachedRouteKind.APP_PAGE) {
                    var _result_value1;
                    throw Object.defineProperty(new Error(`Invariant: expected a page response, got ${(_result_value1 = result.value) == null ? void 0 : _result_value1.kind}`), "__NEXT_ERROR_CODE", {
                        value: "E305",
                        enumerable: false,
                        configurable: true
                    });
                }
                // Pipe the resume result to the transformer.
                await result.value.html.pipeTo(transformer.writable);
            }).catch((err)=>{
                // An error occurred during piping or preparing the render, abort
                // the transformers writer so we can terminate the stream.
                transformer.writable.abort(err).catch((e)=>{
                    console.error("couldn't abort transformer", e);
                });
            });
            return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                req,
                res,
                generateEtags: nextConfig.generateEtags,
                poweredByHeader: nextConfig.poweredByHeader,
                result: body,
                // We don't want to cache the response if it has postponed data because
                // the response being sent to the client it's dynamic parts are streamed
                // to the client on the same request.
                cacheControl: {
                    revalidate: 0,
                    expire: undefined
                }
            });
        };
        // TODO: activeSpan code path is for when wrapped by
        // next-server can be removed when this is no longer used
        if (activeSpan) {
            await handleResponse(activeSpan);
        } else {
            return await tracer.withPropagatedContext(req.headers, ()=>tracer.trace(next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_5__.BaseServerSpan.handleRequest, {
                    spanName: `${method} ${req.url}`,
                    kind: next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_3__.SpanKind.SERVER,
                    attributes: {
                        'http.method': method,
                        'http.target': req.url
                    }
                }, handleResponse));
        }
    } catch (err) {
        if (!(err instanceof next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_25__.NoFallbackError)) {
            await routeModule.onRequestError(req, err, {
                routerKind: 'App Router',
                routePath: srcPage,
                routeType: 'render',
                revalidateReason: (0,next_dist_server_instrumentation_utils__WEBPACK_IMPORTED_MODULE_2__/* .getRevalidateReason */ .c)({
                    isRevalidate: isSSG,
                    isOnDemandRevalidate
                })
            }, routerServerContext);
        }
        // rethrow so that we can handle serving error page
        throw err;
    }
}
// TODO: omit this from production builds, only test builds should include it
/**
 * Creates a readable stream that emits a PPR boundary sentinel.
 *
 * @returns A readable stream that emits a PPR boundary sentinel.
 */ function createPPRBoundarySentinel() {
    return new ReadableStream({
        start (controller) {
            controller.enqueue(new TextEncoder().encode('<!-- PPR_BOUNDARY_SENTINEL -->'));
            controller.close();
        }
    });
}

//# sourceMappingURL=app-page.js.map


/***/ }),

/***/ 99324:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 59123));


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [331,754,837], () => (__webpack_exec__(89527)));
module.exports = __webpack_exports__;

})();
//# sourceMappingURL=page.js.map