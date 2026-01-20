import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import * as d3 from 'd3';
import { sankey } from 'd3-sankey';
import type { FlowRow, ReportSettings, NodeSettings } from '../types';
import {
  prepareNodesAndLinks,
  getFlowColor,
  formatNumber,
  calculateChange,
  type SankeyNodeExtended,
  type SankeyLinkExtended
} from '../utils/sankeyHelpers';

interface SankeyChartProps {
  rows: FlowRow[];
  settings: ReportSettings;
  selectedNode: string | null;
  selectedImageId: string | null;
  onNodeSelect: (nodeName: string | null) => void;
  onNodeMove: (nodeName: string, offsetX: number, offsetY: number) => void;
  onImageSelect: (id: string | null) => void;
  onImageUpdate: (id: string, updates: { x?: number; y?: number; width?: number; height?: number }) => void;
}

export interface SankeyChartHandle {
  getSvgRef: () => SVGSVGElement | null;
}

export const SankeyChart = forwardRef<SankeyChartHandle, SankeyChartProps>(
  ({ rows, settings, selectedNode, selectedImageId, onNodeSelect, onNodeMove, onImageSelect, onImageUpdate }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const dragStartRef = useRef<{ x: number; y: number; nodeName: string } | null>(null);
    const dragOffsetRef = useRef<{ nodeName: string; deltaX: number; deltaY: number } | null>(null);
    const imageDragRef = useRef<{ id: string; startX: number; startY: number; x: number; y: number } | null>(null);
    const imageResizeRef = useRef<{ id: string; startX: number; startY: number; width: number; height: number } | null>(null);
    const layoutCacheRef = useRef<{ key: string; graph: { nodes: SankeyNodeExtended[]; links: SankeyLinkExtended[] } } | null>(null);

    useImperativeHandle(ref, () => ({
      getSvgRef: () => svgRef.current
    }));

    const getNodeSettings = useCallback((nodeName: string): NodeSettings => {
      return settings.nodeSettings[nodeName] || {};
    }, [settings.nodeSettings]);

    useEffect(() => {
      if (!svgRef.current || rows.length === 0) return;

      const validRows = rows.filter(r => r.source.trim() && r.target.trim() && r.currentPeriod > 0);
      if (validRows.length === 0) return;

      const { nodes, links } = prepareNodesAndLinks(validRows);

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const width = settings.chartWidth || 1200;
      const height = settings.chartHeight || 700;
      const margin = { top: 80, right: 250, bottom: 40, left: 250 };

      svg.attr('viewBox', `0 0 ${width} ${height}`);
      svg.attr('width', width).attr('height', height);

      // Header
      const headerGroup = svg.append('g').attr('class', 'header');
      const logoWidth = settings.logoWidth || 60;
      const logoHeight = settings.logoHeight || 50;
      const headerX = settings.logo ? 20 + logoWidth + 10 : 20;
      const headerY = 10 + Math.round(logoHeight * 0.75);

      if (settings.logo) {
        headerGroup
          .append('image')
          .attr('x', 20)
          .attr('y', 10)
          .attr('width', logoWidth)
          .attr('height', logoHeight)
          .attr('href', settings.logo)
          .attr('preserveAspectRatio', 'xMidYMid meet');
      }

      headerGroup
        .append('text')
        .attr('x', headerX)
        .attr('y', headerY)
        .attr('font-size', `${settings.headerFontSize || 24}px`)
        .attr('font-weight', 'bold')
        .attr('fill', settings.colors.headerText)
        .text(settings.periodLabel || 'Финансовый отчет');

      const nodeOrderIndex = new Map(nodes.map((node, index) => [node.name, index]));

      // Create link order index based on row position in table
      const linkOrderIndex = new Map<string, number>();
      validRows.forEach((row, index) => {
        const key = `${row.source.trim()}->${row.target.trim()}`;
        linkOrderIndex.set(key, index);
      });

      const getLinkOrder = (sourceName: string, targetName: string) => {
        const key = `${sourceName}->${targetName}`;
        return linkOrderIndex.get(key) ?? Infinity;
      };
      const getNodeSortOrder = (nodeName: string) => nodeOrderIndex.get(nodeName) ?? 0;
      const paddingScale = Math.max(1, settings.linkWidthScale || 1);
      const textPad = (settings.nodeLabelSize || 12) + (settings.nodeValueSize || 11) * 2 + 10;
      const nodePaddingValue = Math.max(25 * paddingScale, textPad);

      // Sankey
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sankeyLayout = sankey<any, any>()
        .nodeWidth(settings.nodeWidth || 20)
        .nodePadding(nodePaddingValue)
        .nodeSort((a, b) => {
          const diff = getNodeSortOrder(a.name) - getNodeSortOrder(b.name);
          if (diff !== 0) return diff;
          return a.name.localeCompare(b.name);
        })
        .extent([
          [margin.left, margin.top],
          [width - margin.right, height - margin.bottom],
        ]);

      const layoutKey = JSON.stringify({
        rows: validRows.map((row) => [row.source.trim(), row.target.trim(), row.currentPeriod, row.previousPeriod]),
        width,
        height,
        nodeWidth: settings.nodeWidth || 20,
        nodePadding: nodePaddingValue,
      });

      let graph: { nodes: SankeyNodeExtended[]; links: SankeyLinkExtended[] };
      if (layoutCacheRef.current && layoutCacheRef.current.key === layoutKey) {
        graph = layoutCacheRef.current.graph;
      } else {
        graph = sankeyLayout({
          nodes: nodes.map((d) => ({ ...d })),
          links: links.map((d) => ({ ...d })),
        }) as { nodes: SankeyNodeExtended[]; links: SankeyLinkExtended[] };
        layoutCacheRef.current = { key: layoutKey, graph };
      }

      const nodeScale = settings.linkWidthScale || 1;
      const minNodeHeight = 8;

      const getRawOffset = (nodeName: string, dragOverride?: { nodeName: string; deltaX: number; deltaY: number }) => {
        const nodeSettings = getNodeSettings(nodeName);
        const baseX = nodeSettings.offsetX || 0;
        const baseY = nodeSettings.offsetY || 0;
        if (dragOverride && dragOverride.nodeName === nodeName) {
          return { x: baseX + dragOverride.deltaX, y: baseY + dragOverride.deltaY };
        }
        return { x: baseX, y: baseY };
      };

      const getScaledNodeBoxWithOffset = (node: SankeyNodeExtended, offset: { x: number; y: number }) => {
        const baseX0 = node.x0 || 0;
        const baseX1 = node.x1 || 0;
        const baseY0 = node.y0 || 0;
        const baseY1 = node.y1 || 0;
        const center = (baseY0 + baseY1) / 2;
        const baseHeight = (baseY1 - baseY0) * nodeScale;
        const height = Math.max(minNodeHeight, baseHeight);
        const y0 = center - height / 2 + offset.y;
        const y1 = center + height / 2 + offset.y;
        return {
          x0: baseX0 + offset.x,
          x1: baseX1 + offset.x,
          y0,
          y1,
          height,
          centerY: center + offset.y,
        };
      };

      const getClampedOffset = (node: SankeyNodeExtended, dragOverride?: { nodeName: string; deltaX: number; deltaY: number }) => {
        const raw = getRawOffset(node.name, dragOverride);
        const box = getScaledNodeBoxWithOffset(node, raw);
        let clampedX = raw.x;
        let clampedY = raw.y;

        if (box.x0 < margin.left) {
          clampedX += margin.left - box.x0;
        }
        if (box.x1 > width - margin.right) {
          clampedX -= box.x1 - (width - margin.right);
        }
        if (box.y0 < margin.top) {
          clampedY += margin.top - box.y0;
        }
        if (box.y1 > height - margin.bottom) {
          clampedY -= box.y1 - (height - margin.bottom);
        }

        return { x: clampedX, y: clampedY };
      };

      graph.nodes.forEach((node) => {
        if (node.sourceLinks) {
          node.sourceLinks.sort((a, b) => {
            const aTarget = a.target as SankeyNodeExtended;
            const bTarget = b.target as SankeyNodeExtended;
            const orderA = getLinkOrder(node.name, aTarget.name);
            const orderB = getLinkOrder(node.name, bTarget.name);
            if (orderA !== orderB) return orderA - orderB;
            return aTarget.name.localeCompare(bTarget.name);
          });
        }
        if (node.targetLinks) {
          node.targetLinks.sort((a, b) => {
            const aSource = a.source as SankeyNodeExtended;
            const bSource = b.source as SankeyNodeExtended;
            const orderA = getLinkOrder(aSource.name, node.name);
            const orderB = getLinkOrder(bSource.name, node.name);
            if (orderA !== orderB) return orderA - orderB;
            return aSource.name.localeCompare(bSource.name);
          });
        }
      });

      sankeyLayout.update(graph);

      const getScaledNodeBox = (node: SankeyNodeExtended, dragOverride?: { nodeName: string; deltaX: number; deltaY: number }) => {
        const offset = getClampedOffset(node, dragOverride);
        return getScaledNodeBoxWithOffset(node, offset);
      };

      const scaleLinkY = (node: SankeyNodeExtended, linkY: number | undefined, dragOverride?: { nodeName: string; deltaX: number; deltaY: number }) => {
        const offset = getClampedOffset(node, dragOverride);
        const baseY0 = node.y0 || 0;
        const baseY1 = node.y1 || 0;
        const baseCenter = (baseY0 + baseY1) / 2;
        const value = linkY ?? baseCenter;
        const scaled = baseCenter + (value - baseCenter) * nodeScale;
        return scaled + offset.y;
      };

      const linkCurvature = 0.45;
      const linkPath = (data: { source: { x: number; y: number }; target: { x: number; y: number } }) => {
        const x0 = data.source.x;
        const x1 = data.target.x;
        const y0 = data.source.y;
        const y1 = data.target.y;
        const xi = d3.interpolateNumber(x0, x1);
        const x2 = xi(linkCurvature);
        const x3 = xi(1 - linkCurvature);
        return `M${x0},${y0}C${x2},${y0} ${x3},${y1} ${x1},${y1}`;
      };

      const buildLinkPath = (link: SankeyLinkExtended, dragOverride?: { nodeName: string; deltaX: number; deltaY: number }) => {
        const sourceNode = link.source as SankeyNodeExtended;
        const targetNode = link.target as SankeyNodeExtended;
        const sourceOffset = getClampedOffset(sourceNode, dragOverride);
        const targetOffset = getClampedOffset(targetNode, dragOverride);

        const sourcePoint = {
          x: (sourceNode.x1 || 0) + sourceOffset.x,
          y: scaleLinkY(sourceNode, link.y0, dragOverride),
        };
        const targetPoint = {
          x: (targetNode.x0 || 0) + targetOffset.x,
          y: scaleLinkY(targetNode, link.y1, dragOverride),
        };

        return linkPath({ source: sourcePoint, target: targetPoint });
      };

      // Links
      const linkGroup = svg.append('g').attr('class', 'links');

      linkGroup
        .selectAll('path')
        .data<SankeyLinkExtended>(graph.links)
        .join('path')
        .attr('d', (d) => buildLinkPath(d))
        .attr('fill', 'none')
        .attr('stroke', (d) => {
          const sourceNode = d.source as SankeyNodeExtended;
          const targetNode = d.target as SankeyNodeExtended;
          const sourceSettings = getNodeSettings(sourceNode.name);
          const targetSettings = getNodeSettings(targetNode.name);
          const sourceColor = sourceSettings.color;
          const targetColor = targetSettings.color;

          if (targetColor && targetSettings.linkColorPriority) return targetColor;
          if (sourceColor && sourceSettings.linkColorPriority) return sourceColor;
          if (sourceColor) return sourceColor;
          if (targetColor) return targetColor;

          return getFlowColor(d.flowType, settings.colors);
        })
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', (d) => {
          const scale = settings.linkWidthScale || 1;
          return Math.max(2, (d.width || 1) * scale);
        });

      // Images
      const imageGroup = svg.append('g').attr('class', 'images');
      const imageNodes = imageGroup
        .selectAll('g')
        .data(settings.images)
        .join('g')
        .attr('class', 'image-node')
        .attr('data-image-id', (d) => d.id)
        .attr('transform', (d) => `translate(${d.x},${d.y})`)
        .style('cursor', 'move')
        .on('click', (event, d) => {
          if (event.defaultPrevented) return;
          event.stopPropagation();
          onImageSelect(d.id);
        });

      imageNodes
        .append('rect')
        .attr('width', (d) => d.width)
        .attr('height', (d) => d.height)
        .attr('fill', 'none')
        .attr('stroke', (d) => (d.id === selectedImageId ? '#1a237e' : 'transparent'))
        .attr('stroke-width', 2)
        .attr('pointer-events', 'none');

      imageNodes
        .append('image')
        .attr('href', (d) => d.src)
        .attr('width', (d) => d.width)
        .attr('height', (d) => d.height)
        .attr('preserveAspectRatio', 'xMidYMid meet');

      const imageDrag = d3.drag<SVGGElement, typeof settings.images[number]>()
        .on('start', function(event, d) {
          imageDragRef.current = {
            id: d.id,
            startX: event.x,
            startY: event.y,
            x: d.x,
            y: d.y,
          };
          d3.select(this).raise();
        })
        .on('drag', function(event) {
          if (!imageDragRef.current) return;
          const deltaX = event.x - imageDragRef.current.startX;
          const deltaY = event.y - imageDragRef.current.startY;
          const nextX = imageDragRef.current.x + deltaX;
          const nextY = imageDragRef.current.y + deltaY;
          d3.select(this).attr('transform', `translate(${nextX},${nextY})`);
        })
        .on('end', function(event) {
          if (!imageDragRef.current) return;
          const deltaX = event.x - imageDragRef.current.startX;
          const deltaY = event.y - imageDragRef.current.startY;
          const nextX = imageDragRef.current.x + deltaX;
          const nextY = imageDragRef.current.y + deltaY;
          const moved = Math.hypot(deltaX, deltaY);
          if (moved < 2) {
            onImageSelect(imageDragRef.current.id);
          } else {
            onImageUpdate(imageDragRef.current.id, { x: nextX, y: nextY });
          }
          imageDragRef.current = null;
        });

      (imageNodes as unknown as d3.Selection<SVGGElement, typeof settings.images[number], SVGGElement, unknown>).call(imageDrag as unknown as (selection: d3.Selection<SVGGElement, typeof settings.images[number], SVGGElement, unknown>) => void);

      const resizeHandle = imageNodes
        .filter((d) => d.id === selectedImageId)
        .append('rect')
        .attr('class', 'image-resize-handle')
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 2)
        .attr('ry', 2)
        .attr('x', (d) => d.width - 12)
        .attr('y', (d) => d.height - 12)
        .attr('fill', '#1a237e');

      const resizeDrag = d3.drag<SVGRectElement, typeof settings.images[number]>()
        .on('start', function(event, d) {
          imageResizeRef.current = {
            id: d.id,
            startX: event.x,
            startY: event.y,
            width: d.width,
            height: d.height,
          };
          event.sourceEvent.stopPropagation();
        })
        .on('drag', function(event) {
          if (!imageResizeRef.current) return;
          const deltaX = event.x - imageResizeRef.current.startX;
          const deltaY = event.y - imageResizeRef.current.startY;
          const nextWidth = Math.max(30, imageResizeRef.current.width + deltaX);
          const nextHeight = Math.max(30, imageResizeRef.current.height + deltaY);
          const group = d3.select(this.parentNode as SVGGElement);
          group.select('image').attr('width', nextWidth).attr('height', nextHeight);
          group.select('rect').attr('width', nextWidth).attr('height', nextHeight);
          group.select('.image-resize-handle')
            .attr('x', nextWidth - 12)
            .attr('y', nextHeight - 12);
        })
        .on('end', function(event) {
          if (!imageResizeRef.current) return;
          const deltaX = event.x - imageResizeRef.current.startX;
          const deltaY = event.y - imageResizeRef.current.startY;
          const nextWidth = Math.max(30, imageResizeRef.current.width + deltaX);
          const nextHeight = Math.max(30, imageResizeRef.current.height + deltaY);
          onImageUpdate(imageResizeRef.current.id, { width: nextWidth, height: nextHeight });
          imageResizeRef.current = null;
        });

      (resizeHandle as unknown as d3.Selection<SVGRectElement, typeof settings.images[number], SVGGElement, unknown>).call(resizeDrag as unknown as (selection: d3.Selection<SVGRectElement, typeof settings.images[number], SVGGElement, unknown>) => void);

      // Nodes
      const nodeGroup = svg.append('g').attr('class', 'nodes');

      const nodeRects = nodeGroup
        .selectAll('g')
        .data(graph.nodes)
        .join('g')
        .attr('class', 'node-group')
        .attr('data-node-name', (d) => d.name)
        .attr('transform', (d) => {
          const box = getScaledNodeBox(d);
          return `translate(${box.x0},${box.y0})`;
        })
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          if (event.defaultPrevented) return;
          event.stopPropagation();
          onNodeSelect(d.name === selectedNode ? null : d.name);
        });

      // Add drag behavior
      const drag = d3.drag<SVGGElement, SankeyNodeExtended>()
        .on('start', function(event, d) {
          dragStartRef.current = {
            x: event.x,
            y: event.y,
            nodeName: d.name
          };
          d3.select(this).raise();
        })
        .on('drag', function(event) {
          if (!dragStartRef.current) return;
          const deltaX = event.x - dragStartRef.current.x;
          const deltaY = event.y - dragStartRef.current.y;

          dragOffsetRef.current = {
            nodeName: dragStartRef.current.nodeName,
            deltaX,
            deltaY,
          };

          d3.select(this).attr('transform', function() {
            const node = d3.select(this).datum() as SankeyNodeExtended;
            const box = getScaledNodeBox(node, dragOffsetRef.current || undefined);
            return `translate(${box.x0},${box.y0})`;
          });

          linkGroup
            .selectAll('path')
            .attr('d', (link) => buildLinkPath(link as SankeyLinkExtended, dragOffsetRef.current || undefined));
        })
        .on('end', function(event) {
          if (!dragStartRef.current) return;
          const nodeSettings = getNodeSettings(dragStartRef.current.nodeName);
          const currentOffsetX = nodeSettings.offsetX || 0;
          const currentOffsetY = nodeSettings.offsetY || 0;

          const deltaX = event.x - dragStartRef.current.x;
          const deltaY = event.y - dragStartRef.current.y;
          const moved = Math.hypot(deltaX, deltaY);

          if (moved < 2) {
            onNodeSelect(dragStartRef.current.nodeName === selectedNode ? null : dragStartRef.current.nodeName);
          } else {
            // Free movement - simply update the node position
            onNodeMove(
              dragStartRef.current.nodeName,
              currentOffsetX + deltaX,
              currentOffsetY + deltaY
            );
          }
          dragOffsetRef.current = null;
          dragStartRef.current = null;
        });

      (nodeRects as unknown as d3.Selection<SVGGElement, SankeyNodeExtended, SVGGElement, unknown>).call(drag as unknown as (selection: d3.Selection<SVGGElement, SankeyNodeExtended, SVGGElement, unknown>) => void);

      nodeRects
        .append('rect')
        .attr('width', (d) => (d.x1 || 0) - (d.x0 || 0))
        .attr('height', (d) => getScaledNodeBox(d).height)
        .attr('fill', (d) => {
          const nodeSettings = getNodeSettings(d.name);
          if (nodeSettings.color) return nodeSettings.color;

          const outLinks = graph.links.filter((l) => l.source === d);
          const inLinks = graph.links.filter((l) => l.target === d);
          const relevantLinks = outLinks.length > 0 ? outLinks : inLinks;
          if (relevantLinks.length > 0) {
            return getFlowColor(relevantLinks[0].flowType, settings.colors);
          }
          return '#888';
        })
        .attr('opacity', 0.9)
        .attr('stroke', (d) => d.name === selectedNode ? '#000' : 'none')
        .attr('stroke-width', (d) => d.name === selectedNode ? 2 : 0);

      // Node labels (left side - sources)
      nodeRects
        .filter((d) => (d.x0 || 0) < width / 2)
        .append('text')
        .attr('x', -10)
        .attr('y', (d) => {
          const nodeSettings = getNodeSettings(d.name);
          const labelSize = nodeSettings.labelSize || settings.nodeLabelSize || 12;
          const valueSize = nodeSettings.valueSize || settings.nodeValueSize || 11;
          const nodeHeight = getScaledNodeBox(d).height;
          const desired = nodeHeight / 2 - valueSize * 0.7;
          return Math.max(labelSize, desired);
        })
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('font-size', (d) => {
          const nodeSettings = getNodeSettings(d.name);
          return `${nodeSettings.labelSize || settings.nodeLabelSize || 12}px`;
        })
        .attr('font-weight', '500')
        .text((d) => d.name);

      // Node labels (right side - targets)
      nodeRects
        .filter((d) => (d.x0 || 0) >= width / 2)
        .append('text')
        .attr('x', (d) => ((d.x1 || 0) - (d.x0 || 0)) + 10)
        .attr('y', (d) => {
          const nodeSettings = getNodeSettings(d.name);
          const labelSize = nodeSettings.labelSize || settings.nodeLabelSize || 12;
          const valueSize = nodeSettings.valueSize || settings.nodeValueSize || 11;
          const nodeHeight = getScaledNodeBox(d).height;
          const desired = nodeHeight / 2 - valueSize * 0.7;
          return Math.max(labelSize, desired);
        })
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .attr('font-size', (d) => {
          const nodeSettings = getNodeSettings(d.name);
          return `${nodeSettings.labelSize || settings.nodeLabelSize || 12}px`;
        })
        .attr('font-weight', '500')
        .text((d) => d.name);

      // Values on nodes
      nodeRects.each(function (d) {
        const node = d3.select(this);
        const nodeHeight = getScaledNodeBox(d).height;
        const nodeSettings = getNodeSettings(d.name);
        const valueSize = nodeSettings.valueSize || settings.nodeValueSize || 11;
        const labelSize = nodeSettings.labelSize || settings.nodeLabelSize || 12;
        const labelY = Math.max(labelSize, nodeHeight / 2 - valueSize * 0.7);
        const valueY = labelY + labelSize + 6;

        const totalCurrent = (d.sourceLinks || []).reduce(
          (sum, l) => sum + l.currentValue,
          0
        ) || (d.targetLinks || []).reduce((sum, l) => sum + l.currentValue, 0);

        const totalPrevious = (d.sourceLinks || []).reduce(
          (sum, l) => sum + l.previousValue,
          0
        ) || (d.targetLinks || []).reduce((sum, l) => sum + l.previousValue, 0);

        if (totalCurrent > 0) {
          const change = calculateChange(totalCurrent, totalPrevious);
          const isLeft = (d.x0 || 0) < width / 2;

          const valueGroup = node.append('g').attr('class', 'value-label');

          valueGroup
            .append('text')
            .attr('x', isLeft ? -10 : ((d.x1 || 0) - (d.x0 || 0)) + 10)
            .attr('y', valueY)
            .attr('text-anchor', isLeft ? 'end' : 'start')
            .attr('font-size', `${valueSize}px`)
            .attr('fill', '#666')
            .text(`${formatNumber(totalCurrent)} ${settings.unitLabel}`);

          if (totalPrevious > 0) {
            const changeText = change.value >= 0 ? `+${formatNumber(change.value)}` : formatNumber(change.value);
            const percentText = `(${change.percent >= 0 ? '+' : ''}${change.percent.toFixed(0)}%)`;

            valueGroup
              .append('text')
              .attr('x', isLeft ? -10 : ((d.x1 || 0) - (d.x0 || 0)) + 10)
              .attr('y', valueY + valueSize + 4)
              .attr('text-anchor', isLeft ? 'end' : 'start')
              .attr('font-size', `${valueSize - 1}px`)
              .attr('fill', change.value >= 0 ? '#2e7d32' : '#c62828')
              .text(`${changeText} ${settings.unitLabel} ${percentText}`);
          }
        }
      });

      // Click outside to deselect
      svg.on('click', () => {
        onImageSelect(null);
        onNodeSelect(null);
      });

    }, [rows, settings, selectedNode, selectedImageId, onNodeSelect, onNodeMove, onImageSelect, onImageUpdate, getNodeSettings]);

    return (
      <div className="sankey-chart-container">
        <svg ref={svgRef} className="sankey-chart" />
      </div>
    );
  }
);

SankeyChart.displayName = 'SankeyChart';
