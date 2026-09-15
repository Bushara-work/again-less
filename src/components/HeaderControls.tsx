import React from 'react';
import { SortConfig, TimeMode, DragOrientation } from '../types';
import {
  Download,
  ArrowLeft,
  Clock,
  Lock,
  LockOpen,
  Undo2,
  Redo2,
  FileSpreadsheet,
  GraduationCap,
} from 'lucide-react';
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown';

interface HeaderControlsProps {
  sortConfig: SortConfig;
  onUpdateSortConfig: (config: Partial<SortConfig>) => void;
  timeMode: TimeMode;
  onToggleTimeMode: () => void;
  isDragReorderModeActive: boolean;
  onToggleDragReorder: () => void;
  dragOrientation: DragOrientation;
  onToggleDragOrientation: () => void;
  onGoBack: () => void;
  onDownloadCSV: () => void;
  onDownloadXLSX: () => void;
  onOpenCustomExport: () => void;
  onOpenStudentSummary: () => void;
  onOpenFindReplace?: () => void;
  allHeaders: string[];
  hiddenHeaders: string[];
  onToggleHeaderVisibility: (header: string) => void;
  onResetVisibility: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const HeaderControls: React.FC<HeaderControlsProps> = ({
  sortConfig,
  onUpdateSortConfig,
  timeMode,
  onToggleTimeMode,
  isDragReorderModeActive,
  onToggleDragReorder,
  dragOrientation,
  onToggleDragOrientation,
  onGoBack,
  onDownloadCSV,
  onDownloadXLSX,
  onOpenCustomExport,
  onOpenStudentSummary,
  allHeaders,
  hiddenHeaders,
  onToggleHeaderVisibility,
  onResetVisibility,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const { nameOrder, dateOrder, isNamePriorityPrimary, isRankLocked } = sortConfig;

  const handleRankLockToggle = () => {
    onUpdateSortConfig({ isRankLocked: !isRankLocked });
  };

  const handlePriorityToggle = () => {
    if (isRankLocked) return;
    onUpdateSortConfig({ isNamePriorityPrimary: !isNamePriorityPrimary });
  };

  const glyph = dragOrientation === 'vertical' ? '||' : '═';

  return (
    <div className="stage-2-header flex flex-col gap-3">
      {/* Top Header Row */}
      <div className="header-row-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="back-btn"
            onClick={onGoBack}
            className="btn btn-secondary text-sm flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Upload Another File</span>
          </button>

          {/* Summary Modal Trigger */}
          <button
            type="button"
            id="student-dashboard-btn"
            onClick={onOpenStudentSummary}
            className="btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 py-1.5 px-3 rounded-lg shadow-2xs transition-all cursor-pointer"
            title="Open Student Attendance Summary"
          >
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Summary</span>
          </button>
        </div>

        {/* Right side: Column Visibility & Export Suite (Personalized export removed from left of Excel) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Column Visibility */}
          <ColumnVisibilityDropdown
            allHeaders={allHeaders}
            hiddenHeaders={hiddenHeaders}
            onToggleHeaderVisibility={onToggleHeaderVisibility}
            onResetVisibility={onResetVisibility}
          />

          {/* Excel (.xlsx) Export */}
          <button
            type="button"
            id="export-xlsx-btn"
            onClick={onDownloadXLSX}
            className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 py-1.5 px-3 rounded shadow-xs cursor-pointer"
            title="Download formatted Excel workbook (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* CSV Export */}
          <button
            type="button"
            id="export-csv-btn"
            onClick={onDownloadCSV}
            className="btn btn-primary text-xs sm:text-sm font-semibold flex items-center gap-1.5 py-1.5 px-3 rounded shadow-xs cursor-pointer"
            title="Download full master CSV file"
          >
            <Download className="w-4 h-4" />
            <span>CSV (.csv)</span>
          </button>
        </div>
      </div>

      {/* Second Row: Sorting, Undo/Redo, Time Format & Organize Mode */}
      <div className="header-row-2 flex flex-wrap items-center justify-between gap-3">
        {/* Sorting controls */}
        <div className="sort-controls flex flex-wrap items-center gap-2.5 bg-white border border-gray-300 px-3 py-2 rounded-lg shadow-2xs text-sm">
          {/* Name Order */}
          <div className="control-group flex items-center gap-1.5">
            <label htmlFor="name-sort-rule" className="font-semibold text-gray-700 text-xs sm:text-sm">
              Name Order:
            </label>
            <select
              id="name-sort-rule"
              value={nameOrder}
              disabled={isRankLocked}
              onChange={(e) => onUpdateSortConfig({ nameOrder: e.target.value as 'asc' | 'desc' })}
              className="border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 font-medium text-xs sm:text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="asc">Alphabetical (A → Z)</option>
              <option value="desc">Reverse Alphabetical (Z → A)</option>
            </select>
          </div>

          {/* Priority Switch */}
          <button
            type="button"
            id="priority-switch-btn"
            disabled={isRankLocked}
            onClick={handlePriorityToggle}
            className="switch-btn text-xs font-semibold py-1 px-2.5"
            title={isRankLocked ? 'Sort configuration is locked' : 'Switch primary priority'}
          >
            {isNamePriorityPrimary ? 'Name Priority First ⇄' : 'Date Priority First ⇄'}
          </button>

          {/* Date Order */}
          <div className="control-group flex items-center gap-1.5">
            <label htmlFor="date-sort-rule" className="font-semibold text-gray-700 text-xs sm:text-sm">
              Date Order:
            </label>
            <select
              id="date-sort-rule"
              value={dateOrder}
              disabled={isRankLocked}
              onChange={(e) => onUpdateSortConfig({ dateOrder: e.target.value as 'asc' | 'desc' })}
              className="border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 font-medium text-xs sm:text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="asc">Earliest First (Old → New)</option>
              <option value="desc">Latest First (New → Old)</option>
            </select>
          </div>

          {/* Lock In Priority Toggle Button */}
          <button
            type="button"
            id="rank-lock-btn"
            onClick={handleRankLockToggle}
            className={`p-1.5 rounded-md transition-all flex items-center justify-center cursor-pointer ${
              isRankLocked
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-300 shadow-2xs'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 border border-transparent'
            }`}
            title={isRankLocked ? 'Sort configuration is LOCKED. Click to unlock.' : 'Lock sort configuration'}
            aria-label="Toggle sort configuration lock"
          >
            {isRankLocked ? (
              <Lock className="w-4 h-4 text-red-600" />
            ) : (
              <LockOpen className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {/* Action Controls: Undo, Redo, Time Format & Organize Mode */}
        <div className="vertical-button-stack flex items-center gap-2 flex-wrap">
          {/* Undo Button */}
          <button
            type="button"
            id="undo-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded border border-gray-300 bg-white text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-all cursor-pointer"
            title="Undo last change (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5 text-gray-600" />
            <span>Undo</span>
          </button>

          {/* Redo Button */}
          <button
            type="button"
            id="redo-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded border border-gray-300 bg-white text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-all cursor-pointer"
            title="Redo last undone change (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5 text-gray-600" />
            <span>Redo</span>
          </button>

          {/* Time Format Button */}
          <button
            type="button"
            id="time-convert-btn"
            onClick={onToggleTimeMode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded border border-gray-300 bg-white text-gray-700 shadow-2xs hover:bg-gray-50 transition-all cursor-pointer"
            title="Toggle between 12-hour AM/PM and 24-hour military timestamps"
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Time Format ({timeMode === '12h' ? '12h' : '24h'})</span>
          </button>

          {/* Organize Button */}
          <button
            type="button"
            id="toggle-reorder-btn"
            onClick={onToggleDragReorder}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded border transition-all cursor-pointer ${
              isDragReorderModeActive
                ? 'bg-white text-gray-700 border-gray-300 shadow-2xs hover:bg-gray-50'
                : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200 hover:text-gray-600'
            }`}
            title="Toggle Drag & Drop organize mode"
          >
            <span className={isDragReorderModeActive ? 'text-gray-700 font-normal' : 'text-gray-400 font-normal'}>
              Organize
            </span>
            <span
              className="sub-toggle-pill select-none font-medium"
              style={{
                color: isDragReorderModeActive ? '#374151' : '#9ca3af',
                background: isDragReorderModeActive ? '#f3f4f6' : '#e5e7eb',
                border: isDragReorderModeActive ? '1px solid #d1d5db' : '1px solid #e5e7eb',
                cursor: isDragReorderModeActive ? 'pointer' : 'not-allowed',
                padding: '1px 6px',
                borderRadius: '3px',
                marginLeft: '4px',
                fontSize: '11px',
              }}
              onClick={(e) => {
                if (isDragReorderModeActive) {
                  e.stopPropagation();
                  onToggleDragOrientation();
                }
              }}
              title={
                isDragReorderModeActive
                  ? `Click to switch to ${dragOrientation === 'vertical' ? 'Rows (═)' : 'Columns (||)'}`
                  : 'Enable organize mode to switch orientation'
              }
            >
              {glyph}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
