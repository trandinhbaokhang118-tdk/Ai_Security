import { assessUrl, assessText, assessAction } from "./shared/api.js";
import { getRiskLevel, toDisplayScore } from "./shared/risk.js";

const tabResults = new Map();
const urlCache = new Map();
const inFlight = new Map();
const CACHE_TTL = 5 * 60 * 1000;
let requestSequence = 0;
let rateLimitedUntil = 0;
let rateLimitTimer = null;

async function settings() {
  return chrome.storage.local.get({ protectionEnabled: false, linkProtection: true, gmailProtection: true });
}
function errorInfo(error) {
  return { type: error?.type || "unknown", message: error?.message || "Đã xảy ra lỗi không xác định.", status: error?.status ?? null, retryAfter: error?.retryAfter || 0 };
}
function clearBadge(tabId) {
  if (tabId == null) return;
  chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {});
  chrome.action.setTitle({ tabId, title: "AI Security Armor" }).catch(() => {});
}
function setBadge(tabId, entry) {
  if (tabId == null) return;
  if (entry?.status === "loading") {
    chrome.action.setBadgeText({ tabId, text: "…" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#2563eb" });
    chrome.action.setTitle({ tabId, title: "AI Security Armor — Đang kiểm tra" });
    return;
  }
  if (entry?.error) { clearBadge(tabId); return; }
  const level = getRiskLevel(entry?.score || 0);
  chrome.action.setBadgeText({ tabId, text: { safe: "OK", warn: "!", danger: "X" }[level.key] });
  chrome.action.setBadgeBackgroundColor({ tabId, color: level.color });
  chrome.action.setTitle({ tabId, title: `AI Security Armor — ${level.label} (${entry.score}/100)` });
}
function cached(url) {
  const hit = urlCache.get(url);
  if (hit && Date.now() - hit.completedAt < CACHE_TTL) return hit;
  if (hit) urlCache.delete(url);
  return null;
}
function beginCooldown(retryAfter) {
  rateLimitedUntil = Date.now() + Math.max(1, retryAfter || 60) * 1000;
  clearTimeout(rateLimitTimer);
  rateLimitTimer = setTimeout(async () => {
    rateLimitedUntil = 0;
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.filter((tab) => tab.id != null).map((tab) => chrome.action.setBadgeText({ tabId: tab.id, text: "" }).catch(() => {})));
  }, Math.max(1, rateLimitedUntil - Date.now()));
}
async function handleAssessUrl(url, tabId, force = false) {
  if (!(await settings()).protectionEnabled) return { disabled: true };
  if (!/^https?:\/\//i.test(url || "")) return { unsupported: true };
  if (Date.now() < rateLimitedUntil) {
    clearBadge(tabId);
    return { status: "cooldown", url, error: { type: "http", status: 429, message: "Gateway đang tạm giới hạn lượt quét.", retryAfter: Math.ceil((rateLimitedUntil - Date.now()) / 1000) } };
  }
  if (!force) {
    const hit = cached(url);
    if (hit) { if (tabId != null) { tabResults.set(tabId, hit); setBadge(tabId, hit); } return hit; }
    if (inFlight.has(url)) return inFlight.get(url);
  }
  const requestId = ++requestSequence;
  const startedAt = Date.now();
  const loading = { status: "loading", url, requestId, startedAt };
  if (tabId != null) { tabResults.set(tabId, loading); setBadge(tabId, loading); }
  const promise = (async () => {
    try {
      const result = await assessUrl(url);
      const level = getRiskLevel(toDisplayScore(result.risk_score));
      const entry = { status: "complete", url, score: toDisplayScore(result.risk_score), level: level.key, result, requestId, startedAt, completedAt: Date.now(), latencyMs: Date.now() - startedAt };
      urlCache.set(url, entry);
      if (tabId != null && tabResults.get(tabId)?.requestId === requestId) { tabResults.set(tabId, entry); setBadge(tabId, entry); }
      return entry;
    } catch (error) {
      const info = errorInfo(error);
      const entry = { status: "error", url, error: info, requestId, startedAt, completedAt: Date.now(), latencyMs: Date.now() - startedAt };
      if (info.status === 429) beginCooldown(info.retryAfter);
      if (tabId != null && tabResults.get(tabId)?.requestId === requestId) { tabResults.delete(tabId); clearBadge(tabId); }
      return entry;
    } finally { inFlight.delete(url); }
  })();
  inFlight.set(url, promise);
  return promise;
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(["protectionEnabled", "linkProtection", "gmailProtection"]);
  await chrome.storage.local.set({ protectionEnabled: typeof stored.protectionEnabled === "boolean" ? stored.protectionEnabled : false, linkProtection: typeof stored.linkProtection === "boolean" ? stored.linkProtection : true, gmailProtection: typeof stored.gmailProtection === "boolean" ? stored.gmailProtection : true });
  const tabs = await chrome.tabs.query({}); tabs.forEach((tab) => clearBadge(tab.id));
});
chrome.runtime.onStartup.addListener(async () => { const tabs = await chrome.tabs.query({}); tabs.forEach((tab) => clearBadge(tab.id)); });
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id ?? message.tabId;
  (async () => {
    try {
      switch (message.type) {
        case "ASSESS_URL": return sendResponse(await handleAssessUrl(message.url, tabId, message.force));
        case "GET_PROTECTION_STATE": { const current = await settings(); return sendResponse({ enabled: current.protectionEnabled === true, linkProtection: current.linkProtection, gmailProtection: current.gmailProtection }); }
        case "SET_PROTECTION_STATE": {
          await chrome.storage.local.set({ protectionEnabled: message.enabled === true });
          const current = await settings(); const tabs = await chrome.tabs.query({});
          await Promise.all(tabs.filter((tab) => tab.id != null).map((tab) => chrome.tabs.sendMessage(tab.id, { type: "PROTECTION_STATE_CHANGED", enabled: current.protectionEnabled, linkProtection: current.linkProtection }).catch(() => null)));
          if (!message.enabled) { tabResults.clear(); urlCache.clear(); rateLimitedUntil = 0; clearTimeout(rateLimitTimer); tabs.forEach((tab) => clearBadge(tab.id)); }
          else {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab?.id != null && /^https?:/.test(activeTab.url || "")) void handleAssessUrl(activeTab.url, activeTab.id, true);
          }
          return sendResponse({ enabled: message.enabled === true });
        }
        case "ASSESS_TEXT": {
          const current = await settings(); if (!current.protectionEnabled || !current.gmailProtection) return sendResponse({ disabled: true });
          try { return sendResponse({ result: await assessText(message.text, message.modality || "email", message.metadata), offline: false }); } catch (error) { return sendResponse({ error: errorInfo(error) }); }
        }
        case "ASSESS_ACTION": try { return sendResponse({ result: await assessAction(message.actionType, message.targetUrl, message.dataTypes) }); } catch (error) { return sendResponse({ error: errorInfo(error) }); }
        case "GET_TAB_RESULT": { const entry = tabResults.get(message.tabId); return sendResponse(entry?.url === message.url ? entry : null); }
        case "GET_SETTINGS": { const current = await settings(); return sendResponse({ ...current, rateLimited: Date.now() < rateLimitedUntil, retryAfter: Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000)) }); }
        default: return sendResponse({ error: { type: "unknown_message", message: "Thông điệp không được hỗ trợ." } });
      }
    } catch (error) { sendResponse({ error: errorInfo(error) }); }
  })();
  return true;
});
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === "loading") { tabResults.delete(tabId); clearBadge(tabId); }
  if (info.status === "complete" && /^https?:/.test(tab.url || "") && Date.now() >= rateLimitedUntil) settings().then((current) => current.protectionEnabled && handleAssessUrl(tab.url, tabId));
});
chrome.tabs.onRemoved.addListener((tabId) => tabResults.delete(tabId));
