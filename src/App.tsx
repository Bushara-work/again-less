import React, { useState, useMemo, useCallback } from 'react';
import {
  AttendanceRow,
  SortConfig,
  TimeMode,
  DragOrientation,
  FilterConfig,
  DuplicateGroup,
  DuplicateViewScope,
  AttendanceThresholdConfig,
} from './types';
import {
  MASTER_HEADERS,
  parseCSVFile,
  mergeAttendanceRows,
  findDuplicateGroups,
  sortAttendanceData,
  exportToCSV,
  exportToXLSX,
  convertTimeFormat,
  isDateInRange,
  parseDurationToMinutes,
} from './utils/csv';
import { createSampleFiles } from './utils/sampleData';

import { Stage1Upload } from './components/Stage1Upload';
import { HeaderControls } from './components/HeaderControls';
import { FilterPanel } from './components/FilterPanel';
import { TableGrid } from './components/TableGrid';
import { DuplicateEvaluationBar } from './components/DuplicateEvaluationBar';
import { BulkActionBar } from './components/BulkActionBar';
import { InsertColumnModal } from './components/InsertColumnModal';
import { ColumnMappingModal } from './components/ColumnMappingModal';
import { CustomExportModal } from './components/CustomExportModal';
import { StudentSummaryModal, StudentOverride } from './components/StudentSummaryModal';
import { GitHubFindReplaceBar, FindReplaceMatch } from './components/GitHubFindReplaceBar';

