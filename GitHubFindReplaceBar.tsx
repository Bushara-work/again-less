import React, { useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, Replace, CheckCheck, X } from 'lucide-react';

export interface FindReplaceMatch {
  rowIndex: number;
  columnKey: string;
  originalText: string;
}

interface GitHubFindReplaceBarProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  findText: string;
  onFindTextChange: (val: string) => void;
  replaceText: string;
  onReplaceTextChange: (val: string) => void;
  targetColumn: string;
  onTargetColumnChange: (val: string) => void;
  matchCase: boolean;
  onToggleMatchCase: () => void;
  matchWholeWord: boolean;
  onToggleMatchWholeWord: () => void;
  matches: FindReplaceMatch[];
  activeMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
}

export const GitHubFindReplaceBar: React.FC<GitHubFindReplaceBarProps> = ({
  isOpen,
  onClose,
  headers,
  findText,
  onFindTextChange,
  replaceText,
  onReplaceTextChange,
  targetColumn,
  onTargetColumnChange,
  matchCase,
  onToggleMatchCase,
  matchWholeWord,
  onToggleMatchWholeWord,
  matches,
  activeMatchIndex,
  onNextMatch,
  onPrevMatch,
  onReplaceCurrent,
  onReplaceAll,
}) => {
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      findInputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalMatches = matches.length;
  const currentDisplayIndex = totalMatches > 0 && activeMatchIndex >= 0 ? activeMatchIndex + 1 : 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    }
  };

  return (
    <div
      id="github-find-replace-bar"
      className="bg-white border-2 border-blue-400 rounded-lg shadow-lg p-3 my-2 z-30 transition-all text-gray-800"
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Inputs & Navigation */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Find Input */}
          <div className="relative flex items-center min-w-[180px] flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 pointer-events-none" />
            <input
              ref={findInputRef}
              type="text"
              id="find-input-field"
              value={findText}
              onChange={(e) => onFindTextChange(e.target.value)}
              placeholder="Find in data..."
              className="w-full pl-8 pr-7 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-hidden"
            />
            {findText && (
              <button
                type="button"
                onClick={() => onFindTextChange('')}
                className="absolute right-2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Replace Input */}
          <div className="relative flex items-center min-w-[180px] flex-1">
            <Replace className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              id="replace-input-field"
              value={replaceText}
              onChange={(e) => onReplaceTextChange(e.target.value)}
              placeholder="Replace with..."
              className="w-full pl-8 pr-7 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-hidden"
            />
            {replaceText && (
              <button
                type="button"
                onClick={() => onReplaceTextChange('')}
                className="absolute right-2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                title="Clear replace"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Column Target Selector */}
          <select
            id="find-target-column"
            value={targetColumn}
            onChange={(e) => onTargetColumnChange(e.target.value)}
            className="text-xs py-1 px-2 border border-gray-300 rounded bg-gray-50 hover:bg-white cursor-pointer"
            title="Search specific column or all columns"
          >
            <option value="ALL">All Columns</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>

          {/* Case & Whole Word Toggles */}
          <div className="flex items-center gap-1 border border-gray-200 rounded p-0.5 bg-gray-50">
            <button
              type="button"
              id="find-match-case"
              onClick={onToggleMatchCase}
              className={`px-1.5 py-0.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                matchCase ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="Match Case (Aa)"
            >
              Aa
            </button>
            <button
              type="button"
              id="find-whole-word"
              onClick={onToggleMatchWholeWord}
              className={`px-1.5 py-0.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                matchWholeWord ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="Match Whole Word (\b)"
            >
              \b
            </button>
          </div>

          {/* Match Counter Badge */}
          <div
            id="find-match-counter"
            className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700 select-none min-w-[75px] text-center"
          >
            {findText.trim()
              ? totalMatches > 0
                ? `${currentDisplayIndex} of ${totalMatches}`
                : 'No results'
              : '0 matches'}
          </div>

          {/* Prev / Next Navigation Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              id="find-prev-btn"
              onClick={onPrevMatch}
              disabled={totalMatches === 0}
              className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 cursor-pointer"
              title="Previous Match (Shift+Enter)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              id="find-next-btn"
              onClick={onNextMatch}
              disabled={totalMatches === 0}
              className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 cursor-pointer"
              title="Next Match (Enter)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Actions & Close */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="find-replace-one-btn"
            onClick={onReplaceCurrent}
            disabled={totalMatches === 0}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-40 disabled:hover:bg-blue-50 transition-all cursor-pointer"
            title="Replace current match"
          >
            Replace
          </button>
          <button
            type="button"
            id="find-replace-all-btn"
            onClick={onReplaceAll}
            disabled={totalMatches === 0}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            title="Replace all matches across dataset"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Replace All ({totalMatches})
          </button>
          <button
            type="button"
            id="find-close-btn"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors cursor-pointer ml-1"
            title="Close Find & Replace (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
