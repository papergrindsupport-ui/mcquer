import type { RichNode } from "./rich";
import type { SymbolName } from "./rich";

export type OptionId = "A" | "B" | "C" | "D";
export const OPTION_IDS: OptionId[] = ["A", "B", "C", "D"];

export type MarkerShape = "circle" | "triangle" | "square" | "diamond" | "star" | "cross" | "wye";

export type GraphSeries =
  | {
      kind: "line";
      points: [number, number][];
      name?: string;
      color?: string;
      dashed?: boolean;
      dotted?: boolean;
      smooth?: boolean;
      showPoints?: boolean;
      showMarkers?: boolean;
      marker?: MarkerShape;
      markerSize?: number;
      lobf?: "linear" | "curve";
      strokeWidth?: number;
    }
  | {
      kind: "bar";
      /** width is a multiplier of the auto bar width (default 1). */
      bars: { x: number; y: number; label?: string; width?: number }[];
      name?: string;
      color?: string;
    }
  | {
      kind: "scatter";
      points: [number, number][];
      name?: string;
      color?: string;
      marker?: MarkerShape;
      markerSize?: number;
    }
  | {
      kind: "pie";
      slices: { name: string; value: number; color?: string }[];
      name?: string;
      donut?: boolean;
      showLabels?: boolean;
    };

export type GraphSpec = {
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xTicks?: number[];
  yTicks?: number[];
  series: GraphSeries[];
  gridlines?: boolean;
  showLegend?: boolean;
  /** When false, the interactive Tooltip cursor/highlight is disabled. */
  showHover?: boolean;
  /** Optional labeled points anywhere on the plot. Each label can carry
   *  an offset from its anchor and draw a leader arrow back to it. */
  labels?: GraphLabel[];
};

export type GraphLabel = {
  x: number;
  y: number;
  text: string;
  offsetX?: number;
  offsetY?: number;
  arrow?: boolean;
  showDot?: boolean;
  color?: string;
};

export type IntroImageSize = "sm" | "md" | "lg" | "xl";
export type CaptionPosition = "top" | "bottom";

export type MCQImageRef = {
  src: string;
  alt: string;
  invertOnDark?: boolean;
  darkSrc?: string;

  /** Optional per-image sizing when used inside option layouts. */
  size?: IntroImageSize;
  /** Optional rich caption for image options / hotspots. */
  caption?: RichNode[];
  /** Where the caption appears relative to the image. */
  captionPosition?: CaptionPosition;
  /** Extra padding (px) around the image inside its option/hotspot frame. */
  padding?: number;
};

export type KeyItem = {
  symbol?: SymbolName;
  swatch?: string;
  label: RichNode[];
};

export type ListStyle = "ordered" | "unordered" | "none";
export type FlowchartShape =
  | "rect"
  | "rounded"
  | "ellipse"
  | "circle"
  | "diamond"
  | "parallelogram"
  | "hexagon";
export type FlowchartArrowDir = "right" | "left" | "down" | "up";
/** A single cell in a flowchart grid. `null` means empty spacer cell. */
export type FlowchartCell = {
  content?: RichNode[];
  shape?: FlowchartShape;
  /** Raw CSS background color. Ignored when themeBg is set. */
  bg?: string;
  /** Use theme primary color as background. */
  themeBg?: boolean;
  /** Optional raw CSS text color. */
  color?: string;
  /** Use theme primary color for text. */
  themeColor?: boolean;
  /** Optional raw CSS border color. */
  borderColor?: string;
  /** Arrows emitted from this cell pointing outward into the gap. */
  arrows?: FlowchartArrowDir[];
} | null;
export type FlowchartSpec = {
  rows: number;
  cols: number;
  /** rows × cols grid. null = empty spacer. */
  cells: FlowchartCell[][];
  /** Per-cell box width in px. Default 140. */
  boxWidth?: number;
  /** Per-cell box height in px. Default 60. */
  boxHeight?: number;
  /** Gap between cells in px. Default 40. */
  gap?: number;
};

