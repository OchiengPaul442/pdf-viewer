import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import type {
  Annotation,
  TextAnnotation,
  HighlightAnnotation,
  FreehandAnnotation,
  RectangleAnnotation,
  CircleAnnotation,
  ArrowAnnotation,
  LineAnnotation,
  StickyNoteAnnotation,
  SignatureAnnotation,
  StampAnnotation,
  WhiteoutAnnotation,
  ImageAnnotation,
  WatermarkSettings,
} from "@/types/annotations";

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return rgb(0, 0, 0);
  return rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  );
}

interface ExportOptions {
  pdfData: Uint8Array;
  annotations: Record<number, Annotation[]>;
  pageOrder: number[];
  watermark: WatermarkSettings;
  scale: number;
}

function getScaleFactor(scale: number) {
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function getAnnotationRenderScale(ann: Annotation, fallbackScale: number) {
  return getScaleFactor(ann.renderScale ?? fallbackScale);
}

function normalizePdfData(pdfData: Uint8Array) {
  const header = [0x25, 0x50, 0x44, 0x46, 0x2d];

  for (let i = 0; i <= Math.max(0, pdfData.length - header.length); i++) {
    let matches = true;
    for (let j = 0; j < header.length; j++) {
      if (pdfData[i + j] !== header[j]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return i === 0 ? pdfData : pdfData.slice(i);
    }
  }

  return pdfData;
}

function dataUrlToBytes(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Invalid data URL");
  }

  const meta = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);

  if (meta.includes(";base64")) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  return new TextEncoder().encode(decodeURIComponent(payload));
}

export async function exportPdf({
  pdfData,
  annotations,
  pageOrder,
  watermark,
  scale,
}: ExportOptions): Promise<Uint8Array> {
  const normalizedPdfData = normalizePdfData(pdfData);
  const sourceDoc = await PDFDocument.load(normalizedPdfData);
  const fallbackScale = getScaleFactor(scale);
  const helvetica = await sourceDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await sourceDoc.embedFont(StandardFonts.HelveticaBold);
  const courier = await sourceDoc.embedFont(StandardFonts.Courier);
  const timesRoman = await sourceDoc.embedFont(StandardFonts.TimesRoman);

  const fontMap: Record<string, PDFFont> = {
    Helvetica: helvetica,
    Arial: helvetica,
    "Arial Narrow": helvetica,
    Aptos: helvetica,
    Calibri: helvetica,
    Cambria: timesRoman,
    Candara: helvetica,
    "Century Gothic": helvetica,
    "Comic Sans MS": helvetica,
    Consolas: courier,
    "Courier New": courier,
    Georgia: timesRoman,
    Impact: helvetica,
    "Lucida Sans Unicode": helvetica,
    "Palatino Linotype": timesRoman,
    "Segoe UI": helvetica,
    Tahoma: helvetica,
    "Times New Roman": timesRoman,
    "Times-Roman": timesRoman,
    "Trebuchet MS": helvetica,
    Verdana: helvetica,
    Courier: courier,
  };

  const sourcePages = sourceDoc.getPages();
  const orderedPageIndexes =
    pageOrder.length > 0 ? pageOrder.filter((pageIdx) => pageIdx >= 0) : [];
  const shouldReorder =
    orderedPageIndexes.length > 0 &&
    orderedPageIndexes.some((pageIdx, index) => pageIdx !== index);
  const pdfDoc = shouldReorder ? await PDFDocument.create() : sourceDoc;
  const exportPages: Array<{ page: PDFPage; sourcePageIndex: number }> = [];

  if (shouldReorder) {
    for (const sourcePageIndex of orderedPageIndexes) {
      if (sourcePageIndex < 0 || sourcePageIndex >= sourcePages.length) {
        continue;
      }
      const [copiedPage] = await pdfDoc.copyPages(sourceDoc, [sourcePageIndex]);
      pdfDoc.addPage(copiedPage);
      exportPages.push({ page: copiedPage, sourcePageIndex });
    }
  } else {
    sourcePages.forEach((page, sourcePageIndex) => {
      exportPages.push({ page, sourcePageIndex });
    });
  }

  for (const { page, sourcePageIndex } of exportPages) {
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const pageAnns = annotations[sourcePageIndex] || [];

    // Sort by creation time for proper z-ordering
    const sorted = [...pageAnns].sort((a, b) => a.createdAt - b.createdAt);

    for (const ann of sorted) {
      try {
        await drawAnnotation(
          page,
          ann,
          pageHeight,
          fontMap,
          helvetica,
          helveticaBold,
          pdfDoc,
          fallbackScale,
        );
      } catch (error) {
        console.warn("Skipping annotation during export:", error);
      }
    }

    // Draw watermark on each page
    if (watermark.enabled && watermark.text) {
      drawWatermark(page, watermark, helveticaBold, pageWidth, pageHeight);
    }
  }

  return pdfDoc.save();
}

