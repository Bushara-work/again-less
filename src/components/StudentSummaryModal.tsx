import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AttendanceRow, AttendanceThresholdConfig } from '../types';
import { parseDurationToMinutes } from '../utils/csv';
import * as XLSX from 'xlsx';
import {
  X,
  GraduationCap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Download,
  Search,
  MessageSquarePlus,
  StickyNote,
  HelpCircle,
  Clock,
  Award,
  ChevronDown,
  Info,
  RotateCcw,
  Plus,
  Minus,
  Check,
  EyeOff,
} from 'lucide-react';

export interface ClassChangeRecord {
  date: string;
  changeType: string;
  originalValue?: string | number;
  revisedValue?: string | number;
  note: string;
}

export interface StudentClassState {
  date: string;
  attended: boolean;
  durationMinutes: number;
  originalDurationMinutes: number;
  points: number;
  originalPoints: number;
  tag?: 'excused' | 'ignored' | null;
  bonusPoints: number;
  removedPoints: number;
  note: string;
}

export interface StudentOverride {
  status?: 'pass' | 'fail' | 'can pass' | 'can pass and fail' | null;
  overridePoints?: number | null;
  note: string;
  classes?: Record<string, StudentClassState>;
}

interface StudentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AttendanceRow[];
  thresholdConfig: AttendanceThresholdConfig;
  onUpdateThresholds: (config: AttendanceThresholdConfig) => void;
  overrides: Record<string, StudentOverride>;
  onUpdateOverride: (studentName: string, override: StudentOverride | null) => void;
}

