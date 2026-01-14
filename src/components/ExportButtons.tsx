import React from 'react';

interface ExportButtonsProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  filename: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ svgRef, filename }) => {
  const getSvgString = (): string | null => {
    if (!svgRef.current) return null;

    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();

    // Clone the SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

    // Add necessary attributes for standalone SVG
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    // Get computed styles and add as inline styles
    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleElement.textContent = `
      text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    `;
    svgClone.insertBefore(styleElement, svgClone.firstChild);

    // Add white background rect
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', 'white');
    svgClone.insertBefore(bgRect, svgClone.firstChild);

    return serializer.serializeToString(svgClone);
  };

  const handleExportPng = async () => {
    const svgString = getSvgString();
    if (!svgString) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        // Set canvas size with higher resolution
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.scale(scale, scale);

        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, img.width, img.height);

        // Draw SVG
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        // Export as PNG
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
          }
        }, 'image/png');
      };

      img.onerror = (err) => {
        console.error('Error loading SVG:', err);
        alert('Ошибка при экспорте в PNG');
      };

      img.src = url;
    } catch (err) {
      console.error('Export PNG failed:', err);
      alert('Ошибка при экспорте в PNG');
    }
  };

  const handleExportSvg = () => {
    const svgString = getSvgString();
    if (!svgString) return;

    try {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.download = `${filename}.svg`;
      link.href = url;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export SVG failed:', err);
      alert('Ошибка при экспорте в SVG');
    }
  };

  return (
    <div className="export-buttons">
      <button onClick={handleExportPng} className="export-btn export-png">
        Скачать PNG
      </button>
      <button onClick={handleExportSvg} className="export-btn export-svg">
        Скачать SVG
      </button>
    </div>
  );
};
