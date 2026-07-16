"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PrewiseShell, RiskDial, demoFindings } from "@/components/PrewiseUI";
import { displayValue, mapRiskResult, type RiskCoreRecord } from "@/lib/risk-core";

type Finding = { title: string; detail: string; evidence: string; severity: "high" | "medium" | "low" };
type ScoreLayer = { layer?: string; score?: number; status?: "completed" | "skipped" | "unavailable"; summary?: string; signals?: number; details?: CriterionDetail[] };
type CriterionDetail = { criterion?: string; value?: string; triggered?: boolean; contribution?: number; reason?: string };
type SandboxReport = { behaviors?: unknown[]; redirects?: unknown[]; scripts_executed?: string[]; network_calls?: string[]; dom_modifications?: unknown[]; analysis_time_ms?: number; error?: string | null };
type StoredRecord = {
  score?: number;
  content?: string;
  isDemo?: boolean;
  dataSource?: string;
  result?: {
    risk_score?: number;
    confidence?: number;
    analysis_time_ms?: number;
    threat_level?: string;
    deep_analysis_recommended?: boolean;
    score_layers?: ScoreLayer[];
    sandbox_report?: SandboxReport | null;
    ai_detection?: { detected?: boolean; confidence?: number; model_version?: string };
    evidence?: Array<{ source?: string; feature?: string; message?: string; severity?: string }>;
    risk_core?: Record<string, unknown>;
    risk_level?: string;
    decision?: string;
    reasons?: string[];
  };
};

