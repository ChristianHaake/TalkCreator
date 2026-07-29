// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  MAX_PROJECT_FILE_BYTES,
  PROJECT_SCHEMA_VERSION,
} from "../../domain/projectSchema";
import type { InterviewState } from "../../domain/types";
import { LocaleProvider } from "../../i18n";
import { useProjectStorage } from "./useProjectStorage";

const currentProject: InterviewState = {
  schemaVersion: PROJECT_SCHEMA_VERSION,
  id: "current",
  title: "Current project",
  partner: "",
  created_at: "2026-07-29T00:00:00.000Z",
  updated_at: "2026-07-29T00:00:00.000Z",
  total_estimated_time: 0,
  phases: { intro: [], main: [], outro: [] },
  checklist: [],
  sources: [],
};

const importedProject = {
  ...currentProject,
  id: "imported",
  title: "Imported project",
};

function Harness() {
  const [state, setState] = useState(currentProject);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    handleUpload,
    pendingImport,
    importError,
    confirmImport,
    cancelImport,
  } = useProjectStorage(state, setState);

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()}>
        Laden
      </button>
      <input
        aria-label="Projektdatei"
        onChange={handleUpload}
        ref={inputRef}
        type="file"
      />
      <output aria-label="Aktuelles Projekt">{state.title}</output>
      {importError && <p role="alert">{importError}</p>}
      {pendingImport && (
        <ConfirmDialog
          title="Projekt importieren?"
          message="Das aktuelle Projekt wird ersetzt."
          confirmLabel="Projekt importieren"
          danger
          onConfirm={confirmImport}
          onCancel={cancelImport}
        />
      )}
    </>
  );
}

function renderHarness() {
  return render(
    <LocaleProvider>
      <Harness />
    </LocaleProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useProjectStorage import flow", () => {
  it("keeps the current project until a valid import is confirmed", async () => {
    const user = userEvent.setup();
    renderHarness();
    const loadButton = screen.getByRole("button", { name: "Laden" });
    const input = screen.getByLabelText("Projektdatei");
    const file = new File(
      [JSON.stringify(importedProject)],
      "project.json",
      { type: "application/json" },
    );

    loadButton.focus();
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Aktuelles Projekt")).toHaveTextContent(
      "Current project",
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Aktuelles Projekt")).toHaveTextContent(
      "Current project",
    );
    expect(loadButton).toHaveFocus();

    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Aktuelles Projekt")).toHaveTextContent(
      "Current project",
    );
    expect(loadButton).toHaveFocus();

    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Projekt importieren" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Aktuelles Projekt")).toHaveTextContent(
      "Imported project",
    );

    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("shows invalid files inline and never opens confirmation", async () => {
    const user = userEvent.setup();
    renderHarness();
    const input = screen.getByLabelText("Projektdatei");

    await user.upload(
      input,
      new File(["{"], "invalid.json", { type: "application/json" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "does not contain valid JSON",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Aktuelles Projekt")).toHaveTextContent(
      "Current project",
    );

    await user.upload(
      input,
      new File(
        [JSON.stringify({ ...importedProject, schemaVersion: "1" })],
        "wrong-schema.json",
        { type: "application/json" },
      ),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "schema version is invalid",
      );
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("rejects oversized files before reading them", async () => {
    const user = userEvent.setup();
    renderHarness();
    const input = screen.getByLabelText("Projektdatei");

    await user.upload(
      input,
      new File(
        ["x".repeat(MAX_PROJECT_FILE_BYTES + 1)],
        "large.json",
        { type: "application/json" },
      ),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The project file is too large",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ignores an older file read that finishes after the latest selection", async () => {
    class ControlledFileReader {
      static instances: ControlledFileReader[] = [];
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: (() => void) | null = null;

      readAsText() {
        ControlledFileReader.instances.push(this);
      }

      finish(contents: string) {
        this.onload?.({
          target: { result: contents },
        } as unknown as ProgressEvent<FileReader>);
      }
    }
    vi.stubGlobal("FileReader", ControlledFileReader);
    const user = userEvent.setup();
    renderHarness();
    const input = screen.getByLabelText("Projektdatei");
    const older = new File(["older"], "older.json", {
      type: "application/json",
    });
    const newer = new File(["newer"], "newer.json", {
      type: "application/json",
    });

    fireEvent.change(input, { target: { files: [older] } });
    fireEvent.change(input, { target: { files: [newer] } });
    expect(ControlledFileReader.instances).toHaveLength(2);

    ControlledFileReader.instances[1]?.finish(
      JSON.stringify({ ...importedProject, title: "Latest project" }),
    );
    ControlledFileReader.instances[0]?.finish("{");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Projekt importieren" }),
    );
    expect(screen.getByLabelText("Aktuelles Projekt")).toHaveTextContent(
      "Latest project",
    );
  });
});
