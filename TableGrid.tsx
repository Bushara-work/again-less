import React, { useState } from 'react';
import { AttendanceRow, DragOrientation, SortConfig, ContextMenuState } from '../types';
import { getExcelColumnLetterLabel, SYSTEM_PROTECTED_HEADERS } from '../utils/csv';
import { CheckSquare, Square, MinusSquare } from 'lucide-react';

interface TableGridProps {
  headers: string[];
  hiddenHeaders?: string[];
  data: AttendanceRow[];
  displayData: { row: AttendanceRow; originalIndex: number }[];
  sortConfig: SortConfig;
  isDragReorderModeActive: boolean;
  dragOrientation: DragOrientation;
  highlightedRowIndices: Set<number>;
  activeGroupRowIndices: Set<number>;
  selectedRowIndices: Set<number>;
  findMatches?: { rowIndex: number; columnKey: string }[];
  activeFindMatch?: { rowIndex: number; columnKey: string } | null;
  onToggleSelectRow: (originalIndex: number) => void;
  onToggleSelectAll: () => void;
  onCellChange: (originalRowIndex: number, header: string, value: string) => void;
  onReorderColumns: (fromIndex: number, toIndex: number) => void;
  onReorderRows: (fromOriginalIndex: number, toOriginalIndex: number) => void;
  onHeaderSortClick: (header: string) => void;
  onHeaderArrowClick: (header: string) => void;
  onInsertColumnLeft: (columnKey: string) => void;
  onDeleteColumn: (columnKey: string) => void;
  onInsertRowAbove: (originalRowIndex: number) => void;
  onDeleteRow: (originalRowIndex: number) => void;
}

