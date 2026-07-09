// Gmail content script: extracts the currently open email body + sender and
// assesses it for phishing. Injects an inline risk banner above the message.

(function () {
    "use strict";

    let lastScanned = "";

    function findOpenEmail() {
        // Gmail renders the open message body in an element with role="listitem"
        // containing a div.a3s (message body). Best-effort, resilient to failure.
        const body = document.querySelector("div.a3s");
        if (!body) return null;
        const senderEl = document.querySelector("span.gD");
        return {
            text: body.innerText.slice(0, 20000),
            sender: senderEl?.getAttribute("email") || senderEl?.textContent || "",
            anchor: body,
        };
    }

    function banner(level, reasons) {
        const colors = { safe: "#dcfce7", warn: "#fef3c7", danger: "#fee2e2" };
        const fg = { safe: "#166534", warn: "#92400e", danger: "#991b1b" };
        const icons = { safe: "✅", warn: "⚠", danger: "⛔" };
        const el = document.createElement("div");
        el.setAttribute("data-ai-armor", "1");
        el.style.cssText = `font-family:Roboto,system-ui,sans-serif;margin:8px 0;padding:10px 14px;
      border-radius:8px;font-size:13px;background:${colors[level]};color:${fg[level]};`;
        const list = (reasons || []).slice(0, 3).map((r) => `• ${r}`).join(" ");
        el.textContent = `${icons[level]} AI Security Armor: ${{ safe: "Email an toàn", warn: "Email đáng ngờ", danger: "Cảnh báo lừa đảo" }[level]
            }. ${list}`;
        return el;
    }

    function scan() {
        const email = findOpenEmail();
        if (!email || !email.text || email.text === lastScanned) return;
        lastScanned = email.text;

        chrome.runtime.sendMessage(
            {
                type: "ASSESS_TEXT", text: email.text, modality: "email",
                metadata: { sender: email.sender }
            },
            (res) => {
                if (!res || res.offline || !res.result) return;
                const score = Math.round((res.result.risk_score || 0) * 100);
                const level = score <= 39 ? "safe" : score <= 69 ? "warn" : "danger";
                if (level === "safe") return; // don't clutter safe emails
                email.anchor.parentElement?.insertBefore(
                    banner(level, res.result.reasons),
                    email.anchor
                );
            }
        );
    }

    // Gmail is a SPA; poll for the open message changing.
    setInterval(scan, 2000);
})();
