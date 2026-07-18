'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, CheckCircle, Clock, AlertCircle, RefreshCw, Database, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Spec {
    id: string;
    name: string;
    path: string;
    tasksTotal: number;
    tasksCompleted: number;
    tasksRemaining: number;
}

interface TaskExecutionStatus {
    specId: string;
    status: 'idle' | 'running' | 'completed' | 'error';
    currentTask?: string;
    progress: number;
    message?: string;
}

interface ModelTrainingStatus {
    status: 'idle' | 'training' | 'completed' | 'error';
    currentModel?: string;
    progress: number;
    message?: string;
    results?: {
        model: string;
        f1_score?: number;
        accuracy?: number;
    }[];
}

interface AIContextWeightSettings {
    percent: number;
    maxPercent: number;
    mode: 'shadow' | 'weighted';
}

interface URLAssessmentCacheSettings {
    enabled: boolean;
    ttlSeconds: number;
}

interface OperationalSwitchesSettings {
    threatFeedSchedulerEnabled: boolean;
    openphishEnabled: boolean;
    operationalMaintenanceSchedulerEnabled: boolean;
}

export default function AdminPage() {
    const { session } = useAuth();
    const authHeaders = useMemo<Record<string, string>>(
        (): Record<string, string> => {
            if (!session) return {};
            return { Authorization: `Bearer ${session.token}` };
        },
        [session]
    );
    const [specs, setSpecs] = useState<Spec[]>([]);
    const [taskStatus, setTaskStatus] = useState<Record<string, TaskExecutionStatus>>({});
    const [trainingStatus, setTrainingStatus] = useState<ModelTrainingStatus>({
        status: 'idle',
        progress: 0
    });
    const [loading, setLoading] = useState(true);
    const [aiWeight, setAiWeight] = useState<AIContextWeightSettings>({ percent: 0, maxPercent: 40, mode: 'shadow' });
    const [aiWeightDraft, setAiWeightDraft] = useState(0);
    const [savingAIWeight, setSavingAIWeight] = useState(false);
    const [aiWeightNotice, setAiWeightNotice] = useState('');
    const [urlCache, setUrlCache] = useState<URLAssessmentCacheSettings>({ enabled: true, ttlSeconds: 900 });
    const [savingUrlCache, setSavingUrlCache] = useState(false);
    const [purgingUrlCache, setPurgingUrlCache] = useState(false);
    const [urlCacheNotice, setUrlCacheNotice] = useState('');
    const [operations, setOperations] = useState<OperationalSwitchesSettings>({
        threatFeedSchedulerEnabled: false,
        openphishEnabled: false,
        operationalMaintenanceSchedulerEnabled: false,
    });
    const [savingOperations, setSavingOperations] = useState(false);
    const [operationsNotice, setOperationsNotice] = useState('');

    const loadSpecs = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/specs', { headers: authHeaders });
            const data = await response.json();
            setSpecs(data.specs || []);
        } catch (error) {
            console.error('Failed to load specs:', error);
        } finally {
            setLoading(false);
        }
    }, [authHeaders]);

    useEffect(() => {
        loadSpecs();
    }, [loadSpecs]);

    const loadAIWeight = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/settings/ai-context-weight', { headers: authHeaders });
            if (!response.ok) throw new Error('Không thể tải cấu hình AI');
            const data = await response.json() as AIContextWeightSettings;
            setAiWeight(data);
            setAiWeightDraft(data.percent);
        } catch (error) {
            setAiWeightNotice(error instanceof Error ? error.message : 'Không thể tải cấu hình AI');
        }
    }, [authHeaders]);

    useEffect(() => {
        loadAIWeight();
    }, [loadAIWeight]);

    const loadURLCache = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/settings/url-assessment-cache', { headers: authHeaders });
            if (!response.ok) throw new Error('Không thể tải cấu hình cache');
            setUrlCache(await response.json() as URLAssessmentCacheSettings);
        } catch (error) {
            setUrlCacheNotice(error instanceof Error ? error.message : 'Không thể tải cấu hình cache');
        }
    }, [authHeaders]);

    useEffect(() => {
        loadURLCache();
    }, [loadURLCache]);

    const loadOperations = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/settings/operations', { headers: authHeaders });
            if (!response.ok) throw new Error('Không thể tải cấu hình vận hành');
            setOperations(await response.json() as OperationalSwitchesSettings);
        } catch (error) {
            setOperationsNotice(error instanceof Error ? error.message : 'Không thể tải cấu hình vận hành');
        }
    }, [authHeaders]);

    useEffect(() => {
        loadOperations();
    }, [loadOperations]);

    const saveAIWeight = async () => {
        setSavingAIWeight(true);
        setAiWeightNotice('');
        try {
            const response = await fetch('/api/admin/settings/ai-context-weight', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ percent: aiWeightDraft }),
            });
            const data = await response.json() as AIContextWeightSettings & { detail?: string };
            if (!response.ok) throw new Error(data.detail || 'Không thể lưu cấu hình AI');
            setAiWeight(data);
            setAiWeightDraft(data.percent);
            setAiWeightNotice(data.percent === 0 ? 'AI đang ở chế độ shadow.' : `Đã áp dụng AI Context tối đa ${data.percent}% cho các lần quét mới.`);
        } catch (error) {
            setAiWeightNotice(error instanceof Error ? error.message : 'Không thể lưu cấu hình AI');
        } finally {
            setSavingAIWeight(false);
        }
    };

    const saveURLCache = async (enabled: boolean) => {
        setSavingUrlCache(true);
        setUrlCacheNotice('');
        try {
            const response = await fetch('/api/admin/settings/url-assessment-cache', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ enabled }),
            });
            const data = await response.json() as URLAssessmentCacheSettings & { detail?: string };
            if (!response.ok) throw new Error(data.detail || 'Không thể lưu cấu hình cache');
            setUrlCache(data);
            setUrlCacheNotice(data.enabled ? `Đã bật cache URL trong ${data.ttlSeconds / 60} phút.` : 'Đã tắt cache URL; mọi lần quét mới sẽ chạy lại.');
        } catch (error) {
            setUrlCacheNotice(error instanceof Error ? error.message : 'Không thể lưu cấu hình cache');
        } finally {
            setSavingUrlCache(false);
        }
    };

    const purgeURLCache = async () => {
        if (!window.confirm('Xóa toàn bộ kết quả URL đang lưu trong cache? Hành động này không xóa lịch sử quét.')) return;
        setPurgingUrlCache(true);
        setUrlCacheNotice('');
        try {
            const response = await fetch('/api/admin/settings/url-assessment-cache', {
                method: 'DELETE',
                headers: authHeaders,
            });
            const data = await response.json() as { purged?: number; detail?: string };
            if (!response.ok) throw new Error(data.detail || 'Không thể xóa cache URL');
            setUrlCacheNotice(`Đã xóa ${data.purged ?? 0} kết quả URL khỏi cache.`);
        } catch (error) {
            setUrlCacheNotice(error instanceof Error ? error.message : 'Không thể xóa cache URL');
        } finally {
            setPurgingUrlCache(false);
        }
    };

    const saveOperations = async (next: OperationalSwitchesSettings) => {
        setSavingOperations(true);
        setOperationsNotice('');
        try {
            const response = await fetch('/api/admin/settings/operations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(next),
            });
            const data = await response.json() as OperationalSwitchesSettings & { detail?: string };
            if (!response.ok) throw new Error(data.detail || 'Không thể lưu cấu hình vận hành');
            setOperations(data);
            setOperationsNotice('Đã lưu. Scheduler nhận thay đổi trong tối đa 60 giây, không cần restart server.');
        } catch (error) {
            setOperationsNotice(error instanceof Error ? error.message : 'Không thể lưu cấu hình vận hành');
        } finally {
            setSavingOperations(false);
        }
    };

    const pollTaskStatus = async (specId: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/admin/specs/${specId}/status`, { headers: authHeaders });
                const data = await response.json();

                setTaskStatus(prev => ({
                    ...prev,
                    [specId]: data
                }));

                if (data.status === 'completed' || data.status === 'error') {
                    clearInterval(interval);
                    loadSpecs(); // Refresh spec list
                }
            } catch (error) {
                clearInterval(interval);
            }
        }, 2000);
    };

    const trainModels = async () => {
        setTrainingStatus({
            status: 'training',
            progress: 0,
            message: 'Initializing model training...'
        });

        try {
            const response = await fetch('/api/admin/models/train', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({
                    dataPath: 'data/demo_text_training.csv',
                    models: ['text']
                })
            });

            if (!response.ok) throw new Error('Training failed');

            // Poll for training status
            pollTrainingStatus();
        } catch (error) {
            setTrainingStatus({
                status: 'error',
                progress: 0,
                message: error instanceof Error ? error.message : 'Training failed'
            });
        }
    };

    const pollTrainingStatus = async () => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch('/api/admin/models/train/status', { headers: authHeaders });
                const data = await response.json();

                setTrainingStatus(data);

                if (data.status === 'completed' || data.status === 'error') {
                    clearInterval(interval);
                }
            } catch (error) {
                clearInterval(interval);
            }
        }, 3000);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'running':
            case 'training':
                return <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />;
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-400" />;
            default:
                return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
                    <p className="text-lg text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            {/* Header */}
            <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4">
                    <h1 className="text-2xl font-bold text-white sm:text-3xl">
                        Trung tâm vận hành AI Security Armor
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Quản lý tác vụ kỹ thuật và huấn luyện mô hình
                    </p>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                <section className="mb-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                            <SlidersHorizontal className="w-8 h-8 text-cyan-400" />
                            <div>
                                <h2 className="text-2xl font-bold">AI Context Weight</h2>
                                <p className="text-sm text-slate-400 mt-1">Risk Core luôn giữ tối thiểu 60%. AI chỉ được tính khi adapter hoàn tất và có độ tin cậy.</p>
                            </div>
                        </div>
                        <div className="rounded-lg bg-slate-900 px-4 py-3 text-right">
                            <b className="text-3xl text-cyan-300">{aiWeightDraft}%</b>
                            <p className="text-xs text-slate-400">AI · Risk Core {100 - aiWeightDraft}%</p>
                        </div>
                    </div>
                    <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-200">Tỷ trọng AI trong điểm URL</span>
                            <input
                                className="w-full accent-cyan-400"
                                type="range"
                                min="0"
                                max={aiWeight.maxPercent}
                                step="1"
                                value={aiWeightDraft}
                                onChange={(event) => setAiWeightDraft(Number(event.target.value))}
                                aria-label="Tỷ trọng AI Context"
                            />
                            <div className="mt-1 flex justify-between text-xs text-slate-500"><span>0% · Shadow</span><span>40% · Giới hạn tối đa</span></div>
                        </label>
                        <button
                            onClick={saveAIWeight}
                            disabled={savingAIWeight || aiWeightDraft === aiWeight.percent}
                            className="px-5 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                        >
                            {savingAIWeight ? 'Đang lưu...' : 'Lưu tỷ trọng'}
                        </button>
                    </div>
                    <p className="mt-4 text-sm text-slate-400">Trạng thái: <b className={aiWeight.mode === 'weighted' ? 'text-cyan-300' : 'text-yellow-300'}>{aiWeight.mode === 'weighted' ? 'Weighted active' : 'Shadow'}</b>. Điểm kỹ thuật từ Risk Core ≥60 không bị AI làm giảm xuống dưới ngưỡng chặn.</p>
                    {aiWeightNotice && <p className="mt-3 text-sm text-slate-300" role="status">{aiWeightNotice}</p>}
                </section>

                <section className="mb-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <Database className="w-8 h-8 text-emerald-400" />
                            <div>
                                <h2 className="text-2xl font-bold">URL Result Cache</h2>
                                <p className="text-sm text-slate-400 mt-1">Trả kết quả đã lưu cho cùng URL và cùng cấu hình quét trong tối đa {urlCache.ttlSeconds / 60} phút.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={urlCache.enabled}
                            onClick={() => saveURLCache(!urlCache.enabled)}
                            disabled={savingUrlCache}
                            className={`relative h-10 w-20 rounded-full transition-colors disabled:cursor-not-allowed ${urlCache.enabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                        >
                            <span className={`absolute top-1 h-8 w-8 rounded-full bg-white transition-transform ${urlCache.enabled ? 'translate-x-10' : 'translate-x-1'}`} />
                            <span className="sr-only">Bật hoặc tắt cache URL</span>
                        </button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-400">{urlCache.enabled ? 'Đang bật: URL quick scan trùng khớp trả ngay từ database và không trừ lượt quét.' : 'Đang tắt: không đọc hoặc ghi cache; các bản ghi cũ vẫn được giữ tới khi hết hạn.'}</p><button type="button" onClick={() => void purgeURLCache()} disabled={purgingUrlCache} className="rounded-lg border border-rose-500/60 px-4 py-2 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60">{purgingUrlCache ? 'Đang xóa...' : 'Xóa cache URL'}</button></div>
                    {urlCacheNotice && <p className="mt-3 text-sm text-slate-300" role="status">{urlCacheNotice}</p>}
                </section>

                <section className="mb-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <RefreshCw className="w-8 h-8 text-amber-300" />
                        <div>
                            <h2 className="text-2xl font-bold">Threat Feed &amp; Maintenance</h2>
                            <p className="text-sm text-slate-400 mt-1">Bật/tắt tác vụ nền trực tiếp từ Admin. Các thay đổi được lưu trong database.</p>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {[
                            ['threatFeedSchedulerEnabled', 'Tự cập nhật threat-feed', 'Chạy lịch đồng bộ nguồn URL độc hại.'],
                            ['openphishEnabled', 'Dùng OpenPhish', 'Cho phép nguồn OpenPhish tham gia lần đồng bộ tiếp theo.'],
                            ['operationalMaintenanceSchedulerEnabled', 'Tự dọn dữ liệu hết hạn', 'Dọn cache và lịch sử quét theo retention policy.'],
                        ].map(([key, title, description]) => {
                            const settingKey = key as keyof OperationalSwitchesSettings;
                            const enabled = operations[settingKey];
                            return <button
                                key={settingKey}
                                type="button"
                                role="switch"
                                aria-checked={enabled}
                                disabled={savingOperations}
                                onClick={() => void saveOperations({ ...operations, [settingKey]: !enabled })}
                                className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'}`}
                            >
                                <span className={`mb-3 inline-block rounded-full px-2 py-1 text-xs font-semibold ${enabled ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-700 text-slate-300'}`}>{enabled ? 'Đang bật' : 'Đang tắt'}</span>
                                <b className="block text-sm">{title}</b>
                                <span className="mt-1 block text-xs text-slate-400">{description}</span>
                            </button>;
                        })}
                    </div>
                    {operationsNotice && <p className="mt-4 text-sm text-slate-300" role="status">{operationsNotice}</p>}
                </section>

                {/* Model Training Section */}
                <section className="mb-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <Database className="w-8 h-8 text-purple-400" />
                            <div>
                                <h2 className="text-2xl font-bold">Model Training</h2>
                                <p className="text-sm text-slate-400">
                                    Retrain text model using data/demo_text_training.csv
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={trainModels}
                            disabled={trainingStatus.status === 'training'}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors font-semibold"
                        >
                            {trainingStatus.status === 'training' ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Training...
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5" />
                                    Train All Models
                                </>
                            )}
                        </button>
                    </div>

                    {trainingStatus.status !== 'idle' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                {getStatusIcon(trainingStatus.status)}
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm font-medium">
                                            {trainingStatus.currentModel || 'Preparing...'}
                                        </span>
                                        <span className="text-sm text-slate-400">
                                            {trainingStatus.progress}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div
                                            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${trainingStatus.progress}%` }}
                                        />
                                    </div>
                                    {trainingStatus.message && (
                                        <p className="text-xs text-slate-400 mt-2">
                                            {trainingStatus.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {trainingStatus.results && trainingStatus.results.length > 0 && (
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {trainingStatus.results.map((result) => (
                                        <div
                                            key={result.model}
                                            className="bg-slate-700/50 rounded-lg p-4"
                                        >
                                            <h3 className="font-semibold mb-2">{result.model}</h3>
                                            {result.f1_score && (
                                                <p className="text-sm text-slate-300">
                                                    F1 Score: <span className="text-green-400 font-bold">
                                                        {(result.f1_score * 100).toFixed(2)}%
                                                    </span>
                                                </p>
                                            )}
                                            {result.accuracy && (
                                                <p className="text-sm text-slate-300">
                                                    Accuracy: <span className="text-blue-400 font-bold">
                                                        {(result.accuracy * 100).toFixed(2)}%
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Spec Execution Section */}
                <section>
                    <h2 className="text-2xl font-bold mb-6">Spec Task Execution</h2>
                    {specs.length === 0 ? (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                            <p className="text-slate-400">No specs found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {specs.map((spec) => {
                                const status = taskStatus[spec.id];
                                const progressPercent = spec.tasksTotal > 0
                                    ? (spec.tasksCompleted / spec.tasksTotal) * 100
                                    : 0;

                                return (
                                    <div
                                        key={spec.id}
                                        className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold mb-2">{spec.name}</h3>
                                                <p className="text-sm text-slate-400 mb-3">{spec.path}</p>
                                                <div className="flex gap-6 text-sm">
                                                    <span className="text-slate-300">
                                                        Total: <span className="font-semibold">{spec.tasksTotal}</span>
                                                    </span>
                                                    <span className="text-green-400">
                                                        Completed: <span className="font-semibold">{spec.tasksCompleted}</span>
                                                    </span>
                                                    <span className="text-yellow-400">
                                                        Remaining: <span className="font-semibold">{spec.tasksRemaining}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mb-4">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm font-medium">Overall Progress</span>
                                                <span className="text-sm text-slate-400">
                                                    {progressPercent.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-700 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Execution Status */}
                                        {status && status.status !== 'idle' && (
                                            <div className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg">
                                                {getStatusIcon(status.status)}
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">
                                                        {status.currentTask || 'Processing...'}
                                                    </p>
                                                    {status.message && (
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            {status.message}
                                                        </p>
                                                    )}
                                                </div>
                                                {status.status === 'running' && (
                                                    <div className="text-right">
                                                        <p className="text-sm text-slate-400">
                                                            {status.progress}%
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
