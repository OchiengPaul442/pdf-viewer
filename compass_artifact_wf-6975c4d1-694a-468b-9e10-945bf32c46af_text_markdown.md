# Building a free PDF editor in Next.js: the complete technical playbook

**The bottom line: a production-grade PDF viewer and editor with zero paid dependencies is achievable—but true "Word-like" text editing of existing PDF content is not.** The viable free stack combines pdfjs-dist for rendering, pdf-lib for manipulation, and react-konva for annotations. This report covers every package, architectural decision, and integration pitfall in brutal detail, so you can build with eyes wide open about what free tools can and cannot do.

PDF is a *display* format, not an editing format. It stores positioned glyphs, not flowing paragraphs. Every architectural decision flows from this fundamental constraint. Commercial SDKs like Apryse and Nutrient ship compiled C++ engines via WebAssembly to work around it; free JavaScript libraries cannot.

---

## The free package ecosystem: an honest capability matrix

### Rendering layer

**pdfjs-dist v5.5.x** (Apache-2.0, ~350 KB gzipped + ~700 KB worker) is the only serious free option for PDF rendering. Maintained by Mozilla with **53,000+ GitHub stars**, it handles canvas rendering, a transparent text layer for selection/copy, annotation display, and interactive AcroForm fields. The text layer returns bounding boxes per text span via `page.getTextContent()`, enabling text selection and highlight positioning. CJK support requires loading cmap files. Version 5.x dropped legacy browser support and requires `Promise.withResolvers` (Node 22+ or polyfill).

**react-pdf v10.4.x** (MIT, by wojtekmaj) wraps pdfjs-dist into declarative `<Document>` and `<Page>` components. With **~9,500 stars and 900K+ weekly downloads**, it's excellent for view-only use cases. However, for a full editor app, it abstracts away the canvas lifecycle, annotation layer, and page cleanup APIs you need direct access to. **Use pdfjs-dist directly** when building an editor—react-pdf's convenience becomes a straitjacket once you need to overlay annotation canvases and manage page virtualization yourself.

### Manipulation layer

**pdf-lib v1.17.1** (MIT, ~90 KB gzipped) is the workhorse for PDF modification. It can create PDFs from scratch, modify existing ones, fill AcroForm fields, add text/images/shapes, merge/split documents, and remove pages. It works isomorphically—browser and Node.js, no DOM dependency, **zero SSR issues**. The critical limitation: **pdf-lib cannot read, modify, or remove existing text on a page**. It can only append new content on top. This is the hard wall that makes true text editing impossible with free tools.

**⚠️ pdf-lib is effectively unmaintained**—no release in 3+ years. The community fork **@cantoo/pdf-lib** adds incremental save support and SVG embedding. For production, seriously consider the fork. **@pdf-lib/fontkit v0.0.4** (also stale) enables custom font embedding from .ttf/.otf files. Font subsetting is automatic. WOFF2 is not directly supported.

### Canvas annotation libraries

| Criterion | react-konva (Konva 9.3.x) | fabric.js 6.6.x |
|---|---|---|
| React integration | Official binding, declarative JSX | No official React wrapper |
| Multi-layer rendering | ✅ Separate canvas per Layer | Single canvas |
| Built-in text editing | ❌ Must implement manually | ✅ Click-to-edit IText/Textbox |
| Transform handles | Via Konva.Transformer component | Built-in resize/rotate handles |
| Bundle size (gzipped) | ~50 KB + ~30 KB react-reconciler | ~90 KB |
| Touch support | Excellent multi-touch | Good |
| SVG export | ❌ | ✅ |
| Performance at scale | Better (dirty-region, multi-layer) | Degrades with 1000+ objects |

**Recommendation: react-konva** for a React/Next.js editor. The declarative JSX model, multi-layer architecture (separate canvas per annotation type overlaying the PDF canvas), and superior performance outweigh fabric.js's built-in text editing. You'll implement editable text via a textarea overlay trick—a well-documented Konva pattern.