const STATUS_LABEL = { completed: "ĐÃ KIỂM TRA", skipped: "CHƯA CHẠY", unavailable: "KHÔNG KHẢ DỤNG" } as const;
function localCriterionDetails(rawUrl: string | undefined, layerIndex: number): CriterionDetail[] {
  if (!rawUrl || layerIndex === 2) return [];
  try {
    const parsed = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`);
    const host = parsed.hostname.toLowerCase();
    const labels = host.split(".").filter(Boolean);
    const multiSuffix = ["com.vn", "net.vn", "org.vn", "co.uk"].some((suffix) => host.endsWith(`.${suffix}`));
    const domain = labels.length < 2 ? host : labels.slice(multiSuffix ? -3 : -2).join(".");
    const subdomain = labels.slice(0, labels.length - (multiSuffix ? 3 : 2)).join(".") || "(không có)";
    if (layerIndex === 0) return [
      { criterion: "Xác định hostname, domain thật và subdomain", value: `Hostname: ${host} · Domain đăng ký: ${domain} · Subdomain: ${subdomain}`, triggered: false, contribution: 0, reason: "Đã tách cấu trúc URL thành công. Bước này dùng làm đầu vào cho các luật giả mạo và không tự cộng điểm rủi ro." },
      { criterion: "So khớp thương hiệu trên domain không chính chủ", value: `Domain được đối chiếu: ${domain}`, triggered: false, contribution: 0, reason: "Không có chi tiết kích hoạt riêng từ backend; xem phần Bằng chứng nếu core phát hiện brand_domain_mismatch." },
      { criterion: "Phát hiện homoglyph, punycode và ký tự giả mạo", value: host.includes("xn--") ? "Có nhãn punycode xn--" : "Không thấy nhãn punycode", triggered: host.includes("xn--"), contribution: host.includes("xn--") ? 0.18 : 0, reason: host.includes("xn--") ? "Punycode làm tăng 18 điểm L1." : "Không phát hiện punycode ở hostname." },
      { criterion: "Kiểm tra HTTPS, IP host, TLD rủi ro và shortlink", value: `Protocol: ${parsed.protocol.replace(":", "")} · TLD: ${labels.at(-1) || "—"}`, triggered: parsed.protocol !== "https:", contribution: parsed.protocol !== "https:" ? 0.10 : 0, reason: parsed.protocol === "https:" ? "URL sử dụng HTTPS; tiêu chí này không cộng điểm." : "Không dùng HTTPS nên core cộng 10 điểm L1." },
    ];
    const decoded = decodeURIComponent(rawUrl).toLowerCase();
    const sensitive = ["password", "otp", "2fa", "mfa", "card", "cvv", "payment", "billing", "bank", "wallet", "token", "seed", "mnemonic"].filter((word) => decoded.includes(word));
    return [
      { criterion: "Tìm từ khóa dữ liệu nhạy cảm", value: sensitive.length ? sensitive.join(", ") : "Không phát hiện", triggered: sensitive.length > 0, contribution: Math.min(.26, .09 * sensitive.length), reason: sensitive.length ? `Phát hiện ${sensitive.length} từ khóa nhạy cảm.` : "Không có từ khóa mật khẩu, OTP, thẻ, ngân hàng, ví hoặc token." },
      { criterion: "Phát hiện tham số chuyển hướng", value: parsed.search || "Không có query string", triggered: /(?:redirect|redirect_uri|return_url|continue|next|target|url)=/i.test(decoded), contribution: /(?:redirect|redirect_uri|return_url|continue|next|target|url)=/i.test(decoded) ? .07 : 0, reason: "Kiểm tra tham số có thể che giấu đích cuối." },
      { criterion: "Kiểm tra @ và percent-encoding", value: `@: ${rawUrl.includes("@") ? "có" : "không"} · encoding %: ${rawUrl.includes("%") ? "có" : "không"}`, triggered: rawUrl.includes("@") || rawUrl.includes("%"), contribution: rawUrl.includes("@") ? .22 : rawUrl.includes("%") ? .12 : 0, reason: "Các ký tự này có thể được dùng để làm người đọc hiểu sai URL." },
      { criterion: "Đếm query parameter", value: `${Array.from(parsed.searchParams.keys()).length} tham số`, triggered: Array.from(parsed.searchParams.keys()).length >= 5, contribution: Array.from(parsed.searchParams.keys()).length >= 5 ? .08 : 0, reason: "Nhiều tham số bất thường có thể là tín hiệu né tránh." },
    ];
  } catch { return []; }
}
const LAYER_CRITERIA = [
  {
    scope: "Phân tích chuỗi URL · không mở website",
    steps: [
      "Xác định hostname, domain thật và subdomain",
      "So khớp thương hiệu trên domain không chính chủ",
      "Phát hiện homoglyph, punycode và ký tự giả mạo",
      "Kiểm tra IP host, TLD rủi ro, HTTPS và shortlink",
    ],
  },
  {
    scope: "Phân tích ý đồ và kỹ thuật che giấu · không mở website",
    steps: [
      "Tìm từ khóa password, OTP, thẻ, ngân hàng, ví và token",
      "Phát hiện URL lồng nhau và tham số redirect/next/target",
      "Kiểm tra ký tự @, percent-encoding và phân mảnh bất thường",
      "Đếm query parameter và nhận diện domain entropy cao",
    ],
  },
  {
    scope: "Quan sát website thật trong browser cô lập · chỉ chế độ Chuyên sâu",
    steps: [
      "Mở URL bằng worker trình duyệt ở chế độ dry-run",
      "Theo dõi redirect, navigation và đích cuối",
      "Ghi nhận script, network request và hành vi đáng ngờ",
      "Quan sát DOM mutation; chặn submit và dữ liệu nhạy cảm thật",
    ],
  },
] as const;

function ResultContent() {
  const query = useSearchParams();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryDemo = query.get("demo");
  const isStoredBackend = record?.isDemo === false || record?.dataSource === "backend" || Boolean(record?.result);
  const isDemo = isStoredBackend ? false : queryDemo !== "0";
  const fallbackScore = Number(query.get("score") || 87);
  const type = query.get("type") || "url";
  const [record, setRecord] = useState<StoredRecord | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem(`prewise-result:${id}`);
      if (raw) setRecord(JSON.parse(raw) as StoredRecord);
    } catch { /* Result query fallback remains available. */ }
  }, [id]);

  useEffect(() => {
    if (selectedLayer == null) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedLayer(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [selectedLayer]);

  const result = record?.result;
  const risk = mapRiskResult(result, record?.score ?? fallbackScore);
  const score = Math.round(risk.score);
  const v2Evidence = risk.evidence;
  const evidence = risk.source === "risk_core_v2" ? v2Evidence : result?.evidence ?? [];
  const findings: Finding[] = evidence.length
    ? evidence.slice(0, 8).map((item: RiskCoreRecord) => ({
        title: displayValue(item, ["feature", "category", "source"], "Tín hiệu rủi ro"),
        detail: displayValue(item, ["message", "reason", "detail"], "Backend phát hiện tín hiệu cần xem xét."),
        evidence: displayValue(item, ["source", "adapter", "detector_family"], "risk-core"),
        severity: (["critical", "high"].includes(displayValue(item, ["severity"]).toLowerCase()) ? "high" : ["low", "info"].includes(displayValue(item, ["severity"]).toLowerCase()) ? "low" : "medium") as Finding["severity"],
      }))
    : risk.source === "legacy" && isDemo ? demoFindings : [];
  const layers = result?.score_layers ?? [];
  const sandbox = result?.sandbox_report;
  const confidenceValue = risk.confidence;
  const confidence = confidenceValue != null ? `${Math.round(confidenceValue)}%` : "Không được cung cấp";
  const verdict = risk.source === "risk_core_v2" ? (risk.nextAction || risk.decision || "Chưa có hành động được policy cung cấp.") : score >= 70 ? "Không truy cập hoặc cung cấp thông tin." : score >= 40 ? "Hãy xác minh thêm trước khi tiếp tục." : "Chưa thấy tín hiệu rủi ro nổi bật.";
  const description = risk.source === "risk_core_v2" ? `Mức ${risk.level || "chưa xác định"} · Quyết định ${risk.decision || "chưa được cung cấp"}. UI giữ nguyên kết luận của Risk Core v2.` : score >= 70 ? "Trang đích có tín hiệu rủi ro cao. Không nhập mật khẩu, OTP, dữ liệu thẻ hoặc thông tin định danh." : score >= 40 ? "Có một số tín hiệu cần xác minh qua kênh chính thức trước khi thao tác." : "Kết quả legacy: mức rủi ro và khuyến nghị được UI suy từ điểm do payload cũ chưa có policy v2.";
  const checkedLayers = layers.filter((layer) => layer.status === "completed").length;
  const analysisKind = sandbox ? "Phân tích URL + browser sandbox" : "Phân tích URL ngoại tuyến";

  return <PrewiseShell><main id="main-content" className="report">
    <div className="report-title"><div><p className="eyebrow"><i /> ANALYSIS REPORT · {type.toUpperCase()}</p><span className="demo-badge">{isDemo ? "KẾT QUẢ MINH HỌA" : "KẾT QUẢ BACKEND THẬT"}</span><h1>Đánh giá rủi ro hoàn tất</h1><p>{isDemo ? "Prewise đã phát hiện nhiều tín hiệu cần được xem xét trước khi bạn tiếp tục." : "Báo cáo bên dưới cho biết chính xác những lớp nào đã chạy, tín hiệu nào được phát hiện và lớp nào chưa được thực hiện."}</p></div><div className="report-actions" aria-label="Tác vụ báo cáo"><button type="button" disabled title="Chưa khả dụng">↓ Xuất báo cáo</button><button type="button" disabled title="Chưa khả dụng">↗ Chia sẻ</button></div></div>

    <section className="report-overview" aria-label="Tổng quan kết quả"><RiskDial score={score} /><div className="verdict"><span>KHUYẾN NGHỊ</span><h2>{verdict}</h2><p>{description}</p><div><b>Điểm model/core <span className="info-tip" tabIndex={0} role="note" aria-label="Giải thích điểm">?<span>Đây là điểm rủi ro do model và các luật URL kết hợp, không phải xác suất website chắc chắn độc hại.</span></span></b><strong>{confidence}</strong><i aria-hidden><em /></i></div></div><div className="signal-visual" aria-hidden><div className="report-core" /><small>{findings.length} SIGNALS CORRELATED</small></div></section>

    {!isDemo && <section className="scan-proof" aria-labelledby="scan-proof-title"><div className="section-label"><span id="scan-proof-title">PHẠM VI ĐÃ KIỂM TRA</span><b>{checkedLayers}/{layers.length || 3} lớp hoàn tất</b></div><div className="scan-meta"><div><span>URL được kiểm tra</span><code title={record?.content}>{record?.content || "Không đọc được từ bộ nhớ trình duyệt"}</code></div><div><span>Kiểu phân tích</span><strong>{analysisKind}</strong></div><div><span>Thời gian backend</span><strong>{result?.analysis_time_ms ?? "—"} ms</strong></div><div><span>Core/model</span><strong>{result?.ai_detection?.model_version || "Không được cung cấp"}</strong></div></div><div className="layer-grid">{layers.map((layer, index) => { const status = layer.status || "completed"; const layerScore = Math.round((layer.score || 0) * 100); return <article role="button" tabIndex={0} aria-label={`Mở chi tiết ${layer.layer || `lớp ${index + 1}`}`} onClick={() => setSelectedLayer(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedLayer(index); } }} className={`layer-card layer-card-clickable ${status}`} key={`${layer.layer}-${index}`}><header><span>L{index + 1}</span><em>{STATUS_LABEL[status]}</em></header><h3>{layer.layer || `Lớp kiểm tra ${index + 1}`}</h3><p>{layer.summary || "Không có mô tả."}</p><div><span>Mức tín hiệu <b>{layerScore}/100</b></span><span>{layer.signals || 0} phát hiện</span></div><i aria-hidden><em style={{ width: `${layerScore}%` }} /></i><button type="button" tabIndex={-1} aria-hidden>Chi tiết tiêu chí ↗</button></article>; })}</div><div className="criteria-table-wrap"><table className="criteria-table"><thead><tr><th>Lớp</th><th>Phạm vi thực tế</th><th>Các bước / tiêu chí xét</th><th>Kết quả lần quét này</th></tr></thead><tbody>{LAYER_CRITERIA.map((criteria, index) => { const layer = layers[index]; const status = layer?.status || (index < 2 ? "completed" : "skipped"); return <tr key={`criteria-${index}`} className={status}><td><strong>L{index + 1}</strong><span>{index === 0 ? "Danh tính URL" : index === 1 ? "Ý đồ & né tránh" : "Browser sandbox"}</span></td><td>{criteria.scope}</td><td><ol>{criteria.steps.map((step, stepIndex) => <li key={step}><i>{stepIndex + 1}</i>{step}</li>)}</ol></td><td><em>{STATUS_LABEL[status]}</em><span>{layer ? `${layer.signals || 0} tín hiệu · ${Math.round((layer.score || 0) * 100)}/100` : "Không có dữ liệu lớp"}</span></td></tr>; })}</tbody></table></div>{!sandbox && <div className="coverage-warning"><b>⚠ Chưa mở nội dung website</b><p>Kết quả nhanh vì chế độ này chạy model ONNX và luật trên cấu trúc URL ngay trong bộ nhớ; không tải HTML, không theo redirect live và không chạy JavaScript. Chọn <b>Chuyên sâu</b> ở trang Analyze nếu muốn chạy browser sandbox.</p>{result?.deep_analysis_recommended && <strong>Core khuyến nghị chạy phân tích chuyên sâu cho URL này.</strong>}</div>}{sandbox && <div className="sandbox-summary"><b>Browser sandbox đã chạy</b><span>{sandbox.behaviors?.length || 0} hành vi</span><span>{sandbox.redirects?.length || 0} redirect/navigation</span><span>{sandbox.scripts_executed?.length || 0} script</span><span>{sandbox.network_calls?.length || 0} network request</span><span>{sandbox.dom_modifications?.length || 0} DOM mutation</span><span>{sandbox.analysis_time_ms ?? "—"} ms</span>{sandbox.error && <p>Sandbox báo lỗi: {sandbox.error}</p>}</div>}</section>}

    {selectedLayer != null && (() => { const criteria = LAYER_CRITERIA[selectedLayer]; const layer = layers[selectedLayer]; const status = layer?.status || (selectedLayer < 2 ? "completed" : "skipped"); return <div className="layer-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLayer(null); }}><section className="layer-modal" role="dialog" aria-modal="true" aria-labelledby="layer-modal-title"><header><div><span>CHI TIẾT KIỂM TRA · L{selectedLayer + 1}</span><h2 id="layer-modal-title">{layer?.layer || (selectedLayer === 0 ? "Danh tính URL" : selectedLayer === 1 ? "Ý đồ & né tránh" : "Browser sandbox")}</h2></div><button type="button" autoFocus onClick={() => setSelectedLayer(null)} aria-label="Đóng cửa sổ">×</button></header><div className="layer-modal-status"><em className={status}>{STATUS_LABEL[status]}</em><span>Điểm lớp: <b>{Math.round((layer?.score || 0) * 100)}/100</b></span><span>Tín hiệu: <b>{layer?.signals || 0}</b></span></div><div className="layer-modal-scope"><b>Phạm vi thực tế</b><p>{criteria.scope}</p></div><div className="criteria-checklist"><h3>Các tiêu chí hệ thống xét ở lớp này</h3>{((layer?.details?.length ? layer.details : localCriterionDetails(record?.content, selectedLayer)).length ? (layer?.details?.length ? layer.details : localCriterionDetails(record?.content, selectedLayer)) : criteria.steps.map((criterion): CriterionDetail => ({ criterion, triggered: status === "completed", contribution: 0 }))).map((detail, index) => <article key={`${detail.criterion}-${index}`}><i aria-hidden>{status !== "completed" ? (status === "unavailable" ? "!" : "—") : detail.triggered ? "!" : "✓"}</i><div><b>{String(index + 1).padStart(2, "0")}. {detail.criterion}</b>{detail.value && <code className="criterion-value">{detail.value}</code>}<p>{detail.reason || (status === "completed" ? "Đã xét tiêu chí; không có tín hiệu rủi ro riêng được kích hoạt." : status === "unavailable" ? "Không thể hoàn tất tiêu chí do lớp phân tích không khả dụng." : "Tiêu chí chưa được chạy trong lần phân tích này.")}</p>{status === "completed" && <span className={`criterion-score ${detail.triggered ? "risk" : "safe"}`}>{detail.triggered ? `+${Math.round((detail.contribution || 0) * 100)} điểm rủi ro` : "+0 điểm"}</span>}</div></article>)}</div>{selectedLayer === 2 && <div className="layer-modal-sandbox"><b>Dữ liệu browser ghi nhận</b><div><span>{sandbox?.redirects?.length || 0}<small>Redirect</small></span><span>{sandbox?.scripts_executed?.length || 0}<small>Script</small></span><span>{sandbox?.network_calls?.length || 0}<small>Network</small></span><span>{sandbox?.dom_modifications?.length || 0}<small>DOM</small></span></div>{!sandbox && <p>Chọn mức <b>Chuyên sâu</b> ở trang Analyze để thực sự chạy L3.</p>}</div>}<footer><span>{layer?.summary || "Không có dữ liệu tóm tắt từ backend."}</span><button type="button" onClick={() => setSelectedLayer(null)}>Đã hiểu</button></footer></section></div>; })()}

    {risk.source === "risk_core_v2" && <section className="scan-proof" aria-labelledby="risk-core-details"><div className="section-label"><span id="risk-core-details">RISK CORE V2 · CHI TIẾT QUYẾT ĐỊNH</span><b>Schema {risk.schemaVersion || "2"} · {risk.scoringVersion || "scoring version —"}</b></div><div className="scan-meta"><div><span>Mức rủi ro</span><strong>{risk.level || "Không được cung cấp"}</strong></div><div><span>Quyết định</span><strong>{risk.decision || "Không được cung cấp"}</strong></div><div><span>Điểm cuối / điểm thô</span><strong>{score}/100 · {risk.rawScore ?? "—"}</strong></div><div><span>Độ tin cậy</span><strong>{confidence}</strong></div></div>{risk.effectiveOverride && <div className="coverage-warning"><b>Override đang có hiệu lực</b><p>{displayValue(risk.effectiveOverride, ["reason", "description", "rule"], "Backend không cung cấp lý do override.")}</p></div>}<div className="criteria-table-wrap"><table className="criteria-table"><thead><tr><th>Tiêu chí</th><th>Trạng thái</th><th>Điểm</th><th>Lý do</th></tr></thead><tbody>{risk.criteria.length ? risk.criteria.map((item, index) => <tr key={displayValue(item, ["id", "criterion_id", "name"], String(index))}><td><strong>{displayValue(item, ["name", "criterion", "criterion_id", "id"], `Tiêu chí ${index + 1}`)}</strong></td><td>{displayValue(item, ["status", "result", "triggered"])}</td><td>{displayValue(item, ["points", "score", "contribution"])}</td><td>{displayValue(item, ["reason", "message", "description"])}</td></tr>) : <tr><td colSpan={4}>Không có chi tiết tiêu chí trong payload.</td></tr>}</tbody></table></div>{(risk.unavailableChecks.length > 0 || risk.notCheckedChecks.length > 0) && <div className="coverage-warning"><b>Phạm vi chưa hoàn tất</b><p>Không khả dụng: {risk.unavailableChecks.join(", ") || "không"}</p><p>Chưa kiểm tra: {risk.notCheckedChecks.join(", ") || "không"}</p></div>}<div className="report-grid"><section><div className="section-label"><span>MITIGATION</span><b>{risk.mitigations.length}</b></div>{risk.mitigations.map((item, index) => <p key={index}><b>{displayValue(item, ["title", "action", "name"], `Biện pháp ${index + 1}`)}:</b> {displayValue(item, ["description", "reason", "detail"])}</p>)}</section><aside className="action-plan"><div className="section-label"><span>REASONING / OVERRIDE / CAPS</span></div>{risk.reasoning.length ? <ol>{risk.reasoning.map((reason) => <li key={reason}>{reason}</li>)}</ol> : <p>Không có reasoning.</p>}<p>Overrides: {risk.overrides.length} · Caps: {risk.caps.length} · Conflicts: {risk.conflicts.length}</p></aside></div></section>}
    {risk.source === "legacy" && <p className="demo-disclosure" role="status">⚠ Chế độ tương thích legacy: payload không có <code>risk_core</code>. Điểm có thể được chuẩn hóa từ thang 0..1; level/khuyến nghị cục bộ không phải quyết định policy v2.</p>}

    <details className="result-guide"><summary>Cách đọc và giới hạn của kết quả</summary><p><b>Risk score</b> tổng hợp model ML và các luật phát hiện giả mạo, ý đồ đánh cắp thông tin, kỹ thuật che giấu. Phân tích ngoại tuyến có thể hoàn tất trong vài mili-giây vì không truy cập website. Chỉ chế độ <b>Chuyên sâu</b> mới mở trang trong browser sandbox để quan sát redirect, script, network và DOM.</p></details>
    {isDemo ? <p className="demo-disclosure" role="status">ⓘ Đây là luồng demo dùng điểm số và bằng chứng cố định để minh họa giao diện.</p> : <p className="demo-disclosure" role="status">ⓘ Phản hồi backend thật · {analysisKind} · Latency {result?.analysis_time_ms ?? "—"} ms · Threat level: {result?.threat_level || "—"}.</p>}

    <div className="report-grid"><section aria-labelledby="evidence-heading"><div className="section-label"><span id="evidence-heading">BẰNG CHỨNG CORE TRẢ VỀ</span><b>{findings.length} tín hiệu</b></div><div className="findings">{findings.map((finding, index) => <article key={`${finding.title}-${index}`}><span className={`severity ${finding.severity}`} aria-label={`Tín hiệu ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span><div><h3>{finding.title}</h3><p>{finding.detail}</p><code>{finding.evidence}</code></div><em>{finding.severity === "high" ? "CAO" : finding.severity === "low" ? "THẤP/INFO" : "VỪA"}</em></article>)}</div></section><aside className="action-plan" aria-labelledby="actions-heading"><div className="section-label"><span id="actions-heading">HÀNH ĐỘNG ĐỀ XUẤT</span></div><ol><li><b>Không mở liên kết hoặc biểu mẫu</b><p>Đóng trang nếu bạn đã truy cập.</p></li><li><b>Không chia sẻ thông tin</b><p>Không nhập mật khẩu, OTP hay dữ liệu thẻ.</p></li><li><b>Xác minh qua kênh chính thức</b><p>Tự nhập tên miền hoặc gọi số đã xác thực.</p></li><li><b>Chạy Chuyên sâu khi còn nghi ngờ</b><p>Browser sandbox kiểm tra thêm redirect, script và network.</p></li></ol><button type="button" disabled title="Chưa khả dụng">Báo cáo website ↗</button></aside></div>
    <div className="report-foot"><Link href="/analyze">← Phân tích nội dung khác</Link><span>Kết quả hỗ trợ quyết định, không thay thế xác minh hoặc đánh giá chuyên môn.</span></div>
  </main></PrewiseShell>;
}

export default function ResultPage() { return <Suspense fallback={<PrewiseShell><main id="main-content" className="analysis-loading" aria-busy="true"><p>Đang chuẩn bị báo cáo…</p></main></PrewiseShell>}><ResultContent /></Suspense>; }
