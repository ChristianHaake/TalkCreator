import { useId, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { copyFor, creatorCopy } from './creator-copy';
import type { CreatorLocale } from './creator-copy';
import './creator.css';

interface HeaderProps {
  identity: ReactNode;
  controls?: ReactNode;
  actions?: { label: string; content: ReactNode };
  className?: string;
}

export function CreatorHeader({ identity, controls, actions, className }: HeaderProps) {
  return (
    <header className={className} data-creator-header="">
      <div data-creator-identity="">{identity}</div>
      {controls && <div data-creator-controls="">{controls}</div>}
      {actions && <nav data-creator-actions="" aria-label={actions.label}>{actions.content}</nav>}
    </header>
  );
}

interface LanguageMenuProps<L extends CreatorLocale> {
  value: L;
  languages: readonly L[];
  onChange: (language: L) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  selectClassName?: string;
  label?: string;
}

export function CreatorLanguageMenu<L extends CreatorLocale>({
  value, languages, onChange, disabled, className, id, selectClassName, label,
}: LanguageMenuProps<L>) {
  if (languages.length < 2) return null;
  return (
    <label data-creator-language="" className={className}>
      <span>{label ?? copyFor(value).language}</span>
      <select id={id} className={selectClassName} disabled={disabled} value={value} onChange={event => {
        const selected = languages.find(language => language === event.currentTarget.value);
        if (selected) onChange(selected);
      }}>
        {languages.map(language => (
          <option key={language} value={language} lang={language}>{creatorCopy[language].name}</option>
        ))}
      </select>
    </label>
  );
}

interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  cancelLabel: string;
  onCancel: () => void;
  actions?: ReactNode;
  className?: string;
  /** Also used for pointer activation in Safari, where clicking a button need not focus it. */
  returnFocus: RefObject<HTMLElement | null>;
  urgent?: boolean;
  closeOnBackdrop?: boolean;
}

// Native modality makes the page inert, but Tab may still move into browser chrome.
function wrapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
    'a[href],button,input,select,textarea,summary,[tabindex],[contenteditable="true"]',
  )).filter(element => element.tabIndex >= 0 && !element.matches(':disabled') &&
    !element.closest('[inert]') && element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility === 'visible');
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!first || !last) return;
  const boundary = event.shiftKey ? first : last;
  if (document.activeElement === boundary) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

export function CreatorDialog({
  open, title, children, cancelLabel, onCancel, actions, className, returnFocus, urgent, closeOnBackdrop = false,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const target = returnFocus.current ?? document.activeElement;
    dialog.showModal();
    cancelRef.current?.focus();
    return () => {
      dialog.close();
      if (target instanceof HTMLElement && target.isConnected) target.focus();
    };
  }, [open, returnFocus]);
  return (
    <dialog
      ref={dialogRef}
      data-creator-dialog=""
      className={className}
      role={urgent ? 'alertdialog' : undefined}
      aria-labelledby={titleId}
      onKeyDown={wrapDialogFocus}
      onClick={event => {
        if (!closeOnBackdrop || event.target !== event.currentTarget) return;
        const { left, top, right, bottom } = event.currentTarget.getBoundingClientRect();
        if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
          onCancel();
        }
      }}
      onCancel={event => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      {open && <div>{children}</div>}
      <div data-creator-dialog-actions="">
        <button ref={cancelRef} type="button" onClick={onCancel}>{cancelLabel}</button>
        {open && actions}
      </div>
    </dialog>
  );
}

export function CreatorStatus({ children, urgent = false, className, id }: {
  children: ReactNode;
  urgent?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={className} role={urgent ? 'alert' : 'status'} aria-atomic="true">
      {children}
    </div>
  );
}
