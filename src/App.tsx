import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { FlowRow, ColorSettings, ReportSettings, NodeSettings, PlacedImage } from './types';
import { DataTable } from './components/DataTable';
import { ColorPicker } from './components/ColorPicker';
import { LogoUploader } from './components/LogoUploader';
import { SankeyChart } from './components/SankeyChart';
import type { SankeyChartHandle } from './components/SankeyChart';
import { ExportButtons } from './components/ExportButtons';
import { NodeEditor } from './components/NodeEditor';
import { AppearanceSettings } from './components/AppearanceSettings';
import { BalanceSummary } from './components/BalanceSummary';
import { ImageManager } from './components/ImageManager';
import { prepareNodesAndLinks } from './utils/sankeyHelpers';
import { sankey } from 'd3-sankey';
import './App.css';

const defaultColors: ColorSettings = {
  headerText: '#1a237e',
  revenueFlow: '#4caf50',
  adjacentRevenueFlow: '#8bc34a',
  profitFlow: '#2196f3',
  expenseFlow: '#ff9800',
};

const sampleData: FlowRow[] = [
  { id: 'row-1', source: 'Выручка от реализации', target: 'Себестоимость', currentPeriod: 150.5, previousPeriod: 140.2 },
  { id: 'row-2', source: 'Выручка от реализации', target: 'Валовая прибыль', currentPeriod: 89.3, previousPeriod: 82.1 },
  { id: 'row-3', source: 'Прочие доходы', target: 'Валовая прибыль', currentPeriod: 12.4, previousPeriod: 10.8 },
  { id: 'row-4', source: 'Валовая прибыль', target: 'Коммерческие расходы', currentPeriod: 25.6, previousPeriod: 23.4 },
  { id: 'row-5', source: 'Валовая прибыль', target: 'Управленческие расходы', currentPeriod: 18.2, previousPeriod: 17.1 },
  { id: 'row-6', source: 'Валовая прибыль', target: 'EBITDA', currentPeriod: 57.9, previousPeriod: 52.4 },
  { id: 'row-7', source: 'EBITDA', target: 'Амортизация', currentPeriod: 15.3, previousPeriod: 14.2 },
  { id: 'row-8', source: 'EBITDA', target: 'Чистая прибыль', currentPeriod: 42.6, previousPeriod: 38.2 },
];

const STORAGE_ROWS_KEY = 'sankey-report:rows';
const STORAGE_SETTINGS_KEY = 'sankey-report:settings';