### Supporting packages

**jsPDF v3.0.x** (MIT, ~95 KB gzipped) generates PDFs from scratch and converts HTML→PDF via html2canvas. It **cannot load or modify existing PDFs**—use it only if you need HTML-to-PDF export alongside pdf-lib. **mammoth v1.9.x** (BSD-2, ~25 KB gzipped) converts DOCX→HTML with clean semantic output but intentionally strips fonts, sizes, colors, and layout. Round-trip fidelity is poor; it's one-way by design. **pdf-parse** and **pdf2json** are server-side-only text extraction tools—useful for search indexing but not for client-side editing. **pdfme v5.5.x** (MIT, very actively maintained) offers a template-based WYSIWYG PDF designer worth investigating for form-generation workflows.

---

## The "Word-like editing" verdict: three options, one honest answer

### Option A: extract text → contenteditable overlay → write back

The theory: use pdfjs-dist's text layer to get text positions, render contenteditable divs on top, then write changes back with pdf-lib. **This does not work.** Three hard blockers: (1) pdf-lib cannot remove or modify existing text—only overlay new content, so "editing" means white-out rectangles plus new text, producing visible artifacts; (2) font matching requires having the exact .ttf/.otf file for every font in the original PDF, which you cannot extract; (3) the text layer positioning is approximate by design (it's meant for transparent selection overlays, not pixel-perfect editing). No paragraph reflow, no word wrap, no font metrics matching.

### Option B: annotation-based overlay text boxes

The user clicks to place a draggable, resizable text box on top of the rendered PDF page. This is **what every free web PDF "editor" actually does**—Smallpdf, iLovePDF, and even PDF.js's own built-in annotation editor (which added free text, highlights, ink, and stamps in v4+). The UX is honest: you're adding new content on top, not editing the original. It works well for filling blank areas, adding signatures, placing notes. For "correcting" existing text, you draw a white rectangle to cover the old text and place new text on top—ugly but functional.

**This is the only approach that's fully implementable with free tools.** Build it well, with good font selection, color picker, and precise coordinate mapping, and it covers 80% of what users actually need from a "PDF editor."

### Option C: PDF → editable format → export back

Converting PDF to DOCX via LibreOffice headless (`libreoffice --headless --convert-to docx`) then editing in a browser rich-text editor is technically possible but requires a server component. Conversion quality varies wildly—simple text documents convert reasonably; complex layouts are mangled. **pdf2htmlEX** produces high-fidelity HTML but outputs absolutely-positioned text that isn't paragraph-editable. The round-trip back to PDF loses formatting further. Stirling-PDF's text editor (released as "alpha" in v2.1.0) explicitly warns: "Do not expect perfect editing." Even with a Java backend using PDFBox and PDFium, they haven't solved this.

**The honest verdict**: commercial SDKs (Apryse, Nutrient) ship compiled C++ PDF engines as WebAssembly that can parse content streams, modify text operators, and handle font subsetting natively. Free JavaScript libraries operate at a fundamentally different level of abstraction. **Build Option B. Set user expectations accordingly.**

---

## Coordinate system mapping: the formula and every edge case

PDF.js renders to screen coordinates (origin top-left, Y down). pdf-lib writes in PDF coordinates (origin bottom-left, Y up). Getting this wrong means annotations land in the wrong place.

**The conversion relies on `viewport.convertToPdfPoint()`**, which handles scale, rotation, and the Y-flip internally. Never compute the flip manually when this method is available:

```typescript
function canvasClickToPdfCoords(event: MouseEvent, canvas: HTMLCanvasElement, viewport: any) {
  const rect = canvas.getBoundingClientRect();
  let canvasX = (event.clientX - rect.left) * (window.devicePixelRatio || 1);
  let canvasY = (event.clientY - rect.top) * (window.devicePixelRatio || 1);
  return viewport.convertToPdfPoint(canvasX, canvasY); // returns [pdfX, pdfY]
}
```

