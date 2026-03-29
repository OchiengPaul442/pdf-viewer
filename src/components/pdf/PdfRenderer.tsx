"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { usePdfStore } from "@/store/pdf-store";
import type { PageInfo } from "@/types/annotations";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    window.location.origin + "/pdf.worker.min.mjs";
}

interface PdfPageRendererProps {
  pageIndex: number;
  pdfDoc: PDFDocumentProxy;
  scale: number;
  onPageRender?: (
    pageIndex: number,
    canvas: HTMLCanvasElement,
    viewport: pdfjsLib.PageViewport,
  ) => void;
}

export function PdfPageRenderer({
  pageIndex,
  pdfDoc,
  scale,
  onPageRender,
}: PdfPageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const pageRef = useRef<PDFPageProxy | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Cancel previous render
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(pageIndex + 1); // pdfjs is 1-indexed
        if (cancelled) {
          page.cleanup();
          return;
        }
        pageRef.current = page;

        const viewport = page.getViewport({ scale });
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderTask = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (cancelled) return;

        onPageRender?.(pageIndex, canvas, viewport);

        // Render text layer
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = "";
          textLayerRef.current.style.width = `${viewport.width}px`;
          textLayerRef.current.style.height = `${viewport.height}px`;

          const textContent = await page.getTextContent();
          if (cancelled) return;

          const textItems = textContent.items;
          for (const item of textItems) {
            if (!("str" in item) || !item.str) continue;
            const tx = pdfjsLib.Util.transform(
              viewport.transform,
              item.transform,
            );
            const span = document.createElement("span");
            span.textContent = item.str;
            span.style.position = "absolute";
            span.style.left = `${tx[4]}px`;
            span.style.top = `${tx[5] - item.height * scale}px`;
            span.style.fontSize = `${item.height * scale}px`;
            span.style.fontFamily = item.fontName || "sans-serif";
            span.style.transformOrigin = "0% 0%";
            span.style.whiteSpace = "pre";
            span.style.color = "transparent";
            span.style.pointerEvents = "all";
            span.style.userSelect = "text";
            textLayerRef.current.appendChild(span);
          }
        }
      } catch (err) {
        if (
          !cancelled &&
          err instanceof Error &&
          err.message !== "Rendering cancelled"
        ) {
          console.error("Error rendering page:", err);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      if (pageRef.current) {
        pageRef.current.cleanup();
      }
    };
  }, [pageIndex, pdfDoc, scale, onPageRender]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="block" />
      <div
        ref={textLayerRef}
        className="absolute top-0 left-0 overflow-hidden leading-none"
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
}

export function usePdfDocument() {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pdfData, setNumPages, setPageInfos } = usePdfStore();

  const loadDocument = useCallback(
    async (data: Uint8Array) => {
      setLoading(true);
      setError(null);
      try {
        const doc = await pdfjsLib.getDocument({ data }).promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);

        // Collect page info
        const infos: PageInfo[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          infos.push({
            width: viewport.width,
            height: viewport.height,
            rotation: page.rotate,
          });
          page.cleanup();
        }
        setPageInfos(infos);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load PDF");
        setPdfDoc(null);
      } finally {
        setLoading(false);
      }
    },
    [setNumPages, setPageInfos],
  );

  useEffect(() => {
    if (pdfData) {
      loadDocument(pdfData);
    } else {
      setPdfDoc(null);
    }
  }, [pdfData, loadDocument]);

  return { pdfDoc, loading, error };
}
