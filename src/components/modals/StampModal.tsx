"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface StampModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (stampType: string, text: string, color: string) => void;
}

const PRESET_STAMPS = [
  { type: "approved", text: "APPROVED", color: "#22c55e" },
  { type: "rejected", text: "REJECTED", color: "#ef4444" },
  { type: "draft", text: "DRAFT", color: "#f59e0b" },
  { type: "confidential", text: "CONFIDENTIAL", color: "#8b5cf6" },
  { type: "final", text: "FINAL", color: "#3b82f6" },
  { type: "reviewed", text: "REVIEWED", color: "#06b6d4" },
  { type: "void", text: "VOID", color: "#dc2626" },
  { type: "copy", text: "COPY", color: "#6b7280" },
];

export default function StampModal({
  open,
  onClose,
  onSelect,
}: StampModalProps) {
  const [customText, setCustomText] = useState("");
  const [customColor, setCustomColor] = useState("#3b82f6");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[440px] max-w-[95vw]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Select Stamp
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preset stamps */}
          <div className="grid grid-cols-2 gap-3">
            {PRESET_STAMPS.map((stamp) => (
              <button
                key={stamp.type}
                onClick={() => {
                  onSelect(stamp.type, stamp.text, stamp.color);
                  onClose();
                }}
                className="flex items-center justify-center py-3 px-4 border-2 rounded-lg font-bold text-sm tracking-wider transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                style={{ borderColor: stamp.color, color: stamp.color }}
              >
                {stamp.text}
              </button>
            ))}
          </div>

          {/* Custom stamp */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              Custom Stamp
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value.toUpperCase())}
                placeholder="Custom text"
                maxLength={20}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
              />
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <button
                onClick={() => {
                  if (customText.trim()) {
                    onSelect("custom", customText.trim(), customColor);
                    onClose();
                  }
                }}
                disabled={!customText.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
