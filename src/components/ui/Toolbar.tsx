"use client";

import Image from "next/image";
import { useStore } from "zustand";
import { usePdfStore } from "@/store/pdf-store";
import type { ToolType } from "@/types/annotations";
import {
  MousePointer2,
  Type,
  Highlighter,
  Pencil,
  Square,
  Circle,
  ArrowRight,
  Minus,
  StickyNote,
  PenTool,
  Stamp,
  Eraser,
  ImagePlus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Search,
  Undo2,
  Redo2,
  PanelLeft,
  FileUp,
} from "lucide-react";

interface ToolButtonProps {
  tool: ToolType;
  icon: React.ReactNode;
  label: string;
  activeTool: ToolType;
  onClick: (tool: ToolType) => void;
}

function ToolButton({
  tool,
  icon,
  label,
  activeTool,
  onClick,
}: ToolButtonProps) {
  const isActive = activeTool === tool;
  return (
    <button
      onClick={() => onClick(tool)}
      title={label}
      className={`p-2 rounded-lg transition-colors ${
        isActive
          ? "bg-blue-500 text-white shadow-md"
          : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {icon}
    </button>
  );
}

interface ToolbarProps {
  onExport: () => void;
  onPrint: () => void;
}

export default function Toolbar({ onExport, onPrint }: ToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    scale,
    setScale,
    currentPage,
    numPages,
    setCurrentPage,
    sidebarOpen,
    setSidebarOpen,
    searchOpen,
    setSearchOpen,
    fileName,
    setPdfData,
  } = usePdfStore();

  const canUndo = useStore(
    usePdfStore.temporal,
    (state) => state.pastStates.length > 0,
  );
  const canRedo = useStore(
    usePdfStore.temporal,
    (state) => state.futureStates.length > 0,
  );

  const store = usePdfStore;

  const handleUndo = () => {
    if (!canUndo) return;
    store.temporal.getState().undo();
  };

  const handleRedo = () => {
    if (!canRedo) return;
    store.temporal.getState().redo();
  };

  const scrollToPage = (page: number) => {
    setCurrentPage(page);
    const fn = (window as unknown as Record<string, unknown>).__pdfScrollToPage;
    if (typeof fn === "function") {
      (fn as (p: number) => void)(page);
    }
  };

  const tools: { tool: ToolType; icon: React.ReactNode; label: string }[] = [
    { tool: "select", icon: <MousePointer2 size={18} />, label: "Select (V)" },
    { tool: "text", icon: <Type size={18} />, label: "Text Box (T)" },
    {
      tool: "highlight",
      icon: <Highlighter size={18} />,
      label: "Highlight (H)",
    },
    {
      tool: "freehand",
      icon: <Pencil size={18} />,
      label: "Freehand Draw (D)",
    },
    { tool: "rectangle", icon: <Square size={18} />, label: "Rectangle (R)" },
    { tool: "circle", icon: <Circle size={18} />, label: "Circle (C)" },
    { tool: "arrow", icon: <ArrowRight size={18} />, label: "Arrow (A)" },
    { tool: "line", icon: <Minus size={18} />, label: "Line (L)" },
    {
      tool: "sticky-note",
      icon: <StickyNote size={18} />,
      label: "Sticky Note (N)",
    },
    { tool: "signature", icon: <PenTool size={18} />, label: "Signature (S)" },
    { tool: "stamp", icon: <Stamp size={18} />, label: "Stamp" },
    { tool: "whiteout", icon: <Eraser size={18} />, label: "Whiteout (W)" },
    { tool: "image", icon: <ImagePlus size={18} />, label: "Add Image (I)" },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-1 overflow-x-auto whitespace-nowrap sm:flex-wrap">
      <div className="mr-1 flex items-center gap-2 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-200 shrink-0">
        <Image
          src="/logos/logo.webp"
          alt="PaperPilot"
          width={22}
          height={22}
          className="h-5 w-5 rounded-sm object-contain"
        />
        <span className="hidden text-sm font-semibold sm:inline">
          PaperPilot
        </span>
      </div>

      {/* Sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title="Toggle page sidebar"
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <PanelLeft size={18} />
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* File controls */}
      <label
        title="Open PDF"
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
      >
        <FileUp size={18} />
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const buffer = await file.arrayBuffer();
              setPdfData(new Uint8Array(buffer), file.name);
            }
          }}
        />
      </label>
      <button
        onClick={onExport}
        title="Download PDF"
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <Download size={18} />
      </button>
      <button
        onClick={onPrint}
        title="Print"
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <Printer size={18} />
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Undo/Redo */}
      <button
        onClick={handleUndo}
        title="Undo (Ctrl+Z)"
        disabled={!canUndo}
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Undo2 size={18} />
      </button>
      <button
        onClick={handleRedo}
        title="Redo (Ctrl+Y)"
        disabled={!canRedo}
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Redo2 size={18} />
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Tools */}
      {tools.map(({ tool, icon, label }) => (
        <ToolButton
          key={tool}
          tool={tool}
          icon={icon}
          label={label}
          activeTool={activeTool}
          onClick={setActiveTool}
        />
      ))}

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Search */}
      <button
        onClick={() => setSearchOpen(!searchOpen)}
        title="Search (Ctrl+F)"
        className={`p-2 rounded-lg transition-colors ${
          searchOpen
            ? "bg-blue-500 text-white"
            : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
      >
        <Search size={18} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom controls */}
      <button
        onClick={() => setScale(scale - 0.1)}
        title="Zoom Out"
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <ZoomOut size={18} />
      </button>
      <span className="text-sm text-gray-600 dark:text-gray-300 min-w-12 text-center">
        {Math.round(scale * 100)}%
      </span>
      <button
        onClick={() => setScale(scale + 0.1)}
        title="Zoom In"
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <ZoomIn size={18} />
      </button>
      <button
        onClick={() => setScale(1.0)}
        title="Reset Zoom"
        className="p-1.5 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <RotateCcw size={14} />
      </button>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

      {/* Page navigation */}
      <button
        onClick={() => scrollToPage(Math.max(0, currentPage - 1))}
        disabled={currentPage <= 0}
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm text-gray-600 dark:text-gray-300 min-w-16 text-center">
        {currentPage + 1} / {numPages}
      </span>
      <button
        onClick={() => scrollToPage(Math.min(numPages - 1, currentPage + 1))}
        disabled={currentPage >= numPages - 1}
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
      >
        <ChevronRight size={18} />
      </button>

      {/* File name */}
      {fileName && (
        <span
          className="text-xs text-gray-400 dark:text-gray-500 ml-2 truncate max-w-37.5"
          title={fileName}
        >
          {fileName}
        </span>
      )}
    </div>
  );
}
