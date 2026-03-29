import { create } from "zustand";
import { temporal } from "zundo";
import type {
  Annotation,
  ToolType,
  PageInfo,
  WatermarkSettings,
} from "@/types/annotations";

interface AnnotationState {
  annotations: Record<number, Annotation[]>;
  formFields: Record<string, string>;
}

interface PdfState extends AnnotationState {
  // Document
  pdfData: Uint8Array | null;
  fileName: string;
  numPages: number;
  pageInfos: PageInfo[];
  pageOrder: number[];

  // UI
  currentPage: number;
  scale: number;
  activeTool: ToolType;
  selectedAnnotationId: string | null;
  isDirty: boolean;
  sidebarOpen: boolean;
  searchOpen: boolean;
  searchQuery: string;

  // Tool settings
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  annotationOpacity: number;

  // Watermark
  watermark: WatermarkSettings;

  // Document actions
  setPdfData: (data: Uint8Array | null, fileName?: string) => void;
  setNumPages: (n: number) => void;
  setPageInfos: (infos: PageInfo[]) => void;
  setPageOrder: (order: number[]) => void;

  // Navigation
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;

  // Tool actions
  setActiveTool: (tool: ToolType) => void;
  setSelectedAnnotation: (id: string | null) => void;

  // Tool settings actions
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setFontColor: (color: string) => void;
  setAnnotationOpacity: (opacity: number) => void;

  // Annotation CRUD
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (
    id: string,
    pageIndex: number,
    updates: Partial<Annotation>,
  ) => void;
  deleteAnnotation: (id: string, pageIndex: number) => void;
  clearAnnotations: (pageIndex?: number) => void;

  // Form fields
  setFormField: (name: string, value: string) => void;

  // Page management
  addPage: (afterIndex: number) => void;
  removePage: (index: number) => void;
  movePage: (fromIndex: number, toIndex: number) => void;
  rotatePage: (index: number, degrees: number) => void;

  // Watermark
  setWatermark: (settings: Partial<WatermarkSettings>) => void;

  // UI toggles
  setSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Dirty state
  markClean: () => void;

  // Reset
  reset: () => void;
}

const initialAnnotationState: AnnotationState = {
  annotations: {},
  formFields: {},
};

const initialState = {
  ...initialAnnotationState,
  pdfData: null,
  fileName: "",
  numPages: 0,
  pageInfos: [],
  pageOrder: [],
  currentPage: 0,
  scale: 1.0,
  activeTool: "select" as ToolType,
  selectedAnnotationId: null,
  isDirty: false,
  sidebarOpen: false,
  searchOpen: false,
  searchQuery: "",
  strokeColor: "#ff0000",
  fillColor: "transparent",
  strokeWidth: 2,
  fontSize: 16,
  fontFamily: "Helvetica",
  fontColor: "#000000",
  annotationOpacity: 1,
  watermark: {
    enabled: false,
    text: "WATERMARK",
    fontSize: 48,
    color: "#cccccc",
    opacity: 0.3,
    rotation: -45,
    position: "center" as const,
  },
};

