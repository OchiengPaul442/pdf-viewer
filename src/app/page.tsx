"use client";

import dynamic from "next/dynamic";
import Loader from "@/components/ui/Loader";

const PdfWorkspace = dynamic(() => import("@/components/PdfWorkspace"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950">
      <Loader size={52} label="Loading PaperPilot" color="#7dd3fc" />
    </div>
  ),
});

export default function Home() {
  return <PdfWorkspace />;
}
