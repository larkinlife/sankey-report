import React from 'react';
import type { ColorSettings } from '../types';

interface ColorPickerProps {
  colors: ColorSettings;
  onChange: (colors: ColorSettings) => void;
}

const colorLabels: { key: keyof ColorSettings; label: string }[] = [
  { key: 'headerText', label: 'Цвет заголовка' },
  { key: 'revenueFlow', label: 'Цвет выручки' },
  { key: 'adjacentRevenueFlow', label: 'Цвет смежной выручки' },
  { key: 'profitFlow', label: 'Цвет прибыли' },
  { key: 'expenseFlow', label: 'Цвет расходов' },
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ colors, onChange }) => {
  const handleColorChange = (key: keyof ColorSettings, value: string) => {
    onChange({ ...colors, [key]: value });
  };

  return (
    <div className="color-picker">
      <h3>Корпоративные цвета</h3>
      <div className="color-grid">
        {colorLabels.map(({ key, label }) => (
          <div key={key} className="color-item">
            <label>{label}</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={colors[key]}
                onChange={(e) => handleColorChange(key, e.target.value)}
              />
              <input
                type="text"
                value={colors[key]}
                onChange={(e) => handleColorChange(key, e.target.value)}
                placeholder="#000000"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
