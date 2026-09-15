import React, { useState } from 'react';
import { FilterConfig } from '../types';
import { Filter, AlertTriangle, Calendar, Search, Replace, Lock, Unlock } from 'lucide-react';

interface FilterPanelProps {
  filterConfig: FilterConfig;
  onUpdateFilter: (key: keyof FilterConfig, value: string | boolean) => void;
  onResetFilters: () => void;
  onCheckDuplicates: () => void;
  isDuplicateModeActive: boolean;
  duplicateCount: number;
  onToggleFindReplace: () => void;
  isFindReplaceOpen: boolean;
  findText: string;
  onFindTextChange: (val: string) => void;
  replaceText: string;
  onReplaceTextChange: (val: string) => void;
  matchesCount: number;
  activeMatchIndex: number;
  onFindNext: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filterConfig,
  onUpdateFilter,
  onResetFilters,
  onCheckDuplicates,
  isDuplicateModeActive,
  duplicateCount,
  onToggleFindReplace,
  isFindReplaceOpen,
  findText,
  onFindTextChange,
  replaceText,
  onReplaceTextChange,
  matchesCount,
  activeMatchIndex,
  onFindNext,
  onReplaceCurrent,
  onReplaceAll,
}) => {
  const [isReplaceUnlocked, setIsReplaceUnlocked] = useState<boolean>(false);

  const handleToggleReplaceUnlock = () => {
    setIsReplaceUnlocked((prev) => !prev);
  };

  return (
    <div className="filter-panel bg-white border border-gray-300 p-4 rounded-lg shadow-2xs mt-3">
      {/* Panel Header */}
      <div className="filter-header-title flex items-center justify-between font-bold text-gray-700 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm">Condition Filters</span>
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="filter-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 items-end">
        {/* 1. Participant Name */}
        <div className="filter-box flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Participant Name</label>
          <input
            type="text"
            id="filter-name"
            value={filterConfig.participantName}
            onChange={(e) => onUpdateFilter('participantName', e.target.value)}
            className="filter-input"
            placeholder="Search name..."
          />
        </div>

        {/* 2. Meeting Code */}
        <div className="filter-box flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Meeting Code</label>
          <input
            type="text"
            id="filter-code"
            value={filterConfig.meetingCode}
            onChange={(e) => onUpdateFilter('meetingCode', e.target.value)}
            className="filter-input"
            placeholder="Search code..."
          />
        </div>

        {/* 3. Duration Threshold */}
        <div className="filter-box flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Duration Threshold (Minutes)</label>
          <div className="range-inputs flex gap-2">
            <input
              type="number"
              id="filter-dur-min"
              value={filterConfig.minDuration}
              onChange={(e) => onUpdateFilter('minDuration', e.target.value)}
              className="filter-input w-1/2"
              placeholder="Min (e.g. 45)"
            />
            <input
              type="number"
              id="filter-dur-max"
              value={filterConfig.maxDuration}
              onChange={(e) => onUpdateFilter('maxDuration', e.target.value)}
              className="filter-input w-1/2"
              placeholder="Max"
            />
          </div>
        </div>

        {/* 4. Class Date Bounds */}
        <div className="filter-box flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">Class Date Bounds</label>
            <div className="flex gap-2">
              <span
                id="start-date-toggle"
                onClick={() => onUpdateFilter('isStartDateInclusive', !filterConfig.isStartDateInclusive)}
                className="toggle-link text-xs font-medium cursor-pointer select-none"
                title="Toggle Start Date: Inclusive or Exclusive"
              >
                Start: {filterConfig.isStartDateInclusive ? 'Inc' : 'Exc'}
              </span>
              <span
                id="end-date-toggle"
                onClick={() => onUpdateFilter('isEndDateInclusive', !filterConfig.isEndDateInclusive)}
                className="toggle-link text-xs font-medium cursor-pointer select-none"
                title="Toggle End Date: Inclusive or Exclusive"
              >
                End: {filterConfig.isEndDateInclusive ? 'Inc' : 'Exc'}
              </span>
            </div>
          </div>
          <div className="range-inputs flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                id="filter-date-start"
                value={filterConfig.startDate}
                onChange={(e) => onUpdateFilter('startDate', e.target.value)}
                className="filter-input w-full pr-7"
                placeholder="Start Date / Year"
                title="Enter year (e.g. 2024), month (2024-05), or full date (12-May-2024)"
              />
              <input
                type="date"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 opacity-0 cursor-pointer"
                onChange={(e) => onUpdateFilter('startDate', e.target.value)}
                title="Pick start date from calendar"
              />
              <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                id="filter-date-end"
                value={filterConfig.endDate}
                onChange={(e) => onUpdateFilter('endDate', e.target.value)}
                className="filter-input w-full pr-7"
                placeholder="End Date / Year"
                title="Enter year (e.g. 2024), month (2024-05), or full date (14-May-2024)"
              />
              <input
                type="date"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 opacity-0 cursor-pointer"
                onChange={(e) => onUpdateFilter('endDate', e.target.value)}
                title="Pick end date from calendar"
              />
              <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 5. Student Number */}
        <div className="filter-box flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Student Number</label>
          <input
            type="text"
            id="filter-sno"
            value={filterConfig.sno}
            onChange={(e) => onUpdateFilter('sno', e.target.value)}
            className="filter-input"
            placeholder="Search student number..."
          />
        </div>

        {/* 6. Started At */}
        <div className="filter-box flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Started At</label>
          <input
            type="text"
            id="filter-started-time"
            value={filterConfig.startedTime}
            onChange={(e) => onUpdateFilter('startedTime', e.target.value)}
            className="filter-input"
            placeholder="Search join time..."
          />
        </div>

        {/* 7. Joined At (beta) */}
        <div className="filter-box flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Joined At (beta)</label>
          <input
            type="text"
            id="filter-joined-time"
            value={filterConfig.joinedTime}
            onChange={(e) => onUpdateFilter('joinedTime', e.target.value)}
            className="filter-input"
            placeholder="Search beta timestamp..."
          />
        </div>

        {/* 8. Stopped At */}
        <div className="filter-box flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Stopped At</label>
          <input
            type="text"
            id="filter-stopped-time"
            value={filterConfig.stoppedTime}
            onChange={(e) => onUpdateFilter('stoppedTime', e.target.value)}
            className="filter-input"
            placeholder="Search leave time..."
          />
        </div>

        {/* 9. General Match Filter (this in this) */}
        <div className="filter-box flex flex-col gap-1 col-span-1 sm:col-span-2 lg:col-span-4 bg-gray-50/80 p-2.5 rounded-md border border-gray-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
              <span>Match Filter (this in this)</span>
              {matchesCount > 0 && (
                <span className="text-2xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                  Match {activeMatchIndex + 1} of {matchesCount}
                </span>
              )}
            </label>
            {isReplaceUnlocked && (
              <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Unlock className="w-3 h-3 text-emerald-600" />
                Replace Unlocked
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
            {/* Find input + Find button + Replace button */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  id="filter-match-find"
                  value={findText}
                  onChange={(e) => onFindTextChange(e.target.value)}
                  className="filter-input w-full pr-6"
                  placeholder="Find text in data (this)..."
                />
                {findText && (
                  <button
                    type="button"
                    onClick={() => onFindTextChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Find Button */}
              <button
                type="button"
                id="match-find-btn"
                onClick={onFindNext}
                disabled={!findText.trim()}
                className="btn btn-secondary h-8 px-2.5 text-xs font-semibold flex items-center gap-1 shrink-0 disabled:opacity-40 cursor-pointer"
                title="Find next matching cell in table"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Find</span>
              </button>

              {/* Replace Button beside Find that unlocks the replace section */}
              <button
                type="button"
                id="match-replace-toggle-btn"
                onClick={handleToggleReplaceUnlock}
                className={`btn h-8 px-2.5 text-xs font-semibold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                  isReplaceUnlocked
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                }`}
                title={isReplaceUnlocked ? 'Lock Replace section' : 'Unlock Replace section'}
              >
                {isReplaceUnlocked ? (
                  <Unlock className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Replace className="w-3.5 h-3.5 text-gray-600" />
                )}
                <span>Replace</span>
              </button>
            </div>

            {/* Replace with section */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  id="filter-match-replace"
                  value={replaceText}
                  disabled={!isReplaceUnlocked}
                  onChange={(e) => onReplaceTextChange(e.target.value)}
                  className={`filter-input w-full pr-7 transition-all ${
                    isReplaceUnlocked
                      ? 'bg-white text-gray-800 border-gray-300 shadow-2xs'
                      : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed select-none'
                  }`}
                  placeholder={
                    isReplaceUnlocked
                      ? 'Replace with text in this...'
                      : 'Locked (press Replace to unlock)'
                  }
                />
                {!isReplaceUnlocked && (
                  <Lock className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>

              {/* Action buttons when unlocked */}
              {isReplaceUnlocked && (
                <>
                  <button
                    type="button"
                    id="match-replace-current-btn"
                    onClick={onReplaceCurrent}
                    disabled={matchesCount === 0}
                    className="btn btn-secondary h-8 px-2.5 text-xs font-semibold shrink-0 disabled:opacity-40 cursor-pointer"
                    title="Replace currently selected match"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    id="match-replace-all-btn"
                    onClick={onReplaceAll}
                    disabled={matchesCount === 0}
                    className="btn bg-blue-600 hover:bg-blue-700 text-white h-8 px-2.5 text-xs font-semibold shrink-0 disabled:opacity-40 shadow-2xs cursor-pointer"
                    title="Replace all matching occurrences"
                  >
                    Replace All
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Reset Filters, Find & Replace, and Check Duplicates */}
        <div className="filter-box flex gap-2 w-full col-span-1 sm:col-span-2 lg:col-span-4 mt-1">
          <button
            type="button"
            id="reset-filters-btn"
            onClick={onResetFilters}
            className="btn btn-danger h-9 text-xs sm:text-sm font-semibold flex-1 cursor-pointer"
          >
            Reset Filters
          </button>

          <button
            type="button"
            id="find-replace-filter-btn"
            onClick={() => {
              setIsReplaceUnlocked(true);
              onToggleFindReplace();
            }}
            className="btn h-9 text-xs sm:text-sm font-semibold flex-1 bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            title="Find & Replace across data"
          >
            <Replace className="w-3.5 h-3.5 text-sky-700" />
            <span>{isFindReplaceOpen ? 'Find & Replace (Active)' : 'Find & Replace'}</span>
          </button>

          <button
            type="button"
            id="duplicate-sift-btn"
            onClick={onCheckDuplicates}
            className={`btn h-9 text-xs sm:text-sm font-semibold flex-1 transition-colors cursor-pointer ${
              isDuplicateModeActive
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                : 'btn-warning'
            }`}
            title="Scan for duplicate rows, highlight them in yellow, and evaluate identical sets"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {isDuplicateModeActive
              ? `Duplicate Mode (${duplicateCount} ${duplicateCount === 1 ? 'set' : 'sets'}) ↻`
              : 'Check Duplicates'}
          </button>
        </div>
      </div>
    </div>
  );
};
