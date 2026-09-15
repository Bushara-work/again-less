import { AttendanceRow, DuplicateGroup, TimeMode, SortConfig } from '../types';
import * as XLSX from 'xlsx';

export const MASTER_HEADERS: string[] = [
  'SNo',
  'Participant Name',
  'Class Date',
  'Attended Duration',
  'Attendance Started at',
  'Joined at(beta)',
  'Attendance Stopped at',
  'Meeting code',
];

export const SYSTEM_PROTECTED_HEADERS: string[] = [
  'SNo',
  'Participant Name',
  'Class Date',
  'Attended Duration',
];

// Header mapping dictionary for auto-mapping incoming messy CSV column headers
export const HEADER_MAPPING_RULES: Record<string, string[]> = {
  'Joined at(beta)': [
    'joined at(beta)',
    'joined at (beta)',
    'meeting joined at',
    'joined at',
    'join time',
    'joined time',
    'time joined',
    'meeting joined',
  ],
  'Attended Duration': [
    'attended duration',
    'attended for',
    'duration',
    'time in class',
    'attendance duration',
    'attended time',
    'minutes attended',
    'duration (mins)',
  ],
  'Participant Name': [
    'participant name',
    'student name',
    'name',
    'first name',
    'fname',
    'full name',
    'attendee name',
    'attendee',
  ],
  'Class Date': [
    'class date',
    'date',
    'session date',
    'meeting date',
    'attendance date',
  ],
  'Meeting code': [
    'meeting code',
    'code',
    'meeting id',
    'meeting link',
    'room code',
  ],
  'Attendance Started at': [
    'attendance started at',
    'started at',
    'start time',
    'session start',
    'meeting start',
  ],
  'Attendance Stopped at': [
    'attendance stopped at',
    'stopped at',
    'end time',
    'leave time',
    'session end',
    'left at',
  ],
  'SNo': [
    'sno',
    's.no',
    's.no.',
    'serial no',
    'serial number',
    'id',
    'roll no',
    'student id',
  ],
};

// Guess the best master header for a given source column header
export function findBestHeaderMatch(sourceHeader: string): string | null {
  const clean = sourceHeader.trim().toLowerCase();
  for (const [master, aliases] of Object.entries(HEADER_MAPPING_RULES)) {
    if (clean === master.toLowerCase()) return master;
    for (const alias of aliases) {
      if (clean === alias.toLowerCase() || clean.includes(alias.toLowerCase())) {
        return master;
      }
    }
  }
  return null;
}

// Convert Excel column number to letters (0 -> A, 1 -> B, ..., 26 -> AA)
export function getExcelColumnLetterLabel(index: number): string {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Extract date from filename, e.g. "Attendance (12-May-2024).csv" -> "12-May-2024"
export function extractDateFromFilename(filename: string): string {
  const match = filename.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  const dateMatch = filename.match(/\d{1,2}[-_][A-Za-z]{3}[-_]\d{4}|\d{4}[-_]\d{2}[-_]\d{2}/);
  if (dateMatch) {
    return dateMatch[0].replace(/_/g, '-');
  }
  return '';
}

// Robust CSV Line parser handling quotes and commas
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Parse custom date strings
export function parseCustomDate(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === '') return new Date(NaN);
  const clean = dateStr.trim();

  const standard = new Date(clean);
  if (!isNaN(standard.getTime())) {
    return standard;
  }

  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const parts = clean.split(/[-/.\s]+/);
  if (parts.length === 3) {
    const monthKey = parts[1].slice(0, 3).toLowerCase();
    if (monthMap[monthKey] !== undefined) {
      const day = parseInt(parts[0], 10);
      const month = monthMap[monthKey];
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }

    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }

  return new Date(NaN);
}

// Duration string to minutes parser (e.g. "1 hr 30 mins", "45 mins", "45", "1h 15m")
export function parseDurationToMinutes(durationStr?: string): number {
  if (!durationStr || !durationStr.trim()) return 0;
  const clean = durationStr.toLowerCase().trim();

  let totalMins = 0;

  const hrMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:hr|hrs|hour|hours|h)\b/);
  if (hrMatch) {
    totalMins += parseFloat(hrMatch[1]) * 60;
  }

  const minMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes|m)\b/);
  if (minMatch) {
    totalMins += parseFloat(minMatch[1]);
  }

  if (!hrMatch && !minMatch) {
    const num = parseFloat(clean);
    if (!isNaN(num)) return num;
  }

  return Math.round(totalMins);
}

