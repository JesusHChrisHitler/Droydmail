import { useState, useRef } from 'react';
import { UploadIcon } from '../icons';

export function FileUpload({ label, accept, onChange, preview, maxSize = '2MB', className = '' }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onChange(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onChange(file);
  };

  return (
    <div className={`form-group ${className}`}>
      {label && <label className="form-label">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`cursor-pointer border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/10' : 'border-border-light hover:border-primary'
        }`}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-32 mx-auto rounded" />
        ) : (
          <div className="text-gray-400">
            <UploadIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Click or drag to upload</p>
            <p className="text-xs text-gray-500 mt-1">Max {maxSize}</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      </div>
    </div>
  );
}