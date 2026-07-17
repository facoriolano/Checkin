import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Student } from '../types';
import { Camera, Search, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

interface ScannerTabProps {
  students: Student[];
  locations: string[];
  onCheckIn: (studentId: string, location: string, checked: boolean) => Promise<void>;
  onSelectStudent: (student: Student) => void;
}

interface ScannedLog {
  id: string;
  studentName: string;
  location: string;
  timestamp: Date;
  status: 'success' | 'info' | 'error';
  message: string;
}

export default function ScannerTab({
  students,
  locations,
  onCheckIn,
  onSelectStudent,
}: ScannerTabProps) {
  const [activeLocation, setActiveLocation] = useState<string>('NONE'); // NONE = just view student, other = auto-check-in in that room
  const [scannedLogs, setScannedLogs] = useState<ScannedLog[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [manualId, setManualId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showConfettiCard, setShowConfettiCard] = useState<{ name: string; room: string } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'qr-camera-element';

  // Function to process a scanned student ID or URL
  const handleScannedValue = async (val: string) => {
    // Determine student ID (it could be a raw ID "101" or a URL "https://.../?id=101")
    let id = val.trim();
    if (id.includes('?id=')) {
      const parts = id.split('?id=');
      if (parts.length > 1) {
        id = parts[1].split('&')[0];
      }
    }

    const student = students.find((s) => s.id === id);
    if (!student) {
      addLog(id, 'Desconhecido', 'Nenhum', 'error', `ID "${id}" não encontrado na planilha.`);
      return;
    }

    if (activeLocation === 'NONE') {
      // Just view student
      onSelectStudent(student);
      addLog(id, student.name, 'Nenhum', 'info', 'Passaporte carregado na tela.');
      // Flash small visual confirmation
      confetti({
        particleCount: 20,
        spread: 30,
        origin: { y: 0.8 },
      });
    } else {
      // Auto check-in
      try {
        if (student.checks[activeLocation]) {
          addLog(
            id,
            student.name,
            activeLocation,
            'info',
            `Já possuía check-in em "${activeLocation}".`
          );
          onSelectStudent(student);
          return;
        }

        await onCheckIn(student.id, activeLocation, true);
        
        // Show success screen card
        setShowConfettiCard({ name: student.name, room: activeLocation });
        // Confetti!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        addLog(id, student.name, activeLocation, 'success', `Check-in realizado com sucesso!`);
        
        // Automatically close success card after 3 seconds
        setTimeout(() => {
          setShowConfettiCard(null);
        }, 3000);

      } catch (err: any) {
        addLog(id, student.name, activeLocation, 'error', `Erro ao salvar: ${err.message || err}`);
      }
    }
  };

  const addLog = (
    id: string,
    studentName: string,
    location: string,
    status: 'success' | 'info' | 'error',
    message: string
  ) => {
    const newLog: ScannedLog = {
      id,
      studentName,
      location,
      timestamp: new Date(),
      status,
      message,
    };
    setScannedLogs((prev) => [newLog, ...prev].slice(0, 20)); // Limit to last 20 logs
  };

  // Start scanning
  const startScanning = async () => {
    setCameraError(null);
    setIsScanning(true);
    
    // Ensure existing instance is stopped and cleared
    await stopScanning();

    try {
      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            const size = Math.floor(minSize * 0.75);
            return { width: size, height: size };
          },
        },
        (decodedText) => {
          // Prevent double scanning of same thing in rapid succession
          if (decodedText) {
            handleScannedValue(decodedText);
          }
        },
        () => {
          // Silence verbose qr scanning log errors
        }
      );
    } catch (err: any) {
      console.error('Falha ao iniciar câmera:', err);
      setCameraError(
        'Não foi possível acessar a câmera do celular. Verifique as permissões do navegador ou digite o ID manualmente abaixo.'
      );
      setIsScanning(false);
    }
  };

  // Stop scanning
  const stopScanning = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Erro ao parar câmera:', err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    // Start scanning on mount
    startScanning();

    return () => {
      stopScanning();
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    handleScannedValue(manualId);
    setManualId('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto p-4">
      
      {/* Scanner Section */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        
        {/* Room configuration card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Localização para Check-In Automático
          </label>
          <select
            value={activeLocation}
            onChange={(e) => setActiveLocation(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            id="scanner-location-select"
          >
            <option value="NONE">Apenas Carregar Passaporte (Sem Check-in)</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                Check-in Direto: {loc}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            {activeLocation === 'NONE'
              ? '💡 Ao escanear, o bilhete de embarque do aluno será aberto para você gerenciar manualmente.'
              : `⚡ Ao escanear, o aluno receberá "OK" em "${activeLocation}" instantaneamente.`}
          </p>
        </div>

        {/* Camera Stage */}
        <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-lg border border-slate-800 relative aspect-[4/3] flex flex-col justify-between p-4">
          
          {/* Overlay scanning effects */}
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            {isScanning && (
              <div className="w-64 h-64 border-2 border-dashed border-amber-400 rounded-3xl relative animate-pulse flex items-center justify-center">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-500 rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-500 rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-500 rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-500 rounded-br-xl"></div>
                
                {/* Horizontal scanning laser */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent absolute top-0 animate-[bounce_3s_infinite]"></div>
              </div>
            )}
          </div>

          {/* Header controls inside camera overlay */}
          <div className="z-20 flex justify-between items-center bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-full self-start">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <span className={`w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`}></span>
              {isScanning ? 'Câmera Ativa' : 'Câmera Inativa'}
            </span>
          </div>

          {/* Actual camera element */}
          <div className="absolute inset-0 w-full h-full" id={scannerId}></div>

          {/* Error / Inactive display */}
          {(!isScanning || cameraError) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-950 z-20">
              {cameraError ? (
                <div className="flex flex-col items-center max-w-sm">
                  <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                  <p className="text-sm font-semibold text-slate-200">{cameraError}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Camera className="w-12 h-12 text-slate-600 mb-3" />
                  <p className="text-sm text-slate-400 font-semibold mb-4">Câmera desativada para poupar bateria</p>
                  <button
                    onClick={startScanning}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                    id="btn-reactivate-camera"
                  >
                    <RefreshCw className="w-4 h-4" /> Reativar Câmera
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bottom camera control overlay */}
          {isScanning && (
            <button
              onClick={stopScanning}
              className="z-20 self-center bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md mt-auto transition-transform"
              id="btn-stop-camera"
            >
              Pausar Câmera
            </button>
          )}
        </div>

        {/* Fallback Manual entry input */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <form onSubmit={handleManualSubmit}>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Se a câmera falhar, digite o Número/ID do Aluno
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="Ex: 101"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 rounded-xl text-xs transition-colors"
                id="btn-manual-id-search"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Scanned log side section */}
      <div className="lg:col-span-5 flex flex-col">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px] lg:h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" /> Histórico de Leituras
            </h3>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-500 font-mono">
              {scannedLogs.length} logs
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {scannedLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <p className="text-xs font-semibold">Nenhuma leitura realizada nesta sessão.</p>
                <p className="text-[10px] mt-1 max-w-[200px]">Os alunos escaneados aparecerão listados aqui.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {scannedLogs.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl border text-xs flex gap-3 ${
                      log.status === 'success'
                        ? 'bg-emerald-50/70 border-emerald-100 text-emerald-800'
                        : log.status === 'error'
                        ? 'bg-rose-50/70 border-rose-100 text-rose-800'
                        : 'bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="font-bold truncate">{log.studentName}</span>
                        <span className="text-[9px] text-slate-400 shrink-0">
                          {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] leading-tight text-slate-500">{log.message}</p>
                      {log.location !== 'Nenhum' && (
                        <span className="inline-block mt-1.5 text-[9px] bg-white border px-1.5 py-0.5 rounded font-bold text-slate-500">
                          Sala: {log.location}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Auto-check-in Confetti Success Modal Overlay */}
      <AnimatePresence>
        {showConfettiCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-emerald-200 flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-4 shadow-md">
                <CheckCircle className="w-10 h-10 stroke-[3px]" />
              </div>
              <span className="text-[10px] tracking-widest text-emerald-600 font-extrabold uppercase">Check-in Realizado</span>
              <h3 className="text-2xl font-black text-slate-800 mt-1 leading-tight">{showConfettiCard.name}</h3>
              
              <div className="mt-4 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800 text-sm font-extrabold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Sala: {showConfettiCard.room}
              </div>

              <p className="text-xs text-slate-400 mt-4 leading-normal">
                Carimbo espiritual adicionado com sucesso à planilha do Google Sheets!
              </p>

              <button
                onClick={() => setShowConfettiCard(null)}
                className="mt-6 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors"
                id="btn-close-scanner-celebration"
              >
                Continuar Escaneando
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
