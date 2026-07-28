import {
  createDefaultInterviewState,
  type ChecklistItem,
  type InterviewPhases,
  type InterviewState,
  type Question,
  type SourceItem,
} from "./types";

export const PROJECT_SCHEMA_VERSION = 1;
export const STORAGE_KEY = "interview-creator-session";
export const MAX_PROJECT_FILE_BYTES = 512 * 1024;
export const MAX_TEXT_LENGTH = 5000;
export const MAX_QUESTIONS_PER_PHASE = 100;
export const MAX_CHECKLIST_ITEMS = 100;
export const MAX_SOURCES = 50;
export const MAX_ESTIMATED_MINUTES = 480;

type ParseSuccess = {
  ok: true;
  state: InterviewState;
  migrated: boolean;
};

type ParseFailure = {
  ok: false;
  reason: string;
};

export type ParseProjectResult = ParseSuccess | ParseFailure;

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.length > MAX_TEXT_LENGTH ? value.slice(0, MAX_TEXT_LENGTH) : value;
}

function isoDateValue(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? fallback : new Date(timestamp).toISOString();
}

function stableId(value: unknown, prefix: string, index: number) {
  const candidate = stringValue(value);
  return candidate || `${prefix}-${index + 1}`;
}

function estimatedMinutes(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.max(0, Math.min(MAX_ESTIMATED_MINUTES, Math.round(value)));
  return rounded > 0 ? rounded : undefined;
}

function parseQuestion(value: unknown, index: number, idPrefix: string): Question | null {
  if (!isPlainObject(value)) return null;

  const text = stringValue(value.text ?? value.question);
  const notes = stringValue(value.notes);

  return {
    id: stableId(value.id, idPrefix, index),
    text,
    notes,
    estimated_minutes: estimatedMinutes(value.estimated_minutes),
    is_backup: typeof value.is_backup === "boolean" ? value.is_backup : false,
  };
}

function parseQuestionArray(value: unknown, phase: keyof InterviewPhases): Question[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_QUESTIONS_PER_PHASE)
    .map((item, index) => parseQuestion(item, index, phase))
    .filter((item): item is Question => item !== null);
}

function parseChecklistItem(value: unknown, index: number): ChecklistItem | null {
  if (!isPlainObject(value)) return null;
  return {
    id: stableId(value.id, "c", index),
    text: stringValue(value.text),
    checked: typeof value.checked === "boolean" ? value.checked : false,
  };
}

function parseSourceItem(value: unknown, index: number): SourceItem | null {
  if (!isPlainObject(value)) return null;
  return {
    id: stableId(value.id, "s", index),
    title: stringValue(value.title),
    url: stringValue(value.url, ""),
  };
}

function parseChecklist(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_CHECKLIST_ITEMS)
    .map((item, index) => parseChecklistItem(item, index))
    .filter((item): item is ChecklistItem => item !== null);
}

function parseSources(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_SOURCES)
    .map((item, index) => parseSourceItem(item, index))
    .filter((item): item is SourceItem => item !== null);
}

function normalizeProjectShape(input: PlainObject) {
  const migrated = input.schemaVersion == null || "questions" in input || "icebreakers" in input || "interviewee" in input;

  if (typeof input.schemaVersion === "number" && input.schemaVersion > PROJECT_SCHEMA_VERSION) {
    return { ok: false as const, reason: "future-version" };
  }

  const phasesSource = isPlainObject(input.phases) ? input.phases : {};
  const phases: InterviewPhases = {
    intro: parseQuestionArray(phasesSource.intro ?? input.icebreakers, "intro"),
    main: parseQuestionArray(phasesSource.main ?? input.questions, "main"),
    outro: parseQuestionArray(phasesSource.outro, "outro"),
  };

  const fallback = createDefaultInterviewState();
  const now = new Date().toISOString();
  const title = stringValue(input.title, fallback.title);
  const partner = stringValue(input.partner ?? input.interviewee, fallback.partner);
  const allQuestions = [...phases.intro, ...phases.main, ...phases.outro];

  const state: InterviewState = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: stringValue(input.id, fallback.id),
    title,
    partner,
    created_at: isoDateValue(input.created_at, now),
    updated_at: now,
    total_estimated_time: allQuestions.reduce((sum, question) => sum + (question.estimated_minutes ?? 0), 0),
    target_minutes: estimatedMinutes(input.target_minutes),
    phases,
    checklist: parseChecklist(input.checklist),
    sources: parseSources(input.sources),
  };

  return { ok: true as const, state, migrated };
}

export function parseInterviewProject(input: unknown): ParseProjectResult {
  if (!isPlainObject(input)) {
    return { ok: false, reason: "not-an-object" };
  }

  const hasRecognizedProjectContent =
    typeof input.title === "string" ||
    typeof input.partner === "string" ||
    typeof input.interviewee === "string" ||
    Array.isArray(input.questions) ||
    Array.isArray(input.icebreakers) ||
    isPlainObject(input.phases);

  if (!hasRecognizedProjectContent) {
    return { ok: false, reason: "missing-project-content" };
  }

  const normalized = normalizeProjectShape(input);
  if (!normalized.ok) return normalized;

  return normalized;
}

export function parseProjectJson(jsonText: string): ParseProjectResult {
  try {
    return parseInterviewProject(JSON.parse(jsonText));
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
}

export function moveQuestion(
  phases: InterviewPhases,
  source: { phase: keyof InterviewPhases; index: number },
  destination: { phase: keyof InterviewPhases; index: number },
): InterviewPhases {
  if (
    source.phase !== destination.phase &&
    phases[destination.phase].length >= MAX_QUESTIONS_PER_PHASE
  ) {
    return phases;
  }

  const next: InterviewPhases = {
    intro: [...phases.intro],
    main: [...phases.main],
    outro: [...phases.outro],
  };
  const [moved] = next[source.phase].splice(source.index, 1);
  if (!moved) return phases;
  next[destination.phase].splice(destination.index, 0, moved);
  return next;
}