export type IntroData =
  | {
      kind: "image";
      image: MCQImageRef;
      caption?: RichNode[];
      size?: IntroImageSize;
      captionPosition?: CaptionPosition;
    }
  | {
      kind: "table";
      /** New unified grid model — same TableLayoutCell shape used by the
       *  MCQ option table. When present, all legacy fields below are
       *  ignored on render. */
      grid?: TableLayoutCell[][];
      header: RichNode[][];
      headerSpans?: number[];
      /** Single sub-header row (legacy). */
      subHeader?: RichNode[][];
      /** Multiple sub-header rows (new). Rendered after `subHeader`. */
      subHeaderRows?: RichNode[][][];
      rows: RichNode[][][];
      /** Single row-label column (legacy). */
      rowLabels?: RichNode[][];
      rowLabelHeader?: RichNode[];
      /** Multiple row-label columns. Each entry is a column of labels, one per row. */
      rowLabelCols?: RichNode[][][];
      /** Headers for extra row-label columns. */
      rowLabelHeaders?: RichNode[][];
      /** Per-cell background colors. */
      headerBg?: (string | undefined)[];
      subHeaderBg?: (string | undefined)[];
      subHeaderRowsBg?: (string | undefined)[][];
      rowLabelBg?: (string | undefined)[];
      cellBg?: (string | undefined)[][];
      /** Per-body-cell rowspan/colspan. */
      cellSpans?: ({ rowSpan?: number; colSpan?: number } | undefined)[][];
      /** Per-cell horizontal text alignment. */
      cellAlign?: (("left" | "center" | "right") | undefined)[][];
      /** Per-header-cell horizontal text alignment. */
      headerAlign?: (("left" | "center" | "right") | undefined)[];
      subHeaderRowsAlign?: (("left" | "center" | "right") | undefined)[][];
      /** Per-header-cell rowspan (colspan already lives on headerSpans). */
      headerRowSpans?: (number | undefined)[];
      /** Spans for each sub-header row cell. */
      subHeaderRowsSpans?: (({ rowSpan?: number; colSpan?: number } | undefined)[] | undefined)[];
      /** Visual indent per body row (drives the sub-row look). */
      rowIndent?: number[];
      keyItems?: KeyItem[];
      caption?: RichNode[];
    }
  | { kind: "graph"; spec: GraphSpec; caption?: RichNode[] }
  | { kind: "flowchart"; spec: FlowchartSpec; caption?: RichNode[] }
  | { kind: "circuit"; spec: import("./circuit").CircuitSpec; caption?: RichNode[] }
  | {
      kind: "list";
      /** Legacy boolean. Prefer `style`. */
      ordered: boolean;
      /** Tri-state list style. */
      style?: ListStyle;
      items: RichNode[][];
      /** Optional color for the marker (bullet or number). */
      markerColor?: string;
    };

export type Orientation = "vertical" | "horizontal" | "2x2";

/** Optional per-option "key" (tick = yes, cross = no, custom label…). Rendered
 *  before/after/inline with the option text on text option layouts. */
export type OptionKey = {
  symbol?: SymbolName;
  text?: string;
  color?: string;
};
export type KeyPosition = "before" | "after" | "inline-left" | "inline-right";
/** A single key or multiple keys rendered side-by-side. */
export type OptionKeyValue = OptionKey | OptionKey[];
export type OptionKeys = Partial<Record<OptionId, OptionKeyValue>>;

export type CellAlign = "left" | "center" | "right";

/** A polygon zone drawn on top of an image for the `image-zones` layout.
 *  Points are percentages of the image so the overlay scales with it. */
export type ImageZone = {
  label?: string;
  points: [number, number][]; // [xPct, yPct][]
  color?: string;
};

/** A single cell in the unified `table` option layout.
 *  `hidden` marks cells that are covered by a merged neighbour and must not be rendered. */
export type TableLayoutCell = {
  content: RichNode[];
  rowSpan?: number;
  colSpan?: number;
  bg?: string;
  align?: CellAlign;
  header?: boolean;
  hidden?: boolean;
  /** Optional image rendered inside the cell. When set, the image fills
   *  the cell (edge-to-edge to the gridlines) and scales down to fit,
   *  while the cell grows to accommodate the requested pixel size. */
  image?: {
    src: string;
    alt?: string;
    /** Requested image width in px (also caps its height). Default 120. */
    sizePx?: number;
    /** Padding in px between the image and the cell gridlines. Default 0. */
    padding?: number;
    /** Invert colours in dark mode (useful for line-art SVGs). */
    invertOnDark?: boolean;
    darkSrc?: string;
  };
};

/** Unified MCQ table layout. Replaces the old six table-* variants.
 *  `optionsAxis` picks which axis carries the A/B/C/D option circles — they
 *  are rendered exactly once per option in an extra gutter row / column,
 *  never inside the data grid. `optionAt` maps each option id to the
 *  row (or column) index it occupies. */
