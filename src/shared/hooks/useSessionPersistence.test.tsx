// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "../../domain/projectSchema";
import { LocaleProvider } from "../../i18n";
import { useSessionPersistence } from "./useSessionPersistence";

const storage = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }));
vi.mock("idb-keyval", () => storage);

function Harness() {
  const session = useSessionPersistence();
  return <>
    <output aria-label="state">{session.state?.title}</output>
    <output aria-label="storage status">{session.storageStatus}</output>
    <output aria-label="recovery">{session.recovery?.kind ?? "none"}</output>
    <button onClick={session.downloadRecovery}>Download recovery</button>
    <button onClick={session.recoverWithFreshProject}>Start fresh</button>
    <button onClick={() => session.setState({ ...session.state!, title: "Edited project" })}>Edit</button>
    <button onClick={() => session.setState({ ...session.state!, title: "Newest project" })}>Edit newest</button>
    <button onClick={session.clearSession}>Clear</button>
  </>;
}

function renderHarness() {
  return render(<LocaleProvider><Harness /></LocaleProvider>);
}

function savedProject(title = "Saved project") {
  return {
    schemaVersion: 1,
    id: "saved",
    title,
    partner: "",
    created_at: "2026-07-29T00:00:00.000Z",
    updated_at: "2026-07-29T00:00:00.000Z",
    total_estimated_time: 0,
    phases: { intro: [], main: [], outro: [] },
    checklist: [],
    sources: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  storage.get.mockReset();
  storage.set.mockReset();
  storage.del.mockReset();
});

beforeEach(() => {
  vi.stubGlobal("localStorage", { getItem: () => null, removeItem: vi.fn(), clear: vi.fn() });
  storage.get.mockResolvedValue(undefined);
  storage.set.mockResolvedValue(undefined);
  storage.del.mockResolvedValue(undefined);
});