export const StudentSummaryModal: React.FC<StudentSummaryModalProps> = ({
  isOpen,
  onClose,
  data,
  thresholdConfig,
  onUpdateThresholds,
  overrides,
  onUpdateOverride,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail' | 'can pass' | 'can pass and fail'>('all');

  // Point Mode toggle
  const [isPointMode, setIsPointMode] = useState<boolean>(thresholdConfig.gradingMode === 'points');
  const [targetPoints, setTargetPoints] = useState<number>(thresholdConfig.targetPointsRequired || 100);
  const [basePointsPerClass, setBasePointsPerClass] = useState<number>(thresholdConfig.pointsPerClass || 20);

  // Active student detail/override drawer or popover
  const [activeStudentName, setActiveStudentName] = useState<string | null>(null);

  // Active hover/click popover for Adjusted column
  const [activeAdjustmentPopover, setActiveAdjustmentPopover] = useState<{
    studentName: string;
    x: number;
    y: number;
  } | null>(null);

  // Close adjustment popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#adjustment-popover') && !target.closest('.adj-badge-trigger')) {
        setActiveAdjustmentPopover(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // 1. Calculate distinct class dates in dataset
  const distinctDates = useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => {
      const date = (r['Class Date'] || '').trim();
      if (date) set.add(date);
    });
    return Array.from(set).sort();
  }, [data]);

  const totalClassesCount = Math.max(distinctDates.length, 1);

  // 2. Pre-process base student records by class date
  const rawStudentClassMap = useMemo(() => {
    const map: Record<string, Record<string, { durationMinutes: number }>> = {};
    data.forEach((row) => {
      const name = (row['Participant Name'] || '').trim();
      if (!name) return;
      const date = (row['Class Date'] || '').trim();
      if (!date) return;

      if (!map[name]) map[name] = {};
      const mins = parseDurationToMinutes(row['Attended Duration']);
      if (!map[name][date]) {
        map[name][date] = { durationMinutes: mins };
      } else {
        map[name][date].durationMinutes += mins;
      }
    });
    return map;
  }, [data]);

  // 3. Aggregate student stats, taking into account overrides and class edits
  const studentSummaries = useMemo(() => {
    const studentNames: string[] = (Array.from(
      new Set(data.map((r) => (r['Participant Name'] || '').trim()).filter(Boolean))
    ) as string[]).sort();

    return studentNames.map((name) => {
      const override = overrides[name];
      const classMap = rawStudentClassMap[name] || {};

      // Build complete class-level state for this student across all distinct dates
      const studentClasses: StudentClassState[] = distinctDates.map((date) => {
        const rawClass = classMap[date];
        const rawMins = rawClass ? rawClass.durationMinutes : 0;
        const overriddenClass = override?.classes?.[date];

        const originalMins = rawMins;
        const currentMins = overriddenClass !== undefined ? overriddenClass.durationMinutes : rawMins;

        // Auto-toggle attended based on duration
        const isAttended = currentMins > 0;

        // Base points: 20 pts if qualified, or proportional / base
        const originalPts = rawMins >= thresholdConfig.minDurationPerClassMinutes ? basePointsPerClass : 0;
        const currentPts = overriddenClass?.points !== undefined ? overriddenClass.points : originalPts;

        return {
          date,
          attended: overriddenClass?.attended !== undefined ? overriddenClass.attended : isAttended,
          durationMinutes: currentMins,
          originalDurationMinutes: originalMins,
          points: currentPts,
          originalPoints: originalPts,
          tag: overriddenClass?.tag ?? null,
          bonusPoints: overriddenClass?.bonusPoints || 0,
          removedPoints: overriddenClass?.removedPoints || 0,
          note: overriddenClass?.note || '',
        };
      });

      // Calculate totals
      let attendedClassesCount = 0;
      let qualifiedClassesCount = 0;
      let totalMinutes = 0;
      let totalPoints = 0;
      let hasTimeChanged = false;
      let hasPointsChanged = false;
      let hasClassOverride = false;
      const adjustmentsList: ClassChangeRecord[] = [];

      studentClasses.forEach((sc) => {
        if (sc.attended) attendedClassesCount++;
        totalMinutes += sc.durationMinutes;

        // Check if duration met
        const passesDuration = sc.durationMinutes >= thresholdConfig.minDurationPerClassMinutes;

        // Check tags
        if (sc.tag === 'excused') {
          qualifiedClassesCount++;
          hasClassOverride = true;
          adjustmentsList.push({
            date: sc.date,
            changeType: 'Fail to Excused',
            note: sc.note || 'None',
          });
        } else if (sc.tag === 'ignored') {
          hasClassOverride = true;
          adjustmentsList.push({
            date: sc.date,
            changeType: 'Pass to Ignored',
            note: sc.note || 'None',
          });
        } else if (passesDuration) {
          qualifiedClassesCount++;
        }

        // Check time change
        if (sc.durationMinutes !== sc.originalDurationMinutes) {
          hasTimeChanged = true;
          hasClassOverride = true;
          adjustmentsList.push({
            date: sc.date,
            changeType: 'Time Modified',
            originalValue: `${sc.originalDurationMinutes}m`,
            revisedValue: `${sc.durationMinutes}m`,
            note: sc.note || 'None',
          });
        }

        // Total points calculation
        const netPoints = sc.points + sc.bonusPoints - sc.removedPoints;
        totalPoints += netPoints;

        // Check points change
        if (sc.points !== sc.originalPoints || sc.bonusPoints > 0 || sc.removedPoints > 0) {
          hasPointsChanged = true;
          hasClassOverride = true;
          const details: string[] = [];
          if (sc.points !== sc.originalPoints) details.push(`Base: ${sc.originalPoints} → ${sc.points}`);
          if (sc.bonusPoints > 0) details.push(`+${sc.bonusPoints} bonus`);
          if (sc.removedPoints > 0) details.push(`-${sc.removedPoints} removed`);
          adjustmentsList.push({
            date: sc.date,
            changeType: `Points Adjusted (${details.join(', ')})`,
            originalValue: sc.originalPoints,
            revisedValue: netPoints,
            note: sc.note || 'None',
          });
        }
      });

      const rate = Math.min(100, Math.round((attendedClassesCount / totalClassesCount) * 100));
      const avgMinutes = attendedClassesCount > 0 ? Math.round(totalMinutes / attendedClassesCount) : 0;

      // Check overall override
      const hasOverallOverride = !!override?.status || (isPointMode && override?.overridePoints !== undefined && override?.overridePoints !== null);

      // Suffix construction:
      // * "-Set: O" for an overall override.
      // * "-Set: C" for a class override.
      // * "-Set: OC" if both are active.
      // * "-Set: OCt" if both are active and class attended time were changed.
      // * "-Set: OCp" if both are active and class points were changed.
      let suffix = '';
      if (hasOverallOverride && hasClassOverride) {
        if (hasTimeChanged && hasPointsChanged) {
          suffix = '-Set: OCtp';
        } else if (hasTimeChanged) {
          suffix = '-Set: OCt';
        } else if (hasPointsChanged) {
          suffix = '-Set: OCp';
        } else {
          suffix = '-Set: OC';
        }
      } else if (hasOverallOverride) {
        suffix = '-Set: O';
      } else if (hasClassOverride) {
        suffix = '-Set: C';
      }

      // Base status computation: strictly "pass", "fail", "can pass", or "can pass and fail"
      let baseStatus: 'pass' | 'fail' | 'can pass' | 'can pass and fail' = 'fail';
      let projectionStatus: 'target met' | 'on track' | 'at risk' | 'target unmet' = 'target unmet';

      if (isPointMode) {
        const currentPts = override?.overridePoints !== undefined && override?.overridePoints !== null ? override.overridePoints : totalPoints;
        const requiredPts = targetPoints;

        if (currentPts >= requiredPts) {
          baseStatus = 'pass';
          projectionStatus = 'target met';
        } else {
          // Check if remaining classes could satisfy target
          const potentialRemainingPts = (totalClassesCount - attendedClassesCount) * basePointsPerClass;
          if (currentPts + potentialRemainingPts < requiredPts) {
            baseStatus = 'fail';
            projectionStatus = 'target unmet';
          } else if (currentPts >= requiredPts * 0.7) {
            baseStatus = 'can pass';
            projectionStatus = 'on track';
          } else {
            baseStatus = 'can pass and fail';
            projectionStatus = 'at risk';
          }
        }
      } else {
        // Attendance count mode
        const minReq = thresholdConfig.minClassesRequired;
        if (qualifiedClassesCount >= minReq) {
          baseStatus = 'pass';
          projectionStatus = 'target met';
        } else {
          const remainingClasses = totalClassesCount - attendedClassesCount;
          if (qualifiedClassesCount + remainingClasses < minReq) {
            baseStatus = 'fail';
            projectionStatus = 'target unmet';
          } else if (qualifiedClassesCount >= minReq * 0.7) {
            baseStatus = 'can pass';
            projectionStatus = 'on track';
          } else {
            baseStatus = 'can pass and fail';
            projectionStatus = 'at risk';
          }
        }
      }

      // If user provided an overall status override
      if (override?.status) {
        baseStatus = override.status;
      }

      const displayStatusText = `${baseStatus}${suffix}`;

      return {
        name,
        attendedCount: attendedClassesCount,
        qualifyingCount: qualifiedClassesCount,
        rate,
        totalMinutes,
        avgMinutes,
        totalPoints,
        baseStatus,
        displayStatusText,
        projectionStatus,
        adjustmentsCount: adjustmentsList.length,
        adjustmentsList,
        studentClasses,
        override,
        hasOverallOverride,
        hasClassOverride,
      };
    });
  }, [
    data,
    distinctDates,
    totalClassesCount,
    thresholdConfig,
    overrides,
    rawStudentClassMap,
    isPointMode,
    targetPoints,
    basePointsPerClass,
  ]);

  // Filtered students for display
  const filteredSummaries = useMemo(() => {
    return studentSummaries.filter((s) => {
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && s.baseStatus !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [studentSummaries, searchQuery, statusFilter]);

  // Overall Statistics for KPIs (Without color name text)
  const stats = useMemo(() => {
    const totalStudents = studentSummaries.length;
    const passCount = studentSummaries.filter((s) => s.baseStatus === 'pass').length;
    const canPassCount = studentSummaries.filter((s) => s.baseStatus === 'can pass').length;
    const canPassAndFailCount = studentSummaries.filter((s) => s.baseStatus === 'can pass and fail').length;
    const failCount = studentSummaries.filter((s) => s.baseStatus === 'fail').length;
    const avgAttendance =
      totalStudents > 0
        ? Math.round(studentSummaries.reduce((acc, s) => acc + s.rate, 0) / totalStudents)
        : 0;

    return { totalStudents, passCount, canPassCount, canPassAndFailCount, failCount, avgAttendance };
  }, [studentSummaries]);

  // Active student object being edited in the drawer
  const activeStudent = useMemo(() => {
    if (!activeStudentName) return null;
    return studentSummaries.find((s) => s.name === activeStudentName) || null;
  }, [activeStudentName, studentSummaries]);

  if (!isOpen) return null;

  // Handler for class-level duration change
  const handleClassDurationChange = (studentName: string, date: string, newDurationMins: number) => {
    const currentOverride: StudentOverride = overrides[studentName] ? { ...overrides[studentName] } : { note: '' };
    const classes = currentOverride.classes ? { ...currentOverride.classes } : {};
    const existing = classes[date] || {
      date,
      attended: newDurationMins > 0,
      durationMinutes: newDurationMins,
      originalDurationMinutes: rawStudentClassMap[studentName]?.[date]?.durationMinutes || 0,
      points: basePointsPerClass,
      originalPoints: basePointsPerClass,
      bonusPoints: 0,
      removedPoints: 0,
      note: '',
    };

    classes[date] = {
      ...existing,
      durationMinutes: newDurationMins,
      // Auto-toggle attended flag based on duration
      attended: newDurationMins > 0,
    };

    onUpdateOverride(studentName, {
      ...currentOverride,
      classes,
    });
  };

  // Handler for class-level attended flag toggle
  const handleClassAttendedToggle = (studentName: string, date: string, attended: boolean) => {
    const currentOverride: StudentOverride = overrides[studentName] ? { ...overrides[studentName] } : { note: '' };
    const classes = currentOverride.classes ? { ...currentOverride.classes } : {};
    const existing = classes[date] || {
      date,
      attended,
      durationMinutes: attended ? thresholdConfig.minDurationPerClassMinutes : 0,
      originalDurationMinutes: rawStudentClassMap[studentName]?.[date]?.durationMinutes || 0,
      points: basePointsPerClass,
      originalPoints: basePointsPerClass,
      bonusPoints: 0,
      removedPoints: 0,
      note: '',
    };

    classes[date] = {
      ...existing,
      attended,
      // If toggled to attended and duration was 0, set to minDuration
      durationMinutes: attended && existing.durationMinutes === 0 ? thresholdConfig.minDurationPerClassMinutes : existing.durationMinutes,
    };

    onUpdateOverride(studentName, {
      ...currentOverride,
      classes,
    });
  };

  // Handler for class-level points change
  const handleClassPointsChange = (studentName: string, date: string, newPoints: number) => {
    const currentOverride: StudentOverride = overrides[studentName] ? { ...overrides[studentName] } : { note: '' };
    const classes = currentOverride.classes ? { ...currentOverride.classes } : {};
    const existing = classes[date] || {
      date,
      attended: true,
      durationMinutes: rawStudentClassMap[studentName]?.[date]?.durationMinutes || 0,
      originalDurationMinutes: rawStudentClassMap[studentName]?.[date]?.durationMinutes || 0,
      points: newPoints,
      originalPoints: basePointsPerClass,
      bonusPoints: 0,
      removedPoints: 0,
      note: '',
    };

    classes[date] = {
      ...existing,
      points: newPoints,
    };

    onUpdateOverride(studentName, {
      ...currentOverride,
      classes,
    });
  };

  // Handler for Bonus / Removed Points
  const handleClassPointsAdjustment = (
    studentName: string,
    date: string,
    type: 'bonus' | 'remove',
    amount: number,
    noteText: string
  ) => {
    const currentOverride: StudentOverride = overrides[studentName] ? { ...overrides[studentName] } : { note: '' };
    const classes = currentOverride.classes ? { ...currentOverride.classes } : {};
    const existing = classes[date] || {
      date,
      attended: true,
      durationMinutes: rawStudentClassMap[studentName]?.[date]?.durationMinutes || 0,
      originalDurationMinutes: rawStudentClassMap[studentName]?.[date]?.durationMinutes || 0,
      points: basePointsPerClass,
      originalPoints: basePointsPerClass,
      bonusPoints: 0,
      removedPoints: 0,
      note: '',
    };

    classes[date] = {
      ...existing,
      bonusPoints: type === 'bonus' ? existing.bonusPoints + amount : existing.bonusPoints,
      removedPoints: type === 'remove' ? existing.removedPoints + amount : existing.removedPoints,
      note: noteText || existing.note,
    };

    onUpdateOverride(studentName, {
      ...currentOverride,
      classes,
    });
  };

  // Handler for Class Tagging: "excuse" (for failed) / "ignore" (for passed) / remove tag
  const handleToggleClassTag = (studentName: string, date: string, targetTag: 'excused' | 'ignored' | null) => {
    const currentOverride: StudentOverride = overrides[studentName] ? { ...overrides[studentName] } : { note: '' };
    const classes = currentOverride.classes ? { ...currentOverride.classes } : {};
    const existing = classes[date] || {
      date,
      attended: true,
      durationMinutes: rawStudentClassMap[studentName]?.[date]?.durationMinutes || 0,
      originalDurationMinutes: rawStudentClassMap[studentName]?.[date]?.durationMinutes || 0,
      points: basePointsPerClass,
      originalPoints: basePointsPerClass,
      bonusPoints: 0,
      removedPoints: 0,
      note: '',
    };

    classes[date] = {
      ...existing,
      tag: targetTag,
    };

    // Requirement 6: "If a class is tagged and the tag is removed, the override must be automatically removed from its pass/fail status (provided no other classes remain in an excused or ignored status)."
    let nextStatus = currentOverride.status;
    if (targetTag === null) {
      const otherTaggedClasses = Object.entries(classes).filter(
        ([d, c]) => d !== date && (c.tag === 'excused' || c.tag === 'ignored')
      );
      if (otherTaggedClasses.length === 0) {
        nextStatus = null; // Automatically remove override
      }
    }

    onUpdateOverride(studentName, {
      ...currentOverride,
      status: nextStatus,
      classes,
    });
  };

  // Helper to get color classes for status text
  const getStatusBadgeStyle = (statusWithSuffix: string) => {
    if (statusWithSuffix.startsWith('pass')) {
      return 'bg-green-50 text-green-700 border-green-300';
    }
    if (statusWithSuffix.startsWith('can pass and fail')) {
      return 'bg-orange-50 text-orange-700 border-orange-300';
    }
    if (statusWithSuffix.startsWith('can pass')) {
      return 'bg-lime-50 text-lime-700 border-lime-300';
    }
    if (statusWithSuffix.startsWith('fail')) {
      return 'bg-red-50 text-red-700 border-red-300';
    }
    return 'bg-gray-50 text-gray-700 border-gray-300';
  };

  // Helper for Projection badge colors
  const getProjectionBadgeStyle = (proj: 'target met' | 'on track' | 'at risk' | 'target unmet') => {
    switch (proj) {
      case 'target met':
        return 'bg-green-50 text-green-700 border-green-300 font-semibold';
      case 'on track':
        return 'bg-lime-50 text-lime-700 border-lime-300 font-semibold';
      case 'at risk':
        return 'bg-orange-50 text-orange-700 border-orange-300 font-semibold';
      case 'target unmet':
        return 'bg-red-50 text-red-700 border-red-300 font-semibold';
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Student Name',
      'Attendance Rate',
      'Classes Attended',
      'Qualified Classes',
      'Total Minutes',
      'Avg Duration',
      'Status',
      'Adjusted Count',
      'Projection',
      'Notes & Reason',
    ];

    let csvContent = headers.join(',') + '\n';
    studentSummaries.forEach((s) => {
      const row = [
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.rate}%"`,
        `"${s.attendedCount}/${totalClassesCount}"`,
        s.qualifyingCount,
        `${s.totalMinutes}m`,
        `${s.avgMinutes}m`,
        `"${s.displayStatusText}"`,
        s.adjustmentsCount,
        `"${s.projectionStatus}"`,
        `"${(s.override?.note || '').replace(/"/g, '""')}"`,
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student_attendance_summary.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to Excel
  const handleExportXLSX = () => {
    const sheetData = studentSummaries.map((s) => ({
      'Student Name': s.name,
      'Attendance Rate': `${s.rate}%`,
      'Classes Attended': `${s.attendedCount}/${totalClassesCount}`,
      'Qualified Classes': s.qualifyingCount,
      'Total Minutes': `${s.totalMinutes}m`,
      'Avg Duration': `${s.avgMinutes}m`,
      'Status': s.displayStatusText,
      'Adjusted Count': s.adjustmentsCount,
      'Projection': s.projectionStatus,
      'Notes & Reason': s.override?.note || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Rates');
    XLSX.writeFile(workbook, 'student_attendance_summary.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Student Attendance & Evaluation Dashboard</h2>
              <p className="text-xs text-gray-500">
                Manage grading criteria, point systems, class modifications, and student projections across {totalClassesCount} session(s).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar: Mode Toggle, Passing Thresholds & Flexible Point Controls */}
        <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-200 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-700">
          <div className="flex items-center gap-2 font-medium">
            <Sliders className="w-4 h-4 text-amber-700" />
            <span className="font-semibold text-gray-900">Grading & Threshold Controls:</span>
            {/* Mode Switch: Attendance Mode vs Point Mode */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-amber-300 ml-2">
              <button
                type="button"
                onClick={() => {
                  setIsPointMode(false);
                  onUpdateThresholds({ ...thresholdConfig, gradingMode: 'attendance' });
                }}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  !isPointMode ? 'bg-amber-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Class Count Mode
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPointMode(true);
                  onUpdateThresholds({
                    ...thresholdConfig,
                    gradingMode: 'points',
                    targetPointsRequired: targetPoints,
                    pointsPerClass: basePointsPerClass,
                  });
                }}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  isPointMode ? 'bg-amber-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Point Mode
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Minimum Duration */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="min-dur-input" className="text-gray-700 font-semibold">
                Min. Duration per Class:
              </label>
              <input
                id="min-dur-input"
                type="number"
                min="0"
                step="5"
                value={thresholdConfig.minDurationPerClassMinutes}
                onChange={(e) =>
                  onUpdateThresholds({
                    ...thresholdConfig,
                    minDurationPerClassMinutes: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
                className="w-16 px-2 py-1 bg-white border border-amber-300 rounded font-bold text-center text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-gray-500">mins</span>
            </div>

            {!isPointMode ? (
              /* Min Classes Required in Class Mode */
              <div className="flex items-center gap-1.5">
                <label htmlFor="min-classes-input" className="text-gray-700 font-semibold">
                  Min. Classes Required:
                </label>
                <input
                  id="min-classes-input"
                  type="number"
                  min="1"
                  max={totalClassesCount}
                  value={thresholdConfig.minClassesRequired}
                  onChange={(e) =>
                    onUpdateThresholds({
                      ...thresholdConfig,
                      minClassesRequired: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="w-14 px-2 py-1 bg-white border border-amber-300 rounded font-bold text-center text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-gray-500">/ {totalClassesCount}</span>
              </div>
            ) : (
              /* Flexible Point Selection: Menu range OR manual type */
              <div className="flex items-center gap-2">
                <label htmlFor="target-points-input" className="text-gray-700 font-semibold">
                  Target Points Needed:
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="target-points-input"
                    type="number"
                    min="1"
                    step="5"
                    value={targetPoints}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setTargetPoints(val);
                      onUpdateThresholds({ ...thresholdConfig, targetPointsRequired: val });
                    }}
                    className="w-16 px-2 py-1 bg-white border border-amber-300 rounded font-bold text-center text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <select
                    value={targetPoints}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTargetPoints(val);
                      onUpdateThresholds({ ...thresholdConfig, targetPointsRequired: val });
                    }}
                    className="border border-amber-300 rounded px-1.5 py-1 bg-white text-gray-700 font-semibold text-xs cursor-pointer"
                    title="Select standard point target from menu"
                  >
                    <option value={40}>40 pts</option>
                    <option value={60}>60 pts</option>
                    <option value={80}>80 pts</option>
                    <option value={100}>100 pts</option>
                    <option value={150}>150 pts</option>
                    <option value={200}>200 pts</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <span className="text-gray-500">Base / Class:</span>
                  <input
                    type="number"
                    min="1"
                    value={basePointsPerClass}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setBasePointsPerClass(val);
                      onUpdateThresholds({ ...thresholdConfig, pointsPerClass: val });
                    }}
                    className="w-12 px-1.5 py-1 bg-white border border-amber-300 rounded font-bold text-center text-gray-900 text-xs"
                  />
                  <span className="text-gray-500">pts</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick KPI Cards (No color name text) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-gray-50/50 border-b border-gray-200">
          <div className="bg-white p-2.5 rounded-lg border border-gray-200 text-center shadow-2xs">
            <div className="text-2xs font-semibold text-gray-500 uppercase">Total Students</div>
            <div className="text-lg font-bold text-gray-900">{stats.totalStudents}</div>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-gray-200 text-center shadow-2xs">
            <div className="text-2xs font-semibold text-gray-500 uppercase">Avg Attendance</div>
            <div className="text-lg font-bold text-blue-600">{stats.avgAttendance}%</div>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-gray-200 text-center shadow-2xs">
            <div className="text-2xs font-semibold text-green-700 uppercase">Pass</div>
            <div className="text-lg font-bold text-green-600">{stats.passCount}</div>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-gray-200 text-center shadow-2xs">
            <div className="text-2xs font-semibold text-lime-700 uppercase">Can Pass</div>
            <div className="text-lg font-bold text-lime-600">{stats.canPassCount}</div>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-gray-200 text-center shadow-2xs">
            <div className="text-2xs font-semibold text-red-700 uppercase">Fail</div>
            <div className="text-lg font-bold text-red-600">{stats.failCount}</div>
          </div>
        </div>

        {/* Search, Filter & Export Bar */}
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student by name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-md border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded font-medium cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({studentSummaries.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pass')}
                className={`px-2 py-1 rounded font-medium cursor-pointer ${
                  statusFilter === 'pass' ? 'bg-green-600 text-white shadow-2xs font-bold' : 'text-green-700 hover:bg-green-100'
                }`}
              >
                Pass
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('can pass')}
                className={`px-2 py-1 rounded font-medium cursor-pointer ${
                  statusFilter === 'can pass' ? 'bg-lime-600 text-white shadow-2xs font-bold' : 'text-lime-700 hover:bg-lime-100'
                }`}
              >
                Can Pass
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('can pass and fail')}
                className={`px-2 py-1 rounded font-medium cursor-pointer ${
                  statusFilter === 'can pass and fail' ? 'bg-orange-500 text-white shadow-2xs font-bold' : 'text-orange-700 hover:bg-orange-100'
                }`}
              >
                At Risk
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('fail')}
                className={`px-2 py-1 rounded font-medium cursor-pointer ${
                  statusFilter === 'fail' ? 'bg-red-600 text-white shadow-2xs font-bold' : 'text-red-700 hover:bg-red-100'
                }`}
              >
                Fail
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5 border border-gray-300 cursor-pointer"
              title="Download Student Attendance Summary as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>

            <button
              type="button"
              onClick={handleExportXLSX}
              className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
              title="Download Student Attendance Summary as Excel Workbook (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (.xlsx)
            </button>
          </div>
        </div>

        {/* Student Table with Preserved Exact Columns Order */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50/80 text-2xs font-bold uppercase text-gray-500 tracking-wider">
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Attendance Rate</th>
                <th className="py-2.5 px-3">Classes Attended</th>
                <th className="py-2.5 px-3">Qualified (≥ {thresholdConfig.minDurationPerClassMinutes}m)</th>
                {isPointMode && <th className="py-2.5 px-3">Points Earned</th>}
                <th className="py-2.5 px-3">Total Minutes</th>
                <th className="py-2.5 px-3">Avg Duration</th>
                <th className="py-2.5 px-3">Status</th>
                {/* Column Renamed to "Adjusted" in its exact same column position */}
                <th className="py-2.5 px-3">Adjusted</th>
                {/* Column Renamed to "Projection" */}
                <th className="py-2.5 px-3">Projection</th>
                <th className="py-2.5 px-3">Notes & Reason</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={isPointMode ? 12 : 11} className="py-8 text-center text-gray-400 italic">
                    No students match the criteria.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((s) => {
                  return (
                    <tr key={s.name} className="hover:bg-slate-50 transition-colors">
                      {/* 1. Student Name */}
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{s.name}</td>

                      {/* 2. Attendance Rate */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${
                                s.baseStatus === 'pass'
                                  ? 'bg-green-500'
                                  : s.baseStatus === 'can pass'
                                  ? 'bg-lime-500'
                                  : s.baseStatus === 'can pass and fail'
                                  ? 'bg-orange-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${s.rate}%` }}
                            />
                          </div>
                          <span className="font-bold text-gray-700 text-2xs">{s.rate}%</span>
                        </div>
                      </td>

                      {/* 3. Classes Attended */}
                      <td className="py-2.5 px-3 font-medium text-gray-700">
                        {s.attendedCount} / {totalClassesCount}
                      </td>

                      {/* 4. Qualified Classes */}
                      <td className="py-2.5 px-3 font-medium">
                        <span
                          className={
                            s.qualifyingCount >= thresholdConfig.minClassesRequired
                              ? 'text-green-700 font-bold'
                              : 'text-red-600 font-semibold'
                          }
                        >
                          {s.qualifyingCount}
                        </span>
                      </td>

                      {/* Point Mode Column if active */}
                      {isPointMode && (
                        <td className="py-2.5 px-3 font-bold text-indigo-700">
                          {s.totalPoints} / {targetPoints} pts
                        </td>
                      )}

                      {/* 5. Total Minutes */}
                      <td className="py-2.5 px-3 text-gray-600">{s.totalMinutes}m</td>

                      {/* 6. Avg Duration */}
                      <td className="py-2.5 px-3 text-gray-600">{s.avgMinutes}m / class</td>

                      {/* 7. Status (strictly "pass", "fail", "can pass", "can pass and fail" + "-Set: ...") */}
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => setActiveStudentName(s.name)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold border transition-all cursor-pointer ${getStatusBadgeStyle(
                            s.displayStatusText
                          )}`}
                          title="Click to view classes or override"
                        >
                          {s.baseStatus === 'pass' && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                          {s.baseStatus === 'can pass' && <Check className="w-3 h-3 text-lime-600" />}
                          {s.baseStatus === 'can pass and fail' && <AlertTriangle className="w-3 h-3 text-orange-600" />}
                          {s.baseStatus === 'fail' && <XCircle className="w-3 h-3 text-red-600" />}
                          <span>{s.displayStatusText}</span>
                        </button>
                      </td>

                      {/* 8. Adjusted (Renamed from Excused Classes) */}
                      <td className="py-2.5 px-3 relative">
                        {s.adjustmentsCount === 0 ? (
                          <span className="text-gray-400 italic text-2xs select-none">none</span>
                        ) : (
                          <div className="relative inline-block">
                            <span
                              className="adj-badge-trigger bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-semibold px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveAdjustmentPopover({
                                  studentName: s.name,
                                  x: rect.left,
                                  y: rect.bottom + 4,
                                });
                              }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveAdjustmentPopover({
                                  studentName: s.name,
                                  x: rect.left,
                                  y: rect.bottom + 4,
                                });
                              }}
                              title="Click or hover to view modification details"
                            >
                              <span>{s.adjustmentsCount} Adj</span>
                              <ChevronDown className="w-3 h-3 text-amber-700" />
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 9. Projection (Renamed from Projection / Target) */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-2xs border ${getProjectionBadgeStyle(
                            s.projectionStatus
                          )}`}
                        >
                          {s.projectionStatus}
                        </span>
                      </td>

                      {/* 10. Notes & Reason */}
                      <td className="py-2.5 px-3 text-gray-600 max-w-[160px]">
                        {s.override?.note ? (
                          <div
                            className="flex items-center gap-1 text-xs text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 truncate"
                            title={s.override.note}
                          >
                            <StickyNote className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="truncate">{s.override.note}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 italic text-2xs">—</span>
                        )}
                      </td>

                      {/* 11. Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveStudentName(s.name)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                          <span>Classes / Override</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>
            Click any student's status badge or 'Classes / Override' to edit class time, points, tags, or bonus points.
          </span>
          <button type="button" onClick={onClose} className="btn btn-secondary text-xs py-1.5 px-4 cursor-pointer">
            Close
          </button>
        </div>
      </div>

      {/* REQ 8: Adjusted Column Tooltip / Popover */}
      {activeAdjustmentPopover && (
        <div
          id="adjustment-popover"
          style={{
            position: 'fixed',
            top: activeAdjustmentPopover.y,
            left: Math.min(activeAdjustmentPopover.x, window.innerWidth - 320),
            zIndex: 70,
          }}
          className="w-80 bg-white rounded-lg shadow-xl border border-amber-300 p-3 text-xs text-gray-800 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between border-b border-amber-200 pb-1.5 mb-2">
            <span className="font-bold text-gray-900 text-2xs uppercase tracking-wider flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-amber-600" />
              Adjustments for {activeAdjustmentPopover.studentName}
            </span>
            <button
              type="button"
              onClick={() => setActiveAdjustmentPopover(null)}
              className="text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {studentSummaries
              .find((s) => s.name === activeAdjustmentPopover.studentName)
              ?.adjustmentsList.map((adj, idx) => (
                <div key={idx} className="bg-amber-50/70 p-2 rounded border border-amber-200 text-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800">{adj.date}</span>
                    <span className="font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                      {adj.changeType}
                    </span>
                  </div>
                  {adj.originalValue !== undefined && adj.revisedValue !== undefined && (
                    <div className="text-gray-600 font-mono">
                      original: <span className="font-semibold">{adj.originalValue}</span> / revised:{' '}
                      <span className="font-semibold text-blue-700">{adj.revisedValue}</span>
                    </div>
                  )}
                  <div className="text-gray-600">
                    <span className="text-gray-500 font-medium">Reason: </span>
                    <span className={adj.note === 'None' ? 'text-gray-400 italic' : 'text-gray-800 font-medium'}>
                      {adj.note}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Class Exception & Detailed Override Panel Modal */}
      {activeStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <span>Class Details & Overrides: {activeStudent.name}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyle(activeStudent.displayStatusText)}`}>
                    {activeStudent.displayStatusText}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Change individual class attendance, duration, points, bonus/removal, or excuse/ignore tags.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStudentName(null)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* REQ 2 & 4: Overall Override Panel */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                    Overall Student Status Override:
                  </span>
                  {activeStudent.hasOverallOverride && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateOverride(activeStudent.name, {
                          ...activeStudent.override,
                          status: null,
                          overridePoints: null,
                          note: activeStudent.override?.note || '',
                        });
                      }}
                      className="text-2xs text-red-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset to Automatic Status
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status buttons: strictly "pass", "fail", "can pass", "can pass and fail" */}
                  <span className="text-xs text-gray-600 font-medium">Evaluation Tag:</span>
                  {(['pass', 'can pass', 'can pass and fail', 'fail'] as const).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        onUpdateOverride(activeStudent.name, {
                          ...(activeStudent.override || { note: '' }),
                          status: tag,
                        });
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md border transition-all cursor-pointer ${
                        activeStudent.override?.status === tag
                          ? tag === 'pass'
                            ? 'bg-green-600 text-white border-green-700 shadow-xs'
                            : tag === 'can pass'
                            ? 'bg-lime-600 text-white border-lime-700 shadow-xs'
                            : tag === 'can pass and fail'
                            ? 'bg-orange-600 text-white border-orange-700 shadow-xs'
                            : 'bg-red-600 text-white border-red-700 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}

                  {isPointMode && (
                    <div className="flex items-center gap-1.5 ml-4 border-l border-gray-300 pl-4">
                      <span className="text-xs text-gray-700 font-semibold">Override Points:</span>
                      <input
                        type="number"
                        value={activeStudent.override?.overridePoints ?? activeStudent.totalPoints}
                        onChange={(e) => {
                          const pts = parseInt(e.target.value, 10);
                          onUpdateOverride(activeStudent.name, {
                            ...(activeStudent.override || { note: '' }),
                            overridePoints: isNaN(pts) ? null : pts,
                          });
                        }}
                        className="w-16 px-2 py-1 bg-white border border-gray-300 rounded font-bold text-center text-xs"
                      />
                      <span className="text-gray-500 text-xs">pts</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-2xs font-bold text-gray-700 uppercase mb-1">
                    Overall Note / Reason:
                  </label>
                  <input
                    type="text"
                    value={activeStudent.override?.note || ''}
                    onChange={(e) => {
                      onUpdateOverride(activeStudent.name, {
                        ...(activeStudent.override || { note: '' }),
                        note: e.target.value,
                      });
                    }}
                    placeholder="e.g. Medical excuse provided, verified by advisor..."
                    className="w-full text-xs px-3 py-1.5 bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* REQ 2, 6, 7: Class-by-Class Attendance & Exception Table */}
              <div>
                <div className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Class Session Attendance & Exception Controls ({activeStudent.studentClasses.length}):</span>
                  <span className="text-2xs text-gray-500 font-normal">
                    * Changing duration auto-toggles attended status
                  </span>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200 text-2xs font-bold text-gray-600 uppercase">
                        <th className="py-2 px-3">Class Date</th>
                        <th className="py-2 px-3">Attendance Flag</th>
                        <th className="py-2 px-3">Attended Duration</th>
                        {isPointMode && <th className="py-2 px-3">Points</th>}
                        <th className="py-2 px-3">Tag Status</th>
                        <th className="py-2 px-3">Point Adjustments (+ / -)</th>
                        <th className="py-2 px-3">Note</th>
                        <th className="py-2 px-3 text-right">Exception Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeStudent.studentClasses.map((sc) => {
                        const passed = sc.durationMinutes >= thresholdConfig.minDurationPerClassMinutes;
                        const isTimeChanged = sc.durationMinutes !== sc.originalDurationMinutes;
                        const isPointsChanged = sc.points !== sc.originalPoints;

                        return (
                          <tr key={sc.date} className="hover:bg-slate-50/80">
                            {/* Class Date */}
                            <td className="py-2 px-3 font-semibold text-gray-800 whitespace-nowrap">
                              {sc.date}
                            </td>

                            {/* REQ 7: Attendance Flag with Auto-Toggle */}
                            <td className="py-2 px-3">
                              <button
                                type="button"
                                onClick={() => handleClassAttendedToggle(activeStudent.name, sc.date, !sc.attended)}
                                className={`px-2 py-0.5 rounded text-2xs font-bold border transition-colors cursor-pointer ${
                                  sc.attended
                                    ? 'bg-green-100 text-green-800 border-green-300'
                                    : 'bg-gray-100 text-gray-500 border-gray-300'
                                }`}
                              >
                                {sc.attended ? 'Attended' : 'Not Attended'}
                              </button>
                            </td>

                            {/* REQ 6 & 7: Duration Display & Editable input */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={sc.durationMinutes}
                                  onChange={(e) =>
                                    handleClassDurationChange(
                                      activeStudent.name,
                                      sc.date,
                                      Math.max(0, parseInt(e.target.value, 10) || 0)
                                    )
                                  }
                                  className="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="text-gray-500 text-xs">m</span>
                              </div>
                              {/* Display original & revised if changed */}
                              {isTimeChanged && (
                                <div className="text-2xs text-blue-700 font-mono mt-0.5">
                                  original: {sc.originalDurationMinutes}m / revised: {sc.durationMinutes}m
                                </div>
                              )}
                            </td>

                            {/* REQ 2 & 6: Points Mode Columns */}
                            {isPointMode && (
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    value={sc.points}
                                    onChange={(e) =>
                                      handleClassPointsChange(
                                        activeStudent.name,
                                        sc.date,
                                        Math.max(0, parseInt(e.target.value, 10) || 0)
                                      )
                                    }
                                    className="w-12 px-1.5 py-0.5 border border-gray-300 rounded text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className="text-gray-500 text-xs">pts</span>
                                </div>
                                {isPointsChanged && (
                                  <div className="text-2xs text-indigo-700 font-mono mt-0.5">
                                    original: {sc.originalPoints} / revised: {sc.points}
                                  </div>
                                )}
                              </td>
                            )}

                            {/* REQ 4: Tag status ("excused" without the "tag" word) */}
                            <td className="py-2 px-3">
                              {sc.tag === 'excused' ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold text-2xs">
                                  excused
                                </span>
                              ) : sc.tag === 'ignored' ? (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 border border-gray-300 rounded font-semibold text-2xs">
                                  ignored
                                </span>
                              ) : passed ? (
                                <span className="text-green-700 font-semibold text-2xs">pass</span>
                              ) : (
                                <span className="text-red-600 font-semibold text-2xs">fail</span>
                              )}
                            </td>

                            {/* REQ 2: Point Adjustments (+ Bonus / - Remove) with Notes */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const notePrompt = prompt('Enter note for adding Bonus Points:');
                                    handleClassPointsAdjustment(activeStudent.name, sc.date, 'bonus', 5, notePrompt || '');
                                  }}
                                  className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-2xs font-bold cursor-pointer"
                                  title="Add +5 Bonus Points"
                                >
                                  + Bonus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const notePrompt = prompt('Enter note for removing Points:');
                                    handleClassPointsAdjustment(activeStudent.name, sc.date, 'remove', 5, notePrompt || '');
                                  }}
                                  className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded text-2xs font-bold cursor-pointer"
                                  title="Remove 5 Points"
                                >
                                  - Remove
                                </button>
                                {(sc.bonusPoints > 0 || sc.removedPoints > 0) && (
                                  <span className="text-2xs font-bold font-mono">
                                    {sc.bonusPoints > 0 && <span className="text-green-600">+{sc.bonusPoints} </span>}
                                    {sc.removedPoints > 0 && <span className="text-red-600">-{sc.removedPoints}</span>}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Notes */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={sc.note}
                                onChange={(e) => {
                                  const currentOverride: StudentOverride = overrides[activeStudent.name]
                                    ? { ...overrides[activeStudent.name] }
                                    : { note: '' };
                                  const classes = currentOverride.classes ? { ...currentOverride.classes } : {};
                                  classes[sc.date] = {
                                    ...(classes[sc.date] || sc),
                                    note: e.target.value,
                                  };
                                  onUpdateOverride(activeStudent.name, {
                                    ...currentOverride,
                                    classes,
                                  });
                                }}
                                placeholder="Note / reason..."
                                className="w-28 px-1.5 py-0.5 border border-gray-300 rounded text-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>

                            {/* REQ 6: Passed classes have 'ignore' button, failed have 'excuse' */}
                            <td className="py-2 px-3 text-right whitespace-nowrap">
                              {sc.tag ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleClassTag(activeStudent.name, sc.date, null)}
                                  className="text-2xs text-gray-500 hover:text-red-600 font-semibold hover:underline cursor-pointer"
                                  title="Remove tag (automatically removes override if no other tagged classes remain)"
                                >
                                  Remove Tag
                                </button>
                              ) : passed ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const notePrompt = prompt('Reason for ignoring passed class (optional):');
                                    if (notePrompt !== null) {
                                      handleToggleClassTag(activeStudent.name, sc.date, 'ignored');
                                      if (notePrompt) {
                                        const cur = overrides[activeStudent.name] || { note: '' };
                                        const cls = cur.classes || {};
                                        cls[sc.date] = { ...(cls[sc.date] || sc), note: notePrompt };
                                        onUpdateOverride(activeStudent.name, { ...cur, classes: cls });
                                      }
                                    }
                                  }}
                                  className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-2xs py-0.5 px-2 rounded cursor-pointer"
                                  title="Ignore passed class"
                                >
                                  <EyeOff className="w-3 h-3 text-gray-500" />
                                  <span>Ignore</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const notePrompt = prompt('Reason for excusing failed class (e.g. sick note):');
                                    if (notePrompt !== null) {
                                      handleToggleClassTag(activeStudent.name, sc.date, 'excused');
                                      if (notePrompt) {
                                        const cur = overrides[activeStudent.name] || { note: '' };
                                        const cls = cur.classes || {};
                                        cls[sc.date] = { ...(cls[sc.date] || sc), note: notePrompt };
                                        onUpdateOverride(activeStudent.name, { ...cur, classes: cls });
                                      }
                                    }
                                  }}
                                  className="btn bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-2xs py-0.5 px-2 rounded cursor-pointer"
                                  title="Excuse failed class"
                                >
                                  <span>Excuse</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setActiveStudentName(null)}
                className="btn btn-primary text-xs py-1.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