// Convert 12h <-> 24h syntax string
export function convertTimeFormat(timeStr: string, targetMode: TimeMode): string {
  if (!timeStr || !timeStr.trim()) return timeStr;
  const clean = timeStr.trim();

  if (targetMode === '24h') {
    const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const minutes = match12[2];
      const seconds = match12[3] ? `:${match12[3]}` : '';
      const meridian = match12[4].toLowerCase();

      if (meridian === 'pm' && hours < 12) hours += 12;
      if (meridian === 'am' && hours === 12) hours = 0;

      const hh = hours.toString().padStart(2, '0');
      return `${hh}:${minutes}${seconds}`;
    }
  } else {
    const match24 = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match24) {
      let hours = parseInt(match24[1], 10);
      const minutes = match24[2];
      const seconds = match24[3] ? `:${match24[3]}` : '';
      const meridian = hours >= 12 ? 'PM' : 'AM';

      if (hours === 0) hours = 12;
      else if (hours > 12) hours -= 12;

      return `${hours}:${minutes}${seconds} ${meridian}`;
    }
  }

  return timeStr;
}

// Date in range checker for Start and End Date filter (supporting inclusive / exclusive)
export function isDateInRange(
  dateStr: string | undefined,
  startDateInput: string,
  endDateInput: string,
  isStartDateInclusive: boolean,
  isEndDateInclusive: boolean
): boolean {
  if (!dateStr || !dateStr.trim()) return false;
  const targetDate = parseCustomDate(dateStr);
  if (isNaN(targetDate.getTime())) return false;

  const targetTime = targetDate.getTime();
  const targetYear = targetDate.getFullYear();

  // 1. Check Start Date
  if (startDateInput && startDateInput.trim()) {
    const cleanStart = startDateInput.trim();
    const startYearOnly = /^\d{4}$/.test(cleanStart);
    const startDateParsed = parseCustomDate(cleanStart);

    if (startYearOnly) {
      const sYear = parseInt(cleanStart, 10);
      if (isStartDateInclusive) {
        if (targetYear < sYear) return false;
      } else {
        if (targetYear <= sYear) return false;
      }
    } else if (!isNaN(startDateParsed.getTime())) {
      const sYear = startDateParsed.getFullYear();
      const sMonth = startDateParsed.getMonth();
      const sDay = startDateParsed.getDate();

      if (isStartDateInclusive) {
        // Start of day
        const startOfDay = new Date(sYear, sMonth, sDay, 0, 0, 0, 0).getTime();
        if (targetTime < startOfDay) return false;
      } else {
        // Exclusive: after end of start day
        const endOfDay = new Date(sYear, sMonth, sDay, 23, 59, 59, 999).getTime();
        if (targetTime <= endOfDay) return false;
      }
    }
  }

  // 2. Check End Date
  if (endDateInput && endDateInput.trim()) {
    const cleanEnd = endDateInput.trim();
    const endYearOnly = /^\d{4}$/.test(cleanEnd);
    const endDateParsed = parseCustomDate(cleanEnd);

    if (endYearOnly) {
      const eYear = parseInt(cleanEnd, 10);
      if (isEndDateInclusive) {
        if (targetYear > eYear) return false;
      } else {
        if (targetYear >= eYear) return false;
      }
    } else if (!isNaN(endDateParsed.getTime())) {
      const eYear = endDateParsed.getFullYear();
      const eMonth = endDateParsed.getMonth();
      const eDay = endDateParsed.getDate();

      if (isEndDateInclusive) {
        // End of day
        const endOfDay = new Date(eYear, eMonth, eDay, 23, 59, 59, 999).getTime();
        if (targetTime > endOfDay) return false;
      } else {
        // Exclusive: before start of end day
        const startOfDay = new Date(eYear, eMonth, eDay, 0, 0, 0, 0).getTime();
        if (targetTime >= startOfDay) return false;
      }
    }
  }

  return true;
}

