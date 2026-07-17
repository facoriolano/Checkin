import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Student, SpreadsheetInfo } from './types';

// Get active config from localStorage if available
export const getActiveFirebaseConfig = () => {
  const custom = localStorage.getItem('custom_firebase_config');
  if (custom) {
    try {
      return JSON.parse(custom);
    } catch (e) {
      console.error('Erro ao decodificar custom_firebase_config:', e);
    }
  }
  return firebaseConfig;
};

// Initialize Firebase
const activeConfig = getActiveFirebaseConfig();
const app = initializeApp(activeConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Sheets scope
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Cache the access token in memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If there is a user but no cached token (e.g. refresh), we need to trigger sign in or get token
        // Wait, onAuthStateChanged doesn't directly return OAuth tokens after refresh unless saved.
        // So we will allow the user to click login or restore from a login action.
        onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

// Google Sign-In popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso do Google Auth.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    // Suppress popups cancelled by user or other requests to avoid throwing noisy exceptions
    if (
      error.code === 'auth/cancelled-popup-request' ||
      error.code === 'auth/popup-closed-by-user'
    ) {
      return null;
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Helper to convert column index to letter (0 -> A, 1 -> B, ..., 26 -> AA)
export function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Parse public CSV spreadsheet data
export function parseCSV(csvText: string, spreadsheetId: string = '1Li7P6qPJIRJRo-P59j3PXA5VRgAkxqDIABx1D1rcGXs'): SpreadsheetInfo {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      rows.push(currentRow);
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentRow.length > 0 || currentVal) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }
  
  // Filter empty rows
  const validRows = rows.filter(r => r.length > 1 && r[0] !== '');
  if (validRows.length === 0) {
    throw new Error("Nenhum dado encontrado no CSV da planilha.");
  }
  
  const headers = validRows[0];
  const locations = headers.slice(2); // From index 2 onwards are rooms/locations
  
  const students: Student[] = validRows.slice(1).map((row, index) => {
    const name = row[0] || 'Aluno Sem Nome';
    const id = row[1] || `ID-${index + 1}`;
    const checks: Record<string, boolean> = {};
    
    locations.forEach((loc, locIndex) => {
      const val = row[locIndex + 2] || '';
      checks[loc] = val.trim().toUpperCase() === 'OK';
    });
    
    return {
      id,
      name,
      checks,
      rowIndex: index + 1 // Index 0 of students is row index 1 (corresponding to Row 2 in spreadsheet)
    };
  });
  
  return {
    spreadsheetId,
    sheetName: 'Página1', // Default
    locations,
    students
  };
}

// Fetch spreadsheet publicly
export async function fetchSpreadsheetPublicly(spreadsheetId: string): Promise<SpreadsheetInfo> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao buscar dados públicos: ${response.statusText}`);
  }
  const text = await response.text();
  return parseCSV(text, spreadsheetId);
}

// Fetch spreadsheet using Google Sheets API
export async function fetchSpreadsheetData(accessToken: string, spreadsheetId: string): Promise<SpreadsheetInfo> {
  let sheetName = 'Página1';
  let hasMeta = false;

  // 1. Fetch spreadsheet metadata to find first sheet's title
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      const firstSheet = metaData.sheets?.[0];
      if (firstSheet?.properties?.title) {
        sheetName = firstSheet.properties.title;
        hasMeta = true;
      }
    } else {
      const errText = await metaRes.text();
      console.warn(`Erro ao obter metadados da planilha (${metaRes.status}):`, errText);
    }
  } catch (err) {
    console.warn(`Erro de rede ao obter metadados da planilha, usando fallback default:`, err);
  }
  
  // 2. Fetch actual values from that range
  let range = `${sheetName}!A1:Z1000`;
  let valuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // If the initial page range fails and we had meta, or if we defaulted to Página1 and it failed,
  // let's try a fallback to Sheet1 (common english default) to be extra robust.
  if (!valuesRes.ok) {
    console.warn(`Tentativa de carregar "${sheetName}" falhou. Tentando carregar com fallback "Sheet1"...`);
    const fallbackRange = `Sheet1!A1:Z1000`;
    const fallbackRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fallbackRange)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (fallbackRes.ok) {
      valuesRes = fallbackRes;
      sheetName = 'Sheet1';
    } else {
      // If even the fallback fails, check if the error is unauthenticated
      const errorText = await valuesRes.text();
      throw new Error(`Erro ao carregar dados da planilha. Verifique se o ID está correto e se você possui permissão. Detalhes: ${errorText || valuesRes.statusText}`);
    }
  }

  const valuesData = await valuesRes.json();
  const rows: string[][] = valuesData.values || [];
  
  if (rows.length === 0) {
    throw new Error("A planilha está vazia ou sem dados acessíveis.");
  }
  
  const headers = rows[0];
  const locations = headers.slice(2);
  
  const students: Student[] = rows.slice(1).map((row, index) => {
    const name = row[0] || 'Aluno Sem Nome';
    const id = row[1] || `ID-${index + 1}`;
    const checks: Record<string, boolean> = {};
    
    locations.forEach((loc, locIndex) => {
      const val = row[locIndex + 2] || '';
      checks[loc] = val.trim().toUpperCase() === 'OK';
    });
    
    return {
      id,
      name,
      checks,
      rowIndex: index + 1 // Row 1 is header, so row 2 in spreadsheet is index 1
    };
  });
  
  return {
    spreadsheetId,
    sheetName,
    locations,
    students
  };
}

// Update single cell in Google Sheets
export async function updateCellInSheets(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number, // 1-based row index in spreadsheet (e.g. 1 is Row 2 in spreadsheet, since header is 0)
  colIndex: number, // 0-based column index (e.g. col index 2 is Column C)
  checked: boolean
): Promise<void> {
  const rowNumber = rowIndex + 1; // row index 1 -> spreadsheet row 2
  const colLetter = getColumnLetter(colIndex);
  const range = `${sheetName}!${colLetter}${rowNumber}`;
  const value = checked ? 'OK' : '';
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [[value]]
    })
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao atualizar célula: ${errText}`);
  }
}