export const TableGrid: React.FC<TableGridProps> = ({
  headers,
  hiddenHeaders = [],
  data,
  displayData,
  sortConfig,
  isDragReorderModeActive,
  dragOrientation,
  highlightedRowIndices,
  activeGroupRowIndices,
  selectedRowIndices,
  findMatches,
  activeFindMatch,
  onToggleSelectRow,
  onToggleSelectAll,
  onCellChange,
  onReorderColumns,
  onReorderRows,
  onHeaderSortClick,
  onHeaderArrowClick,
  onInsertColumnLeft,
  onDeleteColumn,
  onInsertRowAbove,
  onDeleteRow,
}) => {
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState<{ index: number; side: 'left' | 'right' } | null>(null);

  const [draggedRowOriginalIndex, setDraggedRowOriginalIndex] = useState<number | null>(null);
  const [dragOverRowOriginalIndex, setDragOverRowOriginalIndex] = useState<{ originalIndex: number; side: 'top' | 'bottom' } | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    type: null,
  });

  const { isNamePriorityPrimary, nameOrder, dateOrder, isRankLocked } = sortConfig;

  const visibleHeaders = headers.filter((h) => !hiddenHeaders.includes(h));

  const allVisibleSelected =
    displayData.length > 0 && displayData.every((d) => selectedRowIndices.has(d.originalIndex));
  const someVisibleSelected =
    displayData.some((d) => selectedRowIndices.has(d.originalIndex)) && !allVisibleSelected;

  const handleColumnContextMenu = (e: React.MouseEvent, header: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'column',
      targetColumnKey: header,
    });
  };

  const handleRowContextMenu = (e: React.MouseEvent, originalRowIndex: number) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'row',
      targetRowIndex: originalRowIndex,
    });
  };

  const closeContextMenu = () => {
    if (contextMenu.visible) {
      setContextMenu({ visible: false, x: 0, y: 0, type: null });
    }
  };

  const handleColumnDragStart = (e: React.DragEvent, fullIndex: number) => {
    if (!isDragReorderModeActive || dragOrientation !== 'vertical') return;
    setDraggedColumnIndex(fullIndex);

    if (e.dataTransfer) {
      const ghost = document.createElement('div');
      ghost.className = 'drag-sheer-ghost';
      ghost.style.position = 'absolute';
      ghost.style.top = '-9999px';
      ghost.style.left = '-9999px';
      ghost.style.width = '180px';
      ghost.style.zIndex = '9999';
      ghost.style.boxShadow = '0 10px 25px -5px rgba(37, 99, 235, 0.35)';

      const headerLabel = headers[fullIndex];
      const letter = getExcelColumnLetterLabel(fullIndex);

      let sampleCellsHtml = '';
      data.slice(0, 6).forEach((row) => {
        const val = row[headerLabel] || '—';
        sampleCellsHtml += `
          <div style="padding: 4px 8px; font-size: 11px; color: #475569; background: #ffffff; border-bottom: 1px solid #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${val}
          </div>
        `;
      });

      ghost.innerHTML = `
        <div style="background: #e2e8f0; font-weight: bold; text-align: center; padding: 4px; border-bottom: 1px solid #cbd5e1; font-size: 11px; color: #1e293b;">${letter}</div>
        <div style="background: #eff6ff; font-weight: 700; padding: 6px 8px; border-bottom: 1px solid #bfdbfe; font-size: 12px; color: #1e40af;">${headerLabel}</div>
        ${sampleCellsHtml}
      `;
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 45, 20);
      setTimeout(() => {
        if (document.body.contains(ghost)) document.body.removeChild(ghost);
      }, 0);
    }
  };

  const handleColumnDragOver = (e: React.DragEvent, fullIndex: number) => {
    if (!isDragReorderModeActive || dragOrientation !== 'vertical' || draggedColumnIndex === null) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const side = e.clientX < midpoint ? 'left' : 'right';
    setDragOverColumnIndex({ index: fullIndex, side });
  };

  const handleColumnDrop = (e: React.DragEvent, targetFullIndex: number) => {
    e.preventDefault();
    if (draggedColumnIndex !== null && draggedColumnIndex !== targetFullIndex) {
      onReorderColumns(draggedColumnIndex, targetFullIndex);
    }
    setDraggedColumnIndex(null);
    setDragOverColumnIndex(null);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnIndex(null);
    setDragOverColumnIndex(null);
  };

  const handleRowDragStart = (e: React.DragEvent, originalIndex: number, row: AttendanceRow) => {
    if (!isDragReorderModeActive || dragOrientation !== 'horizontal') return;
    setDraggedRowOriginalIndex(originalIndex);

    if (e.dataTransfer) {
      const ghost = document.createElement('div');
      ghost.className = 'drag-sheer-ghost';
      ghost.style.position = 'absolute';
      ghost.style.top = '-9999px';
      ghost.style.left = '-9999px';
      ghost.style.minWidth = '340px';
      ghost.style.maxWidth = '550px';
      ghost.style.zIndex = '9999';

      const firstFewValues = visibleHeaders.slice(0, 4).map((h) => row[h] || '—').join(' | ');
      ghost.innerHTML = `
        <div style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: #1e3a8a; background: rgba(255, 255, 255, 0.95); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-radius: 4px; border: 1px solid #bfdbfe;">
          Row: ${firstFewValues}
        </div>
      `;
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 20, 15);
      setTimeout(() => {
        if (document.body.contains(ghost)) document.body.removeChild(ghost);
      }, 0);
    }
  };

  const handleRowDragOver = (e: React.DragEvent, originalIndex: number) => {
    if (!isDragReorderModeActive || dragOrientation !== 'horizontal' || draggedRowOriginalIndex === null) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const side = e.clientY < midpoint ? 'top' : 'bottom';
    setDragOverRowOriginalIndex({ originalIndex, side });
  };

  const handleRowDrop = (e: React.DragEvent, targetOriginalIndex: number) => {
    e.preventDefault();
    if (draggedRowOriginalIndex !== null && draggedRowOriginalIndex !== targetOriginalIndex) {
      onReorderRows(draggedRowOriginalIndex, targetOriginalIndex);
    }
    setDraggedRowOriginalIndex(null);
    setDragOverRowOriginalIndex(null);
  };

  const handleRowDragEnd = () => {
    setDraggedRowOriginalIndex(null);
    setDragOverRowOriginalIndex(null);
  };

  return (
    <div className="table-container relative bg-white rounded-lg shadow-sm border border-gray-300 mt-4 overflow-x-auto">
      {contextMenu.visible && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={closeContextMenu} />
      )}

      {/* Column Context Menu */}
      {contextMenu.visible && contextMenu.type === 'column' && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg py-1 min-w-[170px] text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div
            onClick={() => {
              if (contextMenu.targetColumnKey) {
                onInsertColumnLeft(contextMenu.targetColumnKey);
              }
              closeContextMenu();
            }}
            className="px-3 py-2 hover:bg-gray-100 flex items-center gap-2 cursor-pointer text-gray-700 font-semibold"
          >
            <span className="text-blue-600 font-bold text-sm">+</span>
            <span>Insert Column Left</span>
          </div>

          <div
            onClick={() => {
              if (contextMenu.targetColumnKey) {
                if (SYSTEM_PROTECTED_HEADERS.includes(contextMenu.targetColumnKey)) {
                  alert('Protected base headers cannot be deleted.');
                } else {
                  onDeleteColumn(contextMenu.targetColumnKey);
                }
              }
              closeContextMenu();
            }}
            className={`px-3 py-2 flex items-center gap-2 cursor-pointer ${
              contextMenu.targetColumnKey && SYSTEM_PROTECTED_HEADERS.includes(contextMenu.targetColumnKey)
                ? 'opacity-40 cursor-not-allowed text-gray-400'
                : 'hover:bg-red-50 text-red-600'
            }`}
          >
            <div className="css-trash-icon" />
            <span>Delete Column</span>
          </div>
        </div>
      )}

      {/* Row Context Menu */}
      {contextMenu.visible && contextMenu.type === 'row' && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg py-1 min-w-[160px] text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div
            onClick={() => {
              if (contextMenu.targetRowIndex !== undefined) {
                onInsertRowAbove(contextMenu.targetRowIndex);
              }
              closeContextMenu();
            }}
            className="px-3 py-2 hover:bg-gray-100 flex items-center gap-2 cursor-pointer text-gray-700 font-semibold"
          >
            <span className="text-blue-600 font-bold text-sm">+</span>
            <span>Insert Row Above</span>
          </div>

          <div
            onClick={() => {
              if (contextMenu.targetRowIndex !== undefined) {
                onDeleteRow(contextMenu.targetRowIndex);
              }
              closeContextMenu();
            }}
            className="px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer"
          >
            <div className="css-trash-icon" />
            <span>Delete Row</span>
          </div>
        </div>
      )}

      <table id="master-table" className="w-full border-collapse">
        <thead>
          <tr id="table-header-letters">
            <th
              className="excel-row-header w-10 min-w-10 border border-gray-200 text-center select-none py-1"
              style={{ width: '40px' }}
              onClick={onToggleSelectAll}
              title={allVisibleSelected ? 'Deselect all visible rows' : 'Select all visible rows'}
            >
              <div className="flex items-center justify-center cursor-pointer">
                {allVisibleSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                ) : someVisibleSelected ? (
                  <MinusSquare className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                )}
              </div>
            </th>

            <th className="excel-row-header w-12 min-w-12 border border-gray-200" style={{ width: '48px' }} />

            {visibleHeaders.map((header) => {
              const fullIdx = headers.indexOf(header);
              const letter = getExcelColumnLetterLabel(fullIdx);
              const isColDragging = draggedColumnIndex === fullIdx;
              const isDragOver = dragOverColumnIndex?.index === fullIdx;
              const dragOverClass = isDragOver
                ? dragOverColumnIndex.side === 'left'
                  ? 'header-drag-over-left'
                  : 'header-drag-over-right'
                : '';

              return (
                <th
                  key={`col-letter-${header}-${fullIdx}`}
                  draggable={isDragReorderModeActive && dragOrientation === 'vertical'}
                  onDragStart={(e) => handleColumnDragStart(e, fullIdx)}
                  onDragOver={(e) => handleColumnDragOver(e, fullIdx)}
                  onDrop={(e) => handleColumnDrop(e, fullIdx)}
                  onDragEnd={handleColumnDragEnd}
                  onContextMenu={(e) => handleColumnContextMenu(e, header)}
                  className={`excel-row-header border border-gray-200 py-1 text-xs select-none transition-colors ${
                    isDragReorderModeActive && dragOrientation === 'vertical' ? 'draggable-header hover:bg-blue-50 cursor-grab' : ''
                  } ${isColDragging ? 'header-dragging' : ''} ${dragOverClass}`}
                  title={
                    isDragReorderModeActive && dragOrientation === 'vertical'
                      ? 'Drag column letter to reorder'
                      : 'Right-click for column options'
                  }
                >
                  {letter}
                </th>
              );
            })}
          </tr>

          <tr id="table-headers" className="bg-gray-50/80">
            <th className="excel-row-header border border-gray-200 text-gray-400 text-2xs uppercase text-center" />
            <th className="excel-row-header border border-gray-200 text-gray-500 text-xs text-center font-bold">#</th>
            {visibleHeaders.map((header) => {
              const fullIdx = headers.indexOf(header);
              const isColDragging = draggedColumnIndex === fullIdx;
              const isColDragOver = dragOverColumnIndex?.index === fullIdx;
              const colDragClass = isColDragging
                ? 'column-dragging-cell'
                : isColDragOver
                ? dragOverColumnIndex.side === 'left'
                  ? 'column-drag-over-left-cell'
                  : 'column-drag-over-right-cell'
                : '';

              const isNameOrDate = header === 'Participant Name' || header === 'Class Date';
              const isPrimary =
                (isNamePriorityPrimary && header === 'Participant Name') ||
                (!isNamePriorityPrimary && header === 'Class Date');
              const currentDir = header === 'Participant Name' ? nameOrder : dateOrder;

              return (
                <th
                  key={`col-title-${header}-${fullIdx}`}
                  className={`border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-700 select-none transition-colors ${colDragClass}`}
                >
                  {isNameOrDate ? (
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        onClick={() => {
                          if (!isDragReorderModeActive && !isRankLocked) {
                            onHeaderSortClick(header);
                          }
                        }}
                        className={`cursor-pointer transition-colors ${
                          !isDragReorderModeActive && !isRankLocked ? 'hover:text-blue-600' : ''
                        }`}
                        title={
                          isRankLocked
                            ? 'Sort rank is locked'
                            : isDragReorderModeActive
                            ? 'Organize mode is on'
                            : 'Click to set as primary sort priority'
                        }
                      >
                        {header}
                        <span className="text-2xs font-normal text-gray-400 ml-1">
                          ({isPrimary ? 'Primary' : 'Secondary'})
                        </span>
                      </span>

                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isRankLocked) onHeaderArrowClick(header);
                        }}
                        className={`css-arrow-icon ${currentDir === 'asc' ? 'arrow-up' : 'arrow-down'} ${
                          isRankLocked ? 'is-disabled' : ''
                        }`}
                        title={isRankLocked ? 'Sort direction locked' : 'Click to toggle sort direction'}
                      />
                    </div>
                  ) : (
                    <span>{header}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody id="table-body">
          {displayData.length === 0 ? (
            <tr>
              <td
                colSpan={visibleHeaders.length + 2}
                className="text-center py-10 text-gray-400 text-sm italic border border-gray-200"
              >
                No attendance records match your filter criteria.
              </td>
            </tr>
          ) : (
            displayData.map(({ row, originalIndex }, displayIdx) => {
              const isRowHighlighted = highlightedRowIndices.has(originalIndex);
              const isActiveGroupRow = activeGroupRowIndices.has(originalIndex);
              const isRowSelected = selectedRowIndices.has(originalIndex);
              const isRowDragging = draggedRowOriginalIndex === originalIndex;
              const isDragOver = dragOverRowOriginalIndex?.originalIndex === originalIndex;
              const dragOverRowClass = isDragOver
                ? dragOverRowOriginalIndex.side === 'top'
                  ? 'row-drag-over-top'
                  : 'row-drag-over-bottom'
                : '';

              return (
                <tr
                  key={`row-${originalIndex}`}
                  id={`table-row-${originalIndex}`}
                  draggable={isDragReorderModeActive && dragOrientation === 'horizontal'}
                  onDragStart={(e) => handleRowDragStart(e, originalIndex, row)}
                  onDragOver={(e) => handleRowDragOver(e, originalIndex)}
                  onDrop={(e) => handleRowDrop(e, originalIndex)}
                  onDragEnd={handleRowDragEnd}
                  className={`transition-colors ${
                    isRowSelected ? 'bg-blue-50/60' : ''
                  } ${isRowHighlighted ? 'duplicate-highlight' : ''} ${
                    isActiveGroupRow ? 'duplicate-highlight-current' : ''
                  } ${isRowDragging ? 'row-dragging' : ''} ${dragOverRowClass} ${
                    isDragReorderModeActive && dragOrientation === 'horizontal' ? 'draggable-row' : ''
                  }`}
                >
                  {/* Checkbox Cell for Bulk Selection */}
                  <td
                    className="excel-row-header border border-gray-200 text-center select-none py-1 cursor-pointer"
                    onClick={() => onToggleSelectRow(originalIndex)}
                    title={isRowSelected ? 'Deselect row' : 'Select row'}
                  >
                    <div className="flex items-center justify-center">
                      {isRowSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
                      )}
                    </div>
                  </td>

                  {/* Row Number Cell */}
                  <td
                    onContextMenu={(e) => handleRowContextMenu(e, originalIndex)}
                    className="excel-row-header border border-gray-200 text-xs font-semibold select-none cursor-pointer"
                    title="Right-click for row options"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {isRowHighlighted && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Duplicate row detected" />
                      )}
                      <span>{displayIdx + 1}</span>
                    </div>
                  </td>

                  {/* Data Cells */}
                  {visibleHeaders.map((header) => {
                    const fullIdx = headers.indexOf(header);
                    const isColDragging = draggedColumnIndex === fullIdx;
                    const isColDragOver = dragOverColumnIndex?.index === fullIdx;
                    const colDragClass = isColDragging
                      ? 'column-dragging-cell'
                      : isColDragOver
                      ? dragOverColumnIndex.side === 'left'
                        ? 'column-drag-over-left-cell'
                        : 'column-drag-over-right-cell'
                      : '';

                    const isFindMatch = findMatches?.some(
                      (m) => m.rowIndex === originalIndex && m.columnKey === header
                    );
                    const isActiveFindMatch =
                      activeFindMatch?.rowIndex === originalIndex &&
                      activeFindMatch?.columnKey === header;
                    const findMatchClass = isActiveFindMatch
                      ? 'find-match-active-cell'
                      : isFindMatch
                      ? 'find-match-cell'
                      : '';

                    return (
                      <td
                        key={`cell-${originalIndex}-${header}`}
                        id={`cell-${originalIndex}-${header}`}
                        className={`border border-gray-200 px-2 py-1 text-xs transition-colors ${colDragClass} ${findMatchClass}`}
                      >
                        <input
                          type="text"
                          value={row[header] || ''}
                          onChange={(e) => onCellChange(originalIndex, header, e.target.value)}
                          className="w-full px-1 py-0.5 text-xs text-gray-800 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-gray-200"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
