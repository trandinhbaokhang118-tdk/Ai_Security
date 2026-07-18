import {
  clearResultHistory,
  loadLocalHistory,
  loadResultRecord,
  maskSensitiveData,
  maskSensitiveText,
  persistResultRecord,
} from "./result-storage";

const SETTINGS_KEY = "prewise-settings";

function setPrivacy(saveHistory: boolean, maskSensitive: boolean): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ saveHistory, maskSensitive }));
}

describe("result storage privacy", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("masks passwords, OTP codes and valid payment-card numbers", () => {
    const source = "password=hunter2; OTP: 123456; thẻ 4111 1111 1111 1111";
    const masked = maskSensitiveText(source);

    expect(masked).not.toContain("hunter2");
    expect(masked).not.toContain("123456");
    expect(masked).not.toContain("4111 1111 1111 1111");
    expect(masked).toContain("1111");
  });

  it("masks nested preview and result strings without mutating the source payload", () => {
    const source = {
      content: "Mã OTP là 654321",
      result: { evidence: [{ message: "password: supersecret" }] },
    };

    const masked = maskSensitiveData(source);

    expect(source.content).toContain("654321");
    expect(source.result.evidence[0].message).toContain("supersecret");
    expect(masked.content).not.toContain("654321");
    expect(masked.result.evidence[0].message).not.toContain("supersecret");
  });

  it("keeps only a masked session result when local history is disabled", () => {
    setPrivacy(false, true);
    const record = { id: "session-only", content: "OTP: 123456", score: 75 };

    persistResultRecord(record.id, record);

    expect(localStorage.getItem("prewise-history")).toBeNull();
    expect(localStorage.getItem("prewise-result:session-only")).toBeNull();
    expect(sessionStorage.getItem("prewise-result:session-only")).not.toContain("123456");
    expect(loadResultRecord<typeof record>(record.id)?.score).toBe(75);
  });

  it("persists masked history and detail records when enabled", () => {
    setPrivacy(true, true);
    persistResultRecord("stored", { id: "stored", content: "card: 4111111111111111", score: 20 });

    expect(localStorage.getItem("prewise-history")).not.toContain("4111111111111111");
    expect(localStorage.getItem("prewise-result:stored")).not.toContain("4111111111111111");
    expect(loadLocalHistory<{ id: string }>()).toHaveLength(1);
  });

  it("preserves original values when masking is disabled", () => {
    setPrivacy(true, false);
    persistResultRecord("raw", { id: "raw", content: "OTP: 123456" });

    expect(sessionStorage.getItem("prewise-result:raw")).toContain("123456");
    expect(localStorage.getItem("prewise-result:raw")).toContain("123456");
  });

  it("clears history and every owned result from local and session storage", () => {
    localStorage.setItem("prewise-history", "[]");
    localStorage.setItem("prewise-result:one", "{}");
    sessionStorage.setItem("prewise-history", "[]");
    sessionStorage.setItem("prewise-result:two", "{}");
    localStorage.setItem("unrelated", "keep");

    clearResultHistory();

    expect(localStorage.getItem("prewise-history")).toBeNull();
    expect(sessionStorage.getItem("prewise-history")).toBeNull();
    expect(localStorage.getItem("prewise-result:one")).toBeNull();
    expect(sessionStorage.getItem("prewise-result:two")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });
});
