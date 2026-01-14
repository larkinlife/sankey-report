import React from 'react';

interface AppearanceSettingsProps {
  logoWidth: number;
  logoHeight: number;
  headerFontSize: number;
  nodeLabelSize: number;
  nodeValueSize: number;
  nodeWidth: number;
  linkWidthScale: number;
  chartWidth: number;
  chartHeight: number;
  unitLabel: string;
  onChange: (updates: {
    logoWidth?: number;
    logoHeight?: number;
    headerFontSize?: number;
    nodeLabelSize?: number;
    nodeValueSize?: number;
    nodeWidth?: number;
    linkWidthScale?: number;
    chartWidth?: number;
    chartHeight?: number;
    unitLabel?: string;
  }) => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  logoWidth,
  logoHeight,
  headerFontSize,
  nodeLabelSize,
  nodeValueSize,
  nodeWidth,
  linkWidthScale,
  chartWidth,
  chartHeight,
  unitLabel,
  onChange,
}) => {
  return (
    <div className="appearance-settings">
      <h3>Размеры</h3>

      <div className="range-row">
        <label>Логотип: {logoWidth}px × {logoHeight}px</label>
        <div className="range-controls">
          <input
            type="range"
            min="30"
            max="180"
            value={logoWidth}
            onChange={(e) => onChange({ logoWidth: parseInt(e.target.value, 10) })}
          />
          <input
            type="range"
            min="20"
            max="140"
            value={logoHeight}
            onChange={(e) => onChange({ logoHeight: parseInt(e.target.value, 10) })}
          />
        </div>
      </div>

      <div className="range-row">
        <label>Заголовок: {headerFontSize}px</label>
        <input
          type="range"
          min="16"
          max="36"
          value={headerFontSize}
          onChange={(e) => onChange({ headerFontSize: parseInt(e.target.value, 10) })}
        />
      </div>

      <div className="range-row">
        <label>Текст узлов: {nodeLabelSize}px</label>
        <input
          type="range"
          min="6"
          max="22"
          value={nodeLabelSize}
          onChange={(e) => onChange({ nodeLabelSize: parseInt(e.target.value, 10) })}
        />
      </div>

      <div className="range-row">
        <label>Данные узлов: {nodeValueSize}px</label>
        <input
          type="range"
          min="6"
          max="20"
          value={nodeValueSize}
          onChange={(e) => onChange({ nodeValueSize: parseInt(e.target.value, 10) })}
        />
      </div>

      <div className="range-row">
        <label>Толщина узлов: {nodeWidth}px</label>
        <input
          type="range"
          min="12"
          max="40"
          value={nodeWidth}
          onChange={(e) => onChange({ nodeWidth: parseInt(e.target.value, 10) })}
        />
      </div>

      <div className="range-row">
        <label>Толщина линий: {linkWidthScale.toFixed(1)}x</label>
        <input
          type="range"
          min="0.6"
          max="2"
          step="0.1"
          value={linkWidthScale}
          onChange={(e) => onChange({ linkWidthScale: parseFloat(e.target.value) })}
        />
      </div>

      <div className="range-row">
        <label>Рабочая область: {chartWidth}px × {chartHeight}px</label>
        <div className="range-controls">
          <input
            type="range"
            min="1000"
            max="5200"
            value={chartWidth}
            onChange={(e) => onChange({ chartWidth: parseInt(e.target.value, 10) })}
          />
          <input
            type="range"
            min="600"
            max="2800"
            value={chartHeight}
            onChange={(e) => onChange({ chartHeight: parseInt(e.target.value, 10) })}
          />
        </div>
      </div>

      <div className="range-row">
        <label>Единицы измерения</label>
        <input
          className="text-input"
          type="text"
          value={unitLabel}
          onChange={(e) => onChange({ unitLabel: e.target.value })}
          placeholder="млрд ₽"
        />
      </div>
    </div>
  );
};
