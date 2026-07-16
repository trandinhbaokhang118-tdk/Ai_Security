import { getRiskLevel } from "../shared/risk.js";
const $ = (id) => document.getElementById(id);
const sections = ["disabled", "loading", "unsupported", "result", "offline"];
const stepIds = ["step-page", "step-gateway", "step-analysis", "step-result"];
let currentTab = null;
let loadingTimer = null;
let loadingStartedAt = 0;
let loadingToken = 0;

function withTimeout(promise, timeoutMs, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); }),
  ]).finally(() => clearTimeout(timer));
}
function send(message, timeoutMs = 6000) {
  const request = new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) reject(new Error(runtimeError.message));
        else resolve(response);
      });
    } catch (error) { reject(error); }
  });
  return withTimeout(request, timeoutMs, "Tiến trình nền không phản hồi.");
}
function queryActiveTab() {
  const request = new Promise((resolve, reject) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) reject(new Error(runtimeError.message));
        else resolve(tabs);
      });
    } catch (error) { reject(error); }
  });
  return withTimeout(request, 2000, "Không đọc được tab hiện tại.");
}

function show(id) {
  sections.forEach((name) => { $(name).hidden = name !== id; });
  if (id !== "loading") stopLoading();
}
function validPage(url) { return /^https?:\/\//i.test(url || ""); }
function setConnection(ok, text) {
  const el = $("gateway-status");
  el.textContent = text;
  el.className = `connection ${ok === true ? "online" : ok === false ? "offline" : ""}`;
}
function stopLoading() {
  clearInterval(loadingTimer);
  loadingTimer = null;
}
function updateLoading() {
  const elapsed = Math.max(0, performance.now() - loadingStartedAt);
  const seconds = elapsed / 1000;
  let active = 0;
  if (elapsed >= 350) active = 1;
  if (elapsed >= 1000) active = 2;
  if (elapsed >= 3200) active = 3;
  const titles = ["Đang đọc trang hiện tại", "Đang kết nối Gateway", "Đang phân tích rủi ro", "Đang hoàn thiện kết quả"];
  const details = ["Xác định URL và trạng thái tab…", "Gateway đã nhận yêu cầu, đang chờ phản hồi…", "Mô hình đang đánh giá các tín hiệu của URL…", "Đang chuẩn hóa điểm, lý do và bằng chứng…"];
  $("loading-title").textContent = titles[active];
  $("loading-detail").textContent = details[active];
  $("loading-elapsed").textContent = `${seconds.toFixed(1)}s`;
  $("loading-progress").style.width = `${Math.min(92, [12, 32, 62, 84][active] + seconds * 1.5)}%`;
  stepIds.forEach((id, index) => { $(id).className = index < active ? "done" : index === active ? "active" : ""; });
  $("loading-warning").hidden = elapsed < 3500;
  if (elapsed >= 3500) $("loading-warning").textContent = elapsed < 6000
    ? "Gateway đang phản hồi chậm hơn bình thường. Yêu cầu vẫn đang được theo dõi."
    : "Đã chờ khá lâu. Tiện ích sẽ báo lỗi thay vì giữ màn hình này vô thời hạn.";
}
function startLoading(reuseStart = null) {
  stopLoading();
  loadingStartedAt = reuseStart ? performance.now() - Math.max(0, Date.now() - reuseStart) : performance.now();
  show("loading");
  updateLoading();
  loadingTimer = setInterval(updateLoading, 100);
}
function list(id, items, renderer) {
  const ul = $(id); ul.replaceChildren();
  (items || []).slice(0, 5).forEach((item) => ul.appendChild(renderer(item)));
  $(id + "-section")?.toggleAttribute("hidden", !ul.children.length);
}
function showError(error) {
  setConnection(false, error?.type === "timeout" ? "Gateway phản hồi quá chậm" : "Gateway không khả dụng");
  $("error-title").textContent = error?.type === "timeout" ? "Gateway phản hồi quá chậm" : "Không thể kiểm tra trang";
  $("error-message").textContent = error?.message || "Kiểm tra cấu hình Gateway và thử lại.";
  show("offline");
}
function render(entry, tab) {
  if (!entry) return false;
  if (entry.status === "loading") { startLoading(entry.startedAt); return false; }
  if (entry.error) { showError(entry.error); return true; }
  if (entry.url !== tab.url) { scan(true); return true; }
  setConnection(true, `Gateway hoạt động · ${entry.latencyMs || 0} ms`);
  const level = getRiskLevel(entry.score);
  $("risk-card").style.setProperty("--risk", level.color);
  $("score").textContent = entry.score;
  $("risk-label").textContent = level.label;
  $("risk-summary").textContent = { safe: "Trang này có vẻ an toàn", warn: "Hãy thận trọng với trang này", danger: "Trang này có rủi ro cao" }[level.key];
  $("scan-time").textContent = `Hoàn tất trong ${((entry.latencyMs || 0) / 1000).toFixed(1)}s · ${new Date(entry.completedAt).toLocaleTimeString("vi-VN")}`;
  let parsed; try { parsed = new URL(tab.url); } catch { parsed = { hostname: "" }; }
  $("hostname").textContent = parsed.hostname; $("url").textContent = tab.url;
  $("recommendation").textContent = { safe: "Bạn có thể tiếp tục, nhưng vẫn không nên chia sẻ thông tin nhạy cảm khi chưa xác minh.", warn: "Không nhập mật khẩu hoặc thông tin thanh toán trước khi xác minh website.", danger: "Nên rời khỏi trang và không cung cấp thông tin cá nhân hay đăng nhập." }[level.key];
  list("reasons", entry.result?.reasons, (r) => { const li = document.createElement("li"); li.textContent = `• ${r}`; return li; });
  list("evidence", entry.result?.evidence, (e) => { const li = document.createElement("li"); li.className = "evidence-row"; const sev = document.createElement("span"); sev.className = `sev ${e.severity || "info"}`; sev.textContent = e.severity || "info"; const msg = document.createElement("span"); msg.textContent = e.message || ""; li.append(sev, msg); return li; });
  $("leave-page").hidden = level.key !== "danger"; show("result"); return true;
}
async function waitForTabResult(token) {
  try {
    for (let count = 0; count < 30 && token === loadingToken; count += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const entry = await send({ type: "GET_TAB_RESULT", tabId: currentTab.id, url: currentTab.url }, 1500);
      if (entry && entry.status !== "loading") { render(entry, currentTab); return; }
    }
    if (token === loadingToken) showError({ type: "timeout", message: "Không nhận được trạng thái hoàn tất từ tiến trình nền. Hãy thử quét lại." });
  } catch {
    if (token === loadingToken) showError({ type: "runtime", message: "Tiến trình nền không phản hồi. Hãy tải lại extension rồi thử lại." });
  }
}
async function scan(force = false) {
  if (!currentTab || !validPage(currentTab.url)) return show("unsupported");
  const token = ++loadingToken; startLoading();
  try {
    const entry = await send({ type: "ASSESS_URL", url: currentTab.url, tabId: currentTab.id, force }, 6500);
    if (token === loadingToken) render(entry, currentTab);
  } catch { if (token === loadingToken) showError({ type: "runtime", message: "Mất kết nối với tiến trình nền của extension. Hãy tải lại extension." }); }
}
async function init() {
  try {
    const state = await send({ type: "GET_PROTECTION_STATE" }, 2000);
    $("protection-enabled").checked = state?.enabled === true;
    if (!state?.enabled) return show("disabled");
    [currentTab] = await queryActiveTab();
    if (!currentTab || !validPage(currentTab.url)) return show("unsupported");
    const entry = await send({ type: "GET_TAB_RESULT", tabId: currentTab.id, url: currentTab.url }, 1500);
    if (!entry) return scan();
    if (entry.status === "loading") { const token = ++loadingToken; startLoading(entry.startedAt); return waitForTabResult(token); }
    render(entry, currentTab);
  } catch { showError({ type: "runtime", message: "Tiện ích gặp lỗi khi đọc trạng thái. Hãy tải lại extension." }); }
}
$("protection-enabled").addEventListener("change", async (e) => { try { await send({ type: "SET_PROTECTION_STATE", enabled: e.target.checked }, 3000); if (e.target.checked) init(); else { loadingToken += 1; show("disabled"); } } catch { showError({ type: "runtime", message: "Không thể liên lạc với tiến trình nền. Hãy tải lại extension." }); } });
$("rescan").addEventListener("click", () => scan(true));
$("retry-error").addEventListener("click", () => scan(true));
$("copy-url").addEventListener("click", async () => { try { if (currentTab?.url) { await navigator.clipboard.writeText(currentTab.url); $("copy-url").textContent = "✓"; setTimeout(() => $("copy-url").textContent = "⧉", 1200); } } catch { showError({ type: "clipboard", message: "Không thể sao chép URL vào clipboard." }); } });
$("leave-page").addEventListener("click", () => { if (currentTab?.id) chrome.tabs.update(currentTab.id, { url: "chrome://newtab" }, () => void chrome.runtime.lastError); });
$("open-settings").addEventListener("click", () => chrome.runtime.openOptionsPage(() => void chrome.runtime.lastError));
window.addEventListener("error", (event) => {
  showError({ type: "runtime", message: `Lỗi giao diện: ${event.message || "không xác định"}. Hãy tải lại extension.` });
});
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  const message = event.reason?.message || String(event.reason || "Promise bị từ chối");
  showError({ type: "runtime", message: `Lỗi tiến trình: ${message}` });
});
startLoading();
init().catch((error) => showError({ type: "runtime", message: error?.message || "Không thể khởi tạo popup." }));
