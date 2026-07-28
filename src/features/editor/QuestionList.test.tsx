// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { DragDropContext } from "@hello-pangea/dnd";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Question } from "../../domain/types";
import { LocaleProvider } from "../../i18n";
import { MAX_QUESTIONS_PER_PHASE, MAX_TEXT_LENGTH } from "../../domain/projectSchema";
import { QuestionList } from "./QuestionList";

const initialQuestions: Question[] = [
  {
    id: "question-1",
    text: "First question",
    notes: "First note",
    estimated_minutes: 2,
    is_backup: true,
  },
  {
    id: "question-2",
    text: "Second question",
    notes: "",
    estimated_minutes: 5,
    is_backup: false,
  },
];

class MemoryStorage implements Storage {
  private items = new Map<string, string>();

  get length() {
    return this.items.size;
  }

  clear() {
    this.items.clear();
  }

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.items.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.items.delete(key);
  }

  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

function Harness({ questions: initial = initialQuestions }: { questions?: Question[] }) {
  const [questions, setQuestions] = useState(initial);

  return (
    <LocaleProvider>
      <DragDropContext onDragEnd={() => undefined}>
        <QuestionList
          title="Main Part"
          droppableId="main-list"
          emptyMessage="No items"
          phaseKey="main"
          questions={questions}
          onChange={setQuestions}
        />
      </DragDropContext>
    </LocaleProvider>
  );
}

