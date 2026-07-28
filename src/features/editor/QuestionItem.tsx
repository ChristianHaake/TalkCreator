import { Draggable } from "@hello-pangea/dnd";
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import type { ChangeEvent, KeyboardEvent, RefCallback } from "react";
import type { Question } from "../../domain/types";
import { MAX_ESTIMATED_MINUTES, MAX_TEXT_LENGTH } from "../../domain/projectSchema";
import styles from "./Editor.module.css";
import { useTranslation } from "../../i18n";

type Props = {
  question: Question;
  index: number;
  isEditing: boolean;
  shouldFocusEditor: boolean;
  onActivate: () => void;
  onCollapse: () => void;
  onEditorFocused: () => void;
  onSummaryRef: RefCallback<HTMLButtonElement>;
  onUpdate: (updates: Partial<Question>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export const QuestionItem = memo(function QuestionItem({
  question,
  index,
  isEditing,
  shouldFocusEditor,
  onActivate,
  onCollapse,
  onEditorFocused,
  onSummaryRef,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: Props) {
  const { t } = useTranslation();
  const itemRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const editorId = `question-editor-${question.id}`;
  const summaryActionId = `question-summary-action-${question.id}`;
  const summaryDescriptionId = `question-summary-description-${question.id}`;
  const itemLabel = t("editor.questionPrefix", { number: index + 1 });
  const summaryText = question.text.trim() || t("editor.untitledQuestion");
  const conciseSummary =
    summaryText.length > 160 ? `${summaryText.slice(0, 157).trimEnd()}…` : summaryText;
  const summaryDetails = [
    question.estimated_minutes
      ? t("preview.badgeTime", { minutes: question.estimated_minutes })
      : "",
    question.is_backup ? t("preview.badgeBackup") : "",
  ].filter(Boolean);
  const summaryAction = isEditing
    ? `${t("editor.doneEditing")}: ${itemLabel}`
    : t("editor.editQuestion", { number: index + 1 });
  const summaryDescription = [conciseSummary, ...summaryDetails].join(". ");

  useEffect(() => {
    if (!isEditing || !shouldFocusEditor) return;

    textRef.current?.focus();
    itemRef.current?.scrollIntoView?.({ behavior: "auto", block: "nearest" });
    onEditorFocused();
  }, [isEditing, onEditorFocused, shouldFocusEditor]);

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onCollapse();
  };

  return (
    <Draggable draggableId={question.id} index={index}>
      {(provided, snapshot) => (
        <div
          className={`${styles.questionItem} ${isEditing ? styles.questionItemEditing : ""} ${
            snapshot.isDragging ? styles.dragging : ""
          }`}
          ref={(node) => {
            itemRef.current = node;
            provided.innerRef(node);
          }}
          {...provided.draggableProps}
        >
          <div className={styles.questionRow}>
            <div
              className={styles.dragHandle}
              {...provided.dragHandleProps}
              aria-label={t("editor.moveQuestion", { number: index + 1 })}
            >
              <GripVertical size={20} aria-hidden="true" />
            </div>

            <button
              ref={onSummaryRef}
              className={styles.questionSummary}
              type="button"
              aria-labelledby={summaryActionId}
              aria-describedby={summaryDescriptionId}
              aria-expanded={isEditing}
              aria-controls={editorId}
              onClick={isEditing ? onCollapse : onActivate}
            >
              <span id={summaryActionId} className="visually-hidden">
                {summaryAction}
              </span>
              <span id={summaryDescriptionId} className="visually-hidden">
                {summaryDescription}
              </span>
              <span className={styles.questionSummaryHeader}>
                <span className={styles.questionSummaryLabel}>{itemLabel}</span>
                <span className={styles.questionSummaryBadges}>
                  {question.estimated_minutes && (
                    <span className={styles.summaryBadge}>
                      {t("preview.badgeTime", { minutes: question.estimated_minutes })}
                    </span>
                  )}
                  {question.is_backup && (
                    <span className={`${styles.summaryBadge} ${styles.summaryBadgeOptional}`}>
                      {t("preview.badgeBackup")}
                    </span>
                  )}
                </span>
              </span>
              <span className={`${styles.questionSummaryText} ${question.text.trim() ? "" : styles.questionSummaryEmpty}`}>
                {summaryText}
              </span>
              {isEditing ? (
                <ChevronUp className={styles.summaryChevron} size={18} aria-hidden="true" />
              ) : (
                <ChevronDown className={styles.summaryChevron} size={18} aria-hidden="true" />
              )}
            </button>

            <div className={styles.questionActions}>
              <button
                className={styles.iconButton}
                onClick={onMoveUp}
                type="button"
                title={t("editor.moveQuestionUp", { number: index + 1 })}
                aria-label={t("editor.moveQuestionUp", { number: index + 1 })}
                disabled={!canMoveUp}
              >
                <ArrowUp size={18} aria-hidden="true" />
              </button>
              <button
                className={styles.iconButton}
                onClick={onMoveDown}
                type="button"
                title={t("editor.moveQuestionDown", { number: index + 1 })}
                aria-label={t("editor.moveQuestionDown", { number: index + 1 })}
                disabled={!canMoveDown}
              >
                <ArrowDown size={18} aria-hidden="true" />
              </button>
              <button
                className={styles.deleteButton}
                onClick={onDelete}
                type="button"
                title={t("editor.deleteQuestion", { number: index + 1 })}
                aria-label={t("editor.deleteQuestion", { number: index + 1 })}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {isEditing && (
            <div
              id={editorId}
              className={styles.questionEditor}
              role="group"
              aria-label={itemLabel}
              onKeyDown={handleEditorKeyDown}
            >
              <div className={styles.questionContent}>
                <div className={styles.inputGroup}>
                  <label htmlFor={`question-text-${question.id}`}>{itemLabel}</label>
                  <textarea
                    ref={textRef}
                    id={`question-text-${question.id}`}
                    value={question.text}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onUpdate({ text: e.target.value })}
                    placeholder={t("editor.questionPlaceholder")}
                    rows={2}
                    maxLength={MAX_TEXT_LENGTH}
                    className={styles.textarea}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor={`question-notes-${question.id}`}>{t("editor.notesLabel")}</label>
                  <textarea
                    id={`question-notes-${question.id}`}
                    value={question.notes}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onUpdate({ notes: e.target.value })}
                    placeholder={t("editor.notesPlaceholder")}
                    rows={1}
                    maxLength={MAX_TEXT_LENGTH}
                    className={styles.textarea}
                  />
                </div>

                <div className={styles.priorityGroup}>
                  <div className={`${styles.inputGroup} ${styles.inlineInputGroup}`}>
                    <label htmlFor={`question-time-${question.id}`}>{t("editor.timeLabel")}</label>
                    <input
                      type="number"
                      id={`question-time-${question.id}`}
                      value={question.estimated_minutes ?? ""}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const parsed = parseInt(e.target.value, 10);
                        onUpdate({
                          estimated_minutes: Number.isNaN(parsed)
                            ? undefined
                            : Math.max(1, Math.min(MAX_ESTIMATED_MINUTES, parsed)),
                        });
                      }}
                      placeholder="2"
                      min="1"
                      max={MAX_ESTIMATED_MINUTES}
                      className={styles.input}
                    />
                  </div>
                  <div className={`${styles.inputGroup} ${styles.inlineInputGroup}`}>
                    <input
                      type="checkbox"
                      id={`question-backup-${question.id}`}
                      checked={question.is_backup || false}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdate({ is_backup: e.target.checked })}
                    />
                    <label htmlFor={`question-backup-${question.id}`}>{t("editor.backupLabel")}</label>
                  </div>
                </div>
              </div>

              <div className={styles.doneRow}>
                <button className={styles.doneButton} type="button" onClick={onCollapse}>
                  <Check size={17} aria-hidden="true" />
                  {t("editor.doneEditing")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
});