describe("useSessionPersistence recovery and status", () => {
  it.each([null, false, 0, ""])("preserves a malformed stored value (%s)", async (stored) => {
    storage.get.mockResolvedValue(stored);
    renderHarness();
    expect(await screen.findByLabelText("recovery")).toHaveTextContent("corrupt");
    expect(storage.set).not.toHaveBeenCalled();
  });

  it("preserves corrupt IndexedDB data until fresh start is explicitly chosen", async () => {
    const corrupt = { schemaVersion: 1, title: "Unrecognized saved data" };
    storage.get.mockResolvedValue(corrupt);
    storage.set.mockResolvedValue(undefined);
    renderHarness();

    expect(await screen.findByLabelText("recovery")).toHaveTextContent("corrupt");
    expect(screen.getByLabelText("storage status")).toHaveTextContent("failed");
    await act(async () => new Promise((resolve) => setTimeout(resolve, 1100)));
    expect(storage.set).not.toHaveBeenCalled();

    await act(async () => { screen.getByRole("button", { name: "Start fresh" }).click(); });
    expect(screen.getByLabelText("recovery")).toHaveTextContent("none");
    await waitFor(() => expect(storage.set).toHaveBeenCalledWith(STORAGE_KEY, expect.objectContaining({ schemaVersion: 1 })), { timeout: 3000 });
  });

  it("reports unavailable storage and does not claim the in-memory default is saved", async () => {
    storage.get.mockRejectedValue(new Error("IndexedDB blocked"));
    renderHarness();

    expect(await screen.findByLabelText("recovery")).toHaveTextContent("unavailable");
    expect(screen.getByLabelText("storage status")).toHaveTextContent("failed");
    expect(storage.set).not.toHaveBeenCalled();
  });

  it("keeps a new empty project pending until its first save completes", async () => {
    const firstSave = deferred<void>();
    storage.set.mockReturnValue(firstSave.promise);
    renderHarness();
    expect(await screen.findByLabelText("storage status")).toHaveTextContent("pending");
    await waitFor(() => expect(storage.set).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(screen.getByLabelText("storage status")).toHaveTextContent("pending");
    await act(async () => { firstSave.resolve(); });
    await waitFor(() => expect(screen.getByLabelText("storage status")).toHaveTextContent("saved"));
  });

  it("parses a valid legacy localStorage project", async () => {
    storage.get.mockResolvedValue(undefined);
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify({
        schemaVersion: 1,
        id: "legacy",
        title: "Legacy project",
        partner: "",
        created_at: "2026-07-29T00:00:00.000Z",
        updated_at: "2026-07-29T00:00:00.000Z",
        total_estimated_time: 0,
        phases: { intro: [], main: [], outro: [] },
        checklist: [],
        sources: [],
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    renderHarness();
    expect(await screen.findByLabelText("state")).toHaveTextContent("Legacy project");
    expect(screen.getByLabelText("recovery")).toHaveTextContent("none");
  });

  it("reports a failed write rather than a saved state", async () => {
    storage.get.mockResolvedValue(undefined);
    storage.set.mockRejectedValue(new Error("quota exceeded"));
    renderHarness();
    expect(await screen.findByLabelText("state")).not.toBeEmptyDOMElement();
    await act(async () => { screen.getByRole("button", { name: "Edit" }).click(); });
    await waitFor(() => expect(screen.getByLabelText("storage status")).toHaveTextContent("failed"), { timeout: 3000 });
  });

  it("serializes writes so a slow older write cannot finish after the newest one", async () => {
    storage.get.mockResolvedValue(savedProject());
    const firstWrite = deferred<void>();
    const newestWrite = deferred<void>();
    storage.set.mockImplementationOnce(() => firstWrite.promise).mockImplementationOnce(() => newestWrite.promise);
    renderHarness();
    expect(await screen.findByLabelText("state")).toHaveTextContent("Saved project");

    await act(async () => { screen.getByRole("button", { name: "Edit" }).click(); });
    await waitFor(() => expect(storage.set).toHaveBeenCalledTimes(1), { timeout: 3000 });
    await act(async () => { screen.getByRole("button", { name: "Edit newest" }).click(); });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 1100)));
    expect(storage.set).toHaveBeenCalledTimes(1);

    await act(async () => { firstWrite.resolve(); });
    await waitFor(() => expect(storage.set).toHaveBeenCalledTimes(2));
    expect(storage.set.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ title: "Newest project" }));
    expect(screen.getByLabelText("storage status")).toHaveTextContent("pending");
    await act(async () => { newestWrite.resolve(); });
    await waitFor(() => expect(screen.getByLabelText("storage status")).toHaveTextContent("saved"));
  });

  it("serializes reset deletion before writing the fresh project", async () => {
    storage.get.mockResolvedValue(savedProject());
    const deletion = deferred<void>();
    storage.del.mockReturnValue(deletion.promise);
    renderHarness();
    expect(await screen.findByLabelText("state")).toHaveTextContent("Saved project");

    await act(async () => { screen.getByRole("button", { name: "Clear" }).click(); });
    expect(storage.del).toHaveBeenCalledTimes(1);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 1100)));
    expect(storage.set).not.toHaveBeenCalled();

    await act(async () => { deletion.resolve(); });
    await waitFor(() => expect(storage.set).toHaveBeenCalledTimes(1));
    expect(storage.set.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ title: "Our Podcast Interview" }));
  });

  it("downloads the original corrupt payload on request", async () => {
    const corrupt = "{broken saved data";
    storage.get.mockResolvedValue(corrupt);
    const createObjectURL = vi.fn(() => "blob:recovery");
    const revokeObjectURL = vi.fn();
    vi.spyOn(URL, "createObjectURL").mockImplementation(createObjectURL);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(revokeObjectURL);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderHarness();

    await screen.findByLabelText("recovery");
    screen.getByRole("button", { name: "Download recovery" }).click();
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:recovery");
  });
});
