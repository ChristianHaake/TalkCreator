// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { DragDropContext } from "@hello-pangea/dnd";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_CHECKLIST_ITEMS,
  MAX_QUESTIONS_PER_PHASE,
  MAX_SOURCES,
  MAX_TEXT_LENGTH,
} from "../../domain/projectSchema";
import type { InterviewState } from "../../domain/types";
import { LocaleProvider } from "../../i18n";
import { TalkCanvas } from "./TalkCanvas";

const baseState: InterviewState = {
  schemaVersion: 1,
  id: "project-1",
  title: "Planning a podcast",
  partner: "Class 8",
  created_at: "2026-07-29T00:00:00.000Z",
  updated_at: "2026-07-29T00:00:00.000Z",
  total_estimated_time: 5,
  target_minutes: 12,
  phases: {
    intro: [],
    main: [
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
        estimated_minutes: 3,
        is_backup: false,
      },
    ],
    outro: [],
  },
  checklist: [
    { id: "checklist-1", text: "Test microphone", checked: false },
  ],
  sources: [
    {
      id: "source-1",
      title: "Podcast guide",
      url: "https://example.com/guide",
    },
  ],
};

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

function Harness({ initial = baseState }: { initial?: InterviewState }) {
  const [state, setState] = useState(initial);
  return (
    <LocaleProvider>
      <DragDropContext onDragEnd={() => undefined}>
        <TalkCanvas state={state} onChange={setState} />
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

describe("TalkCanvas", () => {
  it("renders the complete talk plan as one document", () => {
    render(<Harness />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Planning a podcast" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Edit project title:/ })).toHaveTextContent(
      "Planning a podcast",
    );
    expect(
      screen.getByRole("button", { name: /^Edit target or participants:/ }),
    ).toHaveTextContent("Class 8");
    expect(screen.getByText("First question")).toBeInTheDocument();
    expect(screen.getByText("First note")).toBeInTheDocument();
    expect(screen.getByText("Test microphone")).toBeInTheDocument();
    expect(screen.getByText("Podcast guide")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://example.com/guide" })).toHaveAttribute(
      "href",
      "https://example.com/guide",
    );
  });

  it("qualifies drag identities when imported phases reuse a question id", () => {
    const duplicateIdState: InterviewState = {
      ...baseState,
      phases: {
        ...baseState.phases,
        intro: [
          {
            ...baseState.phases.main[0]!,
            text: "Intro duplicate",
          },
        ],
      },
    };
    const { container } = render(<Harness initial={duplicateIdState} />);

    const draggableIds = Array.from(
      container.querySelectorAll<HTMLElement>("[data-rfd-draggable-id]"),
      (element) => element.dataset.rfdDraggableId,
    );
    expect(draggableIds).toContain("intro:question-1");
    expect(draggableIds).toContain("main:question-1");
    expect(new Set(draggableIds).size).toBe(draggableIds.length);
  });

  it("edits metadata in place and keeps only one target active", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /^Edit project title:/ }));
    const titleInput = screen.getByRole("textbox", { name: "Project Title / Topic:" });
    expect(titleInput).toHaveFocus();
    expect(titleInput).toHaveAttribute("maxlength", String(MAX_TEXT_LENGTH));
    await user.clear(titleInput);
    await user.type(titleInput, "Updated podcast");

    await user.click(
      screen.getByRole("button", { name: /^Edit target or participants:/ }),
    );
    expect(
      screen.queryByRole("textbox", { name: "Project Title / Topic:" }),
    ).not.toBeInTheDocument();
    const partnerInput = screen.getByRole("textbox", {
      name: "Target / Participants:",
    });
    expect(partnerInput).toHaveFocus();

    await user.keyboard("{Escape}");
    const partnerButton = screen.getByRole("button", {
      name: /^Edit target or participants:/,
    });
    await waitFor(() => expect(partnerButton).toHaveFocus());
    expect(screen.getByText("Updated podcast")).toBeInTheDocument();
  });

  it("edits a rendered question and restores its focus on Done", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /^Edit item 1:/ }));
    const questionInput = screen.getByRole("textbox", { name: "Item 1" });
    expect(questionInput).toHaveFocus();
    expect(questionInput).toHaveAttribute("maxlength", String(MAX_TEXT_LENGTH));
    expect(
      screen.getByRole("textbox", { name: "Bullet points / Notes (optional)" }),
    ).toHaveValue("First note");
    expect(screen.getByRole("checkbox", { name: "Optional / Backup" })).toBeChecked();

    await user.clear(questionInput);
    await user.type(questionInput, "Updated question");
    await user.click(screen.getByRole("button", { name: "Done" }));

    const editButton = screen.getByRole("button", { name: /^Edit item 1:/ });
    await waitFor(() => expect(editButton).toHaveFocus());
    expect(editButton).toHaveTextContent("Updated question");
    expect(editButton).toHaveTextContent("Optional");
    expect(editButton).toHaveTextContent("~2 Min");
  });

  it("edits target time, checklist state, and existing sources in the canvas", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /^Edit target duration:/ }));
    const targetInput = screen.getByRole("spinbutton", { name: "Target time (min):" });
    expect(targetInput).toHaveValue(12);
    await user.clear(targetInput);
    await user.type(targetInput, "20");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: /^Edit target duration:/ })).toHaveTextContent(
      "20",
    );

    const checklistToggle = screen.getByRole("checkbox", {
      name: "Toggle checklist item 1",
    });
    await user.click(checklistToggle);
    expect(checklistToggle).toBeChecked();

    await user.click(screen.getByRole("button", { name: /^Edit source 1:/ }));
    const sourceTitle = screen.getByRole("textbox", { name: "Source title" });
    const sourceUrl = screen.getByRole("textbox", { name: "Source URL" });
    expect(sourceTitle).toHaveAttribute("maxlength", String(MAX_TEXT_LENGTH));
    expect(sourceUrl).toHaveAttribute("maxlength", String(MAX_TEXT_LENGTH));
    await user.clear(sourceTitle);
    await user.type(sourceTitle, "Updated source");
    await user.clear(sourceUrl);
    await user.type(sourceUrl, "https://example.com/updated");
    await user.keyboard("{Escape}");

    expect(screen.getByText("Updated source")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "https://example.com/updated" }),
    ).toHaveAttribute("href", "https://example.com/updated");
  });

  it("adds questions and suggestions inside the selected phase", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const mainSection = screen
      .getByRole("heading", { name: "Main Part / Core" })
      .closest("section");
    expect(mainSection).not.toBeNull();
    const main = within(mainSection!);

    await user.click(main.getByRole("button", { name: "Add element" }));
    const blankQuestion = screen.getByRole("textbox", { name: "Item 3" });
    expect(blankQuestion).toHaveFocus();
    expect(blankQuestion).toHaveValue("");
    await user.keyboard("{Escape}");

    await user.click(main.getByRole("button", { name: "Suggestions" }));
    const suggestions = main.getAllByRole("button", { name: /Insert suggestion:/ });
    expect(suggestions.length).toBeGreaterThan(0);
    await user.click(suggestions[0]!);
    const suggestedQuestion = screen.getByRole("textbox", { name: "Item 4" });
    expect(suggestedQuestion).toHaveFocus();
    expect(suggestedQuestion).not.toHaveValue("");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("adds checklist items and sources in the document and focuses them", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Add checklist item" }));
    const checklistInput = screen.getByRole("textbox", { name: "Checklist item" });
    expect(checklistInput).toHaveFocus();
    await user.type(checklistInput, "Bring headphones");
    await user.keyboard("{Escape}");
    expect(screen.getByText("Bring headphones")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add Source" }));
    const sourceTitle = screen.getByRole("textbox", { name: "Source title" });
    expect(sourceTitle).toHaveFocus();
    await user.type(sourceTitle, "Interview handbook");
    await user.keyboard("{Escape}");
    expect(screen.getByText("Interview handbook")).toBeInTheDocument();
  });

  it("preserves question data with keyboard movement and deletion focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Move item 1 down" }));
    const first = screen.getByRole("button", { name: /^Edit item 1:/ });
    const second = screen.getByRole("button", { name: /^Edit item 2:/ });
    expect(first).toHaveTextContent("Second question");
    expect(second).toHaveTextContent("First question");
    expect(second).toHaveTextContent("First note");

    await user.click(screen.getByRole("button", { name: "Delete item 1" }));
    const remaining = screen.getByRole("button", { name: /^Edit item 1:/ });
    await waitFor(() => expect(remaining).toHaveFocus());
    expect(remaining).toHaveTextContent("First question");
  });

  it("disables every creation path at its configured limit", async () => {
    const user = userEvent.setup();
    const fullState: InterviewState = {
      ...baseState,
      phases: {
        ...baseState.phases,
        main: Array.from({ length: MAX_QUESTIONS_PER_PHASE }, (_, index) => ({
          id: `question-${index}`,
          text: `Question ${index + 1}`,
          notes: "",
          estimated_minutes: 2,
          is_backup: false,
        })),
      },
      checklist: Array.from({ length: MAX_CHECKLIST_ITEMS }, (_, index) => ({
        id: `checklist-${index}`,
        text: `Checklist ${index + 1}`,
        checked: false,
      })),
      sources: Array.from({ length: MAX_SOURCES }, (_, index) => ({
        id: `source-${index}`,
        title: `Source ${index + 1}`,
        url: "",
      })),
    };
    render(<Harness initial={fullState} />);
    const mainSection = screen
      .getByRole("heading", { name: "Main Part / Core" })
      .closest("section");
    expect(mainSection).not.toBeNull();
    const main = within(mainSection!);

    expect(main.getByRole("button", { name: "Add element" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add checklist item" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add Source" })).toBeDisabled();

    await user.click(main.getByRole("button", { name: "Suggestions" }));
    for (const suggestion of main.getAllByRole("button", {
      name: /Insert suggestion:/,
    })) {
      expect(suggestion).toBeDisabled();
    }

    expect(screen.getByText(`Maximum of ${MAX_CHECKLIST_ITEMS} checklist items.`)).toBeInTheDocument();
    expect(screen.getByText(`Maximum of ${MAX_SOURCES} sources.`)).toBeInTheDocument();
  });

  it("never renders javascript source URLs as links", () => {
    render(
      <Harness
        initial={{
          ...baseState,
          sources: [
            {
              id: "unsafe-source",
              title: "Unsafe source",
              url: "javascript:alert(1)",
            },
          ],
        }}
      />,
    );

    expect(screen.queryByRole("link", { name: "javascript:alert(1)" })).not.toBeInTheDocument();
    expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument();
  });

  it("returns to the clean document state before printing", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /^Edit item 1:/ }));
    expect(screen.getByRole("textbox", { name: "Item 1" })).toBeInTheDocument();

    window.dispatchEvent(new Event("beforeprint"));

    expect(screen.queryByRole("textbox", { name: "Item 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Edit item 1:/ })).toHaveTextContent(
      "First question",
    );
  });
});
