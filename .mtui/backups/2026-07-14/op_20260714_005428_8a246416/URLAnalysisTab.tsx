"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Eye,
    Fingerprint,
    ImageIcon,
    Link2,
    Loader2,
    Play,
    ScanSearch,
    ShieldCheck,
    Upload,
    XCircle,
} from "lucide-react";

import type { DeepfakeImageResponse, URLAnalysisResponse } from "../types";

const URL_EXAMPLES = [
    {
        label: "Giả mạo Facebook",
        value: "https://facebook.com.security-login-check.xyz/verify",
    },
    {
        label: "Giả mạo PayPal",
        value: "http://paypa1-secure-verify.tk/login",
    },
    { label: "URL an toàn", value: "https://github.com" },
];

export default function URLAnalysisTab() {
    const [url, setUrl] = useState(URL_EXAMPLES[0].value);
    const [result, setResult] = useState<URLAnalysisResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [advancedAnalysis, setAdvancedAnalysis] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [deepfakeResult, setDeepfakeResult] = useState<DeepfakeImageResponse | null>(null);
    const [deepfakeLoading, setDeepfakeLoading] = useState(false);

    useEffect(() => {
        if (!imageFile) {
            setImagePreview(null);
            return;
        }
        const preview = URL.createObjectURL(imageFile);
        setImagePreview(preview);
        return () => URL.revokeObjectURL(preview);
    }, [imageFile]);

    async function analyze() {
        if (!url.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/demo/url/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, deep_analysis: advancedAnalysis, advanced_analysis: advancedAnalysis }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Analysis failed");
            setResult(data as URLAnalysisResponse);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Không thể phân tích URL");
        } finally {
            setLoading(false);
        }
    }

    async function analyzeDeepfake(file: File) {
        setImageFile(file);
        setDeepfakeLoading(true);
        setDeepfakeResult(null);
        setError(null);
        try {
            const form = new FormData();
            form.append("image", file);
            const response = await fetch("/api/demo/deepfake/analyze", {
                method: "POST",
                body: form,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Deepfake analysis failed");
            setDeepfakeResult(data as DeepfakeImageResponse);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Không thể phân tích ảnh");
        } finally {
            setDeepfakeLoading(false);
        }
    }

    async function loadBuiltInAiImage() {
        const response = await fetch("/hero-demo-fallback.png");
        const blob = await response.blob();
        await analyzeDeepfake(new File([blob], "ai-generated-demo.png", { type: "image/png" }));
    }

    const armorBlocked = result ? result.risk_score >= 0.5 : false;

    return (
        <div className="space-y-6">
            <section>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-800">
                            <Fingerprint className="h-4 w-4" /> Demo 1 · Deepfake & Phishing Detection
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-950">Phát hiện trang giả mạo và lừa đảo</h2>
                        <p className="mt-1 max-w-3xl text-sm text-zinc-600">
                            So sánh blacklist truyền thống với bộ phân tích URL học máy + tín hiệu giả mạo thương hiệu của Armor.
                        </p>
                    </div>
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-900">
                        Live inference · Không gọi cloud API
                    </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <Capability icon={<Link2 className="h-4 w-4" />} label="Phishing URL" status="LIVE" tone="green" />
                    <Capability icon={<ScanSearch className="h-4 w-4" />} label="Phishing email/text" status="LIVE" tone="green" />
                    <Capability icon={<Eye className="h-4 w-4" />} label="Deepfake ảnh tĩnh" status="LIVE" tone="green" />
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                    Deepfake hiện sàng lọc ảnh tĩnh/ảnh AI-generated bằng model ViT cục bộ. Video, audio và kết luận pháp y tuyệt đối không nằm trong phạm vi.
                </p>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                    {URL_EXAMPLES.map((example) => (
                        <button
                            key={example.label}
                            type="button"
                            onClick={() => {
                                setUrl(example.value);
                                setResult(null);
                            }}
                            className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                        >
                            {example.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && void analyze()}
                        className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-3 font-mono text-sm text-zinc-900 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
                        aria-label="URL cần phân tích"
                    />
                    <button
                        type="button"
                        onClick={analyze}
                        disabled={loading || !url.trim()}
                        className="flex items-center justify-center gap-2 rounded-md bg-cyan-800 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-900 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Chạy so sánh A/B
                    </button>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    <label className="flex cursor-pointer items-center gap-2 font-medium">
                        <input
                            type="checkbox"
                            checked={advancedAnalysis}
                            onChange={(event) => setAdvancedAnalysis(event.target.checked)}
                            className="h-4 w-4 accent-cyan-800"
                        />
                        Kiểm tra chuyên sâu trong browser sandbox
                    </label>
                    <span className="max-w-xs text-right text-zinc-500">Dùng canary tổng hợp, chặn gửi biểu mẫu và giám sát hành vi; có thể mất thêm ~35 giây.</span>
                </div>
                <section className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
                        <article className="rounded-lg border border-red-300 bg-red-50 p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-red-700">Trước · Blacklist tĩnh</p>
                                    <h3 className="mt-1 text-lg font-bold text-zinc-950">Không tìm thấy chữ ký</h3>
                                </div>
                                <XCircle className="h-7 w-7 text-red-700" />
                            </div>
                            <div className="mt-5 space-y-3 text-sm">
                                <StatusRow label="URL có trong blacklist" value="KHÔNG" />
                                <StatusRow label="Phân tích tên miền" value="KHÔNG" />
                                <StatusRow label="Quyết định" value="ALLOW" danger />
                            </div>
                            <div className="mt-5 rounded-md bg-red-100 px-3 py-3 text-sm font-semibold text-red-900">
                                URL mới chưa có chữ ký đi thẳng tới người dùng.
                            </div>
                        </article>

                        <div className="hidden items-center text-zinc-400 lg:flex">
                            <ArrowRight className="h-6 w-6" />
                        </div>

                        <article className={`rounded-lg border p-5 ${armorBlocked ? "border-emerald-300 bg-emerald-50" : "border-cyan-300 bg-cyan-50"}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-wide ${armorBlocked ? "text-emerald-700" : "text-cyan-800"}`}>Sau · Armor ON</p>
                                    <h3 className="mt-1 text-lg font-bold text-zinc-950">
                                        {armorBlocked ? "Phát hiện và chặn" : "Xác nhận rủi ro thấp"}
                                    </h3>
                                </div>
                                {armorBlocked ? <ShieldCheck className="h-7 w-7 text-emerald-700" /> : <CheckCircle2 className="h-7 w-7 text-cyan-800" />}
                            </div>
                            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                                <Metric label="Risk score" value={`${(result.risk_score * 100).toFixed(1)}%`} />
                                <Metric label="Threat level" value={result.threat_level.toUpperCase()} />
                                <Metric label="Decision" value={armorBlocked ? "BLOCK" : "ALLOW"} />
                                <Metric label="Latency" value={`${result.analysis_time_ms} ms`} />
                            </div>
                            <div className={`mt-5 rounded-md px-3 py-3 text-sm font-semibold ${armorBlocked ? "bg-emerald-100 text-emerald-900" : "bg-cyan-100 text-cyan-950"}`}>
                                {armorBlocked ? "Mối đe dọa bị dừng trước khi người dùng mở trang." : "URL an toàn không bị chặn nhầm."}
                            </div>
                            <p className="mt-3 text-[11px] text-zinc-500">{result.ai_detection.model_version}</p>
                        </article>
                    </div>

                    {result.score_layers && result.score_layers.length > 0 && (
                        <div className="grid gap-3 md:grid-cols-3">
                            {result.score_layers.map((layer) => (
                                <article key={layer.layer} className="rounded-lg border border-zinc-200 bg-white p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-sm font-bold text-zinc-900">{layer.layer}</h3>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${layer.status === "completed" ? "bg-cyan-100 text-cyan-800" : "bg-zinc-100 text-zinc-600"}`}>{layer.status}</span>
                                    </div>
                                    <p className="mt-2 text-2xl font-bold text-zinc-950">{(layer.score * 100).toFixed(0)}<span className="text-sm">%</span></p>
                                    <p className="mt-1 text-xs text-zinc-600">{layer.summary}</p>
                                    <p className="mt-2 font-mono text-[11px] text-zinc-500">{layer.signals} tín hiệu</p>
                                </article>
                            ))}
                        </div>
                    )}
                    {result.deep_analysis_recommended && !advancedAnalysis && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <strong>Khuyến nghị kiểm tra chuyên sâu:</strong> URL có tín hiệu chưa đủ rõ hoặc liên quan tới dữ liệu nhạy cảm. Bật sandbox để xác minh redirect, biểu mẫu và hành vi gửi dữ liệu trong môi trường cô lập.
                        </div>
                    )}

                    {result.evidence.length > 0 && (
                        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                            <div className="border-b border-zinc-200 px-4 py-3">
                                <h3 className="font-semibold text-zinc-900">Bằng chứng phát hiện</h3>
                            </div>
                            <div className="grid gap-px bg-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
                                {result.evidence.slice(0, 6).map((item) => (
                                    <div key={`${item.source}-${item.feature}-${item.message}`} className="bg-white p-4">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-semibold text-cyan-800">{item.feature || item.source}</span>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.severity === "high" || item.severity === "critical" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                                                {item.severity}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-700">{item.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            <section className="border-t border-zinc-200 pt-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-fuchsia-800">
                            <ImageIcon className="h-4 w-4" /> Demo 1B · Ảnh AI-generated / deepfake tĩnh
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-950">Pixel forensics trước và sau Armor</h2>
                        <p className="mt-1 max-w-3xl text-sm text-zinc-600">
                            Kiểm tra file thông thường chỉ biết định dạng. Armor đọc đặc trưng pixel bằng ViT ONNX và trả xác suất REAL/FAKE.
                        </p>
                    </div>
                    <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-900">
                        57 MB · CPU · Local
                    </span>
                </div>

                <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md bg-fuchsia-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-900">
                        <Upload className="h-4 w-4" /> Chọn ảnh để phân tích
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="sr-only"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void analyzeDeepfake(file);
                            }}
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() => void loadBuiltInAiImage()}
                        disabled={deepfakeLoading}
                        className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                    >
                        {deepfakeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Dùng ảnh AI demo có sẵn
                    </button>
                    <span className="self-center text-xs text-zinc-500">PNG, JPG hoặc WebP · tối đa 15 MB</span>
                </div>

                {deepfakeResult && imagePreview && (
                    <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr_auto_1fr]">
                        <div className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                            <Image src={imagePreview} alt="Ảnh đang được phân tích" fill unoptimized className="object-cover" />
                        </div>
                        <article className="rounded-lg border border-red-300 bg-red-50 p-5">
                            <p className="text-xs font-bold uppercase tracking-wide text-red-700">Trước · Kiểm tra file</p>
                            <h3 className="mt-1 text-lg font-bold text-zinc-950">Không xác minh được nội dung</h3>
                            <div className="mt-5 space-y-3 text-sm">
                                <StatusRow label="Định dạng hợp lệ" value="CÓ" />
                                <StatusRow label="Phân tích pixel" value="KHÔNG" />
                                <StatusRow label="Quyết định" value="ALLOW" danger />
                            </div>
                            <div className="mt-5 rounded-md bg-red-100 px-3 py-3 text-sm font-semibold text-red-900">
                                Ảnh giả vẫn vượt qua vì file hoàn toàn hợp lệ.
                            </div>
                        </article>

                        <div className="hidden items-center text-zinc-400 lg:flex"><ArrowRight className="h-6 w-6" /></div>

                        <article className={`rounded-lg border p-5 ${deepfakeResult.verdict === "likely_fake" ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
                            <p className={`text-xs font-bold uppercase tracking-wide ${deepfakeResult.verdict === "likely_fake" ? "text-amber-800" : "text-emerald-700"}`}>Sau · Armor ON</p>
                            <h3 className="mt-1 text-lg font-bold text-zinc-950">
                                {deepfakeResult.verdict === "likely_fake" ? "Nghi ngờ ảnh AI/deepfake" : deepfakeResult.verdict === "likely_real" ? "Có khả năng là ảnh thật" : "Cần kiểm tra thêm"}
                            </h3>
                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <Metric label="FAKE" value={`${(deepfakeResult.fake_probability * 100).toFixed(1)}%`} />
                                <Metric label="REAL" value={`${(deepfakeResult.real_probability * 100).toFixed(1)}%`} />
                                <Metric label="Decision" value={deepfakeResult.decision} />
                                <Metric label="Latency" value={`${deepfakeResult.analysis_time_ms} ms`} />
                            </div>
                            <div className="mt-4 space-y-1 border-t border-black/10 pt-3">
                                {deepfakeResult.evidence.map((item) => <p key={item} className="text-xs text-zinc-700">· {item}</p>)}
                            </div>
                            <p className="mt-3 text-[11px] text-zinc-500">{deepfakeResult.model_version}</p>
                        </article>
                    </div>
                )}

                {deepfakeResult && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                        <strong>Giới hạn:</strong> {deepfakeResult.limitations.join(" ")}
                    </div>
                )}
            </section>

            {error && (
                <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <AlertTriangle className="h-4 w-4" /> {error}
                </div>
            )}
        </div>
    );
}

function Capability({ icon, label, status, tone }: { icon: React.ReactNode; label: string; status: string; tone: "green" | "amber" }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">{icon}{label}</div>
            <span className={`text-[10px] font-bold ${tone === "green" ? "text-emerald-700" : "text-amber-700"}`}>{status}</span>
        </div>
    );
}

function StatusRow({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
    return (
        <div className="flex items-center justify-between border-b border-red-200 pb-2">
            <span className="text-zinc-600">{label}</span>
            <span className={danger ? "font-bold text-red-800" : "font-semibold text-zinc-900"}>{value}</span>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="mt-0.5 font-bold text-zinc-950">{value}</p>
        </div>
    );
}
