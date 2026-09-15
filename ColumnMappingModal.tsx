import React, { useState } from 'react';
import { MASTER_HEADERS, findBestHeaderMatch } from '../utils/csv';
import { X, ArrowRight, Check, MoveRight, Layers, HelpCircle, GripVertical } from 'lucide-react';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedHeaders: string[];
  onConfirmMapping: (mapping: Record<string, string>) => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  detectedHeaders,
  onConfirmMapping,
}) => {
  // Mapping: sourceHeader -> masterHeader
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    detectedHeaders.forEach((source) => {
      const match = findBestHeaderMatch(source);
      if (match) {
        initial[source] = match;
      } else if (MASTER_HEADERS.includes(source)) {
        initial[source] = source;
      } else {
        initial[source] = source; // Keep as custom column
      }
    });
    return initial;
  });

  const [draggedSourceHeader, setDraggedSourceHeader] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDragStart = (e: React.DragEvent, sourceHeader: string) => {
    setDraggedSourceHeader(sourceHeader);
    e.dataTransfer.setData('text/plain', sourceHeader);
  };

  const handleDropOnMaster = (e: React.DragEvent, masterHeader: string) => {
    e.preventDefault();
    const source = draggedSourceHeader || e.dataTransfer.getData('text/plain');
    if (source) {
      setMapping((prev) => ({ ...prev, [source]: masterHeader }));
    }
    setDraggedSourceHeader(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSelectChange = (sourceHeader: string, targetMaster: string) => {
    setMapping((prev) => ({ ...prev, [sourceHeader]: targetMaster }));
  };

  const handleResetToAuto = () => {
    const auto: Record<string, string> = {};
    detectedHeaders.forEach((source) => {
      const match = findBestHeaderMatch(source);
      if (match) auto[source] = match;
      else auto[source] = source;
    });
    setMapping(auto);
  };

  const handleConfirm = () => {
    onConfirmMapping(mapping);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Drag-and-Drop Column Mapping</h2>
              <p className="text-xs text-gray-500">
                Map incoming CSV columns to the Master Template before finalizing data merge.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Drag incoming column badges to target template fields, or choose from the dropdown menu.
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetToAuto}
              className="text-2xs font-bold text-blue-700 hover:underline shrink-0 cursor-pointer"
            >
              Reset Auto-Mapping
            </button>
          </div>

          {/* Master Template Target Slots */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Master Template Slots & Mapped Sources:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MASTER_HEADERS.map((master) => {
                // Find which source headers are mapped to this master header
                const mappedSources = Object.entries(mapping)
                  .filter(([_, target]) => target === master)
                  .map(([src]) => src);

                return (
                  <div
                    key={master}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnMaster(e, master)}
                    className="p-3 bg-gray-50 border border-gray-300 rounded-lg flex flex-col justify-between gap-2 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">{master}</span>
                      {mappedSources.length > 0 && (
                        <span className="text-2xs bg-green-100 text-green-800 font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3 text-green-600" />
                          Mapped
                        </span>
                      )}
                    </div>

                    {/* Drop Target Box */}
                    <div className="min-h-[36px] bg-white border border-dashed border-gray-300 rounded p-1.5 flex flex-wrap items-center gap-1.5">
                      {mappedSources.length === 0 ? (
                        <span className="text-2xs text-gray-400 italic px-1">
                          Drop incoming header here or choose below
                        </span>
                      ) : (
                        mappedSources.map((src) => (
                          <span
                            key={src}
                            draggable
                            onDragStart={(e) => handleDragStart(e, src)}
                            className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded shadow-2xs cursor-grab active:cursor-grabbing"
                            title="Drag to reassign"
                          >
                            <GripVertical className="w-3 h-3 text-blue-400" />
                            {src}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Incoming Column List with Dropdowns */}
          <div className="pt-2">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              All Detected Incoming Headers ({detectedHeaders.length}):
            </div>

            <div className="space-y-1.5 border border-gray-200 rounded-lg p-3 bg-white divide-y divide-gray-100">
              {detectedHeaders.map((source) => {
                const currentTarget = mapping[source] || source;
                return (
                  <div
                    key={source}
                    className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0 gap-3"
                  >
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, source)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-800 bg-gray-100 hover:bg-blue-50 px-2.5 py-1 rounded border border-gray-200 cursor-grab active:cursor-grabbing"
                      title="Drag this header into a master template box above"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-semibold">{source}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MoveRight className="w-3.5 h-3.5 text-gray-400" />
                      <select
                        value={currentTarget}
                        onChange={(e) => handleSelectChange(source, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value={source}>Keep as Custom: "{source}"</option>
                        <optgroup label="Master Template Columns">
                          {MASTER_HEADERS.map((h) => (
                            <option key={h} value={h}>
                              → {h}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary text-xs py-1.5 px-4 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="btn btn-primary text-xs py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>Finalize & Merge Data</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
