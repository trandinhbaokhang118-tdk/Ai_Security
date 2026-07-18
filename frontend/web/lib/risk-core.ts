export type RiskCoreRecord = Record<string, unknown>;

export interface RiskCoreView {
  source: "risk_core_v2" | "legacy";
  schemaVersion?: string;
  scoringVersion?: string;
  score: number;
  rawScore?: number;
  confidence?: number;
  level?: string;
  decision?: string;
  nextAction?: string;
  criteria: RiskCoreRecord[];
  evidence: RiskCoreRecord[];
  mitigations: RiskCoreRecord[];
  overrides: RiskCoreRecord[];
  effectiveOverride?: RiskCoreRecord;
  caps: RiskCoreRecord[];
  conflicts: RiskCoreRecord[];
  unavailableChecks: string[];
  notCheckedChecks: string[];
  reasoning: string[];
}

const record = (value: unknown): RiskCoreRecord | undefined =>
  value != null && typeof value === "object" && !Array.isArray(value)
    ? value as RiskCoreRecord
    : undefined;
const records = (value: unknown): RiskCoreRecord[] =>
  Array.isArray(value)
    ? value.filter((item) => record(item)) as RiskCoreRecord[]
    : [];
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
const number = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;
const clamp = (value: number) => Math.max(0, Math.min(100, value));

/** Maps the additive API payload without deriving v2 policy fields locally. */
export function mapRiskResult(
  payload: unknown,
  legacyScore?: number,
): RiskCoreView {
  const outer = record(payload) ?? {};
  const core = record(outer.risk_core);
  if (core) {
    return {
      source: "risk_core_v2",
      schemaVersion: text(core.schema_version),
      scoringVersion: text(core.scoring_version),
      score: clamp(number(core.final_score) ?? number(core.risk_score) ?? 0),
      rawScore: number(core.raw_score) ?? number(core.base_risk_score),
      confidence: number(core.confidence_score) ?? number(core.confidence),
      level: text(core.risk_level) ?? text(core.verdict),
      decision: text(core.decision),
      nextAction: text(core.next_action),
      criteria: records(core.criteria),
      evidence: records(core.evidence),
      mitigations: records(core.mitigations),
      overrides: records(core.overrides),
      effectiveOverride: record(core.effective_override),
      caps: records(core.caps),
      conflicts: records(core.conflicts),
      unavailableChecks: strings(core.unavailable_checks),
      notCheckedChecks: strings(core.not_checked_checks),
      reasoning: strings(core.reasoning),
    };
  }
  const normalized = number(outer.risk_score);
  const outerConfidence = number(outer.confidence);
  return {
    source: "legacy",
    score: clamp(
      normalized == null
        ? legacyScore ?? 0
        : normalized <= 1
          ? normalized * 100
          : normalized,
    ),
    confidence: outerConfidence == null
      ? undefined
      : clamp(outerConfidence <= 1 ? outerConfidence * 100 : outerConfidence),
    level: text(outer.risk_level) ?? text(outer.threat_level),
    decision: text(outer.decision),
    criteria: records(outer.score_layers),
    evidence: records(outer.evidence),
    mitigations: [],
    overrides: [],
    caps: [],
    conflicts: [],
    unavailableChecks: [],
    notCheckedChecks: [],
    reasoning: strings(outer.reasons),
  };
}

export function displayValue(
  item: RiskCoreRecord,
  keys: string[],
  fallback = "—",
): string {
  for (const key of keys) {
    const value = item[key];
    if (
      typeof value === "string"
      || typeof value === "number"
      || typeof value === "boolean"
    ) {
      return String(value);
    }
  }
  return fallback;
}
