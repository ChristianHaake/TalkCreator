import { describe, expect, it, vi } from "vitest";
import { MAX_QUESTIONS_PER_PHASE } from "../../domain/projectSchema";
import type { InterviewPhases, Question } from "../../domain/types";
import { moveQuestionWithAnnouncement } from "./questionMove";

const question = (id: string): Question => ({ id, text: id, notes: "" });

describe("moveQuestionWithAnnouncement", () => {
  it("announces every repeated blocked cross-phase drop", () => {
    const phases: InterviewPhases = {
      intro: [question("source")],
      main: Array.from({ length: MAX_QUESTIONS_PER_PHASE }, (_, index) =>
        question(`destination-${index}`),
      ),
      outro: [],
    };
    const announce = vi.fn();
    const options = {
      phases,
      source: { phase: "intro" as const, index: 0 },
      destination: { phase: "main" as const, index: MAX_QUESTIONS_PER_PHASE },
      announce,
      blockedMessage: "Destination is full.",
      successMessage: "Item moved.",
    };

    const first = moveQuestionWithAnnouncement(options);
    const second = moveQuestionWithAnnouncement(options);

    expect(first).toEqual({ moved: false, phases });
    expect(second).toEqual({ moved: false, phases });
    expect(announce).toHaveBeenNthCalledWith(1, "Destination is full.");
    expect(announce).toHaveBeenNthCalledWith(2, "Destination is full.");
  });

  it("announces a successful move and returns the updated phases", () => {
    const phases: InterviewPhases = {
      intro: [question("source")],
      main: [],
      outro: [],
    };
    const announce = vi.fn();

    const result = moveQuestionWithAnnouncement({
      phases,
      source: { phase: "intro", index: 0 },
      destination: { phase: "main", index: 0 },
      announce,
      blockedMessage: "Destination is full.",
      successMessage: "Item moved.",
    });

    expect(result.moved).toBe(true);
    expect(result.phases.intro).toHaveLength(0);
    expect(result.phases.main.map((item) => item.id)).toEqual(["source"]);
    expect(announce).toHaveBeenCalledOnce();
    expect(announce).toHaveBeenCalledWith("Item moved.");
  });
});
