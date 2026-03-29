"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PageViewport } from "pdfjs-dist";
import { PdfPageRenderer } from "./PdfRenderer";
import { usePdfStore } from "@/store/pdf-store";
import dynamic from "next/dynamic";

const AnnotationLayer = dynamic(
  () => import("../annotations/AnnotationLayer"),
  {
    ssr: false,
  },
);

interface ViewportMap {
  [pageIndex: number]: PageViewport;
}

interface PdfViewerProps {
  pdfDoc: PDFDocumentProxy;
}

export default function PdfViewer({ pdfDoc }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([0]));
  const [viewports, setViewports] = useState<ViewportMap>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastScrollTopRef = useRef(0);

  const { scale, pageOrder, pageInfos, pageTexts, setCurrentPage, watermark } =
    usePdfStore();

  // Set up IntersectionObserver for page virtualization
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const pageIdx = Number(
              entry.target.getAttribute("data-page-index"),
            );
            if (entry.isIntersecting) {
              next.add(pageIdx);
            } else {
              next.delete(pageIdx);
            }
          }
          return next;
        });
      },
      {
        root: containerRef.current,
        rootMargin: "200px 0px",
        threshold: 0,
      },
    );

    // Observe all page placeholders
    pageRefsMap.current.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [pageOrder.length, scale]);

  // Track current page from scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      const previousScrollTop = lastScrollTopRef.current;
      lastScrollTopRef.current = currentScrollTop;

      const direction =
        currentScrollTop > previousScrollTop + 8
          ? "down"
          : currentScrollTop < previousScrollTop - 8
            ? "up"
            : "steady";

      window.dispatchEvent(
        new CustomEvent("pdfviewer-scroll", {
          detail: { direction, scrollTop: currentScrollTop },
        }),
      );

      const containerRect = container.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      let closestPage = 0;
      let closestDist = Infinity;

      pageRefsMap.current.forEach((el, idx) => {
        const rect = el.getBoundingClientRect();
        const pageCenterY = rect.top + rect.height / 2;
        const dist = Math.abs(pageCenterY - centerY);
        if (dist < closestDist) {
          closestDist = dist;
          closestPage = idx;
        }
      });

      setCurrentPage(closestPage);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [setCurrentPage]);

  // Scroll to page when currentPage changes programmatically
  const scrollToPage = useCallback((pageIdx: number) => {
    const el = pageRefsMap.current.get(pageIdx);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handlePageRender = useCallback(
    (pageIndex: number, _canvas: HTMLCanvasElement, viewport: PageViewport) => {
      setViewports((prev) => {
        const existing = prev[pageIndex];
        if (existing === viewport) {
          return prev;
        }

        return { ...prev, [pageIndex]: viewport };
      });
    },
    [],
  );

  const registerPageRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) {
        pageRefsMap.current.set(index, el);
        observerRef.current?.observe(el);
      } else {
        const existing = pageRefsMap.current.get(index);
        if (existing) {
          observerRef.current?.unobserve(existing);
        }
        pageRefsMap.current.delete(index);
      }
    },
    [],
  );

  // Expose scrollToPage for external use
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__pdfScrollToPage =
      scrollToPage;
    return () => {
      delete (window as unknown as Record<string, unknown>).__pdfScrollToPage;
    };
  }, [scrollToPage]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4"
      style={{ scrollBehavior: "smooth" }}
    >
      <div
        aria-hidden="true"
        className="sr-only whitespace-pre-wrap text-transparent"
      >
        {pageOrder.map((originalPageIdx, displayIdx) => {
          const text = pageTexts[originalPageIdx] || "";
          return text ? (
            <div key={`search-${displayIdx}-${originalPageIdx}`}>
              Page {displayIdx + 1}. {text}
            </div>
          ) : null;
        })}
      </div>

      <div className="flex flex-col items-center gap-4">
        {pageOrder.map((originalPageIdx, displayIdx) => {
          const info = pageInfos[originalPageIdx];
          const pageWidth = info ? info.width * scale : 612 * scale;
          const pageHeight = info ? info.height * scale : 792 * scale;
          const isVisible = visiblePages.has(displayIdx);
          const watermarkLeft =
            watermark.position === "top-left" ||
            watermark.position === "bottom-left"
              ? "8%"
              : watermark.position === "top-right" ||
                  watermark.position === "bottom-right"
                ? "92%"
                : "50%";
          const watermarkTop =
            watermark.position === "top-left" ||
            watermark.position === "top-right"
              ? "12%"
              : watermark.position === "bottom-left" ||
                  watermark.position === "bottom-right"
                ? "88%"
                : "50%";
          const watermarkTransform =
            watermark.position === "center"
              ? `translate(-50%, -50%) rotate(${watermark.rotation}deg)`
              : watermark.position === "top-right"
                ? `translateX(-100%) rotate(${watermark.rotation}deg)`
                : watermark.position === "bottom-left"
                  ? `translateY(-100%) rotate(${watermark.rotation}deg)`
                  : watermark.position === "bottom-right"
                    ? `translate(-100%, -100%) rotate(${watermark.rotation}deg)`
                    : `rotate(${watermark.rotation}deg)`;

          return (
            <div
              key={`page-${displayIdx}-${originalPageIdx}`}
              ref={registerPageRef(displayIdx)}
              data-page-index={displayIdx}
              className="relative bg-white shadow-lg"
              style={{
                width: `${pageWidth}px`,
                minHeight: `${pageHeight}px`,
              }}
            >
              {isVisible ? (
                <>
                  <PdfPageRenderer
                    pageIndex={originalPageIdx}
                    pdfDoc={pdfDoc}
                    scale={scale}
                    onPageRender={handlePageRender}
                  />
                  {watermark.enabled && watermark.text && (
                    <div className="pointer-events-none absolute inset-0 select-none">
                      <div
                        className="absolute font-bold uppercase tracking-[0.35em] whitespace-nowrap"
                        style={{
                          left: watermarkLeft,
                          top: watermarkTop,
                          transform: watermarkTransform,
                          transformOrigin: "center",
                          color: watermark.color,
                          opacity: watermark.opacity,
                          fontSize: `${Math.max(12, watermark.fontSize * scale)}px`,
                          lineHeight: 1,
                        }}
                      >
                        {watermark.text}
                      </div>
                    </div>
                  )}
                  {viewports[originalPageIdx] && (
                    <AnnotationLayer
                      pageIndex={originalPageIdx}
                      width={pageWidth}
                      height={pageHeight}
                      scale={scale}
                      viewport={viewports[originalPageIdx]}
                    />
                  )}
                </>
              ) : (
                <div
                  style={{ width: pageWidth, height: pageHeight }}
                  className="bg-white"
                />
              )}
              {/* Page number label */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                {displayIdx + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
