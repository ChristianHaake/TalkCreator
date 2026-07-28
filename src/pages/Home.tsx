import { useState, useRef } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import type { DropResult, ResponderProvided } from "@hello-pangea/dnd";
import { FileDown, FileUp, LayoutTemplate, Printer, RotateCcw } from "lucide-react";
import { useSessionPersistence } from "../shared/hooks/useSessionPersistence";
import { useProjectStorage } from "../shared/hooks/useProjectStorage";
import { ProjectMetadata } from "../features/editor/ProjectMetadata";
import { ChecklistEditor } from "../features/editor/ChecklistEditor";
import { SourceEditor } from "../features/editor/SourceEditor";
import { QuestionList } from "../features/editor/QuestionList";
import { TimeBudget } from "../features/editor/TimeBudget";
import { TemplatePicker } from "../features/templates/TemplatePicker";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { InterviewPreview } from "../features/preview/InterviewPreview";
import { MAX_QUESTIONS_PER_PHASE } from "../domain/projectSchema";
import { moveQuestionWithAnnouncement } from "../features/editor/questionMove";
import { createProjectFromTemplate, type TemplateId } from "../domain/templates";
import type { InterviewPhases } from "../domain/types";
import styles from "./Home.module.css";
import { useTranslation } from "../i18n";

const droppablePhase: Record<string, keyof InterviewPhases> = {
  "intro-list": "intro",
  "main-list": "main",
  "outro-list": "outro",
};

export function Home() {
  const { state, setState, clearSession, applyProject } = useSessionPersistence();
  const { t, locale } = useTranslation();
  const [editorRevision, setEditorRevision] = useState(0);
  const { handleDownload, handleExportMarkdown, handleUpload } = useProjectStorage(state, (next) => {
    setState(next);
    setEditorRevision((revision) => revision + 1);
  });
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const [resetOpen, setResetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateId | null>(null);
  const configInputRef = useRef<HTMLInputElement>(null);

  if (!state) {
    return <div className={styles.loadingState}>{t("home.loadingProject")}</div>;
  }

  const totalPlanned = [...state.phases.intro, ...state.phases.main, ...state.phases.outro].reduce(
    (sum, question) => sum + (question.estimated_minutes ?? 0),
    0,
  );

  const handlePrint = () => {
    window.print();
  };

  const handleTemplateChosen = (id: TemplateId) => {
    setPickerOpen(false);
    setPendingTemplate(id);
  };

  const confirmTemplate = () => {
    if (pendingTemplate) {
      applyProject(createProjectFromTemplate(pendingTemplate, locale));
      setEditorRevision((revision) => revision + 1);
    }
    setPendingTemplate(null);
  };

  const handleDragEnd = (result: DropResult, provided: ResponderProvided) => {
    if (!result.destination) return;

    const sourcePhase = droppablePhase[result.source.droppableId];
    const destinationPhase = droppablePhase[result.destination.droppableId];
    if (!sourcePhase || !destinationPhase) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourcePhase === destinationPhase && sourceIndex === destinationIndex) return;

    const destinationTitle = t(`editor.${destinationPhase}Title`);
    const moveResult = moveQuestionWithAnnouncement({
      phases: state.phases,
      source: { phase: sourcePhase, index: sourceIndex },
      destination: { phase: destinationPhase, index: destinationIndex },
      announce: provided.announce,
      blockedMessage: t("editor.moveQuestionBlocked", { max: MAX_QUESTIONS_PER_PHASE }),
      successMessage: t("editor.moveQuestionSuccess", {
        section: destinationTitle,
        position: destinationIndex + 1,
      }),
    });
    if (!moveResult.moved) {
      return;
    }

    setState({
      ...state,
      phases: moveResult.phases,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.mobileViewToggle} aria-label={t("home.switchView")}>
        <button
          className={mobileView === "editor" ? styles.activeTab : ""}
          onClick={() => setMobileView("editor")}
          type="button"
          aria-pressed={mobileView === "editor"}
        >
          {t("tab.editor")}
        </button>
        <button
          className={mobileView === "preview" ? styles.activeTab : ""}
          onClick={() => setMobileView("preview")}
          type="button"
          aria-pressed={mobileView === "preview"}
        >
          {t("tab.preview")}
        </button>
      </div>

      <div className={styles.workspace}>
        {/* Editor Panel */}
        <section
          className={`${styles.editorPanel} ${
            mobileView === "editor" ? styles.mobilePanelActive : ""
          }`}
          aria-label={t("tab.editor")}
        >
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.panelKicker}>{t("tab.editor")}</span>
              <h2>{t("home.editorTitle")}</h2>
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

          <div className={styles.editorContent}>
            <ProjectMetadata
              title={state.title}
              partner={state.partner}
              onTitleChange={(value) => setState({ ...state, title: value })}
              onPartnerChange={(value) => setState({ ...state, partner: value })}
            />

            <TimeBudget
              planned={totalPlanned}
              target={state.target_minutes}
              onTargetChange={(value) => setState({ ...state, target_minutes: value })}
            />

            <ChecklistEditor
              checklist={state.checklist || []}
              onChange={(cl) => setState({ ...state, checklist: cl })}
            />

            <DragDropContext key={editorRevision} onDragEnd={handleDragEnd}>
              <QuestionList
                title={t("editor.introTitle")}
                droppableId="intro-list"
                emptyMessage={t("editor.introEmpty")}
                phaseKey="intro"
                questions={state.phases.intro}
                onChange={(qs) => setState({ ...state, phases: { ...state.phases, intro: qs } })}
              />

              <QuestionList
                title={t("editor.mainTitle")}
                droppableId="main-list"
                emptyMessage={t("editor.mainEmpty")}
                phaseKey="main"
                questions={state.phases.main}
                onChange={(qs) => setState({ ...state, phases: { ...state.phases, main: qs } })}
              />

              <QuestionList
                title={t("editor.outroTitle")}
                droppableId="outro-list"
                emptyMessage={t("editor.outroEmpty")}
                phaseKey="outro"
                questions={state.phases.outro}
                onChange={(qs) => setState({ ...state, phases: { ...state.phases, outro: qs } })}
              />
            </DragDropContext>

            <SourceEditor
              sources={state.sources || []}
              onChange={(s) => setState({ ...state, sources: s })}
            />
          </div>
        </section>

        {/* Preview Panel */}
        <section
          className={`${styles.previewPanel} ${
            mobileView === "preview" ? styles.mobilePanelActive : ""
          }`}
          aria-label={t("tab.preview")}
        >
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.panelKicker}>{t("home.livePreview")}</span>
              <p>{t("home.localView")}</p>
            </div>
            <span className={styles.liveIndicator}>
              <span /> Live
            </span>
          </div>

          <div className={styles.previewStage}>
            <InterviewPreview state={state} />
          </div>
        </section>
      </div>

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
            onClick={handlePrint}
            type="button"
          >
            <Printer aria-hidden="true" size={17} />
            {t("home.print")}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <TemplatePicker onSelect={handleTemplateChosen} onClose={() => setPickerOpen(false)} />
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
            setEditorRevision((revision) => revision + 1);
            setResetOpen(false);
          }}
          onCancel={() => setResetOpen(false)}
        />
      )}
    </div>
  );
}
