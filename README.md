# PDF Viewer

An interactive PDF editor built with Next.js, React, TypeScript, pdf.js, pdf-lib, Konva, and Zustand.

## What it does

- Open and preview PDFs.
- Add text, highlights, shapes, freehand marks, sticky notes, stamps, signatures, images, and watermarks.
- Export, print, and share edited PDFs.

## Requirements

- Node.js 20 or newer.
- npm 10 or newer.
- A browser with PDF and Web Share support for the share action.

## Install

```bash
npm install
```

The `postinstall` script copies the pdf.js worker into `public/` so local development and production builds can load the worker correctly.

## Run

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

If port `3000` is already in use, stop the existing process or run Next on another port:

```bash
npx next dev --port 3001
```

## Validate

Run linting:

```bash
npm run lint
```

Build production output:

```bash
npm run build
```

Run the production server after a build:

```bash
npm run start
```

## Improve the app safely

- Keep edits small and verify them with `npm run lint` and `npm run build`.
- Check export, print, and share flows after touching annotation logic.
- When changing pdf.js behavior, confirm the worker still loads from `public/pdf.worker.min.mjs`.
- If you modify annotation placement, verify the result at multiple zoom levels before exporting.
- Prefer the existing store and export flow over introducing parallel state.

## Troubleshooting

- Blank or empty exports usually mean the edit serialization or annotation flattening flow regressed.
- Missing page text in search usually means the text layer or the hidden search index is out of sync.
- If the viewer fails to load a PDF worker, rerun `npm install` to refresh the worker copy step.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [pdf.js](https://mozilla.github.io/pdf.js/)
- [pdf-lib](https://pdf-lib.js.org/)
