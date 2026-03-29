"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { v4 as uuidv4 } from "uuid";
import { usePdfStore } from "@/store/pdf-store";
import { usePdfDocument } from "@/components/pdf/PdfRenderer";
import Loader from "@/components/ui/Loader";
import FileUpload from "@/components/ui/FileUpload";
import Toolbar from "@/components/ui/Toolbar";
import ToolProperties from "@/components/ui/ToolProperties";
import PageSidebar from "@/components/ui/PageSidebar";
import SignatureModal from "@/components/modals/SignatureModal";
import StampModal from "@/components/modals/StampModal";
import WatermarkModal from "@/components/modals/WatermarkModal";
import { exportPdf, downloadBlob } from "@/lib/export-pdf";
import type {
  SignatureAnnotation,
  StampAnnotation,
  ImageAnnotation,
} from "@/types/annotations";

const PdfViewer = dynamic(() => import("@/components/pdf/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <Loader size={52} label="Loading PDF viewer" color="#2563eb" />
      </div>
    </div>
  ),
});

function openBrowserFind(query = "") {
  if (typeof window === "undefined") return;

  const nativeFind = window as Window & {
    find?: (
      string: string,
      caseSensitive?: boolean,
      backwards?: boolean,
      wrapAround?: boolean,
      wholeWord?: boolean,
      searchInFrames?: boolean,
      showDialog?: boolean,
    ) => boolean;
  };

  if (typeof nativeFind.find === "function") {
    try {
      nativeFind.find(query, false, false, true, false, true, true);
      return;
    } catch (error) {
      console.warn("Browser find failed:", error);
    }
  }
}