Three pitfalls will silently break this. First, **always subtract the canvas bounding rect** before converting—raw `clientX/Y` values cause drift that worsens at different scroll positions. Second, **account for `devicePixelRatio`** on HiDPI screens where the canvas pixel dimensions differ from CSS dimensions. Third, and most insidious: **CropBox vs. MediaBox mismatch**. pdf-lib's `page.getSize()` returns MediaBox dimensions, but PDF.js uses CropBox for its viewport. If these differ (common in cropped scans), coordinates will be offset. The fix:

```typescript
const mediaBox = pdfLibPage.getMediaBox();
const cropBox = pdfLibPage.getCropBox();
const adjustedX = pdfX + (cropBox.x - mediaBox.x);
const adjustedY = pdfY + (cropBox.y - mediaBox.y);
```

**Rotated pages** add another layer: pdf-lib's `page.getSize()` returns unrotated dimensions. A 90°-rotated page that appears 800×1000 on screen might return `{width: 1000, height: 800}` from `getSize()`. PDF.js's viewport handles rotation in its transform matrix, so `convertToPdfPoint` returns coordinates in the rotated PDF space—which is what pdf-lib expects for `drawText`. But you must swap width/height when computing layout.

The mapping does **not** break at different zoom levels, provided you use the current viewport (created with the current scale) and always work relative to the canvas element's position. This is confirmed by PDF.js's own test suite and the `annotpdf` npm package, which implements this conversion in production.

---

## Next.js App Router integration: the minefield

Every PDF and canvas library except pdf-lib requires browser APIs that don't exist during SSR. The universal pattern is: **`'use client'` directive + `next/dynamic` with `ssr: false`**.

### pdfjs-dist worker setup

The worker file is the #1 source of Next.js integration pain. Three approaches, ranked by reliability:

**Copy to `/public` (most reliable):** Add a build script `cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/` and set `pdfJS.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.min.mjs'`. This survives all bundler configurations.

**CDN URL (simplest):** Set `workerSrc` to `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`. Adds an external dependency but avoids all bundler issues.

**`import.meta.url` resolution:** Works with Webpack but can fail with Turbopack. Not recommended for production if you plan to migrate bundlers.

**Critical:** The `workerSrc` must be set in the **same module** where pdfjs-dist components render. Setting it in a separate config file causes module execution order issues where the default value overwrites your setting.

### The `Promise.withResolvers` error

pdfjs-dist v4+ uses `Promise.withResolvers()`, unavailable in Node.js < 22. During Next.js build, the SSR pre-render pass evaluates client modules and hits this. Solutions: upgrade to **Node.js 22+** (preferred), use the `pdfjs-dist/legacy` build, polyfill with `core-js/full/promise/with-resolvers`, or ensure SSR is fully skipped via dynamic import.

### Canvas libraries require webpack externals

Both Konva and fabric.js bundle Node.js canvas bindings that webpack tries to parse, causing `Module not found: Can't resolve 'canvas'`. The fix for Webpack:

```javascript
// next.config.js
webpack: (config) => {
  config.externals = [...config.externals, { canvas: 'canvas' }];
  return config;
}
```

For **Turbopack** (default in Next.js 16, stable in 15 for dev), webpack config doesn't apply. Instead:

```javascript
turbopack: { resolveAlias: { canvas: './empty-module.js' } }
```

Where `empty-module.js` exports `module.exports = {}`. This is a breaking difference that will bite you during the Turbopack migration.

### Component architecture

Push `'use client'` boundaries down. Keep the page layout as a Server Component; wrap only interactive components:

