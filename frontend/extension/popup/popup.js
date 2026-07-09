// Popup: shows the current tab's cached assessment (from the background worker).

import { getRiskLevel } from "../shared/risk.js";

const $ = (id) => document.getElementById(id);

function show(section) {
    for (const id of ["loading", "result", "offline"]) $(id).hidden = id !== section;
}

function renderEvidence(evidence) {
    const ul = $("evidence");
    ul.innerHTML = "";
    (evidence || []).slice(0, 5).forEach((e) => {
        const li = document.createElement("li");
        const sev = document.createElement("span");
        sev.className = `sev ${e.severity}`;
        sev.textContent = e.severity;
        const msg = document.createElement("span");
        msg.textContent = e.message; // textContent => safe against injected HTML
        li.append(sev, msg);
        ul.appendChild(li);
    });
}

function renderReasons(reasons) {
    const ul = $("reasons");
    ul.innerHTML = "";
    (reasons || []).forEach((r) => {
        const li = document.createElement("li");
        li.textContent = `• ${r}`;
        ul.appendChild(li);
    });
}

function render(entry, tabUrl) {
    if (!entry || entry.offline) {
        show("offline");
        return;
    }
    const level = getRiskLevel(entry.score);
    const badge = $("badge");
    badge.style.background = level.color;
    badge.textContent = `${level.icon} ${entry.score}/100 — ${level.label}`;
    $("url").textContent = tabUrl || "";
    renderReasons(entry.result?.reasons);
    renderEvidence(entry.result?.evidence);
    show("result");
}

async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return show("offline");
    chrome.runtime.sendMessage({ type: "GET_TAB_RESULT", tabId: tab.id }, (entry) => {
        if (entry) return render(entry, tab.url);
        // No cached result yet — ask the worker to assess now.
        chrome.runtime.sendMessage({ type: "ASSESS_URL", url: tab.url, tabId: tab.id }, (fresh) =>
            render(fresh, tab.url)
        );
    });
}

init();