function CrossPhaseHarness() {
  const [main, setMain] = useState(initialQuestions);
  const [outro, setOutro] = useState<Question[]>([]);

  const moveFirstItem = () => {
    const [moved, ...remaining] = main;
    if (!moved) return;
    setMain(remaining);
    setOutro([moved]);
  };

  return (
    <LocaleProvider>
      <button type="button" onClick={moveFirstItem}>
        Move active item across phases
      </button>
      <DragDropContext onDragEnd={() => undefined}>
        <QuestionList
          title="Main Part"
          droppableId="main-list"
          emptyMessage="No main items"
          phaseKey="main"
          questions={main}
          onChange={setMain}
        />
        <QuestionList
          title="Conclusion"
          droppableId="outro-list"
          emptyMessage="No conclusion items"
          phaseKey="outro"
          questions={outro}
          onChange={setOutro}
        />
      </DragDropContext>
    </LocaleProvider>
  );
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
  window.localStorage.setItem("interview-creator-locale", "en");
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("QuestionList compact editing", () => {
  it("starts collapsed and exposes summary metadata", () => {
    render(<Harness />);

    const summary = screen.getByRole("button", { name: "Edit item 1" });
    expect(summary).toHaveAttribute("aria-expanded", "false");
    expect(summary).toHaveAttribute("aria-controls", "question-editor-question-1");
    expect(summary).toHaveAccessibleDescription("First question. ~2 Min. Optional");
    expect(screen.queryByRole("textbox", { name: "Item 1" })).not.toBeInTheDocument();
    expect(screen.getByText("~2 Min")).toBeInTheDocument();
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("keeps one item open and restores summary focus after Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Edit item 1" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Item 1" })).toHaveFocus());

    await user.click(screen.getByRole("button", { name: "Done: Item 1" }));
    const firstSummary = screen.getByRole("button", { name: "Edit item 1" });
    await waitFor(() => expect(firstSummary).toHaveFocus());
    await user.click(firstSummary);

    await user.click(screen.getByRole("button", { name: "Edit item 2" }));
    expect(screen.queryByRole("textbox", { name: "Item 1" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Item 2" })).toHaveFocus());

    await user.keyboard("{Escape}");
    const secondSummary = screen.getByRole("button", { name: "Edit item 2" });
    await waitFor(() => expect(secondSummary).toHaveFocus());
    expect(screen.queryByRole("textbox", { name: "Item 2" })).not.toBeInTheDocument();
  });

  it("preserves edits when Done collapses the item", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Edit item 1" }));
    const textarea = screen.getByRole("textbox", { name: "Item 1" });
    await user.clear(textarea);
    await user.type(textarea, "Updated question");
    await user.click(screen.getByRole("button", { name: "Done" }));

    const summary = screen.getByRole("button", { name: "Edit item 1" });
    expect(summary).toHaveFocus();
    expect(summary).toHaveAccessibleDescription("Updated question. ~2 Min. Optional");
    expect(screen.queryByRole("textbox", { name: "Item 1" })).not.toBeInTheDocument();
  });

  it("adds, opens, scrolls to, and focuses a blank item with constrained fields", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Add element" }));

    const textarea = screen.getByRole("textbox", { name: "Item 3" });
    await waitFor(() => expect(textarea).toHaveFocus());
    expect(textarea).toHaveValue("");
    expect(textarea).toHaveAttribute("maxlength", String(MAX_TEXT_LENGTH));
    expect(screen.getByRole("textbox", { name: "Bullet points / Notes (optional)" })).toHaveAttribute(
      "maxlength",
      String(MAX_TEXT_LENGTH),
    );
    expect(screen.getByRole("spinbutton", { name: "Duration (Min):" })).toHaveValue(2);
    expect(screen.getByRole("checkbox", { name: "Optional / Backup" })).not.toBeChecked();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "nearest",
    });
  });

  it("opens and focuses an inserted suggestion", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Suggestions" }));
    const suggestion = screen.getAllByRole("button", { name: /Insert suggestion:/ })[0];
    expect(suggestion).toBeDefined();
    await user.click(suggestion!);

    const textarea = screen.getByRole("textbox", { name: "Item 3" });
    await waitFor(() => expect(textarea).toHaveFocus());
    expect(textarea).not.toHaveValue("");
  });

  it("restores focus to the next summary after deletion", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Delete item 1" }));

    const remainingSummary = screen.getByRole("button", { name: "Edit item 1" });
    await waitFor(() => expect(remainingSummary).toHaveFocus());
    expect(screen.queryByText("First question")).not.toBeInTheDocument();
  });

  it("preserves item data when using the keyboard move controls", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Move item 1 down" }));

    const firstSummary = screen.getByRole("button", { name: "Edit item 1" });
    const secondSummary = screen.getByRole("button", { name: "Edit item 2" });
    expect(firstSummary).toHaveTextContent("Second question");
    expect(secondSummary).toHaveTextContent("First question");

    await user.click(secondSummary);
    expect(screen.getByRole("textbox", { name: "Item 2" })).toHaveValue("First question");
    expect(screen.getByRole("textbox", { name: "Bullet points / Notes (optional)" })).toHaveValue(
      "First note",
    );
    expect(screen.getByRole("checkbox", { name: "Optional / Backup" })).toBeChecked();
  });

  it("collapses an expanded item after it moves to another phase", async () => {
    const user = userEvent.setup();
    render(<CrossPhaseHarness />);

    await user.click(screen.getByRole("button", { name: "Edit item 1" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Item 1" })).toHaveFocus());

    await user.click(screen.getByRole("button", { name: "Move active item across phases" }));

    expect(screen.queryByRole("textbox", { name: "Item 1" })).not.toBeInTheDocument();
    const movedSummary = screen.getAllByRole("button", { name: "Edit item 1" })[1];
    expect(movedSummary).toHaveAttribute("aria-expanded", "false");
    expect(movedSummary).toHaveAccessibleDescription("First question. ~2 Min. Optional");
  });

  it("disables all creation paths at the per-section limit", async () => {
    const user = userEvent.setup();
    const questions = Array.from({ length: MAX_QUESTIONS_PER_PHASE }, (_, index) => ({
      id: `question-${index}`,
      text: `Question ${index + 1}`,
      notes: "",
      estimated_minutes: 2,
      is_backup: false,
    }));
    render(<Harness questions={questions} />);

    expect(screen.getByRole("button", { name: "Add element" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      `Maximum of ${MAX_QUESTIONS_PER_PHASE} items per section.`,
    );

    await user.click(screen.getByRole("button", { name: "Suggestions" }));
    for (const suggestion of screen.getAllByRole("button", { name: /Insert suggestion:/ })) {
      expect(suggestion).toBeDisabled();
    }
  });
});
