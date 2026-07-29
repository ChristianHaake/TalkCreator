import { memo } from "react";
import type { ChangeEvent } from "react";
import { Clock } from "lucide-react";
import { MAX_ESTIMATED_MINUTES } from "../../domain/projectSchema";
import { useTranslation } from "../../i18n";
import styles from "./Editor.module.css";

type Props = {
  planned: number;
  target?: number;
  onTargetChange: (value: number | undefined) => void;
};

export const TimeBudget = memo(function TimeBudget({ planned, target, onTargetChange }: Props) {
  const { t } = useTranslation();

  const hasTarget = typeof target === "number" && target > 0;
  const ratio = hasTarget ? Math.min(planned / target, 1) : 0;
  const over = hasTarget && planned > target;
  const diff = hasTarget ? Math.abs(planned - target) : 0;

  return (
    <div className={styles.metadataPanel}>
      <div className={styles.listHeader}>
        <h3 className={styles.panelTitle}>{t("budget.title")}</h3>
        <div className={styles.budgetTargetGroup}>
          <label htmlFor="budget-target">{t("budget.target")}</label>
          <input
            type="number"
            id="budget-target"
            className={styles.input}
            value={target ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const parsed = parseInt(e.target.value, 10);
              onTargetChange(
                Number.isNaN(parsed) ? undefined : Math.max(1, Math.min(MAX_ESTIMATED_MINUTES, parsed)),
              );
            }}
            placeholder={t("budget.targetPlaceholder")}
            min="1"
            max={MAX_ESTIMATED_MINUTES}
          />
        </div>
      </div>

      <div className={styles.budgetSummary}>
        <Clock size={16} aria-hidden="true" />
        <span className={styles.budgetPlanned}>
          {t("budget.planned")}: <strong>{planned}</strong>
          {hasTarget && (
            <>
              {" "}
              {t("budget.of")} {target}
            </>
          )}{" "}
          {t("budget.minutesShort")}
        </span>
        {hasTarget ? (
          <span className={over ? styles.budgetOver : styles.budgetOk}>
            {over ? t("budget.over", { minutes: diff }) : t("budget.remaining", { minutes: diff })}
          </span>
        ) : (
          <span className={styles.budgetMuted}>{t("budget.noTarget")}</span>
        )}
      </div>

      {hasTarget && (
        <div className={styles.budgetBar} aria-hidden="true">
          <div
            className={`${styles.budgetBarFill} ${over ? styles.budgetBarOver : ""}`}
            style={{ transform: `scaleX(${ratio})` }}
          />
        </div>
      )}
    </div>
  );
});