```
app/page.tsx          → Server Component (layout, metadata)
  └─ PdfWorkspace     → 'use client' (interactive shell)
      ├─ PdfViewer    → dynamic import, ssr: false
      ├─ AnnotationLayer → dynamic import, ssr: false  
      └─ Toolbar      → 'use client' (UI controls)
api/save-pdf/route.ts → Server (pdf-lib operations)
```

pdf-lib is the **only PDF library safe in Server Components** and Route Handlers—use it server-side for heavy save/merge operations.

---

## Recommended architecture for each feature

**Viewing:** pdfjs-dist directly (not react-pdf). You need canvas lifecycle control, direct text layer access, and annotation layer hooks that react-pdf abstracts away. Use `page.render()` with manual canvas management.

**Annotations and highlights:** react-konva, with one `<Stage>` per page overlaying the PDF canvas. Use `<Layer>` separation: one for highlights (below text), one for shapes/drawings, one for text boxes. Serialize annotation state as JSON in Zustand. Export via `stage.toDataURL()` for rasterized embedding or convert shapes to pdf-lib draw calls for vector output.

**Form filling:** pdfjs-dist renders AcroForm fields as interactive HTML inputs when using `AnnotationMode.ENABLE_STORAGE`. Read values from `pdfDocument.annotationStorage`. Write them back with pdf-lib's `pdfDoc.getForm().getTextField('name').setText('value')`. The `lengerrong/react-pdf-editor` GitHub project demonstrates this exact pipeline.

**Page management:** pdf-lib handles all operations—`addPage()`, `removePage(index)`, `copyPages(sourceDoc, indices)` for merge, and create-new-document-in-desired-order for reordering (no direct `movePage` API exists).

**Text "editing":** Overlay approach only. Offer a text-box tool that places draggable, resizable boxes with font/size/color controls. For "correction" workflows, provide a white-out tool (draw opaque rectangle) paired with text placement. Flatten both into the PDF on export via pdf-lib's `drawRectangle` and `drawText`.

**Export:** Load original bytes into pdf-lib, iterate pages, burn annotations (highlights as semi-transparent rectangles, text as `drawText`, freehand as `drawSvgPath` or rasterized PNG via `embedPng`), fill form fields, call `pdfDoc.save()`, trigger download via Blob URL.

---

## State management: Zustand with temporal undo/redo

**Zustand** (~45K GitHub stars) is the right choice over Redux Toolkit or Jotai for this use case. A PDF editor needs centralized document state (not atom-based), minimal boilerplate (not Redux), and seamless Next.js App Router compatibility (no providers needed). Pair it with **zundo** (~700 bytes), a temporal middleware that adds snapshot-based undo/redo.

The core state shape stores document metadata, per-page annotation arrays, form field values, and a page-order array for reordering support. Annotations are plain JSON objects with type discriminators, PDF-space coordinates, and type-specific properties (points array for freehand, text content for text boxes, color/opacity for highlights). All coordinates are stored in **PDF coordinate space** (bottom-left origin, points), converted to/from screen space only at render time.

zundo's `partialize` option is critical: track only annotation and form state in the undo history, excluding UI state like zoom level and current page. Set a `limit` of 50 snapshots to bound memory. For drag operations that produce many intermediate states, use zundo's `pause()` and `resume()` to record only the final position—inspired by tldraw's "marks" system that groups commands between undo boundaries.

Dirty state tracking is straightforward: set `isDirty: true` on any annotation/form mutation, reset on save, and wire a `beforeunload` listener that calls `e.preventDefault()` when dirty.

---

## Performance: virtualization and memory for 100+ page documents

**Page virtualization uses IntersectionObserver, not react-window.** React-window works poorly with variable-height PDF pages and scroll position accuracy. The pattern: create placeholder divs for every page with pre-computed dimensions (from `page.getViewport({ scale })`), observe each with IntersectionObserver using a `rootMargin` of `'200px'` for preloading, and only render the canvas + annotation layer when visible. When a page scrolls out of the buffer zone, cancel pending renders with `renderTask.cancel()`, call `page.cleanup()` to release operator list data, and remove the canvas element while keeping the placeholder for scroll stability.

