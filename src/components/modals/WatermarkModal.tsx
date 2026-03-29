"use client";

import { usePdfStore } from "@/store/pdf-store";
import { X } from "lucide-react";

interface WatermarkModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WatermarkModal({ open, onClose }: WatermarkModalProps) {
  const { watermark, setWatermark } = usePdfStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[420px] max-w-[95vw]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Watermark Settings
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={watermark.enabled}
              onChange={(e) => setWatermark({ enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              Enable Watermark
            </span>
          </label>

          <label className="block">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Text
            </span>
            <input
              type="text"
              value={watermark.text}
              onChange={(e) => setWatermark({ text: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Font Size
              </span>
              <input
                type="number"
                value={watermark.fontSize}
                onChange={(e) =>
                  setWatermark({ fontSize: Number(e.target.value) })
                }
                min={12}
                max={120}
                className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Color
              </span>
              <input
                type="color"
                value={watermark.color}
                onChange={(e) => setWatermark({ color: e.target.value })}
                className="mt-1 w-full h-10 rounded cursor-pointer border-0"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Opacity
              </span>
              <input
                type="range"
                value={watermark.opacity}
                onChange={(e) =>
                  setWatermark({ opacity: Number(e.target.value) })
                }
                min={0.05}
                max={0.8}
                step={0.05}
                className="mt-2 w-full"
              />
              <span className="text-xs text-gray-500">
                {Math.round(watermark.opacity * 100)}%
              </span>
            </label>
            <label className="block">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Rotation
              </span>
              <input
                type="range"
                value={watermark.rotation}
                onChange={(e) =>
                  setWatermark({ rotation: Number(e.target.value) })
                }
                min={-90}
                max={90}
                className="mt-2 w-full"
              />
              <span className="text-xs text-gray-500">
                {watermark.rotation}°
              </span>
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Position
            </span>
            <select
              value={watermark.position}
              onChange={(e) =>
                setWatermark({
                  position: e.target.value as
                    | "center"
                    | "top-left"
                    | "top-right"
                    | "bottom-left"
                    | "bottom-right",
                })
              }
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
            >
              <option value="center">Center</option>
              <option value="top-left">Top Left</option>
              <option value="top-right">Top Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-right">Bottom Right</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
