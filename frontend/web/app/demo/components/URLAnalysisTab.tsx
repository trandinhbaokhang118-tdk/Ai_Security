'use client';

import { useState } from 'react';
import { Search, Shield, AlertTriangle, Loader2 } from 'lucide-react';

interface URLAnalysisTabProps {
    sessionId: string;
    protectionEnabled: boolean;
}

interface AnalysisResult {
    url: string;
    risk_score: number;
    threat_level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
    analysis_time_ms: number;
    traditional_detection: {
        detected: boolean;
        methods: string[];
    };
    ai_detection: {
        detected: boolean;
        confidence: number;
        model_version: string;
    };
    evidence: Array<{
        source: string;
        message: string;
        severity: string;
        feature: string;
        contribution: number;
    }>;
    sandbox_report?: {
        behaviors: any[];
        redirects: any[];
        scripts_executed: string[];
        network_calls: string[];
        error?: string;
    };
}

export default function URLAnalysisTab({ sessionId, protectionEnabled }: URLAnalysisTabProps) {
    const [url, setUrl] = useState('');
    const [deepAnalysis, setDeepAnalysis] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const analyzeURL = async () => {
        if (!url.trim()) {
            setError('Please enter a URL');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/demo/url/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url.trim(),
                    deep_analysis: deepAnalysis,
                    session_id: sessionId,
                    protection_enabled: protectionEnabled
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Analysis failed');
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analysis failed');
        } finally {
            setLoading(false);
        }
    };

    const getThreatLevelColor = (level: string) => {
        switch (level) {
            case 'safe': return 'text-green-400 bg-green-900/30 border-green-500';
            case 'low': return 'text-blue-400 bg-blue-900/30 border-blue-500';
            case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500';
            case 'high': return 'text-orange-400 bg-orange-900/30 border-orange-500';
            case 'critical': return 'text-red-400 bg-red-900/30 border-red-500';
            default: return 'text-slate-400 bg-slate-800 border-slate-700';
        }
    };

    const exampleURLs = [
        { label: 'Typosquatting', url: 'http://paypa1.com/verify' },
        { label: 'Deceptive Subdomain', url: 'https://secure-account.apple.com-verify.xyz/login' },
        { label: 'Homoglyph Attack', url: 'https://www.аmazon.com/ap/signin' },
        { label: 'Legitimate', url: 'https://www.paypal.com/signin' }
    ];

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Analyze URL for Phishing</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">URL to Analyze</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && analyzeURL()}
                                placeholder="https://example.com"
                                className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                                disabled={loading}
                            />
                            <button
                                onClick={analyzeURL}
                                disabled={loading || !url.trim()}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors font-semibold"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-5 h-5" />
                                        Analyze
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="deepAnalysis"
                            checked={deepAnalysis}
                            onChange={(e) => setDeepAnalysis(e.target.checked)}
                            disabled={loading}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="deepAnalysis" className="text-sm text-slate-300">
                            Enable Deep Analysis (Sandbox - slower but more thorough)
                        </label>
                    </div>

                    {/* Example URLs */}
                    <div>
                        <p className="text-sm text-slate-400 mb-2">Try example:</p>
                        <div className="flex flex-wrap gap-2">
                            {exampleURLs.map((example) => (
                                <button
                                    key={example.url}
                                    onClick={() => setUrl(example.url)}
                                    disabled={loading}
                                    className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 transition-colors"
                                >
                                    {example.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-900/30 border border-red-500 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <p className="text-red-400">{error}</p>
                    </div>
                </div>
            )}

            {/* Results Display */}
            {result && (
                <div className="space-y-4">
                    {/* Threat Level Card */}
                    <div className={`p-6 rounded-xl border-2 ${getThreatLevelColor(result.threat_level)}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-2xl font-bold uppercase">{result.threat_level}</h3>
                                <p className="text-sm opacity-75">Threat Level</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold">{(result.risk_score * 100).toFixed(1)}%</p>
                                <p className="text-sm opacity-75">Risk Score</p>
                            </div>
                        </div>
                        <p className="text-sm opacity-75">Analysis time: {result.analysis_time_ms}ms</p>
                    </div>

                    {/* Detection Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Traditional Detection */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <h4 className="font-bold mb-3 flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Traditional Detection
                            </h4>
                            <div className="space-y-2">
                                <p className={`text-lg font-semibold ${result.traditional_detection.detected ? 'text-red-400' : 'text-green-400'}`}>
                                    {result.traditional_detection.detected ? '⚠️ Detected' : '✓ Not Detected'}
                                </p>
                                {result.traditional_detection.methods.length > 0 ? (
                                    <ul className="text-sm text-slate-400 space-y-1">
                                        {result.traditional_detection.methods.map((method, idx) => (
                                            <li key={idx}>• {method}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-slate-400">No traditional methods detected this threat</p>
                                )}
                            </div>
                        </div>

                        {/* AI Detection */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <h4 className="font-bold mb-3 flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                AI Detection
                            </h4>
                            <div className="space-y-2">
                                <p className={`text-lg font-semibold ${result.ai_detection.detected ? 'text-red-400' : 'text-green-400'}`}>
                                    {result.ai_detection.detected ? '⚠️ Detected' : '✓ Not Detected'}
                                </p>
                                <p className="text-sm text-slate-400">
                                    Confidence: <span className="font-semibold">{(result.ai_detection.confidence * 100).toFixed(1)}%</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                    Model: {result.ai_detection.model_version}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Evidence */}
                    {result.evidence.length > 0 && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <h4 className="font-bold mb-4">Evidence ({result.evidence.length})</h4>
                            <div className="space-y-2">
                                {result.evidence.slice(0, 5).map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
                                        <span className={`
                                            px-2 py-1 text-xs rounded font-semibold
                                            ${item.severity === 'critical' ? 'bg-red-900 text-red-300' : ''}
                                            ${item.severity === 'high' ? 'bg-orange-900 text-orange-300' : ''}
                                            ${item.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' : ''}
                                            ${item.severity === 'low' ? 'bg-blue-900 text-blue-300' : ''}
                                            ${item.severity === 'info' ? 'bg-slate-700 text-slate-300' : ''}
                                        `}>
                                            {item.severity}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{item.message}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Source: {item.source} | Feature: {item.feature}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sandbox Report */}
                    {result.sandbox_report && !result.sandbox_report.error && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <h4 className="font-bold mb-4">Sandbox Analysis</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {result.sandbox_report.behaviors.length > 0 && (
                                    <div>
                                        <h5 className="text-sm font-semibold mb-2">Suspicious Behaviors</h5>
                                        <ul className="text-sm text-slate-400 space-y-1">
                                            {result.sandbox_report.behaviors.map((behavior, idx) => (
                                                <li key={idx}>⚠️ {behavior.type} ({behavior.count})</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {result.sandbox_report.scripts_executed.length > 0 && (
                                    <div>
                                        <h5 className="text-sm font-semibold mb-2">Scripts Loaded ({result.sandbox_report.scripts_executed.length})</h5>
                                        <ul className="text-xs text-slate-400 space-y-1 max-h-32 overflow-y-auto">
                                            {result.sandbox_report.scripts_executed.slice(0, 5).map((script, idx) => (
                                                <li key={idx} className="truncate">• {script}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