export const usePdfStore = create<PdfState>()(
  temporal(
    (set) => ({
      ...initialState,

      // Document
      setPdfData: (data, fileName = "") =>
        set({
          pdfData: data,
          fileName,
          annotations: {},
          formFields: {},
          currentPage: 0,
          selectedAnnotationId: null,
          isDirty: false,
        }),
      setNumPages: (n) =>
        set({ numPages: n, pageOrder: Array.from({ length: n }, (_, i) => i) }),
      setPageInfos: (infos) => set({ pageInfos: infos }),
      setPageOrder: (order) => set({ pageOrder: order, isDirty: true }),

      // Navigation
      setCurrentPage: (page) => set({ currentPage: page }),
      setScale: (scale) => set({ scale: Math.max(0.25, Math.min(5, scale)) }),

      // Tool
      setActiveTool: (tool) =>
        set({ activeTool: tool, selectedAnnotationId: null }),
      setSelectedAnnotation: (id) => set({ selectedAnnotationId: id }),

      // Tool settings
      setStrokeColor: (color) => set({ strokeColor: color }),
      setFillColor: (color) => set({ fillColor: color }),
      setStrokeWidth: (width) => set({ strokeWidth: width }),
      setFontSize: (size) => set({ fontSize: size }),
      setFontFamily: (family) => set({ fontFamily: family }),
      setFontColor: (color) => set({ fontColor: color }),
      setAnnotationOpacity: (opacity) => set({ annotationOpacity: opacity }),

      // Annotations
      addAnnotation: (annotation) =>
        set((state) => {
          const pageAnns = state.annotations[annotation.pageIndex] || [];
          return {
            annotations: {
              ...state.annotations,
              [annotation.pageIndex]: [...pageAnns, annotation],
            },
            isDirty: true,
          };
        }),

      updateAnnotation: (id, pageIndex, updates) =>
        set((state) => {
          const pageAnns = state.annotations[pageIndex] || [];
          return {
            annotations: {
              ...state.annotations,
              [pageIndex]: pageAnns.map((a) =>
                a.id === id ? ({ ...a, ...updates } as Annotation) : a,
              ),
            },
            isDirty: true,
          };
        }),

      deleteAnnotation: (id, pageIndex) =>
        set((state) => {
          const pageAnns = state.annotations[pageIndex] || [];
          return {
            annotations: {
              ...state.annotations,
              [pageIndex]: pageAnns.filter((a) => a.id !== id),
            },
            isDirty: true,
            selectedAnnotationId:
              state.selectedAnnotationId === id
                ? null
                : state.selectedAnnotationId,
          };
        }),

      clearAnnotations: (pageIndex) =>
        set((state) => {
          if (pageIndex !== undefined) {
            return {
              annotations: { ...state.annotations, [pageIndex]: [] },
              isDirty: true,
            };
          }
          return { annotations: {}, isDirty: true };
        }),

      // Form fields
      setFormField: (name, value) =>
        set((state) => ({
          formFields: { ...state.formFields, [name]: value },
          isDirty: true,
        })),

      // Page management
      addPage: (afterIndex) =>
        set((state) => {
          const newOrder = [...state.pageOrder];
          const newPageIdx = state.numPages;
          newOrder.splice(afterIndex + 1, 0, newPageIdx);
          return {
            pageOrder: newOrder,
            numPages: state.numPages + 1,
            isDirty: true,
          };
        }),

      removePage: (index) =>
        set((state) => {
          if (state.pageOrder.length <= 1) return state;
          const newOrder = state.pageOrder.filter((_, i) => i !== index);
          const newAnnotations = { ...state.annotations };
          delete newAnnotations[state.pageOrder[index]];
          return {
            pageOrder: newOrder,
            annotations: newAnnotations,
            isDirty: true,
            currentPage: Math.min(state.currentPage, newOrder.length - 1),
          };
        }),

      movePage: (fromIndex, toIndex) =>
        set((state) => {
          const newOrder = [...state.pageOrder];
          const [moved] = newOrder.splice(fromIndex, 1);
          newOrder.splice(toIndex, 0, moved);
          return { pageOrder: newOrder, isDirty: true };
        }),

      rotatePage: (index, degrees) =>
        set((state) => {
          const newInfos = [...state.pageInfos];
          if (newInfos[index]) {
            newInfos[index] = {
              ...newInfos[index],
              rotation: (newInfos[index].rotation + degrees) % 360,
            };
          }
          return { pageInfos: newInfos, isDirty: true };
        }),

      // Watermark
      setWatermark: (settings) =>
        set((state) => ({
          watermark: { ...state.watermark, ...settings },
          isDirty: true,
        })),

      // UI
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSearchOpen: (open) => set({ searchOpen: open }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      markClean: () => set({ isDirty: false }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      partialize: (state) => ({
        annotations: state.annotations,
        formFields: state.formFields,
      }),
      limit: 50,
    },
  ),
);
