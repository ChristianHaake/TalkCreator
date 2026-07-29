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

type StrictResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(input: PlainObject, key: string) {
  return Object.prototype.hasOwnProperty.call(input, key);
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
  return candidate.trim() ? candidate : `${prefix}-${index + 1}`;
}

function estimatedMinutes(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.max(0, Math.min(MAX_ESTIMATED_MINUTES, Math.round(value)));
  return rounded > 0 ? rounded : undefined;
}

function strictString(
  value: unknown,
  field: string,
  options: { nonEmpty?: boolean } = {},
): StrictResult<string> {
  if (
    typeof value !== "string" ||
    value.length > MAX_TEXT_LENGTH ||
    (options.nonEmpty && !value.trim())
  ) {
    return { ok: false, reason: `invalid-${field}` };
  }
  return { ok: true, value };
}

function strictOptionalMinutes(value: unknown, field: string): StrictResult<number | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_ESTIMATED_MINUTES
  ) {
    return { ok: false, reason: `invalid-${field}` };
  }
  return { ok: true, value };
}

function strictOptionalDate(value: unknown, field: string): StrictResult<string | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  if (typeof value !== "string") {
    return { ok: false, reason: `invalid-${field}` };
  }
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/,
  );
  if (!match) {
    return { ok: false, reason: `invalid-${field}` };
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText, offsetMinuteText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysPerMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (daysPerMonth[month - 1] ?? 0) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return { ok: false, reason: `invalid-${field}` };
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return { ok: false, reason: `invalid-${field}` };
  }
  return { ok: true, value: new Date(timestamp).toISOString() };
}

function strictQuestion(value: unknown): StrictResult<Question> {
  if (!isPlainObject(value)) {
    return { ok: false, reason: "invalid-question" };
  }

  const id = strictString(value.id, "question-id");
  const text = strictString(value.text, "question-text");
  const notes = strictString(value.notes, "question-notes");
  const minutes = strictOptionalMinutes(value.estimated_minutes, "question-duration");
  if (!id.ok) return id;
  if (!text.ok) return text;
  if (!notes.ok) return notes;
  if (!minutes.ok) return minutes;
  if (value.is_backup !== undefined && typeof value.is_backup !== "boolean") {
    return { ok: false, reason: "invalid-question-backup" };
  }

  return {
    ok: true,
    value: {
      id: id.value,
      text: text.value,
      notes: notes.value,
      estimated_minutes: minutes.value,
      is_backup: value.is_backup ?? false,
    },
  };
}

function strictQuestionArray(
  value: unknown,
  phase: keyof InterviewPhases,
): StrictResult<Question[]> {
  if (!Array.isArray(value) || value.length > MAX_QUESTIONS_PER_PHASE) {
    return { ok: false, reason: `invalid-${phase}-questions` };
  }

  const questions: Question[] = [];
  for (const item of value) {
    const parsed = strictQuestion(item);
    if (!parsed.ok) return parsed;
    questions.push(parsed.value);
  }
  return { ok: true, value: questions };
}

function strictChecklist(value: unknown): StrictResult<ChecklistItem[]> {
  if (!Array.isArray(value) || value.length > MAX_CHECKLIST_ITEMS) {
    return { ok: false, reason: "invalid-checklist" };
  }

  const items: ChecklistItem[] = [];
  for (const item of value) {
    if (!isPlainObject(item)) {
      return { ok: false, reason: "invalid-checklist-item" };
    }
    const id = strictString(item.id, "checklist-id");
    const text = strictString(item.text, "checklist-text");
    if (!id.ok) return id;
    if (!text.ok) return text;
    if (typeof item.checked !== "boolean") {
      return { ok: false, reason: "invalid-checklist-state" };
    }
    items.push({ id: id.value, text: text.value, checked: item.checked });
  }
  return { ok: true, value: items };
}

