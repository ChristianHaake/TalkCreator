import { memo, useEffect, useRef, useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import type { Question } from "../../domain/types";
import { QuestionItem } from "./QuestionItem";
import { Lightbulb, Plus } from "lucide-react";
import styles from "./Editor.module.css";
import { useTranslation } from "../../i18n";
import { getImpulses, type PhaseKey } from "../../domain/impulses";
import { MAX_QUESTIONS_PER_PHASE } from "../../domain/projectSchema";

type Props = {
  title: string;
  droppableId: string;
  emptyMessage: string;
  phaseKey: PhaseKey;
  questions: Question[];
  onChange: (questions: Question[]) => void;
};

export const QuestionList = memo(function QuestionList({ title, droppableId, emptyMessage, phaseKey, questions, onChange }: Props) {
  const { t, locale } = useTranslation();
  const [showImpulses, setShowImpulses] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<
    { type: "editor" | "summary"; id: string } | { type: "add" } | null
  >(null);
  const summaryRefs = useRef(new Map<string, HTMLButtonElement>());
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const limitReached = questions.length >= MAX_QUESTIONS_PER_PHASE;
  const limitMessageId = `${droppableId}-limit`;

  useEffect(() => {
    if (activeQuestionId && !questions.some((question) => question.id === activeQuestionId)) {
      setActiveQuestionId(null);
    }
  }, [activeQuestionId, questions]);

  useEffect(() => {
    if (!focusTarget || focusTarget.type === "editor") return;

    if (focusTarget.type === "add") {
      addButtonRef.current?.focus();
      setFocusTarget(null);
      return;
    }

    if (questions.some((question) => question.id === focusTarget.id)) {
      summaryRefs.current.get(focusTarget.id)?.focus();
      setFocusTarget(null);
    }
  }, [focusTarget, questions]);

  const handleUpdate = (id: string, updates: Partial<Question>) => {
    onChange(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const handleDelete = (id: string) => {
    const index = questions.findIndex((question) => question.id === id);
    const remaining = questions.filter((question) => question.id !== id);
    const nextFocusId = remaining[index]?.id ?? remaining[index - 1]?.id;

    if (activeQuestionId === id) {
      setActiveQuestionId(null);
    }
    setFocusTarget(nextFocusId ? { type: "summary", id: nextFocusId } : { type: "add" });
    onChange(remaining);
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) return;

    const newQuestions = Array.from(questions);
    const [moved] = newQuestions.splice(index, 1);
    newQuestions.splice(nextIndex, 0, moved);
    onChange(newQuestions);
  };

  const handleAdd = (text = "") => {
    if (limitReached) return;

    const newId = crypto.randomUUID();
    setActiveQuestionId(newId);
    setFocusTarget({ type: "editor", id: newId });
    onChange([
      ...questions,
      { id: newId, text, notes: "", estimated_minutes: 2, is_backup: false },
    ]);
  };

  const impulses = getImpulses(locale, phaseKey);

  return (
    <div className={styles.questionListPanel}>
      <div className={styles.listHeader}>
        <h3 className={styles.panelTitle}>{title}</h3>
        <div className={styles.listHeaderActions}>
          <button
            className={styles.impulseToggle}
            onClick={() => setShowImpulses((value) => !value)}
            type="button"
            aria-expanded={showImpulses}
            aria-describedby={limitReached ? limitMessageId : undefined}
          >
            <Lightbulb size={15} aria-hidden="true" />
            {t("editor.impulses")}
          </button>
        </div>
      </div>

      {showImpulses && (
        <div className={styles.impulsePanel}>
          <p className={styles.impulseHint}>{t("editor.impulsesHint")}</p>
          <div className={styles.impulseChips}>
            {impulses.map((text) => (
              <button
                key={text}
                type="button"
                className={styles.impulseChip}
                onClick={() => handleAdd(text)}
                aria-label={t("editor.impulsesInsert", { text })}
                disabled={limitReached}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      )}

      <Droppable droppableId={droppableId}>
        {(provided) => (
          <div
            className={styles.listContainer}
            {...provided.droppableProps}
            ref={provided.innerRef}
          >
            {questions.length === 0 && (
              <p className={styles.emptyText}>{emptyMessage}</p>
            )}
            {questions.map((q, index) => (
              <QuestionItem
                key={q.id}
                question={q}
                index={index}
                isEditing={activeQuestionId === q.id}
                shouldFocusEditor={focusTarget?.type === "editor" && focusTarget.id === q.id}
                onActivate={() => {
                  setActiveQuestionId(q.id);
                  setFocusTarget({ type: "editor", id: q.id });
                }}
                onCollapse={() => {
                  setActiveQuestionId(null);
                  setFocusTarget({ type: "summary", id: q.id });
                }}
                onEditorFocused={() => setFocusTarget(null)}
                onSummaryRef={(node) => {
                  if (node) summaryRefs.current.set(q.id, node);
                  else summaryRefs.current.delete(q.id);
                }}
                onUpdate={(updates) => handleUpdate(q.id, updates)}
                onDelete={() => handleDelete(q.id)}
                onMoveUp={() => handleMove(index, -1)}
                onMoveDown={() => handleMove(index, 1)}
                canMoveUp={index > 0}
                canMoveDown={index < questions.length - 1}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className={styles.addQuestionRow}>
        <button
          ref={addButtonRef}
          className={styles.addButton}
          onClick={() => handleAdd()}
          type="button"
          disabled={limitReached}
          aria-describedby={limitReached ? limitMessageId : undefined}
        >
          <Plus size={16} aria-hidden="true" />
          {t("editor.addQuestion")}
        </button>
        {limitReached && (
          <p id={limitMessageId} className={styles.limitMessage} role="status">
            {t("editor.questionLimitReached", { max: MAX_QUESTIONS_PER_PHASE })}
          </p>
        )}
      </div>
    </div>
  );
});
