export interface FlowRow {
  id: string;
  source: string;
  target: string;
  currentPeriod: number;
  previousPeriod: number;
}

export interface NodeSettings {
  color?: string;
  labelSize?: number;
  valueSize?: number;
  offsetX?: number;
  offsetY?: number;
  linkColorPriority?: boolean;
  orderY?: number;
}

export interface ColorSettings {
  headerText: string;
  revenueFlow: string;
  adjacentRevenueFlow: string;
  profitFlow: string;
  expenseFlow: string;
}

export interface ReportSettings {
  logo: string | null;
  periodLabel: string;
  colors: ColorSettings;
  unitLabel: string;
  logoWidth: number;
  logoHeight: number;
  headerFontSize: number;
  nodeLabelSize: number;
  nodeValueSize: number;
  nodeWidth: number;
  linkWidthScale: number;
  chartWidth: number;
  chartHeight: number;
  images: PlacedImage[];
  nodeSettings: Record<string, NodeSettings>;
}

export interface PlacedImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FlowType = 'revenue' | 'adjacentRevenue' | 'profit' | 'expense';