export default function App() {
  // Navigation: Step 1 = Upload, Step 2 = Master Table View
  const [step, setStep] = useState<1 | 2>(1);

  // Files for upload
  const [files, setFiles] = useState<File[]>([]);

  // Master Dataset & Headers
  const [headers, setHeaders] = useState<string[]>([...MASTER_HEADERS]);
  const [hiddenHeaders, setHiddenHeaders] = useState<string[]>([]);
  const [data, setData] = useState<AttendanceRow[]>([]);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<{ data: AttendanceRow[]; headers: string[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const pushHistory = useCallback((newData: AttendanceRow[], newHeaders: string[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, { data: newData, headers: newHeaders }];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevStep = history[historyIndex - 1];
      setData(prevStep.data);
      setHeaders(prevStep.headers);
      setHistoryIndex((prev) => prev - 1);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextStep = history[historyIndex + 1];
      setData(nextStep.data);
      setHeaders(nextStep.headers);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [history, historyIndex]);

  // Sorting & View Config
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    nameOrder: 'asc',
    dateOrder: 'asc',
    isNamePriorityPrimary: true,
    isRankLocked: false,
  });

  const [timeMode, setTimeMode] = useState<TimeMode>('12h');
  const [isDragReorderModeActive, setIsDragReorderModeActive] = useState<boolean>(false);
  const [dragOrientation, setDragOrientation] = useState<DragOrientation>('horizontal');

  // Filtering Config
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    participantName: '',
    meetingCode: '',
    minDuration: '',
    maxDuration: '',
    startDate: '',
    endDate: '',
    isStartDateInclusive: true,
    isEndDateInclusive: true,
  });

  // Selected Rows for Bulk Actions
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());

  // Duplicate Evaluation State
  const [isDuplicateModeActive, setIsDuplicateModeActive] = useState<boolean>(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [activeDuplicateGroupIndex, setActiveDuplicateGroupIndex] = useState<number>(0);
  const [duplicateViewScope, setDuplicateViewScope] = useState<DuplicateViewScope>('all');

  // Find and Replace State
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState<boolean>(false);
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [targetFindColumn, setTargetFindColumn] = useState<string>('all');
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [matchWholeWord, setMatchWholeWord] = useState<boolean>(false);
  const [activeFindMatchIndex, setActiveFindMatchIndex] = useState<number>(0);

  // Modals
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);
  const [detectedHeadersForMapping, setDetectedHeadersForMapping] = useState<string[]>([]);
  const [parsedFilesCache, setParsedFilesCache] = useState<{ headers: string[]; rows: AttendanceRow[] }[]>([]);

  const [isInsertColumnModalOpen, setIsInsertColumnModalOpen] = useState<boolean>(false);
  const [targetColumnForInsert, setTargetColumnForInsert] = useState<string | null>(null);

  const [isCustomExportModalOpen, setIsCustomExportModalOpen] = useState<boolean>(false);
  const [isStudentSummaryModalOpen, setIsStudentSummaryModalOpen] = useState<boolean>(false);

  // Student Evaluation & Override State
  const [thresholdConfig, setThresholdConfig] = useState<AttendanceThresholdConfig>({
    minDurationPerClassMinutes: 40,
    minClassesRequired: 2,
    gradingMode: 'attendance',
    targetPointsRequired: 100,
    pointsPerClass: 20,
  });
  const [studentOverrides, setStudentOverrides] = useState<Record<string, StudentOverride>>({});

  // 1. File Ingestion & Processing
  const handleAddFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    setFiles((prev) => [...prev, ...arr]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLoadDemoData = () => {
    const demo = createSampleFiles();
    setFiles(demo);
  };

  // Start processing files
  const handleProcessFiles = async () => {
    if (files.length === 0) return;

    try {
      const parsedResults = await Promise.all(files.map((file) => parseCSVFile(file)));
      setParsedFilesCache(parsedResults);

      // Collect all detected headers
      const detected = new Set<string>();
      parsedResults.forEach((res) => {
        res.headers.forEach((h) => detected.add(h));
      });
      const detectedArr = Array.from(detected);

      // Check if non-standard headers exist
      const hasUnmapped = detectedArr.some((h) => !MASTER_HEADERS.includes(h));

      if (hasUnmapped) {
        setDetectedHeadersForMapping(detectedArr);
        setIsMappingModalOpen(true);
      } else {
        commitMergedData(parsedResults);
      }
    } catch (err) {
      console.error('Failed to parse CSV files', err);
      alert('Error reading CSV files. Please check file format.');
    }
  };

  // Commit merged data into master table
  const commitMergedData = (
    parsedResults: { headers: string[]; rows: AttendanceRow[] }[],
    mapping?: Record<string, string>
  ) => {
    // If mapping provided, remap columns in each row
    const processedResults = parsedResults.map((res) => {
      if (!mapping) return res;
      const mappedRows = res.rows.map((row) => {
        const newRow: AttendanceRow = {};
        Object.entries(row).forEach(([k, v]) => {
          const targetKey = mapping[k] || k;
          newRow[targetKey] = v;
        });
        return newRow;
      });
      return {
        headers: res.headers.map((h) => mapping[h] || h),
        rows: mappedRows,
      };
    });

    const { headers: masterHdrs, rows: masterRows } = mergeAttendanceRows(processedResults);

    // Initial sort
    const sorted = sortAttendanceData(masterRows, sortConfig);

    setHeaders(masterHdrs);
    setData(sorted);
    setHistory([{ data: sorted, headers: masterHdrs }]);
    setHistoryIndex(0);
    setStep(2);
  };

  const handleConfirmMapping = (mapping: Record<string, string>) => {
    setIsMappingModalOpen(false);
    commitMergedData(parsedFilesCache, mapping);
  };

  // 2. Sort config updates
  const handleUpdateSortConfig = (updates: Partial<SortConfig>) => {
    const nextConfig = { ...sortConfig, ...updates };
    setSortConfig(nextConfig);
    const sorted = sortAttendanceData(data, nextConfig);
    setData(sorted);
    pushHistory(sorted, headers);
  };

  const handleHeaderSortClick = (header: string) => {
    if (sortConfig.isRankLocked) return;
    if (header === 'Participant Name') {
      handleUpdateSortConfig({ isNamePriorityPrimary: true });
    } else if (header === 'Class Date') {
      handleUpdateSortConfig({ isNamePriorityPrimary: false });
    }
  };

  const handleHeaderArrowClick = (header: string) => {
    if (sortConfig.isRankLocked) return;
    if (header === 'Participant Name') {
      const nextOrder = sortConfig.nameOrder === 'asc' ? 'desc' : 'asc';
      handleUpdateSortConfig({ nameOrder: nextOrder });
    } else if (header === 'Class Date') {
      const nextOrder = sortConfig.dateOrder === 'asc' ? 'desc' : 'asc';
      handleUpdateSortConfig({ dateOrder: nextOrder });
    }
  };

  // 3. Time format toggling (12h / 24h)
  const handleToggleTimeMode = () => {
    const nextMode: TimeMode = timeMode === '12h' ? '24h' : '12h';
    setTimeMode(nextMode);

    // Convert time columns in master data
    const timeCols = ['Attendance Started at', 'Attendance Stopped at', 'Joined at(beta)'];
    const updatedData = data.map((row) => {
      const newRow = { ...row };
      timeCols.forEach((col) => {
        if (newRow[col]) {
          newRow[col] = convertTimeFormat(newRow[col], nextMode);
        }
      });
      return newRow;
    });

    setData(updatedData);
    pushHistory(updatedData, headers);
  };

  // 4. In-cell edits
  const handleCellChange = (originalIndex: number, header: string, value: string) => {
    setData((prev) => {
      const updated = [...prev];
      updated[originalIndex] = { ...updated[originalIndex], [header]: value };
      pushHistory(updated, headers);
      return updated;
    });
  };

  // 5. Column reordering via drag & drop
  const handleReorderColumns = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newHeaders = [...headers];
    const [moved] = newHeaders.splice(fromIndex, 1);
    newHeaders.splice(toIndex, 0, moved);
    setHeaders(newHeaders);
    pushHistory(data, newHeaders);
  };

  // 6. Row reordering via drag & drop
  const handleReorderRows = (fromOriginalIndex: number, toOriginalIndex: number) => {
    if (fromOriginalIndex === toOriginalIndex) return;
    const newData = [...data];
    const [moved] = newData.splice(fromOriginalIndex, 1);
    newData.splice(toOriginalIndex, 0, moved);
    setData(newData);
    pushHistory(newData, headers);
  };

  // 7. Insert column left
  const handleInsertColumnLeft = (targetCol: string) => {
    setTargetColumnForInsert(targetCol);
    setIsInsertColumnModalOpen(true);
  };

  const handleConfirmInsertColumn = (targetCol: string, newColName: string) => {
    const targetIdx = headers.indexOf(targetCol);
    if (targetIdx === -1) return;
    const newHeaders = [...headers];
    newHeaders.splice(targetIdx, 0, newColName);

    const newData = data.map((row) => ({ ...row, [newColName]: '' }));
    setHeaders(newHeaders);
    setData(newData);
    pushHistory(newData, newHeaders);
  };

  // 8. Delete column
  const handleDeleteColumn = (columnKey: string) => {
    const newHeaders = headers.filter((h) => h !== columnKey);
    const newData = data.map((row) => {
      const copy = { ...row };
      delete copy[columnKey];
      return copy;
    });
    setHeaders(newHeaders);
    setData(newData);
    pushHistory(newData, newHeaders);
  };

  // 9. Insert row above
  const handleInsertRowAbove = (originalRowIndex: number) => {
    const emptyRow: AttendanceRow = {};
    headers.forEach((h) => {
      emptyRow[h] = '';
    });
    const newData = [...data];
    newData.splice(originalRowIndex, 0, emptyRow);
    setData(newData);
    pushHistory(newData, headers);
  };

  // 10. Delete row
  const handleDeleteRow = (originalRowIndex: number) => {
    const newData = data.filter((_, i) => i !== originalRowIndex);
    setData(newData);
    pushHistory(newData, headers);
  };

  // 11. Bulk selection handlers
  const handleToggleSelectRow = (originalIndex: number) => {
    setSelectedRowIndices((prev) => {
      const next = new Set(prev);
      if (next.has(originalIndex)) next.delete(originalIndex);
      else next.add(originalIndex);
      return next;
    });
  };

  // 12. Duplicate evaluation logic
  const handleCheckDuplicates = () => {
    const groups = findDuplicateGroups(data, headers);
    setDuplicateGroups(groups);
    if (groups.length > 0) {
      setActiveDuplicateGroupIndex(0);
      setIsDuplicateModeActive(true);
    } else {
      alert('No duplicate records detected across current headers.');
    }
  };

  const handleReevaluateDuplicates = () => {
    const groups = findDuplicateGroups(data, headers);
    setDuplicateGroups(groups);
    if (groups.length > 0) {
      setActiveDuplicateGroupIndex(0);
    } else {
      setIsDuplicateModeActive(false);
      alert('No duplicates remain in the sheet!');
    }
  };

  const handleApproveDuplicateGroup = (index: number) => {
    setDuplicateGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, approved: true, ignored: false } : g))
    );
    if (index < duplicateGroups.length - 1) {
      setActiveDuplicateGroupIndex(index + 1);
    }
  };

  const handleIgnoreDuplicateGroup = (index: number) => {
    setDuplicateGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ignored: true, approved: false } : g))
    );
    if (index < duplicateGroups.length - 1) {
      setActiveDuplicateGroupIndex(index + 1);
    }
  };

  const handleDeleteDuplicatesInGroup = (groupIndex: number) => {
    const group = duplicateGroups[groupIndex];
    if (!group || group.originalIndices.length <= 1) return;

    // Keep the first row, delete the rest
    const indicesToDelete = new Set(group.originalIndices.slice(1));
    const newData = data.filter((_, idx) => !indicesToDelete.has(idx));
    setData(newData);
    pushHistory(newData, headers);

    // Refresh groups
    const newGroups = findDuplicateGroups(newData, headers);
    setDuplicateGroups(newGroups);
    if (newGroups.length === 0) {
      setIsDuplicateModeActive(false);
    } else {
      setActiveDuplicateGroupIndex(Math.min(groupIndex, newGroups.length - 1));
    }
  };

  // 13. Find and Replace Logic
  const findMatches: FindReplaceMatch[] = useMemo(() => {
    if (!findText.trim()) return [];

    const matches: FindReplaceMatch[] = [];
    const query = matchCase ? findText : findText.toLowerCase();

    data.forEach((row, rowIdx) => {
      headers.forEach((col) => {
        if (targetFindColumn !== 'all' && targetFindColumn !== col) return;

        const val = String(row[col] || '');
        const test = matchCase ? val : val.toLowerCase();

        let isMatch = false;
        if (matchWholeWord) {
          const words = test.split(/\s+/);
          isMatch = words.includes(query);
        } else {
          isMatch = test.includes(query);
        }

        if (isMatch) {
          matches.push({
            rowIndex: rowIdx,
            columnKey: col,
            originalText: val,
          });
        }
      });
    });

    return matches;
  }, [data, headers, findText, targetFindColumn, matchCase, matchWholeWord]);

  const activeFindMatch = findMatches[activeFindMatchIndex] || null;

  const handleFindNext = () => {
    if (findMatches.length === 0) return;
    setActiveFindMatchIndex((prev) => (prev + 1) % findMatches.length);
  };

  const handleFindPrev = () => {
    if (findMatches.length === 0) return;
    setActiveFindMatchIndex((prev) => (prev - 1 + findMatches.length) % findMatches.length);
  };

  const handleReplaceCurrent = () => {
    if (!activeFindMatch) return;
    const { rowIndex, columnKey } = activeFindMatch;
    const row = data[rowIndex];
    const val = String(row[columnKey] || '');

    const flags = matchCase ? 'g' : 'gi';
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = matchWholeWord ? new RegExp(`\\b${escaped}\\b`, flags) : new RegExp(escaped, flags);
    const replaced = val.replace(regex, replaceText);

    handleCellChange(rowIndex, columnKey, replaced);
  };

  const handleReplaceAll = () => {
    if (findMatches.length === 0) return;

    const flags = matchCase ? 'g' : 'gi';
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = matchWholeWord ? new RegExp(`\\b${escaped}\\b`, flags) : new RegExp(escaped, flags);

    const newData = data.map((row, rowIdx) => {
      const newRow = { ...row };
      headers.forEach((col) => {
        if (targetFindColumn !== 'all' && targetFindColumn !== col) return;
        const val = String(newRow[col] || '');
        if (val.toLowerCase().includes(findText.toLowerCase())) {
          newRow[col] = val.replace(regex, replaceText);
        }
      });
      return newRow;
    });

    setData(newData);
    pushHistory(newData, headers);
  };

  // 14. Filtered display data calculation
  const displayData = useMemo(() => {
    const list: { row: AttendanceRow; originalIndex: number }[] = [];

    // Duplicate highlights check
    const activeGroup = isDuplicateModeActive ? duplicateGroups[activeDuplicateGroupIndex] : null;
    const activeGroupSet = new Set(activeGroup ? activeGroup.originalIndices : []);

    const allDuplicatesSet = new Set<number>();
    if (isDuplicateModeActive) {
      duplicateGroups.forEach((g) => {
        if (!g.approved && !g.ignored) {
          g.originalIndices.forEach((idx) => allDuplicatesSet.add(idx));
        }
      });
    }

    data.forEach((row, originalIndex) => {
      // Duplicate view scope filter
      if (isDuplicateModeActive) {
        if (duplicateViewScope === 'active-only') {
          if (!activeGroupSet.has(originalIndex)) return;
        } else if (duplicateViewScope === 'duplicates-only') {
          if (!allDuplicatesSet.has(originalIndex)) return;
        }
      }

      // Condition filters
      if (filterConfig.participantName) {
        const name = (row['Participant Name'] || '').toLowerCase();
        if (!name.includes(filterConfig.participantName.toLowerCase())) return;
      }

      if (filterConfig.meetingCode) {
        const code = (row['Meeting code'] || '').toLowerCase();
        if (!code.includes(filterConfig.meetingCode.toLowerCase())) return;
      }

      if (filterConfig.minDuration || filterConfig.maxDuration) {
        const mins = parseDurationToMinutes(row['Attended Duration']);
        if (filterConfig.minDuration && mins < parseFloat(filterConfig.minDuration)) return;
        if (filterConfig.maxDuration && mins > parseFloat(filterConfig.maxDuration)) return;
      }

      // Date range filtering (respecting inclusive/exclusive mode for start and end)
      if (filterConfig.startDate || filterConfig.endDate) {
        const inRange = isDateInRange(
          row['Class Date'],
          filterConfig.startDate,
          filterConfig.endDate,
          filterConfig.isStartDateInclusive,
          filterConfig.isEndDateInclusive
        );
        if (!inRange) return;
      }

      list.push({ row, originalIndex });
    });

    return list;
  }, [data, filterConfig, isDuplicateModeActive, duplicateGroups, activeDuplicateGroupIndex, duplicateViewScope]);

  // Highlighted row sets for duplicate mode
  const highlightedRowIndices = useMemo(() => {
    const set = new Set<number>();
    if (isDuplicateModeActive) {
      duplicateGroups.forEach((g) => {
        if (!g.approved && !g.ignored) {
          g.originalIndices.forEach((idx) => set.add(idx));
        }
      });
    }
    return set;
  }, [isDuplicateModeActive, duplicateGroups]);

  const activeGroupRowIndices = useMemo(() => {
    const set = new Set<number>();
    if (isDuplicateModeActive && duplicateGroups[activeDuplicateGroupIndex]) {
      duplicateGroups[activeDuplicateGroupIndex].originalIndices.forEach((idx) => set.add(idx));
    }
    return set;
  }, [isDuplicateModeActive, duplicateGroups, activeDuplicateGroupIndex]);

  // Live row matching for duplicate bar badges
  const liveMatchingRows = useMemo(() => {
    if (!isDuplicateModeActive || !duplicateGroups[activeDuplicateGroupIndex]) return [];
    const activeIndices = new Set(duplicateGroups[activeDuplicateGroupIndex].originalIndices);

    const matches: { masterIndex: number; displayRowNumber: number }[] = [];
    displayData.forEach((d, displayIdx) => {
      if (activeIndices.has(d.originalIndex)) {
        matches.push({
          masterIndex: d.originalIndex,
          displayRowNumber: displayIdx + 1,
        });
      }
    });
    return matches;
  }, [isDuplicateModeActive, duplicateGroups, activeDuplicateGroupIndex, displayData]);

  // Select all / Deselect all
  const handleToggleSelectAll = () => {
    const allVisibleSelected =
      displayData.length > 0 && displayData.every((d) => selectedRowIndices.has(d.originalIndex));

    setSelectedRowIndices((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        displayData.forEach((d) => next.delete(d.originalIndex));
      } else {
        displayData.forEach((d) => next.add(d.originalIndex));
      }
      return next;
    });
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    const newData = data.filter((_, idx) => !selectedRowIndices.has(idx));
    setData(newData);
    pushHistory(newData, headers);
    setSelectedRowIndices(new Set());
  };

  // Bulk Export CSV
  const handleBulkExportCSV = () => {
    const selectedRows = data.filter((_, idx) => selectedRowIndices.has(idx));
    exportToCSV(selectedRows, headers, 'selected_attendance_export.csv');
  };

  // Bulk Export XLSX
  const handleBulkExportXLSX = () => {
    const selectedRows = data.filter((_, idx) => selectedRowIndices.has(idx));
    exportToXLSX(selectedRows, headers, 'selected_attendance_export.xlsx');
  };

  // Column Visibility toggle
  const handleToggleHeaderVisibility = (hdr: string) => {
    setHiddenHeaders((prev) =>
      prev.includes(hdr) ? prev.filter((h) => h !== hdr) : [...prev, hdr]
    );
  };

  const handleResetVisibility = () => {
    setHiddenHeaders([]);
  };

  // Scroll to row in table
  const handleScrollToRow = (masterRowIndex: number) => {
    const el = document.getElementById(`table-row-${masterRowIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash-highlight');
      setTimeout(() => el.classList.remove('flash-highlight'), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16 font-sans">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
              A
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                Attendance CSV Master Processor
              </h1>
              <p className="text-2xs text-gray-500 font-medium">
                100% Client-Side CSV Merging, Grading, Evaluation, & Offline Projections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {step === 2 && (
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">
                {data.length} records merged across {headers.length} columns
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {step === 1 ? (
          /* Step 1: File Ingestion View */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <Stage1Upload
              files={files}
              onAddFiles={handleAddFiles}
              onRemoveFile={handleRemoveFile}
              onProcessFiles={handleProcessFiles}
              onLoadDemoData={handleLoadDemoData}
            />
          </div>
        ) : (
          /* Step 2: Full Master Table View */
          <div className="space-y-4">
            {/* Header Controls */}
            <HeaderControls
              sortConfig={sortConfig}
              onUpdateSortConfig={handleUpdateSortConfig}
              timeMode={timeMode}
              onToggleTimeMode={handleToggleTimeMode}
              isDragReorderModeActive={isDragReorderModeActive}
              onToggleDragReorder={() => setIsDragReorderModeActive((prev) => !prev)}
              dragOrientation={dragOrientation}
              onToggleDragOrientation={() =>
                setDragOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'))
              }
              onGoBack={() => setStep(1)}
              onDownloadCSV={() => exportToCSV(data, headers, 'master_attendance_merged.csv')}
              onDownloadXLSX={() => exportToXLSX(data, headers, 'master_attendance_merged.xlsx')}
              onOpenCustomExport={() => setIsCustomExportModalOpen(true)}
              onOpenStudentSummary={() => setIsStudentSummaryModalOpen(true)}
              onOpenFindReplace={() => setIsFindReplaceOpen((prev) => !prev)}
              allHeaders={headers}
              hiddenHeaders={hiddenHeaders}
              onToggleHeaderVisibility={handleToggleHeaderVisibility}
              onResetVisibility={handleResetVisibility}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />

            {/* Condition Filters & Duplicate Trigger */}
            <FilterPanel
              filterConfig={filterConfig}
              onUpdateFilter={(key, val) =>
                setFilterConfig((prev) => ({ ...prev, [key]: val }))
              }
              onResetFilters={() =>
                setFilterConfig({
                  participantName: '',
                  meetingCode: '',
                  minDuration: '',
                  maxDuration: '',
                  startDate: '',
                  endDate: '',
                  isStartDateInclusive: true,
                  isEndDateInclusive: true,
                })
              }
              onCheckDuplicates={handleCheckDuplicates}
              isDuplicateModeActive={isDuplicateModeActive}
              duplicateCount={duplicateGroups.length}
              onToggleFindReplace={() => setIsFindReplaceOpen((prev) => !prev)}
              isFindReplaceOpen={isFindReplaceOpen}
              findText={findText}
              onFindTextChange={setFindText}
              replaceText={replaceText}
              onReplaceTextChange={setReplaceText}
              matchesCount={findMatches.length}
              activeMatchIndex={activeFindMatchIndex}
              onFindNext={handleFindNext}
              onReplaceCurrent={handleReplaceCurrent}
              onReplaceAll={handleReplaceAll}
            />

            {/* GitHub-style Find and Replace Sticky Floating Bar */}
            <GitHubFindReplaceBar
              isOpen={isFindReplaceOpen}
              onClose={() => setIsFindReplaceOpen(false)}
              headers={headers}
              findText={findText}
              onFindTextChange={(val) => {
                setFindText(val);
                setActiveFindMatchIndex(0);
              }}
              replaceText={replaceText}
              onReplaceTextChange={setReplaceText}
              targetColumn={targetFindColumn}
              onTargetColumnChange={setTargetFindColumn}
              matchCase={matchCase}
              onToggleMatchCase={() => setMatchCase((prev) => !prev)}
              matchWholeWord={matchWholeWord}
              onToggleMatchWholeWord={() => setMatchWholeWord((prev) => !prev)}
              matches={findMatches}
              activeMatchIndex={activeFindMatchIndex}
              onNextMatch={handleFindNext}
              onPrevMatch={handleFindPrev}
              onReplaceCurrent={handleReplaceCurrent}
              onReplaceAll={handleReplaceAll}
            />

            {/* Duplicate Evaluation Navigation Bar */}
            {isDuplicateModeActive && (
              <DuplicateEvaluationBar
                groups={duplicateGroups}
                currentIndex={activeDuplicateGroupIndex}
                headers={headers}
                viewScope={duplicateViewScope}
                liveMatchingRows={liveMatchingRows}
                onSelectViewScope={setDuplicateViewScope}
                onReevaluateDuplicates={handleReevaluateDuplicates}
                onSelectIndex={setActiveDuplicateGroupIndex}
                onApproveGroup={handleApproveDuplicateGroup}
                onIgnoreGroup={handleIgnoreDuplicateGroup}
                onDeleteDuplicatesInGroup={handleDeleteDuplicatesInGroup}
                onExit={() => setIsDuplicateModeActive(false)}
                onScrollToRow={handleScrollToRow}
              />
            )}

            {/* Main Interactive Table Grid */}
            <TableGrid
              headers={headers}
              hiddenHeaders={hiddenHeaders}
              data={data}
              displayData={displayData}
              sortConfig={sortConfig}
              isDragReorderModeActive={isDragReorderModeActive}
              dragOrientation={dragOrientation}
              highlightedRowIndices={highlightedRowIndices}
              activeGroupRowIndices={activeGroupRowIndices}
              selectedRowIndices={selectedRowIndices}
              findMatches={findMatches}
              activeFindMatch={activeFindMatch}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectAll={handleToggleSelectAll}
              onCellChange={handleCellChange}
              onReorderColumns={handleReorderColumns}
              onReorderRows={handleReorderRows}
              onHeaderSortClick={handleHeaderSortClick}
              onHeaderArrowClick={handleHeaderArrowClick}
              onInsertColumnLeft={handleInsertColumnLeft}
              onDeleteColumn={handleDeleteColumn}
              onInsertRowAbove={handleInsertRowAbove}
              onDeleteRow={handleDeleteRow}
            />

            {/* Floating Bulk Action Bar */}
            <BulkActionBar
              selectedCount={selectedRowIndices.size}
              totalCount={data.length}
              onDeleteSelected={handleBulkDelete}
              onExportCSV={handleBulkExportCSV}
              onExportXLSX={handleBulkExportXLSX}
              onClearSelection={() => setSelectedRowIndices(new Set())}
            />
          </div>
        )}
      </main>

      {/* Column Mapping Modal for CSV processing */}
      <ColumnMappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        detectedHeaders={detectedHeadersForMapping}
        onConfirmMapping={handleConfirmMapping}
      />

      {/* Insert Column Modal */}
      <InsertColumnModal
        isOpen={isInsertColumnModalOpen}
        onClose={() => setIsInsertColumnModalOpen(false)}
        targetColumnKey={targetColumnForInsert}
        existingHeaders={headers}
        onConfirmInsert={handleConfirmInsertColumn}
      />

      {/* Custom Filtered Export Modal */}
      <CustomExportModal
        isOpen={isCustomExportModalOpen}
        onClose={() => setIsCustomExportModalOpen(false)}
        headers={headers}
        data={data}
      />

      {/* Student Attendance Summary & Evaluation Modal */}
      <StudentSummaryModal
        isOpen={isStudentSummaryModalOpen}
        onClose={() => setIsStudentSummaryModalOpen(false)}
        data={data}
        thresholdConfig={thresholdConfig}
        onUpdateThresholds={setThresholdConfig}
        overrides={studentOverrides}
        onUpdateOverride={(studentName, override) => {
          setStudentOverrides((prev) => {
            const next = { ...prev };
            if (override === null) {
              delete next[studentName];
            } else {
              next[studentName] = override;
            }
            return next;
          });
        }}
      />
    </div>
  );
}
