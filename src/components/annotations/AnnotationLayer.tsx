"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import {
  Stage,
  Layer,
  Rect,
  Ellipse,
  Arrow as KArrow,
  Line as KLine,
  Text as KText,
  Group,
  Transformer,
  Image as KImage,
} from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { v4 as uuidv4 } from "uuid";
import { usePdfStore } from "@/store/pdf-store";
import type {
  Annotation,
  TextAnnotation,
  HighlightAnnotation,
  FreehandAnnotation,
  RectangleAnnotation,
  CircleAnnotation,
  ArrowAnnotation,
  LineAnnotation,
  StickyNoteAnnotation,
  SignatureAnnotation,
  StampAnnotation,
  WhiteoutAnnotation,
  ImageAnnotation,
} from "@/types/annotations";
import useImage from "@/hooks/useImage";
import { Fragment } from "react";

interface AnnotationLayerProps {
  pageIndex: number;
  width: number;
  height: number;
  scale: number;
  viewport: {
    convertToPdfPoint: (x: number, y: number) => number[];
  } | null;
}

// Render a single image annotation
function ImageAnnotationShape({
  annotation,
  isSelected,
  onSelect,
  onTransformEnd,
  onDragEnd,
}: {
  annotation: ImageAnnotation;
  isSelected: boolean;
  onSelect: () => void;
  onTransformEnd: (attrs: Partial<Annotation>) => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const image = useImage(annotation.dataUrl);
  if (!image) return null;
  return (
    <KImage
      image={image}
      x={annotation.x}
      y={annotation.y}
      width={annotation.width}
      height={annotation.height}
      opacity={annotation.opacity}
      draggable={isSelected}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
      onTransformEnd={(e) => {
        const node = e.target;
        onTransformEnd({
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * node.scaleX()),
          height: Math.max(5, node.height() * node.scaleY()),
        });
        node.scaleX(1);
        node.scaleY(1);
      }}
    />
  );
}

// Render signature annotation
function SignatureShape({
  annotation,
  isSelected,
  onSelect,
  onTransformEnd,
  onDragEnd,
}: {
  annotation: SignatureAnnotation;
  isSelected: boolean;
  onSelect: () => void;
  onTransformEnd: (attrs: Partial<Annotation>) => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const image = useImage(annotation.dataUrl);
  if (!image) return null;
  return (
    <KImage
      image={image}
      x={annotation.x}
      y={annotation.y}
      width={annotation.width}
      height={annotation.height}
      opacity={annotation.opacity}
      draggable={isSelected}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
      onTransformEnd={(e) => {
        const node = e.target;
        onTransformEnd({
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * node.scaleX()),
          height: Math.max(5, node.height() * node.scaleY()),
        });
        node.scaleX(1);
        node.scaleY(1);
      }}
    />
  );
}

