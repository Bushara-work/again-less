import React, { useRef, useState } from 'react';
import { Upload, FileText, X, Sparkles } from 'lucide-react';

interface Stage1UploadProps {
  files: File[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveFile: (index: number) => void;
  onProcessFiles: () => void;
  onLoadDemoData: () => void;
}

export const Stage1Upload: React.FC<Stage1UploadProps> = ({
  files,
  onAddFiles,
  onRemoveFile,
  onProcessFiles,
  onLoadDemoData,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div id="stage-1" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Stage 1: Upload Attendance CSV Files</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Add multiple CSV files to merge. File names with dates like <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">Attendance (12-May-2024).csv</code> will auto-populate the Class Date.
          </p>
        </div>
        <button
          type="button"
          onClick={onLoadDemoData}
          className="btn btn-secondary text-xs sm:text-sm py-1.5 px-3 self-start sm:self-auto border border-gray-300 cursor-pointer"
          title="Populate with sample attendance files to try out features"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Load Sample Attendance Data
        </button>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        id="upload-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center bg-white cursor-pointer transition-all duration-200 shadow-sm ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="csv-picker"
          multiple
          accept=".csv"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
          <Upload className="w-7 h-7" />
        </div>
        <button
          type="button"
          className="btn btn-primary pointer-events-none mb-2 px-6 shadow-sm"
        >
          Select CSV Files
        </button>
        <p className="text-gray-500 text-sm mt-2">
          Click to browse or drag and drop your <span className="font-semibold text-gray-700">.csv</span> files here
        </p>
        <p className="text-xs text-gray-400 mt-1">Supports multiple file selection • 100% Client-side offline processing</p>
      </div>

      {/* Uploaded Files Queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Uploaded Files Queue
            {files.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </span>
            )}
          </h4>
          {files.length > 0 && (
            <span className="text-xs text-gray-500">
              Total items queued: {files.length}
            </span>
          )}
        </div>

        <div className="file-list max-w-2xl space-y-2">
          {files.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200 text-gray-400 text-sm italic">
              No files selected yet. Drag CSV files above or click to select.
            </div>
          ) : (
            files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="file-item flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-xs hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded bg-green-50 text-green-700 flex items-center justify-center font-bold text-xs shrink-0">
                    CSV
                  </div>
                  <div className="truncate">
                    <p className="file-name text-sm font-medium text-gray-800 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="remove-btn text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(idx);
                  }}
                  title="Remove file"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-2">
        <button
          type="button"
          id="next-btn"
          onClick={onProcessFiles}
          disabled={files.length === 0}
          className={`btn btn-primary px-8 py-3 text-base shadow-sm cursor-pointer ${
            files.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow'
          }`}
        >
          Combine & Process Data ({files.length} {files.length === 1 ? 'file' : 'files'}) →
        </button>
      </div>
    </div>
  );
};
