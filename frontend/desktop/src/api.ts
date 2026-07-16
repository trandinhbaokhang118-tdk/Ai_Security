export type RiskLevel = 'safe' | 'warn' | 'danger';
export interface Evidence { source: string; message: string; severity: string; feature?: string; contribution?: number }
export interface Assessment { score: number; riskLevel: RiskLevel; confidence: number; reasons: string[]; evidence: Evidence[]; explanation?: string; requestId: string; latencyMs?: number }
export interface MailItem { id: string; sender: string; email: string; subject: string; preview: string; content: string; score?: number; result?: Assessment }

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const DEMO_FALLBACK = import.meta.env.VITE_DEMO_FALLBACK !== 'false';

const level = (score: number): RiskLevel => score >= 70 ? 'danger' : score >= 40 ? 'warn' : 'safe';
const normalize = (raw: any): Assessment => {
  const numeric = raw.risk_score ?? raw.score ?? 0;
  const score = Math.max(0, Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)));
  return { score, riskLevel: level(score), confidence: raw.confidence ?? .85, reasons: raw.reasons ?? [], evidence: raw.evidence ?? [], explanation: raw.explanation, requestId: raw.request_id ?? crypto.randomUUID(), latencyMs: raw.latency_ms };
};
async function request(path: string, body: unknown) {
  const response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Máy chủ phản hồi ${response.status}`);
  return response.json();
}
function mockAssessment(input: string, isUrl: boolean): Assessment {
  const suspicious = /(vietc0m|secure-login|verify|urgent|khóa|mật khẩu|password|wallet|\.xyz|bit\.ly)/i.test(input);
  const score = suspicious ? (isUrl ? 94 : 87) : (isUrl ? 12 : 18);
  const reasons = suspicious ? (isUrl ? ['Tên miền có dấu hiệu giả mạo thương hiệu', 'Đường dẫn thúc giục đăng nhập hoặc xác minh', 'Tên miền/HTTPS cần được kiểm chứng'] : ['Ngôn ngữ hối thúc và đe dọa', 'Người gửi không khớp thương hiệu', 'Có liên kết cần kiểm tra độc lập']) : ['Không phát hiện mẫu lừa đảo nổi bật', 'Cấu trúc và ngữ cảnh có độ tin cậy tốt'];
  return { score, riskLevel: level(score), confidence: suspicious ? .94 : .89, reasons, evidence: reasons.map((message, i) => ({ source: isUrl ? 'url_adapter' : 'text_adapter', message, severity: suspicious ? (i ? 'high' : 'critical') : 'low', contribution: suspicious ? .38 - i * .1 : -.18 - i * .08 })), explanation: suspicious ? 'Nội dung có nhiều tín hiệu thường gặp trong chiến dịch phishing. Không truy cập hoặc cung cấp thông tin trước khi xác minh.' : 'Chưa thấy tín hiệu nguy hiểm đáng kể. Kết quả AI chỉ mang tính hỗ trợ, hãy tiếp tục thận trọng.', requestId: `demo-${Date.now()}`, latencyMs: 64 };
}
async function withFallback(action: () => Promise<any>, fallback: Assessment): Promise<Assessment> { try { return normalize(await action()); } catch (error) { if (!DEMO_FALLBACK) throw error; return fallback; } }
export const assessUrl = (url: string) => withFallback(() => request('/v1/assess/url', { url, context: 'desktop_browser_cover' }), mockAssessment(url, true));
export const assessEmail = (text: string) => withFallback(() => request('/v1/assess/text', { text, modality: 'email', metadata: { source: 'desktop_email_guard', locale: 'vi' } }), mockAssessment(text, false));
export async function askContext(question: string, context: string): Promise<string> {
  try { const data = await request('/v1/chat/message', { question, context: { content: context, modality: context.startsWith('http') ? 'url' : 'email' }, history: [] }); return data.answer ?? data.message ?? 'Đã nhận câu hỏi.'; }
  catch { return `Dựa trên kết quả hiện tại: ${question.toLowerCase().includes('vì sao') ? 'điểm được tạo từ tổng hợp tín hiệu URL/nội dung và bằng chứng đóng góp, không chỉ từ một đặc trưng.' : 'hãy ưu tiên bằng chứng có mức đóng góp cao, xác minh nguồn qua kênh chính thức và không mở liên kết đáng ngờ.'}`; }
}
