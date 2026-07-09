'use client';

import { Shield, AlertTriangle, TrendingUp } from 'lucide-react';
import { MetricsResponse } from '../types';

interface Props {
    metrics: MetricsResponse | null;
    protectionEnabled: boolean;
    isLoading: boolean;
}

export default function MetricsDashboard({ metrics, protectionEnabled, isLoading }: Props) {
    if (isLoading || !metrics) {
        return (
            <div className="animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    const currentMetrics = protectionEnabled ? metrics.protection_on : metrics.protection_off;
    const improvement = metrics.improvement_percentage;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Status Card */}
            <div className={`p-6 rounded-xl border-2 transition-all ${protectionEnabled
                    ? 'bg-green-900/30 border-green-500 shadow-lg shadow-green-500/20'
                    : 'bg-red-900/30 border-red-500 shadow-lg shadow-red-500/20'
                }`}>
                <div className="flex items-center gap-3">
                    {protectionEnabled ? (
                        <Shield className="w-10 h-10 text-green-400" />
                    ) : (
                        <AlertTriangle className="w-10 h-10 text-red-400" />
                    )}
                    <div>
                        <p className="text-sm text-slate-400">Status</p>
                        <p className="text-2xl font-bold">
                            {protectionEnabled ? 'PROTECTED' : 'VULNERABLE'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Success Rate Card */}
            <div className="p-6 rounded-xl bg-slate-800 border border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Attack Success Rate</p>
                <p className={`text-4xl font-bold mb-1 ${currentMetrics.success_rate > 50 ? 'text-red-400' :
                        currentMetrics.success_rate > 20 ? 'text-yellow-400' :
                            'text-green-400'
                    }`}>
                    {currentMetrics.success_rate.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500">
                    {currentMetrics.success_count} / {currentMetrics.attack_count} succeeded
                </p>
            </div>

            {/* Blocked Attacks Card */}
            <div className="p-6 rounded-xl bg-slate-800 border border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Attacks Blocked</p>
                <p className="text-4xl font-bold text-green-400 mb-1">
                    {currentMetrics.blocked_count}
                </p>
                <p className="text-xs text-slate-500">
                    {currentMetrics.block_rate.toFixed(1)}% block rate
                </p>
            </div>

            {/* Improvement Card */}
            {improvement > 0 && (
                <div className="p-6 rounded-xl bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-2 border-green-500 shadow-lg shadow-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-6 h-6 text-green-400" />
                        <p className="text-sm text-slate-300">Security Improvement</p>
                    </div>
                    <p className="text-5xl font-bold text-green-400 mb-1">
                        +{improvement.toFixed(0)}%
                    </p>
                    <p className="text-xs text-slate-400">
                        With protection enabled
                    </p>
                </div>
            )}
        </div>
    );
}
