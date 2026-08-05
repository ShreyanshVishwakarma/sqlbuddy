import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DB_NAME = "sqlbuddy";
const DB_VERSION = 1;

export interface QuestionState {
  /** Raw SQL draft; empty means "use starter". */
  draft: string;
  /** Number of times the learner submitted an answer. */
  attemptCount: number;
  /** True only after all fixtures pass on a submission. */
  completed: boolean;
  /** ISO timestamp of the last time the question was opened. */
  lastOpenedAt: string;
  /** User's optional notes for the question. */
  notes: string;
  bookmarked: boolean;
}

export interface SettingsState {
  theme: "system" | "light" | "dark";
}

interface SqlPrepDb extends DBSchema {
  questions: {
    key: string;
    value: QuestionState;
  };
  settings: {
    key: string;
    value: SettingsState;
  };
}

let dbPromise: Promise<IDBPDatabase<SqlPrepDb>> | null = null;

function getDb(): Promise<IDBPDatabase<SqlPrepDb>> {
  if (!dbPromise) {
    dbPromise = openDB<SqlPrepDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("questions")) {
          db.createObjectStore("questions");
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
      },
    });
  }
  return dbPromise;
}

/** Best-effort IndexedDB access: any failure falls back to defaults (e.g. private mode). */
function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch(() => fallback);
}

const EMPTY_STATE: QuestionState = {
  draft: "",
  attemptCount: 0,
  completed: false,
  lastOpenedAt: "",
  notes: "",
  bookmarked: false,
};

export async function getQuestionState(questionId: string): Promise<QuestionState> {
  return safe(
    async () => {
      const db = await getDb();
      const state = await db.get("questions", questionId);
      return state ? { ...EMPTY_STATE, ...state } : { ...EMPTY_STATE };
    },
    { ...EMPTY_STATE },
  );
}

export async function getAllQuestionStates(): Promise<Record<string, QuestionState>> {
  return safe(async () => {
    const db = await getDb();
    const keys = await db.getAllKeys("questions");
    const values = await db.getAll("questions");
    const merged: Record<string, QuestionState> = {};
    keys.forEach((key, i) => {
      merged[String(key)] = values[i] as QuestionState;
    });
    return merged;
  }, {});
}

export async function saveQuestionState(
  questionId: string,
  patch: Partial<QuestionState>,
): Promise<void> {
  await safe(async () => {
    const db = await getDb();
    const current = (await db.get("questions", questionId)) ?? { ...EMPTY_STATE };
    await db.put("questions", { ...current, ...patch }, questionId);
  }, undefined);
}

export async function recordQuestionOpened(questionId: string): Promise<void> {
  await saveQuestionState(questionId, { lastOpenedAt: new Date().toISOString() });
}

export async function saveDraft(questionId: string, draft: string): Promise<void> {
  await saveQuestionState(questionId, { draft });
}

export async function incrementAttempts(questionId: string): Promise<void> {
  await safe(async () => {
    const db = await getDb();
    const current = (await db.get("questions", questionId)) ?? { ...EMPTY_STATE };
    await db.put("questions", { ...current, attemptCount: current.attemptCount + 1 }, questionId);
  }, undefined);
}

export async function markCompleted(questionId: string): Promise<void> {
  await saveQuestionState(questionId, { completed: true });
}

export async function toggleBookmark(questionId: string): Promise<boolean> {
  const current = await getQuestionState(questionId);
  const next = !current.bookmarked;
  await saveQuestionState(questionId, { bookmarked: next });
  return next;
}

export async function saveNotes(questionId: string, notes: string): Promise<void> {
  await saveQuestionState(questionId, { notes });
}

export async function getSettings(): Promise<SettingsState> {
  return safe(
    async () => {
      const db = await getDb();
      return (await db.get("settings", "app")) ?? { theme: "system" };
    },
    { theme: "system" },
  );
}

export async function saveSettings(settings: SettingsState): Promise<void> {
  await safe(async () => {
    const db = await getDb();
    await db.put("settings", settings, "app");
  }, undefined);
}

/** Wipes every locally stored question state and setting. */
export async function clearAllData(): Promise<void> {
  await safe(async () => {
    const db = await getDb();
    const tx = db.transaction(["questions", "settings"], "readwrite");
    await tx.objectStore("questions").clear();
    await tx.objectStore("settings").clear();
    await tx.done;
  }, undefined);
}
