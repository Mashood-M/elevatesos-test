"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import QRCode from "react-qr-code";
import { CertificateTemplate } from "@/types";
import {
  exportCertificateAsPptx,
  importCertificateFromPptx,
  PptxExportOptions,
} from "@/lib/certificates/pptx";
import { DEFAULT_CERTIFICATE_TEMPLATES } from "@/lib/certificates/templates";
import { Button } from "@/components/ui/button";
import { Input, FieldLabel } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Award,
  Bold,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileUp,
  Grid,
  GripVertical,
  Italic,
  Layers,
  LayoutTemplate,
  Move,
  Palette,
  PenTool,
  Plus,
  Printer,
  Redo2,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
  Trash2,
  Type,
  Underline,
  Undo2,
  Upload,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export type CanvaLayerId =
  | "mainTitle"
  | "subTitle"
  | "preamble"
  | "recipientName"
  | "description"
  | "signatory1"
  | "signatory2"
  | "bottomLeft"
  | "bottomRight"
  | "seal"
  | "qrCode"
  | "headerLogo"
  | "headerGraphic"
  | "blcGraphic"
  | "pixelSmiley"
  | "staircaseFlag"
  | "cornerWave";

export interface LayerTransform {
  x: number;
  y: number;
  scale: number;
  visible: boolean;
}

export interface LayerStyleOverride {
  fontFamily?: string;
  fontSizeMultiplier?: number;
  color?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isUppercase?: boolean;
  letterSpacing?: string;
  textAlign?: "left" | "center" | "right";
}

export interface CertificateCanvaEditorProps {
  initialTemplate: CertificateTemplate;
  chapterName?: string;
  institutionName?: string;
  chapterSlug?: string;
  onSaveTemplate?: (saved: CertificateTemplate) => void;
  templatesList?: CertificateTemplate[];
  onSelectTemplate?: (tpl: CertificateTemplate) => void;
  className?: string;
}

const AVAILABLE_FONTS = [
  { label: "Montserrat (Certificate Default)", value: "'Montserrat', sans-serif" },
  { label: "Syne (Elevates Brand)", value: "var(--font-syne), 'Syne', sans-serif" },
  { label: "Plus Jakarta Sans (Modern UI)", value: "var(--font-sans), 'Plus Jakarta Sans', sans-serif" },
  { label: "Cinzel (Classic Roman)", value: "'Cinzel', Georgia, serif" },
  { label: "Playfair Display (Serif)", value: "'Playfair Display', Georgia, serif" },
  { label: "IBM Plex Mono (Technical Code)", value: "var(--font-mono), 'IBM Plex Mono', monospace" },
];

const QUICK_COLORS = [
  { label: "Ink Charcoal", value: "#111111" },
  { label: "Flame Accent", value: "#f26430" },
  { label: "Elevates Indigo", value: "#414066" },
  { label: "Sage Green", value: "#5f7560" },
  { label: "Gold Honor", value: "#d97706" },
  { label: "Royal Blue", value: "#2563eb" },
  { label: "Muted Gray", value: "#6b7280" },
  { label: "Light Graphite", value: "#9ca3af" },
];

const DEFAULT_LAYER_TRANSFORMS: Record<CanvaLayerId, LayerTransform> = {
  mainTitle: { x: 0, y: 0, scale: 1, visible: true },
  subTitle: { x: 0, y: 0, scale: 1, visible: true },
  preamble: { x: 0, y: 0, scale: 1, visible: true },
  recipientName: { x: 0, y: 0, scale: 1, visible: true },
  description: { x: 0, y: 0, scale: 1, visible: true },
  signatory1: { x: 0, y: 0, scale: 1, visible: true },
  signatory2: { x: 0, y: 0, scale: 1, visible: true },
  bottomLeft: { x: 0, y: 0, scale: 1, visible: true },
  bottomRight: { x: 0, y: 0, scale: 1, visible: true },
  seal: { x: 0, y: 0, scale: 1, visible: true },
  qrCode: { x: 0, y: 0, scale: 1, visible: true },
  headerLogo: { x: 0, y: 0, scale: 1, visible: true },
  headerGraphic: { x: 0, y: 0, scale: 1, visible: true },
  blcGraphic: { x: 0, y: 0, scale: 1, visible: true },
  pixelSmiley: { x: 0, y: 0, scale: 1, visible: true },
  staircaseFlag: { x: 0, y: 0, scale: 1, visible: true },
  cornerWave: { x: 0, y: 0, scale: 1, visible: true },
};

interface HistorySnapshot {
  draft: CertificateTemplate;
  transforms: Record<CanvaLayerId, LayerTransform>;
  styles: Record<string, LayerStyleOverride>;
}

