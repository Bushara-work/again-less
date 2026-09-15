import React, { useState } from 'react';
import { X, Plus, Columns } from 'lucide-react';

interface InsertColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetColumnKey: string | null;
  existingHeaders: string[];
  onConfirmInsert: (targetColumnKey: string, newColumnName: string) => void;
}

export const InsertColumnModal: React.FC<InsertColumnModalProps> = ({
  isOpen,
  onClose,
  targetColumnKey,
  existingHeaders,
  onConfirmInsert,
}) => {
  const [columnName, setColumnName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !targetColumnKey) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = columnName.trim();
    if (!clean) {
      setError('Column name cannot be empty.');
      return;
    }
    if (existingHeaders.some((h) => h.toLowerCase() === clean.toLowerCase())) {
      setError('A column with this name already exists.');
      return;
    }

    onConfirmInsert(targetColumnKey, clean);
    setColumnName('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
              <Columns className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Insert Column Left</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <p className="text-xs text-gray-600">
            Insert a new custom column immediately to the left of{' '}
            <strong className="text-blue-700 font-semibold">{targetColumnKey}</strong>:
          </p>

          <div>
            <label htmlFor="insert-col-name" className="block text-2xs font-bold text-gray-700 uppercase mb-1">
              New Column Header Name:
            </label>
            <input
              id="insert-col-name"
              type="text"
              value={columnName}
              onChange={(e) => {
                setColumnName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Student ID or Grade..."
              className="w-full text-xs px-3 py-1.5 bg-gray-50 border border-gray-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              autoFocus
            />
            {error && <p className="text-2xs text-red-600 mt-1 font-semibold">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-xs py-1.5 px-3 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary text-xs py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Insert Column
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
