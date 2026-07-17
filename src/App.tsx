import React, { useEffect, useState } from 'react';
import {
  fetchSpreadsheetPublicly,
  fetchSpreadsheetData,
  updateCellInSheets,
  googleSignIn,
  logout,
  initAuth,
} from './firebase';
import { Student, SpreadsheetInfo, UserProfile } from './types';
import PassaporteCard from './components/PassaporteCard';
import ScannerTab from './components/ScannerTab';
import DashboardTab from './components/DashboardTab';
import Certificado from './components/Certificado';
import PassaporteLote from './components/PassaporteLote';
import {
  BookOpen,
  QrCode,
  LayoutDashboard,
  Printer,
  Compass,
  LogOut,
  RefreshCw,
  Award,
  Lock,
  ChevronRight,
  Sparkles,
  CloudLightning,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  Info,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [spreadsheetId, setSpreadsheetId] = useState(() => localStorage.getItem('crisma_spreadsheet_id') || '1Li7P6qPJIRJRo-P59j3PXA5VRgAkxqDIABx1D1rcGXs');
  const [sheetName, setSheetName] = useState('Página1');
  const [locations, setLocations] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'PASSAPORTES' | 'SCANNER' | 'DASHBOARD' | 'IMPRESSAO_LOTE'>('DASHBOARD');
  const [studentMode, setStudentMode] = useState<boolean>(false); // Lock into student-only pass view if URL has ?id=...

  // Apps Script & Google Connection Modal States
  const [showConnectionModal, setShowConnectionModal] = useState<boolean>(false);
  const [appsScriptInput, setAppsScriptInput] = useState(() => localStorage.getItem('crisma_apps_script_url') || '');
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(() => localStorage.getItem('crisma_spreadsheet_id') || '1Li7P6qPJIRJRo-P59j3PXA5VRgAkxqDIABx1D1rcGXs');

  // Auth & Sync States
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncingCell, setSyncingCell] = useState<{ studentId: string; location: string } | null>(null);
  
  // Custom Toast Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showCertificate, setShowCertificate] = useState<boolean>(false);
  const [showAuthErrorModal, setShowAuthErrorModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'info' | 'custom_config'>('info');
  const [customConfigText, setCustomConfigText] = useState<string>('');

  // Trigger temporary notification toast
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // 1. Initial Data Loading & URL Parsing
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Try to load cached data first for instant paint
      const cached = localStorage.getItem('crisma_spreadsheet_cache');
      if (cached) {
        const parsed: SpreadsheetInfo = JSON.parse(cached);
        setLocations(parsed.locations);
        setStudents(parsed.students);
        setSheetName(parsed.sheetName || 'Página1');
      }

      let freshData: SpreadsheetInfo;
      const appsScriptUrl = localStorage.getItem('crisma_apps_script_url');
      if (appsScriptUrl) {
        const res = await fetch(appsScriptUrl);
        if (!res.ok) throw new Error('Falha ao conectar com o Google Apps Script.');
        const rawJson = await res.json();
        freshData = {
          spreadsheetId,
          sheetName: rawJson.sheetName || 'Página1',
          locations: rawJson.locations,
          students: rawJson.students
        };
      } else {
        // Fetch fresh public data from Google Sheets CSV
        freshData = await fetchSpreadsheetPublicly(spreadsheetId);
      }

      setLocations(freshData.locations);
      setStudents(freshData.students);
      setSheetName(freshData.sheetName || 'Página1');
      
      // Save cache
      localStorage.setItem('crisma_spreadsheet_cache', JSON.stringify(freshData));
      
      // Check URL parameters for Student ID
      const urlParams = new URLSearchParams(window.location.search);
      const idParam = urlParams.get('id');
      if (idParam) {
        const student = freshData.students.find((s) => s.id === idParam);
        if (student) {
          setSelectedStudent(student);
          setStudentMode(true);
          setActiveTab('PASSAPORTES');
        } else {
          showToast(`Nenhum aluno encontrado com o ID "${idParam}"`, 'error');
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao baixar dados da planilha. Usando dados locais.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Setup Firebase Auth State Listeners
    initAuth(
      (firebaseUser, token) => {
        setUser({
          name: firebaseUser.displayName || 'Catequista',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
        });
        setAccessToken(token);
        showToast(`Bem-vindo, ${firebaseUser.displayName}!`, 'success');
        
        // Fetch fresh real-time data from Sheets API since we are logged in
        syncWithSheets(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
  }, []);

  // 2. Fetch Spreadsheet data directly from Sheets API (Requires login)
  const syncWithSheets = async (tokenToUse: string) => {
    setIsSyncing(true);
    try {
      const data = await fetchSpreadsheetData(tokenToUse, spreadsheetId);
      setLocations(data.locations);
      setStudents(data.students);
      setSheetName(data.sheetName);
      
      // Update local storage cache
      localStorage.setItem('crisma_spreadsheet_cache', JSON.stringify(data));
      showToast('Sincronizado com o Google Sheets!', 'success');
      
      // Keep selected student instance fresh
      if (selectedStudent) {
        const updated = data.students.find((s) => s.id === selectedStudent.id);
        if (updated) setSelectedStudent(updated);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao sincronizar dados da planilha.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      if (accessToken) {
        await syncWithSheets(accessToken);
      } else {
        await loadInitialData();
        showToast('Dados sincronizados com sucesso!', 'success');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Handle Admin Login
  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser({
          name: result.user.displayName || 'Catequista',
          email: result.user.email || '',
          photoURL: result.user.photoURL || '',
        });
        setAccessToken(result.accessToken);
        showToast('Login realizado com sucesso! Planilha conectada.', 'success');
        syncWithSheets(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain'))) {
        setShowAuthErrorModal(true);
      } else {
        showToast('Falha ao autenticar com o Google.', 'error');
      }
    }
  };

  const handleSaveCustomConfig = () => {
    try {
      let cleaned = customConfigText.trim();
      
      // If they pasted a whole block of code, let's look for the config object
      const matchObj = cleaned.match(/(?:const|let|var)?\s*firebaseConfig\s*=\s*(\{[\s\S]*?\});?/);
      if (matchObj) {
        cleaned = matchObj[1];
      } else {
        const matchAnyObj = cleaned.match(/(\{[\s\S]*?\})/);
        if (matchAnyObj) {
          cleaned = matchAnyObj[1];
        }
      }

      // Convert standard javascript object keys/syntax to valid JSON
      let jsonStr = cleaned
        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '') // remove comments
        .replace(/'/g, '"') // replace single quotes with double quotes
        .replace(/(\w+)\s*:/g, '"$1":') // wrap keys in quotes
        .replace(/,\s*}/g, '}'); // remove trailing comma

      const parsed = JSON.parse(jsonStr);
      if (!parsed.apiKey || !parsed.authDomain || !parsed.projectId) {
        throw new Error('Configuração inválida. É necessário preencher apiKey, authDomain e projectId.');
      }

      localStorage.setItem('custom_firebase_config', JSON.stringify(parsed));
      showToast('Configuração salva! Recarregando...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao ler a configuração. Certifique-se de colar o código completo.', 'error');
    }
  };

  const handleClearCustomConfig = () => {
    localStorage.removeItem('custom_firebase_config');
    showToast('Configuração original restaurada! Recarregando...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  // Apps Script Connection States
  const [connectionTab, setConnectionTab] = useState<'script' | 'google'>(() => 
    localStorage.getItem('crisma_apps_script_url') ? 'script' : 'script'
  );
  const [copied, setCopied] = useState(false);

  const googleAppsScriptCode = `function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Handle write operation
  if (e && e.parameter && e.parameter.action === "update") {
    var rowIndex = parseInt(e.parameter.rowIndex);
    var colIndex = parseInt(e.parameter.colIndex);
    var checked = e.parameter.checked === "true";
    
    sheet.getRange(rowIndex + 1, colIndex + 1).setValue(checked ? "OK" : "");
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
  
  // Handle read operation
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({ locations: [], students: [] }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
  
  var headers = data[0];
  var locations = headers.slice(2);
  
  var students = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    
    var checks = {};
    for (var j = 0; j < locations.length; j++) {
      var val = row[j + 2] || "";
      checks[locations[j]] = String(val).toUpperCase().trim() === "OK";
    }
    
    students.push({
      id: String(row[1] || ("ID-" + i)),
      name: String(row[0]),
      checks: checks,
      rowIndex: i
    });
  }
  
  var result = {
    sheetName: sheet.getName(),
    locations: locations,
    students: students
  };
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
}

function doPost(e) {
  return doGet(e);
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(googleAppsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConnection = () => {
    // 1. Save Spreadsheet ID
    const cleanId = spreadsheetIdInput.trim();
    if (!cleanId) {
      showToast('O ID da Planilha não pode ser vazio.', 'error');
      return;
    }
    
    localStorage.setItem('crisma_spreadsheet_id', cleanId);
    setSpreadsheetId(cleanId);
    
    // 2. Save Apps Script URL
    const cleanUrl = appsScriptInput.trim();
    if (cleanUrl) {
      if (!cleanUrl.startsWith('https://script.google.com')) {
        showToast('Link do Apps Script inválido. Deve começar com https://script.google.com', 'error');
        return;
      }
      localStorage.setItem('crisma_apps_script_url', cleanUrl);
    } else {
      localStorage.removeItem('crisma_apps_script_url');
      setAppsScriptInput('');
    }
    
    // Clear cache to force fresh reload
    localStorage.removeItem('crisma_spreadsheet_cache');
    
    showToast('Configurações salvas com sucesso! Recarregando dados...', 'success');
    setShowConnectionModal(false);
    
    setTimeout(() => {
      loadInitialData();
    }, 500);
  };

  // 4. Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('crisma_apps_script_url');
      setAppsScriptInput('');
      localStorage.removeItem('crisma_spreadsheet_cache');
      showToast('Sessão encerrada e conexões limpas.', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error(err);
    }
  };

  // 5. Handle Check-in Mutation (Offline-first / Sheets sync fallback)
  const handleCheckIn = async (studentId: string, location: string, checked: boolean) => {
    // Determine column offset (2-based because col 0 is Name, col 1 is ID)
    const colIndex = locations.indexOf(location) + 2;
    if (colIndex < 2) return;

    // Find student
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    // A. Optimistic UI update immediately for lightning fast feel
    const updatedStudents = students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          checks: {
            ...s.checks,
            [location]: checked,
          },
        };
      }
      return s;
    });

    setStudents(updatedStudents);
    localStorage.setItem(
      'crisma_spreadsheet_cache',
      JSON.stringify({ spreadsheetId, sheetName, locations, students: updatedStudents })
    );

    // Keep active selected student in sync
    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent({
        ...selectedStudent,
        checks: {
          ...selectedStudent.checks,
          [location]: checked,
        },
      });
    }

    // B. Google Sheets / Apps Script update if authorized
    const appsScriptUrl = localStorage.getItem('crisma_apps_script_url');
    if (appsScriptUrl) {
      setIsSyncing(true);
      setSyncingCell({ studentId, location });
      try {
        const url = `${appsScriptUrl}?action=update&rowIndex=${student.rowIndex}&colIndex=${colIndex}&checked=${checked}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Falha na resposta do Google Apps Script.');
        showToast(`Check-in em "${location}" sincronizado com sucesso!`, 'success');
      } catch (err: any) {
        console.error(err);
        showToast('Falha ao sincronizar com o Google Apps Script. Salvo localmente.', 'error');
      } finally {
        setIsSyncing(false);
        setSyncingCell(null);
      }
    } else if (accessToken) {
      setIsSyncing(true);
      setSyncingCell({ studentId, location });
      try {
        await updateCellInSheets(accessToken, spreadsheetId, sheetName, student.rowIndex, colIndex, checked);
        showToast(`Check-in em "${location}" atualizado com sucesso!`, 'success');
      } catch (err: any) {
        console.error(err);
        showToast('Falha ao sincronizar com Google Sheets. Salvo localmente.', 'error');
      } finally {
        setIsSyncing(false);
        setSyncingCell(null);
      }
    } else {
      // Prompt user about offline storage
      showToast(`Carimbo adicionado localmente! Configure o Apps Script para enviar à planilha online.`, 'info');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4"
          >
            <div
              className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-semibold ${
                notification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : notification.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-slate-800 border-slate-700 text-white'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
              ) : (
                <CloudLightning className="w-5 h-5 shrink-0 text-rose-500" />
              )}
              <p className="flex-1 leading-normal">{notification.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Top Header Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-amber-400 flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5 stroke-[2.5px]" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-800">
                CRISMA DIGITAL
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Passaporte & Presenças
              </p>
            </div>
          </div>

          {/* Sync & Auth Status actions */}
          <div className="flex items-center gap-3">
            
            {/* Sync trigger button */}
            <button
              onClick={handleManualSync}
              disabled={isLoading || isSyncing}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0"
              title="Recarregar dados"
              id="btn-sync-reload"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing || isLoading ? 'animate-spin' : ''}`} />
            </button>

            {studentMode ? (
              // Student focused Mode top indicator
              <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Passaporte do Aluno
              </span>
            ) : (
              // Coordinator Mode - Simple static "Planilha Online" status badge (no button, no configuration triggers)
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs select-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Planilha Online
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 flex flex-col relative">
        
        {/* Loading Overlay */}
        {isLoading && students.length === 0 ? (
          <div className="absolute inset-0 bg-slate-100/90 z-20 flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full border-4 border-blue-900/10 border-t-blue-900 animate-spin mb-4"></div>
            <h3 className="font-bold text-slate-800 text-sm">Carregando passaporte de Crisma...</h3>
            <p className="text-xs text-slate-400 mt-1">Conectando ao banco de dados da planilha.</p>
          </div>
        ) : (
          <div className="py-6">
            {studentMode && selectedStudent ? (
              
              // ================= STUDENT WORKFLOW VIEW =================
              <div className="max-w-md mx-auto px-4">
                <div className="text-center mb-6">
                  <div className="inline-flex w-12 h-12 rounded-full bg-amber-100 text-amber-600 items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <h2 className="text-xl font-black text-slate-800">Seu Passaporte Digital</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-normal">
                    Este é o seu bilhete de embarque para as salas de Crisma. Apresente-o aos catequistas nas salas!
                  </p>
                </div>

                <PassaporteCard
                  student={selectedStudent}
                  locations={locations}
                  onOpenCertificate={() => setShowCertificate(true)}
                />

                <div className="text-center mt-8">
                  <button
                    onClick={() => {
                      setStudentMode(false);
                      setSelectedStudent(null);
                      setActiveTab('DASHBOARD');
                      // Clear url parameters cleanly
                      window.history.pushState({}, '', window.location.pathname);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 justify-center mx-auto hover:underline"
                    id="btn-enter-catechist-mode"
                  >
                    Entrar na Área do Catequista <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            ) : (
              
              // ================= CATECHIST WORKFLOW VIEW =================
              <div className="space-y-6">
                
                {/* Secondary navigation tab bar */}
                <div className="max-w-5xl mx-auto px-4">
                  <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex shadow-sm gap-1">
                    
                    <button
                      onClick={() => {
                        setActiveTab('DASHBOARD');
                        setSelectedStudent(null);
                      }}
                      className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                        activeTab === 'DASHBOARD'
                          ? 'bg-blue-900 text-white shadow'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                      id="tab-dashboard"
                    >
                      <LayoutDashboard className="w-4 h-4 shrink-0" />
                      <span className="truncate">Painel Geral</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('SCANNER');
                        setSelectedStudent(null);
                      }}
                      className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                        activeTab === 'SCANNER'
                          ? 'bg-blue-900 text-white shadow'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                      id="tab-scanner"
                    >
                      <QrCode className="w-4 h-4 shrink-0" />
                      <span className="truncate">Scanner QR</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('IMPRESSAO_LOTE');
                        setSelectedStudent(null);
                      }}
                      className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                        activeTab === 'IMPRESSAO_LOTE'
                          ? 'bg-blue-900 text-white shadow'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                      id="tab-batch-print"
                    >
                      <Printer className="w-4 h-4 shrink-0" />
                      <span className="truncate">Imprimir em Lote</span>
                    </button>

                    {selectedStudent && (
                      <button
                        onClick={() => setActiveTab('PASSAPORTES')}
                        className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                          activeTab === 'PASSAPORTES'
                            ? 'bg-amber-500 text-white shadow'
                            : 'text-amber-600 hover:bg-amber-50'
                        }`}
                        id="tab-active-ticket"
                      >
                        <Compass className="w-4 h-4 shrink-0" />
                        <span className="truncate">Bilhete Ativo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tab Layout Renderings */}
                <div>
                  {activeTab === 'DASHBOARD' && (
                    <DashboardTab
                      students={students}
                      locations={locations}
                      onCheckIn={handleCheckIn}
                      onSelectStudent={(student) => {
                        setSelectedStudent(student);
                        setActiveTab('PASSAPORTES');
                      }}
                      isSyncing={isSyncing}
                      syncingCell={syncingCell}
                    />
                  )}

                  {activeTab === 'SCANNER' && (
                    <ScannerTab
                      students={students}
                      locations={locations}
                      onCheckIn={handleCheckIn}
                      onSelectStudent={(student) => {
                        setSelectedStudent(student);
                        setActiveTab('PASSAPORTES');
                      }}
                    />
                  )}

                  {activeTab === 'IMPRESSAO_LOTE' && (
                    <PassaporteLote students={students} locations={locations} />
                  )}

                  {activeTab === 'PASSAPORTES' && selectedStudent && (
                    <div className="max-w-md mx-auto px-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => {
                            setSelectedStudent(null);
                            setActiveTab('DASHBOARD');
                          }}
                          className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1"
                          id="btn-back-to-dashboard"
                        >
                          ← Voltar para o Painel
                        </button>
                        <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full border border-amber-200">
                          Foco: {selectedStudent.name}
                        </span>
                      </div>
                      <PassaporteCard
                        student={selectedStudent}
                        locations={locations}
                        onToggleCheck={(studentId, loc) => {
                          const currentVal = !!selectedStudent.checks[loc];
                          handleCheckIn(studentId, loc, !currentVal);
                        }}
                        onOpenCertificate={() => setShowCertificate(true)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Completion Certificate Modal Overlay */}
      <AnimatePresence>
        {showCertificate && selectedStudent && (
          <Certificado
            student={selectedStudent}
            onClose={() => setShowCertificate(false)}
          />
        )}



        {showConnectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden my-8"
            >
              {/* Header */}
              <div className="bg-blue-900 p-6 text-white flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Settings className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg tracking-tight">Conexão da Planilha Google</h3>
                  <p className="text-xs text-blue-200 mt-1">Configure o armazenamento automático das presenças</p>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-6">
                {/* Spreadsheet ID Section */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    1. ID da Planilha Google
                  </label>
                  <input
                    type="text"
                    value={spreadsheetIdInput}
                    onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                    placeholder="Cole o ID da planilha do navegador"
                    className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono text-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 leading-normal">
                    O ID é a parte longa do link da planilha, ex: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">1Li7P6qPJIR...</span>. A planilha deve seguir o layout padrão (Coluna A: Nome, Coluna B: ID, Colunas C+: Salas).
                  </p>
                </div>

                {/* Google Apps Script Section */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Link do Google Apps Script (Sincronização Online)
                    </label>
                    <input
                      type="text"
                      value={appsScriptInput}
                      onChange={(e) => setAppsScriptInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono text-slate-800"
                    />
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Necessário apenas para salvar as presenças diretamente do site para a planilha. Sem ele, as presenças ficam salvas no celular de forma offline.
                    </p>
                  </div>

                  {/* Step-by-step Accordion/Guide */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-600" /> Como configurar o Apps Script em 1 minuto?
                    </h4>
                    <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
                      <li>Na sua Planilha Google, clique em <strong>Extensões &gt; Apps Script</strong>.</li>
                      <li>Apague todo o código que estiver lá e cole o nosso script de sincronização.</li>
                      <li>Clique no botão azul <strong>Implantar &gt; Nova implantação</strong> no topo direito.</li>
                      <li>Clique na engrenagem ao lado de "Selecione o tipo" e escolha <strong>App da Web</strong>.</li>
                      <li>Mude "Quem tem acesso" para <strong>Qualquer pessoa</strong>.</li>
                      <li>Clique em <strong>Implantar</strong>, autorize o acesso à sua planilha e copie a <strong>URL do App da Web</strong> gerada para colar no campo acima!</li>
                    </ol>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleCopyScript}
                        className="w-full flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold py-2 px-3 rounded-lg transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Script Copiado com Sucesso!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Código do Script
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    // Reset inputs to saved values and close
                    setSpreadsheetIdInput(spreadsheetId);
                    setAppsScriptInput(localStorage.getItem('crisma_apps_script_url') || '');
                    setShowConnectionModal(false);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveConnection}
                  className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Salvar Configurações
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer credits */}
      <footer className="bg-slate-900 text-slate-500 text-[10px] uppercase font-bold tracking-widest text-center py-6 mt-12 border-t border-slate-800">
        <p>© 2026 Educação do Crisma • Todos os Direitos Reservados</p>
        <p className="text-slate-600 font-normal normal-case tracking-normal mt-1.5">
          Desenvolvido com tecnologia de sincronia instantânea offline-first integrada ao Google Sheets.
        </p>
      </footer>
    </div>
  );
}
