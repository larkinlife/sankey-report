import React from 'react';
import type { FlowRow } from '../types';

interface DataTableProps {
  rows: FlowRow[];
  unitLabel: string;
  onChange: (rows: FlowRow[]) => void;
}

export const DataTable: React.FC<DataTableProps> = ({ rows, unitLabel, onChange }) => {
  const handleCellChange = (id: string, field: keyof FlowRow, value: string | number) => {
    onChange(
      rows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const addRow = () => {
    const newRow: FlowRow = {
      id: `row-${Date.now()}`,
      source: '',
      target: '',
      currentPeriod: 0,
      previousPeriod: 0,
    };
    onChange([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedData = e.clipboardData.getData('text');
    const lines = pastedData.trim().split('\n');

    if (lines.length > 1 || lines[0].includes('\t')) {
      e.preventDefault();

      const newRows: FlowRow[] = lines.map((line, index) => {
        const cells = line.split('\t');
        return {
          id: `row-${Date.now()}-${index}`,
          source: cells[0]?.trim() || '',
          target: cells[1]?.trim() || '',
          currentPeriod: parseFloat(cells[2]?.replace(',', '.') || '0') || 0,
          previousPeriod: parseFloat(cells[3]?.replace(',', '.') || '0') || 0,
        };
      });

      onChange([...rows.filter(r => r.source || r.target), ...newRows]);
    }
  };

  return (
    <div className="data-table-container">
      <h3>Данные потоков</h3>
      <p className="hint">Можно вставить данные из Excel (Ctrl+V)</p>
      <table className="data-table" onPaste={handlePaste}>
        <thead>
          <tr>
            <th>Источник</th>
            <th>Потребитель</th>
            <th>Текущий период ({unitLabel})</th>
            <th>Предыдущий период ({unitLabel})</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  type="text"
                  value={row.source}
                  onChange={(e) => handleCellChange(row.id, 'source', e.target.value)}
                  placeholder="Статья-источник"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.target}
                  onChange={(e) => handleCellChange(row.id, 'target', e.target.value)}
                  placeholder="Статья-получатель"
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  value={row.currentPeriod || ''}
                  onChange={(e) => handleCellChange(row.id, 'currentPeriod', parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  value={row.previousPeriod || ''}
                  onChange={(e) => handleCellChange(row.id, 'previousPeriod', parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
                />
              </td>
              <td>
                <button className="remove-row-btn" onClick={() => removeRow(row.id)}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="add-row-btn" onClick={addRow}>
        + Добавить строку
      </button>
    </div>
  );
};
