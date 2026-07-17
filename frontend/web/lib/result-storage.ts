const HISTORY_KEY = "prewise-history";
const RESULT_PREFIX = "prewise-result:";
const HISTORY_LIMIT = 20;

type JsonObject = Record<string, unknown>;

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

function readHistory(): unknown[] {
  try {
    const history = parseJson<unknown[]>(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(history) ? history : [];
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
  const compact = stripResultScreenshot(record);

  try {
    sessionStorage.setItem(key, JSON.stringify(record));
  } catch {
    try { sessionStorage.setItem(key, JSON.stringify(compact)); } catch { /* Session storage is optional. */ }
  }

  const previous = readHistory();
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
    if (sessionRecord) return sessionRecord;
  } catch { /* Continue with persistent storage. */ }

  try {
    const localRecord = parseJson<T>(localStorage.getItem(key));
    if (localRecord) return localRecord;
  } catch { /* Continue with history. */ }

  const historyRecord = readHistory().find((item) => recordId(item) === id);
  return (historyRecord as T | undefined) ?? null;
}

export function clearResultHistory(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* Storage may be disabled. */ }
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(key?.startsWith(RESULT_PREFIX)));
      keys.forEach((key) => storage.removeItem(key));
    } catch { /* Storage may be disabled. */ }
  }
}