export type TableLayout = {
  type: "table";
  grid: TableLayoutCell[][]; // rectangular; hidden cells present as placeholders
  optionsAxis: "rows" | "cols";
  optionAt: Record<OptionId, number>;
  /** Optional per-option cell overrides — when set for an option, its
   *  circle is drawn inside that specific cell instead of the gutter
   *  row/column. Other options continue to use `optionAt`. */
  optionCells?: Partial<Record<OptionId, { r: number; c: number }>>;
  keyItems?: KeyItem[];
};

export type OptionsLayout =
  | {
      type: "text-vertical";
      options: Record<OptionId, RichNode[]>;
      shrinkToFit?: boolean;
      /** Optional question text rendered between the reference statements
       *  and the option grid. */
      questionText?: RichNode[];

      keys?: OptionKeys;
      keyPosition?: KeyPosition;
      /** A single key label rendered next to every option (small text). */
      sharedKey?: OptionKeyValue;
      sharedKeyPosition?: "before" | "after";
    }
  | {
      type: "text-horizontal";
      options: Record<OptionId, RichNode[]>;
      shrinkToFit?: boolean;
      /** Optional question text rendered between the reference statements
       *  and the option grid. */
      questionText?: RichNode[];

      keys?: OptionKeys;
      keyPosition?: KeyPosition;
      sharedKey?: OptionKeyValue;
      sharedKeyPosition?: "before" | "after";
    }
  | {
      type: "text-2x2";
      options: Record<OptionId, RichNode[]>;
      shrinkToFit?: boolean;
      /** Optional question text rendered between the reference statements
       *  and the option grid. */
      questionText?: RichNode[];

      keys?: OptionKeys;
      keyPosition?: KeyPosition;
      sharedKey?: OptionKeyValue;
      sharedKeyPosition?: "before" | "after";
    }
  | {
      type: "text-refs";
      options: Record<OptionId, { label: RichNode[]; refs: number[] }>;
      orientation?: "horizontal" | "vertical";
    }
  | {
      type: "table-rows";
      header: RichNode[][];
      rows: Record<OptionId, RichNode[][]>;
      headerBg?: (string | undefined)[];
      cellBg?: Record<OptionId, (string | undefined)[]>;
      headerAlign?: (CellAlign | undefined)[];
      cellAlign?: Record<OptionId, (CellAlign | undefined)[]>;
      keyItems?: KeyItem[];
    }
  | {
      type: "table-cols";
      header: Record<OptionId, RichNode[]>;
      rows: RichNode[][][];
      headerBg?: Partial<Record<OptionId, string>>;
      cellBg?: (string | undefined)[][];
      headerAlign?: Partial<Record<OptionId, CellAlign>>;
      cellAlign?: (CellAlign | undefined)[][];
      keyItems?: KeyItem[];
    }
  | {
      type: "table-cols-sub";
      header: Record<OptionId, RichNode[]>;
      subHeaders: Record<OptionId, RichNode[][]>;
      rowLabelHeader?: RichNode[];
      rowLabels?: RichNode[][];
      rows: RichNode[][][];
      keyItems?: KeyItem[];
    }
  | {
      type: "table-rows-sub";
      header: RichNode[][];
      subRowLabelHeader?: RichNode[];
      groups: Record<OptionId, { subRowLabels?: RichNode[][]; rows: RichNode[][][] }>;
      keyItems?: KeyItem[];
    }
  | {
      type: "table-cells";
      grid: RichNode[][][];
      optionCells: Record<OptionId, { r: number; c: number }>;
    }
  | {
      type: "images";
      options: Record<OptionId, MCQImageRef>;
      orientation?: Orientation;
    }
  | {
      type: "image-hotspots";
      image: MCQImageRef;
      hotspots: Record<OptionId, { xPct: number; yPct: number }>;
      sizePx?: number;
    }
  | {
      type: "graphs";
      options: Record<OptionId, GraphSpec>;
      orientation?: Orientation;
    }
  | {
      type: "flowcharts";
      options: Record<OptionId, FlowchartSpec>;
      orientation?: Orientation;
    }
  | {
      type: "circuits";

      options: Record<OptionId, import("./circuit").CircuitSpec>;

      orientation?: Orientation;
    }
  | {
      type: "combined-choice";
      statements: RichNode[][];
      options: Record<OptionId, number[]>;
      optionLabels?: Partial<Record<OptionId, RichNode[]>>;
      listStyle?: ListStyle;
      orientation?: Orientation;
      shrinkToFit?: boolean;
      /** Optional question text rendered between the reference statements
       *  and the option grid. */
      questionText?: RichNode[];
    }
  | {
      type: "image-refs";
      /** Reference images (1..N) shown above the option grid. Rendered
       *  inline like intro-data images (no boxed frame) — each honours its
       *  own `size`, `padding`, `caption`, `invertOnDark`, and optional
       *  layout `span` for sizing across the row. */
      images: MCQImageRef[];
      /** Parallel to `images` — how wide each image should be. */
      imageSpans?: BlockSpan[];
      options: Record<OptionId, { label?: RichNode[]; refs: number[] }>;
      optionLabels?: Partial<Record<OptionId, RichNode[]>>;
      orientation?: Orientation;
      /** Optional question text rendered between the reference images
       *  and the option grid. */
      questionText?: RichNode[];
    }
  | {
      type: "image-zones";
      image: MCQImageRef;
      zones: ImageZone[];
      options: Record<OptionId, { label?: RichNode[]; refs: number[] }>;
      optionLabels?: Partial<Record<OptionId, RichNode[]>>;
      orientation?: Orientation;
      /** Show zone number labels on the image. Defaults to true. */
      showZoneLabels?: boolean;
      /** How selected/hovered zones are indicated.
       *   - "labels"        : numbered circles only (legacy default)
       *   - "overlay"       : colored translucent polygon overlay
       *   - "overlay+labels": both */
      highlightMode?: "labels" | "overlay" | "overlay+labels";
      /** When true, selecting an option does NOT keep its zones highlighted;
       *  only hovered zones paint temporarily. */
      noPersistentHighlight?: boolean;
      /** When true, hide zone outlines entirely unless the zone is currently
       *  highlighted (hovered or sticky-selected). Removes any visible trace
       *  of the zones on the plain image. */
      hideBorders?: boolean;
      questionText?: RichNode[];
    }
  | {
      type: "graph-hotspots";
      spec: GraphSpec;
      hotspots: Record<OptionId, { xPct: number; yPct: number }>;
      sizePx?: number;
      /** Height of the hotspot box in px (used in both builder & paper). */
      heightPx?: number;
    }
  | MergedTableLayout
  | TableLayout;

