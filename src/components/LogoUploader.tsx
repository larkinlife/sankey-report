import React, { useRef } from 'react';

interface LogoUploaderProps {
  logo: string | null;
  onChange: (logo: string | null) => void;
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({ logo, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="logo-uploader">
      <h3>Логотип компании</h3>
      <div className="logo-content">
        {logo ? (
          <div className="logo-preview-container">
            <img src={logo} alt="Логотип" className="logo-preview" />
            <button onClick={handleRemove} className="remove-logo-btn">
              Удалить
            </button>
          </div>
        ) : (
          <div className="logo-upload-area">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div className="upload-label" onClick={handleUploadClick}>
              Нажмите для загрузки логотипа
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