export function CertificateCanvaEditor({
  initialTemplate,
  chapterName = "EKC Chapter",
  institutionName = "Elevates Student Community",
  chapterSlug = "ekc",
  onSaveTemplate,
  templatesList = DEFAULT_CERTIFICATE_TEMPLATES,
  onSelectTemplate,
  className = "",
}: CertificateCanvaEditorProps) {
  // Current working draft of the template
  const [draft, setDraft] = useState<CertificateTemplate>({ ...initialTemplate });

  // Transforms per layer (Position X/Y, Scale, Visibility)
  const [transforms, setTransforms] = useState<Record<CanvaLayerId, LayerTransform>>({
    ...DEFAULT_LAYER_TRANSFORMS,
  });

  // Styles per layer (Font, Color, Bold, Italic, Alignment, Tracking)
  const [layerStyles, setLayerStyles] = useState<Record<string, LayerStyleOverride>>({
    mainTitle: { fontFamily: "'Montserrat', sans-serif", color: "#111111", isBold: true, isUppercase: true, textAlign: "center" },
    subTitle: { fontFamily: "'Montserrat', sans-serif", color: "#f26430", isBold: true, isUppercase: true, letterSpacing: "0.35em", textAlign: "center" },
    preamble: { fontFamily: "'Montserrat', sans-serif", color: "#9ca3af", isBold: false, isUppercase: true, letterSpacing: "0.25em", textAlign: "center" },
    recipientName: { fontFamily: "'Montserrat', sans-serif", color: "#111111", isBold: true, textAlign: "center" },
    description: { fontFamily: "'Montserrat', sans-serif", color: "#4b5563", isBold: false, textAlign: "center" },
    bottomLeft: { fontFamily: "var(--font-mono), monospace", color: "#9ca3af", isUppercase: true, letterSpacing: "0.25em", textAlign: "left" },
    bottomRight: { fontFamily: "var(--font-mono), monospace", color: "#9ca3af", isUppercase: true, letterSpacing: "0.25em", textAlign: "right" },
  });

  // History stack for Undo / Redo
  const [history, setHistory] = useState<HistorySnapshot[]>([
    {
      draft: { ...initialTemplate },
      transforms: { ...DEFAULT_LAYER_TRANSFORMS },
      styles: {
        mainTitle: { fontFamily: "'Montserrat', sans-serif", color: "#111111", isBold: true, isUppercase: true, textAlign: "center" },
        subTitle: { fontFamily: "'Montserrat', sans-serif", color: "#f26430", isBold: true, isUppercase: true, letterSpacing: "0.35em", textAlign: "center" },
        preamble: { fontFamily: "'Montserrat', sans-serif", color: "#9ca3af", isBold: false, isUppercase: true, letterSpacing: "0.25em", textAlign: "center" },
        recipientName: { fontFamily: "'Montserrat', sans-serif", color: "#111111", isBold: true, textAlign: "center" },
        description: { fontFamily: "'Montserrat', sans-serif", color: "#4b5563", isBold: false, textAlign: "center" },
        bottomLeft: { fontFamily: "var(--font-mono), monospace", color: "#9ca3af", isUppercase: true, letterSpacing: "0.25em", textAlign: "left" },
        bottomRight: { fontFamily: "var(--font-mono), monospace", color: "#9ca3af", isUppercase: true, letterSpacing: "0.25em", textAlign: "right" },
      },
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Sync with prop when switched externally
  useEffect(() => {
    setDraft({ ...initialTemplate });
    setTransforms({ ...DEFAULT_LAYER_TRANSFORMS });
    setHistory([
      {
        draft: { ...initialTemplate },
        transforms: { ...DEFAULT_LAYER_TRANSFORMS },
        styles: { ...layerStyles },
      },
    ]);
    setHistoryIndex(0);
  }, [initialTemplate.id]);

  // Push snapshot to history
  const pushHistorySnapshot = useCallback(
    (newDraft = draft, newTransforms = transforms, newStyles = layerStyles) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [
          ...sliced,
          {
            draft: { ...newDraft },
            transforms: { ...newTransforms },
            styles: { ...newStyles },
          },
        ];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [draft, transforms, layerStyles, historyIndex]
  );

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const snap = history[nextIndex];
      setHistoryIndex(nextIndex);
      setDraft(snap.draft);
      setTransforms(snap.transforms);
      setLayerStyles(snap.styles);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const snap = history[nextIndex];
      setHistoryIndex(nextIndex);
      setDraft(snap.draft);
      setTransforms(snap.transforms);
      setLayerStyles(snap.styles);
    }
  }, [historyIndex, history]);

  // Update a layer transform
  function updateLayerTransform(layerId: CanvaLayerId, partial: Partial<LayerTransform>, commit = true) {
    setTransforms((prev) => {
      const updated = {
        ...prev,
        [layerId]: {
          ...(prev[layerId] || { x: 0, y: 0, scale: 1, visible: true }),
          ...partial,
        },
      };
      if (commit) {
        pushHistorySnapshot(draft, updated, layerStyles);
      }
      return updated;
    });
  }

  // Delete / Hide a layer
  function handleDeleteLayer(layerId: CanvaLayerId) {
    updateLayerTransform(layerId, { visible: false }, true);
    setSelectedLayer(null);
    setInlineEditingLayer(null);
    showNotification("info", `Deleted ${getLayerName(layerId)}. Press Ctrl+Z to undo.`);
  }

  // Restore / Show all layers
  function handleRestoreAllLayers() {
    const restored: Record<CanvaLayerId, LayerTransform> = { ...transforms };
    (Object.keys(restored) as CanvaLayerId[]).forEach((k) => {
      restored[k] = { ...restored[k], visible: true };
    });
    setTransforms(restored);
    pushHistorySnapshot(draft, restored, layerStyles);
    showNotification("success", "All symbols and elements restored to canvas.");
  }

  // Update layer styles
  function updateLayerStyle(layerId: string, style: Partial<LayerStyleOverride>) {
    setLayerStyles((prev) => {
      const updated = {
        ...prev,
        [layerId]: {
          ...(prev[layerId] || {}),
          ...style,
        },
      };
      pushHistorySnapshot(draft, transforms, updated);
      return updated;
    });
  }

  // Editor UI state
  const [activeTab, setActiveTab] = useState<"templates" | "text" | "signatures" | "elements" | "canvas">("text");
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<CanvaLayerId | null>("mainTitle");
  const [inlineEditingLayer, setInlineEditingLayer] = useState<CanvaLayerId | null>(null);

  // Zoom controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFitMode, setIsFitMode] = useState(true);

  // Student Preview state
  const [isStudentPreview, setIsStudentPreview] = useState(false);
  const [sampleStudentName, setSampleStudentName] = useState("Aditya Prakash");

  // Notifications
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // File Input Refs
  const pptxFileInputRef = useRef<HTMLInputElement>(null);
  const sig1InputRef = useRef<HTMLInputElement>(null);
  const sig2InputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Color picker popover state in contextual ribbon
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Watermark Opacity (default 0.07 matching original PPTX)
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.07);

  // Dragging & Resizing active pointer interaction state
  const dragStateRef = useRef<{
    layerId: CanvaLayerId;
    type: "move" | "resize";
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialScale: number;
  } | null>(null);

  // ─── POINTER LISTENERS FOR MOVING & RESIZING ──────────────────────
  const handlePointerDown = (
    e: React.PointerEvent,
    layerId: CanvaLayerId,
    type: "move" | "resize"
  ) => {
    // If inline editing, ignore drag
    if (inlineEditingLayer === layerId) return;

    e.stopPropagation();
    setSelectedLayer(layerId);

    const current = transforms[layerId] || { x: 0, y: 0, scale: 1, visible: true };
    dragStateRef.current = {
      layerId,
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialX: current.x,
      initialY: current.y,
      initialScale: current.scale,
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (!dragStateRef.current) return;
      const state = dragStateRef.current;
      const zoom = isFitMode ? 1 : zoomLevel / 100;

      if (state.type === "move") {
        const dx = (ev.clientX - state.startX) / zoom;
        const dy = (ev.clientY - state.startY) / zoom;
        setTransforms((prev) => ({
          ...prev,
          [state.layerId]: {
            ...prev[state.layerId],
            x: Math.round(state.initialX + dx),
            y: Math.round(state.initialY + dy),
          },
        }));
      } else if (state.type === "resize") {
        const dx = (ev.clientX - state.startX) / zoom;
        const dy = (ev.clientY - state.startY) / zoom;
        const distanceDelta = (dx + dy) / 120;
        const newScale = Math.max(0.3, Math.min(2.5, Number((state.initialScale + distanceDelta).toFixed(2))));
        setTransforms((prev) => ({
          ...prev,
          [state.layerId]: {
            ...prev[state.layerId],
            scale: newScale,
          },
        }));
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (dragStateRef.current) {
        pushHistorySnapshot();
        dragStateRef.current = null;
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Keyboard shortcut listener (Ctrl+Z, Ctrl+Y, Delete, Backspace, Escape)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputFocused = activeTag === "input" || activeTag === "textarea";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedLayer && !isInputFocused && !inlineEditingLayer) {
        e.preventDefault();
        handleDeleteLayer(selectedLayer);
      } else if (e.key === "Escape") {
        setInlineEditingLayer(null);
        setSelectedLayer(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, selectedLayer, inlineEditingLayer]);

  function showNotification(type: "success" | "error" | "info", text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4500);
  }

  // Focus inline input when editing begins
  useEffect(() => {
    if (inlineEditingLayer && inlineInputRef.current) {
      inlineInputRef.current.focus();
      if ("select" in inlineInputRef.current) {
        inlineInputRef.current.select();
      }
    }
  }, [inlineEditingLayer]);

  // ─── PPTX EXPORT ───────────────────────────────────────────────────
  async function handleExportPptx() {
    try {
      setIsExporting(true);
      const recipient = isStudentPreview ? sampleStudentName : "{recipient_name}";
      const options: PptxExportOptions = {
        recipientName: recipient,
        chapterName,
        institutionName: draft.signatory1Org || institutionName,
        filename: isStudentPreview
          ? `${sampleStudentName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Elevates_Certificate.pptx`
          : `${(draft.name || "Elevates_Certificate").replace(/[^a-zA-Z0-9_-]/g, "_")}.pptx`,
      };

      const result = await exportCertificateAsPptx(draft, options);
      showNotification("success", `PowerPoint file "${result.filename}" downloaded successfully!`);
    } catch (err: any) {
      console.error("PPTX Export Error:", err);
      showNotification("error", `Failed to export PPTX: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  }

  // ─── PPTX IMPORT (Upgraded & Robust) ──────────────────────────────
  async function handleImportPptxFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pptx")) {
      showNotification("error", "Please select a valid PowerPoint (.pptx) file.");
      return;
    }

    try {
      setIsImporting(true);
      const arrayBuffer = await file.arrayBuffer();
      const parsed = await importCertificateFromPptx(arrayBuffer, draft.chapterId);

      // Apply imported template and reset layer visibility so all elements display
      setDraft(parsed);
      const resetTransforms: Record<CanvaLayerId, LayerTransform> = { ...DEFAULT_LAYER_TRANSFORMS };
      setTransforms(resetTransforms);
      pushHistorySnapshot(parsed, resetTransforms, layerStyles);
      setSelectedLayer("mainTitle");
      showNotification("success", `Imported "${file.name}" with full layer fidelity!`);
    } catch (err: any) {
      console.error("PPTX Import Error:", err);
      showNotification("error", `Failed to parse PowerPoint presentation: ${err.message || "Invalid or corrupt PPTX"}`);
    } finally {
      setIsImporting(false);
      if (pptxFileInputRef.current) pptxFileInputRef.current.value = "";
    }
  }

  // ─── SAVE TEMPLATE ─────────────────────────────────────────────────
  function handleSave() {
    if (!draft.name?.trim()) {
      showNotification("error", "Template name cannot be empty.");
      return;
    }
    if (onSaveTemplate) {
      onSaveTemplate(draft);
    }
    showNotification("success", `Template "${draft.name}" saved to chapter library.`);
  }

  // ─── SIGNATURE IMAGE UPLOAD ────────────────────────────────────────
  function handleSignatureUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    which: "sig1" | "sig2"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated =
        which === "sig1"
          ? { ...draft, signatory1SignatureUrl: dataUrl }
          : { ...draft, signatory2SignatureUrl: dataUrl };
      setDraft(updated);
      pushHistorySnapshot(updated, transforms, layerStyles);
      showNotification("success", `${which === "sig1" ? "Signatory 1" : "Signatory 2"} signature PNG updated.`);
    };
    reader.readAsDataURL(file);
  }

  function getLayerName(layer: CanvaLayerId): string {
    switch (layer) {
      case "mainTitle": return "Main Title";
      case "subTitle": return "Subtitle";
      case "preamble": return "Preamble";
      case "recipientName": return "Recipient Name";
      case "description": return "Citation Body";
      case "signatory1": return "Signatory 1";
      case "signatory2": return "Signatory 2";
      case "bottomLeft": return "Bottom Left Motto";
      case "bottomRight": return "Bottom Right Motto";
      case "seal": return "Official Seal";
      case "qrCode": return "QR Verification Box";
      case "headerLogo": return "Elevates Logo";
      case "headerGraphic": return "Flourish Loop";
      case "blcGraphic": return "Build Learn Create Badge";
      case "pixelSmiley": return "Pixel Smiley";
      case "staircaseFlag": return "Staircase Flag";
      case "cornerWave": return "Corner Wave";
      default: return "Element";
    }
  }

  const isLayerText = useMemo(() => {
    return (
      selectedLayer === "mainTitle" ||
      selectedLayer === "subTitle" ||
      selectedLayer === "preamble" ||
      selectedLayer === "recipientName" ||
      selectedLayer === "description" ||
      selectedLayer === "bottomLeft" ||
      selectedLayer === "bottomRight"
    );
  }, [selectedLayer]);

  // Display subtitle
  const displaySubtitle = draft.subTitle || "O F   R E C O G N I T I O N";

  // Display recipient
  const displayRecipient = isStudentPreview ? sampleStudentName : "{recipient_name}";

  // Display description
  const displayDescription =
    draft.description ||
    "has been an active member of Elevates and has demonstrated dedication, curiosity, and a commitment to learning, building, and creating a better tomorrow.";

  // Zoom scale transform
  const zoomScale = isFitMode ? 1 : zoomLevel / 100;

  // Active layer transform and style
  const activeTransform = selectedLayer ? transforms[selectedLayer] || { x: 0, y: 0, scale: 1, visible: true } : null;
  const activeStyle = selectedLayer ? layerStyles[selectedLayer] || {} : {};

  return (
    <div
      className={`flex flex-col h-full bg-[#f3f4f6] text-[#2d2d34] rounded-2xl overflow-hidden border border-neutral-200/80 shadow-md select-none font-sans ${className}`}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP STUDIO NAVIGATION BAR (Finexy-Light Canva Style) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="h-14 bg-white border-b border-neutral-200/80 px-4 flex items-center justify-between gap-3 z-30 shrink-0 shadow-xs">
        {/* Left: Elevates Icon, Template Name, Autosave Indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#f26430] border border-orange-200/70 shadow-2xs">
              <Sparkles size={17} />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => {
                    const updated = { ...draft, name: e.target.value };
                    setDraft(updated);
                    pushHistorySnapshot(updated, transforms, layerStyles);
                  }}
                  className="bg-transparent text-xs sm:text-sm font-bold text-[#2d2d34] focus:outline-none focus:bg-neutral-50 px-1.5 py-0.5 rounded-md transition border border-transparent hover:border-neutral-200 max-w-[200px] sm:max-w-[280px] truncate"
                  title="Click to rename certificate template"
                />
                <Edit3 size={11} className="text-neutral-400 shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-neutral-500 px-1.5">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <Cloud size={11} />
                  <span>PPTX Synced</span>
                </span>
                <span className="h-1 w-1 rounded-full bg-neutral-300" />
                <span className="font-mono">17 Interactive Elements</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Undo / Redo, Student Preview Toggle & Zoom Suite */}
        <div className="hidden lg:flex items-center gap-1 bg-neutral-100/80 p-1 rounded-xl border border-neutral-200 text-xs">
          {/* Undo / Redo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={14} />
          </button>

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* Student Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsStudentPreview(!isStudentPreview)}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition ${
              isStudentPreview
                ? "bg-[#f26430] text-white shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-white"
            }`}
            title="Toggle between template variables and student live preview"
          >
            <User size={13} />
            <span>{isStudentPreview ? "Student View" : "Template View"}</span>
          </button>

          {isStudentPreview && (
            <input
              type="text"
              value={sampleStudentName}
              onChange={(e) => setSampleStudentName(e.target.value)}
              placeholder="Student Name"
              className="h-6 w-32 px-2 text-xs bg-white border border-neutral-200 rounded-md text-neutral-900 focus:outline-none focus:border-[#f26430]"
              title="Type sample recipient name to preview on certificate"
            />
          )}

          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {/* Zoom Buttons */}
          <button
            type="button"
            onClick={() => {
              setIsFitMode(false);
              setZoomLevel((prev) => Math.max(50, prev - 15));
            }}
            className="p-1.5 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-white transition"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFitMode(true);
              setZoomLevel(100);
            }}
            className={`px-2 py-0.5 text-xs rounded-md transition font-mono ${
              isFitMode
                ? "text-[#f26430] font-bold bg-orange-50"
                : "text-neutral-700 hover:text-neutral-900"
            }`}
            title="Fit to Screen"
          >
            {isFitMode ? "FIT" : `${zoomLevel}%`}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFitMode(false);
              setZoomLevel((prev) => Math.min(150, prev + 15));
            }}
            className="p-1.5 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-white transition"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Right: Actions (Import PPTX, Print, Save, Export PPTX) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Hidden File Input for PPTX */}
          <input
            type="file"
            ref={pptxFileInputRef}
            accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="hidden"
            onChange={handleImportPptxFile}
          />

          <Button
            variant="secondary"
            onClick={() => pptxFileInputRef.current?.click()}
            disabled={isImporting}
            className="text-xs h-8 px-2.5 sm:px-3 bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200 flex items-center gap-1.5"
            title="Import an existing PowerPoint certificate template (.pptx)"
          >
            <FileUp size={14} className={isImporting ? "animate-spin text-[#f26430]" : "text-[#f26430]"} />
            <span className="hidden sm:inline">Import PPTX</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
            className="text-xs h-8 px-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 hidden md:flex items-center gap-1"
            title="Print or Save as PDF"
          >
            <Printer size={14} />
          </Button>

          <Button
            variant="secondary"
            onClick={handleSave}
            className="text-xs h-8 px-3 bg-neutral-900 hover:bg-neutral-800 text-white font-medium border-transparent shadow-xs"
            title="Save template into chapter library"
          >
            <Save size={13} className="mr-1 inline" />
            <span>Save</span>
          </Button>

          <Button
            variant="orange"
            onClick={handleExportPptx}
            disabled={isExporting}
            className="text-xs h-8 px-3.5 flex items-center gap-1.5 font-semibold shadow-xs"
            title="Export native PowerPoint presentation (.pptx)"
          >
            <Download size={14} className={isExporting ? "animate-bounce" : ""} />
            <span>Export PPTX</span>
          </Button>
        </div>
      </header>

      {/* Notifications Banner */}
      {notice && (
        <div
          className={`px-4 py-2 text-xs font-semibold flex items-center justify-between border-b ${
            notice.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : notice.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-blue-50 text-blue-800 border-blue-200"
          } transition-all`}
        >
          <div className="flex items-center gap-2">
            <Check size={14} />
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. CANVA CONTEXTUAL FORMATTING RIBBON (Top Secondary Toolbar) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedLayer && activeTransform && activeTransform.visible && (
        <div className="h-11 bg-white border-b border-neutral-200 px-4 flex items-center gap-2 text-xs z-20 shrink-0 overflow-x-auto shadow-2xs">
          {/* Active Layer Badge */}
          <div className="flex items-center gap-1.5 font-bold text-neutral-800 shrink-0 pr-2 border-r border-neutral-200">
            <span className="h-2 w-2 rounded-full bg-[#f26430]" />
            <span>{getLayerName(selectedLayer)}</span>
          </div>

          {/* Scale Stepper (Resize) */}
          <div className="flex items-center gap-0.5 bg-neutral-50 border border-neutral-200 rounded-lg px-1 h-7 shrink-0" title="Scale / Resize">
            <button
              type="button"
              onClick={() => {
                const nextScale = Math.max(0.3, Number((activeTransform.scale - 0.1).toFixed(2)));
                updateLayerTransform(selectedLayer, { scale: nextScale });
              }}
              className="px-1.5 text-neutral-600 hover:text-neutral-900 font-bold"
              title="Decrease Size (-10%)"
            >
              -
            </button>
            <span className="text-[11px] font-mono px-1 text-neutral-800 min-w-[38px] text-center font-bold">
              {Math.round(activeTransform.scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => {
                const nextScale = Math.min(2.5, Number((activeTransform.scale + 0.1).toFixed(2)));
                updateLayerTransform(selectedLayer, { scale: nextScale });
              }}
              className="px-1.5 text-neutral-600 hover:text-neutral-900 font-bold"
              title="Increase Size (+10%)"
            >
              +
            </button>
          </div>

          {/* Quick Center / Reset Position */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => updateLayerTransform(selectedLayer, { x: 0 })}
              className="h-7 px-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-700 flex items-center gap-1 text-[11px]"
              title="Center Horizontally"
            >
              <AlignCenter size={12} />
              <span>Center</span>
            </button>
            <button
              type="button"
              onClick={() => updateLayerTransform(selectedLayer, { x: 0, y: 0, scale: 1 })}
              className="h-7 px-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-700 flex items-center gap-1 text-[11px]"
              title="Reset Position & Size"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-200 mx-0.5" />

          {isLayerText ? (
            <>
              {/* Font Family Selector */}
              <div className="relative shrink-0">
                <select
                  value={activeStyle.fontFamily || "'Montserrat', sans-serif"}
                  onChange={(e) => updateLayerStyle(selectedLayer, { fontFamily: e.target.value })}
                  className="h-7 px-2 text-xs bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-800 font-medium focus:outline-none focus:border-[#f26430] cursor-pointer"
                  title="Font Family"
                >
                  {AVAILABLE_FONTS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Swatch & Popover */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="h-7 px-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg flex items-center gap-1.5 text-xs text-neutral-700"
                  title="Text Color"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-neutral-300 shadow-2xs shrink-0"
                    style={{ backgroundColor: activeStyle.color || "#111111" }}
                  />
                  <ChevronDown size={11} className="text-neutral-400" />
                </button>

                {showColorPicker && (
                  <div className="absolute top-9 left-0 bg-white border border-neutral-200 rounded-xl p-2.5 shadow-xl z-50 w-52 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                      Text Palette
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {QUICK_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => {
                            updateLayerStyle(selectedLayer, { color: c.value });
                            setShowColorPicker(false);
                          }}
                          className="w-full h-7 rounded-lg border border-neutral-200 flex items-center justify-center hover:scale-105 transition"
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        >
                          {activeStyle.color === c.value && (
                            <Check
                              size={12}
                              className={c.value === "#111111" || c.value === "#414066" ? "text-white" : "text-neutral-900"}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="pt-1 border-t border-neutral-100 flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-400">Hex:</span>
                      <input
                        type="text"
                        value={activeStyle.color || "#111111"}
                        onChange={(e) => updateLayerStyle(selectedLayer, { color: e.target.value })}
                        className="h-6 w-full text-xs font-mono px-1.5 border border-neutral-200 rounded focus:outline-none focus:border-[#f26430]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bold, Italic, Underline */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => updateLayerStyle(selectedLayer, { isBold: !activeStyle.isBold })}
                  className={`h-7 w-7 rounded-lg flex items-center justify-center transition ${
                    activeStyle.isBold ? "bg-neutral-900 text-white shadow-2xs" : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => updateLayerStyle(selectedLayer, { isItalic: !activeStyle.isItalic })}
                  className={`h-7 w-7 rounded-lg flex items-center justify-center transition ${
                    activeStyle.isItalic ? "bg-neutral-900 text-white shadow-2xs" : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                  title="Italic"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => updateLayerStyle(selectedLayer, { isUnderline: !activeStyle.isUnderline })}
                  className={`h-7 w-7 rounded-lg flex items-center justify-center transition ${
                    activeStyle.isUnderline ? "bg-neutral-900 text-white shadow-2xs" : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                  title="Underline"
                >
                  <Underline size={13} />
                </button>
              </div>

              {/* Direct Inline Edit Button */}
              <Button
                variant="secondary"
                onClick={() => setInlineEditingLayer(selectedLayer)}
                className="h-7 px-2.5 text-xs bg-orange-50 hover:bg-orange-100 text-[#f26430] border-orange-200 flex items-center gap-1 font-semibold shrink-0"
                title="Edit text directly on the canvas"
              >
                <Edit3 size={12} />
                <span>Edit on Canvas</span>
              </Button>
            </>
          ) : (
            /* Non-text layer controls (Symbols, Seals, Signatures) */
            <div className="flex items-center gap-2">
              {selectedLayer === "signatory1" && (
                <Button
                  variant="secondary"
                  onClick={() => sig1InputRef.current?.click()}
                  className="h-7 px-2.5 text-xs bg-neutral-100 text-neutral-800"
                >
                  <Upload size={12} className="mr-1" /> Replace PNG Signature
                </Button>
              )}
              {selectedLayer === "signatory2" && (
                <Button
                  variant="secondary"
                  onClick={() => sig2InputRef.current?.click()}
                  className="h-7 px-2.5 text-xs bg-neutral-100 text-neutral-800"
                >
                  <Upload size={12} className="mr-1" /> Replace PNG Signature
                </Button>
              )}
            </div>
          )}

          {/* Delete Element / Symbol Button (Canva Trash) */}
          <button
            type="button"
            onClick={() => handleDeleteLayer(selectedLayer)}
            className="h-7 px-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg flex items-center gap-1 text-[11px] font-semibold transition ml-auto shrink-0"
            title="Delete Symbol / Layer (Del)"
          >
            <Trash2 size={12} />
            <span>Delete Symbol</span>
          </button>

          {/* Deselect */}
          <button
            type="button"
            onClick={() => {
              setSelectedLayer(null);
              setInlineEditingLayer(null);
            }}
            className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition shrink-0"
            title="Deselect Layer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MAIN WORKSPACE: Tool Rail + Drawer + Canvas Artboard */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ─── A. LEFT CANVA TOOL RAIL (Finexy-Light) ───────────────── */}
        <aside className="w-16 bg-white border-r border-neutral-200/80 flex flex-col items-center py-3 gap-2.5 shrink-0 z-20 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("templates");
              setIsDrawerCollapsed(false);
            }}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${
              activeTab === "templates" && !isDrawerCollapsed
                ? "bg-[#f26430] text-white shadow-sm"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
            title="Design Templates"
          >
            <LayoutTemplate size={18} />
            <span>Design</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("text");
              setIsDrawerCollapsed(false);
            }}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${
              activeTab === "text" && !isDrawerCollapsed
                ? "bg-[#f26430] text-white shadow-sm"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
            title="Text & Typography"
          >
            <Type size={18} />
            <span>Text</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("signatures");
              setIsDrawerCollapsed(false);
            }}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${
              activeTab === "signatures" && !isDrawerCollapsed
                ? "bg-[#f26430] text-white shadow-sm"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
            title="Signatures & Authorities"
          >
            <PenTool size={18} />
            <span>Signs</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("elements");
              setIsDrawerCollapsed(false);
            }}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${
              activeTab === "elements" && !isDrawerCollapsed
                ? "bg-[#f26430] text-white shadow-sm"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
            title="Seals, Symbols & Graphics"
          >
            <Award size={18} />
            <span>Symbols</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("canvas");
              setIsDrawerCollapsed(false);
            }}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${
              activeTab === "canvas" && !isDrawerCollapsed
                ? "bg-[#f26430] text-white shadow-sm"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
            title="Canvas Grid & Background"
          >
            <Grid size={18} />
            <span>Canvas</span>
          </button>

          {/* Drawer Collapse Toggle */}
          <div className="mt-auto pt-3 border-t border-neutral-100 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
              title={isDrawerCollapsed ? "Expand Drawer" : "Collapse Drawer"}
            >
              {isDrawerCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </aside>

        {/* ─── B. COLLAPSIBLE DOCKED DRAWER PANEL (Finexy-Light) ───── */}
        {!isDrawerCollapsed && (
          <div className="w-76 sm:w-80 bg-white border-r border-neutral-200/80 flex flex-col shrink-0 overflow-y-auto z-10 shadow-2xs">
            {/* TAB 1: TEMPLATES / DESIGN */}
            {activeTab === "templates" && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Template Library
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {templatesList.length} ready
                  </span>
                </div>

                {/* Import PowerPoint Presentation Dropzone */}
                <div
                  onClick={() => pptxFileInputRef.current?.click()}
                  className="p-3 rounded-xl border border-dashed border-orange-300 bg-orange-50/60 hover:bg-orange-50 cursor-pointer transition flex items-center gap-2.5 text-[#f26430] group"
                  title="Import and load a .pptx presentation"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center shrink-0 transition">
                    <FileUp size={16} />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-bold text-xs text-neutral-900 group-hover:text-[#f26430] transition">
                      Import PowerPoint (.pptx)
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      Upload slide to edit on canvas
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {templatesList.map((tpl) => {
                    const isCurrent = tpl.id === draft.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setDraft({ ...tpl, id: tpl.id, isDefault: tpl.isDefault });
                          if (onSelectTemplate) onSelectTemplate(tpl);
                          showNotification("info", `Switched to template "${tpl.name}".`);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          isCurrent
                            ? "bg-orange-50/70 border-[#f26430] text-[#2d2d34] shadow-xs"
                            : "bg-neutral-50/60 border-neutral-200 hover:bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{tpl.name}</span>
                          {tpl.isDefault && (
                            <Badge tone="orange" className="text-[9px]">
                              Official
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: TEXT & TYPOGRAPHY LAYERS */}
            {activeTab === "text" && (
              <div className="p-4 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Certificate Text Layers
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">Drag to move · Corner to scale</span>
                </div>

                {/* Quick Jump Buttons */}
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {[
                    { id: "mainTitle", label: "Title" },
                    { id: "subTitle", label: "Subtitle" },
                    { id: "preamble", label: "Preamble" },
                    { id: "recipientName", label: "Recipient" },
                    { id: "description", label: "Citation" },
                    { id: "bottomLeft", label: "Slogan" },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setSelectedLayer(btn.id as CanvaLayerId)}
                      className={`px-2 py-1.5 text-[11px] font-semibold rounded-lg border transition ${
                        selectedLayer === btn.id
                          ? "bg-[#f26430] text-white border-[#f26430] shadow-2xs"
                          : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Structured Text Inputs */}
                <div className="space-y-3 pt-2 border-t border-neutral-100">
                  <div>
                    <FieldLabel className="text-neutral-600 text-[11px] font-semibold">Main Title:</FieldLabel>
                    <Input
                      value={draft.mainTitle}
                      onChange={(e) => {
                        const updated = { ...draft, mainTitle: e.target.value };
                        setDraft(updated);
                        pushHistorySnapshot(updated, transforms, layerStyles);
                      }}
                      onFocus={() => setSelectedLayer("mainTitle")}
                      className="bg-neutral-50 border-neutral-200 text-neutral-900 text-xs font-semibold focus:bg-white"
                    />
                  </div>

                  <div>
                    <FieldLabel className="text-neutral-600 text-[11px] font-semibold">Subtitle / Honor:</FieldLabel>
                    <Input
                      value={draft.subTitle}
                      onChange={(e) => {
                        const updated = { ...draft, subTitle: e.target.value };
                        setDraft(updated);
                        pushHistorySnapshot(updated, transforms, layerStyles);
                      }}
                      onFocus={() => setSelectedLayer("subTitle")}
                      className="bg-neutral-50 border-neutral-200 text-neutral-900 text-xs font-semibold focus:bg-white"
                    />
                  </div>

                  <div>
                    <FieldLabel className="text-neutral-600 text-[11px] font-semibold">Preamble:</FieldLabel>
                    <Input
                      value={draft.preamble}
                      onChange={(e) => {
                        const updated = { ...draft, preamble: e.target.value };
                        setDraft(updated);
                        pushHistorySnapshot(updated, transforms, layerStyles);
                      }}
                      onFocus={() => setSelectedLayer("preamble")}
                      className="bg-neutral-50 border-neutral-200 text-neutral-900 text-xs font-semibold focus:bg-white"
                    />
                  </div>

                  <div>
                    <FieldLabel className="text-neutral-600 text-[11px] font-semibold">Description / Citation Body:</FieldLabel>
                    <textarea
                      rows={4}
                      value={draft.description}
                      onChange={(e) => {
                        const updated = { ...draft, description: e.target.value };
                        setDraft(updated);
                        pushHistorySnapshot(updated, transforms, layerStyles);
                      }}
                      onFocus={() => setSelectedLayer("description")}
                      className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-neutral-900 focus:outline-none focus:border-[#f26430] focus:bg-white leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SIGNATURES & AUTHORITIES */}
            {activeTab === "signatures" && (
              <div className="p-4 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Authority Signatures
                  </h3>
                </div>

                {/* Signatory 1 Box */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                      <PenTool size={13} className="text-[#f26430]" />
                      Signatory 1 (Principal)
                    </span>
                    <button
                      type="button"
                      onClick={() => updateLayerTransform("signatory1", { visible: !transforms.signatory1.visible })}
                      className="text-neutral-500 hover:text-neutral-800"
                      title={transforms.signatory1.visible ? "Hide Signatory 1" : "Show Signatory 1"}
                    >
                      {transforms.signatory1.visible ? <Eye size={13} /> : <EyeOff size={13} className="text-rose-500" />}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-neutral-500 block mb-1">Full Name:</label>
                      <Input
                        value={draft.signatory1Name}
                        onChange={(e) => setDraft({ ...draft, signatory1Name: e.target.value })}
                        onFocus={() => setSelectedLayer("signatory1")}
                        className="bg-white border-neutral-200 text-neutral-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500 block mb-1">Role / Designation:</label>
                      <Input
                        value={draft.signatory1Role}
                        onChange={(e) => setDraft({ ...draft, signatory1Role: e.target.value })}
                        onFocus={() => setSelectedLayer("signatory1")}
                        className="bg-white border-neutral-200 text-neutral-900 text-xs"
                      />
                    </div>
                  </div>

                  {/* Signature PNG Upload */}
                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500">PNG Signature:</span>
                    <input
                      type="file"
                      ref={sig1InputRef}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => handleSignatureUpload(e, "sig1")}
                    />
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        onClick={() => sig1InputRef.current?.click()}
                        className="text-[11px] h-6 px-2 bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200"
                      >
                        <Upload size={11} className="mr-1" /> Upload PNG
                      </Button>
                      {draft.signatory1SignatureUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...draft, signatory1SignatureUrl: "" };
                            setDraft(updated);
                            pushHistorySnapshot(updated, transforms, layerStyles);
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Remove signature"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Signatory 2 Box */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                      <PenTool size={13} className="text-[#f26430]" />
                      Signatory 2 (Advisor)
                    </span>
                    <button
                      type="button"
                      onClick={() => updateLayerTransform("signatory2", { visible: !transforms.signatory2.visible })}
                      className="text-neutral-500 hover:text-neutral-800"
                      title={transforms.signatory2.visible ? "Hide Signatory 2" : "Show Signatory 2"}
                    >
                      {transforms.signatory2.visible ? <Eye size={13} /> : <EyeOff size={13} className="text-rose-500" />}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-neutral-500 block mb-1">Full Name:</label>
                      <Input
                        value={draft.signatory2Name}
                        onChange={(e) => setDraft({ ...draft, signatory2Name: e.target.value })}
                        onFocus={() => setSelectedLayer("signatory2")}
                        className="bg-white border-neutral-200 text-neutral-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500 block mb-1">Role / Designation:</label>
                      <Input
                        value={draft.signatory2Role}
                        onChange={(e) => setDraft({ ...draft, signatory2Role: e.target.value })}
                        onFocus={() => setSelectedLayer("signatory2")}
                        className="bg-white border-neutral-200 text-neutral-900 text-xs"
                      />
                    </div>
                  </div>

                  {/* Signature PNG Upload */}
                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500">PNG Signature:</span>
                    <input
                      type="file"
                      ref={sig2InputRef}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => handleSignatureUpload(e, "sig2")}
                    />
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        onClick={() => sig2InputRef.current?.click()}
                        className="text-[11px] h-6 px-2 bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200"
                      >
                        <Upload size={11} className="mr-1" /> Upload PNG
                      </Button>
                      {draft.signatory2SignatureUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...draft, signatory2SignatureUrl: "" };
                            setDraft(updated);
                            pushHistorySnapshot(updated, transforms, layerStyles);
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Remove signature"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SEALS, SYMBOLS & GRAPHICS (With Delete & Visibility Toggles) */}
            {activeTab === "elements" && (
              <div className="p-4 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Canvas Symbols & Graphics
                  </h3>
                  <button
                    type="button"
                    onClick={handleRestoreAllLayers}
                    className="text-[10px] text-[#f26430] hover:underline font-semibold"
                  >
                    Restore All
                  </button>
                </div>

                <p className="text-[11px] text-neutral-500 leading-normal">
                  Click any symbol to select, drag to reposition, or delete.
                </p>

                {/* Symbols List with Delete/Restore Toggles */}
                <div className="space-y-2">
                  {[
                    { id: "seal", label: "Official Gold Seal", icon: "/certificates/assets/seal-elevates.png" },
                    { id: "qrCode", label: "Cryptographic QR Box", icon: null },
                    { id: "headerLogo", label: "Elevates Header Logo", icon: "/certificates/assets/logo-header.png" },
                    { id: "headerGraphic", label: "Header Flourish Loop", icon: "/certificates/assets/header-graphic.png" },
                    { id: "blcGraphic", label: "Build. Learn. Create. Badge", icon: "/certificates/assets/build-learn-create.png" },
                    { id: "pixelSmiley", label: "Pixel Smiley", icon: "/certificates/assets/pixel-smiley.png" },
                    { id: "staircaseFlag", label: "Staircase Flag Accent", icon: "/certificates/assets/staircase-flag.png" },
                    { id: "cornerWave", label: "Fluid Orange Wave", icon: "/certificates/assets/corner-wave.png" },
                  ].map((sym) => {
                    const isVisible = transforms[sym.id as CanvaLayerId]?.visible !== false;
                    const isSelected = selectedLayer === sym.id;
                    return (
                      <div
                        key={sym.id}
                        onClick={() => {
                          if (isVisible) setSelectedLayer(sym.id as CanvaLayerId);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? "bg-orange-50/80 border-[#f26430] shadow-2xs"
                            : isVisible
                            ? "bg-neutral-50 border-neutral-200 hover:bg-neutral-100"
                            : "bg-neutral-100/60 border-neutral-200 text-neutral-400"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {sym.icon ? (
                            <div className="relative w-7 h-7 shrink-0 bg-white rounded border border-neutral-200 overflow-hidden">
                              <Image src={sym.icon} alt={sym.label} fill className="object-contain" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 bg-white rounded border border-neutral-200 flex items-center justify-center shrink-0">
                              <QRCode value="verify" size={18} viewBox="0 0 18 18" />
                            </div>
                          )}
                          <div className="truncate">
                            <span className="font-semibold text-xs text-neutral-800 block truncate">
                              {sym.label}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              Scale: {Math.round((transforms[sym.id as CanvaLayerId]?.scale || 1) * 100)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateLayerTransform(sym.id as CanvaLayerId, { visible: !isVisible });
                            }}
                            className={`p-1.5 rounded-lg transition ${
                              isVisible ? "text-neutral-500 hover:text-neutral-800" : "text-rose-500 hover:text-rose-700 font-bold"
                            }`}
                            title={isVisible ? "Delete Symbol from Canvas" : "Restore Symbol"}
                          >
                            {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Watermark Opacity Slider */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-800">Center Watermark Opacity</label>
                    <span className="font-mono text-xs text-[#f26430] font-bold">
                      {Math.round(watermarkOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.25"
                    step="0.01"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full accent-[#f26430] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: CANVAS & GRID */}
            {activeTab === "canvas" && (
              <div className="p-4 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Canvas & Background
                  </h3>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-neutral-900 block text-xs">
                      Certificate Check Grid
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Subtle checkered security pattern
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.showGridPattern !== false}
                    onChange={(e) => setDraft({ ...draft, showGridPattern: e.target.checked })}
                    className="h-4 w-4 accent-[#f26430] cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── C. CENTER CANVAS WORKSPACE (Finexy Dot Grid Artboard) ── */}
        <div
          ref={canvasContainerRef}
          className="flex-1 p-4 sm:p-8 overflow-auto flex flex-col items-center justify-start relative select-none"
          style={{
            backgroundColor: "#eaecf0",
            backgroundImage: "radial-gradient(#d1d5db 1.2px, transparent 1.2px)",
            backgroundSize: "18px 18px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedLayer(null);
              setInlineEditingLayer(null);
            }
          }}
        >
          {/* THE CERTIFICATE CANVAS (3:2 Landscape Ratio) */}
          <div
            className="w-full max-w-[980px] transition-transform duration-150"
            style={{
              transform: isFitMode ? "none" : `scale(${zoomScale})`,
              transformOrigin: "top center",
            }}
          >
            <div className="overflow-hidden rounded-xl border border-neutral-300 shadow-2xl bg-white certificate-print-wrapper relative">
              <div
                id="elevates-canva-certificate-stage"
                className="relative w-full aspect-[1.5] bg-white text-[#111111] overflow-hidden p-6 sm:p-10 flex flex-col justify-between"
                style={{
                  fontFamily: "'Montserrat', 'Plus Jakarta Sans', sans-serif",
                }}
              >
                {/* 1. CHECK PATTERN BACKGROUND */}
                {draft.showGridPattern !== false && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-0"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <pattern
                        id="canva-cert-check-pattern"
                        width="36"
                        height="36"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 36 0 L 0 0 0 36"
                          fill="none"
                          stroke="#EEEEEE"
                          strokeWidth="1.2"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#canva-cert-check-pattern)" />
                  </svg>
                )}

                {/* 2. INNER HAIRLINE BORDER */}
                <div className="absolute inset-3 sm:inset-5 border border-neutral-200/90 rounded-lg pointer-events-none z-10" />

                {/* 3. WATERMARK CENTER */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <div
                    className="relative w-[42%] h-[53%]"
                    style={{ opacity: watermarkOpacity }}
                  >
                    <Image
                      src="/certificates/assets/watermark-e.png"
                      alt="Elevates Watermark"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>

                {/* 4. TOP LEFT: Header Logo & flourish graphic (Movable, Resizable, Deletable) */}
                <div className="relative z-20 flex items-start gap-1 sm:gap-2 pt-0.5">
                  {transforms.headerLogo.visible && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("headerLogo");
                      }}
                      onPointerDown={(e) => handlePointerDown(e, "headerLogo", "move")}
                      className={`relative cursor-move transition rounded ${
                        selectedLayer === "headerLogo"
                          ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                          : "hover:outline hover:outline-1 hover:outline-orange-300"
                      }`}
                      style={{
                        transform: `translate(${transforms.headerLogo.x}px, ${transforms.headerLogo.y}px) scale(${transforms.headerLogo.scale})`,
                        transformOrigin: "top left",
                      }}
                    >
                      {/* Canva Bounding Box Handles */}
                      {selectedLayer === "headerLogo" && (
                        <>
                          <span
                            onPointerDown={(e) => handlePointerDown(e, "headerLogo", "resize")}
                            className="absolute -bottom-2 -right-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nwse-resize"
                            title="Drag to resize"
                          />
                          {/* Canva Floating Action Pill */}
                          <div className="absolute -top-7 left-0 bg-white border border-neutral-300 rounded-lg shadow-md px-1.5 py-0.5 flex items-center gap-1.5 z-40 text-[10px] font-semibold text-neutral-800">
                            <span className="flex items-center gap-1"><GripVertical size={11} className="text-neutral-400" /> Logo</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLayer("headerLogo");
                              }}
                              className="text-neutral-400 hover:text-rose-600 p-0.5"
                              title="Delete symbol"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </>
                      )}
                      <div className="relative w-[240px] sm:w-[350px] md:w-[410px] h-[55px] sm:h-[80px] md:h-[95px]">
                        <Image
                          src="/certificates/assets/logo-header.png"
                          alt="Elevates Logo"
                          fill
                          className="object-contain object-left pointer-events-none"
                          priority
                        />
                      </div>
                    </div>
                  )}

                  {transforms.headerGraphic.visible && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("headerGraphic");
                      }}
                      onPointerDown={(e) => handlePointerDown(e, "headerGraphic", "move")}
                      className={`relative cursor-move transition rounded -ml-4 sm:-ml-5 -mt-1 ${
                        selectedLayer === "headerGraphic"
                          ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                          : "hover:outline hover:outline-1 hover:outline-orange-300"
                      }`}
                      style={{
                        transform: `translate(${transforms.headerGraphic.x}px, ${transforms.headerGraphic.y}px) scale(${transforms.headerGraphic.scale})`,
                        transformOrigin: "center",
                      }}
                    >
                      {selectedLayer === "headerGraphic" && (
                        <>
                          <span
                            onPointerDown={(e) => handlePointerDown(e, "headerGraphic", "resize")}
                            className="absolute -bottom-2 -right-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nwse-resize"
                            title="Drag to resize"
                          />
                          <div className="absolute -top-7 left-0 bg-white border border-neutral-300 rounded-lg shadow-md px-1.5 py-0.5 flex items-center gap-1.5 z-40 text-[10px] font-semibold text-neutral-800">
                            <span>Loop</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLayer("headerGraphic");
                              }}
                              className="text-neutral-400 hover:text-rose-600 p-0.5"
                              title="Delete symbol"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </>
                      )}
                      <div className="relative w-[36px] sm:w-[54px] h-[36px] sm:h-[54px] opacity-75">
                        <Image
                          src="/certificates/assets/header-graphic.png"
                          alt="Graphic Loop"
                          fill
                          className="object-contain pointer-events-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. TOP RIGHT: Build Learn Create Graphic (Movable, Resizable, Deletable) */}
                {transforms.blcGraphic.visible && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLayer("blcGraphic");
                    }}
                    onPointerDown={(e) => handlePointerDown(e, "blcGraphic", "move")}
                    className={`absolute top-4 sm:top-7 right-4 sm:right-8 z-20 cursor-move transition rounded ${
                      selectedLayer === "blcGraphic"
                        ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                        : "hover:outline hover:outline-1 hover:outline-orange-300"
                    }`}
                    style={{
                      transform: `translate(${transforms.blcGraphic.x}px, ${transforms.blcGraphic.y}px) scale(${transforms.blcGraphic.scale})`,
                      transformOrigin: "top right",
                    }}
                  >
                    {selectedLayer === "blcGraphic" && (
                      <>
                        <span
                          onPointerDown={(e) => handlePointerDown(e, "blcGraphic", "resize")}
                          className="absolute -bottom-2 -left-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nesw-resize"
                          title="Drag to resize"
                        />
                        <div className="absolute -top-7 right-0 bg-white border border-neutral-300 rounded-lg shadow-md px-1.5 py-0.5 flex items-center gap-1.5 z-40 text-[10px] font-semibold text-neutral-800">
                          <span>Badge</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLayer("blcGraphic");
                            }}
                            className="text-neutral-400 hover:text-rose-600 p-0.5"
                            title="Delete symbol"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </>
                    )}
                    <div className="relative w-[110px] sm:w-[160px] h-[35px] sm:h-[50px]">
                      <Image
                        src="/certificates/assets/build-learn-create.png"
                        alt="Build. Learn. Create. Together"
                        fill
                        className="object-contain object-right pointer-events-none"
                        priority
                      />
                    </div>
                  </div>
                )}

                {/* 6. RIGHT ACCENT: Pixel Smiley (Movable, Resizable, Deletable) */}
                {transforms.pixelSmiley.visible && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLayer("pixelSmiley");
                    }}
                    onPointerDown={(e) => handlePointerDown(e, "pixelSmiley", "move")}
                    className={`absolute top-[28%] right-4 sm:right-7 z-20 cursor-move transition rounded ${
                      selectedLayer === "pixelSmiley"
                        ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                        : "hover:outline hover:outline-1 hover:outline-orange-300"
                    }`}
                    style={{
                      transform: `translate(${transforms.pixelSmiley.x}px, ${transforms.pixelSmiley.y}px) scale(${transforms.pixelSmiley.scale})`,
                      transformOrigin: "center",
                    }}
                  >
                    {selectedLayer === "pixelSmiley" && (
                      <>
                        <span
                          onPointerDown={(e) => handlePointerDown(e, "pixelSmiley", "resize")}
                          className="absolute -bottom-2 -left-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nesw-resize"
                          title="Drag to resize"
                        />
                        <div className="absolute -top-7 right-0 bg-white border border-neutral-300 rounded-lg shadow-md px-1.5 py-0.5 flex items-center gap-1.5 z-40 text-[10px] font-semibold text-neutral-800">
                          <span>Smiley</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLayer("pixelSmiley");
                            }}
                            className="text-neutral-400 hover:text-rose-600 p-0.5"
                            title="Delete symbol"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </>
                    )}
                    <div className="relative w-[24px] sm:w-[38px] h-[24px] sm:h-[38px] opacity-90">
                      <Image
                        src="/certificates/assets/pixel-smiley.png"
                        alt="Elevates Smiley"
                        fill
                        className="object-contain pointer-events-none"
                      />
                    </div>
                  </div>
                )}

                {/* 7. BOTTOM LEFT: Staircase Block with Red Flag (Movable, Resizable, Deletable) */}
                {transforms.staircaseFlag.visible && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLayer("staircaseFlag");
                    }}
                    onPointerDown={(e) => handlePointerDown(e, "staircaseFlag", "move")}
                    className={`absolute bottom-2 sm:bottom-4 left-2 sm:left-4 z-20 cursor-move transition rounded ${
                      selectedLayer === "staircaseFlag"
                        ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                        : "hover:outline hover:outline-1 hover:outline-orange-300"
                    }`}
                    style={{
                      transform: `translate(${transforms.staircaseFlag.x}px, ${transforms.staircaseFlag.y}px) scale(${transforms.staircaseFlag.scale})`,
                      transformOrigin: "bottom left",
                    }}
                  >
                    {selectedLayer === "staircaseFlag" && (
                      <>
                        <span
                          onPointerDown={(e) => handlePointerDown(e, "staircaseFlag", "resize")}
                          className="absolute -top-2 -right-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nesw-resize"
                          title="Drag to resize"
                        />
                        <div className="absolute -top-7 left-0 bg-white border border-neutral-300 rounded-lg shadow-md px-1.5 py-0.5 flex items-center gap-1.5 z-40 text-[10px] font-semibold text-neutral-800">
                          <span>Flag Block</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLayer("staircaseFlag");
                            }}
                            className="text-neutral-400 hover:text-rose-600 p-0.5"
                            title="Delete symbol"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </>
                    )}
                    <div className="relative w-[85px] sm:w-[145px] h-[75px] sm:h-[130px]">
                      <Image
                        src="/certificates/assets/staircase-flag.png"
                        alt="Staircase Flag"
                        fill
                        className="object-contain object-bottom-left pointer-events-none"
                      />
                    </div>
                  </div>
                )}

                {/* 8. BOTTOM RIGHT: Fluid Orange Wave (Movable, Resizable, Deletable) */}
                {transforms.cornerWave.visible && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLayer("cornerWave");
                    }}
                    onPointerDown={(e) => handlePointerDown(e, "cornerWave", "move")}
                    className={`absolute -bottom-1 -right-1 z-10 cursor-move transition rounded ${
                      selectedLayer === "cornerWave"
                        ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                        : "hover:outline hover:outline-1 hover:outline-orange-300"
                    }`}
                    style={{
                      transform: `translate(${transforms.cornerWave.x}px, ${transforms.cornerWave.y}px) scale(${transforms.cornerWave.scale})`,
                      transformOrigin: "bottom right",
                    }}
                  >
                    {selectedLayer === "cornerWave" && (
                      <>
                        <span
                          onPointerDown={(e) => handlePointerDown(e, "cornerWave", "resize")}
                          className="absolute -top-2 -left-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nwse-resize"
                          title="Drag to resize"
                        />
                        <div className="absolute -top-7 right-0 bg-white border border-neutral-300 rounded-lg shadow-md px-1.5 py-0.5 flex items-center gap-1.5 z-40 text-[10px] font-semibold text-neutral-800">
                          <span>Wave</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLayer("cornerWave");
                            }}
                            className="text-neutral-400 hover:text-rose-600 p-0.5"
                            title="Delete symbol"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </>
                    )}
                    <div className="relative w-[140px] sm:w-[260px] h-[90px] sm:h-[160px] opacity-95">
                      <Image
                        src="/certificates/assets/corner-wave.png"
                        alt="Orange Wave"
                        fill
                        className="object-contain object-bottom-right pointer-events-none"
                      />
                    </div>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────── */}
                {/* 9. INTERACTIVE CENTER CONTENT (Movable & Resizable) */}
                {/* ─────────────────────────────────────────────────── */}
                <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-14 my-2 sm:my-3">
                  {/* LAYER: MAIN TITLE */}
                  {transforms.mainTitle.visible && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("mainTitle");
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("mainTitle");
                        setInlineEditingLayer("mainTitle");
                      }}
                      onPointerDown={(e) => handlePointerDown(e, "mainTitle", "move")}
                      className={`relative cursor-move transition rounded px-3 py-1 group ${
                        selectedLayer === "mainTitle"
                          ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                          : "hover:outline hover:outline-1 hover:outline-orange-300"
                      }`}
                      style={{
                        transform: `translate(${transforms.mainTitle.x}px, ${transforms.mainTitle.y}px) scale(${transforms.mainTitle.scale})`,
                        transformOrigin: "center",
                      }}
                    >
                      {selectedLayer === "mainTitle" && (
                        <>
                          <span
                            onPointerDown={(e) => handlePointerDown(e, "mainTitle", "resize")}
                            className="absolute -bottom-2 -right-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nwse-resize"
                            title="Drag to resize"
                          />
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white border border-neutral-300 rounded-lg shadow-md px-2 py-0.5 flex items-center gap-2 z-40 text-[10px] font-semibold text-neutral-800 whitespace-nowrap">
                            <span className="flex items-center gap-1"><GripVertical size={11} className="text-neutral-400" /> Main Title</span>
                            <button
                              type="button"
                              onClick={() => setInlineEditingLayer("mainTitle")}
                              className="text-[#f26430] hover:text-[#d04918] p-0.5"
                              title="Edit text inline"
                            >
                              <Edit3 size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLayer("mainTitle");
                              }}
                              className="text-neutral-400 hover:text-rose-600 p-0.5"
                              title="Delete layer"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </>
                      )}

                      {inlineEditingLayer === "mainTitle" ? (
                        <input
                          ref={inlineInputRef as any}
                          type="text"
                          value={draft.mainTitle}
                          onChange={(e) => setDraft({ ...draft, mainTitle: e.target.value })}
                          onBlur={() => {
                            setInlineEditingLayer(null);
                            pushHistorySnapshot();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setInlineEditingLayer(null);
                          }}
                          className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-[0.14em] uppercase text-center bg-white border border-[#f26430] rounded px-2 py-0.5 focus:outline-none w-full"
                          style={{
                            fontFamily: layerStyles.mainTitle?.fontFamily || "'Montserrat', sans-serif",
                            color: layerStyles.mainTitle?.color || "#111111",
                          }}
                        />
                      ) : (
                        <h1
                          className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-[0.14em] uppercase leading-none"
                          style={{
                            fontFamily: layerStyles.mainTitle?.fontFamily || "'Montserrat', sans-serif",
                            color: layerStyles.mainTitle?.color || "#111111",
                            fontStyle: layerStyles.mainTitle?.isItalic ? "italic" : "normal",
                            textDecoration: layerStyles.mainTitle?.isUnderline ? "underline" : "none",
                          }}
                        >
                          {draft.mainTitle}
                        </h1>
                      )}
                    </div>
                  )}

                  {/* LAYER: SUBTITLE */}
                  {transforms.subTitle.visible && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("subTitle");
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("subTitle");
                        setInlineEditingLayer("subTitle");
                      }}
                      onPointerDown={(e) => handlePointerDown(e, "subTitle", "move")}
                      className={`relative cursor-move transition rounded px-3 py-0.5 mt-1.5 sm:mt-2.5 group ${
                        selectedLayer === "subTitle"
                          ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                          : "hover:outline hover:outline-1 hover:outline-orange-300"
                      }`}
                      style={{
                        transform: `translate(${transforms.subTitle.x}px, ${transforms.subTitle.y}px) scale(${transforms.subTitle.scale})`,
                        transformOrigin: "center",
                      }}
                    >
                      {selectedLayer === "subTitle" && (
                        <>
                          <span
                            onPointerDown={(e) => handlePointerDown(e, "subTitle", "resize")}
                            className="absolute -bottom-2 -right-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nwse-resize"
                            title="Drag to resize"
                          />
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white border border-neutral-300 rounded-lg shadow-md px-2 py-0.5 flex items-center gap-2 z-40 text-[10px] font-semibold text-neutral-800 whitespace-nowrap">
                            <span className="flex items-center gap-1"><GripVertical size={11} className="text-neutral-400" /> Subtitle</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLayer("subTitle");
                              }}
                              className="text-neutral-400 hover:text-rose-600 p-0.5"
                              title="Delete layer"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </>
                      )}

                      {inlineEditingLayer === "subTitle" ? (
                        <input
                          ref={inlineInputRef as any}
                          type="text"
                          value={draft.subTitle}
                          onChange={(e) => setDraft({ ...draft, subTitle: e.target.value })}
                          onBlur={() => {
                            setInlineEditingLayer(null);
                            pushHistorySnapshot();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setInlineEditingLayer(null);
                          }}
                          className="text-[9px] sm:text-xs md:text-sm font-semibold tracking-[0.3em] uppercase text-center bg-white border border-[#f26430] rounded px-2 py-0.5 focus:outline-none w-full text-[#f26430]"
                        />
                      ) : (
                        <p
                          className="text-[9px] sm:text-xs md:text-sm font-semibold tracking-[0.3em] sm:tracking-[0.4em] uppercase"
                          style={{
                            fontFamily: layerStyles.subTitle?.fontFamily || "'Montserrat', sans-serif",
                            color: layerStyles.subTitle?.color || "#f26430",
                            fontStyle: layerStyles.subTitle?.isItalic ? "italic" : "normal",
                            textDecoration: layerStyles.subTitle?.isUnderline ? "underline" : "none",
                          }}
                        >
                          {displaySubtitle}
                        </p>
                      )}
                    </div>
                  )}

                  {/* LAYER: PREAMBLE */}
                  {transforms.preamble.visible && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("preamble");
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("preamble");
                        setInlineEditingLayer("preamble");
                      }}
                      onPointerDown={(e) => handlePointerDown(e, "preamble", "move")}
                      className={`relative cursor-move transition rounded px-3 py-0.5 mt-2 sm:mt-3 group ${
                        selectedLayer === "preamble"
                          ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                          : "hover:outline hover:outline-1 hover:outline-orange-300"
                      }`}
                      style={{
                        transform: `translate(${transforms.preamble.x}px, ${transforms.preamble.y}px) scale(${transforms.preamble.scale})`,
                        transformOrigin: "center",
                      }}
                    >
                      {selectedLayer === "preamble" && (
                        <>
                          <span
                            onPointerDown={(e) => handlePointerDown(e, "preamble", "resize")}
                            className="absolute -bottom-2 -right-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nwse-resize"
                            title="Drag to resize"
                          />
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white border border-neutral-300 rounded-lg shadow-md px-2 py-0.5 flex items-center gap-2 z-40 text-[10px] font-semibold text-neutral-800 whitespace-nowrap">
                            <span className="flex items-center gap-1"><GripVertical size={11} className="text-neutral-400" /> Preamble</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLayer("preamble");
                              }}
                              className="text-neutral-400 hover:text-rose-600 p-0.5"
                              title="Delete layer"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </>
                      )}

                      {inlineEditingLayer === "preamble" ? (
                        <input
                          ref={inlineInputRef as any}
                          type="text"
                          value={draft.preamble}
                          onChange={(e) => setDraft({ ...draft, preamble: e.target.value })}
                          onBlur={() => {
                            setInlineEditingLayer(null);
                            pushHistorySnapshot();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setInlineEditingLayer(null);
                          }}
                          className="text-[8px] sm:text-[10px] md:text-xs font-medium tracking-[0.25em] uppercase text-center bg-white border border-[#f26430] rounded px-2 py-0.5 focus:outline-none w-full text-neutral-500"
                        />
                      ) : (
                        <p
                          className="text-[8px] sm:text-[10px] md:text-xs font-medium tracking-[0.25em] uppercase"
                          style={{
                            fontFamily: layerStyles.preamble?.fontFamily || "'Montserrat', sans-serif",
                            color: layerStyles.preamble?.color || "#9ca3af",
                            fontStyle: layerStyles.preamble?.isItalic ? "italic" : "normal",
                            textDecoration: layerStyles.preamble?.isUnderline ? "underline" : "none",
                          }}
                        >
                          {draft.preamble}
                        </p>
                      )}
                    </div>
                  )}

                  {/* LAYER: RECIPIENT NAME */}
                  {transforms.recipientName.visible && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("recipientName");
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("recipientName");
                        setInlineEditingLayer("recipientName");
                      }}
                      onPointerDown={(e) => handlePointerDown(e, "recipientName", "move")}
                      className={`relative inline-block cursor-move transition rounded px-4 py-1 mt-2.5 sm:mt-4 group ${
                        selectedLayer === "recipientName"
                          ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                          : "hover:outline hover:outline-1 hover:outline-orange-300"
                      }`}
                      style={{
                        transform: `translate(${transforms.recipientName.x}px, ${transforms.recipientName.y}px) scale(${transforms.recipientName.scale})`,
                        transformOrigin: "center",
                      }}
                    >
                      {selectedLayer === "recipientName" && (
                        <>
                          <span
                            onPointerDown={(e) => handlePointerDown(e, "recipientName", "resize")}
                            className="absolute -bottom-2 -right-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nwse-resize"
                            title="Drag to resize"
                          />
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white border border-neutral-300 rounded-lg shadow-md px-2 py-0.5 flex items-center gap-2 z-40 text-[10px] font-semibold text-neutral-800 whitespace-nowrap">
                            <span className="flex items-center gap-1"><GripVertical size={11} className="text-neutral-400" /> Recipient Name</span>
                            <button
                              type="button"
                              onClick={() => setInlineEditingLayer("recipientName")}
                              className="text-[#f26430] hover:text-[#d04918] p-0.5"
                              title="Edit recipient inline"
                            >
                              <Edit3 size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLayer("recipientName");
                              }}
                              className="text-neutral-400 hover:text-rose-600 p-0.5"
                              title="Delete layer"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </>
                      )}

                      {inlineEditingLayer === "recipientName" ? (
                        <input
                          ref={inlineInputRef as any}
                          type="text"
                          value={isStudentPreview ? sampleStudentName : "{recipient_name}"}
                          onChange={(e) => setSampleStudentName(e.target.value)}
                          onBlur={() => {
                            setInlineEditingLayer(null);
                            pushHistorySnapshot();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setInlineEditingLayer(null);
                          }}
                          className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-[#111111] px-4 text-center bg-white border border-[#f26430] rounded py-0.5 focus:outline-none w-full"
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        />
                      ) : (
                        <>
                          <h2
                            className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight px-4 sm:px-8 pb-1 text-[#111111]"
                            style={{
                              fontFamily: layerStyles.recipientName?.fontFamily || "'Montserrat', sans-serif",
                              color: layerStyles.recipientName?.color || "#111111",
                              fontStyle: layerStyles.recipientName?.isItalic ? "italic" : "normal",
                              textDecoration: layerStyles.recipientName?.isUnderline ? "underline" : "none",
                            }}
                          >
                            {displayRecipient}
                          </h2>
                          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#f26430] to-transparent mt-0.5" />
                        </>
                      )}
                    </div>
                  )}

                  {/* LAYER: DESCRIPTION BODY */}
                  {transforms.description.visible && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("description");
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("description");
                        setInlineEditingLayer("description");
                      }}
                      onPointerDown={(e) => handlePointerDown(e, "description", "move")}
                      className={`relative cursor-move transition rounded px-3 py-1 mt-2.5 sm:mt-4 max-w-xl sm:max-w-2xl group ${
                        selectedLayer === "description"
                          ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                          : "hover:outline hover:outline-1 hover:outline-orange-300"
                      }`}
                      style={{
                        transform: `translate(${transforms.description.x}px, ${transforms.description.y}px) scale(${transforms.description.scale})`,
                        transformOrigin: "center",
                      }}
                    >
                      {selectedLayer === "description" && (
                        <>
                          <span
                            onPointerDown={(e) => handlePointerDown(e, "description", "resize")}
                            className="absolute -bottom-2 -right-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nwse-resize"
                            title="Drag to resize"
                          />
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white border border-neutral-300 rounded-lg shadow-md px-2 py-0.5 flex items-center gap-2 z-40 text-[10px] font-semibold text-neutral-800 whitespace-nowrap">
                            <span className="flex items-center gap-1"><GripVertical size={11} className="text-neutral-400" /> Citation</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLayer("description");
                              }}
                              className="text-neutral-400 hover:text-rose-600 p-0.5"
                              title="Delete layer"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </>
                      )}

                      {inlineEditingLayer === "description" ? (
                        <textarea
                          ref={inlineInputRef as any}
                          rows={3}
                          value={draft.description}
                          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                          onBlur={() => {
                            setInlineEditingLayer(null);
                            pushHistorySnapshot();
                          }}
                          className="w-full text-[9px] sm:text-xs md:text-sm text-neutral-800 leading-relaxed font-normal text-center bg-white border border-[#f26430] rounded p-1.5 focus:outline-none"
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        />
                      ) : (
                        <p
                          className="text-[9px] sm:text-xs md:text-sm leading-relaxed font-normal"
                          style={{
                            fontFamily: layerStyles.description?.fontFamily || "'Montserrat', sans-serif",
                            color: layerStyles.description?.color || "#4b5563",
                            fontStyle: layerStyles.description?.isItalic ? "italic" : "normal",
                          }}
                        >
                          {displayDescription}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ─────────────────────────────────────────────────── */}
                {/* 10. SIGNATORIES & SEAL ROW (Movable & Resizable) */}
                {/* ─────────────────────────────────────────────────── */}
                <div className="relative z-20 grid grid-cols-3 items-end w-full px-6 sm:px-16 pt-2 pb-3">
                  {/* Left Signatory (Principal / Lead) */}
                  {transforms.signatory1.visible && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("signatory1");
                        setActiveTab("signatures");
                      }}
                      onPointerDown={(e) => handlePointerDown(e, "signatory1", "move")}
                      className={`text-left flex flex-col items-start pl-6 sm:pl-10 cursor-move p-1.5 rounded transition ${
                        selectedLayer === "signatory1"
                          ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                          : "hover:outline hover:outline-1 hover:outline-orange-300"
                      }`}
                      style={{
                        transform: `translate(${transforms.signatory1.x}px, ${transforms.signatory1.y}px) scale(${transforms.signatory1.scale})`,
                        transformOrigin: "bottom left",
                      }}
                    >
                      {selectedLayer === "signatory1" && (
                        <>
                          <span
                            onPointerDown={(e) => handlePointerDown(e, "signatory1", "resize")}
                            className="absolute -top-2 -right-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nesw-resize"
                            title="Drag to resize"
                          />
                          <div className="absolute -top-7 left-0 bg-white border border-neutral-300 rounded-lg shadow-md px-1.5 py-0.5 flex items-center gap-1.5 z-40 text-[10px] font-semibold text-neutral-800">
                            <span>Signatory 1</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLayer("signatory1");
                              }}
                              className="text-neutral-400 hover:text-rose-600 p-0.5"
                              title="Delete signatory"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </>
                      )}
                      {draft.signatory1SignatureUrl ? (
                        <div className="relative h-8 sm:h-12 w-24 sm:w-36 mb-1">
                          <img
                            src={draft.signatory1SignatureUrl}
                            alt="Signature 1"
                            className="h-full w-full object-contain object-left-bottom pointer-events-none"
                          />
                        </div>
                      ) : (
                        <div className="h-5 sm:h-8" />
                      )}
                      <div className="w-24 sm:w-36 h-[1px] bg-neutral-300 mb-1.5" />
                      <p className="text-[10px] sm:text-xs md:text-sm font-bold text-[#111111] leading-tight">
                        {draft.signatory1Name}
                      </p>
                      <p className="text-[7px] sm:text-[9px] font-semibold tracking-[0.25em] text-neutral-400 uppercase mt-0.5">
                        {draft.signatory1Role}
                      </p>
                      <p className="text-[7px] sm:text-[9px] text-neutral-500 truncate max-w-[140px] sm:max-w-[200px]">
                        {draft.signatory1Org || institutionName}
                      </p>
                    </div>
                  )}

                  {/* Center: Elevates Round Official Seal + Scannable QR (Movable & Resizable) */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* Seal Element */}
                      {transforms.seal.visible && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLayer("seal");
                            setActiveTab("elements");
                          }}
                          onPointerDown={(e) => handlePointerDown(e, "seal", "move")}
                          className={`relative cursor-move p-1 rounded transition ${
                            selectedLayer === "seal"
                              ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                              : "hover:outline hover:outline-1 hover:outline-orange-300"
                          }`}
                          style={{
                            transform: `translate(${transforms.seal.x}px, ${transforms.seal.y}px) scale(${transforms.seal.scale})`,
                            transformOrigin: "center",
                          }}
                        >
                          {selectedLayer === "seal" && (
                            <>
                              <span
                                onPointerDown={(e) => handlePointerDown(e, "seal", "resize")}
                                className="absolute -bottom-2 -right-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nwse-resize"
                                title="Drag to resize"
                              />
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white border border-neutral-300 rounded-lg shadow-md px-1.5 py-0.5 flex items-center gap-1.5 z-40 text-[10px] font-semibold text-neutral-800 whitespace-nowrap">
                                <span>Seal</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLayer("seal");
                                  }}
                                  className="text-neutral-400 hover:text-rose-600 p-0.5"
                                  title="Delete seal"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </>
                          )}
                          <div className="relative w-[48px] sm:w-[72px] md:w-[82px] h-[48px] sm:h-[72px] md:h-[82px] drop-shadow-sm">
                            <Image
                              src="/certificates/assets/seal-elevates.png"
                              alt="Official Elevates Seal"
                              fill
                              className="object-contain pointer-events-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* QR Verification Box */}
                      {transforms.qrCode.visible && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLayer("qrCode");
                            setActiveTab("elements");
                          }}
                          onPointerDown={(e) => handlePointerDown(e, "qrCode", "move")}
                          className={`relative cursor-move p-1 sm:p-1.5 bg-white border border-neutral-200 rounded-md shadow-2xs transition ${
                            selectedLayer === "qrCode"
                              ? "outline outline-2 outline-[#f26430] outline-offset-2"
                              : "hover:outline hover:outline-1 hover:outline-orange-300"
                          }`}
                          style={{
                            transform: `translate(${transforms.qrCode.x}px, ${transforms.qrCode.y}px) scale(${transforms.qrCode.scale})`,
                            transformOrigin: "center",
                          }}
                        >
                          {selectedLayer === "qrCode" && (
                            <>
                              <span
                                onPointerDown={(e) => handlePointerDown(e, "qrCode", "resize")}
                                className="absolute -bottom-2 -right-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nwse-resize"
                                title="Drag to resize"
                              />
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white border border-neutral-300 rounded-lg shadow-md px-1.5 py-0.5 flex items-center gap-1.5 z-40 text-[10px] font-semibold text-neutral-800 whitespace-nowrap">
                                <span>QR</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLayer("qrCode");
                                  }}
                                  className="text-neutral-400 hover:text-rose-600 p-0.5"
                                  title="Delete QR"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </>
                          )}
                          <div className="w-[36px] sm:w-[50px] md:w-[58px] h-[36px] sm:h-[50px] md:h-[58px]">
                            <QRCode
                              value={`https://os.elevates.live/verify/certificate/CERT-${chapterSlug.toUpperCase()}-PREVIEW`}
                              size={256}
                              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                              viewBox="0 0 256 256"
                            />
                          </div>
                          <span className="text-[6px] sm:text-[7px] font-mono text-neutral-400 mt-0.5 block">
                            SCAN TO VERIFY
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-[7px] sm:text-[8px] text-neutral-400">
                      CERT-{chapterSlug.toUpperCase()}-2026-NATIVE
                    </div>
                  </div>

                  {/* Right Signatory (Faculty Advisor / Teacher) */}
                  {transforms.signatory2.visible && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("signatory2");
                        setActiveTab("signatures");
                      }}
                      onPointerDown={(e) => handlePointerDown(e, "signatory2", "move")}
                      className={`text-right flex flex-col items-end pr-6 sm:pr-10 cursor-move p-1.5 rounded transition ${
                        selectedLayer === "signatory2"
                          ? "outline outline-2 outline-[#f26430] outline-offset-2 bg-orange-50/20"
                          : "hover:outline hover:outline-1 hover:outline-orange-300"
                      }`}
                      style={{
                        transform: `translate(${transforms.signatory2.x}px, ${transforms.signatory2.y}px) scale(${transforms.signatory2.scale})`,
                        transformOrigin: "bottom right",
                      }}
                    >
                      {selectedLayer === "signatory2" && (
                        <>
                          <span
                            onPointerDown={(e) => handlePointerDown(e, "signatory2", "resize")}
                            className="absolute -top-2 -left-2 w-3 h-3 bg-white border-2 border-[#f26430] rounded-full shadow-md z-30 cursor-nesw-resize"
                            title="Drag to resize"
                          />
                          <div className="absolute -top-7 right-0 bg-white border border-neutral-300 rounded-lg shadow-md px-1.5 py-0.5 flex items-center gap-1.5 z-40 text-[10px] font-semibold text-neutral-800">
                            <span>Signatory 2</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLayer("signatory2");
                              }}
                              className="text-neutral-400 hover:text-rose-600 p-0.5"
                              title="Delete signatory"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </>
                      )}
                      {draft.signatory2SignatureUrl ? (
                        <div className="relative h-8 sm:h-12 w-24 sm:w-36 mb-1 ml-auto">
                          <img
                            src={draft.signatory2SignatureUrl}
                            alt="Signature 2"
                            className="h-full w-full object-contain object-right-bottom pointer-events-none"
                          />
                        </div>
                      ) : (
                        <div className="h-5 sm:h-8" />
                      )}
                      <div className="w-24 sm:w-36 h-[1px] bg-neutral-300 mb-1.5 ml-auto" />
                      <p className="text-[10px] sm:text-xs md:text-sm font-bold text-[#111111] leading-tight">
                        {draft.signatory2Name}
                      </p>
                      <p className="text-[7px] sm:text-[9px] font-semibold tracking-[0.25em] text-neutral-400 uppercase mt-0.5">
                        {draft.signatory2Role}
                      </p>
                      <p className="text-[7px] sm:text-[9px] text-neutral-500 truncate max-w-[140px] sm:max-w-[200px]">
                        {draft.signatory2Org || institutionName}
                      </p>
                    </div>
                  )}
                </div>

                {/* 11. BOTTOM SLOGANS (Movable & Resizable) */}
                <div className="relative z-20 flex items-center justify-between w-full px-8 sm:px-14 pt-1 text-[7px] sm:text-[8px] font-mono tracking-[0.25em] text-neutral-400 uppercase">
                  {transforms.bottomLeft.visible && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("bottomLeft");
                      }}
                      onPointerDown={(e) => handlePointerDown(e, "bottomLeft", "move")}
                      className={`cursor-move rounded px-1 transition ${
                        selectedLayer === "bottomLeft"
                          ? "outline outline-1 outline-[#f26430] text-[#f26430] bg-orange-50/20"
                          : "hover:text-neutral-700"
                      }`}
                      style={{
                        transform: `translate(${transforms.bottomLeft.x}px, ${transforms.bottomLeft.y}px) scale(${transforms.bottomLeft.scale})`,
                      }}
                    >
                      {draft.bottomLeftText || "I D E A S   I N T O   I M P A C T"}
                    </span>
                  )}
                  {transforms.bottomRight.visible && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayer("bottomRight");
                      }}
                      onPointerDown={(e) => handlePointerDown(e, "bottomRight", "move")}
                      className={`cursor-move rounded px-1 transition ${
                        selectedLayer === "bottomRight"
                          ? "outline outline-1 outline-[#f26430] text-[#f26430] bg-orange-50/20"
                          : "text-neutral-500 hover:text-neutral-800"
                      }`}
                      style={{
                        transform: `translate(${transforms.bottomRight.x}px, ${transforms.bottomRight.y}px) scale(${transforms.bottomRight.scale})`,
                      }}
                    >
                      {draft.bottomRightText || "A   H I G H E R   T O M O R R O W"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM CANVAS STATUS FOOTER (Finexy-Light) */}
          <footer className="mt-4 w-full max-w-[980px] flex items-center justify-between text-[11px] text-neutral-500 px-2 font-medium">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Canvas 3000 × 2000 px · 3:2 Landscape</span>
            </div>
            <div className="flex items-center gap-3">
              <span>
                Selected:{" "}
                <strong className="text-neutral-800">
                  {selectedLayer ? getLayerName(selectedLayer) : "None (Click element to move / scale / delete)"}
                </strong>
              </span>
              <span>·</span>
              <span className="text-[#f26430] font-semibold">⚡ PowerPoint Native</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