/** Shared shape used by the four merged-table option layouts. `optionsAxis`
 *  determines which axis of the grid holds the options; `optionIndex` maps
 *  each option to a row/column index in the grid. Cells support rowspan and
 *  colspan via `MergedTableCell`. */
export type MergedTableLayout = {
  type:
    | "table-rows-subcols" // options are rows; header may have merged sub-cols
    | "table-cols-subrows" // options are cols; first column may have merged sub-rows
    | "table-subcols-options" // options live on leaf sub-columns of a merged header
    | "table-subrows-options"; // options live on leaf sub-rows of a merged first column
  grid: MergedTableCell[][];
  optionIndex: Record<OptionId, number>;
  headerRows?: number;
  headerCols?: number;
  keyItems?: KeyItem[];
};

export type BlockKind = "intro" | "introData" | "question";

export type BlockSpan = "full" | "half" | "third" | "two-thirds";

/** A cell in a merged table grid used by intro-data tables and by the four
 *  merged-table option layouts. */
export type MergedTableCell = {
  content: RichNode[];
  rowSpan?: number;
  colSpan?: number;
  bg?: string;
  /** Horizontal text alignment for cell content. */
  align?: "left" | "center" | "right";
  /** Render as <th>. Overrides `headerRows`. */
  header?: boolean;
};

/** New reorderable block model. Each question can have any number of intros /
 *  intro-data / question blocks in any order. Rendered in array order. */
export type Block =
  | { id: string; block: "intro"; content: RichNode[]; span?: BlockSpan; centered?: boolean }
  | { id: string; block: "question"; content: RichNode[] }
  | { id: string; block: "introData"; data: IntroData; span?: BlockSpan };

export type Question = {
  n: number;
  /** New model. When present, `order/intro/introData/question` are ignored. */
  blocks?: Block[];
  /** Legacy model — kept for compatibility with existing paper files. */
  order?: BlockKind[];
  intro?: RichNode[];
  introData?: IntroData;
  question?: RichNode[];

  layout: OptionsLayout;
  answer: OptionId;
  /** Optional single label rendered once above or below the options block.
   *  Applies to ALL layout types. */
  sharedKey?: OptionKeyValue;
  sharedKeyPosition?: "before" | "after";
  /** Per-option keys (tick/cross/symbol next to A/B/C/D). Rendered on
   *  supported layouts (text-vertical / -horizontal / -2x2). */
  keys?: OptionKeys;
  keyPosition?: KeyPosition;

  topics?: string[];
  lessons?: string[];
};

export type PaperQuestions = Question[];
