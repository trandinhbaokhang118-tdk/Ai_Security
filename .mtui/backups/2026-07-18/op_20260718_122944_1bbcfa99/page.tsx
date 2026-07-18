"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
    ExternalLink,
    FileWarning,
    Globe2,
    Maximize2,
    Minimize2,
    MonitorPlay,
    RotateCcw,
    ShieldCheck,
    X,
} from "lucide-react";

import { PrewiseShell } from "@/components/PrewiseUI";
import { getApiClient } from "@/lib/api";
import { readStoredAccessToken } from "@/lib/auth-session";
import type {
    BrowserSandboxResult,
    ExeProviderResult,
    ExeSandboxResult,
} from "@/lib/types";

type View = "lab" | "sandbox";
type Tier = "free" | "pro" | "max";
type CloudSession = {
    id: string;
    tier: Tier;
    status: string;
    remoteUrl: string | null;
    expiresAt: string;
    error: string | null;
};
type FreeBrowserEvent = {
    id: string;
    type:
        | "input_substituted"
        | "form_submission_attempt"
        | "canary_submission"
        | "download_blocked"
        | "private_network_blocked";
    severity: "info" | "medium" | "high";
    title: string;
    message: string;
    destination?: string | null;
    filename?: string;
    replacement?: string;
    blocked?: boolean;
};
type FreeBrowser = {
    url: string;
    title: string;
    image: string;
    width: number;
    height: number;
    protection: {
        canaryEnabled: boolean;
        realInputSent: boolean;
        downloadBlockingEnabled: boolean;
        submissionsObserved: number;
        downloadsBlocked: number;
    };
    events: FreeBrowserEvent[];
    lastEvent: FreeBrowserEvent | null;
};
type CloudStatus = {
    accountTier: Tier;
    credits: number;
    availableTiers: Array<{
        tier: Tier;
        web: boolean;
        exe: boolean;
        gpu: boolean;
        minutes: number;
        provider: string;
        allowed: boolean;
    }>;
    cloudConfigured: boolean;
    freeConfigured: boolean;
    session: CloudSession | null;
};

const API = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(
    /\/$/,
    "",
);

async function cloudRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const token = readStoredAccessToken();
    let response: Response;
    try {
        response = await fetch(`${API}/v1/sandbox-cloud${path}`, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
    } catch {
        throw new Error(
            "Mất kết nối tới Sandbox backend. Hãy kiểm tra backend cổng 8000 rồi thử lại.",
        );
    }
    if (!response.ok) {
        throw new Error(
            (await response.json().catch(() => null))?.detail ||
                `Lỗi Sandbox ${response.status}`,
        );
    }
    return response.json() as Promise<T>;
}

function wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function verdictForScore(score: number): ExeSandboxResult["verdict"] {
    if (score >= 75) return "dangerous";
    if (score >= 35) return "suspicious";
    return "no_obvious_theft_detected";
}

function verdictLabel(verdict: ExeSandboxResult["verdict"]): string {
    if (verdict === "dangerous") return "NGUY HIỂM";
    if (verdict === "suspicious") return "ĐÁNG NGỜ";
    if (verdict === "no_obvious_theft_detected") return "CHƯA THẤY DẤU HIỆU RÕ";
    return "CHƯA XÁC ĐỊNH";
}

function providerStatusLabel(provider?: ExeProviderResult): string {
    if (!provider?.configured || provider.status === "disabled") {
        return "Chưa cấu hình · chỉ phân tích cục bộ";
    }
    if (provider.status === "not_found") return "Hash chưa có kết quả";
    if (provider.status === "queued") return `Đang quét ${provider.progress}%`;
    if (provider.status === "failed") return "Không lấy được kết quả";
    if (provider.total_engines > 0) {
        return `${provider.detected_engines}/${provider.total_engines} engine phát hiện`;
    }
    return "Đã nhận báo cáo provider";
}

