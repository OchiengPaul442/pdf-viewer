"use client";

import { useCallback } from "react";
import Image from "next/image";
import { usePdfStore } from "@/store/pdf-store";
import { ArrowUpRight, FileSignature, ShieldCheck, Upload } from "lucide-react";

export default function FileUpload() {
  const { setPdfData } = usePdfStore();

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        alert("Please upload a PDF file.");
        return;
      }
      const buffer = await file.arrayBuffer();
      setPdfData(new Uint8Array(buffer), file.name);
    },
    [setPdfData],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.15),transparent_35%),linear-gradient(180deg,#0f172a_0%,#111827_40%,#020617_100%)] text-slate-100">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-6 py-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:px-10">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 shadow-lg shadow-slate-950/20 backdrop-blur">
            <Image
              src="/logos/logo.webp"
              alt="PaperPilot logo"
              width={20}
              height={20}
              className="h-5 w-5 rounded-sm object-contain"
              priority
            />
            PaperPilot
          </div>

          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              A sharper way to review, sign, and ship PDFs.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              PaperPilot keeps your entire PDF workflow in one browser
              workspace: upload, annotate, watermark, search, reorder, print,
              and export without losing momentum.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: <FileSignature size={18} />,
                title: "Sign fast",
                text: "Draw, type, or upload signatures in seconds.",
              },
              {
                icon: <ShieldCheck size={18} />,
                title: "Control output",
                text: "Stamp, redact, watermark, and export confidently.",
              },
              {
                icon: <ArrowUpRight size={18} />,
                title: "Stay moving",
                text: "Search, reorder pages, and keep work flowing.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-slate-950/20 backdrop-blur"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-400/15 text-sky-200">
                  {item.icon}
                </div>
                <h2 className="text-sm font-semibold text-white">
                  {item.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <footer className="flex flex-wrap items-center gap-4 pt-2 text-sm text-slate-400">
            <span>Modern PDF editor for long-term use.</span>
            <a
              href="/terms"
              className="text-sky-300 transition-colors hover:text-sky-200"
            >
              Terms of Use
            </a>
            <span>Built for browser-first workflows.</span>
          </footer>
        </section>

        <section className="relative">
          <div className="absolute inset-0 -z-10 rounded-4xl bg-linear-to-br from-sky-400/20 via-cyan-400/10 to-transparent blur-3xl" />
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="rounded-4xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-300">
                  Start a new session
                </p>
                <h2 className="text-2xl font-semibold text-white">
                  Drop a PDF to begin
                </h2>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                Ready
              </div>
            </div>

            <label className="flex min-h-90 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/15 bg-white/5 p-8 text-center transition-colors hover:border-sky-400/70 hover:bg-white/8">
              <Upload className="mb-5 h-14 w-14 text-sky-300" />
              <p className="text-2xl font-semibold text-white">
                Drop a PDF here or click to upload
              </p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
                Works well for contracts, reports, forms, and shared review
                packets. PDF files up to 200MB are supported.
              </p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-lg shadow-slate-950/30">
                Choose file
                <ArrowUpRight size={16} />
              </div>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleChange}
                className="hidden"
              />
            </label>
          </div>
        </section>
      </main>

      <div className="border-t border-white/10 bg-slate-950/60 px-6 py-4 text-sm text-slate-400 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>PaperPilot © 2026</span>
          <span className="text-slate-500">
            Annotate, sign, stamp, and export PDFs in one place.
          </span>
        </div>
      </div>
    </div>
  );
}