export default function AnnotationLayer({
  pageIndex,
  width,
  height,
}: AnnotationLayerProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const currentAnnotationRef = useRef<string | null>(null);

  const {
    annotations,
    activeTool,
    selectedAnnotationId,
    setSelectedAnnotation,
    addAnnotation,
    updateAnnotation,
    strokeColor,
    fillColor,
    strokeWidth,
    fontSize,
    fontFamily,
    fontColor,
    annotationOpacity,
  } = usePdfStore();

  const pageAnnotations = useMemo(
    () => annotations[pageIndex] || [],
    [annotations, pageIndex],
  );

  const handleSelect = useCallback(
    (id: string) => {
      if (activeTool === "select") {
        setSelectedAnnotation(selectedAnnotationId === id ? null : id);
      }
    },
    [activeTool, selectedAnnotationId, setSelectedAnnotation],
  );

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updateAnnotation(id, pageIndex, { x, y });
    },
    [pageIndex, updateAnnotation],
  );

  const handleTransformEnd = useCallback(
    (id: string, attrs: Partial<Annotation>) => {
      updateAnnotation(id, pageIndex, attrs);
    },
    [pageIndex, updateAnnotation],
  );

  const handleStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Click on empty area deselects
      if (e.target === e.target.getStage()) {
        setSelectedAnnotation(null);
      }

      if (activeTool === "select") return;

      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const id = uuidv4();
      drawStartRef.current = { x: pos.x, y: pos.y };
      currentAnnotationRef.current = id;
      setIsDrawing(true);

      const base = {
        id,
        pageIndex,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        rotation: 0,
        opacity: annotationOpacity,
        createdAt: Date.now(),
      };

      switch (activeTool) {
        case "text":
          addAnnotation({
            ...base,
            type: "text",
            text: "Double-click to edit",
            fontSize: fontSize,
            fontFamily: fontFamily,
            fontColor: fontColor,
            fontWeight: "normal",
            fontStyle: "normal",
            width: 200,
            height: fontSize + 8,
          } as TextAnnotation);
          setIsDrawing(false);
          setSelectedAnnotation(id);
          break;

        case "highlight":
          addAnnotation({
            ...base,
            type: "highlight",
            color: fillColor === "transparent" ? "#ffff00" : fillColor,
            opacity: 0.3,
            height: 20,
          } as HighlightAnnotation);
          break;

        case "freehand":
          addAnnotation({
            ...base,
            type: "freehand",
            points: [pos.x, pos.y],
            strokeColor,
            strokeWidth,
          } as FreehandAnnotation);
          break;

        case "rectangle":
          addAnnotation({
            ...base,
            type: "rectangle",
            fillColor,
            strokeColor,
            strokeWidth,
          } as RectangleAnnotation);
          break;

        case "circle":
          addAnnotation({
            ...base,
            type: "circle",
            fillColor,
            strokeColor,
            strokeWidth,
          } as CircleAnnotation);
          break;

        case "arrow":
          addAnnotation({
            ...base,
            type: "arrow",
            points: [pos.x, pos.y, pos.x, pos.y],
            strokeColor,
            strokeWidth,
          } as ArrowAnnotation);
          break;

        case "line":
          addAnnotation({
            ...base,
            type: "line",
            points: [pos.x, pos.y, pos.x, pos.y],
            strokeColor,
            strokeWidth,
          } as LineAnnotation);
          break;

        case "sticky-note":
          addAnnotation({
            ...base,
            type: "sticky-note",
            text: "Note...",
            color: "#fff740",
            width: 150,
            height: 150,
          } as StickyNoteAnnotation);
          setIsDrawing(false);
          setSelectedAnnotation(id);
          break;

        case "stamp":
          addAnnotation({
            ...base,
            type: "stamp",
            stampType: "approved",
            text: "APPROVED",
            color: strokeColor,
            width: 180,
            height: 60,
          } as StampAnnotation);
          setIsDrawing(false);
          setSelectedAnnotation(id);
          break;

        case "whiteout":
          addAnnotation({
            ...base,
            type: "whiteout",
          } as WhiteoutAnnotation);
          break;

        case "signature":
          // Signature is handled by the SignatureModal
          setIsDrawing(false);
          break;

        case "image":
          setIsDrawing(false);
          break;
      }
    },
    [
      activeTool,
      pageIndex,
      annotationOpacity,
      strokeColor,
      fillColor,
      strokeWidth,
      fontSize,
      fontFamily,
      fontColor,
      addAnnotation,
      setSelectedAnnotation,
    ],
  );

  const handleStageMouseMove = useCallback(() => {
    if (!isDrawing || !drawStartRef.current || !currentAnnotationRef.current)
      return;

    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const id = currentAnnotationRef.current;
    const start = drawStartRef.current;

    switch (activeTool) {
      case "freehand": {
        const ann = pageAnnotations.find((a) => a.id === id) as
          | FreehandAnnotation
          | undefined;
        if (ann) {
          updateAnnotation(id, pageIndex, {
            points: [...ann.points, pos.x, pos.y],
          });
        }
        break;
      }
      case "highlight":
      case "rectangle":
      case "whiteout":
        updateAnnotation(id, pageIndex, {
          x: Math.min(start.x, pos.x),
          y: Math.min(start.y, pos.y),
          width: Math.abs(pos.x - start.x),
          height: Math.abs(pos.y - start.y),
        });
        break;
      case "circle":
        updateAnnotation(id, pageIndex, {
          x: Math.min(start.x, pos.x),
          y: Math.min(start.y, pos.y),
          width: Math.abs(pos.x - start.x),
          height: Math.abs(pos.y - start.y),
        });
        break;
      case "arrow":
      case "line":
        updateAnnotation(id, pageIndex, {
          points: [start.x, start.y, pos.x, pos.y],
        });
        break;
    }
  }, [isDrawing, activeTool, pageIndex, pageAnnotations, updateAnnotation]);

  const handleStageMouseUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      drawStartRef.current = null;
      currentAnnotationRef.current = null;
    }
  }, [isDrawing]);

  // Double click to edit text annotations
  const handleTextDblClick = useCallback(
    (ann: TextAnnotation) => {
      const stage = stageRef.current;
      if (!stage) return;

      const stageContainer = stage.container();
      const textarea = document.createElement("textarea");
      textarea.value = ann.text;
      textarea.style.position = "absolute";
      textarea.style.left = `${ann.x}px`;
      textarea.style.top = `${ann.y}px`;
      textarea.style.width = `${Math.max(ann.width, 100)}px`;
      textarea.style.fontSize = `${ann.fontSize}px`;
      textarea.style.fontFamily = ann.fontFamily;
      textarea.style.color = ann.fontColor;
      textarea.style.border = "2px solid #0066ff";
      textarea.style.padding = "2px";
      textarea.style.margin = "0";
      textarea.style.overflow = "hidden";
      textarea.style.background = "white";
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.zIndex = "1000";
      textarea.style.lineHeight = "1.2";

      stageContainer.style.position = "relative";
      stageContainer.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const finishEdit = () => {
        const newText = textarea.value;
        updateAnnotation(ann.id, pageIndex, { text: newText });
        textarea.remove();
      };

      textarea.addEventListener("blur", finishEdit);
      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          finishEdit();
        }
      });
    },
    [pageIndex, updateAnnotation],
  );

  // Handle sticky note editing
  const handleStickyDblClick = useCallback(
    (ann: StickyNoteAnnotation) => {
      const stage = stageRef.current;
      if (!stage) return;

      const stageContainer = stage.container();
      const textarea = document.createElement("textarea");
      textarea.value = ann.text;
      textarea.style.position = "absolute";
      textarea.style.left = `${ann.x + 5}px`;
      textarea.style.top = `${ann.y + 25}px`;
      textarea.style.width = `${ann.width - 10}px`;
      textarea.style.height = `${ann.height - 30}px`;
      textarea.style.fontSize = "12px";
      textarea.style.border = "none";
      textarea.style.padding = "4px";
      textarea.style.background = ann.color;
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.zIndex = "1000";

      stageContainer.style.position = "relative";
      stageContainer.appendChild(textarea);
      textarea.focus();

      const finishEdit = () => {
        updateAnnotation(ann.id, pageIndex, { text: textarea.value });
        textarea.remove();
      };

      textarea.addEventListener("blur", finishEdit);
      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Escape") finishEdit();
      });
    },
    [pageIndex, updateAnnotation],
  );

  const renderAnnotation = useCallback(
    (ann: Annotation) => {
      const isSelected = selectedAnnotationId === ann.id;
      const commonDrag = isSelected && activeTool === "select";

      switch (ann.type) {
        case "text": {
          const t = ann as TextAnnotation;
          return (
            <Fragment key={t.id}>
              {isSelected && (
                <Rect
                  x={t.x - 4}
                  y={t.y - 4}
                  width={Math.max(t.width || 160, 120) + 8}
                  height={t.fontSize + 12}
                  fill="rgba(37, 99, 235, 0.06)"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dash={[6, 4]}
                  cornerRadius={4}
                  listening={false}
                />
              )}
              <KText
                key={t.id}
                id={t.id}
                x={t.x}
                y={t.y}
                text={t.text}
                fontSize={t.fontSize}
                fontFamily={t.fontFamily}
                fill={t.fontColor}
                fontStyle={
                  `${t.fontWeight === "bold" ? "bold" : ""} ${t.fontStyle === "italic" ? "italic" : ""}`.trim() ||
                  "normal"
                }
                opacity={t.opacity}
                width={t.width || undefined}
                draggable={commonDrag}
                onClick={() => handleSelect(t.id)}
                onTap={() => handleSelect(t.id)}
                onDblClick={() => handleTextDblClick(t)}
                onDblTap={() => handleTextDblClick(t)}
                onDragEnd={(e) =>
                  handleDragEnd(t.id, e.target.x(), e.target.y())
                }
                onTransformEnd={(e) => {
                  const node = e.target;
                  handleTransformEnd(t.id, {
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(20, node.width() * node.scaleX()),
                  });
                  node.scaleX(1);
                  node.scaleY(1);
                }}
              />
            </Fragment>
          );
        }

        case "highlight": {
          const h = ann as HighlightAnnotation;
          return (
            <Rect
              key={h.id}
              id={h.id}
              x={h.x}
              y={h.y}
              width={h.width}
              height={h.height}
              fill={h.color}
              opacity={h.opacity}
              draggable={commonDrag}
              onClick={() => handleSelect(h.id)}
              onTap={() => handleSelect(h.id)}
              onDragEnd={(e) => handleDragEnd(h.id, e.target.x(), e.target.y())}
            />
          );
        }

        case "freehand": {
          const f = ann as FreehandAnnotation;
          return (
            <KLine
              key={f.id}
              id={f.id}
              points={f.points}
              stroke={f.strokeColor}
              strokeWidth={f.strokeWidth}
              opacity={f.opacity}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              draggable={commonDrag}
              onClick={() => handleSelect(f.id)}
              onTap={() => handleSelect(f.id)}
              onDragEnd={(e) => handleDragEnd(f.id, e.target.x(), e.target.y())}
            />
          );
        }

        case "rectangle": {
          const r = ann as RectangleAnnotation;
          return (
            <Rect
              key={r.id}
              id={r.id}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              fill={r.fillColor === "transparent" ? undefined : r.fillColor}
              stroke={r.strokeColor}
              strokeWidth={r.strokeWidth}
              opacity={r.opacity}
              draggable={commonDrag}
              onClick={() => handleSelect(r.id)}
              onTap={() => handleSelect(r.id)}
              onDragEnd={(e) => handleDragEnd(r.id, e.target.x(), e.target.y())}
              onTransformEnd={(e) => {
                const node = e.target;
                handleTransformEnd(r.id, {
                  x: node.x(),
                  y: node.y(),
                  width: Math.max(5, node.width() * node.scaleX()),
                  height: Math.max(5, node.height() * node.scaleY()),
                });
                node.scaleX(1);
                node.scaleY(1);
              }}
            />
          );
        }

        case "circle": {
          const c = ann as CircleAnnotation;
          return (
            <Ellipse
              key={c.id}
              id={c.id}
              x={c.x}
              y={c.y}
              radiusX={Math.max(1, c.width / 2)}
              radiusY={Math.max(1, c.height / 2)}
              fill={c.fillColor === "transparent" ? undefined : c.fillColor}
              stroke={c.strokeColor}
              strokeWidth={c.strokeWidth}
              opacity={c.opacity}
              draggable={commonDrag}
              onClick={() => handleSelect(c.id)}
              onTap={() => handleSelect(c.id)}
              onDragEnd={(e) => handleDragEnd(c.id, e.target.x(), e.target.y())}
              onTransformEnd={(e) => {
                const node = e.target;
                handleTransformEnd(c.id, {
                  x: node.x(),
                  y: node.y(),
                  width: Math.max(5, node.width() * node.scaleX()),
                  height: Math.max(5, node.height() * node.scaleY()),
                });
                node.scaleX(1);
                node.scaleY(1);
              }}
            />
          );
        }

        case "arrow": {
          const a = ann as ArrowAnnotation;
          return (
            <KArrow
              key={a.id}
              id={a.id}
              points={a.points}
              stroke={a.strokeColor}
              strokeWidth={a.strokeWidth}
              opacity={a.opacity}
              fill={a.strokeColor}
              pointerLength={10}
              pointerWidth={10}
              draggable={commonDrag}
              onClick={() => handleSelect(a.id)}
              onTap={() => handleSelect(a.id)}
              onDragEnd={(e) => handleDragEnd(a.id, e.target.x(), e.target.y())}
            />
          );
        }

        case "line": {
          const l = ann as LineAnnotation;
          return (
            <KLine
              key={l.id}
              id={l.id}
              points={l.points}
              stroke={l.strokeColor}
              strokeWidth={l.strokeWidth}
              opacity={l.opacity}
              lineCap="round"
              draggable={commonDrag}
              onClick={() => handleSelect(l.id)}
              onTap={() => handleSelect(l.id)}
              onDragEnd={(e) => handleDragEnd(l.id, e.target.x(), e.target.y())}
            />
          );
        }

        case "sticky-note": {
          const s = ann as StickyNoteAnnotation;
          return (
            <Group
              key={s.id}
              id={s.id}
              x={s.x}
              y={s.y}
              draggable={commonDrag}
              onClick={() => handleSelect(s.id)}
              onTap={() => handleSelect(s.id)}
              onDblClick={() => handleStickyDblClick(s)}
              onDblTap={() => handleStickyDblClick(s)}
              onDragEnd={(e) => handleDragEnd(s.id, e.target.x(), e.target.y())}
            >
              <Rect
                x={3}
                y={3}
                width={s.width}
                height={s.height}
                fill="rgba(0,0,0,0.15)"
                cornerRadius={2}
              />
              <Rect
                width={s.width}
                height={s.height}
                fill={s.color}
                cornerRadius={2}
                stroke="#ccc"
                strokeWidth={0.5}
              />
              <Rect
                width={s.width}
                height={20}
                fill={s.color}
                cornerRadius={[2, 2, 0, 0]}
                opacity={0.8}
              />
              <KText x={5} y={3} text="📝" fontSize={12} />
              <KText
                x={5}
                y={24}
                text={s.text}
                fontSize={13}
                fill="#111827"
                width={s.width - 10}
                height={s.height - 30}
                wrap="word"
                lineHeight={1.25}
                verticalAlign="top"
              />
            </Group>
          );
        }

        case "stamp": {
          const st = ann as StampAnnotation;
          return (
            <Group
              key={st.id}
              id={st.id}
              x={st.x}
              y={st.y}
              draggable={commonDrag}
              onClick={() => handleSelect(st.id)}
              onTap={() => handleSelect(st.id)}
              onDragEnd={(e) =>
                handleDragEnd(st.id, e.target.x(), e.target.y())
              }
            >
              <Rect
                width={st.width}
                height={st.height}
                stroke={st.color}
                strokeWidth={3}
                cornerRadius={8}
                dash={[6, 3]}
              />
              <KText
                x={0}
                y={st.height / 2 - 12}
                width={st.width}
                text={st.text}
                fontSize={24}
                fontStyle="bold"
                fill={st.color}
                align="center"
                letterSpacing={2}
              />
            </Group>
          );
        }

        case "whiteout": {
          const w = ann as WhiteoutAnnotation;
          return (
            <Rect
              key={w.id}
              id={w.id}
              x={w.x}
              y={w.y}
              width={w.width}
              height={w.height}
              fill="#ffffff"
              opacity={1}
              draggable={commonDrag}
              onClick={() => handleSelect(w.id)}
              onTap={() => handleSelect(w.id)}
              onDragEnd={(e) => handleDragEnd(w.id, e.target.x(), e.target.y())}
              onTransformEnd={(e) => {
                const node = e.target;
                handleTransformEnd(w.id, {
                  x: node.x(),
                  y: node.y(),
                  width: Math.max(5, node.width() * node.scaleX()),
                  height: Math.max(5, node.height() * node.scaleY()),
                });
                node.scaleX(1);
                node.scaleY(1);
              }}
            />
          );
        }

        case "signature": {
          const sig = ann as SignatureAnnotation;
          return (
            <SignatureShape
              key={sig.id}
              annotation={sig}
              isSelected={isSelected}
              onSelect={() => handleSelect(sig.id)}
              onTransformEnd={(attrs) => handleTransformEnd(sig.id, attrs)}
              onDragEnd={(x, y) => handleDragEnd(sig.id, x, y)}
            />
          );
        }

        case "image": {
          const img = ann as ImageAnnotation;
          return (
            <ImageAnnotationShape
              key={img.id}
              annotation={img}
              isSelected={isSelected}
              onSelect={() => handleSelect(img.id)}
              onTransformEnd={(attrs) => handleTransformEnd(img.id, attrs)}
              onDragEnd={(x, y) => handleDragEnd(img.id, x, y)}
            />
          );
        }

        default:
          return null;
      }
    },
    [
      activeTool,
      selectedAnnotationId,
      handleSelect,
      handleDragEnd,
      handleTransformEnd,
      handleTextDblClick,
      handleStickyDblClick,
    ],
  );

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;

    if (
      !transformer ||
      !stage ||
      activeTool !== "select" ||
      !selectedAnnotationId
    ) {
      transformer?.nodes([]);
      transformer?.getLayer()?.batchDraw();
      return;
    }

    const node = stage.findOne(`#${selectedAnnotationId}`);
    if (node) {
      transformer.nodes([node as Konva.Node]);
      transformer.getLayer()?.batchDraw();
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [activeTool, selectedAnnotationId, pageAnnotations]);

  return (
    <div
      className="absolute top-0 left-0"
      style={{ pointerEvents: activeTool === "select" ? "auto" : "auto" }}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={
          handleStageMouseDown as unknown as (
            e: KonvaEventObject<TouchEvent>,
          ) => void
        }
        onTouchMove={
          handleStageMouseMove as unknown as (
            e: KonvaEventObject<TouchEvent>,
          ) => void
        }
        onTouchEnd={handleStageMouseUp}
        style={{ cursor: activeTool === "select" ? "default" : "crosshair" }}
      >
        {/* Highlights layer (below other annotations) */}
        <Layer>
          {pageAnnotations
            .filter((a) => a.type === "highlight")
            .map(renderAnnotation)}
        </Layer>

        {/* Whiteout layer */}
        <Layer>
          {pageAnnotations
            .filter((a) => a.type === "whiteout")
            .map(renderAnnotation)}
        </Layer>

        {/* Shapes and drawings layer */}
        <Layer>
          {pageAnnotations
            .filter(
              (a) =>
                ![
                  "highlight",
                  "whiteout",
                  "text",
                  "sticky-note",
                  "stamp",
                  "signature",
                  "image",
                ].includes(a.type),
            )
            .map(renderAnnotation)}
        </Layer>

        {/* Text and objects layer (on top) */}
        <Layer>
          {pageAnnotations
            .filter((a) =>
              ["text", "sticky-note", "stamp", "signature", "image"].includes(
                a.type,
              ),
            )
            .map(renderAnnotation)}

          {/* Transformer for selected element */}
          {selectedAnnotationId && activeTool === "select" && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
