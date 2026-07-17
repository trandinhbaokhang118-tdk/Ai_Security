import { describe, expect, it } from "vitest";
import { extractScanChecks, mapRiskResult } from "./risk-core";

describe("mapRiskResult", () => {
  it("ưu tiên payload risk_core và không tự suy policy", () => {
    const result = mapRiskResult({ risk_score: .1, risk_core: { schema_version: "2", scoring_version: "core-2", final_score: 83, raw_score: 91, confidence: 72, verdict: "HIGH", decision: "BLOCK", next_action: "Do not open", criteria: [{ id: "c1", points: 10 }], unavailable_checks: ["sandbox"], reasoning: ["Correlated evidence"] } });
    expect(result.source).toBe("risk_core_v2");
    expect(result.score).toBe(83);
    expect(result.level).toBe("HIGH");
    expect(result.decision).toBe("BLOCK");
    expect(result.unavailableChecks).toEqual(["sandbox"]);
  });

  it("giữ tương thích legacy 0..1 và không tạo confidence giả", () => {
    const result = mapRiskResult({ risk_score: .42, threat_level: "medium" });
    expect(result).toMatchObject({ source: "legacy", score: 42, level: "medium", confidence: undefined });
  });

  it("shows criterion weight contribution and numeric coverage IDs", () => {
    const result = mapRiskResult({
      risk_core: {
        scoring_version: "risk-core-url-v2.1.0",
        final_score: 2.4,
        raw_score: 2.4,
        confidence: 60,
        criteria: [{ criterion_id: 5, name: "Domain impersonation", adjusted_score: 2.4, max_weight: 3 }],
        unavailable_checks: [44],
        not_checked_checks: [35],
      },
    });

    expect(result.criteria[0].contribution).toBe("2.40 / 3.00");
    expect(result.unavailableChecks).toEqual(["44"]);
    expect(result.notCheckedChecks).toEqual(["35"]);
  });

  it("hiển thị dấu xanh khi nguồn quét hoàn tất và dấu đỏ khi có nguy hiểm", () => {
    const checks = extractScanChecks([
      { source_id: 55, metadata: { adapter_status: "completed", summary: "Không có kết quả trùng khớp." } },
      { source_id: 61, status: "malicious", provider_verdict: "malicious", metadata: { adapter_status: "completed" } },
      { source_id: "urlvet", metadata: { checks: [{ id: "tls", label: "TLS hợp lệ", status: "safe", detail: "Chứng thư hợp lệ." }] } },
    ]);
    expect(checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "PhishTank", status: "safe" }),
      expect.objectContaining({ label: "Google Safe Browsing", status: "danger" }),
      expect.objectContaining({ label: "TLS hợp lệ", status: "safe" }),
    ]));
  });
});
