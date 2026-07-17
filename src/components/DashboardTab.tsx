import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { Search, UserCheck, ShieldAlert, Award, ArrowUpRight, Check, MapPin, Users, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardTabProps {
  students: Student[];
  locations: string[];
  onCheckIn: (studentId: string, location: string, checked: boolean) => Promise<void>;
  onSelectStudent: (student: Student) => void;
  isSyncing: boolean;
  syncingCell: { studentId: string; location: string } | null;
}

export default function DashboardTab({
  students,
  locations,
  onCheckIn,
  onSelectStudent,
  isSyncing,
  syncingCell,
}: DashboardTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('ALL');

  // Calculating Stats
  const stats = useMemo(() => {
    const total = students.length;
    if (total === 0) {
      return { total: 0, completed: 0, avgStamps: 0, mostVisited: 'Nenhum', roomCounts: {} as Record<string, number> };
    }

    let completed = 0;
    let totalStamps = 0;
    const roomCounts: Record<string, number> = {};

    locations.forEach((loc) => {
      roomCounts[loc] = 0;
    });

    students.forEach((s) => {
      const checkedRooms = Object.entries(s.checks).filter(([_, val]) => val);
      totalStamps += checkedRooms.length;
      if (checkedRooms.length === locations.length) {
        completed++;
      }
      checkedRooms.forEach(([loc, _]) => {
        if (roomCounts[loc] !== undefined) {
          roomCounts[loc]++;
        }
      });
    });

    let mostVisited = 'Nenhum';
    let maxVisits = -1;
    Object.entries(roomCounts).forEach(([room, count]) => {
      if (count > maxVisits) {
        maxVisits = count;
        mostVisited = room;
      }
    });

    if (maxVisits === 0) mostVisited = 'Nenhum';

    return {
      total,
      completed,
      avgStamps: (totalStamps / total).toFixed(1),
      mostVisited,
      roomCounts,
    };
  }, [students, locations]);

  // Search & Filter students list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase());

      const checkedCount = Object.values(s.checks).filter(Boolean).length;
      const isCompleted = checkedCount === locations.length;

      let matchesStatus = true;
      if (statusFilter === 'COMPLETED') {
        matchesStatus = isCompleted;
      } else if (statusFilter === 'PENDING') {
        matchesStatus = !isCompleted;
      }

      let matchesRoom = true;
      if (roomFilter !== 'ALL') {
        matchesRoom = !!s.checks[roomFilter];
      }

      return matchesSearch && matchesStatus && matchesRoom;
    });
  }, [students, search, statusFilter, roomFilter, locations]);

  const handleCellClick = async (studentId: string, loc: string, currentVal: boolean) => {
    // If we're already syncing this specific cell, ignore double clicks
    if (syncingCell?.studentId === studentId && syncingCell?.location === loc) return;
    
    try {
      await onCheckIn(studentId, loc, !currentVal);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      
      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Students */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alunos Inscritos</p>
            <h3 className="text-xl font-black text-slate-800 font-mono mt-0.5">{stats.total}</h3>
          </div>
        </div>

        {/* Stat 2: Completed All */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passaportes Cheios</p>
            <h3 className="text-xl font-black text-slate-800 font-mono mt-0.5">
              {stats.completed} <span className="text-xs font-semibold text-slate-400 font-sans">({stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)</span>
            </h3>
          </div>
        </div>

        {/* Stat 3: Avg Stamps */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Média de Carimbos</p>
            <h3 className="text-xl font-black text-slate-800 font-mono mt-0.5">
              {stats.avgStamps} <span className="text-xs font-semibold text-slate-400 font-sans">/ {locations.length}</span>
            </h3>
          </div>
        </div>

        {/* Stat 4: Most Visited Room */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sala Mais Visitada</p>
            <h3 className="text-sm font-black text-slate-800 truncate mt-0.5" title={stats.mostVisited}>
              {stats.mostVisited}
            </h3>
          </div>
        </div>
      </div>

      {/* Grid of Room Progress Bars */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-slate-500" /> Presença por Localização
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => {
            const count = stats.roomCounts[loc] || 0;
            const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={loc} className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                  <span className="text-slate-700 truncate">{loc}</span>
                  <span className="text-slate-500 shrink-0 font-mono">
                    {count} / {stats.total} <span className="text-[10px] text-slate-400">({Math.round(percent)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table & Filtering */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Filters bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou número..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="dashboard-search-input"
            />
          </div>

          {/* Quick Filter buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-bold text-slate-600 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="filter-room-select"
            >
              <option value="ALL">Qualquer Sala</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  Presente em: {loc}
                </option>
              ))}
            </select>

            <div className="bg-slate-100 p-0.5 rounded-xl flex">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id="btn-filter-all"
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id="btn-filter-completed"
              >
                Cheios
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'PENDING'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id="btn-filter-pending"
              >
                Pendentes
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable table container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/30">
                <th className="py-4 px-6 font-semibold">Nº</th>
                <th className="py-4 px-6 font-semibold">Nome do Aluno</th>
                <th className="py-4 px-6 font-semibold text-center">Progresso</th>
                {locations.map((loc) => (
                  <th key={loc} className="py-4 px-4 font-semibold text-center whitespace-nowrap">
                    {loc}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={3 + locations.length} className="text-center py-12 text-slate-400">
                    <p className="text-sm font-semibold">Nenhum aluno corresponde aos filtros aplicados.</p>
                    <p className="text-xs mt-1">Tente ajustar sua busca ou limpar os filtros de sala.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const completed = Object.values(s.checks).filter(Boolean).length;
                  const isFinished = completed === locations.length && locations.length > 0;
                  
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/50 transition-colors group text-sm text-slate-700"
                    >
                      {/* ID Number */}
                      <td className="py-3 px-6 font-mono font-semibold text-slate-500">
                        {s.id}
                      </td>

                      {/* Name with Load action */}
                      <td className="py-3 px-6 font-semibold">
                        <button
                          onClick={() => onSelectStudent(s)}
                          className="hover:text-blue-600 hover:underline text-left font-bold transition-colors block text-slate-800 group-hover:text-blue-600"
                          id={`btn-open-student-row-${s.id}`}
                        >
                          {s.name}
                        </button>
                      </td>

                      {/* Progress column */}
                      <td className="py-3 px-6 text-center shrink-0">
                        <div className="flex flex-col items-center justify-center">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                              isFinished
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {completed} / {locations.length}
                          </span>
                          <div className="w-16 bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isFinished ? 'bg-emerald-500' : 'bg-blue-600'}`}
                              style={{ width: `${(completed / locations.length) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Checkboxes per room */}
                      {locations.map((loc, colOffset) => {
                        const isChecked = s.checks[loc];
                        const isCellSyncing = syncingCell?.studentId === s.id && syncingCell?.location === loc;
                        
                        return (
                          <td
                            key={loc}
                            className="py-3 px-4 text-center cursor-pointer transition-all active:scale-95"
                            onClick={() => handleCellClick(s.id, loc, isChecked)}
                            id={`cell-${s.id}-${loc.replace(/\s+/g, '-').toLowerCase()}`}
                          >
                            <div className="flex items-center justify-center">
                              {isCellSyncing ? (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin"></div>
                              ) : isChecked ? (
                                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm hover:scale-110 hover:bg-emerald-600 transition-transform">
                                  <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full border border-slate-300 bg-white hover:border-slate-400 flex items-center justify-center hover:scale-110 transition-transform">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 opacity-50"></span>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400 bg-slate-50/20">
          <span className="font-bold uppercase tracking-wider">Legenda:</span>
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white"><Check className="w-2 h-2" /></span> Concluído
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-full border border-slate-300 bg-white"></span> Pendente
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
            <HelpCircle className="w-3.5 h-3.5" /> Clique em qualquer célula acima para alterar manualmente o status de check-in.
          </span>
        </div>

      </div>
    </div>
  );
}