**Memory math is sobering.** A US Letter page at 1× scale needs ~1.9 MB of RGBA pixel data per canvas. With a PDF canvas plus an annotation canvas per page, a 100-page document rendered naively would consume **~380 MB**. Virtualizing to 3–5 visible pages (plus 1–2 buffer) drops this to **~19–38 MB**. Additional strategies: use `pixelRatio: 1` on annotation canvases except during export, keep render scale below 2.0 on mobile, and use CSS `transform: scale()` for visual zoom instead of re-rendering at higher resolution.

**Web Workers**: pdfjs-dist already uses a worker for parsing, which is the biggest performance win. For save operations, run pdf-lib in a dedicated worker—`pdfDoc.save()` can block the main thread for seconds on large documents. Thumbnail generation (at scale 0.15–0.25, JPEG quality 0.5) should also happen off-thread or lazily via IntersectionObserver on the sidebar.

---

## The export pipeline in detail

Flattening annotations requires converting each annotation type to pdf-lib draw calls. **Highlights** become semi-transparent rectangles (`page.drawRectangle` with `opacity: 0.3`). **Text boxes** become `page.drawText` calls with embedded fonts—standard fonts cover Latin characters; anything beyond requires `@pdf-lib/fontkit` with a bundled .ttf file. **Freehand drawings** can either be rasterized (export Konva layer to PNG via `stage.toDataURL({ pixelRatio: 2 })`, then `pdfDoc.embedPng()` and `page.drawImage()`) or vectorized by converting point arrays to SVG path strings and using `page.drawSvgPath()`. The vector approach produces smaller, scalable output; the raster approach is simpler and handles any drawing complexity.

**Font embedding workflow**: register fontkit on the PDFDocument, fetch the .ttf file as ArrayBuffer, call `pdfDoc.embedFont(fontBytes)`. Fontkit automatically subsets to only used glyphs. For a production app, bundle 2–3 open-source fonts (Open Sans, Noto Sans for Unicode coverage, a monospace option) and let users select from these. Attempting to match the original PDF's fonts is a losing battle without font extraction capabilities.

Process annotations in z-order (creation timestamp), apply the CropBox/MediaBox offset correction, and remember the Y-axis flip when converting stored PDF coordinates to pdf-lib's `drawText` positions. After all annotations are burned in and form fields filled, `pdfDoc.save()` returns a `Uint8Array`. Create a `Blob`, generate an object URL, trigger download via a programmatic anchor click, and immediately revoke the URL to prevent memory leaks. For server-side persistence, POST the bytes as FormData to a Route Handler that writes to your storage backend.

---

## Conclusion

The free stack of **pdfjs-dist + pdf-lib + react-konva + Zustand** covers viewing, annotation, form filling, page management, and export—a genuinely capable PDF editor. The hard boundary is text editing: no free JavaScript library can parse, modify, and rewrite PDF content streams. The honest path is building an excellent overlay-based editor that adds text boxes, highlights, drawings, and sticky notes on top of rendered pages, then flattens everything into the PDF on save. This is exactly what free web tools like Smallpdf and PDF.js's own editor do.

The major production risks are pdf-lib's unmaintained status (mitigated by the @cantoo/pdf-lib fork), the fragile pdfjs-dist worker setup in Next.js (mitigated by copying to `/public`), and the Webpack-to-Turbopack migration breaking canvas library externals (mitigated by the `resolveAlias` pattern). The coordinate system mapping between PDF.js and pdf-lib is solvable but requires handling HiDPI scaling, CropBox offsets, and page rotation—the `viewport.convertToPdfPoint()` method handles the heavy lifting if you feed it correct inputs. Build with these constraints understood upfront, and you'll avoid the trap of promising users "edit like Word" and delivering something that visibly isn't.