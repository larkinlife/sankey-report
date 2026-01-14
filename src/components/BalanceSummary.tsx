import React, { useMemo } from 'react';
import type { FlowRow } from '../types';

interface BalanceSummaryProps {
  rows: FlowRow[];
  unitLabel: string;
}

type NodeBalance = {
  name: string;
  currentIn: number;
  currentOut: number;
  previousIn: number;
  previousOut: number;
  hasIn: boolean;
  hasOut: boolean;
};

const formatNumber = (value: number) => value.toFixed(1).replace('.', ',');

export const BalanceSummary: React.FC<BalanceSummaryProps> = ({ rows, unitLabel }) => {
  const { nodeBalances, sourceTotals, sinkTotals, issues } = useMemo(() => {
    const balances = new Map<string, NodeBalance>();
    const problems: string[] = [];

    rows.forEach((row, index) => {
      const source = row.source.trim();
      const target = row.target.trim();
      const current = Number.isFinite(row.currentPeriod) ? row.currentPeriod : NaN;
      const previous = Number.isFinite(row.previousPeriod) ? row.previousPeriod : NaN;

      if (!source || !target) {
        problems.push(`Строка ${index + 1}: нет источника или потребителя.`);
        return;
      }

      if (!Number.isFinite(current) || !Number.isFinite(previous)) {
        problems.push(`Строка ${index + 1}: некорректные числа.`);
        return;
      }

      if (current < 0 || previous < 0) {
        problems.push(`Строка ${index + 1}: отрицательные значения.`);
      }

      if (!balances.has(source)) {
        balances.set(source, { name: source, currentIn: 0, currentOut: 0, previousIn: 0, previousOut: 0, hasIn: false, hasOut: false });
      }
      if (!balances.has(target)) {
        balances.set(target, { name: target, currentIn: 0, currentOut: 0, previousIn: 0, previousOut: 0, hasIn: false, hasOut: false });
      }

      balances.get(source)!.currentOut += current;
      balances.get(source)!.previousOut += previous;
      balances.get(source)!.hasOut = true;
      balances.get(target)!.currentIn += current;
      balances.get(target)!.previousIn += previous;
      balances.get(target)!.hasIn = true;
    });

    const nodeBalances = Array.from(balances.values());
    const sourceNodes = nodeBalances.filter((node) => node.hasOut && !node.hasIn);
    const sinkNodes = nodeBalances.filter((node) => node.hasIn && !node.hasOut);

    const sourceTotals = {
      current: sourceNodes.reduce((sum, node) => sum + node.currentOut, 0),
      previous: sourceNodes.reduce((sum, node) => sum + node.previousOut, 0),
    };

    const sinkTotals = {
      current: sinkNodes.reduce((sum, node) => sum + node.currentIn, 0),
      previous: sinkNodes.reduce((sum, node) => sum + node.previousIn, 0),
    };

    return { nodeBalances, sourceTotals, sinkTotals, issues: problems };
  }, [rows]);

  const epsilon = 0.001;
  const intermediateNodes = nodeBalances.filter((node) => node.hasIn && node.hasOut);
  const imbalancedNodes = intermediateNodes.filter((node) => {
    const currentDiff = Math.abs(node.currentIn - node.currentOut);
    const previousDiff = Math.abs(node.previousIn - node.previousOut);
    return currentDiff > epsilon || previousDiff > epsilon;
  });

  const edgeCurrentDiff = Math.abs(sourceTotals.current - sinkTotals.current);
  const edgePreviousDiff = Math.abs(sourceTotals.previous - sinkTotals.previous);
  const edgeMismatch = edgeCurrentDiff > epsilon || edgePreviousDiff > epsilon;
  const isOk = imbalancedNodes.length === 0 && issues.length === 0 && !edgeMismatch;

  return (
    <div className={`balance-summary ${isOk ? 'ok' : 'error'}`}>
      <h3>Проверка баланса</h3>
      <div className="balance-totals">
        <div>
          Текущий период: источники {formatNumber(sourceTotals.current)} {unitLabel} / потребители {formatNumber(sinkTotals.current)} {unitLabel}
        </div>
        <div>
          Предыдущий период: источники {formatNumber(sourceTotals.previous)} {unitLabel} / потребители {formatNumber(sinkTotals.previous)} {unitLabel}
        </div>
      </div>

      <div className="balance-section">
        <h4>Промежуточные узлы (вход и выход)</h4>
        <div className="balance-muted">
          Источники и потребители без пары игнорируются.
        </div>
      </div>

      {imbalancedNodes.length > 0 && (
        <div className="balance-section">
          <h4>Несбалансированные узлы</h4>
          <ul>
            {imbalancedNodes.map((node) => (
              <li key={node.name}>
                {node.name}: текущий {formatNumber(node.currentIn)} {unitLabel} / {formatNumber(node.currentOut)} {unitLabel},
                предыдущий {formatNumber(node.previousIn)} {unitLabel} / {formatNumber(node.previousOut)} {unitLabel}
              </li>
            ))}
          </ul>
        </div>
      )}

      {edgeMismatch && (
        <div className="balance-section">
          <h4>Баланс по крайним узлам</h4>
          <div className="balance-muted">
            Источники и потребители не сходятся: текущий {formatNumber(edgeCurrentDiff)} {unitLabel},
            предыдущий {formatNumber(edgePreviousDiff)} {unitLabel}
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="balance-section">
          <h4>Проблемы по строкам</h4>
          <ul>
            {issues.map((issue, index) => (
              <li key={`${issue}-${index}`}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {isOk && (
        <div className="balance-ok">Ошибок не найдено.</div>
      )}
    </div>
  );
};
