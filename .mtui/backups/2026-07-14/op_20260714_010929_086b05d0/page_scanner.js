(() => {
  "use strict";
  const cache = new Map();
  const TTL = 5 * 60e3;
  let active = null;
  let lastFocus = null;
  let contextAlive = true;

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  const root = host.attachShadow({ mode: "closed" });
  document.documentElement.appendChild(host);
  const css = document.createElement("style");
  css.textContent = `.backdrop{position:fixed;inset:0;background:#020617aa;display:grid;place-items:center;pointer-events:auto;font-family:system-ui;color:#e5e7eb}.dialog{width:min(430px,calc(100vw - 28px));padding:22px;border:1px solid #475569;border-radius:18px;background:#0f172a;box-shadow:0 24px 70px #0009}.head{display:flex;gap:12px}.icon{font-size:30px}h2{margin:0 0 5px;font-size:19px}p{margin:0;color:#cbd5e1;font-size:13px;line-height:1.5}.url{margin:14px 0;padding:10px;background:#020617;border-radius:9px;color:#93c5fd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.reason{padding:10px;border-left:3px solid #f59e0b;background:#1e293b;border-radius:5px}.actions{display:flex;justify-content:flex-end;gap:9px;margin-top:17px}button{padding:10px 14px;border:0;border-radius:9px;font-weight:700;cursor:pointer}.back{background:#334155;color:white}.continue{background:#dc2626;color:white}`;
  root.append(css);

  function close() { active?.remove(); active = null; lastFocus?.focus?.(); }
  function disableStaleContext() {
    contextAlive = false;
    close();
    document.removeEventListener("click", handleClick, true);
    host.remove();
  }
  function hasRuntime() {
    try { return contextAlive && typeof chrome !== "undefined" && Boolean(chrome.runtime?.id) && typeof chrome.runtime.sendMessage === "function"; }
    catch { return false; }
  }
  function send(message, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      if (!hasRuntime()) { disableStaleContext(); reject(new Error("extension_context_invalidated")); return; }
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; reject(new Error("background_timeout")); } }, timeoutMs);
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (settled) return;
          settled = true; clearTimeout(timer);
          const error = chrome.runtime?.lastError;
          if (error) {
            if (/context invalidated|receiving end does not exist/i.test(error.message || "")) disableStaleContext();
            reject(new Error(error.message));
          } else resolve(response);
        });
      } catch (error) {
        clearTimeout(timer); settled = true; disableStaleContext(); reject(error);
      }
    });
  }
  function dialog(level, url, reason, onContinue) {
    close(); lastFocus = document.activeElement;
    const wrap = document.createElement("div"); wrap.className = "backdrop";
    wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-labelledby", "armor-title");
    const danger = level === "danger";
    wrap.innerHTML = `<div class="dialog"><div class="head"><div class="icon">${danger ? "⛔" : "⚠️"}</div><div><h2 id="armor-title">${danger ? "Đã chặn liên kết nguy hiểm" : "Liên kết cần thận trọng"}</h2><p>AI Security Armor đã tạm dừng điều hướng để bạn xác nhận.</p></div></div><div class="url"></div><p class="reason"></p><div class="actions"><button class="back">Quay lại</button><button class="continue">Vẫn tiếp tục</button></div></div>`;
    wrap.querySelector(".url").textContent = new URL(url).hostname;
    wrap.querySelector(".reason").textContent = reason || "Liên kết có dấu hiệu đáng ngờ.";
    wrap.querySelector(".back").onclick = close; wrap.querySelector(".continue").onclick = () => { close(); onContinue(); };
    wrap.onclick = (event) => { if (event.target === wrap) close(); }; wrap.onkeydown = (event) => { if (event.key === "Escape") close(); };
    root.append(wrap); active = wrap; wrap.querySelector(".back").focus();
  }
  function navigate(anchor, event) {
    if (event.ctrlKey || event.metaKey || anchor.target === "_blank") window.open(anchor.href, "_blank", "noopener");
    else window.location.assign(anchor.href);
  }
  async function handleClick(event) {
    if (!hasRuntime()) { disableStaleContext(); return; }
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.shiftKey) return;
    const anchor = event.target.closest?.("a[href]");
    if (!anchor || !/^https?:/.test(anchor.href) || anchor.hasAttribute("download")) return;
    let settings;
    try { settings = await send({ type: "GET_SETTINGS" }, 2000); }
    catch { return; }
    if (!settings?.protectionEnabled || !settings?.linkProtection) return;
    const hit = cache.get(anchor.href);
    if (hit && Date.now() - hit.time < TTL && hit.level === "safe") return;
    event.preventDefault(); event.stopImmediatePropagation();
    let response;
    try { response = await send({ type: "ASSESS_URL", url: anchor.href }, 6500); }
    catch (error) {
      if (error.message === "extension_context_invalidated") return navigate(anchor, event);
      dialog("warn", anchor.href, "Không thể liên lạc với tiến trình bảo vệ; liên kết chưa được xác minh.", () => navigate(anchor, event)); return;
    }
    if (response?.disabled) return navigate(anchor, event);
    if (response?.error) {
      const message = response.error.status === 429 ? "Gateway đang giới hạn lượt quét. Liên kết chưa được xác minh." : response.error.type === "timeout" ? "Gateway phản hồi quá chậm; liên kết chưa được xác minh." : "Không thể kết nối Gateway; liên kết chưa được xác minh.";
      dialog("warn", anchor.href, message, () => navigate(anchor, event)); return;
    }
    cache.set(anchor.href, { level: response.level, time: Date.now() });
    if (response.level === "safe") navigate(anchor, event);
    else dialog(response.level, anchor.href, response.result?.reasons?.[0], () => navigate(anchor, event));
  }
  document.addEventListener("click", handleClick, true);
})();
