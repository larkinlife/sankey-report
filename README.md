# Sankey Report Builder

Веб-приложение для быстрого создания финансовых Sankey-диаграмм с экспортом в PNG/SVG.

## Возможности
- Таблица потоков с вставкой из Excel (Ctrl+V).
- Настройка заголовка, цветов и логотипа.
- Перетаскивание узлов и точечная настройка параметров.
- Экспорт диаграммы в PNG или SVG.
- Автосохранение данных и настроек в localStorage.

## Запуск
```bash
npm install
npm run dev
```

## Сборка
```bash
npm run build
npm run preview
```

## Структура
- `src/App.tsx` — главный экран, хранение данных, управление настройками.
- `src/components/SankeyChart.tsx` — отрисовка диаграммы через d3-sankey.
- `src/components/DataTable.tsx` — ввод и вставка данных.
- `src/components/ExportButtons.tsx` — экспорт PNG/SVG.
- `src/utils/sankeyHelpers.ts` — подготовка узлов и логика классификации потоков.
