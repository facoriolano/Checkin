export interface Student {
  id: string; // "Número" (unique ID)
  name: string; // "Nome do aluno"
  checks: Record<string, boolean>; // e.g. { "Capela": true, "Auditório": false }
  rowIndex: number; // 0-based index in the parsed sheet rows (header is 0, first student is 1)
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  sheetName: string;
  locations: string[]; // Dynamically parsed from columns index 2 onwards
  students: Student[];
}

export interface UserProfile {
  name: string;
  email: string;
  photoURL: string;
}
