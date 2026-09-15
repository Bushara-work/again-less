export interface AttendanceRow {
  [key: string]: string;
}

export interface DuplicateGroup {
  originalIndices: number[];
  sampleRow: AttendanceRow;
  fingerprint: string;
  approved?: boolean;
  ignored?: boolean;
}

export interface SortConfig {
  nameOrder: 'asc' | 'desc';
  dateOrder: 'asc' | 'desc';
  isNamePriorityPrimary: boolean;
  isRankLocked: boolean;
}

export interface FilterConfig {
  participantName: string;
  meetingCode: string;
  minDuration: string;
  maxDuration: string;
  startDate: string;
  endDate: string;
  isStartDateInclusive: boolean;
  isEndDateInclusive: boolean;
  sno: string;
  startedTime: string;
  joinedTime: string;
  stoppedTime: string;
}

export type TimeMode = '12h' | '24h';
export type DragOrientation = 'vertical' | 'horizontal';
export type DuplicateViewScope = 'all' | 'duplicates-only' | 'active-only';

export type GradingMode = 'attendance' | 'points';

export interface AttendanceThresholdConfig {
  minClassesRequired: number;
  minDurationPerClassMinutes: number;
  gradingMode?: GradingMode;
  targetPointsRequired?: number;
  pointsPerClass?: number;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  type: 'column' | 'row' | null;
  targetColumnKey?: string;
  targetRowIndex?: number;
}

export interface ClassAdjustment {
  date: string;
  type: 'pass_to_ignored' | 'fail_to_excused' | 'tag_removed' | 'time_changed' | 'points_changed' | 'bonus_points' | 'removed_points' | 'attendance_toggled';
  description: string;
  note?: string;
  originalTime?: string;
  revisedTime?: string;
  originalPoints?: number;
  revisedPoints?: number;
}

export interface ClassEvaluation {
  date: string;
  attended: boolean;
  durationMinutes: number;
  originalDurationMinutes: number;
  points: number;
  originalPoints: number;
  tag?: 'excused' | 'ignored' | 'pass' | 'fail';
  bonusPoints?: number;
  removedPoints?: number;
  notes?: string;
  timeModified?: boolean;
  pointsModified?: boolean;
}

export interface StudentClassDetail {
  [classDate: string]: ClassEvaluation;
}

export interface ColumnMappingItem {
  masterHeader: string;
  matchedSourceHeader: string | null;
}
