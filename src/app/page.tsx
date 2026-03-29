"use client";

import dynamic from "next/dynamic";

const PdfWorkspace = dynamic(() => import("@/components/PdfWorkspace"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function Home() {
  return <PdfWorkspace />;
}
