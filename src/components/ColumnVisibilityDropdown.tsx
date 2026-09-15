import React, { useState, useRef, useEffect } from 'react';
import { Columns, Check } from 'lucide-react';

interface ColumnVisibilityDropdownProps {
  allHeaders: string[];
  hiddenHeaders: string[];
  onToggleHeaderVisibility: (header: string) => void;
  onResetVisibility: () => void;
}

export const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({
  allHeaders,
  hiddenHeaders,
  onToggleHeaderVisibility,
  onResetVisibility,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleCount = allHeaders.length - hiddenHeaders.length;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded border border-gray-300 bg-white text-gray-700 shadow-2xs hover:bg-gray-50 transition-all cursor-pointer"
        title="Toggle column visibility"
      >
        <Columns className="w-3.5 h-3.5 text-gray-500" />
        <span>Columns ({visibleCount}/{allHeaders.length})</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black/5 z-50 p-2 text-xs divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="pb-2 flex items-center justify-between">
            <span className="font-bold text-gray-700">Column Visibility</span>
            {hiddenHeaders.length > 0 && (
              <button
                type="button"
                onClick={onResetVisibility}
                className="text-2xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Show All
              </button>
            )}
          </div>

          <div className="pt-2 max-h-60 overflow-y-auto space-y-1">
            {allHeaders.map((header) => {
              const isVisible = !hiddenHeaders.includes(header);
              return (
                <label
                  key={header}
                  onClick={() => onToggleHeaderVisibility(header)}
                  className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer text-gray-700 select-none"
                >
                  <span className={`truncate mr-2 ${isVisible ? 'font-medium' : 'text-gray-400 line-through'}`}>
                    {header}
                  </span>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                      isVisible ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isVisible && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
