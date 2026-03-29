"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { usePdfStore } from "@/store/pdf-store";
import {
  Trash2,
  RotateCw,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

function PageThumbnail({
  pdfDoc,
  pageIndex,
  rotation,
}: {
  pdfDoc: PDFDocumentProxy;
  pageIndex: number;
  rotation: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    const renderThumbnail = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const page = await pdfDoc.getPage(pageIndex + 1);
        if (cancelled) {
          page.cleanup();
          return;
        }

        const viewport = page.getViewport({ scale: 0.2, rotation });
        const context = canvas.getContext("2d");
        if (!context) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        await renderTask.promise;
        if (!cancelled) {
          page.cleanup();
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to render thumbnail:", error);
        }
      }
    };

    renderThumbnail();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, pageIndex, rotation]);

  return (
    <canvas ref={canvasRef} className="block w-full rounded-md bg-white" />
  );
}

interface PageSidebarProps {
  pdfDoc: PDFDocumentProxy | null;
}

export default function PageSidebar({ pdfDoc }: PageSidebarProps) {
  const {
    sidebarOpen,
    pageOrder,
    numPages,
    currentPage,
    pageInfos,
    removePage,
    movePage,
    rotatePage,
    setCurrentPage,
  } = usePdfStore();

  const scrollToPage = useCallback(
    (pageIdx: number) => {
      setCurrentPage(pageIdx);
      const fn = (window as unknown as Record<string, unknown>)
        .__pdfScrollToPage;
      if (typeof fn === "function") {
        (fn as (p: number) => void)(pageIdx);
      }
    },
    [setCurrentPage],
  );

  if (!sidebarOpen) return null;

  return (
    <div className="w-48 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto shrink-0">
      <div className="p-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
        Pages ({numPages})
      </div>
      <div className="p-2 space-y-2">
        {pageOrder.map((originalIdx, displayIdx) => {
          const isActive = currentPage === displayIdx;
          const info = pageInfos[originalIdx];
          const rotation = info?.rotation ?? 0;

          return (
            <div
              key={`thumb-${displayIdx}-${originalIdx}`}
              className={`group relative rounded-lg border-2 cursor-pointer transition-colors ${
                isActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-400"
              }`}
              onClick={() => scrollToPage(displayIdx)}
            >
              <div
                className="overflow-hidden bg-gray-50 dark:bg-gray-700"
                style={{
                  aspectRatio: info
                    ? `${info.width} / ${info.height}`
                    : "8.5 / 11",
                }}
              >
                {pdfDoc ? (
                  <PageThumbnail
                    pdfDoc={pdfDoc}
                    pageIndex={originalIdx}
                    rotation={rotation}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-lg font-semibold">
                    {displayIdx + 1}
                  </div>
                )}
              </div>

              {/* Controls overlay */}
              <div className="absolute top-1 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {displayIdx > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      movePage(displayIdx, displayIdx - 1);
                    }}
                    title="Move up"
                    className="p-1 bg-white dark:bg-gray-700 rounded shadow text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                  >
                    <ChevronUp size={12} />
                  </button>
                )}
                {displayIdx < pageOrder.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      movePage(displayIdx, displayIdx + 1);
                    }}
                    title="Move down"
                    className="p-1 bg-white dark:bg-gray-700 rounded shadow text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                  >
                    <ChevronDown size={12} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    rotatePage(originalIdx, 90);
                  }}
                  title="Rotate page"
                  className="p-1 bg-white dark:bg-gray-700 rounded shadow text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                >
                  <RotateCw size={12} />
                </button>
                {pageOrder.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this page?")) {
                        removePage(displayIdx);
                      }
                    }}
                    title="Delete page"
                    className="p-1 bg-white dark:bg-gray-700 rounded shadow text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {/* Drag handle indicator */}
              <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
                <GripVertical size={14} className="text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
