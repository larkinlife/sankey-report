import React, { useRef } from 'react';
import type { PlacedImage } from '../types';

interface ImageManagerProps {
  images: PlacedImage[];
  selectedImageId: string | null;
  chartWidth: number;
  chartHeight: number;
  onAdd: (image: PlacedImage) => void;
  onUpdate: (id: string, updates: Partial<PlacedImage>) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string | null) => void;
}

export const ImageManager: React.FC<ImageManagerProps> = ({
  images,
  selectedImageId,
  chartWidth,
  chartHeight,
  onAdd,
  onUpdate,
  onRemove,
  onSelect,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const id = `img-${Date.now()}`;
      const image: PlacedImage = {
        id,
        src: reader.result as string,
        x: 120,
        y: 140,
        width: 160,
        height: 120,
      };
      onAdd(image);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const selectedImage = images.find((image) => image.id === selectedImageId) || null;

  return (
    <div className="image-manager">
      <h3>Изображения</h3>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button className="add-image-btn" onClick={handleUploadClick}>
        + Добавить изображение
      </button>

      {images.length > 0 && (
        <div className="image-list">
          {images.map((image) => (
            <div
              key={image.id}
              className={`image-list-item ${image.id === selectedImageId ? 'active' : ''}`}
            >
              <button
                className="image-select-btn"
                onClick={() => onSelect(image.id)}
              >
                Изображение {image.id.replace('img-', '')}
              </button>
              <button
                className="image-remove-btn"
                onClick={() => onRemove(image.id)}
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div className="image-controls">
          <div className="range-row">
            <label>Позиция: {Math.round(selectedImage.x)} × {Math.round(selectedImage.y)}</label>
            <div className="range-controls">
              <input
                type="range"
                min="0"
                max={Math.max(400, chartWidth)}
                value={selectedImage.x}
                onChange={(e) => onUpdate(selectedImage.id, { x: parseInt(e.target.value, 10) })}
              />
              <input
                type="range"
                min="0"
                max={Math.max(300, chartHeight)}
                value={selectedImage.y}
                onChange={(e) => onUpdate(selectedImage.id, { y: parseInt(e.target.value, 10) })}
              />
            </div>
          </div>

          <div className="range-row">
            <label>Размер: {selectedImage.width}px × {selectedImage.height}px</label>
            <div className="range-controls">
              <input
                type="range"
                min="40"
                max="600"
                value={selectedImage.width}
                onChange={(e) => onUpdate(selectedImage.id, { width: parseInt(e.target.value, 10) })}
              />
              <input
                type="range"
                min="30"
                max="600"
                value={selectedImage.height}
                onChange={(e) => onUpdate(selectedImage.id, { height: parseInt(e.target.value, 10) })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
