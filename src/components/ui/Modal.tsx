import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import styles from "./Modal.module.css";
import { useTranslation } from "../../i18n";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Extra width for content-heavy modals such as the template picker. */
  wide?: boolean;
};

/**
 * Accessible modal shell: focus is moved inside on open and restored on
 * close, Escape and backdrop clicks dismiss, and background scroll is locked.
 */
export function Modal({ title, onClose, children, wide }: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    const appRoot = document.getElementById("root");
    const rootWasInert = appRoot?.inert ?? false;
    const previousAriaHidden = appRoot?.getAttribute("aria-hidden") ?? null;
    document.body.style.overflow = "hidden";
    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute("aria-hidden", "true");
    }

    // Move focus into the dialog (first focusable, else the dialog itself).
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? dialogRef.current)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      event.preventDefault();
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? focusableElements.length - 1
          : currentIndex - 1
        : currentIndex === -1 || currentIndex === focusableElements.length - 1
          ? 0
          : currentIndex + 1;
      focusableElements[nextIndex].focus();
    }
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = overflow;
      if (appRoot) {
        appRoot.inert = rootWasInert;
        if (previousAriaHidden === null) {
          appRoot.removeAttribute("aria-hidden");
        } else {
          appRoot.setAttribute("aria-hidden", previousAriaHidden);
        }
      }
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${wide ? styles.wide : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
