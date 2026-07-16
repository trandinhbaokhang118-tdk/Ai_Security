"use client";

import { useState } from "react";
import { Bot, Fingerprint, RotateCcw } from "lucide-react";

import ChatbotProtectionTab from "./components/ChatbotProtectionTab";
import URLAnalysisTab from "./components/URLAnalysisTab";
import { useDemoSession } from "./hooks/useDemoSession";

type DemoTopic = "fraud" | "ai-security";

export default function DemoPage() {
    const { sessionId, resetSession } = useDemoSession();
    const [activeTopic, setActiveTopic] = useState<DemoTopic>("fraud");

    return (
        <div className="min-h-screen bg-zinc-100 text-zinc-950">
            <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
                <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase text-teal-700">Demo ban giám khảo</p>
                        <h1 className="mt-1 text-2xl font-bold">So sánh trước / sau khi bật lớp bảo vệ AI</h1>
                    </div>
                    <button
                        type="button"
                        onClick={resetSession}
                        className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                        <RotateCcw className="h-4 w-4" /> Phiên mới
                    </button>
                    <p className="basis-full max-w-3xl text-sm leading-6 text-zinc-600">
                        Mỗi đề tài dùng cùng một đầu vào cho hai nhánh. Cột “Trước” cho thấy hậu quả khi không có lớp bảo vệ;
                        cột “Sau” hiển thị quyết định và bằng chứng từ engine đang chạy thật.
                    </p>
                </section>

                <nav className="mb-6 grid gap-3 md:grid-cols-2" aria-label="Chọn đề tài demo">
                    <TopicButton
                        active={activeTopic === "fraud"}
                        onClick={() => setActiveTopic("fraud")}
                        number="01"
                        icon={<Fingerprint className="h-5 w-5" />}
                        title="Deepfake & Phishing Detection"
                        description="Phát hiện giả mạo thương hiệu, URL và nội dung lừa đảo"
                    />
                    <TopicButton
                        active={activeTopic === "ai-security"}
                        onClick={() => setActiveTopic("ai-security")}
                        number="02"
                        icon={<Bot className="h-5 w-5" />}
                        title="AI Security & Robustness"
                        description="Prompt injection và đầu độc dữ liệu huấn luyện"
                    />
                </nav>

                <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
                    {activeTopic === "fraud" ? (
                        <URLAnalysisTab />
                    ) : (
                        <ChatbotProtectionTab sessionId={sessionId} />
                    )}
                </div>

                <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                    <span>Demo sandbox · Không dùng bí mật hoặc hành động mạng thật</span>
                    <span className="font-mono">Session {sessionId.slice(0, 8)}</span>
                </footer>
            </main>
        </div>
    );
}

function TopicButton({
    active,
    onClick,
    number,
    icon,
    title,
    description,
}: {
    active: boolean;
    onClick: () => void;
    number: string;
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-start gap-4 rounded-lg border p-4 text-left transition-colors ${
                active
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400"
            }`}
        >
            <span className={`text-xs font-bold ${active ? "text-teal-300" : "text-zinc-400"}`}>{number}</span>
            <span className={`mt-0.5 ${active ? "text-teal-300" : "text-teal-700"}`}>{icon}</span>
            <span>
                <span className="block font-bold">{title}</span>
                <span className={`mt-1 block text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}>{description}</span>
            </span>
        </button>
    );
}