export default function PdfWorkspace() {
  const {
    pdfData,
    fileName,
    annotations,
    pageOrder,
    watermark,
    scale,
    activeTool,
    setActiveTool,
    isDirty,
    markClean,
    addAnnotation,
    currentPage,
  } = usePdfStore();

  const { pdfDoc, loading, error } = usePdfDocument();

  const [watermarkModalOpen, setWatermarkModalOpen] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);

  const signatureModalOpen = activeTool === "signature";
  const stampModalOpen = activeTool === "stamp";

  const getSourcePdfData = useCallback(async () => {
    if (pdfDoc) {
      try {
        return await pdfDoc.getData();
      } catch (error) {
        console.warn("Using raw PDF bytes after pdf.js getData failed:", error);
      }
    }
    return pdfData;
  }, [pdfDoc, pdfData]);

  useEffect(() => {
    if (activeTool !== "image") return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/gif,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        addAnnotation({
          id: uuidv4(),
          type: "image",
          pageIndex: currentPage,
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          rotation: 0,
          opacity: 1,
          createdAt: Date.now(),
          renderScale: scale,
          dataUrl,
        } as ImageAnnotation);
      };
      reader.readAsDataURL(file);
    };
    input.click();
    window.setTimeout(() => setActiveTool("select"), 0);
  }, [activeTool, addAnnotation, currentPage, setActiveTool, scale]);

  const handleSignatureSave = useCallback(
    (dataUrl: string) => {
      addAnnotation({
        id: uuidv4(),
        type: "signature",
        pageIndex: currentPage,
        x: 100,
        y: 200,
        width: 200,
        height: 80,
        rotation: 0,
        opacity: 1,
        createdAt: Date.now(),
        renderScale: scale,
        dataUrl,
      } as SignatureAnnotation);
      setActiveTool("select");
    },
    [addAnnotation, currentPage, setActiveTool, scale],
  );

  const handleStampSelect = useCallback(
    (stampType: string, text: string, color: string) => {
      addAnnotation({
        id: uuidv4(),
        type: "stamp",
        stampType: stampType as StampAnnotation["stampType"],
        pageIndex: currentPage,
        x: 100,
        y: 100,
        width: 180,
        height: 60,
        rotation: 0,
        opacity: 1,
        createdAt: Date.now(),
        renderScale: scale,
        text,
        color,
      } as StampAnnotation);
      setActiveTool("select");
    },
    [addAnnotation, currentPage, setActiveTool, scale],
  );

  const handleExport = useCallback(async () => {
    if (!pdfData) return;

    try {
      const sourcePdfData = await getSourcePdfData();
      if (!sourcePdfData) {
        throw new Error("No PDF data available");
      }

      const result = await exportPdf({
        pdfData: sourcePdfData,
        annotations,
        pageOrder,
        watermark,
        scale,
      });
      const exportName = fileName
        ? fileName.replace(".pdf", "_edited.pdf")
        : "edited.pdf";
      downloadBlob(result, exportName);
      markClean();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export PDF. Please try again.");
    }
  }, [
    pdfData,
    getSourcePdfData,
    annotations,
    pageOrder,
    watermark,
    scale,
    fileName,
    markClean,
  ]);

  const handleReset = useCallback(() => {
    usePdfStore.getState().resetDocument();
    usePdfStore.temporal.getState().clear();
  }, []);

  const handleShare = useCallback(async () => {
    if (!pdfData) return;

    try {
      const sourcePdfData = await getSourcePdfData();
      if (!sourcePdfData) {
        throw new Error("No PDF data available");
      }

      const bytes = await exportPdf({
        pdfData: sourcePdfData,
        annotations,
        pageOrder,
        watermark,
        scale,
      });

      const shareName = fileName
        ? fileName.replace(/\.pdf$/i, "")
        : "paperpilot";
      const buffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
      const file = new File(
        [buffer as ArrayBuffer],
        `${shareName}_shared.pdf`,
        {
          type: "application/pdf",
        },
      );

      if (
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: fileName || "PaperPilot PDF",
          text: "Shared from PaperPilot",
          files: [file],
        });
        return;
      }

      downloadBlob(bytes, `${shareName}_shared.pdf`);
    } catch (err) {
      console.error("Share failed:", err);
      alert("Unable to share the PDF right now.");
    }
  }, [
    pdfData,
    getSourcePdfData,
    annotations,
    pageOrder,
    watermark,
    scale,
    fileName,
  ]);

  const handlePrint = useCallback(() => {
    if (!pdfData) return;

    const printBlob = (bytes: Uint8Array) => {
      const buffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
      const blob = new Blob([buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      };
    };

    (async () => {
      try {
        const sourcePdfData = await getSourcePdfData();
        if (!sourcePdfData) {
          throw new Error("No PDF data available");
        }

        const bytes = await exportPdf({
          pdfData: sourcePdfData,
          annotations,
          pageOrder,
          watermark,
          scale,
        });
        printBlob(bytes);
      } catch (err) {
        console.error("Print failed, falling back to original PDF:", err);
        printBlob(pdfData);
      }
    })();
  }, [pdfData, getSourcePdfData, annotations, pageOrder, watermark, scale]);

  useEffect(() => {
    const handleViewerScroll = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          direction: "up" | "down" | "steady";
          scrollTop: number;
        }>
      ).detail;

      if (!detail) return;

      setToolbarVisible(detail.scrollTop < 24 || detail.direction !== "up");
    };

    window.addEventListener(
      "pdfviewer-scroll",
      handleViewerScroll as EventListener,
    );
    return () =>
      window.removeEventListener(
        "pdfviewer-scroll",
        handleViewerScroll as EventListener,
      );
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        usePdfStore.temporal.getState().undo();
      }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        usePdfStore.temporal.getState().redo();
      }
      if (ctrl && e.key === "s") {
        e.preventDefault();
        handleExport();
      }
      if (ctrl && e.key === "p") {
        e.preventDefault();
        handlePrint();
      }
      if (ctrl && e.key === "f") {
        openBrowserFind();
        return;
      }

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const state = usePdfStore.getState();
        if (state.selectedAnnotationId) {
          for (const [pageIdx, anns] of Object.entries(state.annotations)) {
            const found = anns.find((a) => a.id === state.selectedAnnotationId);
            if (found) {
              state.deleteAnnotation(found.id, Number(pageIdx));
              break;
            }
          }
        }
      }

      const shortcuts: Record<string, typeof activeTool> = {
        v: "select",
        t: "text",
        h: "highlight",
        d: "freehand",
        r: "rectangle",
        c: "circle",
        a: "arrow",
        l: "line",
        n: "sticky-note",
        s: "signature",
        w: "whiteout",
        i: "image",
      };

      if (!ctrl && shortcuts[e.key]) {
        setActiveTool(shortcuts[e.key]);
      }

      if (e.key === "Escape") {
        setActiveTool("select");
        usePdfStore.getState().setSelectedAnnotation(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExport, handlePrint, setActiveTool]);

  if (!pdfData) {
    return <FileUpload />;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div
        className={`sticky top-0 z-40 transition-transform duration-300 ease-out will-change-transform ${
          toolbarVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <Toolbar
          onExport={handleExport}
          onPrint={handlePrint}
          onReset={handleReset}
          onShare={handleShare}
          onBrowserFind={() => openBrowserFind()}
        />
        <ToolProperties />
      </div>

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        <PageSidebar pdfDoc={pdfDoc} />

        {loading && (
          <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-300">
              <Loader size={52} label="Loading PDF" color="#2563eb" />
              <span className="text-sm">Loading PDF...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="text-red-500 text-center">
              <p className="text-lg font-semibold">Failed to load PDF</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {pdfDoc && !loading && <PdfViewer pdfDoc={pdfDoc} />}
      </div>

      <div className="fixed bottom-4 right-4 z-30">
        <button
          onClick={() => setWatermarkModalOpen(true)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Watermark
        </button>
      </div>

      <SignatureModal
        open={signatureModalOpen}
        onClose={() => {
          setActiveTool("select");
        }}
        onSave={handleSignatureSave}
      />
      <StampModal
        open={stampModalOpen}
        onClose={() => {
          setActiveTool("select");
        }}
        onSelect={handleStampSelect}
      />
      <WatermarkModal
        open={watermarkModalOpen}
        onClose={() => setWatermarkModalOpen(false)}
      />
    </div>
  );
}
