import type { FlowRow, ColorSettings, FlowType } from '../types';

export interface SankeyNodeExtended {
  name: string;
  id: string;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  layer?: number;
  sourceLinks?: SankeyLinkExtended[];
  targetLinks?: SankeyLinkExtended[];
}

export interface SankeyLinkExtended {
  source: number | SankeyNodeExtended;
  target: number | SankeyNodeExtended;
  value: number;
  flowType: FlowType;
  currentValue: number;
  previousValue: number;
  y0?: number;
  y1?: number;
  width?: number;
}

export function determineFlowType(source: string, target: string): FlowType {
  const sourceLower = source.toLowerCase();
  const targetLower = target.toLowerCase();

  // Смежная выручка (прочие доходы)
  if (sourceLower.includes('прочи') && (sourceLower.includes('доход') || sourceLower.includes('выручка'))) {
    return 'adjacentRevenue';
  }

  // Выручка
  if (sourceLower.includes('выручка') || sourceLower.includes('доход')) {
    return 'revenue';
  }

  // Прибыль
  if (targetLower.includes('прибыль') || targetLower.includes('ebitda') || targetLower.includes('чистая')) {
    return 'profit';
  }

  // По умолчанию - расходы
  return 'expense';
}

export function getFlowColor(flowType: FlowType, colors: ColorSettings): string {
  switch (flowType) {
    case 'revenue':
      return colors.revenueFlow;
    case 'adjacentRevenue':
      return colors.adjacentRevenueFlow;
    case 'profit':
      return colors.profitFlow;
    case 'expense':
      return colors.expenseFlow;
  }
}

export function prepareNodesAndLinks(rows: FlowRow[]): {
  nodes: { name: string; id: string }[];
  links: { source: number; target: number; value: number; flowType: FlowType; currentValue: number; previousValue: number }[]
} {
  const nodeNames = new Set<string>();

  rows.forEach(row => {
    if (row.source.trim()) nodeNames.add(row.source.trim());
    if (row.target.trim()) nodeNames.add(row.target.trim());
  });

  const nodes = Array.from(nodeNames).map((name, index) => ({
    name,
    id: `node-${index}`
  }));

  const nodeIndex = new Map<string, number>();
  nodes.forEach((node, index) => {
    nodeIndex.set(node.name, index);
  });

  const links = rows
    .filter(row => row.source.trim() && row.target.trim() && row.currentPeriod > 0)
    .map(row => ({
      source: nodeIndex.get(row.source.trim())!,
      target: nodeIndex.get(row.target.trim())!,
      value: row.currentPeriod,
      flowType: determineFlowType(row.source, row.target),
      currentValue: row.currentPeriod,
      previousValue: row.previousPeriod,
    }));

  return { nodes, links };
}

export function formatNumber(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

export function calculateChange(current: number, previous: number): { value: number; percent: number } {
  const diff = current - previous;
  const percent = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  return { value: diff, percent };
}
