import { DragDropContext } from "@hello-pangea/dnd";
import type { DropResult, ResponderProvided } from "@hello-pangea/dnd";
import { FileDown, FileUp, LayoutTemplate, Printer, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { MAX_QUESTIONS_PER_PHASE } from "../domain/projectSchema";
import { createProjectFromTemplate, type TemplateId } from "../domain/templates";
import type { InterviewPhases } from "../domain/types";
import { TalkCanvas } from "../features/canvas/TalkCanvas";
import { TalkPreview } from "../features/canvas/TalkPreview";
import { moveQuestionWithAnnouncement } from "../features/canvas/questionMove";
import { TemplatePicker } from "../features/templates/TemplatePicker";
import { useTranslation } from "../i18n";
import { useProjectStorage } from "../shared/hooks/useProjectStorage";
import { useSessionPersistence } from "../shared/hooks/useSessionPersistence";
import styles from "./Home.module.css";

const droppablePhase: Record<string, keyof InterviewPhases> = {
  "intro-list": "intro",
  "main-list": "main",
  "outro-list": "outro",
};

export function Home() {
  const {
    state, setState, clearSession, applyProject, storageStatus, recovery,
    downloadRecovery, recoverWithFreshProject,
  } = useSessionPersistence();
  const { t, locale } = useTranslation();
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [recoveryResetOpen, setRecoveryResetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [pendingTemplate, setPendingTemplate] = useState<TemplateId | null>(null);
  const configInputRef = useRef<HTMLInputElement>(null);
  const {
    handleDownload,
    handleExportMarkdown,
    handleUpload,
    pendingImport,
    importError,
    confirmImport,
    cancelImport,
  } = useProjectStorage(state, (next) => {
    applyProject(next);
    setCanvasRevision((revision) => revision + 1);
  });

  if (!state) {
    return <div className={styles.loadingState}>{t("home.loadingProject")}</div>;
  }

  const corruptStorage = recovery?.kind === "corrupt";

  const confirmTemplate = () => {
    if (pendingTemplate) {
      applyProject(createProjectFromTemplate(pendingTemplate, locale));
      setCanvasRevision((revision) => revision + 1);
    }
    setPendingTemplate(null);
  };

  const handleDragEnd = (result: DropResult, provided: ResponderProvided) => {
    if (!result.destination) return;

    const sourcePhase = droppablePhase[result.source.droppableId];
    const destinationPhase = droppablePhase[result.destination.droppableId];
    if (!sourcePhase || !destinationPhase) return;
    if (
      sourcePhase === destinationPhase &&
      result.source.index === result.destination.index
    ) {
      return;
    }

    const moveResult = moveQuestionWithAnnouncement({
      phases: state.phases,
      source: { phase: sourcePhase, index: result.source.index },
      destination: {
        phase: destinationPhase,
        index: result.destination.index,
      },
      announce: provided.announce,
      blockedMessage: t("editor.moveQuestionBlocked", {
        max: MAX_QUESTIONS_PER_PHASE,
      }),
      successMessage: t("editor.moveQuestionSuccess", {
        section: t(`editor.${destinationPhase}Title`),
        position: result.destination.index + 1,
      }),
    });

    if (!moveResult.moved) return;
    setState({ ...state, phases: moveResult.phases });
  };

  return (
    <div className={styles.container}>
      <div className={styles.storageStatus} role={storageStatus === "failed" ? "alert" : "status"}>
        {recovery?.kind === "unavailable"
          ? t("storage.temporarySession")
          : corruptStorage
            ? t("storage.corruptStored")
            : storageStatus === "pending"
              ? t("storage.savePending")
              : storageStatus === "failed"
                ? t("storage.saveFailed")
                : t("storage.saveSaved")}
      </div>
      {corruptStorage && (
        <div className={styles.recoveryActions}>
          <button type="button" onClick={downloadRecovery}>{t("storage.downloadRecovery")}</button>
          <button type="button" onClick={() => configInputRef.current?.click()}>{t("home.load")}</button>
          <button type="button" onClick={() => setRecoveryResetOpen(true)}>{t("storage.startFresh")}</button>
        </div>
      )}
      <input
        accept=".json,application/json"
        aria-hidden="true"
        className="visually-hidden"
        onChange={handleUpload}
        ref={configInputRef}
        tabIndex={-1}
        type="file"
      />
      {!corruptStorage && <>
      <section className={styles.canvasPanel} aria-label={t("home.canvasTitle")}>
        <div className={styles.panelHeading}>
          <div>
            <span className={styles.panelKicker}>{t("home.canvasTitle")}</span>
            <h2>{t("home.canvasDescription")}</h2>
          </div>
          <div className={styles.headingActions}>
            <button
              className={styles.templateButton}
              onClick={() => setPickerOpen(true)}
              type="button"
            >
              <LayoutTemplate aria-hidden="true" size={16} />
              {t("templates.newButton")}
            </button>
            <button
              className={styles.iconButton}
              onClick={() => setResetOpen(true)}
              title={t("home.resetProject")}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={18} />
              <span className="visually-hidden">{t("home.resetProject")}</span>
            </button>
          </div>
        </div>

        <div className={styles.mobileViewSwitch} role="group" aria-label={t("home.switchView")}>
          <button
            type="button"
            aria-pressed={mobileView === "edit"}
            onClick={() => setMobileView("edit")}
          >
            {t("home.editView")}
          </button>
          <button
            type="button"
            aria-pressed={mobileView === "preview"}
            onClick={() => setMobileView("preview")}
          >
            {t("home.previewView")}
          </button>
        </div>

        <div className={`${styles.canvasStage} ${mobileView === "preview" ? styles.editorHiddenOnMobile : ""}`}>
          <DragDropContext key={canvasRevision} onDragEnd={handleDragEnd}>
            <TalkCanvas state={state} onChange={setState} />
          </DragDropContext>
        </div>
        {mobileView === "preview" && (
          <div className={styles.mobilePreview}>
            <TalkPreview state={state} />
          </div>
        )}
      </section>

      <div className={styles.actionBar}>
        <div className={styles.actionGroup}>
          <span>{t("home.project")}</span>
          <button
            aria-describedby={importError ? "project-import-error" : undefined}
            className={styles.actionButtonSecondary}
            onClick={() => configInputRef.current?.click()}
            type="button"
          >
            <FileUp aria-hidden="true" size={17} />
            {t("home.load")}
          </button>
          <button
            className={styles.actionButtonSecondary}
            onClick={handleDownload}
            type="button"
          >
            <FileDown aria-hidden="true" size={17} />
            {t("home.save")}
          </button>
          {importError && (
            <p className={styles.importError} id="project-import-error" role="alert">
              {importError}
            </p>
          )}
        </div>
        <div className={styles.actionGroup}>
          <span>{t("home.export")}</span>
          <button
            className={styles.actionButtonSecondary}
            onClick={handleExportMarkdown}
            type="button"
          >
            <FileDown aria-hidden="true" size={17} />
            {t("home.exportMd")}
          </button>
          <button
            className={styles.actionButtonPrimary}
            onClick={() => window.print()}
            type="button"
          >
            <Printer aria-hidden="true" size={17} />
            {t("home.print")}
          </button>
        </div>
      </div>
      </>}

      {importError && corruptStorage && (
        <p className={styles.importError} id="project-import-error" role="alert">{importError}</p>
      )}

      {pickerOpen && (
        <TemplatePicker
          onSelect={(id) => {
            setPickerOpen(false);
            setPendingTemplate(id);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {pendingTemplate && (
        <ConfirmDialog
          title={t("templates.overwriteTitle")}
          message={t("templates.overwriteMessage")}
          confirmLabel={t("templates.overwriteConfirm")}
          onConfirm={confirmTemplate}
          onCancel={() => setPendingTemplate(null)}
        />
      )}

      {pendingImport && (
        <ConfirmDialog
          title={t("storage.importTitle")}
          message={t("storage.importMessage")}
          confirmLabel={t("storage.importConfirm")}
          danger
          onConfirm={confirmImport}
          onCancel={cancelImport}
        />
      )}

      {resetOpen && (
        <ConfirmDialog
          title={t("home.resetTitle")}
          message={t("home.resetConfirm")}
          confirmLabel={t("home.resetConfirmButton")}
          danger
          onConfirm={() => {
            clearSession();
            setCanvasRevision((revision) => revision + 1);
            setResetOpen(false);
          }}
          onCancel={() => setResetOpen(false)}
        />
      )}

      {recoveryResetOpen && (
        <ConfirmDialog
          title={t("home.resetTitle")}
          message={t("home.resetConfirm")}
          confirmLabel={t("storage.startFresh")}
          danger
          onConfirm={() => {
            recoverWithFreshProject();
            setRecoveryResetOpen(false);
          }}
          onCancel={() => setRecoveryResetOpen(false)}
        />
      )}
    </div>
  );
}
