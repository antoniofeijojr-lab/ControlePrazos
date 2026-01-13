import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Audience } from '../types';
import { extractAudiencesFromPdf } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';
import { Upload, Clock, MapPin, Plus, Archive, CalendarCheck, X } from 'lucide-react';

interface EventsProps {
  audiences: Audience[];
  onImport: (newAudiences: Audience[]) => void;
  onUpdate: (updatedAudiences: Audience[]) => void;
  onDelete: (id: string) => void;
}

type ImportState = {
  status: 'idle' | 'analyzing' | 'registering';
  elapsedSeconds: number;
  estimatedSeconds: number;
  totalFound: number;
  currentRegistered: number;
};

const Events: React.FC<EventsProps> = ({ audiences, onImport }) => {
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [importState, setImportState] = useState<ImportState>({
    status: 'idle',
    elapsedSeconds: 0,
    estimatedSeconds: 0,
    totalFound: 0,
    currentRegistered: 0
  });

  const [filters] = useState({ process: '', date: '', time: '', court: '', type: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState<Partial<Audience>>({
      mode: 'Presencial', type: 'Audiência', status: 'Agendada', courtDivision: 'Vara Única de Nhamundá', time: '09:00', system: 'PROJUDI'
  });

  const timerRef = useRef<any>(null);

  const parseLocalDate = (dateString: string): Date => {
      if (!dateString) return new Date();
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
  };

  const formatDateForInput = (date: Date) => {
      if (date instanceof Date && !isNaN(date.getTime())) return date.toISOString().split('T')[0];
      return '';
  };

  useEffect(() => {
    if (importState.status === 'analyzing') {
      timerRef.current = setInterval(() => setImportState(prev => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 })), 1000);
    } else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [importState.status]);

  const filteredAudiences = useMemo(() => {
      return audiences.filter(a => {
          let matchesView = viewMode === 'active' ? (a.status === 'Agendada' || a.status === 'Redesignada') : (a.status === 'Realizada' || a.status === 'Cancelada');
          if (!matchesView) return false;
          if (filters.process && !a.processNumber.toLowerCase().includes(filters.process.toLowerCase())) return false;
          if (filters.date && formatDateForInput(a.date) !== filters.date) return false;
          return true;
      });
  }, [audiences, viewMode, filters]);

  const sortedAudiences = useMemo(() => {
      return [...filteredAudiences].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return a.time.localeCompare(b.time);
      });
  }, [filteredAudiences]);

  const handleManualSubmit = () => {
    if (!manualForm.processNumber || !manualForm.date) { alert("Dados obrigatórios faltando."); return; }
    const newAudience: Audience = {
        id: uuidv4(), processNumber: manualForm.processNumber, courtDivision: manualForm.courtDivision || 'Vara Única de Nhamundá',
        date: typeof manualForm.date === 'string' ? parseLocalDate(manualForm.date) : (manualForm.date || new Date()),
        time: manualForm.time || '09:00', type: manualForm.type || 'Audiência', mode: manualForm.mode || 'Presencial',
        status: 'Agendada', link: manualForm.link || '', system: manualForm.system || 'PROJUDI'
    };
    onImport([newAudience]);
    setIsModalOpen(false);
  };

  const getFormattedDateParts = (date: Date) => {
      if (!date || isNaN(date.getTime())) return { day: '--', month: '---', year: '----', weekday: '---' };
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
      const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      return { day, month, year: date.getFullYear(), weekday };
  };

  return (
    <div className="w-full flex flex-col h-full animate-in fade-in p-6 bg-slate-50">
        
        {isModalOpen && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 animate-in zoom-in-95 overflow-hidden">
                    <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2"><Plus size={20}/> Nova Audiência</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white"><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Processo CNJ *</label>
                                <input className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={manualForm.processNumber || ''} onChange={e => setManualForm({...manualForm, processNumber: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data *</label>
                                <input type="date" className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={typeof manualForm.date === 'string' ? manualForm.date : ''} onChange={e => setManualForm({...manualForm, date: e.target.value as any})}/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hora</label>
                                <input type="time" className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={manualForm.time || ''} onChange={e => setManualForm({...manualForm, time: e.target.value})}/>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded">Cancelar</button>
                        <button onClick={handleManualSubmit} className="px-6 py-2 bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 rounded shadow-sm">Cadastrar</button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex flex-col gap-6 shrink-0 pb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Eventos</h2>
                    <p className="text-slate-500 font-medium text-sm">Pauta de audiências da Comarca</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="bg-white border border-slate-200 p-1 rounded-lg flex gap-1 shadow-sm">
                        <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all uppercase ${viewMode === 'active' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Próximas</button>
                        <button onClick={() => setViewMode('archived')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all uppercase flex items-center gap-2 ${viewMode === 'archived' ? 'bg-slate-100 text-slate-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Archive size={14}/> Arquivo</button>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="h-10 px-4 bg-blue-700 text-white font-bold rounded shadow-md hover:bg-blue-800 transition-all flex items-center gap-2 text-xs uppercase"><Plus size={16} /> Nova</button>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-4 flex flex-wrap gap-6 content-start justify-start">
            {sortedAudiences.length === 0 ? (
                <div className="w-full bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                    <CalendarCheck size={48} className="text-slate-300 mb-4"/>
                    <h3 className="text-lg font-bold text-slate-600">Nenhuma audiência encontrada</h3>
                </div>
            ) : (
                sortedAudiences.map((audience) => {
                    const { day, month, year, weekday } = getFormattedDateParts(audience.date);
                    return (
                        <div key={audience.id} className="w-full sm:w-80 h-auto bg-white rounded-xl shadow-md border border-slate-300 transition-all hover:shadow-xl flex flex-col overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
                                <div className="flex flex-col leading-none">
                                    <span className="text-xl font-bold text-blue-800 tracking-tight">{day} {month}</span>
                                    <span className="text-[10px] font-bold text-slate-400 capitalize">{weekday}, {year}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                                    <Clock size={14} className="text-slate-400"/>
                                    <span className="font-bold text-sm">{audience.time}</span>
                                </div>
                            </div>

                            <div className="p-5 flex flex-col gap-3 flex-1">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-bold text-slate-900 tracking-tight break-all">
                                        {audience.processNumber}
                                    </span>
                                    <div className="flex items-start gap-1 text-slate-500">
                                        <MapPin size={12} className="shrink-0 mt-0.5"/>
                                        <span className="text-[11px] font-medium leading-tight">{audience.courtDivision || "Vara Única"}</span>
                                    </div>
                                </div>
                                <div className="h-px bg-slate-100"></div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tipo</span>
                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200 w-fit">{audience.type}</span>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    </div>
  );
};

export default Events;