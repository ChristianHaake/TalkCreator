import { useRef, type RefObject } from "react";
import { CreatorDialog } from "../../creator/CreatorShell";
import styles from "./ConfirmDialog.module.css";
import { useTranslation } from "../../i18n";

type Props = {
  title: string;
  message: string;
  returnFocus?: RefObject<HTMLElement | null>;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Style the confirm action as destructive (red). */
  danger?: boolean;
};

export function ConfirmDialog({ title, message, confirmLabel, returnFocus, onConfirm, onCancel, danger }: Props) {
  const fallback = useRef<HTMLElement>(null);
  const { t } = useTranslation();
  return (
    <CreatorDialog open closeOnBackdrop returnFocus={returnFocus ?? fallback} title={title} cancelLabel={t("common.cancel")}
      onCancel={onCancel} className={styles.dialog} actions={
        <button type="button" className={danger ? styles.dangerButton : styles.confirmButton} onClick={onConfirm}>
          {confirmLabel}
        </button>
      }>
      <p className={styles.message}>{message}</p>
    </CreatorDialog>
  );
}
