import { Draggable, Droppable } from "@hello-pangea/dnd";
import {
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
  Lightbulb,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { KeyboardEvent, RefCallback } from "react";
import {
  MAX_CHECKLIST_ITEMS,
  MAX_ESTIMATED_MINUTES,
  MAX_QUESTIONS_PER_PHASE,
  MAX_SOURCES,
  MAX_TEXT_LENGTH,
} from "../../domain/projectSchema";
import { getImpulses, type PhaseKey } from "../../domain/impulses";
import type {
  ChecklistItem,
  InterviewState,
  Question,
  SourceItem,
} from "../../domain/types";
import { useTranslation } from "../../i18n";
import styles from "./TalkCanvas.module.css";

type Props = {
  state: InterviewState;
  onChange: (state: InterviewState) => void;
};

const metadataTitleKey = "metadata:title";
const metadataPartnerKey = "metadata:partner";
const targetMinutesKey = "metadata:target-minutes";

const checklistKey = (id: string) => `checklist:${id}`;
const questionKey = (phase: PhaseKey, id: string) => `question:${phase}:${id}`;
const sourceKey = (id: string) => `source:${id}`;

const phaseDroppableId: Record<PhaseKey, string> = {
  intro: "intro-list",
  main: "main-list",
  outro: "outro-list",
};

function safeSourceUrl(value: string) {
  const url = value.trim();
  if (!url || /^javascript:/i.test(url)) return null;
  return url;
}

export const TalkCanvas = memo(function TalkCanvas({ state, onChange }: Props) {
  const { t, locale } = useTranslation();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [restoreFocusKey, setRestoreFocusKey] = useState<string | null>(null);
  const [showImpulses, setShowImpulses] = useState<Record<PhaseKey, boolean>>({
    intro: false,
    main: false,
    outro: false,
  });
  const editButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const editContainerRefs = useRef(new Map<string, HTMLElement>());
  const addButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  const totalPlanned = useMemo(
    () =>
      [...state.phases.intro, ...state.phases.main, ...state.phases.outro].reduce(
        (sum, question) => sum + (question.estimated_minutes ?? 0),
        0,
      ),
    [state.phases],
  );

  const validEditKeys = useMemo(() => {
    const keys = new Set([metadataTitleKey, metadataPartnerKey, targetMinutesKey]);
    state.checklist.forEach((item) => keys.add(checklistKey(item.id)));
    (Object.keys(state.phases) as PhaseKey[]).forEach((phase) => {
      state.phases[phase].forEach((question) => keys.add(questionKey(phase, question.id)));
    });
    state.sources.forEach((item) => keys.add(sourceKey(item.id)));
    return keys;
  }, [state.checklist, state.phases, state.sources]);

  useEffect(() => {
    if (activeKey && !validEditKeys.has(activeKey)) {
      setActiveKey(null);
    }
  }, [activeKey, validEditKeys]);

  useEffect(() => {
    if (!restoreFocusKey || activeKey) return;
    editButtonRefs.current.get(restoreFocusKey)?.focus();
    addButtonRefs.current.get(restoreFocusKey)?.focus();
    setRestoreFocusKey(null);
  }, [activeKey, restoreFocusKey]);

  useEffect(() => {
    if (!activeKey) return;
    editContainerRefs.current.get(activeKey)?.scrollIntoView?.({
      behavior: "auto",
      block: "nearest",
    });
  }, [activeKey]);

  useEffect(() => {
    const finishBeforePrint = () => {
      flushSync(() => setActiveKey(null));
    };
    window.addEventListener("beforeprint", finishBeforePrint);
    return () => window.removeEventListener("beforeprint", finishBeforePrint);
  }, []);

  const setEditButtonRef = (key: string): RefCallback<HTMLButtonElement> => (node) => {
    if (node) editButtonRefs.current.set(key, node);
    else editButtonRefs.current.delete(key);
  };

  const setEditContainerRef = (key: string, node: HTMLElement | null) => {
    if (node) editContainerRefs.current.set(key, node);
    else editContainerRefs.current.delete(key);
  };

  const finishEditing = (key: string) => {
    setActiveKey(null);
    setRestoreFocusKey(key);
  };

  const handleEditorKeyDown = (event: KeyboardEvent, key: string) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    finishEditing(key);
  };

  const updateChecklist = (items: ChecklistItem[]) => {
    onChange({ ...state, checklist: items });
  };

  const addChecklistItem = () => {
    if (state.checklist.length >= MAX_CHECKLIST_ITEMS) return;
    const item = { id: crypto.randomUUID(), text: "", checked: false };
    updateChecklist([...state.checklist, item]);
    setActiveKey(checklistKey(item.id));
  };

  const deleteChecklistItem = (id: string) => {
    const index = state.checklist.findIndex((item) => item.id === id);
    const remaining = state.checklist.filter((item) => item.id !== id);
    const focusId = remaining[index]?.id ?? remaining[index - 1]?.id;
    setActiveKey(null);
    setRestoreFocusKey(focusId ? checklistKey(focusId) : "add:checklist");
    updateChecklist(remaining);
  };

  const updatePhase = (phase: PhaseKey, questions: Question[]) => {
    onChange({ ...state, phases: { ...state.phases, [phase]: questions } });
  };

  const updateQuestion = (phase: PhaseKey, id: string, updates: Partial<Question>) => {
    updatePhase(
      phase,
      state.phases[phase].map((question) =>
        question.id === id ? { ...question, ...updates } : question,
      ),
    );
  };

  const addQuestion = (phase: PhaseKey, text = "") => {
    if (state.phases[phase].length >= MAX_QUESTIONS_PER_PHASE) return;
    const question: Question = {
      id: crypto.randomUUID(),
      text,
      notes: "",
      estimated_minutes: 2,
      is_backup: false,
    };
    updatePhase(phase, [...state.phases[phase], question]);
    setActiveKey(questionKey(phase, question.id));
  };

  const deleteQuestion = (phase: PhaseKey, id: string) => {
    const questions = state.phases[phase];
    const index = questions.findIndex((question) => question.id === id);
    const remaining = questions.filter((question) => question.id !== id);
    const focusId = remaining[index]?.id ?? remaining[index - 1]?.id;
    setActiveKey(null);
    setRestoreFocusKey(
      focusId ? questionKey(phase, focusId) : `add:question:${phase}`,
    );
    updatePhase(phase, remaining);
  };

  const moveQuestion = (phase: PhaseKey, index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    const questions = state.phases[phase];
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    const next = [...questions];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    updatePhase(phase, next);
  };

  const updateSources = (items: SourceItem[]) => {
    onChange({ ...state, sources: items });
  };

  const addSource = () => {
    if (state.sources.length >= MAX_SOURCES) return;
    const source = { id: crypto.randomUUID(), title: "", url: "" };
    updateSources([...state.sources, source]);
    setActiveKey(sourceKey(source.id));
  };

  const deleteSource = (id: string) => {
    const index = state.sources.findIndex((item) => item.id === id);
    const remaining = state.sources.filter((item) => item.id !== id);
    const focusId = remaining[index]?.id ?? remaining[index - 1]?.id;
    setActiveKey(null);
    setRestoreFocusKey(focusId ? sourceKey(focusId) : "add:sources");
    updateSources(remaining);
  };

  const phaseTitle = (phase: PhaseKey) =>
    phase === "intro"
      ? t("preview.introTitle")
      : phase === "main"
        ? t("preview.mainTitle")
        : t("preview.outroTitle");

  const phasePrefix = (phase: PhaseKey) =>
    phase === "intro"
      ? t("preview.introPrefix")
      : phase === "main"
        ? t("preview.mainPrefix")
        : t("preview.outroPrefix");

  const phaseEmptyMessage = (phase: PhaseKey) =>
    phase === "intro"
      ? t("editor.introEmpty")
      : phase === "main"
        ? t("editor.mainEmpty")
        : t("editor.outroEmpty");

  const renderQuestion = (phase: PhaseKey, question: Question, index: number) => {
    const key = questionKey(phase, question.id);
    const isEditing = activeKey === key;
    const label = `${phasePrefix(phase)} ${index + 1}`;

    return (
      <Draggable
        key={question.id}
        draggableId={`${phase}:${question.id}`}
        index={index}
      >
        {(provided, snapshot) => (
          <article
            ref={(node) => {
              provided.innerRef(node);
              setEditContainerRef(key, node);
            }}
            {...provided.draggableProps}
            className={`${styles.questionCard} ${
              phase === "intro" ? styles.introCard : ""
            } ${isEditing ? styles.editingCard : ""} ${
              snapshot.isDragging ? styles.dragging : ""
            }`}
          >
            <div className={`${styles.itemControls} ${styles.canvasControls}`}>
              <button
                className={styles.iconButton}
                type="button"
                {...provided.dragHandleProps}
                aria-label={t("editor.moveQuestion", { number: index + 1 })}
              >
                <GripVertical size={19} aria-hidden="true" />
              </button>
              <button
                className={styles.iconButton}
                type="button"
                disabled={index === 0}
                onClick={() => moveQuestion(phase, index, -1)}
                aria-label={t("editor.moveQuestionUp", { number: index + 1 })}
              >
                <ArrowUp size={18} aria-hidden="true" />
              </button>
              <button
                className={styles.iconButton}
                type="button"
                disabled={index === state.phases[phase].length - 1}
                onClick={() => moveQuestion(phase, index, 1)}
                aria-label={t("editor.moveQuestionDown", { number: index + 1 })}
              >
                <ArrowDown size={18} aria-hidden="true" />
              </button>
              <button
                className={`${styles.iconButton} ${styles.deleteButton}`}
                type="button"
                onClick={() => deleteQuestion(phase, question.id)}
                aria-label={t("editor.deleteQuestion", { number: index + 1 })}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>

            {isEditing ? (
              <div
                id={`canvas-question-editor-${phase}-${question.id}`}
                className={styles.questionEditor}
                role="group"
                aria-label={label}
                onKeyDown={(event) => handleEditorKeyDown(event, key)}
              >
                <div className={styles.questionHeader}>
                  <span className={styles.questionNumber}>{label}</span>
                  <label className={styles.compactField}>
                    <span>{t("editor.timeLabel")}</span>
                    <input
                      type="number"
                      value={question.estimated_minutes ?? ""}
                      onChange={(event) => {
                        const parsed = Number.parseInt(event.target.value, 10);
                        updateQuestion(phase, question.id, {
                          estimated_minutes: Number.isNaN(parsed)
                            ? undefined
                            : Math.max(1, Math.min(MAX_ESTIMATED_MINUTES, parsed)),
                        });
                      }}
                      min="1"
                      max={MAX_ESTIMATED_MINUTES}
                    />
                  </label>
                  <label className={styles.backupField}>
                    <input
                      type="checkbox"
                      checked={question.is_backup ?? false}
                      onChange={(event) =>
                        updateQuestion(phase, question.id, {
                          is_backup: event.target.checked,
                        })
                      }
                    />
                    <span>{t("editor.backupLabel")}</span>
                  </label>
                </div>
                <label className={styles.field}>
                  <span>{label}</span>
                  <textarea
                    autoFocus
                    value={question.text}
                    onChange={(event) =>
                      updateQuestion(phase, question.id, { text: event.target.value })
                    }
                    placeholder={t("editor.questionPlaceholder")}
                    maxLength={MAX_TEXT_LENGTH}
                    rows={2}
                    className={styles.questionInput}
                  />
                </label>
                <label className={styles.field}>
                  <span>{t("editor.notesLabel")}</span>
                  <textarea
                    value={question.notes}
                    onChange={(event) =>
                      updateQuestion(phase, question.id, { notes: event.target.value })
                    }
                    placeholder={t("editor.notesPlaceholder")}
                    maxLength={MAX_TEXT_LENGTH}
                    rows={2}
                  />
                </label>
                <div className={styles.doneRow}>
                  <button
                    className={styles.doneButton}
                    type="button"
                    onClick={() => finishEditing(key)}
                  >
                    <Check size={17} aria-hidden="true" />
                    {t("editor.doneEditing")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                ref={setEditButtonRef(key)}
                className={styles.editableQuestion}
                type="button"
                onClick={() => setActiveKey(key)}
                aria-expanded="false"
                aria-controls={`canvas-question-editor-${phase}-${question.id}`}
              >
                <span className="visually-hidden">
                  {t("editor.editQuestion", { number: index + 1 })}:{" "}
                </span>
                <span className={styles.questionHeader}>
                  <span className={styles.questionNumber}>{label}</span>
                  {question.is_backup && (
                    <span className={styles.badgeOptional}>
                      {t("preview.badgeBackup")}
                    </span>
                  )}
                  {question.estimated_minutes && (
                    <span className={styles.badgeTime}>
                      {t("preview.badgeTime", {
                        minutes: question.estimated_minutes,
                      })}
                    </span>
                  )}
                  <Pencil
                    className={`${styles.editHint} ${styles.canvasControls}`}
                    size={16}
                    aria-hidden="true"
                  />
                </span>
                <span
                  className={`${styles.questionText} ${
                    question.text.trim() ? "" : styles.placeholder
                  }`}
                >
                  {question.text.trim() || t("editor.untitledQuestion")}
                </span>
                {question.notes.trim() && (
                  <span className={styles.notesSection}>
                    <strong>{t("preview.notesLabel")}</strong>
                    <span>{question.notes}</span>
                  </span>
                )}
              </button>
            )}

            <div className={styles.printSpace} aria-hidden="true">
              <span className={styles.printLine} />
              {phase === "main" && (
                <>
                  <span className={styles.printLine} />
                  <span className={styles.printLine} />
                </>
              )}
            </div>
          </article>
        )}
      </Draggable>
    );
  };

  const renderPhase = (phase: PhaseKey) => {
    const questions = state.phases[phase];
    const limitReached = questions.length >= MAX_QUESTIONS_PER_PHASE;
    const limitId = `canvas-${phase}-limit`;

    return (
      <section className={styles.section} key={phase}>
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>{phaseTitle(phase)}</h2>
          <button
            className={`${styles.suggestionButton} ${styles.canvasControls}`}
            type="button"
            onClick={() =>
              setShowImpulses((current) => ({
                ...current,
                [phase]: !current[phase],
              }))
            }
            aria-expanded={showImpulses[phase]}
            aria-describedby={limitReached ? limitId : undefined}
          >
            <Lightbulb size={16} aria-hidden="true" />
            {t("editor.impulses")}
          </button>
        </div>

        {showImpulses[phase] && (
          <div className={`${styles.suggestionPanel} ${styles.canvasControls}`}>
            <p>{t("editor.impulsesHint")}</p>
            <div className={styles.suggestionChips}>
              {getImpulses(locale, phase).map((text) => (
                <button
                  key={text}
                  type="button"
                  disabled={limitReached}
                  onClick={() => addQuestion(phase, text)}
                  aria-label={t("editor.impulsesInsert", { text })}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        <Droppable droppableId={phaseDroppableId[phase]}>
          {(provided) => (
            <div
              className={styles.questionList}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {questions.length === 0 && (
                <p className={styles.emptyText}>{phaseEmptyMessage(phase)}</p>
              )}
              {questions.map((question, index) =>
                renderQuestion(phase, question, index),
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        <div className={`${styles.addRow} ${styles.canvasControls}`}>
          <button
            ref={(node) => {
              const key = `add:question:${phase}`;
              if (node) addButtonRefs.current.set(key, node);
              else addButtonRefs.current.delete(key);
            }}
            className={styles.addButton}
            type="button"
            onClick={() => addQuestion(phase)}
            disabled={limitReached}
            aria-describedby={limitReached ? limitId : undefined}
          >
            <Plus size={17} aria-hidden="true" />
            {t("editor.addQuestion")}
          </button>
          {limitReached && (
            <p id={limitId} className={styles.limitMessage} role="status">
              {t("editor.questionLimitReached", {
                max: MAX_QUESTIONS_PER_PHASE,
              })}
            </p>
          )}
        </div>
      </section>
    );
  };

  const checklistLimitReached = state.checklist.length >= MAX_CHECKLIST_ITEMS;
  const sourceLimitReached = state.sources.length >= MAX_SOURCES;

  return (
    <article className={styles.canvas} data-testid="talk-canvas">
      <header className={styles.documentHeader}>
        {activeKey === metadataTitleKey && (
          <h1 className="visually-hidden">
            {state.title.trim() || t("preview.untitled")}
          </h1>
        )}
        {activeKey === metadataTitleKey ? (
          <div
            ref={(node) => setEditContainerRef(metadataTitleKey, node)}
            className={styles.headerEditor}
            onKeyDown={(event) => handleEditorKeyDown(event, metadataTitleKey)}
          >
            <label className={styles.field}>
              <span>{t("editor.metaTitle")}</span>
              <input
                autoFocus
                className={styles.titleInput}
                value={state.title}
                maxLength={MAX_TEXT_LENGTH}
                placeholder={t("editor.metaTitlePlaceholder")}
                onChange={(event) => onChange({ ...state, title: event.target.value })}
              />
            </label>
            <button
              className={styles.doneButton}
              type="button"
              onClick={() => finishEditing(metadataTitleKey)}
            >
              <Check size={17} aria-hidden="true" />
              {t("editor.doneEditing")}
            </button>
          </div>
        ) : (
          <h1
            className={styles.documentTitle}
            aria-label={state.title.trim() || t("preview.untitled")}
          >
            <button
              ref={setEditButtonRef(metadataTitleKey)}
              className={`${styles.editableText} ${styles.editableTitle}`}
              type="button"
              onClick={() => setActiveKey(metadataTitleKey)}
            >
              <span className="visually-hidden">{t("canvas.editTitle")}: </span>
              <span>{state.title.trim() || t("preview.untitled")}</span>
              <Pencil
                className={`${styles.editHint} ${styles.canvasControls}`}
                size={17}
                aria-hidden="true"
              />
            </button>
          </h1>
        )}

        {activeKey === metadataPartnerKey ? (
          <div
            ref={(node) => setEditContainerRef(metadataPartnerKey, node)}
            className={styles.headerEditor}
            onKeyDown={(event) => handleEditorKeyDown(event, metadataPartnerKey)}
          >
            <label className={styles.field}>
              <span>{t("editor.metaPartner")}</span>
              <input
                autoFocus
                value={state.partner}
                maxLength={MAX_TEXT_LENGTH}
                placeholder={t("editor.metaPartnerPlaceholder")}
                onChange={(event) =>
                  onChange({ ...state, partner: event.target.value })
                }
              />
            </label>
            <button
              className={styles.doneButton}
              type="button"
              onClick={() => finishEditing(metadataPartnerKey)}
            >
              <Check size={17} aria-hidden="true" />
              {t("editor.doneEditing")}
            </button>
          </div>
        ) : (
          <button
            ref={setEditButtonRef(metadataPartnerKey)}
            className={styles.editableMeta}
            type="button"
            onClick={() => setActiveKey(metadataPartnerKey)}
          >
            <span className="visually-hidden">{t("canvas.editPartner")}: </span>
            <strong>{t("preview.partnerLabel")}</strong>
            <span>{state.partner.trim() || t("preview.noPartner")}</span>
            <Pencil
              className={`${styles.editHint} ${styles.canvasControls}`}
              size={15}
              aria-hidden="true"
            />
          </button>
        )}

        <div className={styles.timeSummary}>
          <span>
            <strong>{t("preview.totalTime")}</strong>{" "}
            {t("preview.approx")} {totalPlanned} {t("preview.minutes")}
          </span>
          {activeKey === targetMinutesKey ? (
            <div
              ref={(node) => setEditContainerRef(targetMinutesKey, node)}
              className={styles.targetEditor}
              onKeyDown={(event) => handleEditorKeyDown(event, targetMinutesKey)}
            >
              <label>
                <span>{t("budget.target")}</span>
                <input
                  autoFocus
                  type="number"
                  min="1"
                  max={MAX_ESTIMATED_MINUTES}
                  value={state.target_minutes ?? ""}
                  placeholder={t("budget.targetPlaceholder")}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    onChange({
                      ...state,
                      target_minutes: Number.isNaN(parsed)
                        ? undefined
                        : Math.max(1, Math.min(MAX_ESTIMATED_MINUTES, parsed)),
                    });
                  }}
                />
              </label>
              <button
                className={styles.doneButton}
                type="button"
                onClick={() => finishEditing(targetMinutesKey)}
              >
                <Check size={17} aria-hidden="true" />
                {t("editor.doneEditing")}
              </button>
            </div>
          ) : (
            <button
              ref={setEditButtonRef(targetMinutesKey)}
              className={styles.targetButton}
              type="button"
              onClick={() => setActiveKey(targetMinutesKey)}
            >
              <span className="visually-hidden">{t("canvas.editTarget")}: </span>
              {state.target_minutes
                ? `${t("budget.target")} ${state.target_minutes} ${t("budget.minutesShort")}`
                : t("budget.noTarget")}
              <Pencil
                className={`${styles.editHint} ${styles.canvasControls}`}
                size={15}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("preview.checklistTitle")}</h2>
        {state.checklist.length === 0 && (
          <p className={styles.emptyText}>{t("editor.checklistEmpty")}</p>
        )}
        <ul className={styles.checklist}>
          {state.checklist.map((item, index) => {
            const key = checklistKey(item.id);
            return (
              <li
                key={item.id}
                ref={(node) => setEditContainerRef(key, node)}
                className={styles.checklistItem}
              >
                <label className={styles.checklistToggle}>
                  <input
                    className={styles.checklistCheckbox}
                    type="checkbox"
                    checked={item.checked}
                    aria-label={t("canvas.toggleChecklistItem", {
                      number: index + 1,
                    })}
                    onChange={(event) =>
                      updateChecklist(
                        state.checklist.map((candidate) =>
                          candidate.id === item.id
                            ? { ...candidate, checked: event.target.checked }
                            : candidate,
                        ),
                      )
                    }
                  />
                </label>
                {activeKey === key ? (
                  <div
                    className={styles.inlineEditor}
                    onKeyDown={(event) => handleEditorKeyDown(event, key)}
                  >
                    <label className="visually-hidden" htmlFor={`checklist-${item.id}`}>
                      {t("editor.checklistItemLabel")}
                    </label>
                    <input
                      id={`checklist-${item.id}`}
                      autoFocus
                      value={item.text}
                      maxLength={MAX_TEXT_LENGTH}
                      placeholder={t("editor.checklistPlaceholder")}
                      onChange={(event) =>
                        updateChecklist(
                          state.checklist.map((candidate) =>
                            candidate.id === item.id
                              ? { ...candidate, text: event.target.value }
                              : candidate,
                          ),
                        )
                      }
                    />
                    <button
                      className={styles.doneButton}
                      type="button"
                      onClick={() => finishEditing(key)}
                    >
                      <Check size={17} aria-hidden="true" />
                      {t("editor.doneEditing")}
                    </button>
                  </div>
                ) : (
                  <button
                    ref={setEditButtonRef(key)}
                    className={styles.checklistText}
                    type="button"
                    onClick={() => setActiveKey(key)}
                  >
                    <span className="visually-hidden">
                      {t("canvas.editChecklistItem", {
                        number: index + 1,
                      })}
                      :{" "}
                    </span>
                    <span className={item.text.trim() ? "" : styles.placeholder}>
                      {item.text.trim() || t("editor.checklistPlaceholder")}
                    </span>
                    <Pencil
                      className={`${styles.editHint} ${styles.canvasControls}`}
                      size={15}
                      aria-hidden="true"
                    />
                  </button>
                )}
                <button
                  className={`${styles.iconButton} ${styles.deleteButton} ${styles.canvasControls}`}
                  type="button"
                  onClick={() => deleteChecklistItem(item.id)}
                  aria-label={t("editor.deleteChecklistItem")}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className={`${styles.addRow} ${styles.canvasControls}`}>
          <button
            ref={(node) => {
              if (node) addButtonRefs.current.set("add:checklist", node);
              else addButtonRefs.current.delete("add:checklist");
            }}
            className={styles.addButton}
            type="button"
            onClick={addChecklistItem}
            disabled={checklistLimitReached}
            aria-describedby={
              checklistLimitReached ? "canvas-checklist-limit" : undefined
            }
          >
            <Plus size={17} aria-hidden="true" />
            {t("editor.checklistAdd")}
          </button>
          {checklistLimitReached && (
            <p id="canvas-checklist-limit" className={styles.limitMessage} role="status">
              {t("canvas.checklistLimitReached", { max: MAX_CHECKLIST_ITEMS })}
            </p>
          )}
        </div>
      </section>

      {renderPhase("intro")}
      {renderPhase("main")}
      {renderPhase("outro")}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("preview.sourcesTitle")}</h2>
        {state.sources.length === 0 && (
          <p className={styles.emptyText}>{t("editor.sourceEmpty")}</p>
        )}
        <ul className={styles.sourceList}>
          {state.sources.map((item, index) => {
            const key = sourceKey(item.id);
            const safeUrl = safeSourceUrl(item.url);
            return (
              <li
                key={item.id}
                ref={(node) => setEditContainerRef(key, node)}
                className={`${styles.sourceItem} ${
                  activeKey === key ? styles.editingCard : ""
                }`}
              >
                {activeKey === key ? (
                  <div
                    className={styles.sourceEditor}
                    onKeyDown={(event) => handleEditorKeyDown(event, key)}
                  >
                    <label className={styles.field}>
                      <span>{t("editor.sourceTitleLabel")}</span>
                      <input
                        autoFocus
                        value={item.title}
                        maxLength={MAX_TEXT_LENGTH}
                        placeholder={t("editor.sourceTitlePlaceholder")}
                        onChange={(event) =>
                          updateSources(
                            state.sources.map((candidate) =>
                              candidate.id === item.id
                                ? { ...candidate, title: event.target.value }
                                : candidate,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className={styles.field}>
                      <span>{t("editor.sourceUrlLabel")}</span>
                      <input
                        type="url"
                        value={item.url}
                        maxLength={MAX_TEXT_LENGTH}
                        placeholder={t("editor.sourceUrlPlaceholder")}
                        onChange={(event) =>
                          updateSources(
                            state.sources.map((candidate) =>
                              candidate.id === item.id
                                ? { ...candidate, url: event.target.value }
                                : candidate,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      className={styles.doneButton}
                      type="button"
                      onClick={() => finishEditing(key)}
                    >
                      <Check size={17} aria-hidden="true" />
                      {t("editor.doneEditing")}
                    </button>
                  </div>
                ) : (
                  <div className={styles.sourceContent}>
                    <button
                      ref={setEditButtonRef(key)}
                      className={styles.sourceEditButton}
                      type="button"
                      onClick={() => setActiveKey(key)}
                    >
                      <span className="visually-hidden">
                        {t("canvas.editSource", { number: index + 1 })}:{" "}
                      </span>
                      <span
                        className={`${styles.sourceTitle} ${
                          item.title.trim() ? "" : styles.placeholder
                        }`}
                      >
                        {item.title.trim() || t("preview.untitledSource")}
                      </span>
                      <Pencil
                        className={`${styles.editHint} ${styles.canvasControls}`}
                        size={15}
                        aria-hidden="true"
                      />
                    </button>
                    {item.url.trim() &&
                      (safeUrl ? (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.sourceUrl}
                        >
                          {item.url}
                        </a>
                      ) : (
                        <span className={styles.invalidSourceUrl}>{item.url}</span>
                      ))}
                  </div>
                )}
                <button
                  className={`${styles.iconButton} ${styles.deleteButton} ${styles.canvasControls}`}
                  type="button"
                  onClick={() => deleteSource(item.id)}
                  aria-label={t("editor.deleteSource")}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className={`${styles.addRow} ${styles.canvasControls}`}>
          <button
            ref={(node) => {
              if (node) addButtonRefs.current.set("add:sources", node);
              else addButtonRefs.current.delete("add:sources");
            }}
            className={styles.addButton}
            type="button"
            onClick={addSource}
            disabled={sourceLimitReached}
            aria-describedby={sourceLimitReached ? "canvas-source-limit" : undefined}
          >
            <Plus size={17} aria-hidden="true" />
            {t("editor.sourceAdd")}
          </button>
          {sourceLimitReached && (
            <p id="canvas-source-limit" className={styles.limitMessage} role="status">
              {t("canvas.sourceLimitReached", { max: MAX_SOURCES })}
            </p>
          )}
        </div>
      </section>
    </article>
  );
});
