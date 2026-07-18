const HISTORY_KEY = "prewise-history";
const RESULT_PREFIX = "prewise-result:";
const SETTINGS_KEY = "prewise-settings";
const HISTORY_LIMIT = 20;

type JsonObject = Record<string, unknown>;
export type PrivacyPreferences = {
  saveHistory: boolean;
  maskSensitive: boolean;
};

const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  saveHistory: true,
  maskSensitive: true,
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getPrivacyPreferences(): PrivacyPreferences {
  if (typeof window === "undefined") return DEFAULT_PRIVACY_PREFERENCES;
  try {
    const saved = parseJson<JsonObject>(localStorage.getItem(SETTINGS_KEY));
    return {
      saveHistory: typeof saved?.saveHistory === "boolean" ? saved.saveHistory : DEFAULT_PRIVACY_PREFERENCES.saveHistory,
      maskSensitive: typeof saved?.maskSensitive === "boolean" ? saved.maskSensitive : DEFAULT_PRIVACY_PREFERENCES.maskSensitive,
    };
  } catch {
    return DEFAULT_PRIVACY_PREFERENCES;
  }
}

function luhnValid(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  let doubleDigit = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

export function maskSensitiveText(value: string): string {
  const maskSecret = (_match: string, label: string, separator: string) => `${label}${separator}[ĐÃ CHE]`;
  let masked = value
    .replace(/\b(password|passcode|mật khẩu|mat khau|mã pin|pin)\b(\s*(?::|=|-|là)\s*)(["']?)[^\s,;'"<>]{3,}/giu, maskSecret)
    .replace(/\b(otp|mã otp|mã xác thực|ma xac thuc|verification code|one[- ]time (?:password|code))\b(\s*(?::|=|-|là)\s*)\d{4,8}\b/giu, maskSecret)
    .replace(/\b(card(?: number)?|credit card|debit card|số thẻ|so the)\b(\s*(?::|=|-|là)\s*)(?:\d[\s-]?){12,18}\d/giu, (_match, label: string, separator: string) => `${label}${separator}[THẺ ĐÃ CHE]`);

  masked = masked.replace(/\b(?:\d[ -]?){12,18}\d\b/g, (candidate) => {
    if (!luhnValid(candidate)) return candidate;
    const digits = candidate.replace(/\D/g, "");
    return `[THẺ ĐÃ CHE •••• ${digits.slice(-4)}]`;
  });
  return masked;
}

export function maskSensitiveData<T>(value: T): T {
  if (typeof value === "string") return maskSensitiveText(value) as T;
  if (Array.isArray(value)) return value.map(maskSensitiveData) as T;
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, maskSensitiveData(item)]),
  ) as T;
}

export function stripResultScreenshot<T>(record: T): T {
  if (!isObject(record)) return record;
  const result = record.result;
  if (!isObject(result) || !isObject(result.sandbox_report)) return record;

  const sandbox = { ...result.sandbox_report };
  delete sandbox.screenshot_data_url;
  return {
    ...record,
    result: { ...result, sandbox_report: sandbox },
  } as T;
}

function recordId(record: unknown): string {
  return isObject(record) && typeof record.id === "string" ? record.id : "";
}

export function loadLocalHistory<T = unknown>(): T[] {
  if (typeof window === "undefined") return [];
  try {
    const history = parseJson<unknown[]>(localStorage.getItem(HISTORY_KEY));
    if (!Array.isArray(history)) return [];
    const visible = getPrivacyPreferences().maskSensitive ? maskSensitiveData(history) : history;
    return visible as T[];
  } catch {
    return [];
  }
}

function compactOwnedResultRecords(currentId: string): void {
  let keys: string[];
  try {
    keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => Boolean(key?.startsWith(RESULT_PREFIX)) && key !== `${RESULT_PREFIX}${currentId}`);
  } catch {
    return;
  }

  for (const key of keys) {
    const parsed = parseJson<unknown>(localStorage.getItem(key));
    localStorage.removeItem(key);
    if (parsed === null) continue;
    try {
      localStorage.setItem(key, JSON.stringify(stripResultScreenshot(parsed)));
    } catch {
      // Old detail records are recoverable from history and may be dropped under quota pressure.
    }
  }
}

export function persistResultRecord(id: string, record: unknown): void {
  if (!id || typeof window === "undefined") return;
  const key = `${RESULT_PREFIX}${id}`;
  const preferences = getPrivacyPreferences();
  const protectedRecord = preferences.maskSensitive ? maskSensitiveData(record) : record;
  const compact = stripResultScreenshot(protectedRecord);

  try {
    sessionStorage.setItem(key, JSON.stringify(protectedRecord));
  } catch {
    try { sessionStorage.setItem(key, JSON.stringify(compact)); } catch { /* Session storage is optional. */ }
  }

  if (!preferences.saveHistory) {
    try { localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
    return;
  }

  const previous = loadLocalHistory();
  const history = [compact, ...previous.filter((item) => recordId(item) !== id).map(stripResultScreenshot)].slice(0, HISTORY_LIMIT);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 5))); } catch { /* Keep the current result below. */ }
  }

  try {
    localStorage.setItem(key, JSON.stringify(compact));
  } catch {
    compactOwnedResultRecords(id);
    try { localStorage.setItem(key, JSON.stringify(compact)); } catch { /* The session copy or query fallback remains available. */ }
  }
}

export function loadResultRecord<T>(id: string): T | null {
  if (!id || typeof window === "undefined") return null;
  const key = `${RESULT_PREFIX}${id}`;
  try {
    const sessionRecord = parseJson<T>(sessionStorage.getItem(key));
    if (sessionRecord) return getPrivacyPreferences().maskSensitive ? maskSensitiveData(sessionRecord) : sessionRecord;
  } catch { /* Continue with persistent storage. */ }

  try {
    const localRecord = parseJson<T>(localStorage.getItem(key));
    if (localRecord) return getPrivacyPreferences().maskSensitive ? maskSensitiveData(localRecord) : localRecord;
  } catch { /* Continue with history. */ }

  const historyRecord = loadLocalHistory().find((item) => recordId(item) === id);
  return (historyRecord as T | undefined) ?? null;
}

export function clearResultHistory(): void {
  if (typeof window === "undefined") return;
  for (const storage of [localStorage, sessionStorage]) {
    try {
      storage.removeItem(HISTORY_KEY);
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(key?.startsWith(RESULT_PREFIX)));
      keys.forEach((key) => storage.removeItem(key));
    } catch { /* Storage may be disabled. */ }
  }
}
