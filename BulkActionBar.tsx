import React from 'react';
import { Trash2, Download, FileSpreadsheet, X, CheckSquare } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onDeleteSelected: () => void;
  onExportCSV: () => void;
  onExportXLSX: () => void;
  onClearSelection: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  onDeleteSelected,
  onExportCSV,
  onExportXLSX,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-gray-700 flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-150">
      <div className="flex items-center gap-2 pr-2 border-r border-gray-700">
        <CheckSquare className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold">
          <strong className="text-white font-bold">{selectedCount}</strong> of {totalCount} row(s) selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDeleteSelected}
          className="btn bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-3 rounded-md flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          title="Delete selected rows (can be undone with Undo)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete ({selectedCount})</span>
        </button>

        <button
          type="button"
          onClick={onExportCSV}
          className="btn bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-semibold py-1.5 px-3 rounded-md border border-gray-600 flex items-center gap-1.5 cursor-pointer transition-colors"
          title="Export selected rows as CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>

        <button
          type="button"
          onClick={onExportXLSX}
          className="btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 px-3 rounded-md flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          title="Export selected rows as Excel (.xlsx)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onClearSelection}
        className="text-gray-400 hover:text-white pl-2 border-l border-gray-700 p-1 hover:bg-gray-800 rounded cursor-pointer"
        title="Clear row selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
