/**
 * TypeScript types for Demo/Showcase System
 * Matches backend Pydantic models
 */

export type ThreatLevel = "safe" | "low" | "medium" | "high" | "critical";
export type Severity = "info" | "low" | "medium" | "high" | "critical";
export type AttackType = "url" | "prompt" | "mixed";
export type Scenario = "basic" | "advanced" | "mixed" | "custom";

export interface Evidence {
  source: string;
  message: string;
  severity: Severity;
  feature?: string;
  contribution?: number;
}

export interface TraditionalDetection {
  detected: boolean;
  methods: string[];
}

export interface AIDetection {
  detected: boolean;
  confidence: number;
  model_version: string;
}

export interface SandboxReport {
  behaviors: Array<{ type: string; count?: number }>;
  redirects: Array<{ from: string; to: string }>;
  scripts_executed: string[];
  network_calls: string[];
  dom_modifications: any[];
  cookies_set: Array<{ name: string; domain: string }>;
  storage_access: any[];
  analysis_time_ms: number;
  error?: string;
}

export interface URLAnalysisRequest {
  url: string;
  deep_analysis: boolean;
}

export interface URLAnalysisResponse {
  url: string;
  risk_score: number;
  threat_level: ThreatLevel;
  analysis_time_ms: number;
  traditional_detection: TraditionalDetection;
  ai_detection: AIDetection;
  evidence: Evidence[];
  sandbox_report?: SandboxReport;
}

export interface ChatMessageRequest {
  message: string;
  protection_enabled: boolean;
  session_id: string;
}

export interface ChatMessageResponse {
  response: string;
  blocked: boolean;
  injection_detected: boolean;
  risk_score: number;
  analysis_time_ms: number;
}

export interface SimulateAttackRequest {
  scenario: Scenario;
  attack_type: AttackType;
  count: number;
  protection_enabled: boolean;
}

export interface SimulateAttackResponse {
  simulation_id: string;
  total_attacks: number;
  started_at: string;
}

export interface AttackMetrics {
  attack_count: number;
  blocked_count: number;
  success_count: number;
  block_rate: number;
  success_rate: number;
  avg_time_ms: number;
}

export interface MetricsResponse {
  session_id: string;
  protection_off: AttackMetrics;
  protection_on: AttackMetrics;
  improvement_percentage: number;
}

export interface WebSocketMessage {
  type: "attack_event" | "metrics_update";
  data: any;
}

export interface AttackEventData {
  index: number;
  total: number;
  attack_type: string;
  content: string;
  risk_score: number;
  blocked: boolean;
  protection_enabled: boolean;
}
