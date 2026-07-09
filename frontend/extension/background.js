// Background service worker: central assessment broker + badge updater.
// Content scripts and the popup message this worker; it calls the gateway and
// caches per-tab results. Offline gateway => graceful "offline" state (no crash).

import { assessUrl, assessText, assessAction } from "./shared/api.js";
import { getRiskLevel, toDisplayScore } from "./shared/risk.js";

const tabResults = new Map(); // tabId -> { score, level, result, offline }

function setBadge(tabId, level, offline) {
    if (offline) {
        chrome.action.setBadgeText({ tabId, text: "…" });
        chrome.action.setBadgeBackgroundColor({ tabId, color: "#9ca3af" });
        return;
    }
    const text = { safe: "OK", warn: "!", danger: "✕" }[level.key] || "";
    chrome.action.setBadgeText({ tabId, text });
    chrome.action.setBadgeBackgroundColor({ tabId, color: level.color });
}

async function handleAssessUrl(url, tabId) {
    try {
        const result = await assessUrl(url);
        const score = toDisplayScore(result.risk_score);
        const level = getRiskLevel(score);
        const entry = { score, level: level.key, result, offline: false };
        if (tabId != null) {
            tabResults.set(tabId, entry);
            setBadge(tabId, level, false);
        }
        return entry;
    } catch {
        const entry = { offline: true };
        if (tabId != null) {
            tabResults.set(tabId, entry);
            setBadge(tabId, getRiskLevel(0), true);
        }
        return entry;
    }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const tabId = sender.tab?.id ?? msg.tabId;
    (async () => {
        switch (msg.type) {
            case "ASSESS_URL":
                sendResponse(await handleAssessUrl(msg.url, tabId));
                break;
            case "ASSESS_TEXT":
                try {
                    const result = await assessText(msg.text, msg.modality || "email", msg.metadata);
                    sendResponse({ result, offline: false });
                } catch {
                    sendResponse({ offline: true });
                }
                break;
            case "ASSESS_ACTION":
                try {
                    const result = await assessAction(msg.actionType, msg.targetUrl, msg.dataTypes);
                    sendResponse({ result, offline: false });
                } catch {
                    sendResponse({ offline: true });
                }
                break;
            case "GET_TAB_RESULT":
                sendResponse(tabResults.get(msg.tabId) || null);
                break;
            default:
                sendResponse({ error: "unknown_message" });
        }
    })();
    return true; // keep the message channel open for async response
});

// Assess the top-level URL whenever a tab finishes loading.
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (info.status === "complete" && tab.url && /^https?:/.test(tab.url)) {
        handleAssessUrl(tab.url, tabId);
    }
});

chrome.tabs.onRemoved.addListener((tabId) => tabResults.delete(tabId));