function mergeProviderResult(
    current: ExeSandboxResult,
    provider: ExeProviderResult,
): ExeSandboxResult {
    const localScore = current.local_analysis?.risk_score ?? current.risk_score;
    const score = Math.max(localScore, provider.risk_score);
    const providerIssue =
        provider.detected_engines > 0
            ? `${provider.detected_engines}/${provider.total_engines || "?"} engine phát hiện tệp.`
            : null;
    const mergedProvider = {
        ...provider,
        sample_shared: Boolean(current.provider?.sample_shared || provider.sample_shared),
    };
    return {
        ...current,
        provider: mergedProvider,
        execution_status: provider.status === "queued" ? "queued" : "completed",
        risk_score: score,
        verdict: current.ok ? verdictForScore(score) : "unknown",
        issues:
            providerIssue && !current.issues.includes(providerIssue)
                ? [...current.issues, providerIssue]
                : current.issues,
    };
}

export default function SandboxPage() {
    const [view, setView] = useState<View>("lab");
    const [url, setUrl] = useState("https://example.com");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [web, setWeb] = useState<BrowserSandboxResult | null>(null);
    const [exe, setExe] = useState<ExeSandboxResult | null>(null);
    const [exeFile, setExeFile] = useState<File | null>(null);
    const [shareExe, setShareExe] = useState(false);
    const [providerPolling, setProviderPolling] = useState(false);
    const [cloud, setCloud] = useState<CloudStatus | null>(null);
    const [selected, setSelected] = useState<Tier>("free");
    const [freeBrowser, setFreeBrowser] = useState<FreeBrowser | null>(null);
    const [freeUrl, setFreeUrl] = useState("https://example.com");
    const [sandboxText, setSandboxText] = useState("");
    const [expanded, setExpanded] = useState(false);
    const typingBuffer = useRef("");
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingPromise = useRef<Promise<void> | null>(null);
    const actionQueue = useRef<Promise<void>>(Promise.resolve());
    const providerPollGeneration = useRef(0);

    async function refresh() {
        try {
            const value = await cloudRequest<CloudStatus>("/status");
            setCloud(value);
            if (value.session) setSelected(value.session.tier);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
    }

    useEffect(() => {
        if (view === "sandbox") void refresh();
    }, [view]);

    const provisioning = cloud?.session?.status === "provisioning";
    useEffect(() => {
        if (!provisioning) return;
        const timer = setInterval(() => void refresh(), 3000);
        return () => clearInterval(timer);
    }, [provisioning]);

    async function startSession() {
        setBusy(true);
        setError("");
        try {
            const created = await cloudRequest<CloudSession>("/sessions", {
                method: "POST",
                body: JSON.stringify({ tier: selected }),
            });
            await refresh();
            if (created.tier === "free") {
                setFreeBrowser(
                    await cloudRequest<FreeBrowser>(`/sessions/${created.id}/browser`),
                );
            }
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        } finally {
            setBusy(false);
        }
    }

    const session = cloud?.session;

    function freeAction(path: string, body: object): Promise<void> {
        const activeSession = session;
        if (!activeSession) return Promise.resolve();
        const run = async () => {
            setBusy(true);
            setError("");
            try {
                setFreeBrowser(
                    await cloudRequest<FreeBrowser>(
                        `/sessions/${activeSession.id}/browser/${path}`,
                        { method: "POST", body: JSON.stringify(body) },
                    ),
                );
            } catch (caught) {
                setError(caught instanceof Error ? caught.message : String(caught));
            } finally {
                setBusy(false);
            }
        };
        const pending = actionQueue.current.then(run, run);
        actionQueue.current = pending.catch(() => undefined);
        return pending;
    }

    async function stopSession() {
        if (!cloud?.session) return;
        setBusy(true);
        try {
            await cloudRequest(`/sessions/${cloud.session.id}`, { method: "DELETE" });
            setExpanded(false);
            setFreeBrowser(null);
            await refresh();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        } finally {
            setBusy(false);
        }
    }

    async function scanUrl() {
        setBusy(true);
        setError("");
        try {
            setWeb(await getApiClient().browserSandboxUrl(url));
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        } finally {
            setBusy(false);
        }
    }

    async function pollExeProvider(dataId: string) {
        const generation = ++providerPollGeneration.current;
        const delays = [10_000, 20_000, 30_000, 30_000, 30_000, 30_000];
        setProviderPolling(true);
        try {
            for (const delay of delays) {
                await wait(delay);
                if (generation !== providerPollGeneration.current) return;
                const provider = await getApiClient().getExecutableProviderReport(dataId);
                if (generation !== providerPollGeneration.current) return;
                setExe((current) => (current ? mergeProviderResult(current, provider) : current));
                if (provider.status !== "queued") return;
            }
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        } finally {
            if (generation === providerPollGeneration.current) setProviderPolling(false);
        }
    }

    async function refreshExeProvider(dataId: string) {
        providerPollGeneration.current += 1;
        setProviderPolling(true);
        setError("");
        let continuePolling = false;
        try {
            const provider = await getApiClient().getExecutableProviderReport(dataId);
            setExe((current) => (current ? mergeProviderResult(current, provider) : current));
            continuePolling = provider.status === "queued";
            if (continuePolling) void pollExeProvider(dataId);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        } finally {
            if (!continuePolling) setProviderPolling(false);
        }
    }

    async function scanExe(file?: File, shareWithProvider = shareExe) {
        if (!file) return;
        providerPollGeneration.current += 1;
        setProviderPolling(false);
        setExeFile(file);
        setBusy(true);
        setError("");
        try {
            const result = await getApiClient().sandboxExecutable(file, shareWithProvider);
            setExe(result);
            if (result.provider?.status === "queued" && result.provider.data_id) {
                void pollExeProvider(result.provider.data_id);
            }
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        } finally {
            setBusy(false);
        }
    }

    const remoteUrl = session?.status === "ready" ? session.remoteUrl : null;

    function flushSandboxTyping(): Promise<void> {
        if (typingTimer.current) {
            clearTimeout(typingTimer.current);
            typingTimer.current = null;
        }
        if (typingPromise.current) return typingPromise.current;
        const hasText = typingBuffer.current.length > 0;
        typingBuffer.current = "";
        if (!hasText) return Promise.resolve();
        const pending = freeAction("type", { text: "*" }).finally(() => {
            typingPromise.current = null;
            typingBuffer.current = "";
        });
        typingPromise.current = pending;
        return pending;
    }

    function queueSandboxTyping(text: string) {
        typingBuffer.current += text;
        if (typingPromise.current || typingTimer.current) return;
        typingTimer.current = setTimeout(() => {
            typingTimer.current = null;
            void flushSandboxTyping();
        }, 60);
    }

    function handleSandboxKey(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key.length === 1) {
            event.preventDefault();
            queueSandboxTyping(event.key);
            return;
        }
        if (event.key === "Backspace" && typingBuffer.current) {
            event.preventDefault();
            typingBuffer.current = typingBuffer.current.slice(0, -1);
            return;
        }
        const allowed = [
            "Enter",
            "Escape",
            "Tab",
            "Backspace",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "PageUp",
            "PageDown",
        ];
        if (allowed.includes(event.key)) {
            event.preventDefault();
            void flushSandboxTyping().then(() => freeAction("key", { key: event.key }));
        }
    }

    useEffect(() => {
        if (session?.tier === "free" && session.status === "ready" && !freeBrowser) {
            cloudRequest<FreeBrowser>(`/sessions/${session.id}/browser`)
                .then(setFreeBrowser)
                .catch(() => undefined);
        }
    }, [session?.id, session?.status, session?.tier, freeBrowser]);

    useEffect(() => {
        if (!expanded) return;
        const collapse = (event: KeyboardEvent) => {
            if (event.key === "Escape") setExpanded(false);
        };
        window.addEventListener("keydown", collapse);
        return () => window.removeEventListener("keydown", collapse);
    }, [expanded]);

    useEffect(
        () => () => {
            if (typingTimer.current) clearTimeout(typingTimer.current);
            providerPollGeneration.current += 1;
        },
        [],
    );

    return (
        <PrewiseShell>
            <main
                id="main-content"
                className={`sandbox-page ${freeBrowser ? "sandbox-page-live" : ""}`}
            >
                <header className="sandbox-toolbar">
                    <div>
                        <span>ISOLATED ENVIRONMENT</span>
                        <b>
                            {view === "lab"
                                ? "Lab phân tích tự động"
                                : "Máy ảo theo gói tài khoản"}
                        </b>
                    </div>
                    <div className="sandbox-status">
                        <i />
                        {cloud
                            ? `${cloud.accountTier.toUpperCase()} · ${cloud.credits} lượt`
                            : "Phiên cô lập"}
                    </div>
                    <button
                        onClick={() => {
                            setWeb(null);
                            setExe(null);
                            setError("");
                            void refresh();
                        }}
                    >
                        <RotateCcw />Làm mới
                    </button>
                </header>

                <nav className="sandbox-subtabs">
                    <button
                        className={view === "lab" ? "active" : ""}
                        onClick={() => setView("lab")}
                    >
                        <ShieldCheck />1. Lab<small>Tự động kiểm tra</small>
                    </button>
                    <button
                        className={view === "sandbox" ? "active" : ""}
                        onClick={() => setView("sandbox")}
                    >
                        <MonitorPlay />2. Sandbox<small>Desktop tương tác</small>
                    </button>
                </nav>

                {view === "lab" ? (
                    <section className="live-sandbox-grid">
                        <article className="live-sandbox-card">
                            <Globe2 />
                            <h2>Mở website thật</h2>
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void scanUrl();
                                }}
                            >
                                <input value={url} onChange={(event) => setUrl(event.target.value)} />
                                <button disabled={busy}>Kiểm thử</button>
                            </form>
                            {web && (
                                <div className="sandbox-report">
                                    <strong>
                                        {web.canary.exfiltration_blocked
                                            ? "PHÁT HIỆN RÒ RỈ"
                                            : "HOÀN TẤT"}
                                    </strong>
                                    <p>{web.page_title || web.final_url}</p>
                                </div>
                            )}
                        </article>

                        <article className="live-sandbox-card exe-lab-card">
                            <FileWarning />
                            <h2>Test nhanh EXE</h2>
                            <p className="exe-lab-intro">
                                Phân tích cấu trúc PE và hash mà không chạy tệp. Provider bên ngoài
                                chỉ nhận mẫu khi bạn chủ động đồng ý.
                            </p>
                            <label className="exe-picker">
                                <input
                                    type="file"
                                    accept=".exe,application/vnd.microsoft.portable-executable"
                                    disabled={busy}
                                    onClick={(event) => {
                                        event.currentTarget.value = "";
                                    }}
                                    onChange={(event) => void scanExe(event.target.files?.[0])}
                                />
                                {busy ? "Đang phân tích…" : "Chọn EXE"}
                            </label>
                            <label className="exe-provider-consent">
                                <input
                                    type="checkbox"
                                    checked={shareExe}
                                    onChange={(event) => setShareExe(event.target.checked)}
                                />
                                <span>
                                    Cho phép gửi mẫu tới MetaDefender nếu hash chưa có kết quả.
                                </span>
                            </label>
                            <small className="exe-privacy-note">
                                Mặc định tắt. Không bật với file nội bộ, riêng tư hoặc chưa công bố.
                            </small>
                            {exe && (
                                <ExeQuickReport
                                    result={exe}
                                    polling={providerPolling}
                                    onShare={
                                        exeFile
                                            ? () => {
                                                  setShareExe(true);
                                                  void scanExe(exeFile, true);
                                              }
                                            : undefined
                                    }
                                    onRefresh={
                                        exe.provider?.data_id
                                            ? () =>
                                                  void refreshExeProvider(
                                                      exe.provider?.data_id as string,
                                                  )
                                            : undefined
                                    }
                                />
                            )}
                        </article>
                    </section>
                ) : (
                    <>
                        {!session && (
                            <section className="sandbox-tier-grid">
                                {cloud?.availableTiers.map((item) => (
                                    <button
                                        key={item.tier}
                                        disabled={!item.allowed}
                                        className={`${selected === item.tier ? "selected" : ""} ${
                                            !item.allowed ? "locked" : ""
                                        }`}
                                        onClick={() => setSelected(item.tier)}
                                    >
                                        <b>{item.tier.toUpperCase()}</b>
                                        <strong>
                                            {item.tier === "free"
                                                ? "Web cơ bản"
                                                : item.tier === "pro"
                                                  ? "EXE chuyên dụng"
                                                  : "Game / GPU"}
                                        </strong>
                                        <span>
                                            {item.minutes} phút ·{` `}
                                            {item.provider === "local" ? "Local" : "Cloud"}
                                        </span>
                                        <ul>
                                            <li>✓ Mở website</li>
                                            <li>{item.exe ? "✓" : "—"} Chạy EXE</li>
                                            <li>{item.gpu ? "✓" : "—"} GPU/ứng dụng nặng</li>
                                        </ul>
                                        {!item.allowed && <em>Cần nâng gói</em>}
                                    </button>
                                ))}
                            </section>
                        )}

                        <section
                            className={`interactive-sandbox ${
                                freeBrowser ? "session-live" : ""
                            } ${expanded ? "is-expanded" : ""}`}
                        >
                            <header>
                                <div>
                                    <MonitorPlay />
                                    <span>
                                        <b>
                                            {session
                                                ? `${session.tier.toUpperCase()} SANDBOX`
                                                : `SANDBOX ${selected.toUpperCase()}`}
                                        </b>
                                        <small className={freeBrowser ? "session-running" : ""}>
                                            {freeBrowser && <i />}
                                            {freeBrowser
                                                ? "Đang hoạt động"
                                                : session?.status ||
                                                  "Chọn môi trường phù hợp rồi bắt đầu"}
                                        </small>
                                    </span>
                                </div>
                                <div className="sandbox-window-actions">
                                    {freeBrowser && (
                                        <button
                                            type="button"
                                            onClick={() => setExpanded((value) => !value)}
                                            aria-label={
                                                expanded
                                                    ? "Thu gọn màn hình sandbox"
                                                    : "Phóng to màn hình sandbox"
                                            }
                                        >
                                            {expanded ? <Minimize2 /> : <Maximize2 />}
                                            {expanded ? "Thu gọn" : "Phóng to"}
                                        </button>
                                    )}
                                    {remoteUrl && (
                                        <a
                                            href={remoteUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink />Toàn màn hình
                                        </a>
                                    )}
                                </div>
                            </header>

                            {session?.tier === "free" && freeBrowser ? (
                                <div className="free-browser">
                                    <form
                                        className="sandbox-address-bar"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            void freeAction("navigate", { url: freeUrl });
                                        }}
                                    >
                                        <span className="sandbox-address-security">
                                            <ShieldCheck />HTTPS
                                        </span>
                                        <input
                                            value={freeUrl}
                                            onChange={(event) => setFreeUrl(event.target.value)}
                                            aria-label="Địa chỉ website trong sandbox"
                                        />
                                        <button disabled={busy}>Truy cập</button>
                                    </form>
                                    <div
                                        className="free-browser-screen"
                                        tabIndex={0}
                                        onKeyDown={handleSandboxKey}
                                    >
                                        {/* Data URL là ảnh chụp phiên Playwright thay đổi sau mỗi thao tác. */}
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={freeBrowser.image}
                                            alt={`Trang ${freeBrowser.title}`}
                                            onClick={(event) => {
                                                event.currentTarget.parentElement?.focus();
                                                const rect =
                                                    event.currentTarget.getBoundingClientRect();
                                                const scale = Math.min(
                                                    rect.width / 1280,
                                                    rect.height / 720,
                                                );
                                                const contentWidth = 1280 * scale;
                                                const contentHeight = 720 * scale;
                                                const offsetX = (rect.width - contentWidth) / 2;
                                                const offsetY = (rect.height - contentHeight) / 2;
                                                const x =
                                                    event.clientX - rect.left - offsetX;
                                                const y =
                                                    event.clientY - rect.top - offsetY;
                                                if (
                                                    x < 0 ||
                                                    y < 0 ||
                                                    x > contentWidth ||
                                                    y > contentHeight
                                                ) {
                                                    return;
                                                }
                                                void flushSandboxTyping().then(() =>
                                                    freeAction("click", {
                                                        x: x / scale,
                                                        y: y / scale,
                                                    }),
                                                );
                                            }}
                                        />
                                        {freeBrowser.lastEvent && (
                                            <div
                                                className={`sandbox-live-alert ${freeBrowser.lastEvent.severity}`}
                                                role="status"
                                            >
                                                {freeBrowser.lastEvent.type ===
                                                "download_blocked" ? (
                                                    <FileWarning />
                                                ) : (
                                                    <ShieldCheck />
                                                )}
                                                <span>
                                                    <b>{freeBrowser.lastEvent.title}</b>
                                                    <small>{freeBrowser.lastEvent.message}</small>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <footer className="free-browser-footer">
                                        <div className="sandbox-safety">
                                            <ShieldCheck />
                                            <span>
                                                <b>Canary đang bảo vệ dữ liệu nhập</b>
                                                <small>
                                                    {
                                                        freeBrowser.protection
                                                            .submissionsObserved
                                                    }{" "}
                                                    lượt gửi đã quan sát ·{` `}
                                                    {freeBrowser.protection.downloadsBlocked} tải
                                                    tệp bị chặn
                                                </small>
                                            </span>
                                        </div>
                                        <form
                                            className="sandbox-type-form"
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                if (!sandboxText.trim()) return;
                                                void freeAction("type", { text: "*" }).then(() =>
                                                    setSandboxText(""),
                                                );
                                            }}
                                        >
                                            <input
                                                value={sandboxText}
                                                onChange={(event) =>
                                                    setSandboxText(event.target.value)
                                                }
                                                maxLength={500}
                                                placeholder="Nhập nội dung; hệ thống sẽ thay bằng canary…"
                                            />
                                            <button
                                                type="submit"
                                                disabled={busy || !sandboxText.trim()}
                                            >
                                                Gửi
                                            </button>
                                        </form>
                                        <button
                                            className="end-session-button"
                                            type="button"
                                            disabled={busy}
                                            onClick={() => void stopSession()}
                                        >
                                            Kết thúc
                                        </button>
                                    </footer>
                                </div>
                            ) : remoteUrl ? (
                                <iframe
                                    src={remoteUrl}
                                    title="Máy ảo tương tác"
                                    allow="fullscreen"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="sandbox-unavailable">
                                    <MonitorPlay />
                                    <h2>
                                        {session?.status === "provisioning"
                                            ? "Đang tự động cấp máy…"
                                            : "Sẵn sàng tạo phiên"}
                                    </h2>
                                    <p>
                                        {selected === "free"
                                            ? "Môi trường local chỉ mở web, tối đa 10 lượt trải nghiệm mỗi ngày."
                                            : selected === "pro"
                                              ? "Windows cloud dành cho EXE; dùng một credit."
                                              : "Windows GPU cloud cho game và file nặng; dùng một credit."}
                                    </p>
                                    {!session ? (
                                        <button
                                            disabled={
                                                busy ||
                                                !cloud?.availableTiers.find(
                                                    (item) => item.tier === selected,
                                                )?.allowed
                                            }
                                            onClick={() => void startSession()}
                                        >
                                            Bắt đầu Sandbox {selected.toUpperCase()}
                                        </button>
                                    ) : (
                                        <button
                                            disabled={busy}
                                            onClick={() => void stopSession()}
                                        >
                                            Kết thúc phiên
                                        </button>
                                    )}
                                </div>
                            )}
                        </section>
                    </>
                )}

                {error && (
                    <div className="sandbox-global-error" role="alert">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => setError("")}
                            aria-label="Đóng thông báo"
                        >
                            <X />
                        </button>
                    </div>
                )}
            </main>
        </PrewiseShell>
    );
}

