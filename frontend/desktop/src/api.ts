export type RiskLevel = 'safe' | 'warn' | 'danger';
export interface Evidence { source: string; message: string; severity: string; feature?: string; contribution?: number }
export interface Assessment { score: number; riskLevel: RiskLevel; confidence: number; reasons: string[]; evidence: Evidence[]; explanation?: string; requestId: string; latencyMs?: number }
export interface MailItem { id: string; sender: string; email: string; subject: string; preview: string; content: string; score?: number; result?: Assessment }
export interface UserSession { token: string; user: { id: string; email: string; displayName: string; role?: string }; plan: { tier: string; label: string; dailyScanLimit: number } }
export interface UserProfile { id: string; email: string; displayName: string; avatarUrl?: string | null; role: string }
export interface AdminOverview { metrics:{usersTotal:number;activeUsers:number;scansTotal:number;dangerousScans:number;averageLatencyMs:number}; recentScans:{id:string;createdAt:string;modality:string;riskLevel:RiskLevel;score:number;target:string}[]; recentJobs:{id:string;type:string;status:string;progress:number;message?:string;createdAt:string}[]; models:{id:string;name:string;modality:string;status:string;f1?:number;accuracy?:number;createdAt:string}[] }
export interface AdminUser { id:string; displayName:string; email:string; role:string; status:string; createdAt:string; lastLoginAt?:string }

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
let sessionToken = '';
export const setSessionToken = (token: string | null) => { sessionToken = token || ''; };
const level = (score: number): RiskLevel => score >= 70 ? 'danger' : score >= 40 ? 'warn' : 'safe';

const normalize = (raw: Record<string, unknown>): Assessment => {
  const numeric = Number(raw.risk_score ?? raw.score ?? 0);
  const score = Math.max(0, Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)));
  return { score, riskLevel: level(score), confidence: Number(raw.confidence ?? .85), reasons: Array.isArray(raw.reasons) ? raw.reasons as string[] : [], evidence: Array.isArray(raw.evidence) ? raw.evidence as Evidence[] : [], explanation: raw.explanation as string | undefined, requestId: raw.request_id as string || crypto.randomUUID(), latencyMs: raw.latency_ms as number | undefined };
};

async function request<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `Máy chủ phản hồi ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const login = (email: string, password: string) => request<UserSession>('/v1/auth/login', { email, password });
export const register = (displayName: string, email: string, password: string) => request<UserSession>('/v1/auth/register', { displayName, email, password });
export const logout = () => request<{ ok: boolean }>('/v1/auth/logout');
export const getProfile = () => request<UserProfile>('/v1/account/profile', undefined, 'GET');
export const assessUrl = async (url: string): Promise<Assessment> => normalize(await request<Record<string, unknown>>('/v1/assess/url', { url, context: 'desktop_browser_cover' }));
export const assessEmail = async (text: string): Promise<Assessment> => normalize(await request<Record<string, unknown>>('/v1/assess/text', { text, modality: 'email', metadata: { source: 'desktop_email_guard', locale: 'vi' } }));
export const getAdminOverview = () => request<AdminOverview>('/admin/overview', undefined, 'GET');
export const getAdminUsers = () => request<{users:AdminUser[]}>('/admin/users', undefined, 'GET');
export const setAdminUserStatus = (id:string, status:'active'|'suspended') => request<{id:string;status:string}>(`/admin/users/${id}/status`, {status}, 'PATCH');
export function askContext(question: string, context: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const endpoint = API_BASE.replace(/^http/, 'ws') + '/v1/chat';
    const socket = new WebSocket(endpoint);
    let answer = '';
    socket.onopen = () => socket.send(JSON.stringify({ question, context: { content: context, modality: context.startsWith('http') ? 'url' : 'email' } }));
    socket.onmessage = ({ data }) => {
      const event = JSON.parse(data as string) as { type: string; delta?: string; error?: string };
      if (event.type === 'delta') answer += event.delta || '';
      if (event.type === 'final') { socket.close(); resolve(answer || 'Chưa có giải thích cho kết quả này.'); }
      if (event.type === 'error') { socket.close(); reject(new Error(event.error || 'Không thể hỏi Core AI.')); }
    };
    socket.onerror = () => reject(new Error('Không thể kết nối Core AI.'));
  });
}
