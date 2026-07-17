import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Student } from '../types';
import { MapPin, Check, Award, Printer, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface PassaporteCardProps {
  student: Student;
  locations: string[];
  onToggleCheck?: (studentId: string, location: string) => void;
  onOpenCertificate?: () => void;
}

export default function PassaporteCard({
  student,
  locations,
  onToggleCheck,
  onOpenCertificate,
}: PassaporteCardProps) {
  const completedCount = Object.values(student.checks).filter(Boolean).length;
  const totalCount = locations.length;
  const isCompletedAll = completedCount === totalCount && totalCount > 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Custom print handler for this single card
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir o passaporte.');
      return;
    }

    const checksHtml = locations
      .map(
        (loc) => `
      <div class="stamp-box ${student.checks[loc] ? 'completed' : ''}">
        <span class="stamp-icon">${student.checks[loc] ? '✓' : ''}</span>
        <span class="stamp-label">${loc}</span>
      </div>
    `
      )
      .join('');

    const qrUrl = `${window.location.origin}${window.location.pathname}?id=${student.id}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Bilhete de Embarque - ${student.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;600&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              background-color: white;
              color: #1e293b;
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            .ticket {
              width: 450px;
              border: 2px solid #e2e8f0;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 4px 15px rgba(0,0,0,0.05);
              background: #fff;
            }
            .header {
              background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
              color: white;
              padding: 20px;
              text-align: center;
              position: relative;
            }
            .header h2 {
              margin: 0;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 1.25rem;
              letter-spacing: 0.1em;
              text-transform: uppercase;
              color: #fbbf24;
            }
            .header p {
              margin: 5px 0 0 0;
              font-size: 0.8rem;
              opacity: 0.8;
              text-transform: uppercase;
            }
            .ticket-body {
              padding: 24px;
            }
            .passenger-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
            }
            .passenger-name {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 1.5rem;
              font-weight: 700;
              color: #0f172a;
              margin: 0;
            }
            .passenger-id {
              font-size: 0.85rem;
              background: #f1f5f9;
              color: #475569;
              padding: 4px 10px;
              border-radius: 9999px;
              font-weight: 600;
            }
            .divider {
              border-top: 2px dashed #cbd5e1;
              position: relative;
              margin: 20px 0;
            }
            .divider::before, .divider::after {
              content: '';
              position: absolute;
              top: -8px;
              width: 16px;
              height: 16px;
              background-color: white;
              border: 2px solid #cbd5e1;
              border-radius: 50%;
            }
            .divider::before { left: -33px; border-left-color: transparent; border-bottom-color: transparent; }
            .divider::after { right: -33px; border-right-color: transparent; border-top-color: transparent; }
            
            .stamps-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            .stamp-box {
              border: 1.5px solid #cbd5e1;
              border-radius: 12px;
              padding: 10px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              background: #f8fafc;
              min-height: 70px;
              justify-content: center;
            }
            .stamp-box.completed {
              background: #f0fdf4;
              border-color: #22c55e;
              color: #15803d;
            }
            .stamp-icon {
              font-size: 1.2rem;
              font-weight: bold;
              height: 24px;
            }
            .stamp-label {
              font-size: 0.75rem;
              font-weight: 600;
              margin-top: 4px;
            }
            .footer-qr {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-top: 20px;
            }
            .qr-code {
              padding: 8px;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              background: white;
            }
            .qr-caption {
              font-size: 0.7rem;
              color: #64748b;
              margin-top: 8px;
              text-align: center;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .ticket {
                box-shadow: none;
                border: 2px solid #cbd5e1;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <h2>Passaporte do Crisma</h2>
              <p>Bilhete de Embarque Espiritual</p>
            </div>
            <div class="ticket-body">
              <div class="passenger-info">
                <div>
                  <span style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Crismando</span>
                  <h1 class="passenger-name">${student.name}</h1>
                </div>
                <span class="passenger-id">Nº ${student.id}</span>
              </div>
              
              <div class="divider"></div>
              
              <div style="margin-bottom: 12px;">
                <span style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Status do Passaporte</span>
                <p style="margin: 4px 0; font-size: 0.9rem; font-weight: 600;">${completedCount} de ${totalCount} locais concluídos (${Math.round(progressPercent)}%)</p>
              </div>

              <div class="stamps-grid">
                ${checksHtml}
              </div>
              
              <div class="divider"></div>
              
              <div class="footer-qr">
                <div class="qr-code" id="qrcode-container"></div>
                <span class="qr-caption">Escaneie para realizar o check-in ou ver status</span>
              </div>
            </div>
          </div>
          
          <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
          <script>
            try {
              var qr = qrcode(4, 'M');
              qr.addData('${qrUrl}');
              qr.make();
              document.getElementById('qrcode-container').innerHTML = qr.createImgTag(4, 8);
              
              // Automatically trigger print on load
              setTimeout(function() {
                window.print();
              }, 500);
            } catch (err) {
              console.error(err);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div id={`passaporte-card-${student.id}`} className="w-full max-w-md mx-auto">
      {/* Wallet-Style Pass */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl relative">
        
        {/* Pass Top Section (Header) */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] tracking-widest text-amber-400 font-bold uppercase">Passagem Espiritual</span>
              <h2 className="text-lg font-extrabold tracking-tight font-sans text-slate-100 mt-1">
                PASSAPORTE DO CRISMA
              </h2>
            </div>
            <span className="bg-white/10 text-white border border-white/20 px-3 py-1 rounded-full text-xs font-mono font-bold">
              Nº {student.id}
            </span>
          </div>

          <div className="mt-8 flex justify-between items-end border-t border-white/10 pt-4">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-medium">Nome do Aluno</p>
              <p className="text-xl font-bold tracking-tight text-white mt-1 leading-tight">
                {student.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-medium">Progresso</p>
              <p className="text-lg font-mono font-bold text-amber-400 mt-1">
                {completedCount}/{totalCount}
              </p>
            </div>
          </div>
        </div>

        {/* Perforated Cutting Line Divider */}
        <div className="relative h-4 bg-slate-50 border-y border-slate-100 flex items-center justify-between px-0">
          <div className="w-4 h-4 rounded-full bg-slate-100 border-r border-slate-200 -ml-2"></div>
          <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-2"></div>
          <div className="w-4 h-4 rounded-full bg-slate-100 border-l border-slate-200 -mr-2"></div>
        </div>

        {/* Pass Bottom Section (Details & Stamps) */}
        <div className="p-6 bg-slate-50">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
              <span>Carimbos Coletados</span>
              <span>{Math.round(progressPercent)}% Concluído</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <motion.div
                className="bg-emerald-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Stamps/Rooms Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {locations.map((loc) => {
              const isChecked = student.checks[loc];
              return (
                <div
                  key={loc}
                  onClick={() => onToggleCheck && onToggleCheck(student.id, loc)}
                  className={`cursor-pointer group flex items-center p-3 rounded-2xl border transition-all duration-200 ${
                    isChecked
                      ? 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70 text-emerald-800'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                  id={`stamp-room-${loc.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isChecked
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isChecked ? (
                      <Check className="w-4 h-4 stroke-[3px]" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold leading-tight truncate">{loc}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      {isChecked ? 'Carimbado' : 'Pendente'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Digital Certificate Unlock Box */}
          {isCompletedAll && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-center flex flex-col items-center shadow-inner"
            >
              <Award className="w-10 h-10 text-amber-500 mb-2 animate-bounce" />
              <h3 className="font-bold text-sm">Passaporte Completo!</h3>
              <p className="text-xs text-amber-700 mt-1 max-w-xs">
                Parabéns! Todas as salas foram carimbadas com sucesso. Seu certificado digital está liberado!
              </p>
              {onOpenCertificate && (
                <button
                  onClick={onOpenCertificate}
                  className="mt-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                  id="btn-unlock-certificate"
                >
                  Ver Certificado <ChevronRight className="w-4.5 h-4.5" />
                </button>
              )}
            </motion.div>
          )}

          {/* Bottom QR & Ticket Footer */}
          <div className="border-t border-slate-200/80 pt-6 flex flex-col items-center">
            <div className="bg-white p-3 border border-slate-200 rounded-2xl shadow-sm hover:scale-105 transition-transform duration-200">
              <QRCodeSVG
                value={`${window.location.origin}${window.location.pathname}?id=${student.id}`}
                size={110}
                level="M"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-3 tracking-widest text-center">
              Bilhete de Embarque do Crismando
            </p>
            <p className="text-[9px] text-slate-400/80 text-center mt-0.5">
              Escaneie este QR Code com o aplicativo para realizar o check-in.
            </p>

            <button
              onClick={handlePrint}
              className="mt-4 flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-sm transition-all active:scale-[0.98]"
              id={`btn-print-boardingpass-${student.id}`}
            >
              <Printer className="w-4 h-4" /> Imprimir Passaporte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
