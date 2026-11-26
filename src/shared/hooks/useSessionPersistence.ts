import { useCallback, useEffect, useRef, useState } from "react";
import { parseInterviewProject, STORAGE_KEY } from "../../domain/projectSchema";
import { createDefaultInterviewState } from "../../domain/types";
import type { InterviewState } from "../../domain/types";
import { get, set, del } from "idb-keyval";
import { useTranslation } from "../../i18n";

export type StorageStatus = "loading" | "pending" | "saved" | "failed";
export type StorageRecovery = { kind: "corrupt" } | { kind: "unavailable" };

function withFreshMetadata(state: InterviewState): InterviewState {
  const allQuestions = [...state.phases.intro, ...state.phases.main, ...state.phases.outro];
  return {
    ...state,
    updated_at: new Date().toISOString(),
    total_estimated_time: allQuestions.reduce((sum, q) => sum + (q.estimated_minutes ?? 0), 0),
  };
}

function downloadRecoveryPayload(payload: unknown) {
  const contents = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  const url = URL.createObjectURL(new Blob([contents ?? ""], { type: "application/json;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "talkcreator-recovery.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function useSessionPersistence() {
  const [state, setStateRaw] = useState<InterviewState | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("loading");
  const [recovery, setRecovery] = useState<StorageRecovery | null>(null);
  const { locale } = useTranslation();
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const recoveryPayloadRef = useRef<unknown>(undefined);
  const writesAllowedRef = useRef(false);
  const persistInitialRef = useRef(false);
  const storageQueueRef = useRef<Promise<void>>(Promise.resolve());

  const pristineRef = useRef(false);
  const prevLocaleRef = useRef(locale);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let stored = await get(STORAGE_KEY);
        if (stored === undefined) {
          const legacy = localStorage.getItem(STORAGE_KEY);
          if (legacy !== null) {
            try { stored = JSON.parse(legacy); } catch { stored = legacy; }
          }
        }

        if (stored !== undefined) {
          const result = parseInterviewProject(stored);
          if (result.ok) {
            if (active) {
              writesAllowedRef.current = true;
              setStateRaw(result.state);
              setStorageStatus("saved");
            }
          } else if (active) {
            recoveryPayloadRef.current = stored;
            writesAllowedRef.current = false;
            setRecovery({ kind: "corrupt" });
            setStateRaw(createDefaultInterviewState(localeRef.current));
            setStorageStatus("failed");
          }
        } else if (active) {
          pristineRef.current = true;
          writesAllowedRef.current = true;
          persistInitialRef.current = true;
          setStateRaw(createDefaultInterviewState(localeRef.current));
          setStorageStatus("pending");
        }
      } catch (err) {
        console.error("Failed to load state", err);
        if (active) {
          writesAllowedRef.current = false;
          setRecovery({ kind: "unavailable" });
          setStateRaw(createDefaultInterviewState(localeRef.current));
          setStorageStatus("failed");
        }
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (prevLocaleRef.current === locale) return;
    prevLocaleRef.current = locale;
    if (pristineRef.current) setStateRaw(createDefaultInterviewState(locale));
  }, [locale]);

  const setState = useCallback((next: InterviewState) => {
    pristineRef.current = false;
    setStateRaw(next);
  }, []);

  // A confirmed import is an explicit replacement and can clear a recovery block.
  const applyProject = useCallback((next: InterviewState) => {
    pristineRef.current = false;
    dirtyRef.current = null;
    recoveryPayloadRef.current = undefined;
    setRecovery(null);
    writesAllowedRef.current = true;
    setStateRaw(next);
  }, []);

  const recoverWithFreshProject = useCallback(() => {
    dirtyRef.current = null;
    recoveryPayloadRef.current = undefined;
    setRecovery(null);
    writesAllowedRef.current = true;
    pristineRef.current = true;
    setStateRaw(createDefaultInterviewState(localeRef.current));
  }, []);

  const downloadRecovery = useCallback(() => {
    if (recoveryPayloadRef.current !== undefined) downloadRecoveryPayload(recoveryPayloadRef.current);
  }, []);

  const hydratedRef = useRef(false);
  const dirtyRef = useRef<InterviewState | null>(null);
  const saveVersionRef = useRef(0);
  const enqueueStorageOperation = useCallback((operation: () => Promise<void>) => {
    storageQueueRef.current = storageQueueRef.current.then(operation, operation);
    return storageQueueRef.current;
  }, []);
  const persist = useCallback(async (next: InterviewState, version: number) => {
    if (!writesAllowedRef.current) return;
    try {
      await enqueueStorageOperation(() => set(STORAGE_KEY, withFreshMetadata(next)));
      if (version === saveVersionRef.current) setStorageStatus("saved");
    } catch (err) {
      console.error("Failed to save state", err);
      if (version === saveVersionRef.current) setStorageStatus("failed");
    }
  }, [enqueueStorageOperation]);

  useEffect(() => {
    if (!state) return;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      if (!persistInitialRef.current) return;
      persistInitialRef.current = false;
    }
    if (!writesAllowedRef.current) return;
    dirtyRef.current = state;
    const version = ++saveVersionRef.current;
    setStorageStatus("pending");
    const timeout = setTimeout(() => {
      const next = dirtyRef.current;
      dirtyRef.current = null;
      if (next) void persist(next, version);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [state, persist]);

  useEffect(() => {
    function flush() {
      if (dirtyRef.current && writesAllowedRef.current) {
        const next = dirtyRef.current;
        dirtyRef.current = null;
        void persist(next, saveVersionRef.current);
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [persist]);

  useEffect(() => () => {
    if (dirtyRef.current && writesAllowedRef.current) {
      const next = dirtyRef.current;
      dirtyRef.current = null;
      void persist(next, saveVersionRef.current);
    }
  }, [persist]);

  const clearSession = useCallback(() => {
    dirtyRef.current = null;
    const version = ++saveVersionRef.current;
    setStorageStatus("pending");
    void enqueueStorageOperation(() => del(STORAGE_KEY)).catch((err) => {
      console.error("Failed to clear saved state", err);
      if (version === saveVersionRef.current) setStorageStatus("failed");
    });
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { console.error("Failed to clear legacy state", err); }
    recoveryPayloadRef.current = undefined;
    setRecovery(null);
    writesAllowedRef.current = true;
    pristineRef.current = true;
    setStateRaw(createDefaultInterviewState(localeRef.current));
  }, [enqueueStorageOperation]);

  return { state, setState, clearSession, applyProject, storageStatus, recovery, downloadRecovery, recoverWithFreshProject };
}
