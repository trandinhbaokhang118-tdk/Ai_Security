'use client';

import { useState } from 'react';
import { useDemoSession } from './hooks/useDemoSession';
import { useMetrics } from './hooks/useMetrics';
import MetricsDashboard from './components/MetricsDashboard';
import ProtectionToggle from './components/ProtectionToggle';
import URLAnalysisTab from './components/URLAnalysisTab';
import ChatbotProtectionTab from './components/ChatbotProtectionTab';

export default function DemoPage() {
    const { sessionId, resetSession } = useDemoSession();
    const { metrics, isLoading } = useMetrics(sessionId);
    const [protectionEnabled, setProtectionEnabled] = useState(false);
    const [activeTab, setActiveTab] = useState<'url' | 'chatbot'>('url');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            {/* Header */}
            <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                AI Security Armor Demo
                            </h1>
                            <p className="text-sm text-slate-400 mt-1">
                                Interactive threat detection demonstration
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <ProtectionToggle
                                enabled={protectionEnabled}
                                onChange={setProtectionEnabled}
                            />
                            <button
                                onClick={resetSession}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                            >
                                Reset Demo
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-8">
                {/* Metrics Dashboard */}
                <section className="mb-8">
                    <MetricsDashboard
                        metrics={metrics}
                        protectionEnabled={protectionEnabled}
                        isLoading={isLoading}
                    />
                </section>

                {/* Scenario Tabs */}
                <section className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                    {/* Tab Headers */}
                    <div className="flex border-b border-slate-700">
                        <button
                            onClick={() => setActiveTab('url')}
                            className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'url'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            🔗 URL Analysis
                        </button>
                        <button
                            onClick={() => setActiveTab('chatbot')}
                            className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'chatbot'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            💬 Chatbot Protection
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'url' && (
                            <URLAnalysisTab
                                sessionId={sessionId}
                                protectionEnabled={protectionEnabled}
                            />
                        )}
                        {activeTab === 'chatbot' && (
                            <ChatbotProtectionTab
                                sessionId={sessionId}
                                protectionEnabled={protectionEnabled}
                            />
                        )}
                    </div>
                </section>

                {/* Session Info */}
                <div className="mt-8 text-center text-sm text-slate-500">
                    <p>Session ID: <code className="bg-slate-800 px-2 py-1 rounded">{sessionId}</code></p>
                </div>
            </main>
        </div>
    );
}
