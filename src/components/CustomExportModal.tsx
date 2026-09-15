import React, { useState, useMemo } from 'react';
import { AttendanceRow } from '../types';
import { exportToCSV, exportToXLSX } from '../utils/csv';
import { X, SlidersHorizontal, Plus, Trash2, Download, FileSpreadsheet, CheckSquare, Square, AlertTriangle } from 'lucide-react';

interface CustomExportRule {
  id: string;
  field: string;
  operator: 'contains' | 'equals' | 'starts_with';
  value: string;
}

interface CustomExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  data: AttendanceRow[];
}

export const CustomExportModal: React.FC<CustomExportModalProps> = ({
  isOpen,
  onClose,
  headers,
  data,
}) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([...headers]);
  const [logicConnector, setLogicConnector] = useState<'AND' | 'OR'>('AND');
  const [rules, setRules] = useState<CustomExportRule[]>([
    {
      id: 'rule-1',
      field: headers[1] || headers[0] || 'Participant Name',
      operator: 'contains',
      value: '',
    },
  ]);
  const [fileName, setFileName] = useState('custom_attendance_export');

  const handleToggleColumn = (header: string) => {
    setSelectedColumns((prev) =>
      prev.includes(header) ? prev.filter((h) => h !== header) : [...prev, header]
    );
  };

  const handleSelectAllColumns = () => setSelectedColumns([...headers]);
  const handleClearAllColumns = () => setSelectedColumns([]);

  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: `rule-${Date.now()}`,
        field: headers[0] || 'Participant Name',
        operator: 'contains',
        value: '',
      },
    ]);
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRule = (id: string, updates: Partial<CustomExportRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const filteredData = useMemo(() => {
    const activeRules = rules.filter((r) => r.value.trim().length > 0);
    if (activeRules.length === 0) {
      return data;
    }

    return data.filter((row) => {
      const matchResults = activeRules.map((rule) => {
        const cellValue = String(row[rule.field] || '').toLowerCase().trim();
        const testValue = rule.value.toLowerCase().trim();

        if (rule.operator === 'equals') {
          return cellValue === testValue;
        } else if (rule.operator === 'starts_with') {
          return cellValue.startsWith(testValue);
        } else {
          return cellValue.includes(testValue);
        }
      });

      if (logicConnector === 'AND') {
        return matchResults.every(Boolean);
      } else {
        return matchResults.some(Boolean);
      }
    });
  }, [data, rules, logicConnector]);

  const excludedFilteredColumns = useMemo(() => {
    const activeRules = rules.filter((r) => r.value.trim().length > 0);
    const set = new Set<string>();
    activeRules.forEach((r) => {
      if (!selectedColumns.includes(r.field)) {
        set.add(r.field);
      }
    });
    return Array.from(set);
  }, [rules, selectedColumns]);

  if (!isOpen) return null;

  const getPreparedData = () => {
    return filteredData.map((row) => {
      const picked: AttendanceRow = {};
      selectedColumns.forEach((col) => {
        picked[col] = row[col] || '';
      });
      return picked;
    });
  };

  const handleDownloadCSV = () => {
    if (selectedColumns.length === 0) {
      alert('Please select at least one column to export.');
      return;
    }
    const prepared = getPreparedData();
    exportToCSV(prepared, selectedColumns, `${fileName.trim() || 'custom_export'}.csv`);
    onClose();
  };

  const handleDownloadXLSX = () => {
    if (selectedColumns.length === 0) {
      alert('Please select at least one column to export.');
      return;
    }
    const prepared = getPreparedData();
    exportToXLSX(prepared, selectedColumns, `${fileName.trim() || 'custom_export'}.xlsx`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Custom Filtered Export</h2>
              <p className="text-xs text-gray-500">
                Choose specific columns and combine filter rules with AND / OR logic.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {excludedFilteredColumns.length > 0 && (
            <div
              id="export-column-exclusion-warning"
              className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs animate-in fade-in"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">Column Filtering Notice:</p>
                <p className="mt-0.5 leading-relaxed">
                  You are currently filtering data based on column(s):{' '}
                  <span className="font-bold underline">{excludedFilteredColumns.join(', ')}</span>, but{' '}
                  {excludedFilteredColumns.length === 1 ? 'this column is' : 'these columns are'} excluded from the exported output.
                  The export will contain only rows matching these conditions without showing the filtered column itself.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Column Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                1. Select Columns to Include ({selectedColumns.length} of {headers.length} selected):
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllColumns}
                  className="text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleClearAllColumns}
                  className="text-gray-500 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
              {headers.map((col) => {
                const isChecked = selectedColumns.includes(col);
                return (
                  <label
                    key={col}
                    onClick={() => handleToggleColumn(col)}
                    className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer select-none transition-all ${
                      isChecked
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <span className="truncate" title={col}>
                      {col}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 2: Conditional Rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                2. Filter Conditions (AND / OR Logic):
              </label>
              <div className="flex items-center gap-1.5 bg-gray-100 p-0.5 rounded border border-gray-200">
                <span className="text-2xs font-bold px-1.5 text-gray-500">Connector:</span>
                <button
                  type="button"
                  onClick={() => setLogicConnector('AND')}
                  className={`px-2 py-0.5 text-xs rounded font-bold transition-all cursor-pointer ${
                    logicConnector === 'AND'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="All rules must match"
                >
                  AND
                </button>
                <button
                  type="button"
                  onClick={() => setLogicConnector('OR')}
                  className={`px-2 py-0.5 text-xs rounded font-bold transition-all cursor-pointer ${
                    logicConnector === 'OR'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Any rule can match"
                >
                  OR
                </button>
              </div>
            </div>

            <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
              {rules.map((rule, idx) => (
                <div key={rule.id} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {idx > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 font-bold text-2xs rounded shrink-0">
                      {logicConnector}
                    </span>
                  )}

                  <select
                    value={rule.field}
                    onChange={(e) => handleUpdateRule(rule.id, { field: e.target.value })}
                    className="text-xs bg-white border border-gray-300 rounded px-2 py-1.5 font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>

                  <select
                    value={rule.operator}
                    onChange={(e) =>
                      handleUpdateRule(rule.id, {
                        operator: e.target.value as 'contains' | 'equals' | 'starts_with',
                      })
                    }
                    className="text-xs bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="contains">contains</option>
                    <option value="equals">equals exactly</option>
                    <option value="starts_with">starts with</option>
                  </select>

                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                    placeholder="e.g. John or 09-03-2026..."
                    className="text-xs flex-1 bg-white border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />

                  {rules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                      title="Remove condition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddRule}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Condition ({logicConnector})
              </button>
            </div>
          </div>

          {/* Section 3: File Name & Match Preview */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="custom-filename-input" className="block text-2xs font-bold text-gray-600 uppercase mb-1">
                Export File Name:
              </label>
              <input
                id="custom-filename-input"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-gray-50 border border-gray-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg text-xs text-indigo-900 font-semibold self-end">
              Matching Records: {filteredData.length} of {data.length} rows
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button type="button" onClick={onClose} className="btn btn-secondary text-xs py-1.5 px-4 cursor-pointer">
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={selectedColumns.length === 0 || filteredData.length === 0}
              className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export CSV (.csv)
            </button>

            <button
              type="button"
              onClick={handleDownloadXLSX}
              disabled={selectedColumns.length === 0 || filteredData.length === 0}
              className="btn btn-success text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-xs font-semibold rounded disabled:opacity-40 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
