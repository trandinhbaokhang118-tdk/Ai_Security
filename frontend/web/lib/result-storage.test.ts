import { beforeEach, describe, expect, it } from "vitest";

import {
  clearResultHistory,
  loadResultRecord,
  persistResultRecord,
  stripResultScreenshot,
} from "./result-storage";

const record = {
  id: "scan-1",
  content: "https://example.com",
  result: {
    risk_score: 42,
    risk_core: { criteria: Array.from({ length: 50 }, (_, index) => ({ id: index + 1 })) },
    sandbox_report: { analysis_mode: "browser_http", screenshot_data_url: "data:image/png;base64,large" },
  },
};

describe("result storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("keeps the full current-session result and persists compact history", () => {
    persistResultRecord(record.id, record);

    expect(loadResultRecord<typeof record>(record.id)?.result.sandbox_report.screenshot_data_url).toContain("data:image/png");
    const persisted = JSON.parse(localStorage.getItem(`prewise-result:${record.id}`) || "null");
    const history = JSON.parse(localStorage.getItem("prewise-history") || "[]");
    expect(persisted.result.sandbox_report.screenshot_data_url).toBeUndefined();
    expect(history[0].result.risk_core.criteria).toHaveLength(50);
    expect(history[0].result.sandbox_report.screenshot_data_url).toBeUndefined();
  });

  it("loads the compact local fallback after the session ends", () => {
    persistResultRecord(record.id, record);
    sessionStorage.clear();

    const restored = loadResultRecord<typeof record>(record.id);
    expect(restored?.result.risk_score).toBe(42);
    expect(restored?.result.risk_core.criteria).toHaveLength(50);
  });

  it("removes only the large screenshot field", () => {
    const compact = stripResultScreenshot(record);
    expect(compact.result.sandbox_report.screenshot_data_url).toBeUndefined();
    expect(compact.result.sandbox_report.analysis_mode).toBe("browser_http");
    expect(compact.result.risk_core.criteria).toHaveLength(50);
  });

  it("clears history and per-result records from both storage scopes", () => {
    persistResultRecord(record.id, record);
    clearResultHistory();

    expect(localStorage.getItem("prewise-history")).toBeNull();
    expect(localStorage.getItem(`prewise-result:${record.id}`)).toBeNull();
    expect(sessionStorage.getItem(`prewise-result:${record.id}`)).toBeNull();
  });
});
