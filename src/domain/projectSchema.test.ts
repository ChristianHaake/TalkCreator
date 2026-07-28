import { describe, expect, it } from "vitest";
import {
  MAX_CHECKLIST_ITEMS,
  MAX_QUESTIONS_PER_PHASE,
  moveQuestion,
  parseInterviewProject,
  parseProjectJson,
  PROJECT_SCHEMA_VERSION,
} from "./projectSchema";
import type { InterviewPhases, Question } from "./types";

describe("project schema", () => {
  it("accepts and normalizes a current project file", () => {
    const result = parseInterviewProject({
      schemaVersion: PROJECT_SCHEMA_VERSION,
      id: "project-1",
      title: "Interview",
      partner: "Ada Lovelace",
      created_at: "2026-06-30T10:00:00.000Z",
      updated_at: "2026-06-30T10:05:00.000Z",
      phases: {
        intro: [{ id: "q-1", text: "Intro?", notes: "", estimated_minutes: 2 }],
        main: [{ id: "q-2", text: "Main?", notes: "Ask follow-up", estimated_minutes: 4 }],
        outro: [],
      },
      checklist: [{ id: "c-1", text: "Mic", checked: true }],
      sources: [{ id: "s-1", title: "Source", url: "https://example.com" }],
    });

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

  it("rejects future schema versions", () => {
    const result = parseInterviewProject({
      schemaVersion: PROJECT_SCHEMA_VERSION + 1,
      title: "Future",
      phases: { intro: [], main: [], outro: [] },
    });

    expect(result).toEqual({ ok: false, reason: "future-version" });
  });

  it("rejects invalid JSON and unknown shapes", () => {
    expect(parseProjectJson("{")).toEqual({ ok: false, reason: "invalid-json" });
    expect(parseInterviewProject({ arbitrary: true })).toEqual({ ok: false, reason: "missing-project-content" });
  });

  it("limits imported arrays", () => {
    const result = parseInterviewProject({
      title: "Large",
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
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.phases.intro).toHaveLength(MAX_QUESTIONS_PER_PHASE);
    expect(result.state.checklist).toHaveLength(MAX_CHECKLIST_ITEMS);
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
