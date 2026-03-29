export type ToolType =
  | "select"
  | "text"
  | "highlight"
  | "freehand"
  | "rectangle"
  | "circle"
  | "arrow"
  | "line"
  | "sticky-note"
  | "signature"
  | "stamp"
  | "whiteout"
  | "image";

export interface BaseAnnotation {
  id: string;
  type: ToolType;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  createdAt: number;
  renderScale?: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: "highlight";
  color: string;
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: "freehand";
  points: number[];
  strokeColor: string;
  strokeWidth: number;
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: "rectangle";
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface CircleAnnotation extends BaseAnnotation {
  type: "circle";
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: "arrow";
  points: number[];
  strokeColor: string;
  strokeWidth: number;
}

export interface LineAnnotation extends BaseAnnotation {
  type: "line";
  points: number[];
  strokeColor: string;
  strokeWidth: number;
}

export interface StickyNoteAnnotation extends BaseAnnotation {
  type: "sticky-note";
  text: string;
  color: string;
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: "signature";
  dataUrl: string;
}

export interface StampAnnotation extends BaseAnnotation {
  type: "stamp";
  stampType:
    | "approved"
    | "rejected"
    | "draft"
    | "confidential"
    | "final"
    | "custom";
  text: string;
  color: string;
}

export interface WhiteoutAnnotation extends BaseAnnotation {
  type: "whiteout";
}

export interface ImageAnnotation extends BaseAnnotation {
  type: "image";
  dataUrl: string;
}

export type Annotation =
  | TextAnnotation
  | HighlightAnnotation
  | FreehandAnnotation
  | RectangleAnnotation
  | CircleAnnotation
  | ArrowAnnotation
  | LineAnnotation
  | StickyNoteAnnotation
  | SignatureAnnotation
  | StampAnnotation
  | WhiteoutAnnotation
  | ImageAnnotation;

export interface PageInfo {
  width: number;
  height: number;
  rotation: number;
}

export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  position:
    | "center"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
}
