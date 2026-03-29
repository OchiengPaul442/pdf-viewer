"use client";

import { usePdfStore } from "@/store/pdf-store";

export default function ToolProperties() {
  const {
    activeTool,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    fontColor,
    setFontColor,
    annotationOpacity,
    setAnnotationOpacity,
  } = usePdfStore();

  if (activeTool === "select") return null;

  const showStroke = [
    "freehand",
    "rectangle",
    "circle",
    "arrow",
    "line",
  ].includes(activeTool);
  const showFill = ["rectangle", "circle"].includes(activeTool);
  const showText = ["text", "sticky-note"].includes(activeTool);
  const showHighlightColor = activeTool === "highlight";
  const showStampColor = activeTool === "stamp";

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-4 text-sm flex-wrap">
      {showText && (
        <>
          <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            Font
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs"
            >
              <option value="Helvetica">Helvetica</option>
              <option value="Times-Roman">Times Roman</option>
              <option value="Courier">Courier</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            Size
            <input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              min={8}
              max={96}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-16 text-xs"
            />
          </label>
          <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            Color
            <input
              type="color"
              value={fontColor}
              onChange={(e) => setFontColor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0"
            />
          </label>
        </>
      )}

      {showStroke && (
        <>
          <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            Stroke
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0"
            />
          </label>
          <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            Width
            <input
              type="range"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              min={1}
              max={20}
              className="w-20"
            />
            <span className="w-6 text-center">{strokeWidth}</span>
          </label>
        </>
      )}

      {showFill && (
        <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
          Fill
          <input
            type="color"
            value={fillColor === "transparent" ? "#ffffff" : fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border-0"
          />
          <button
            onClick={() => setFillColor("transparent")}
            className={`px-2 py-0.5 rounded text-xs ${fillColor === "transparent" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"}`}
          >
            None
          </button>
        </label>
      )}

      {showHighlightColor && (
        <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
          Color
          <div className="flex gap-1">
            {["#ffff00", "#00ff00", "#00cfff", "#ff69b4", "#ffa500"].map(
              (c) => (
                <button
                  key={c}
                  onClick={() => setFillColor(c)}
                  className={`w-6 h-6 rounded-full border-2 ${fillColor === c ? "border-gray-800 dark:border-white" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ),
            )}
          </div>
        </label>
      )}

      {showStampColor && (
        <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
          Color
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border-0"
          />
        </label>
      )}

      <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
        Opacity
        <input
          type="range"
          value={annotationOpacity}
          onChange={(e) => setAnnotationOpacity(Number(e.target.value))}
          min={0.1}
          max={1}
          step={0.1}
          className="w-20"
        />
        <span className="w-8 text-center">
          {Math.round(annotationOpacity * 100)}%
        </span>
      </label>
    </div>
  );
}
