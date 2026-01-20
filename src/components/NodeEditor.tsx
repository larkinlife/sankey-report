import React from 'react';
import type { NodeSettings } from '../types';

interface NodeEditorProps {
  nodeName: string;
  settings: NodeSettings;
  defaultLabelSize: number;
  defaultValueSize: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (nodeName: string, settings: NodeSettings) => void;
  onClose: () => void;
  onResetPosition: (nodeName: string) => void;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({
  nodeName,
  settings,
  defaultLabelSize,
  defaultValueSize,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onChange,
  onClose,
  onResetPosition,
}) => {
  const handleColorChange = (color: string) => {
    onChange(nodeName, { ...settings, color });
  };

  const handleLabelSizeChange = (labelSize: number) => {
    onChange(nodeName, { ...settings, labelSize });
  };

  const handleValueSizeChange = (valueSize: number) => {
    onChange(nodeName, { ...settings, valueSize });
  };

  const handleClearColor = () => {
    const next = { ...settings };
    delete next.color;
    onChange(nodeName, next);
  };

  const handleLinkPriorityChange = (checked: boolean) => {
    onChange(nodeName, { ...settings, linkColorPriority: checked });
  };

  return (
    <div className="node-editor">
      <div className="node-editor-header">
        <h4>Настройки узла</h4>
        <button onClick={onClose} className="close-btn">&times;</button>
      </div>

      <div className="node-editor-name">
        <strong>{nodeName}</strong>
      </div>

      <div className="node-editor-section">
        <label>Цвет узла</label>
        <div className="color-input-row">
          <input
            type="color"
            value={settings.color || '#888888'}
            onChange={(e) => handleColorChange(e.target.value)}
          />
          <input
            type="text"
            value={settings.color || ''}
            onChange={(e) => handleColorChange(e.target.value)}
            placeholder="Авто"
          />
          {settings.color && (
            <button onClick={handleClearColor} className="clear-btn">
              Сбросить
            </button>
          )}
        </div>
        <div className="node-editor-actions">
          <button className="move-btn" onClick={onMoveUp} disabled={!canMoveUp}>
            ↑ Выше
          </button>
          <button className="move-btn" onClick={onMoveDown} disabled={!canMoveDown}>
            ↓ Ниже
          </button>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.linkColorPriority || false}
            onChange={(e) => handleLinkPriorityChange(e.target.checked)}
          />
          Приоритет цвета узла для линий
        </label>
      </div>

      <div className="node-editor-section">
        <label>Размер названия: {settings.labelSize || defaultLabelSize}px</label>
        <input
          type="range"
          min="8"
          max="24"
          value={settings.labelSize || defaultLabelSize}
          onChange={(e) => handleLabelSizeChange(parseInt(e.target.value))}
        />
      </div>

      <div className="node-editor-section">
        <label>Размер данных: {settings.valueSize || defaultValueSize}px</label>
        <input
          type="range"
          min="8"
          max="20"
          value={settings.valueSize || defaultValueSize}
          onChange={(e) => handleValueSizeChange(parseInt(e.target.value))}
        />
      </div>

      {(settings.offsetX !== undefined || settings.offsetY !== undefined) && (
        <div className="node-editor-section">
          <button
            onClick={() => onResetPosition(nodeName)}
            className="reset-position-btn"
          >
            Сбросить позицию
          </button>
        </div>
      )}

      <div className="node-editor-hint">
        Перетаскивайте узлы мышью для изменения позиции
      </div>
    </div>
  );
};