async function drawAnnotation(
  page: PDFPage,
  ann: Annotation,
  pageHeight: number,
  fontMap: Record<string, PDFFont>,
  defaultFont: PDFFont,
  boldFont: PDFFont,
  pdfDoc: PDFDocument,
  fallbackScale: number,
) {
  const normalizedScale = getAnnotationRenderScale(ann, fallbackScale);
  const pdfX = ann.x / normalizedScale;
  const pdfY = pageHeight - ann.y / normalizedScale;

  switch (ann.type) {
    case "text": {
      const t = ann as TextAnnotation;
      const font = fontMap[t.fontFamily] || defaultFont;
      page.drawText(t.text, {
        x: pdfX,
        y: pdfY - t.fontSize / normalizedScale,
        size: t.fontSize / normalizedScale,
        font,
        color: hexToRgb(t.fontColor),
        opacity: t.opacity,
      });
      break;
    }

    case "highlight": {
      const h = ann as HighlightAnnotation;
      page.drawRectangle({
        x: pdfX,
        y: pdfY - h.height / normalizedScale,
        width: h.width / normalizedScale,
        height: h.height / normalizedScale,
        color: hexToRgb(h.color),
        opacity: h.opacity,
      });
      break;
    }

    case "freehand": {
      const f = ann as FreehandAnnotation;
      // Build SVG path from points
      if (f.points.length >= 4) {
        let path = `M ${f.points[0] / normalizedScale} ${pageHeight - f.points[1] / normalizedScale}`;
        for (let i = 2; i < f.points.length; i += 2) {
          path += ` L ${f.points[i] / normalizedScale} ${pageHeight - f.points[i + 1] / normalizedScale}`;
        }
        try {
          page.drawSvgPath(path, {
            borderColor: hexToRgb(f.strokeColor),
            borderWidth: f.strokeWidth / normalizedScale,
            opacity: f.opacity,
          });
        } catch {
          // Fallback: draw line segments
          for (let i = 0; i < f.points.length - 2; i += 2) {
            page.drawLine({
              start: {
                x: f.points[i] / normalizedScale,
                y: pageHeight - f.points[i + 1] / normalizedScale,
              },
              end: {
                x: f.points[i + 2] / normalizedScale,
                y: pageHeight - f.points[i + 3] / normalizedScale,
              },
              thickness: f.strokeWidth / normalizedScale,
              color: hexToRgb(f.strokeColor),
              opacity: f.opacity,
            });
          }
        }
      }
      break;
    }

    case "rectangle": {
      const r = ann as RectangleAnnotation;
      page.drawRectangle({
        x: pdfX,
        y: pdfY - r.height / normalizedScale,
        width: r.width / normalizedScale,
        height: r.height / normalizedScale,
        color:
          r.fillColor !== "transparent" ? hexToRgb(r.fillColor) : undefined,
        borderColor: hexToRgb(r.strokeColor),
        borderWidth: r.strokeWidth / normalizedScale,
        opacity: r.opacity,
      });
      break;
    }

    case "circle": {
      const c = ann as CircleAnnotation;
      page.drawEllipse({
        x: pdfX + c.width / (2 * normalizedScale),
        y: pdfY - c.height / (2 * normalizedScale),
        xScale: Math.max(1, c.width / (2 * normalizedScale)),
        yScale: Math.max(1, c.height / (2 * normalizedScale)),
        color:
          c.fillColor !== "transparent" ? hexToRgb(c.fillColor) : undefined,
        borderColor: hexToRgb(c.strokeColor),
        borderWidth: c.strokeWidth / normalizedScale,
        opacity: c.opacity,
      });
      break;
    }

    case "arrow":
    case "line": {
      const l = ann as LineAnnotation | ArrowAnnotation;
      if (l.points.length >= 4) {
        page.drawLine({
          start: {
            x: l.points[0] / normalizedScale,
            y: pageHeight - l.points[1] / normalizedScale,
          },
          end: {
            x: l.points[2] / normalizedScale,
            y: pageHeight - l.points[3] / normalizedScale,
          },
          thickness: l.strokeWidth / normalizedScale,
          color: hexToRgb(l.strokeColor),
          opacity: l.opacity,
        });
        // Draw arrowhead for arrows
        if (ann.type === "arrow") {
          const dx = l.points[2] - l.points[0];
          const dy = l.points[3] - l.points[1];
          const angle = Math.atan2(dy, dx);
          const headLen = 12;
          const x2 = l.points[2] / normalizedScale;
          const y2 = pageHeight - l.points[3] / normalizedScale;

          page.drawLine({
            start: { x: x2, y: y2 },
            end: {
              x: x2 - headLen * Math.cos(angle - Math.PI / 6),
              y: y2 + headLen * Math.sin(angle - Math.PI / 6),
            },
            thickness: l.strokeWidth / normalizedScale,
            color: hexToRgb(l.strokeColor),
          });
          page.drawLine({
            start: { x: x2, y: y2 },
            end: {
              x: x2 - headLen * Math.cos(angle + Math.PI / 6),
              y: y2 + headLen * Math.sin(angle + Math.PI / 6),
            },
            thickness: l.strokeWidth / normalizedScale,
            color: hexToRgb(l.strokeColor),
          });
        }
      }
      break;
    }

    case "sticky-note": {
      const s = ann as StickyNoteAnnotation;
      // Draw note background
      page.drawRectangle({
        x: pdfX,
        y: pdfY - s.height / normalizedScale,
        width: s.width / normalizedScale,
        height: s.height / normalizedScale,
        color: hexToRgb(s.color),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
        opacity: s.opacity,
      });
      // Draw note text
      page.drawText(s.text.substring(0, 200), {
        x: pdfX + 5 / normalizedScale,
        y: pdfY - 30 / normalizedScale,
        size: 11 / normalizedScale,
        font: defaultFont,
        color: rgb(0.08, 0.08, 0.08),
        maxWidth: s.width / normalizedScale - 10 / normalizedScale,
        lineHeight: 12 / normalizedScale,
      });
      break;
    }

    case "stamp": {
      const st = ann as StampAnnotation;
      page.drawRectangle({
        x: pdfX,
        y: pdfY - st.height / normalizedScale,
        width: st.width / normalizedScale,
        height: st.height / normalizedScale,
        borderColor: hexToRgb(st.color),
        borderWidth: 3 / normalizedScale,
        opacity: st.opacity,
      });
      page.drawText(st.text, {
        x: pdfX + 10 / normalizedScale,
        y: pdfY - st.height / (2 * normalizedScale) - 8 / normalizedScale,
        size: 20 / normalizedScale,
        font: boldFont,
        color: hexToRgb(st.color),
        opacity: st.opacity,
      });
      break;
    }

    case "whiteout": {
      const w = ann as WhiteoutAnnotation;
      page.drawRectangle({
        x: pdfX,
        y: pdfY - w.height / normalizedScale,
        width: w.width / normalizedScale,
        height: w.height / normalizedScale,
        color: rgb(1, 1, 1),
        opacity: 1,
      });
      break;
    }

    case "signature": {
      const sig = ann as SignatureAnnotation;
      try {
        const imgBytes = dataUrlToBytes(sig.dataUrl);
        const image = sig.dataUrl.includes("image/png")
          ? await pdfDoc.embedPng(imgBytes)
          : await pdfDoc.embedJpg(imgBytes);
        page.drawImage(image, {
          x: pdfX,
          y: pdfY - sig.height / normalizedScale,
          width: sig.width / normalizedScale,
          height: sig.height / normalizedScale,
          opacity: sig.opacity,
        });
      } catch {
        // Skip if image fails
      }
      break;
    }

    case "image": {
      const img = ann as ImageAnnotation;
      try {
        const imgBytes = dataUrlToBytes(img.dataUrl);
        const image = img.dataUrl.includes("image/png")
          ? await pdfDoc.embedPng(imgBytes)
          : await pdfDoc.embedJpg(imgBytes);
        page.drawImage(image, {
          x: pdfX,
          y: pdfY - img.height / normalizedScale,
          width: img.width / normalizedScale,
          height: img.height / normalizedScale,
          opacity: img.opacity,
        });
      } catch {
        // Skip if image fails
      }
      break;
    }
  }
}

function drawWatermark(
  page: PDFPage,
  watermark: WatermarkSettings,
  font: PDFFont,
  pageWidth: number,
  pageHeight: number,
) {
  const textWidth = font.widthOfTextAtSize(watermark.text, watermark.fontSize);
  let x: number, y: number;

  switch (watermark.position) {
    case "center":
      x = pageWidth / 2 - textWidth / 2;
      y = pageHeight / 2;
      break;
    case "top-left":
      x = 50;
      y = pageHeight - 50;
      break;
    case "top-right":
      x = pageWidth - textWidth - 50;
      y = pageHeight - 50;
      break;
    case "bottom-left":
      x = 50;
      y = 50;
      break;
    case "bottom-right":
      x = pageWidth - textWidth - 50;
      y = 50;
      break;
    default:
      x = pageWidth / 2 - textWidth / 2;
      y = pageHeight / 2;
  }

  page.drawText(watermark.text, {
    x,
    y,
    size: watermark.fontSize,
    font,
    color: hexToRgb(watermark.color),
    opacity: watermark.opacity,
    rotate: degrees(watermark.rotation),
  });
}

export function downloadBlob(data: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(data)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
