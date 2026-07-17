import React, { useState } from 'react';
import { Student } from '../types';
import { Printer, CheckSquare, Square, Search, Layers } from 'lucide-react';

interface PassaporteLoteProps {
  students: Student[];
  locations: string[];
}

export default function PassaporteLote({ students, locations }: PassaporteLoteProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  // Handle select/deselect single student
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all filtered students
  const handleSelectAll = (filteredList: Student[]) => {
    const filteredIds = filteredList.map((s) => s.id);
    const allSelected = filteredIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      // Unselect only these filtered IDs
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select all filtered IDs (merging with existing selections)
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Filter list
  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase())
  );

  const handlePrintBatch = () => {
    if (selectedIds.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir em lote.');
      return;
    }

    const selectedStudents = students.filter((s) => selectedIds.includes(s.id));

    // Generate individual ticket cards HTML
    const ticketsHtml = selectedStudents
      .map((student) => {
        const qrUrl = `${window.location.origin}${window.location.pathname}?id=${student.id}`;
        
        const stampsHtml = locations
          .map(
            (loc) => `
          <div class="stamp-box ${student.checks[loc] ? 'completed' : ''}">
            <span class="stamp-icon">${student.checks[loc] ? '✓' : ''}</span>
            <span class="stamp-label">${loc}</span>
          </div>
        `
          )
          .join('');

        return `
        <div class="ticket-card">
          <div class="ticket-header">
            <span class="ticket-category">Passagem Espiritual</span>
            <h2 class="ticket-title">Passaporte do Crisma</h2>
            <span class="ticket-id">Nº ${student.id}</span>
          </div>
          <div class="ticket-body">
            <div class="passenger-row">
              <div>
                <span class="info-label">Crismando</span>
                <div class="passenger-name">${student.name}</div>
              </div>
            </div>
            
            <div class="dotted-divider"></div>
            
            <div class="stamps-grid">
              ${stampsHtml}
            </div>
            
            <div class="dotted-divider"></div>
            
            <div class="qr-footer">
              <div class="qr-code-placeholder" data-qr-url="${qrUrl}"></div>
              <p class="qr-caption">Escaneie com a câmera do app para realizar o check-in</p>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Impressão de Passaportes em Lote</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;600&display=swap');
            
            body {
              font-family: 'Inter', sans-serif;
              background-color: white;
              color: #1e293b;
              margin: 0;
              padding: 20px;
            }
            
            .batch-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            
            .ticket-card {
              border: 2px dashed #cbd5e1;
              border-radius: 16px;
              overflow: hidden;
              background: #fff;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            
            .ticket-header {
              background: #0f172a;
              color: white;
              padding: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              position: relative;
            }
            
            .ticket-category {
              font-size: 0.6rem;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #fbbf24;
              font-weight: bold;
            }
            
            .ticket-title {
              margin: 0;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 1rem;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .ticket-id {
              font-size: 0.75rem;
              background: rgba(255,255,255,0.15);
              padding: 2px 8px;
              border-radius: 99px;
              font-mono;
              font-weight: bold;
            }
            
            .ticket-body {
              padding: 15px;
            }
            
            .passenger-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .info-label {
              font-size: 0.65rem;
              color: #64748b;
              text-transform: uppercase;
              font-weight: 600;
            }
            
            .passenger-name {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 1.15rem;
              font-weight: 700;
              color: #0f172a;
              margin-top: 2px;
            }
            
            .dotted-divider {
              border-top: 2px dashed #e2e8f0;
              margin: 12px 0;
            }
            
            .stamps-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
            }
            
            .stamp-box {
              border: 1.2px solid #cbd5e1;
              border-radius: 8px;
              padding: 6px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              background: #f8fafc;
              min-height: 45px;
              justify-content: center;
            }
            
            .stamp-box.completed {
              background: #f0fdf4;
              border-color: #22c55e;
              color: #15803d;
            }
            
            .stamp-icon {
              font-size: 0.9rem;
              font-weight: bold;
              height: 14px;
            }
            
            .stamp-label {
              font-size: 0.65rem;
              font-weight: 600;
              margin-top: 2px;
            }
            
            .qr-footer {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-top: 10px;
            }
            
            .qr-caption {
              font-size: 0.6rem;
              color: #64748b;
              margin: 4px 0 0 0;
              text-align: center;
            }
            
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              .ticket-card {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="batch-grid">
            ${ticketsHtml}
          </div>
          
          <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
          <script>
            try {
              // Select all qr code placeholders and generate QRs
              var placeholders = document.querySelectorAll('.qr-code-placeholder');
              placeholders.forEach(function(el) {
                var url = el.getAttribute('data-qr-url');
                var qr = qrcode(4, 'M');
                qr.addData(url);
                qr.make();
                el.innerHTML = qr.createImgTag(3, 6);
              });
              
              setTimeout(function() {
                window.print();
              }, 600);
            } catch (err) {
              console.error(err);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isAllFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selectedIds.includes(s.id));

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-500" /> Impressão de Bilhetes em Lote
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-normal">
              Selecione os alunos abaixo para imprimir vários bilhetes de embarque de uma vez só, economizando papel.
            </p>
          </div>

          <button
            onClick={handlePrintBatch}
            disabled={selectedIds.length === 0}
            className={`w-full md:w-auto font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all ${
              selectedIds.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
            id="btn-print-batch-action"
          >
            <Printer className="w-4 h-4" /> Imprimir Selecionados ({selectedIds.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center mt-6 p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar alunos por nome ou número..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700"
              id="batch-search-input"
            />
          </div>

          <button
            onClick={() => handleSelectAll(filtered)}
            className="bg-white hover:bg-slate-100 border text-xs font-bold text-slate-700 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
            id="btn-batch-select-all"
          >
            {isAllFilteredSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
        </div>

        {/* Student Checkbox Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 max-h-[400px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-400 text-xs">
              Nenhum aluno encontrado para sua busca.
            </div>
          ) : (
            filtered.map((student) => {
              const isSelected = selectedIds.includes(student.id);
              const count = Object.values(student.checks).filter(Boolean).length;
              
              return (
                <div
                  key={student.id}
                  onClick={() => toggleSelect(student.id)}
                  className={`cursor-pointer p-3 rounded-2xl border flex items-center justify-between transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-200 text-blue-900 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                  id={`batch-student-item-${student.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600 fill-blue-50" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold truncate leading-tight">{student.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Nº {student.id} • {count} carimbos
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
