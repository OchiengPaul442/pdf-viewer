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

export async function exportPdf({
  pdfData,
  annotations,
  pageOrder,
  watermark,
}: ExportOptions): Promise<Uint8Array> {
  const normalizedPdfData = normalizePdfData(pdfData);
  const pdfDoc = await PDFDocument.load(normalizedPdfData);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);

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

  const pages = pdfDoc.getPages();

  // Reorder pages if needed
  if (pageOrder.length > 0 && pageOrder.some((v, i) => v !== i)) {
    // Create a new document in the desired order
    const newDoc = await PDFDocument.create();
    for (const origIdx of pageOrder) {
      if (origIdx < pages.length) {
        const [copiedPage] = await newDoc.copyPages(pdfDoc, [origIdx]);
        newDoc.addPage(copiedPage);
      }
    }
    // We can't easily swap in-place, so we'll work with the original order
    // The annotations are keyed by original page index anyway
  }

  // Flatten annotations per page
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const pageAnns = annotations[pageIdx] || [];

    // Sort by creation time for proper z-ordering
    const sorted = [...pageAnns].sort((a, b) => a.createdAt - b.createdAt);

    for (const ann of sorted) {
      // Convert screen coordinates to PDF coordinates (flip Y axis)
      const pdfX = ann.x;
      const pdfY = pageHeight - ann.y;

      await drawAnnotation(
        page,
        ann,
        pdfX,
        pdfY,
        pageHeight,
        fontMap,
        helvetica,
        helveticaBold,
        pdfDoc,
      );
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
  pdfX: number,
  pdfY: number,
  pageHeight: number,
  fontMap: Record<string, PDFFont>,
  defaultFont: PDFFont,
  boldFont: PDFFont,
  pdfDoc: PDFDocument,
) {
  switch (ann.type) {
    case "text": {
      const t = ann as TextAnnotation;
      const font = fontMap[t.fontFamily] || defaultFont;
      page.drawText(t.text, {
        x: pdfX,
        y: pdfY - t.fontSize,
        size: t.fontSize,
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
        y: pdfY - h.height,
        width: h.width,
        height: h.height,
        color: hexToRgb(h.color),
        opacity: h.opacity,
      });
      break;
    }

    case "freehand": {
      const f = ann as FreehandAnnotation;
      // Build SVG path from points
      if (f.points.length >= 4) {
        let path = `M ${f.points[0]} ${pageHeight - f.points[1]}`;
        for (let i = 2; i < f.points.length; i += 2) {
          path += ` L ${f.points[i]} ${pageHeight - f.points[i + 1]}`;
        }
        try {
          page.drawSvgPath(path, {
            borderColor: hexToRgb(f.strokeColor),
            borderWidth: f.strokeWidth,
            opacity: f.opacity,
          });
        } catch {
          // Fallback: draw line segments
          for (let i = 0; i < f.points.length - 2; i += 2) {
            page.drawLine({
              start: { x: f.points[i], y: pageHeight - f.points[i + 1] },
              end: { x: f.points[i + 2], y: pageHeight - f.points[i + 3] },
              thickness: f.strokeWidth,
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
        y: pdfY - r.height,
        width: r.width,
        height: r.height,
        color:
          r.fillColor !== "transparent" ? hexToRgb(r.fillColor) : undefined,
        borderColor: hexToRgb(r.strokeColor),
        borderWidth: r.strokeWidth,
        opacity: r.opacity,
      });
      break;
    }

    case "circle": {
      const c = ann as CircleAnnotation;
      page.drawEllipse({
        x: pdfX + c.width / 2,
        y: pdfY - c.height / 2,
        xScale: Math.max(1, c.width / 2),
        yScale: Math.max(1, c.height / 2),
        color:
          c.fillColor !== "transparent" ? hexToRgb(c.fillColor) : undefined,
        borderColor: hexToRgb(c.strokeColor),
        borderWidth: c.strokeWidth,
        opacity: c.opacity,
      });
      break;
    }

    case "arrow":
    case "line": {
      const l = ann as LineAnnotation | ArrowAnnotation;
      if (l.points.length >= 4) {
        page.drawLine({
          start: { x: l.points[0], y: pageHeight - l.points[1] },
          end: { x: l.points[2], y: pageHeight - l.points[3] },
          thickness: l.strokeWidth,
          color: hexToRgb(l.strokeColor),
          opacity: l.opacity,
        });
        // Draw arrowhead for arrows
        if (ann.type === "arrow") {
          const dx = l.points[2] - l.points[0];
          const dy = l.points[3] - l.points[1];
          const angle = Math.atan2(dy, dx);
          const headLen = 12;
          const x2 = l.points[2];
          const y2 = pageHeight - l.points[3];

          page.drawLine({
            start: { x: x2, y: y2 },
            end: {
              x: x2 - headLen * Math.cos(angle - Math.PI / 6),
              y: y2 + headLen * Math.sin(angle - Math.PI / 6),
            },
            thickness: l.strokeWidth,
            color: hexToRgb(l.strokeColor),
          });
          page.drawLine({
            start: { x: x2, y: y2 },
            end: {
              x: x2 - headLen * Math.cos(angle + Math.PI / 6),
              y: y2 + headLen * Math.sin(angle + Math.PI / 6),
            },
            thickness: l.strokeWidth,
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
        y: pdfY - s.height,
        width: s.width,
        height: s.height,
        color: hexToRgb(s.color),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
        opacity: s.opacity,
      });
      // Draw note text
      page.drawText(s.text.substring(0, 200), {
        x: pdfX + 5,
        y: pdfY - 30,
        size: 11,
        font: defaultFont,
        color: rgb(0.08, 0.08, 0.08),
        maxWidth: s.width - 10,
        lineHeight: 12,
      });
      break;
    }

    case "stamp": {
      const st = ann as StampAnnotation;
      page.drawRectangle({
        x: pdfX,
        y: pdfY - st.height,
        width: st.width,
        height: st.height,
        borderColor: hexToRgb(st.color),
        borderWidth: 3,
        opacity: st.opacity,
      });
      page.drawText(st.text, {
        x: pdfX + 10,
        y: pdfY - st.height / 2 - 8,
        size: 20,
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
        y: pdfY - w.height,
        width: w.width,
        height: w.height,
        color: rgb(1, 1, 1),
        opacity: 1,
      });
      break;
    }

    case "signature": {
      const sig = ann as SignatureAnnotation;
      try {
        const imgBytes = await fetch(sig.dataUrl).then((r) => r.arrayBuffer());
        const image = sig.dataUrl.includes("image/png")
          ? await pdfDoc.embedPng(imgBytes)
          : await pdfDoc.embedJpg(imgBytes);
        page.drawImage(image, {
          x: pdfX,
          y: pdfY - sig.height,
          width: sig.width,
          height: sig.height,
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
        const imgBytes = await fetch(img.dataUrl).then((r) => r.arrayBuffer());
        const image = img.dataUrl.includes("image/png")
          ? await pdfDoc.embedPng(imgBytes)
          : await pdfDoc.embedJpg(imgBytes);
        page.drawImage(image, {
          x: pdfX,
          y: pdfY - img.height,
          width: img.width,
          height: img.height,
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
