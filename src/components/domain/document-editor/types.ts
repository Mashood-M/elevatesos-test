export type DocumentMeta = {
  status: string;
  type?: string;
  chapterName?: string;
  eventTitle?: string;
  authorName?: string;
  updatedAt?: string;
  source?: string;
  hqComment?: string;
};

export type SaveState = "saved" | "dirty" | "saving";

export type DocumentEditorProps = {
  initialHtml?: string;
  initialJson?: string;
  editable?: boolean;
  title: string;
  onTitleChange?: (title: string) => void;
  meta: DocumentMeta;
  libraryHref: string;
  libraryLabel?: string;
  saveState?: SaveState;
  onChange?: (payload: { html: string; json: string }) => void;
  onSave?: () => void;
  onExportDocx?: () => void;
  onSubmit?: () => void;
  showSubmit?: boolean;
  submitLabel?: string;
  onApprove?: (comment: string) => void;
  onRequestCorrection?: (comment: string) => void;
  onReject?: (comment: string) => void;
  showApprove?: boolean;
  exportLabel?: string;
  className?: string;
  /** Full-viewport Word frame covering app chrome. Default true. */
  immersive?: boolean;
};
