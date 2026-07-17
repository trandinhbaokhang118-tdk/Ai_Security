"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PrewiseShell } from "@/components/PrewiseUI";

type Mode = "url" | "email" | "sms";
type ApiEvidence = { source: string; message: string; severity: string; feature?: string };
type UrlResponse = { risk_score: number; threat_level: string; analysis_time_ms: number; evidence: ApiEvidence[]; ai_detection: { model_version: string }; score_layers?: unknown[]; deep_analysis_recommended?: boolean };
const STEPS = ["Chuẩn hóa URL", "Phân tích tên miền và giả mạo", "Chấm điểm rủi ro", "Tổng hợp bằng chứng"];

function AnalyzeContent() {
  const query = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [text, setText] = useState("");
  const [llmContext, setLlmContext] = useState("");
  const [depth, setDepth] = useState("balanced");
  const [scopes, setScopes] = useState({ spoofing: true, sensitive: true, manipulation: true });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const signal = query.get("signal");
    if (!signal) return;
    setText(signal);
    if (!/^https?:\/\//i.test(signal) && !/^www\./i.test(signal)) setMode(signal.length <= 180 ? "sms" : "email");
  }, [query]);
  useEffect(() => {
    if (!loading) return;
    const interval = window.setInterval(() => setStep((current) => Math.min(current + 1, STEPS.length - 1)), 650);
    return () => window.clearInterval(interval);
  }, [loading]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); void analyze(); }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });

  async function analyze() {
    const value = text.trim();
    if (!value) { setError("Hãy dán URL, email hoặc tin nhắn cần kiểm tra rồi thử lại."); return; }
    if (mode !== "url") { setError("Luồng kiểm tra thật hiện đã được bật cho Website / URL. Email và SMS sẽ được kết nối ở bước tiếp theo."); return; }
    setError(""); setLoading(true); setStep(0);
    try {
      const response = await fetch("/api/demo/url/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value, deep_analysis: depth === "deep", advanced_analysis: depth === "deep", llm_context: llmContext.trim() || undefined }),
      });
      const data = await response.json() as UrlResponse & { detail?: string };
      if (!response.ok) throw new Error(data.detail || "Máy chủ không thể phân tích URL này.");
      const record = { id: crypto.randomUUID(), type: "url", content: value, llmContext: llmContext.trim() || undefined, score: Math.round(data.risk_score * 100), date: new Date().toISOString(), findings: data.evidence, isDemo: false, dataSource: "backend", result: data };
      try {
        const old = JSON.parse(localStorage.getItem("prewise-history") || "[]");
        localStorage.setItem("prewise-history", JSON.stringify([record, ...old].slice(0, 20)));
        localStorage.setItem(`prewise-result:${record.id}`, JSON.stringify(record));
      } catch { /* Storage unavailable: result is still carried by query. */ }
      router.push(`/result/${record.id}?score=${record.score}&type=url&demo=0`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể kết nối dịch vụ phân tích."); }
    finally { setLoading(false); }
  }

  return <PrewiseShell><main id="main-content" className="workspace">
    <section className="editor-pane" aria-labelledby="analysis-title">
      <div className="pane-head"><div><span className="crumb">WORKSPACE / NEW ANALYSIS</span><h1 id="analysis-title">Phân tích tín hiệu</h1></div><span className="saved">● BACKEND · Phân tích thật</span></div>
      <div className="mode-tabs" role="tablist" aria-label="Loại nội dung">{(["url", "email", "sms"] as Mode[]).map((item) => <button type="button" role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setText(""); setError(""); }} className={mode === item ? "active" : ""} key={item}>{item === "url" ? "Website / URL" : item === "email" ? "Email" : "SMS / Tin nhắn"}</button>)}</div>
      <div className="editor-area"><div className="line-nos" aria-hidden>01<br />02<br />03<br />04<br />05<br />06</div><div className="input-stack"><label htmlFor="analysis-input">Nội dung cần kiểm tra</label><textarea id="analysis-input" autoFocus value={text} disabled={loading} onChange={(event) => { setText(event.target.value); setError(""); }} placeholder={mode === "url" ? "Ví dụ: https://example.com/verify" : "Ví dụ: Dán toàn bộ nội dung email hoặc tin nhắn…"} aria-describedby={`input-safety input-processing${error ? " input-error" : ""}`} aria-invalid={Boolean(error)} /><p id="input-safety" className="input-safety"><b>Không dán mật khẩu, mã OTP, mã khôi phục hoặc dữ liệu tài chính bí mật.</b></p><details id="input-processing" className="data-processing"><summary>Cách Prewise xử lý dữ liệu</summary><p>Website / URL được gửi đến Security Gateway để phân tích thật. Khi chọn Chuyên sâu, URL được kiểm tra trong browser sandbox cô lập bằng dữ liệu canary tổng hợp.</p></details>{error && <p id="input-error" className="form-error" role="alert">⚠ {error}</p>}</div></div>
      <div className="editor-status"><span>{text.length} ký tự</span><span>UTF-8 &nbsp; • &nbsp; Tiếng Việt / English</span></div>{loading && <div className="editor-status" aria-live="polite"><span>Đang kiểm tra: {STEPS[step]}</span><span>{step + 1}/{STEPS.length} · {Math.round(((step + 1) / STEPS.length) * 100)}%</span></div>}
    </section>
    <aside className="inspector"><div className="inspector-head"><span>CẤU HÌNH ĐÁNH GIÁ</span><b aria-hidden>⌁</b></div>
      <div className="config-group"><span className="group-label">Phạm vi phân tích</span><div className="check-row"><span><label className="check-box locked" aria-label="Dấu hiệu lừa đảo"><input type="checkbox" checked disabled /><i aria-hidden>✓</i></label>Dấu hiệu lừa đảo</span></div>{([ ["spoofing", "Độ tin cậy & giả mạo"], ["sensitive", "Dữ liệu nhạy cảm"], ["manipulation", "Thao túng & thúc ép"] ] as const).map(([key, label]) => <div className="check-row" key={key}><span><label className="check-box" aria-label={`Bật hoặc tắt ${label}`}><input type="checkbox" checked={scopes[key]} onChange={(event) => setScopes({ ...scopes, [key]: event.target.checked })} /><i aria-hidden>{scopes[key] ? "✓" : ""}</i></label>{label}</span></div>)}</div>
      <fieldset className="config-group"><legend>Mức độ phân tích</legend><div className="segments">{[["quick", "Nhanh"], ["balanced", "Cân bằng"], ["deep", "Chuyên sâu"]].map(([key, label]) => <button type="button" aria-pressed={depth === key} className={depth === key ? "active" : ""} onClick={() => setDepth(key)} key={key}>{label}</button>)}</div><p>Chuyên sâu sẽ chạy browser sandbox cô lập; không gửi dữ liệu thật vào biểu mẫu.</p></fieldset>
      <div className="llm-context"><label htmlFor="llm-context">Ngữ cảnh bổ sung cho LLM</label><textarea id="llm-context" value={llmContext} disabled={loading} maxLength={2000} onChange={(event) => setLlmContext(event.target.value)} placeholder="Ví dụ: Đây là email từ đối tác mới; người gửi nói đã gọi xác nhận…" aria-describedby="llm-context-help" /><p id="llm-context-help">Thông tin này sẽ được lưu cùng phiên phân tích và gửi cho LLM khi tính năng giải thích được bật.</p></div>
      <div className="analyze-action"><button type="button" disabled={!text.trim() || loading} onClick={() => void analyze()} aria-describedby="scan-shortcut">{loading ? <><span className="spinner" aria-hidden />{STEPS[step]}…</> : <>Phân tích nội dung <span aria-hidden>→</span></>}</button><small id="scan-shortcut">Ctrl/⌘ + Enter</small><span className="sr-only" role="status" aria-live="polite">{loading ? `Đang phân tích: ${STEPS[step]}` : ""}</span></div>
    </aside>
  </main></PrewiseShell>;
}

export default function AnalyzePage() {
  return <Suspense fallback={<PrewiseShell><main id="main-content" className="analysis-loading" aria-busy="true"><p>Đang mở không gian phân tích…</p></main></PrewiseShell>}><AnalyzeContent /></Suspense>;
}
