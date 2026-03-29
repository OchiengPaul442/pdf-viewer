<!-- BEGIN:nextjs-agent-rules -->

# PDF Viewer Agent Instructions

This repository uses Next.js 16, React 19, TypeScript, pdf.js, pdf-lib, Konva, Zustand, and zundo.

Read the relevant guide in `node_modules/next/dist/docs/` before changing framework behavior. This Next.js version has breaking changes and may differ from training data.

## Working rules

- Use `apply_patch` for file edits.
- Preserve user changes and do not revert unrelated edits.
- Prefer the smallest fix that resolves the root cause.
- Do not use destructive git commands.
- Validate meaningful changes with `npm run lint` and `npm run build`.
- Treat PDF export, print, and share as one flow; changes to one usually affect the others.

## Project-specific flow

- The pdf.js worker must remain available at `public/pdf.worker.min.mjs`.
- Annotation placement is sensitive to zoom and page reordering.
- If editing annotation logic, verify create, drag, transform, export, print, and share paths.
- If editing search logic, verify the browser native find behavior and the hidden text index.
- Keep the state store consistent with the export pipeline rather than duplicating state locally.

## Files to inspect first

- `src/components/PdfWorkspace.tsx`
- `src/components/annotations/AnnotationLayer.tsx`
- `src/lib/export-pdf.ts`
- `src/store/pdf-store.ts`
- `src/components/pdf/PdfRenderer.tsx`

## Validation checklist

- `npm run lint`
- `npm run build`
- Manual check of upload, edit, export, print, and share
- Manual check of sticky note editing, zoom changes, and page reordering
- Manual check of browser search behavior
<!-- END:nextjs-agent-rules -->
