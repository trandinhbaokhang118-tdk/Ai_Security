export type RiskLevel = 'safe' | 'warn' | 'danger';
export interface Evidence { source: string; message: string; severity: string; feature?: string; contribution?: number }
export interface Assessment { score: number; riskLevel: RiskLevel; confidence: number; reasons: string[]; evidence: Evidence[]; explanation?: string; requestId: string; latencyMs?: number }
export interface MailItem { id: string; sender: string; email: string; subject: string; preview: string; content: string; date?: string; labelIds?: string[]; attachments?: {filename:string;contentType:string;size:number}[]; linksRemoved?: number; source?: 'gmail'|'file'; score?: number; result?: Assessment }
export interface UserSession { token: string; user: { id: string; email: string; displayName: string; role?: string }; plan: { tier: string; label: string; dailyScanLimit: number } }
export interface UserProfile { id: string; email: string; displayName: string; avatarUrl?: string | null; role: string }
export interface AdminOverview { metrics:{usersTotal:number;activeUsers:number;scansTotal:number;dangerousScans:number;averageLatencyMs:number}; recentScans:{id:string;createdAt:string;modality:string;riskLevel:RiskLevel;score:number;target:string}[]; recentJobs:{id:string;type:string;status:string;progress:number;message?:string;createdAt:string}[]; models:{id:string;name:string;modality:string;status:string;f1?:number;accuracy?:number;createdAt:string}[] }
export interface AdminUser { id:string; displayName:string; email:string; role:string; status:string; createdAt:string; lastLoginAt?:string }
export interface GmailStatus { configured:boolean; connected:boolean; address:string; status:string }
export interface GmailMessageSummary { id:string; threadId:string; from:string; subject:string; date:string; snippet:string; labelIds:string[] }
export interface GmailMessagePreview { id:string; threadId:string; from:string; replyTo:string; subject:string; date:string; body:string; labelIds:string[]; attachments:{filename:string;contentType:string;size:number}[]; linksRemoved:number }

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
let sessionToken = '';
export const setSessionToken = (token: string | null) => { sessionToken = token || ''; };
export const apiBaseUrl = API_BASE;
const level = (score: number): RiskLevel => score >= 70 ? 'danger' : score >= 40 ? 'warn' : 'safe';

const normalize = (raw: Record<string, unknown>): Assessment => {
  const numeric = Number(raw.risk_score ?? raw.score ?? 0);
  const score = Math.max(0, Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)));
  return { score, riskLevel: level(score), confidence: Number(raw.confidence ?? .85), reasons: Array.isArray(raw.reasons) ? raw.reasons as string[] : [], evidence: Array.isArray(raw.evidence) ? raw.evidence as Evidence[] : [], explanation: raw.explanation as string | undefined, requestId: raw.request_id as string || crypto.randomUUID(), latencyMs: raw.latency_ms as number | undefined };
};

async function request<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Core API không phản hồi sau 20 giây.');
    throw new Error('Không thể kết nối Core API. Hãy kiểm tra backend đang chạy.');
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = Array.isArray(payload.detail)
      ? payload.detail.map((item: { msg?: string }) => item.msg || 'Dữ liệu không hợp lệ').join('; ')
      : payload.detail;
    throw new Error(detail || `Máy chủ phản hồi ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const login = (email: string, password: string) => request<UserSession>('/v1/auth/login', { email, password });
export const register = (displayName: string, email: string, password: string) => request<UserSession>('/v1/auth/register', { displayName, email, password });
export const logout = () => request<{ ok: boolean }>('/v1/auth/logout');
export const getProfile = () => request<UserProfile>('/v1/account/profile', undefined, 'GET');
export const checkHealth = () => request<{ status: string }>('/v1/health', undefined, 'GET');
export const assessUrl = async (url: string): Promise<Assessment> => normalize(await request<Record<string, unknown>>('/v1/assess/url', { url, context: 'desktop_browser_cover' }));
export const assessEmail = async (text: string): Promise<Assessment> => normalize(await request<Record<string, unknown>>('/v1/assess/text', { text, modality: 'email', metadata: { source: 'desktop_email_guard', locale: 'vi' } }));
export const getGmailStatus = () => request<GmailStatus>('/v1/integrations/gmail/status', undefined, 'GET');
export const connectGmail = () => request<{authUrl:string}>('/v1/integrations/gmail/connect');
export const listGmailMessages = async (query='', label='') => {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (label) params.set('label', label);
  params.set('limit', '30');
  return (await request<{messages:GmailMessageSummary[]}>(`/v1/integrations/gmail/messages?${params}`, undefined, 'GET')).messages;
};
export const getGmailMessagePreview = (messageId:string) => request<GmailMessagePreview>(`/v1/integrations/gmail/messages/${encodeURIComponent(messageId)}/preview`, undefined, 'GET');
export const assessGmailMessage = async (messageId:string):Promise<Assessment> => normalize(await request<Record<string,unknown>>(`/v1/integrations/gmail/messages/${encodeURIComponent(messageId)}/assess`, {analysis_depth:'balanced',operator_context:''}));
export const disconnectGmail = () => request<{disconnected:boolean}>('/v1/integrations/gmail/connection', undefined, 'DELETE');
export const getAdminOverview = () => request<AdminOverview>('/admin/overview', undefined, 'GET');
export const getAdminUsers = () => request<{users:AdminUser[]}>('/admin/users', undefined, 'GET');
export const setAdminUserStatus = (id:string, status:'active'|'suspended') => request<{id:string;status:string}>(`/admin/users/${id}/status`, {status}, 'PATCH');
export function askContext(question: string, context: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const endpoint = API_BASE.replace(/^http/, 'ws') + '/v1/chat';
    const socket = new WebSocket(endpoint);
    let answer = '';
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      callback();
    };
    const timeout = window.setTimeout(() => {
      socket.close();
      finish(() => reject(new Error('Core AI không phản hồi sau 30 giây.')));
    }, 30_000);
    socket.onopen = () => socket.send(JSON.stringify({ access_token: sessionToken, question, context: { content: context, modality: context.startsWith('http') ? 'url' : 'email' } }));
    socket.onmessage = ({ data }) => {
      let event: { type: string; delta?: string; error?: string };
      try { event = JSON.parse(data as string); } catch { return; }
      if (event.type === 'delta') answer += event.delta || '';
      if (event.type === 'final') { socket.close(); finish(() => resolve(answer || 'Chưa có giải thích cho kết quả này.')); }
      if (event.type === 'error') { socket.close(); finish(() => reject(new Error(event.error || 'Không thể hỏi Core AI.'))); }
    };
    socket.onerror = () => finish(() => reject(new Error('Không thể kết nối Core AI.')));
    socket.onclose = () => {
      if (!settled) finish(() => reject(new Error('Kết nối Core AI đã đóng trước khi có kết quả.')));
    };
  });
}
