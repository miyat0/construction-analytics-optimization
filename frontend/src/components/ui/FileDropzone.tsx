import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";

import "./FileDropzone.css";

interface FileDropzoneProps {
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FileDropzone = ({
  file,
  onChange,
  accept,
  hint = "PDF, DOCX, XLSX, images and supported project files",
  disabled = false,
  compact = false,
}: FileDropzoneProps) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const next = files?.[0] ?? null;
    onChange(next);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const openPicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div className={`file-dropzone${compact ? " file-dropzone--compact" : ""}`}>
      <input
        id={inputId}
        ref={inputRef}
        className="file-dropzone__input"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => handleFiles(event.target.files)}
      />

      {!file ? (
        <div
          className={`file-dropzone__area${isDragging ? " is-dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span className="file-dropzone__icon" aria-hidden="true">
            <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
              <path
                d="M12 16V4m0 0 4 4m-4-4-4 4M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              />
            </svg>
          </span>
          <p className="file-dropzone__title">
            Drop a file here or{" "}
            <button
              type="button"
              className="file-dropzone__browse-link"
              disabled={disabled}
              onClick={openPicker}
            >
              Browse files
            </button>
          </p>
          <p className="file-dropzone__hint">{hint}</p>
        </div>
      ) : (
        <div className="file-dropzone__selected">
          <div className="file-dropzone__selected-main">
            <span className="file-dropzone__file-icon" aria-hidden="true">
              <svg fill="none" height="18" viewBox="0 0 16 16" width="18">
                <path
                  d="M4.5 2.5h5.1L12.5 5.4v8.1A1 1 0 0 1 11.5 14.5h-7a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path d="M9.5 2.5V5.5h3" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </span>
            <div className="file-dropzone__selected-meta">
              <strong className="file-dropzone__file-name">{file.name}</strong>
              <span className="file-dropzone__file-size">{formatFileSize(file.size)}</span>
            </div>
          </div>
          <button
            type="button"
            className="file-dropzone__remove"
            disabled={disabled}
            onClick={() => {
              onChange(null);
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
