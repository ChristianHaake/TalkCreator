import { DragDropContext } from "@hello-pangea/dnd";
import type { DropResult, ResponderProvided } from "@hello-pangea/dnd";
import { FileDown, FileUp, LayoutTemplate, Printer, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { MAX_QUESTIONS_PER_PHASE } from "../domain/projectSchema";
import { createProjectFromTemplate, type TemplateId } from "../domain/templates";
import type { InterviewPhases } from "../domain/types";
import { TalkCanvas } from "../features/canvas/TalkCanvas";
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
  const { state, setState, clearSession, applyProject } = useSessionPersistence();
  const { t, locale } = useTranslation();
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateId | null>(null);
  const configInputRef = useRef<HTMLInputElement>(null);
  const { handleDownload, handleExportMarkdown, handleUpload } = useProjectStorage(
    state,
    (next) => {
      setState(next);
      setCanvasRevision((revision) => revision + 1);
    },
  );

  if (!state) {
    return <div className={styles.loadingState}>{t("home.loadingProject")}</div>;
  }

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

        <div className={styles.canvasStage}>
          <DragDropContext key={canvasRevision} onDragEnd={handleDragEnd}>
            <TalkCanvas state={state} onChange={setState} />
          </DragDropContext>
        </div>
      </section>

      <div className={styles.actionBar}>
        <div className={styles.actionGroup}>
          <span>{t("home.project")}</span>
          <button
            className={styles.actionButtonSecondary}
            onClick={() => configInputRef.current?.click()}
            type="button"
          >
            <FileUp aria-hidden="true" size={17} />
            {t("home.load")}
          </button>
          <input
            accept=".json,application/json"
            className="visually-hidden"
            onChange={handleUpload}
            ref={configInputRef}
            type="file"
          />
          <button
            className={styles.actionButtonSecondary}
            onClick={handleDownload}
            type="button"
          >
            <FileDown aria-hidden="true" size={17} />
            {t("home.save")}
          </button>
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
    </div>
  );
}
