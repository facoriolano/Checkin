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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [spreadsheetId] = useState('1Li7P6qPJIRJRo-P59j3PXA5VRgAkxqDIABx1D1rcGXs');
  const [sheetName, setSheetName] = useState('Página1');
  const [locations, setLocations] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'PASSAPORTES' | 'SCANNER' | 'DASHBOARD' | 'IMPRESSAO_LOTE'>('DASHBOARD');
  const [studentMode, setStudentMode] = useState<boolean>(false); // Lock into student-only pass view if URL has ?id=...

  // Auth & Sync States
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncingCell, setSyncingCell] = useState<{ studentId: string; location: string } | null>(null);
  
  // Custom Toast Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showCertificate, setShowCertificate] = useState<boolean>(false);

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

      // Fetch fresh public data from Google Sheets CSV
      const freshData = await fetchSpreadsheetPublicly();
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

  const handleManualSync = () => {
    if (accessToken) {
      syncWithSheets(accessToken);
    } else {
      loadInitialData();
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
      showToast('Falha ao autenticar com o Google.', 'error');
    }
  };

  // 4. Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      showToast('Sessão encerrada.', 'info');
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

    // B. Google Sheets API update if authorized
    if (accessToken) {
      setIsSyncing(true);
      setSyncingCell({ studentId, location });
      try {
        await updateCellInSheets(accessToken, spreadsheetId, sheetName, student.rowIndex, colIndex, checked);
        showToast(`Check-in em "${location}" atualizado com sucesso!`, 'success');
      } catch (err: any) {
        console.error(err);
        showToast('Falha ao sincronizar com Google Sheets. Salvo localmente.', 'error');
        
        // Revert local state if Sheets API strictly failed (optional, but we choose offline-first, so we keep local draft)
      } finally {
        setIsSyncing(false);
        setSyncingCell(null);
      }
    } else {
      // Prompt user about offline storage
      showToast(`Carimbo adicionado localmente! Conecte-se com Google para enviar à planilha online.`, 'info');
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
            ) : user ? (
              // Signed-In Coordinator Profile Info
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-800 leading-none">{user.name}</p>
                  <p className="text-[9px] text-emerald-600 font-extrabold uppercase mt-0.5 tracking-wider">Planilha Conectada</p>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-8 h-8 rounded-full border border-emerald-500 shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                    {user.name[0]}
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                  title="Sair da Planilha"
                  id="btn-google-logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              // Login trigger button
              <button
                onClick={handleLogin}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                id="btn-google-login"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Conectar Planilha
              </button>
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
