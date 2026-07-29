import { describe, expect, it } from "vitest";
import {
  MAX_CHECKLIST_ITEMS,
  MAX_ESTIMATED_MINUTES,
  MAX_QUESTIONS_PER_PHASE,
  MAX_SOURCES,
  MAX_TEXT_LENGTH,
  moveQuestion,
  parseInterviewProject,
  parseProjectJson,
  PROJECT_SCHEMA_VERSION,
} from "./projectSchema";
import type { InterviewPhases, Question } from "./types";

function currentProject(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: "project-1",
    title: "Interview",
    partner: "Ada Lovelace",
    phases: {
      intro: [],
      main: [],
      outro: [],
    },
    checklist: [],
    sources: [],
    ...overrides,
  };
}

describe("project schema", () => {
  it("accepts and normalizes a current project file", () => {
    const result = parseInterviewProject(currentProject({
      created_at: "2026-06-30T10:00:00.000Z",
      updated_at: "2026-06-30T10:05:00.000Z",
      phases: {
        intro: [{ id: "q-1", text: "Intro?", notes: "", estimated_minutes: 2 }],
        main: [{ id: "q-2", text: "Main?", notes: "Ask follow-up", estimated_minutes: 4 }],
        outro: [],
      },
      checklist: [{ id: "c-1", text: "Mic", checked: true }],
      sources: [{ id: "s-1", title: "Source", url: "https://example.com" }],
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(result.state.partner).toBe("Ada Lovelace");
    expect(result.state.total_estimated_time).toBe(6);
    expect(result.migrated).toBe(false);
  });

  it("migrates legacy questions, icebreakers, interviewee, and question text fields", () => {
    const result = parseInterviewProject({
      title: "Legacy",
      interviewee: "Grace Hopper",
      icebreakers: [{ id: "i-1", question: "Warmup?", notes: "" }],
      questions: [{ id: "q-1", question: "Core?", notes: "", is_backup: true }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(true);
    expect(result.state.partner).toBe("Grace Hopper");
    expect(result.state.phases.intro[0]?.text).toBe("Warmup?");
    expect(result.state.phases.main[0]?.text).toBe("Core?");
    expect(result.state.phases.main[0]?.is_backup).toBe(true);
  });

  it.each([
    { version: "1", reason: "invalid-schema-version" },
    { version: 0, reason: "invalid-schema-version" },
    { version: 1.5, reason: "invalid-schema-version" },
    { version: -1, reason: "invalid-schema-version" },
    { version: PROJECT_SCHEMA_VERSION + 1, reason: "future-version" },
  ])("rejects invalid schema version $version", ({ version, reason }) => {
    expect(parseInterviewProject(currentProject({ schemaVersion: version }))).toEqual({
      ok: false,
      reason,
    });
  });

  it("rejects invalid JSON and unknown shapes", () => {
    expect(parseProjectJson("{")).toEqual({ ok: false, reason: "invalid-json" });
    expect(parseInterviewProject({ arbitrary: true })).toEqual({ ok: false, reason: "missing-project-content" });
    expect(parseInterviewProject({
      title: "Unversioned current shape",
      phases: { intro: [], main: [], outro: [] },
    })).toEqual({ ok: false, reason: "missing-project-content" });
  });

  it("rejects current files whose collections exceed their limits", () => {
    const result = parseInterviewProject(currentProject({
      phases: {
        intro: Array.from({ length: MAX_QUESTIONS_PER_PHASE + 5 }, (_, index) => ({
          id: `q-${index}`,
          text: `Question ${index}`,
          notes: "",
        })),
        main: [],
        outro: [],
      },
      checklist: Array.from({ length: MAX_CHECKLIST_ITEMS + 5 }, (_, index) => ({
        id: `c-${index}`,
        text: `Item ${index}`,
        checked: false,
      })),
    }));

    expect(result).toEqual({ ok: false, reason: "invalid-intro-questions" });
  });

  it("normalizes duplicate imported question ids across and within phases", () => {
    const result = parseInterviewProject(currentProject({
      phases: {
        intro: [{ id: "duplicate", text: "Intro", notes: "" }],
        main: [
          { id: "duplicate", text: "Main one", notes: "" },
          { id: "duplicate", text: "Main two", notes: "" },
        ],
        outro: [{ id: "duplicate", text: "Outro", notes: "" }],
      },
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = [
      ...result.state.phases.intro,
      ...result.state.phases.main,
      ...result.state.phases.outro,
    ].map((question) => question.id);
    expect(ids[0]).toBe("duplicate");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("normalizes empty and duplicate checklist and source ids deterministically", () => {
    const result = parseInterviewProject(currentProject({
      checklist: [
        { id: "duplicate", text: "First", checked: false },
        { id: "duplicate", text: "Second", checked: true },
        { id: "c-2", text: "Third", checked: false },
        { id: "", text: "Fourth", checked: false },
      ],
      sources: [
        { id: "duplicate", title: "First", url: "" },
        { id: "duplicate", title: "Second", url: "https://example.com" },
        { id: "s-2", title: "Third", url: "" },
        { id: "", title: "Fourth", url: "" },
      ],
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.checklist.map((item) => item.id)).toEqual([
      "duplicate",
      "c-2-2",
      "c-2",
      "c-4",
    ]);
    expect(result.state.sources.map((item) => item.id)).toEqual([
      "duplicate",
      "s-2-2",
      "s-2",
      "s-4",
    ]);

    const reparsed = parseProjectJson(JSON.stringify(result.state));
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expect(reparsed.state.checklist.map((item) => item.id)).toEqual(
      result.state.checklist.map((item) => item.id),
    );
    expect(reparsed.state.sources.map((item) => item.id)).toEqual(
      result.state.sources.map((item) => item.id),
    );
  });

  it.each(["id", "title", "partner", "phases", "checklist", "sources"])(
    "rejects a current file without required field %s",
    (field) => {
      const project = currentProject();
      delete project[field as keyof typeof project];
      expect(parseInterviewProject(project)).toEqual({
        ok: false,
        reason: "missing-required-field",
      });
    },
  );

  it("rejects malformed phase, question, checklist, and source values", () => {
    expect(parseInterviewProject(currentProject({
      phases: { intro: "not-an-array", main: [], outro: [] },
    }))).toEqual({ ok: false, reason: "invalid-intro-questions" });

    expect(parseInterviewProject(currentProject({
      phases: {
        intro: [{ id: "q-1", text: "Question" }],
        main: [],
        outro: [],
      },
    }))).toEqual({ ok: false, reason: "invalid-question-notes" });

    expect(parseInterviewProject(currentProject({
      checklist: [{ id: "c-1", text: "Mic", checked: "yes" }],
    }))).toEqual({ ok: false, reason: "invalid-checklist-state" });

    expect(parseInterviewProject(currentProject({
      sources: [{ id: "s-1", title: "Source" }],
    }))).toEqual({ ok: false, reason: "invalid-source-url" });
  });

  it("rejects overlong text rather than truncating it", () => {
    expect(parseInterviewProject(currentProject({
      title: "x".repeat(MAX_TEXT_LENGTH + 1),
    }))).toEqual({ ok: false, reason: "invalid-project-title" });
  });

  it.each([0, 1.5, MAX_ESTIMATED_MINUTES + 1, "5"])(
    "rejects invalid question duration %s",
    (duration) => {
      const result = parseInterviewProject(currentProject({
        phases: {
          intro: [],
          main: [{
            id: "q-1",
            text: "Question",
            notes: "",
            estimated_minutes: duration,
          }],
          outro: [],
        },
      }));
      expect(result).toEqual({ ok: false, reason: "invalid-question-duration" });
    },
  );

  it("rejects oversized checklist and source collections", () => {
    const checklist = Array.from({ length: MAX_CHECKLIST_ITEMS + 1 }, (_, index) => ({
      id: `c-${index}`,
      text: "Item",
      checked: false,
    }));
    const sources = Array.from({ length: MAX_SOURCES + 1 }, (_, index) => ({
      id: `s-${index}`,
      title: "Source",
      url: "",
    }));

    expect(parseInterviewProject(currentProject({ checklist }))).toEqual({
      ok: false,
      reason: "invalid-checklist",
    });
    expect(parseInterviewProject(currentProject({ sources }))).toEqual({
      ok: false,
      reason: "invalid-sources",
    });
  });

  it("validates optional metadata and recalculates the total duration", () => {
    const valid = parseInterviewProject(currentProject({
      ignored: "not copied",
      created_at: "2026-06-30T10:00:00.000Z",
      updated_at: "2026-06-30T10:05:00.000Z",
      target_minutes: 30,
      total_estimated_time: 999,
      phases: {
        intro: [],
        main: [{
          id: "q-1",
          text: "Question",
          notes: "",
          estimated_minutes: 4,
        }],
        outro: [],
      },
    }));
    expect(valid.ok && valid.state.total_estimated_time).toBe(4);
    expect(valid.ok && "ignored" in valid.state).toBe(false);

    expect(parseInterviewProject(currentProject({ created_at: "not-a-date" }))).toEqual({
      ok: false,
      reason: "invalid-created-at",
    });
    expect(parseInterviewProject(currentProject({ created_at: "2026-06-30" }))).toEqual({
      ok: false,
      reason: "invalid-created-at",
    });
    expect(parseInterviewProject(currentProject({
      created_at: "2026-02-30T10:00:00.000Z",
    }))).toEqual({
      ok: false,
      reason: "invalid-created-at",
    });
    expect(parseInterviewProject(currentProject({ target_minutes: 0 }))).toEqual({
      ok: false,
      reason: "invalid-target-duration",
    });
    expect(parseInterviewProject(currentProject({ total_estimated_time: -1 }))).toEqual({
      ok: false,
      reason: "invalid-total-duration",
    });
  });

  it("keeps no-version legacy imports compatible and bounded", () => {
    const result = parseInterviewProject({
      id: "",
      title: "Legacy",
      questions: Array.from({ length: MAX_QUESTIONS_PER_PHASE + 5 }, (_, index) => ({
        id: "duplicate",
        question: `Question ${index}`,
      })),
      checklist: [
        { id: "duplicate", text: "First", checked: false },
        { id: "duplicate", text: "Second", checked: true },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(true);
    expect(result.state.id).not.toBe("");
    expect(result.state.phases.main).toHaveLength(MAX_QUESTIONS_PER_PHASE);
    expect(new Set(result.state.phases.main.map((question) => question.id)).size).toBe(
      MAX_QUESTIONS_PER_PHASE,
    );
    expect(new Set(result.state.checklist.map((item) => item.id)).size).toBe(2);
  });
});

describe("moveQuestion", () => {
  const question = (id: string): Question => ({ id, text: id, notes: "" });
  const phases = (): InterviewPhases => ({
    intro: [question("i-1")],
    main: [question("m-1"), question("m-2")],
    outro: [],
  });

  it("reorders within a phase", () => {
    const result = moveQuestion(phases(), { phase: "main", index: 0 }, { phase: "main", index: 1 });
    expect(result.main.map((q) => q.id)).toEqual(["m-2", "m-1"]);
  });

  it("moves a question between phases", () => {
    const result = moveQuestion(phases(), { phase: "main", index: 0 }, { phase: "intro", index: 0 });
    expect(result.intro.map((q) => q.id)).toEqual(["m-1", "i-1"]);
    expect(result.main.map((q) => q.id)).toEqual(["m-2"]);
  });

  it("moves into an empty phase", () => {
    const result = moveQuestion(phases(), { phase: "intro", index: 0 }, { phase: "outro", index: 0 });
    expect(result.intro).toHaveLength(0);
    expect(result.outro.map((q) => q.id)).toEqual(["i-1"]);
  });

  it("rejects a cross-phase move into a full destination", () => {
    const input = phases();
    input.intro = Array.from({ length: MAX_QUESTIONS_PER_PHASE }, (_, index) =>
      question(`i-${index + 1}`),
    );

    const result = moveQuestion(
      input,
      { phase: "main", index: 0 },
      { phase: "intro", index: MAX_QUESTIONS_PER_PHASE },
    );

    expect(result).toBe(input);
    expect(result.intro).toHaveLength(MAX_QUESTIONS_PER_PHASE);
    expect(result.main.map((q) => q.id)).toEqual(["m-1", "m-2"]);
  });

  it("still reorders items within a full phase", () => {
    const input = phases();
    input.intro = Array.from({ length: MAX_QUESTIONS_PER_PHASE }, (_, index) =>
      question(`i-${index + 1}`),
    );

    const result = moveQuestion(
      input,
      { phase: "intro", index: 0 },
      { phase: "intro", index: 1 },
    );

    expect(result.intro).toHaveLength(MAX_QUESTIONS_PER_PHASE);
    expect(result.intro.slice(0, 2).map((q) => q.id)).toEqual(["i-2", "i-1"]);
  });

  it("returns the input unchanged for an out-of-range source", () => {
    const input = phases();
    expect(moveQuestion(input, { phase: "outro", index: 0 }, { phase: "main", index: 0 })).toBe(input);
  });

  it("does not mutate the input", () => {
    const input = phases();
    moveQuestion(input, { phase: "main", index: 0 }, { phase: "intro", index: 0 });
    expect(input.main.map((q) => q.id)).toEqual(["m-1", "m-2"]);
    expect(input.intro.map((q) => q.id)).toEqual(["i-1"]);
  });
});