// Parse single CSV file into headers and rows
export async function parseCSVFile(file: File): Promise<{ headers: string[]; rows: AttendanceRow[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) {
          resolve({ headers: [], rows: [] });
          return;
        }

        const rawHeaders = parseCSVLine(lines[0]);
        const detectedHeaders = rawHeaders.map((h) => {
          const match = findBestHeaderMatch(h);
          return match || h.trim();
        });

        const inferredDate = extractDateFromFilename(file.name);

        const rows: AttendanceRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCSVLine(lines[i]);
          if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue;

          const row: AttendanceRow = {};
          detectedHeaders.forEach((hdr, idx) => {
            row[hdr] = vals[idx] !== undefined ? vals[idx] : '';
          });

          // If Class Date is empty, populate from filename
          if (!row['Class Date'] && inferredDate) {
            row['Class Date'] = inferredDate;
          }

          rows.push(row);
        }

        resolve({ headers: detectedHeaders, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

// Merge multiple CSV files into master headers and rows
export function mergeAttendanceRows(
  parsedResults: { headers: string[]; rows: AttendanceRow[] }[]
): { headers: string[]; rows: AttendanceRow[] } {
  // Collect all unique headers across all files, placing MASTER_HEADERS first
  const headerSet = new Set<string>(MASTER_HEADERS);
  parsedResults.forEach((res) => {
    res.headers.forEach((h) => headerSet.add(h));
  });
  const headers = Array.from(headerSet);

  const allRows: AttendanceRow[] = [];
  parsedResults.forEach((res) => {
    res.rows.forEach((row) => {
      const fullRow: AttendanceRow = {};
      headers.forEach((h) => {
        fullRow[h] = row[h] !== undefined ? row[h] : '';
      });
      allRows.push(fullRow);
    });
  });

  return { headers, rows: allRows };
}

// Multi-column sorting
export function sortAttendanceData(rows: AttendanceRow[], config: SortConfig): AttendanceRow[] {
  const { nameOrder, dateOrder, isNamePriorityPrimary } = config;

  return [...rows].sort((a, b) => {
    const primaryResult = isNamePriorityPrimary
      ? compareNames(a['Participant Name'], b['Participant Name'], nameOrder)
      : compareDates(a['Class Date'], b['Class Date'], dateOrder);

    if (primaryResult !== 0) return primaryResult;

    const secondaryResult = isNamePriorityPrimary
      ? compareDates(a['Class Date'], b['Class Date'], dateOrder)
      : compareNames(a['Participant Name'], b['Participant Name'], nameOrder);

    return secondaryResult;
  });
}

function compareNames(nameA: string = '', nameB: string = '', order: 'asc' | 'desc'): number {
  const a = nameA.trim().toLowerCase();
  const b = nameB.trim().toLowerCase();
  if (a < b) return order === 'asc' ? -1 : 1;
  if (a > b) return order === 'asc' ? 1 : -1;
  return 0;
}

function compareDates(dateA: string = '', dateB: string = '', order: 'asc' | 'desc'): number {
  const dA = parseCustomDate(dateA).getTime();
  const dB = parseCustomDate(dateB).getTime();
  if (isNaN(dA) && isNaN(dB)) return 0;
  if (isNaN(dA)) return 1;
  if (isNaN(dB)) return -1;
  return order === 'asc' ? dA - dB : dB - dA;
}

// Generate unique row fingerprint for duplicate detection
export function getRowFingerprint(row: AttendanceRow, headers: string[]): string {
  return headers
    .map((h) => (row[h] || '').trim().toLowerCase())
    .join('||');
}

// Find groups of duplicate rows in the dataset
export function findDuplicateGroups(rows: AttendanceRow[], headers: string[]): DuplicateGroup[] {
  const map = new Map<string, number[]>();

  rows.forEach((row, index) => {
    const fp = getRowFingerprint(row, headers);
    if (!map.has(fp)) {
      map.set(fp, []);
    }
    map.get(fp)!.push(index);
  });

  const groups: DuplicateGroup[] = [];
  map.forEach((indices, fp) => {
    if (indices.length > 1) {
      groups.push({
        originalIndices: indices,
        sampleRow: { ...rows[indices[0]] },
        fingerprint: fp,
      });
    }
  });

  return groups;
}

// Export dataset to CSV
export function exportToCSV(
  rows: AttendanceRow[],
  headers: string[],
  filename: string = 'master_attendance_export.csv'
) {
  const escapeCell = (val: string) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => headers.map((h) => escapeCell(row[h] || '')).join(','));

  const csvContent = [headerLine, ...rowLines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Export dataset to Excel (.xlsx)
export function exportToXLSX(
  rows: AttendanceRow[],
  headers: string[],
  filename: string = 'master_attendance_export.xlsx'
) {
  const data = rows.map((r) => {
    const item: Record<string, string> = {};
    headers.forEach((h) => {
      item[h] = r[h] || '';
    });
    return item;
  });

  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  XLSX.writeFile(workbook, filename);
}
