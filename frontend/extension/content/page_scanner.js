(() => {
  "use strict";
  const cache = new Map();
  const TTL = 5 * 60e3;
  // Temporarily disabled while the interaction policy is being redesigned.
  const LINK_PROTECTION_TEMPORARILY_DISABLED = true;
  let active = null, lastFocus = null, contextAlive = true;
  let protectionEnabled = false, linkProtection = false;

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  const root = host.attachShadow({ mode: "closed" });
  document.documentElement.appendChild(host);
  const css = document.createElement("style");
  css.textContent = `.overlay{position:fixed;inset:0;display:grid;place-items:center;padding:20px;background:rgba(2,6,23,.62);backdrop-filter:blur(3px);pointer-events:auto;font:13px Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#dbe4f0}.panel{width:min(440px,100%);overflow:hidden;border:1px solid #344157;border-radius:12px;background:#111827;box-shadow:0 24px 60px rgba(0,0,0,.48)}.bar{height:3px;background:#d69e2e}.bar.danger{background:#dc5a5a}.content{padding:22px}.eyebrow{margin-bottom:8px;color:#93a4ba;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}h2{margin:0;color:#f8fafc;font-size:18px;font-weight:650;letter-spacing:-.01em}p{margin:7px 0 0;color:#aebdce;line-height:1.55}.target{margin:18px 0 12px;padding:11px 12px;border:1px solid #2b374b;border-radius:7px;background:#0b1220}.target span{display:block;color:#718198;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.target strong{display:block;margin-top:4px;color:#e5edf7;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.finding{padding:12px;border-left:2px solid #d69e2e;background:#182131;color:#cbd5e1;line-height:1.5}.finding.danger{border-color:#dc5a5a}.actions{display:flex;justify-content:flex-end;gap:8px;padding:14px 22px;border-top:1px solid #263247;background:#0d1422}button{min-width:108px;padding:9px 13px;border:1px solid #3b485c;border-radius:7px;background:#1d293b;color:#e7edf5;font:600 12px inherit;cursor:pointer}button:hover{background:#263449}button:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}.primary{border-color:#c24141;background:#b93c3c;color:#fff}.primary:hover{background:#ca4747}`;
  root.append(css);

  function close() { active?.remove(); active = null; lastFocus?.focus?.(); }
  function disableStaleContext() { contextAlive = false; close(); document.removeEventListener("click", handleClick, true); host.remove(); }
  function hasRuntime() { try { return contextAlive && typeof chrome !== "undefined" && Boolean(chrome.runtime?.id) && typeof chrome.runtime.sendMessage === "function"; } catch { return false; } }
  function send(message, timeoutMs = 5000) { return new Promise((resolve, reject) => { if (!hasRuntime()) { disableStaleContext(); return reject(new Error("context_invalid")); } let done = false; const timer = setTimeout(() => { if (!done) { done = true; reject(new Error("timeout")); } }, timeoutMs); try { chrome.runtime.sendMessage(message, (response) => { if (done) return; done = true; clearTimeout(timer); const error = chrome.runtime?.lastError; if (error) { if (/context invalidated|receiving end/i.test(error.message || "")) disableStaleContext(); reject(new Error(error.message)); } else resolve(response); }); } catch (error) { clearTimeout(timer); disableStaleContext(); reject(error); } }); }
  function syncSettings() { send({ type: "GET_SETTINGS" }, 2000).then((settings) => { protectionEnabled = settings?.protectionEnabled === true; linkProtection = !LINK_PROTECTION_TEMPORARILY_DISABLED && settings?.linkProtection === true; if (!protectionEnabled || !linkProtection) close(); }).catch(() => {}); }

  function dialog(level, url, reason, onContinue) {
    if (!protectionEnabled || !linkProtection || document.visibilityState !== "visible") return;
    close(); lastFocus = document.activeElement; const danger = level === "danger";
    const wrap = document.createElement("div"); wrap.className = "overlay"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-labelledby", "armor-title");
    wrap.innerHTML = `<div class="panel"><div class="bar ${danger ? "danger" : ""}"></div><div class="content"><div class="eyebrow">AI Security Armor · Link Protection</div><h2 id="armor-title">${danger ? "Điều hướng đã được chặn" : "Xác nhận trước khi tiếp tục"}</h2><p>${danger ? "Liên kết này có tín hiệu rủi ro cao." : "Liên kết này cần được xác minh trước khi mở."}</p><div class="target"><span>Đích đến</span><strong></strong></div><div class="finding ${danger ? "danger" : ""}"></div></div><div class="actions"><button class="back">Hủy điều hướng</button><button class="primary">Mở liên kết</button></div></div>`;
    wrap.querySelector(".target strong").textContent = new URL(url).hostname; wrap.querySelector(".finding").textContent = reason || "Phát hiện tín hiệu bất thường trong địa chỉ đích.";
    wrap.querySelector(".back").onclick = close; wrap.querySelector(".primary").onclick = () => { close(); onContinue(); }; wrap.onclick = (event) => { if (event.target === wrap) close(); }; wrap.onkeydown = (event) => { if (event.key === "Escape") close(); };
    root.append(wrap); active = wrap; wrap.querySelector(".back").focus();
  }
  function navigate(anchor, event) { if (event.ctrlKey || event.metaKey || anchor.target === "_blank") window.open(anchor.href, "_blank", "noopener"); else window.location.assign(anchor.href); }
  async function handleClick(event) {
    if (!hasRuntime()) return disableStaleContext();
    if (!protectionEnabled || !linkProtection || event.defaultPrevented || event.button !== 0 || event.altKey || event.shiftKey) return;
    const anchor = event.target.closest?.("a[href]"); if (!anchor || !/^https?:/.test(anchor.href) || anchor.hasAttribute("download")) return;
    const hit = cache.get(anchor.href); if (hit && Date.now() - hit.time < TTL && hit.level === "safe") return;
    event.preventDefault(); event.stopImmediatePropagation();
    let response; try { response = await send({ type: "ASSESS_URL", url: anchor.href }, 17000); } catch { return navigate(anchor, event); }
    if (!protectionEnabled || !linkProtection) return navigate(anchor, event);
    if (response?.disabled || response?.error) return navigate(anchor, event);
    cache.set(anchor.href, { level: response.level, time: Date.now() });
    if (response.level === "safe") navigate(anchor, event); else dialog(response.level, anchor.href, response.result?.reasons?.[0], () => navigate(anchor, event));
  }
  if (hasRuntime() && chrome.storage?.onChanged) chrome.storage.onChanged.addListener((changes) => { if (changes.protectionEnabled) protectionEnabled = changes.protectionEnabled.newValue === true; if (changes.linkProtection) linkProtection = !LINK_PROTECTION_TEMPORARILY_DISABLED && changes.linkProtection.newValue === true; if (!protectionEnabled || !linkProtection) close(); });
  if (hasRuntime()) chrome.runtime.onMessage.addListener((message) => { if (message?.type === "PROTECTION_STATE_CHANGED") { protectionEnabled = message.enabled === true; linkProtection = !LINK_PROTECTION_TEMPORARILY_DISABLED && message.linkProtection === true; if (!protectionEnabled || !linkProtection) close(); } });
  syncSettings(); document.addEventListener("click", handleClick, true);
})();
