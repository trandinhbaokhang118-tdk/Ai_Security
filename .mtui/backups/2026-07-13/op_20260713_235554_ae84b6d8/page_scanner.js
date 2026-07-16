// Content script: scans links on the page and warns before risky clicks.
// Uses a Shadow DOM host so page CSS cannot break our warning UI.

(function () {
    "use strict";

    const warned = new WeakSet();

    // Shadow-DOM toast host (isolated styling).
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483647;";
    const shadow = host.attachShadow({ mode: "closed" });
    document.documentElement.appendChild(host);

    function showToast(level, message) {
        const colors = { safe: "#16a34a", warn: "#d97706", danger: "#dc2626" };
        const icons = { safe: "✅", warn: "⚠", danger: "⛔" };
        const el = document.createElement("div");
        el.style.cssText = `font-family:system-ui,sans-serif;max-width:320px;margin-bottom:8px;
      padding:12px 14px;border-radius:10px;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.25);
      background:${colors[level] || "#374151"};font-size:14px;line-height:1.4;`;
        el.textContent = `${icons[level] || ""} ${message}`;
        shadow.appendChild(el);
        setTimeout(() => el.remove(), 6000);
    }

    // Intercept clicks on links; assess before navigating for risky-looking hrefs.
    document.addEventListener(
        "click",
        (e) => {
            const a = e.target.closest && e.target.closest("a[href]");
            if (!a) return;
            const url = a.href;
            if (!/^https?:/.test(url) || warned.has(a)) return;

            // Navigation must be paused synchronously. Calling preventDefault in
            // the asynchronous response callback is too late in most browsers.
            e.preventDefault();
            e.stopImmediatePropagation();

            chrome.runtime.sendMessage({ type: "ASSESS_URL", url }, (res) => {
                if (res?.disabled) {
                    window.location.assign(url);
                    return;
                }
                if (!res || res.offline) {
                    showToast("warn", "Không thể kiểm tra đường dẫn. Nhấp lại để tiếp tục.");
                    warned.add(a);
                    return;
                }
                const level = res.level;
                if (level === "danger") {
                    warned.add(a);
                    const reason = res.result?.reasons?.[0] || "Đường dẫn rủi ro cao";
                    showToast("danger", `Đã chặn: ${reason}. Nhấp lại để bỏ qua.`);
                } else if (level === "warn") {
                    warned.add(a);
                    showToast("warn", res.result?.reasons?.[0] || "Đường dẫn đáng ngờ");
                } else {
                    window.location.assign(url);
                }
            });
        },
        true
    );
})();
