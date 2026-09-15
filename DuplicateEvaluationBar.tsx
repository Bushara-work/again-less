import React from 'react';
import { DuplicateGroup, DuplicateViewScope } from '../types';
import { Check, EyeOff, ArrowRight, ArrowLeft, X, Trash2, RefreshCw } from 'lucide-react';

interface DuplicateEvaluationBarProps {
  groups: DuplicateGroup[];
  currentIndex: number;
  headers: string[];
  viewScope: DuplicateViewScope;
  liveMatchingRows?: { masterIndex: number; displayRowNumber: number }[];
  onSelectViewScope: (scope: DuplicateViewScope) => void;
  onReevaluateDuplicates: () => void;
  onSelectIndex: (index: number) => void;
  onApproveGroup: (index: number) => void;
  onIgnoreGroup: (index: number) => void;
  onDeleteDuplicatesInGroup?: (index: number) => void;
  onExit: () => void;
  onScrollToRow: (rowIndex: number) => void;
}

export const DuplicateEvaluationBar: React.FC<DuplicateEvaluationBarProps> = ({
  groups,
  currentIndex,
  headers,
  viewScope,
  liveMatchingRows,
  onSelectViewScope,
  onReevaluateDuplicates,
  onSelectIndex,
  onApproveGroup,
  onIgnoreGroup,
  onDeleteDuplicatesInGroup,
  onExit,
  onScrollToRow,
}) => {
  if (groups.length === 0 || currentIndex < 0 || currentIndex >= groups.length) {
    return null;
  }

  const currentGroup = groups[currentIndex];
  const sample = currentGroup.sampleRow;
  const isApproved = currentGroup.approved;
  const isIgnored = currentGroup.ignored;

  const handleNext = () => {
    if (currentIndex < groups.length - 1) {
      onSelectIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectIndex(currentIndex - 1);
    }
  };

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 shadow-md mb-4 text-gray-800 transition-all duration-200">
      {/* Header & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-amber-500 text-white font-bold text-xs uppercase px-2 py-1 rounded shadow-xs">
            Duplicate Evaluation
          </span>
          <span className="font-semibold text-gray-900 text-sm sm:text-base">
            Duplicate Set {currentIndex + 1} of {groups.length}
          </span>
          <span className="text-xs text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded font-medium">
            {currentGroup.originalIndices.length} identical copies
          </span>
          {isApproved && (
            <span className="text-xs bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded border border-green-300">
              ✓ Approved
            </span>
          )}
          {isIgnored && !isApproved && (
            <span className="text-xs bg-gray-200 text-gray-700 font-semibold px-2 py-0.5 rounded border border-gray-300">
              Ignored
            </span>
          )}

          <button
            type="button"
            id="duplicate-reevaluate-btn"
            onClick={onReevaluateDuplicates}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded shadow-2xs transition-all cursor-pointer"
            title="Re-evaluate all sheet data for duplicates (resets previous ignores)"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Re-evaluate</span>
          </button>
        </div>

        {/* View Mode Toggle & Location Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1 bg-amber-100/70 p-1 rounded-md border border-amber-300">
            <span className="text-2xs font-bold text-gray-600 px-1">View:</span>
            <button
              type="button"
              id="view-scope-all"
              onClick={() => onSelectViewScope('all')}
              className={`text-2xs sm:text-xs font-semibold px-2 py-0.5 rounded transition-all cursor-pointer ${
                viewScope === 'all'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-gray-700 hover:bg-white/80'
              }`}
              title="Show all data in the sheet"
            >
              All Data
            </button>
            <button
              type="button"
              id="view-scope-duplicates-only"
              onClick={() => onSelectViewScope('duplicates-only')}
              className={`text-2xs sm:text-xs font-semibold px-2 py-0.5 rounded transition-all cursor-pointer ${
                viewScope === 'duplicates-only'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-gray-700 hover:bg-white/80'
              }`}
              title="Show all duplicate sets & their clones"
            >
              All Duplicates
            </button>
            <button
              type="button"
              id="view-scope-active-only"
              onClick={() => onSelectViewScope('active-only')}
              className={`text-2xs sm:text-xs font-semibold px-2 py-0.5 rounded transition-all cursor-pointer ${
                viewScope === 'active-only'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-gray-700 hover:bg-white/80'
              }`}
              title="Show only the unique line being worked on and its clones"
            >
              Current Set & Clones
            </button>
          </div>

          <div className="h-4 w-px bg-amber-300 mx-1 hidden sm:block" />

          {/* Row location badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-gray-600">Rows:</span>
            {liveMatchingRows && liveMatchingRows.length > 0
              ? liveMatchingRows.map((item) => (
                  <button
                    key={`live-row-${item.masterIndex}-${item.displayRowNumber}`}
                    type="button"
                    onClick={() => onScrollToRow(item.masterIndex)}
                    className="text-xs font-bold bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer"
                    title={`Click to scroll to row #${item.displayRowNumber} in current table`}
                  >
                    Row #{item.displayRowNumber}
                  </button>
                ))
              : currentGroup.originalIndices.map((rowIdx) => (
                  <button
                    key={rowIdx}
                    type="button"
                    onClick={() => onScrollToRow(rowIdx)}
                    className="text-xs font-bold bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer"
                    title={`Click to scroll to row #${rowIdx + 1}`}
                  >
                    Row #{rowIdx + 1}
                  </button>
                ))}
          </div>

          <button
            type="button"
            onClick={onExit}
            className="ml-2 text-gray-500 hover:text-gray-800 p-1 rounded hover:bg-amber-200 transition-colors cursor-pointer"
            title="Exit Duplicate Evaluation Mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Non-editable Display of Unique Data Line */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Unique Data Line:
            </p>
            <span className="text-xs font-semibold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-300">
              Edit directly in the table cells
            </span>
          </div>
          <span className="text-2xs text-gray-500 italic">
            Click any cell in the yellow highlighted table rows below to edit values.
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 bg-white p-2.5 rounded border border-amber-300">
          {headers.map((header) => (
            <div
              key={header}
              className="flex flex-col bg-amber-50/50 px-2 py-1.5 rounded border border-amber-200/70"
            >
              <span className="text-2xs font-semibold text-gray-500 truncate" title={header}>
                {header}
              </span>
              <span
                className="text-xs font-bold text-gray-800 truncate select-text mt-0.5"
                title={sample[header] || '—'}
              >
                {sample[header] || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluation Actions & Step Controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="duplicate-approve-btn"
            onClick={() => onApproveGroup(currentIndex)}
            className="btn btn-success text-xs sm:text-sm py-1.5 px-3 shadow-xs cursor-pointer"
            title="Approve duplicate set and remove yellow highlighting"
          >
            <Check className="w-4 h-4" />
            Approve
          </button>

          <button
            type="button"
            id="duplicate-ignore-btn"
            onClick={() => onIgnoreGroup(currentIndex)}
            className="btn btn-secondary text-xs sm:text-sm py-1.5 px-3 border border-gray-300 shadow-xs cursor-pointer"
            title="Ignore duplicate set and remove yellow highlighting"
          >
            <EyeOff className="w-4 h-4 text-amber-600" />
            Ignore
          </button>

          {onDeleteDuplicatesInGroup && (
            <button
              type="button"
              id="duplicate-remove-clones-btn"
              onClick={() => onDeleteDuplicatesInGroup(currentIndex)}
              className="btn btn-secondary text-xs sm:text-sm py-1.5 px-2.5 text-red-700 hover:bg-red-50 border border-red-200 shadow-2xs cursor-pointer"
              title="Keep 1 row and delete duplicate clones from the table"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Clones
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="switch-btn py-1 px-2.5 text-xs font-semibold disabled:opacity-40 cursor-pointer"
            title="Go to previous duplicate set"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Prev
          </button>

          <span className="text-xs font-medium text-gray-600">
            {currentIndex + 1} / {groups.length}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex >= groups.length - 1}
            className="switch-btn py-1 px-2.5 text-xs font-semibold disabled:opacity-40 cursor-pointer"
            title="Go to next duplicate set"
          >
            Next <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onExit}
            className="btn btn-secondary text-xs py-1 px-3 ml-2 border border-gray-300 cursor-pointer"
          >
            Exit Duplicate Mode
          </button>
        </div>
      </div>
    </div>
  );
};
