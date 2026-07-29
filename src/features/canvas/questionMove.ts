import type { InterviewPhases } from "../../domain/types";
import { moveQuestion } from "../../domain/projectSchema";

type PhasePosition = {
  phase: keyof InterviewPhases;
  index: number;
};

type MoveQuestionWithAnnouncementOptions = {
  phases: InterviewPhases;
  source: PhasePosition;
  destination: PhasePosition;
  announce: (message: string) => void;
  blockedMessage: string;
  successMessage: string;
};

export function moveQuestionWithAnnouncement({
  phases,
  source,
  destination,
  announce,
  blockedMessage,
  successMessage,
}: MoveQuestionWithAnnouncementOptions) {
  const nextPhases = moveQuestion(phases, source, destination);
  const moved = nextPhases !== phases;
  announce(moved ? successMessage : blockedMessage);
  return { moved, phases: nextPhases };
}