function ExeQuickReport({
    result,
    polling,
    onShare,
    onRefresh,
}: {
    result: ExeSandboxResult;
    polling: boolean;
    onShare?: () => void;
    onRefresh?: () => void;
}) {
    const provider = result.provider;
    const local = result.local_analysis;
    return (
        <div className={`exe-quick-report verdict-${result.verdict}`}>
            <div className="exe-report-head">
                <span>{verdictLabel(result.verdict)}</span>
                <strong>{result.risk_score}/100</strong>
            </div>
            <p className="exe-report-file">{result.filename}</p>
            <code title={result.sha256}>{result.sha256.slice(0, 24)}…</code>

            {local && (
                <div className="exe-report-metrics">
                    <span>
                        <small>PE</small>
                        <b>{local.valid ? `${local.format} · ${local.architecture}` : "Không hợp lệ"}</b>
                    </span>
                    <span>
                        <small>SECTION</small>
                        <b>{local.section_count}</b>
                    </span>
                    <span>
                        <small>CHỮ KÝ</small>
                        <b>{local.signature_present ? "Có · chưa xác minh" : "Không có"}</b>
                    </span>
                    <span>
                        <small>OVERLAY</small>
                        <b>{local.overlay_bytes.toLocaleString("vi-VN")} B</b>
                    </span>
                </div>
            )}

            <div className="exe-provider-row">
                <span>
                    <small>PROVIDER</small>
                    <b>
                        {!provider?.configured
                            ? "Chưa cấu hình · chỉ phân tích cục bộ"
                            : provider.status === "not_found"
                              ? "Hash chưa có kết quả"
                              : provider.status === "queued"
                                ? `Đang quét ${provider.progress}%`
                                : provider.status === "failed"
                                  ? "Không lấy được kết quả"
                                  : `${provider.detected_engines}/${provider.total_engines || "?"} engine phát hiện`}
                    </b>
                </span>
                {polling && <i>Đang chờ báo cáo…</i>}
            </div>

            {result.upload_consent_required && onShare && (
                <button className="exe-share-button" type="button" onClick={onShare}>
                    Đồng ý gửi mẫu để kiểm tra sâu
                </button>
            )}

            {result.issues.length > 0 && (
                <ul className="exe-issue-list">
                    {result.issues.slice(0, 6).map((issue) => (
                        <li key={issue}>{issue}</li>
                    ))}
                </ul>
            )}

            {provider?.detections && provider.detections.length > 0 && (
                <div className="exe-detections">
                    {provider.detections.slice(0, 5).map((item) => (
                        <span key={`${item.engine}-${item.threat}`}>
                            <b>{item.engine}</b>
                            <small>{item.threat}</small>
                        </span>
                    ))}
                </div>
            )}

            <small className="exe-report-disclaimer">
                Test nhanh không thực thi file. Kết quả tĩnh hoặc AV không bảo đảm file an toàn tuyệt
                đối; phân tích hành vi đầy đủ thuộc Sandbox Pro.
            </small>
        </div>
    );
}
