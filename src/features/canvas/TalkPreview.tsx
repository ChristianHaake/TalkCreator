import type { InterviewState } from "../../domain/types";
import { useTranslation } from "../../i18n";
import styles from "./TalkPreview.module.css";

export function TalkPreview({ state }: { state: InterviewState }) {
  const { t } = useTranslation();
  const total = [...state.phases.intro, ...state.phases.main, ...state.phases.outro]
    .reduce((sum, question) => sum + (question.estimated_minutes ?? 0), 0);
  const phases = ["intro", "main", "outro"] as const;

  return (
    <article className={styles.preview} aria-label={t("home.livePreview")}>
      <header className={styles.header}>
        <h2>{state.title.trim() || t("preview.untitled")}</h2>
        <p><strong>{t("preview.partnerLabel")}</strong> {state.partner.trim() || t("preview.noPartner")}</p>
        <p><strong>{t("preview.totalTime")}</strong> {t("preview.approx")} {total} {t("preview.minutes")}</p>
        {state.target_minutes && <p>{t("budget.target")} {state.target_minutes} {t("budget.minutesShort")}</p>}
      </header>

      <section>
        <h3>{t("preview.checklistTitle")}</h3>
        {state.checklist.length === 0 ? <p>{t("editor.checklistEmpty")}</p> : (
          <ul className={styles.checklist}>
            {state.checklist.map((item) => (
              <li key={item.id}>
                <label>
                  <input type="checkbox" checked={item.checked} disabled />
                  {item.text || t("editor.checklistPlaceholder")}
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {phases.map((phase) => (
        <section key={phase}>
          <h3>{t(`preview.${phase}Title`)}</h3>
          {state.phases[phase].length === 0 ? <p>{t(`editor.${phase}Empty`)}</p> : (
            <ol className={styles.questions}>
              {state.phases[phase].map((question) => (
                <li key={question.id}>
                  <div className={styles.questionTitle}>
                    <span>{question.text.trim() || t("editor.untitledQuestion")}</span>
                    {question.estimated_minutes && <small>{t("preview.badgeTime", { minutes: question.estimated_minutes })}</small>}
                    {question.is_backup && <small>{t("preview.badgeBackup")}</small>}
                  </div>
                  {question.notes.trim() && <p><strong>{t("preview.notesLabel")}</strong> {question.notes}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}

      <section>
        <h3>{t("preview.sourcesTitle")}</h3>
        {state.sources.length === 0 ? <p>{t("editor.sourceEmpty")}</p> : (
          <ul>{state.sources.map((source) => (
            <li key={source.id}>{source.title.trim() || t("preview.untitledSource")}{source.url.trim() && <> — {source.url}</>}</li>
          ))}</ul>
        )}
      </section>
    </article>
  );
}
