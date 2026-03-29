"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { X, Pencil, Type, Upload } from "lucide-react";

type SignatureMode = "draw" | "type" | "upload";

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export default function SignatureModal({
  open,
  onClose,
  onSave,
}: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<SignatureMode>("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [signatureFont, setSignatureFont] = useState("cursive");

  // Clear draw canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    if (open && mode === "draw") {
      setTimeout(clearCanvas, 50);
    }
  }, [open, mode, clearCanvas]);

  const handleDrawStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      setIsDrawing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    },
    [],
  );

  const handleDrawMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing],
  );

  const handleDrawEnd = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleSave = useCallback(() => {
    if (mode === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
    } else if (mode === "type") {
      // Render typed text to canvas
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.font = `36px ${signatureFont}`;
      ctx.fillStyle = "#000";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, 20, 50);
      onSave(canvas.toDataURL("image/png"));
    }
    onClose();
  }, [mode, typedName, signatureFont, onSave, onClose]);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        onSave(dataUrl);
        onClose();
      };
      reader.readAsDataURL(file);
    },
    [onSave, onClose],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[480px] max-w-[95vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Add Signature
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            {
              mode: "draw" as const,
              icon: <Pencil size={16} />,
              label: "Draw",
            },
            { mode: "type" as const, icon: <Type size={16} />, label: "Type" },
            {
              mode: "upload" as const,
              icon: <Upload size={16} />,
              label: "Upload",
            },
          ].map((tab) => (
            <button
              key={tab.mode}
              onClick={() => setMode(tab.mode)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                mode === tab.mode
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {mode === "draw" && (
            <div>
              <canvas
                ref={canvasRef}
                width={430}
                height={150}
                className="border border-gray-300 dark:border-gray-600 rounded-lg w-full cursor-crosshair bg-white"
                onMouseDown={handleDrawStart}
                onMouseMove={handleDrawMove}
                onMouseUp={handleDrawEnd}
                onMouseLeave={handleDrawEnd}
                onTouchStart={handleDrawStart}
                onTouchMove={handleDrawMove}
                onTouchEnd={handleDrawEnd}
              />
              <button
                onClick={clearCanvas}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Clear
              </button>
            </div>
          )}

          {mode === "type" && (
            <div className="space-y-3">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your signature"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              />
              <div className="flex gap-2">
                {[
                  "cursive",
                  "serif",
                  "Georgia, serif",
                  "'Brush Script MT', cursive",
                ].map((font) => (
                  <button
                    key={font}
                    onClick={() => setSignatureFont(font)}
                    className={`px-3 py-2 border rounded-lg text-lg ${
                      signatureFont === font
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    style={{ fontFamily: font }}
                  >
                    {typedName || "Preview"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "upload" && (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 cursor-pointer hover:border-blue-500">
              <Upload size={32} className="text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">
                Upload signature image (PNG, JPG)
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          )}
        </div>

        {/* Footer */}
        {mode !== "upload" && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Apply Signature
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
