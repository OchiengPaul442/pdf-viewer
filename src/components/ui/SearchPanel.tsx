"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { usePdfStore } from "@/store/pdf-store";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface SearchResult {
  pageIndex: number;
  text: string;
  matchIndex: number;
}

interface SearchPanelProps {
  pdfDoc: PDFDocumentProxy | null;
}

export default function SearchPanel({ pdfDoc }: SearchPanelProps) {
  const {
    searchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    setCurrentPage,
    numPages,
  } = usePdfStore();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentResultIdx, setCurrentResultIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const doSearch = useCallback(
    async (query: string) => {
      if (!pdfDoc || !query.trim()) {
        setResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      const found: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      for (let i = 0; i < numPages; i++) {
        try {
          const page = await pdfDoc.getPage(i + 1);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");

          let startIdx = 0;
          let matchIdx = 0;
          const lowerPageText = pageText.toLowerCase();
          while (true) {
            const idx = lowerPageText.indexOf(lowerQuery, startIdx);
            if (idx === -1) break;
            const contextStart = Math.max(0, idx - 30);
            const contextEnd = Math.min(
              pageText.length,
              idx + query.length + 30,
            );
            found.push({
              pageIndex: i,
              text: "..." + pageText.slice(contextStart, contextEnd) + "...",
              matchIndex: matchIdx++,
            });
            startIdx = idx + 1;
          }
          page.cleanup();
        } catch {
          // Skip pages that fail
        }
      }

      setResults(found);
      setCurrentResultIdx(0);
      setSearching(false);
    },
    [pdfDoc, numPages],
  );

  useEffect(() => {
    if (!searchOpen) return;

    const handle = window.setTimeout(() => {
      void doSearch(searchQuery);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [doSearch, searchOpen, searchQuery]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      doSearch(searchQuery);
    },
    [searchQuery, doSearch],
  );

  const goToResult = useCallback(
    (idx: number) => {
      if (results[idx]) {
        setCurrentResultIdx(idx);
        setCurrentPage(results[idx].pageIndex);
        const fn = (window as unknown as Record<string, unknown>)
          .__pdfScrollToPage;
        if (typeof fn === "function") {
          (fn as (p: number) => void)(results[idx].pageIndex);
        }
      }
    },
    [results, setCurrentPage],
  );

  if (!searchOpen) return null;

  return (
    <div className="absolute top-0 right-0 z-40 w-80 bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 flex flex-col max-h-[60vh]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in PDF..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
          />
        </form>
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToResult(Math.max(0, currentResultIdx - 1))}
            disabled={results.length === 0}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() =>
              goToResult(Math.min(results.length - 1, currentResultIdx + 1))
            }
            disabled={results.length === 0}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
          >
            <ChevronDown size={16} />
          </button>
        </div>
        <span className="text-xs text-gray-500 min-w-[4rem] text-center">
          {results.length > 0
            ? `${currentResultIdx + 1}/${results.length}`
            : searching
              ? "Searching..."
              : "0 results"}
        </span>
        <button
          onClick={() => {
            setSearchOpen(false);
            setSearchQuery("");
            setResults([]);
          }}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X size={16} />
        </button>
      </div>

      {/* Results list */}
      {results.length > 0 && (
        <div className="overflow-y-auto flex-1">
          {results.map((r, idx) => (
            <button
              key={`${r.pageIndex}-${r.matchIndex}`}
              onClick={() => goToResult(idx)}
              className={`w-full text-left px-3 py-2 text-xs border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                idx === currentResultIdx ? "bg-blue-50 dark:bg-blue-900/30" : ""
              }`}
            >
              <span className="font-medium text-blue-600">
                Page {r.pageIndex + 1}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                {r.text}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
