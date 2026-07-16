// API client for the Security Gateway. Used by the background service worker.

const DEFAULT_BASE = "http://localhost:8000";

export async function getBaseUrl() {
    try {
        const { apiBaseUrl } = await chrome.storage.local.get("apiBaseUrl");
        return apiBaseUrl || DEFAULT_BASE;
    } catch {
        return DEFAULT_BASE;
    }
}

async function post(path, body) {
    const base = await getBaseUrl();
    const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Client-Id": "extension" },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Gateway ${res.status}`);
    return res.json();
}

export function assessUrl(url, context = "") {
    return post("/v1/assess/url", { url, context });
}

export function assessText(text, modality = "email", metadata = null) {
    return post("/v1/assess/text", { text, modality, metadata });
}

export function assessAction(actionType, targetUrl, dataTypes = []) {
    return post("/v1/assess/action", {
        action_type: actionType,
        target_url: targetUrl,
        data_types: dataTypes,
        agent_context: { agent_type: "browser_agent" },
    });
}
