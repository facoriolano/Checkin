import React from 'react';
import { Award, Printer, X, Download } from 'lucide-react';
import { Student } from '../types';

interface CertificadoProps {
  student: Student;
  onClose: () => void;
}

export default function Certificado({ student, onClose }: CertificadoProps) {
  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handlePrintCertificate = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir o certificado.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Certificado do Crisma - ${student.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Alex+Brush&family=Montserrat:wght@400;600&display=swap');
            body {
              font-family: 'Montserrat', sans-serif;
              background-color: white;
              color: #1a202c;
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            .certificate-container {
              width: 842px; /* standard landscape A4 aspect ratio width */
              height: 595px; /* standard landscape A4 aspect ratio height */
              border: 12px double #d4af37;
              padding: 40px;
              box-sizing: border-box;
              background: #fdfbf7;
              position: relative;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              border-radius: 8px;
            }
            .inner-border {
              position: absolute;
              top: 15px;
              left: 15px;
              right: 15px;
              bottom: 15px;
              border: 1px solid #d4af37;
              pointer-events: none;
            }
            .cross {
              font-size: 2rem;
              color: #d4af37;
              margin: 0;
            }
            .header-title {
              font-family: 'Cinzel', serif;
              font-weight: 900;
              font-size: 2.2rem;
              color: #1e3a8a;
              letter-spacing: 2px;
              margin: 10px 0 5px 0;
            }
            .header-subtitle {
              font-family: 'Cinzel', serif;
              font-weight: 700;
              font-size: 1rem;
              color: #b45309;
              letter-spacing: 3px;
              margin: 0;
              text-transform: uppercase;
            }
            .certify-text {
              font-size: 1.1rem;
              color: #4a5568;
              margin: 20px 0 10px 0;
              font-style: italic;
            }
            .student-name {
              font-family: 'Alex Brush', cursive;
              font-size: 3.8rem;
              color: #1e293b;
              margin: 10px 0;
              border-bottom: 2px solid #e2e8f0;
              display: inline-block;
              padding-bottom: 10px;
              min-width: 400px;
            }
            .achievement-text {
              font-size: 0.95rem;
              line-height: 1.6;
              color: #4a5568;
              max-w: 600px;
              margin: 0 auto;
            }
            .footer-info {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 30px;
              padding: 0 40px;
            }
            .date-info {
              text-align: left;
              font-size: 0.8rem;
              color: #718096;
            }
            .seal-gold {
              width: 80px;
              height: 80px;
              background: radial-gradient(circle, #f6e05e 0%, #d4af37 100%);
              border-radius: 50%;
              position: relative;
              box-shadow: 0 4px 10px rgba(0,0,0,0.15);
              border: 2px dashed #b45309;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Cinzel', serif;
              font-weight: bold;
              font-size: 0.8rem;
              color: #78350f;
            }
            .signature {
              border-top: 1px solid #cbd5e1;
              width: 180px;
              padding-top: 8px;
              font-size: 0.8rem;
              color: #4a5568;
              font-weight: 600;
              text-transform: uppercase;
            }
            @media print {
              body {
                background: white;
                padding: 0;
                margin: 0;
              }
              .certificate-container {
                border-radius: 0;
                box-shadow: none;
                margin: 0;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="certificate-container">
            <div class="inner-border"></div>
            
            <div>
              <p class="cross">✟</p>
              <h1 class="header-title">Certificado de Conclusão</h1>
              <h2 class="header-subtitle">Passaporte do Crisma</h2>
            </div>

            <div>
              <p class="certify-text">Certificamos com alegria que o(a) crismando(a)</p>
              <div class="student-name">${student.name}</div>
              <p class="achievement-text">
                concluiu com êxito todas as etapas de formação espiritual e reflexão teológica, 
                tendo percorrido e carimbado todos os locais e salas propostos na Educação do Crisma, 
                confirmando seu compromisso de fé e embarque rumo ao Sacramento da Crisma.
              </p>
            </div>

            <div class="footer-info">
              <div class="date-info">
                <strong>Data de Emissão:</strong><br/>
                ${formattedDate}<br/>
                Catedral Metropolitana
              </div>
              
              <div class="seal-gold">
                CERTIFICADO
              </div>
              
              <div>
                <div style="height: 40px;"></div>
                <div class="signature">
                  Coordenação de Catequese
                </div>
              </div>
            </div>
          </div>
          
          <script>
            // Automatically open printer dialog
            setTimeout(function() {
              window.print();
            }, 600);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl overflow-hidden w-full max-w-4xl shadow-2xl border border-slate-200 my-8">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" /> Certificado de Conclusão de {student.name}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
            id="btn-close-certificate"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Certificate Landscape Preview Box */}
        <div className="p-6 bg-slate-100 flex justify-center overflow-x-auto">
          
          {/* Visual Canvas matching the printable landscape structure */}
          <div className="w-[780px] h-[520px] shrink-0 border-[10px] double border-amber-600 p-8 box-border bg-[#fefdfa] relative flex flex-col justify-between shadow-lg text-center rounded-lg">
            <div className="absolute inset-2 border border-amber-600/30 pointer-events-none rounded"></div>
            
            <div>
              <p className="text-amber-500 text-xl font-bold">✟</p>
              <h1 className="font-serif font-black text-2xl tracking-wider text-blue-900 uppercase">
                Certificado de Conclusão
              </h1>
              <h2 className="font-serif font-bold text-xs tracking-[4px] text-amber-700 uppercase mt-1">
                Passaporte do Crisma
              </h2>
            </div>

            <div>
              <p className="text-slate-500 text-sm italic">Certificamos com alegria que o(a) crismando(a)</p>
              <h2 className="font-serif font-black text-4xl text-slate-800 italic mt-3 mb-2 border-b border-slate-200 pb-2 inline-block px-10">
                {student.name}
              </h2>
              <p className="text-slate-500 text-[11px] leading-relaxed max-w-md mx-auto mt-2">
                concluiu com êxito todas as etapas de formação espiritual e reflexão teológica, 
                tendo percorrido e carimbado todos os locais e salas propostos na Educação do Crisma, 
                confirmando seu compromisso de fé e embarque rumo ao Sacramento da Crisma.
              </p>
            </div>

            <div className="flex justify-between items-end px-6">
              <div className="text-left text-[10px] text-slate-400 leading-normal">
                <span className="font-bold text-slate-500">Data de Emissão:</span>
                <br />
                {formattedDate}
                <br />
                Catedral Metropolitana
              </div>
              
              <div className="w-14 h-14 bg-gradient-to-tr from-amber-400 to-amber-500 text-[9px] font-bold text-amber-950 flex items-center justify-center rounded-full border border-amber-600/50 shadow-sm relative">
                <div className="absolute inset-1 border border-dashed border-amber-800/30 rounded-full"></div>
                CERTIFICADO
              </div>
              
              <div className="text-right">
                <div className="border-t border-slate-200 w-36 pt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Coordenação
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            💡 Este certificado é desbloqueado automaticamente porque <strong>{student.name}</strong> concluiu 100% do itinerário!
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs border"
              id="btn-cancel-certificate-print"
            >
              Fechar
            </button>
            <button
              onClick={handlePrintCertificate}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-transform"
              id="btn-print-certificate-dialog"
            >
              <Printer className="w-4 h-4" /> Imprimir Certificado
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
