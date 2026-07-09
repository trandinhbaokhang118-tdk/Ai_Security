'use client';

import { useState, useEffect } from 'react';
import { Play, CheckCircle, Clock, AlertCircle, RefreshCw, Database } from 'lucide-react';

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

export default function AdminPage() {
    const [specs, setSpecs] = useState<Spec[]>([]);
    const [taskStatus, setTaskStatus] = useState<Record<string, TaskExecutionStatus>>({});
    const [trainingStatus, setTrainingStatus] = useState<ModelTrainingStatus>({
        status: 'idle',
        progress: 0
    });
    const [loading, setLoading] = useState(true);

    // Load specs on mount
    useEffect(() => {
        loadSpecs();
    }, []);

    const loadSpecs = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/specs');
            const data = await response.json();
            setSpecs(data.specs || []);
        } catch (error) {
            console.error('Failed to load specs:', error);
        } finally {
            setLoading(false);
        }
    };

    const pollTaskStatus = async (specId: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/admin/specs/${specId}/status`);
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dataPath: 'data/phishing_text_validation.csv',
                    models: ['text', 'prompt', 'url']
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
                const response = await fetch('/api/admin/models/train/status');
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
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Admin Panel - Task & Model Management
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Execute spec tasks and retrain AI models
                    </p>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                {/* Model Training Section */}
                <section className="mb-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Database className="w-8 h-8 text-purple-400" />
                            <div>
                                <h2 className="text-2xl font-bold">Model Training</h2>
                                <p className="text-sm text-slate-400">
                                    Retrain models using data/phishing_text_validation.csv
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