function strictSources(value: unknown): StrictResult<SourceItem[]> {
  if (!Array.isArray(value) || value.length > MAX_SOURCES) {
    return { ok: false, reason: "invalid-sources" };
  }

  const sources: SourceItem[] = [];
  for (const item of value) {
    if (!isPlainObject(item)) {
      return { ok: false, reason: "invalid-source" };
    }
    const id = strictString(item.id, "source-id");
    const title = strictString(item.title, "source-title");
    const url = strictString(item.url, "source-url");
    if (!id.ok) return id;
    if (!title.ok) return title;
    if (!url.ok) return url;
    sources.push({ id: id.value, title: title.value, url: url.value });
  }
  return { ok: true, value: sources };
}

function normalizeUniqueIds<T extends { id: string }>(
  items: T[],
  fallbackId: (index: number) => string,
): T[] {
  const reserved = new Set(items.map((item) => item.id).filter((id) => id.trim()));
  const used = new Set<string>();

  return items.map((item, index) => {
    if (item.id.trim() && !used.has(item.id)) {
      used.add(item.id);
      return item;
    }

    const base = fallbackId(index);
    let replacement = base;
    let suffix = 2;
    while (reserved.has(replacement) || used.has(replacement)) {
      replacement = `${base}-${suffix}`;
      suffix += 1;
    }
    reserved.add(replacement);
    used.add(replacement);
    return { ...item, id: replacement };
  });
}

function ensureUniqueQuestionIds(phases: InterviewPhases): InterviewPhases {
  const phaseOrder: Array<keyof InterviewPhases> = ["intro", "main", "outro"];
  const indexed = phaseOrder.flatMap((phase) =>
    phases[phase].map((question, index) => ({ phase, index, question })),
  );
  const normalized = normalizeUniqueIds(
    indexed.map(({ question }) => question),
    (index) => {
      const item = indexed[index];
      return `${item.phase}-${item.index + 1}`;
    },
  );

  return {
    intro: normalized.slice(0, phases.intro.length),
    main: normalized.slice(phases.intro.length, phases.intro.length + phases.main.length),
    outro: normalized.slice(phases.intro.length + phases.main.length),
  };
}

function parseQuestion(value: unknown, index: number, idPrefix: string): Question | null {
  if (!isPlainObject(value)) return null;

  return {
    id: stableId(value.id, idPrefix, index),
    text: stringValue(value.text ?? value.question),
    notes: stringValue(value.notes),
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
    url: stringValue(value.url),
  };
}

function parseChecklist(value: unknown) {
  if (!Array.isArray(value)) return [];
  const items = value
    .slice(0, MAX_CHECKLIST_ITEMS)
    .map((item, index) => parseChecklistItem(item, index))
    .filter((item): item is ChecklistItem => item !== null);
  return normalizeUniqueIds(items, (index) => `c-${index + 1}`);
}

function parseSources(value: unknown) {
  if (!Array.isArray(value)) return [];
  const items = value
    .slice(0, MAX_SOURCES)
    .map((item, index) => parseSourceItem(item, index))
    .filter((item): item is SourceItem => item !== null);
  return normalizeUniqueIds(items, (index) => `s-${index + 1}`);
}