function App() {
  const [rows, setRows] = useState<FlowRow[]>(sampleData);
  const [settings, setSettings] = useState<ReportSettings>({
    logo: null,
    periodLabel: '2024 год / 2023 год',
    colors: defaultColors,
    unitLabel: 'млрд ₽',
    logoWidth: 60,
    logoHeight: 50,
    headerFontSize: 24,
    nodeLabelSize: 12,
    nodeValueSize: 11,
    nodeWidth: 20,
    linkWidthScale: 1,
    chartWidth: 1200,
    chartHeight: 700,
    images: [],
    nodeSettings: {},
  });
  const [activeTab, setActiveTab] = useState<'data' | 'settings'>('data');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const chartRef = useRef<SankeyChartHandle>(null);

  const handleColorsChange = (colors: ColorSettings) => {
    setSettings({ ...settings, colors });
  };

  const handleLogoChange = (logo: string | null) => {
    setSettings({ ...settings, logo });
  };

  const handlePeriodLabelChange = (periodLabel: string) => {
    setSettings({ ...settings, periodLabel });
  };

  const handleAppearanceChange = (updates: Partial<ReportSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const handleAutoLayout = useCallback(() => {
    const validRows = rows.filter((r) => r.source.trim() && r.target.trim() && r.currentPeriod > 0);
    if (validRows.length === 0) return;

    const { nodes, links } = prepareNodesAndLinks(validRows);
    const width = settings.chartWidth || 1200;
    const height = settings.chartHeight || 700;
    const margin = { top: 80, right: 250, bottom: 40, left: 250 };
    const scale = Math.max(1, settings.linkWidthScale || 1);
    const textPad = (settings.nodeLabelSize || 12) + (settings.nodeValueSize || 11) * 2 + 10;
    const nodePadding = Math.max(25 * scale, textPad);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layout = sankey<any, any>()
      .nodeWidth(settings.nodeWidth || 20)
      .nodePadding(nodePadding)
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ]);

    const graph = layout({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    }) as { nodes: Array<{ name: string; x0?: number; y0?: number; layer?: number }>; links: unknown[] };

    const updates: Record<string, NodeSettings> = {};
    const columns = new Map<number, Array<{ name: string; y0?: number }>>();

    graph.nodes.forEach((node) => {
      const key = typeof node.layer === 'number'
        ? node.layer
        : Math.round((node.x0 || 0) / 10);
      const list = columns.get(key) || [];
      list.push(node);
      columns.set(key, list);
    });

    columns.forEach((list) => {
      list.sort((a, b) => (a.y0 || 0) - (b.y0 || 0));
      list.forEach((node, index) => {
        updates[node.name] = {
          ...(settings.nodeSettings[node.name] || {}),
          offsetX: 0,
          offsetY: 0,
          orderY: index,
        };
      });
    });

    setSettings((prev) => ({
      ...prev,
      nodeSettings: {
        ...prev.nodeSettings,
        ...updates,
      },
    }));
  }, [rows, settings, setSettings]);

  const handleNodeSelect = useCallback((nodeName: string | null) => {
    setSelectedNode(nodeName);
    if (nodeName) {
      setSelectedImageId(null);
    }
  }, []);

  const handleNodeMove = useCallback((nodeName: string, offsetX: number, offsetY: number) => {
    setSettings((prev) => ({
      ...prev,
      nodeSettings: {
        ...prev.nodeSettings,
        [nodeName]: {
          ...prev.nodeSettings[nodeName],
          offsetX,
          offsetY,
        },
      },
    }));
  }, []);

  const handleNodesReorder = useCallback((updates: Array<{ nodeName: string; orderY: number; offsetX?: number; offsetY?: number }>) => {
    setSettings((prev) => {
      const nextNodeSettings = { ...prev.nodeSettings };
      updates.forEach((update) => {
        const existing = nextNodeSettings[update.nodeName] || {};
        nextNodeSettings[update.nodeName] = {
          ...existing,
          orderY: update.orderY,
          offsetX: update.offsetX !== undefined ? update.offsetX : existing.offsetX,
          offsetY: update.offsetY !== undefined ? update.offsetY : existing.offsetY,
        };
      });
      return { ...prev, nodeSettings: nextNodeSettings };
    });
  }, []);

  const handleNodeSettingsChange = useCallback((nodeName: string, nodeSettings: NodeSettings) => {
    setSettings((prev) => ({
      ...prev,
      nodeSettings: {
        ...prev.nodeSettings,
        [nodeName]: nodeSettings,
      },
    }));
  }, []);

  const handleResetNodePosition = useCallback((nodeName: string) => {
    setSettings((prev) => ({
      ...prev,
      nodeSettings: {
        ...prev.nodeSettings,
        [nodeName]: {
          ...prev.nodeSettings[nodeName],
          offsetX: undefined,
          offsetY: undefined,
        },
      },
    }));
  }, []);

  const handleCloseNodeEditor = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleImageAdd = (image: PlacedImage) => {
    setSettings((prev) => ({
      ...prev,
      images: [...prev.images, image],
    }));
    setSelectedImageId(image.id);
  };

  const handleImageUpdate = (id: string, updates: Partial<PlacedImage>) => {
    setSettings((prev) => ({
      ...prev,
      images: prev.images.map((image) => (image.id === id ? { ...image, ...updates } : image)),
    }));
  };

  const handleImageRemove = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      images: prev.images.filter((image) => image.id !== id),
    }));
    if (selectedImageId === id) {
      setSelectedImageId(null);
    }
  };

  const handleImageSelect = useCallback((id: string | null) => {
    setSelectedImageId(id);
    if (id) {
      setSelectedNode(null);
    }
  }, []);

  const layoutColumns = useMemo(() => {
    const validRows = rows.filter((r) => r.source.trim() && r.target.trim() && r.currentPeriod > 0);
    if (validRows.length === 0) {
      return { columnByName: new Map<string, number>(), columns: new Map<number, Array<{ name: string; visualY: number }>>() };
    }

    const { nodes, links } = prepareNodesAndLinks(validRows);
    const width = settings.chartWidth || 1200;
    const height = settings.chartHeight || 700;
    const margin = { top: 80, right: 250, bottom: 40, left: 250 };
    const scale = Math.max(1, settings.linkWidthScale || 1);
    const textPad = (settings.nodeLabelSize || 12) + (settings.nodeValueSize || 11) * 2 + 10;
    const nodePadding = Math.max(25 * scale, textPad);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeOrderIndex = new Map(nodes.map((node, index) => [node.name, index]));
    const getOrder = (nodeName: string) => {
      const stored = settings.nodeSettings[nodeName]?.orderY;
      if (typeof stored === 'number') return stored;
      return nodeOrderIndex.get(nodeName) ?? 0;
    };

    const layout = sankey<any, any>()
      .nodeWidth(settings.nodeWidth || 20)
      .nodePadding(nodePadding)
      .nodeSort((a, b) => {
        const diff = getOrder(a.name) - getOrder(b.name);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      })
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ]);

    const graph = layout({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    }) as { nodes: Array<{ name: string; y0?: number; x0?: number; layer?: number }>; links: unknown[] };

    const columnByName = new Map<string, number>();
    const columns = new Map<number, Array<{ name: string; visualY: number }>>();

    graph.nodes.forEach((node) => {
      const columnKey = typeof node.layer === 'number'
        ? node.layer
        : Math.round((node.x0 || 0) / 10);
      columnByName.set(node.name, columnKey);
      const list = columns.get(columnKey) || [];
      const offsetY = settings.nodeSettings[node.name]?.offsetY || 0;
      const visualY = (node.y0 || 0) + offsetY;
      list.push({ name: node.name, visualY });
      columns.set(columnKey, list);
    });

    const resultColumns = new Map<number, Array<{ name: string; visualY: number }>>();

    columns.forEach((list, key) => {
      const sorted = [...list].sort((a, b) => {
        if (a.visualY !== b.visualY) return a.visualY - b.visualY;
        return a.name.localeCompare(b.name);
      });
      resultColumns.set(key, sorted);
    });

    return { columnByName, columns: resultColumns };
  }, [rows, settings]);

  const parentGroups = useMemo(() => {
    const parentByNode = new Map<string, string>();
    const parentChildren = new Map<string, string[]>();
    const bestValue = new Map<string, number>();

    rows.forEach((row) => {
      const source = row.source.trim();
      const target = row.target.trim();
      if (!source || !target) return;

      const list = parentChildren.get(source) || [];
      if (!list.includes(target)) {
        list.push(target);
        parentChildren.set(source, list);
      }

      const currentValue = Number.isFinite(row.currentPeriod) ? row.currentPeriod : 0;
      const best = bestValue.get(target);
      if (best === undefined || currentValue > best) {
        bestValue.set(target, currentValue);
        parentByNode.set(target, source);
      }
    });

    return { parentByNode, parentChildren };
  }, [rows]);

  const moveNodeByDirection = useCallback((nodeName: string, direction: 'up' | 'down') => {
    const parent = parentGroups.parentByNode.get(nodeName);
    if (!parent) return;
    const siblings = parentGroups.parentChildren.get(parent);
    if (!siblings || siblings.length <= 1) return;

    const columnKey = layoutColumns.columnByName.get(nodeName);
    if (columnKey === undefined) return;
    const columnList = layoutColumns.columns.get(columnKey);
    if (!columnList || columnList.length <= 1) return;

    const columnOrder = columnList.map((item) => item.name);
    const siblingSet = new Set(siblings);
    const siblingOrder = columnOrder.filter((name) => siblingSet.has(name));

    const idx = siblingOrder.indexOf(nodeName);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblingOrder.length) return;

    const swapWith = siblingOrder[targetIdx];
    const indexA = columnOrder.indexOf(nodeName);
    const indexB = columnOrder.indexOf(swapWith);
    if (indexA === -1 || indexB === -1) return;

    const updatedColumnOrder = [...columnOrder];
    updatedColumnOrder[indexA] = swapWith;
    updatedColumnOrder[indexB] = nodeName;

    setSettings((prev) => {
      const next = { ...prev.nodeSettings };
      updatedColumnOrder.forEach((name, index) => {
        next[name] = {
          ...next[name],
          orderY: index,
        };
      });
      return { ...prev, nodeSettings: next };
    });
  }, [layoutColumns, parentGroups]);

  const getMoveAvailability = useCallback((nodeName: string | null) => {
    if (!nodeName) return { canMoveUp: false, canMoveDown: false };
    const parent = parentGroups.parentByNode.get(nodeName);
    if (!parent) return { canMoveUp: false, canMoveDown: false };
    const siblings = parentGroups.parentChildren.get(parent);
    if (!siblings || siblings.length <= 1) return { canMoveUp: false, canMoveDown: false };

    const columnKey = layoutColumns.columnByName.get(nodeName);
    if (columnKey === undefined) return { canMoveUp: false, canMoveDown: false };
    const columnList = layoutColumns.columns.get(columnKey);
    if (!columnList || columnList.length <= 1) return { canMoveUp: false, canMoveDown: false };

    const columnOrder = columnList.map((item) => item.name);
    const siblingSet = new Set(siblings);
    const siblingOrder = columnOrder.filter((name) => siblingSet.has(name));
    const idx = siblingOrder.indexOf(nodeName);
    return {
      canMoveUp: idx > 0,
      canMoveDown: idx >= 0 && idx < siblingOrder.length - 1,
    };
  }, [layoutColumns, parentGroups]);

  useEffect(() => {
    try {
      const savedRows = localStorage.getItem(STORAGE_ROWS_KEY);
      const savedSettings = localStorage.getItem(STORAGE_SETTINGS_KEY);

      if (savedRows) {
        const parsedRows = JSON.parse(savedRows);
        if (Array.isArray(parsedRows)) {
          const validRows = parsedRows.filter((row) => (
            row &&
            typeof row.id === 'string' &&
            typeof row.source === 'string' &&
            typeof row.target === 'string' &&
            typeof row.currentPeriod === 'number' &&
            typeof row.previousPeriod === 'number'
          ));
          if (validRows.length > 0) {
            setRows(validRows);
          }
        }
      }

      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings && typeof parsedSettings === 'object') {
          setSettings((prev) => ({
            ...prev,
            ...parsedSettings,
            colors: {
              ...prev.colors,
              ...(parsedSettings.colors || {}),
            },
            nodeSettings: parsedSettings.nodeSettings || {},
            images: Array.isArray(parsedSettings.images) ? parsedSettings.images : prev.images,
            unitLabel: typeof parsedSettings.unitLabel === 'string' ? parsedSettings.unitLabel : prev.unitLabel,
          }));
        }
      }
    } catch {
      // Ignore corrupted localStorage data.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ROWS_KEY, JSON.stringify(rows));
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors (e.g., quota exceeded).
    }
  }, [rows, settings]);

  // Get current svgRef for export
  const getExportSvgRef = () => {
    if (chartRef.current) {
      return { current: chartRef.current.getSvgRef() };
    }
    return { current: null };
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Sankey Report Builder</h1>
        <p>Конструктор финансовых Sankey-диаграмм</p>
      </header>

      <div className="app-content">
        <aside className="sidebar">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              Данные
            </button>
            <button
              className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Настройки
            </button>
          </div>

          {activeTab === 'data' && (
            <div className="tab-content">
              <div className="period-input">
                <label>Заголовок отчета</label>
                <input
                  type="text"
                  value={settings.periodLabel}
                  onChange={(e) => handlePeriodLabelChange(e.target.value)}
                  placeholder="2024 год / 2023 год"
                />
              </div>
              <DataTable rows={rows} unitLabel={settings.unitLabel} onChange={setRows} />
              <div className="auto-layout-row">
                <button className="auto-layout-btn" onClick={handleAutoLayout}>
                  Авторасстановка
                </button>
              </div>
              <BalanceSummary rows={rows} unitLabel={settings.unitLabel} />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="tab-content">
              <LogoUploader logo={settings.logo} onChange={handleLogoChange} />
              <AppearanceSettings
                logoWidth={settings.logoWidth}
                logoHeight={settings.logoHeight}
                headerFontSize={settings.headerFontSize}
                nodeLabelSize={settings.nodeLabelSize}
                nodeValueSize={settings.nodeValueSize}
                nodeWidth={settings.nodeWidth}
                linkWidthScale={settings.linkWidthScale}
                chartWidth={settings.chartWidth}
                chartHeight={settings.chartHeight}
                unitLabel={settings.unitLabel}
                onChange={handleAppearanceChange}
              />
              <ImageManager
                images={settings.images}
                selectedImageId={selectedImageId}
                chartWidth={settings.chartWidth}
                chartHeight={settings.chartHeight}
                onAdd={handleImageAdd}
                onUpdate={handleImageUpdate}
                onRemove={handleImageRemove}
                onSelect={handleImageSelect}
              />
              <ColorPicker colors={settings.colors} onChange={handleColorsChange} />
            </div>
          )}
        </aside>

        <main className="main-content">
          <div className="chart-header">
            <h2>Предпросмотр</h2>
            <ExportButtons
              svgRef={getExportSvgRef()}
              filename={`sankey-report-${new Date().toISOString().split('T')[0]}`}
            />
          </div>

          <div className="chart-area">
            <div className="chart-wrapper">
              <SankeyChart
                ref={chartRef}
                rows={rows}
                settings={settings}
                selectedNode={selectedNode}
                selectedImageId={selectedImageId}
                onNodeSelect={handleNodeSelect}
                onNodeMove={handleNodeMove}
                onNodesReorder={handleNodesReorder}
                onImageSelect={handleImageSelect}
                onImageUpdate={handleImageUpdate}
              />
            </div>

            {selectedNode && (
              <NodeEditor
                nodeName={selectedNode}
                settings={settings.nodeSettings[selectedNode] || {}}
                defaultLabelSize={settings.nodeLabelSize}
                defaultValueSize={settings.nodeValueSize}
                canMoveUp={getMoveAvailability(selectedNode).canMoveUp}
                canMoveDown={getMoveAvailability(selectedNode).canMoveDown}
                onMoveUp={() => moveNodeByDirection(selectedNode, 'up')}
                onMoveDown={() => moveNodeByDirection(selectedNode, 'down')}
                onChange={handleNodeSettingsChange}
                onClose={handleCloseNodeEditor}
                onResetPosition={handleResetNodePosition}
              />
            )}
          </div>

          <div className="chart-hint">
            Кликните на узел для редактирования. Перетаскивайте узлы для изменения позиции.
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