function parseCurrentProject(input: PlainObject): ParseProjectResult {
  if (
    typeof input.schemaVersion !== "number" ||
    !Number.isInteger(input.schemaVersion) ||
    input.schemaVersion !== PROJECT_SCHEMA_VERSION
  ) {
    if (
      typeof input.schemaVersion === "number" &&
      Number.isInteger(input.schemaVersion) &&
      input.schemaVersion > PROJECT_SCHEMA_VERSION
    ) {
      return { ok: false, reason: "future-version" };
    }
    return { ok: false, reason: "invalid-schema-version" };
  }

  const requiredFields = ["id", "title", "partner", "phases", "checklist", "sources"];
  if (requiredFields.some((field) => !hasOwn(input, field))) {
    return { ok: false, reason: "missing-required-field" };
  }

  const id = strictString(input.id, "project-id", { nonEmpty: true });
  const title = strictString(input.title, "project-title");
  const partner = strictString(input.partner, "project-partner");
  if (!id.ok) return id;
  if (!title.ok) return title;
  if (!partner.ok) return partner;
  if (!isPlainObject(input.phases)) {
    return { ok: false, reason: "invalid-phases" };
  }

  const intro = strictQuestionArray(input.phases.intro, "intro");
  const main = strictQuestionArray(input.phases.main, "main");
  const outro = strictQuestionArray(input.phases.outro, "outro");
  const checklist = strictChecklist(input.checklist);
  const sources = strictSources(input.sources);
  const target = strictOptionalMinutes(input.target_minutes, "target-duration");
  const createdAt = strictOptionalDate(input.created_at, "created-at");
  const updatedAt = strictOptionalDate(input.updated_at, "updated-at");
  if (!intro.ok) return intro;
  if (!main.ok) return main;
  if (!outro.ok) return outro;
  if (!checklist.ok) return checklist;
  if (!sources.ok) return sources;
  if (!target.ok) return target;
  if (!createdAt.ok) return createdAt;
  if (!updatedAt.ok) return updatedAt;
  if (
    input.total_estimated_time !== undefined &&
    (typeof input.total_estimated_time !== "number" ||
      !Number.isInteger(input.total_estimated_time) ||
      input.total_estimated_time < 0)
  ) {
    return { ok: false, reason: "invalid-total-duration" };
  }

  const phases = ensureUniqueQuestionIds({
    intro: intro.value,
    main: main.value,
    outro: outro.value,
  });
  const allQuestions = [...phases.intro, ...phases.main, ...phases.outro];
  const now = new Date().toISOString();

  return {
    ok: true,
    migrated: false,
    state: {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      id: id.value,
      title: title.value,
      partner: partner.value,
      created_at: createdAt.value ?? now,
      updated_at: now,
      total_estimated_time: allQuestions.reduce(
        (sum, question) => sum + (question.estimated_minutes ?? 0),
        0,
      ),
      target_minutes: target.value,
      phases,
      checklist: normalizeUniqueIds(checklist.value, (index) => `c-${index + 1}`),
      sources: normalizeUniqueIds(sources.value, (index) => `s-${index + 1}`),
    },
  };
}

function parseLegacyProject(input: PlainObject): ParseProjectResult {
  const hasLegacyProjectContent =
    typeof input.interviewee === "string" ||
    Array.isArray(input.questions) ||
    Array.isArray(input.icebreakers);

  if (!hasLegacyProjectContent) {
    return { ok: false, reason: "missing-project-content" };
  }

  const phasesSource = isPlainObject(input.phases) ? input.phases : {};
  const phases = ensureUniqueQuestionIds({
    intro: parseQuestionArray(phasesSource.intro ?? input.icebreakers, "intro"),
    main: parseQuestionArray(phasesSource.main ?? input.questions, "main"),
    outro: parseQuestionArray(phasesSource.outro, "outro"),
  });
  const fallback = createDefaultInterviewState();
  const now = new Date().toISOString();
  const allQuestions = [...phases.intro, ...phases.main, ...phases.outro];
  const legacyId = stringValue(input.id);

  return {
    ok: true,
    migrated: true,
    state: {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      id: legacyId.trim() ? legacyId : fallback.id,
      title: stringValue(input.title, fallback.title),
      partner: stringValue(input.partner ?? input.interviewee, fallback.partner),
      created_at: isoDateValue(input.created_at, now),
      updated_at: now,
      total_estimated_time: allQuestions.reduce(
        (sum, question) => sum + (question.estimated_minutes ?? 0),
        0,
      ),
      target_minutes: estimatedMinutes(input.target_minutes),
      phases,
      checklist: parseChecklist(input.checklist),
      sources: parseSources(input.sources),
    },
  };
}

export function parseInterviewProject(input: unknown): ParseProjectResult {
  if (!isPlainObject(input)) {
    return { ok: false, reason: "not-an-object" };
  }

  return hasOwn(input, "schemaVersion")
    ? parseCurrentProject(input)
    : parseLegacyProject(input);
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
