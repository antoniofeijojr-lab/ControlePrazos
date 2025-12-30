import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Audience, SystemType } from '../types';
import { extractAudiencesFromPdf } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';
import { Upload, Calendar, Clock, MapPin, Video, Save, Trash2, Edit, X, FileText, RefreshCw, Briefcase, FileSignature, Check, ExternalLink, Plus, Archive, CalendarCheck, AlertCircle, Filter, Search, Hash, ChevronDown, ChevronUp } from 'lucide-react';

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

const Events: React.FC<EventsProps> = ({ audiences, onImport, onUpdate, onDelete }) => {
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [importState, setImportState] = useState<ImportState>({
    status: 'idle',
    elapsedSeconds: 0,
    estimatedSeconds: 0,
    totalFound: 0,
    currentRegistered: 0
  });

  // Filters State
  const [showFilters, setShowFilters] = useState(false); // Collapsible filter state
  const [filters, setFilters] = useState({
    process: '',
    date: '',
    time: '',
    court: '',
    type: ''
  });

  // Modal State for Manual Entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState<Partial<Audience>>({
      mode: 'Presencial',
      type: 'Audiência',
      status: 'Agendada',
      courtDivision: 'Vara Única de Nhamundá',
      time: '09:00',
      system: 'PROJUDI'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  // Inline Editing
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Audience | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper dates
  const parseLocalDate = (dateString: string): Date => {
      if (!dateString) return new Date();
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
  };

  const formatDateForInput = (date: Date) => {
      if (date instanceof Date && !isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
      }
      return '';
  };

  useEffect(() => {
    if (importState.status === 'analyzing') {
      timerRef.current = setInterval(() => {
        setImportState(prev => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [importState.status]);

  // Filter Audiences based on View Mode AND Filter Inputs
  const filteredAudiences = useMemo(() => {
      return audiences.filter(a => {
          // 1. Check View Mode (Active vs Archived)
          let matchesView = false;
          if (viewMode === 'active') {
              matchesView = (a.status === 'Agendada' || a.status === 'Redesignada');
          } else {
              matchesView = (a.status === 'Realizada' || a.status === 'Cancelada');
          }

          if (!matchesView) return false;

          // 2. Check Input Filters
          if (filters.process && !a.processNumber.toLowerCase().includes(filters.process.toLowerCase())) {
             return false;
          }

          if (filters.date) {
             const audienceDateStr = formatDateForInput(a.date);
             if (audienceDateStr !== filters.date) return false;
          }

          if (filters.time && !a.time.includes(filters.time)) {
             return false;
          }

          if (filters.court && !a.courtDivision?.toLowerCase().includes(filters.court.toLowerCase())) {
             return false;
          }

          if (filters.type && !a.type.toLowerCase().includes(filters.type.toLowerCase())) {
             return false;
          }

          return true;
      });
  }, [audiences, viewMode, filters]);

  // Sort logic: Date first, then Time
  const sortedAudiences = useMemo(() => {
      return [...filteredAudiences].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return a.time.localeCompare(b.time);
      });
  }, [filteredAudiences]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const fileSizeMB = file.size / (1024 * 1024);
      const estimatedSecs = Math.ceil(5 + (fileSizeMB * 8));

      setImportState({
        status: 'analyzing',
        elapsedSeconds: 0,
        estimatedSeconds: estimatedSecs,
        totalFound: 0,
        currentRegistered: 0
      });

      try {
          const result = await extractAudiencesFromPdf(file);
          
          if (result.audiences && result.audiences.length > 0) {
              setImportState(prev => ({ 
                  ...prev, 
                  status: 'registering', 
                  totalFound: result.total 
              }));

              const newAudiences: Audience[] = [];
              const delay = Math.max(50, 1500 / result.total);

              for (let i = 0; i < result.total; i++) {
                  const item = result.audiences[i];
                  const audienceObj: Audience = {
                      id: uuidv4(),
                      processNumber: item.processNumber || "S/N",
                      courtDivision: item.courtDivision || "Vara Única de Nhamundá",
                      date: parseLocalDate(item.date),
                      time: item.time || "00:00",
                      type: item.type || "Audiência",
                      mode: (item.mode as any) || "Presencial",
                      status: 'Agendada',
                      link: item.link || "",
                      system: item.system || 'PROJUDI'
                  };
                  newAudiences.push(audienceObj);
                  setImportState(prev => ({ ...prev, currentRegistered: i + 1 }));
                  await new Promise(resolve => setTimeout(resolve, delay));
              }

              onImport(newAudiences);
          } else {
              alert('Nenhuma audiência identificada no arquivo.');
          }
      } catch (error) {
          console.error(error);
          alert('Erro ao processar pauta.');
      } finally {
          setTimeout(() => {
            setImportState({ status: 'idle', elapsedSeconds: 0, estimatedSeconds: 0, totalFound: 0, currentRegistered: 0 });
            if (fileInputRef.current) fileInputRef.current.value = '';
          }, 500);
      }
  };

  // Manual Creation
  const handleManualSubmit = () => {
    if (!manualForm.processNumber || !manualForm.date) {
        alert("Número do processo e Data são obrigatórios.");
        return;
    }

    const newAudience: Audience = {
        id: uuidv4(),
        processNumber: manualForm.processNumber,
        courtDivision: manualForm.courtDivision || 'Vara Única de Nhamundá',
        date: typeof manualForm.date === 'string' ? parseLocalDate(manualForm.date) : (manualForm.date || new Date()),
        time: manualForm.time || '09:00',
        type: manualForm.type || 'Audiência',
        mode: manualForm.mode || 'Presencial',
        status: 'Agendada',
        link: manualForm.link || '',
        proceduralClass: manualForm.proceduralClass || '',
        mainSubject: manualForm.mainSubject || '',
        system: manualForm.system || 'PROJUDI'
    };

    onImport([newAudience]);
    setIsModalOpen(false);
    setManualForm({
        mode: 'Presencial',
        type: 'Audiência',
        status: 'Agendada',
        courtDivision: 'Vara Única de Nhamundá',
        time: '09:00',
        system: 'PROJUDI'
    });
  };

  const handleEditClick = (audience: Audience) => {
      setEditingRowId(audience.id);
      setEditFormData({ ...audience });
  };

  const handleSaveEdit = () => {
      if (editFormData) {
          onUpdate([editFormData]);
          setEditingRowId(null);
          setEditFormData(null);
      }
  };

  const handleCancelEdit = () => {
      setEditingRowId(null);
      setEditFormData(null);
  };

  const handleEditChange = (field: keyof Audience, value: any) => {
      if (editFormData) {
          setEditFormData({ ...editFormData, [field]: value });
      }
  };

  const handleStatusChange = (id: string, newStatus: Audience['status']) => {
      const audience = audiences.find(a => a.id === id);
      if (audience) {
          onUpdate([{ ...audience, status: newStatus }]);
      }
  };

  const handleCopyProcess = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getProgressWidth = () => {
    if (importState.status === 'analyzing') {
        const percent = Math.min(90, (importState.elapsedSeconds / importState.estimatedSeconds) * 100);
        return `${Math.max(5, percent)}%`;
    } 
    if (importState.status === 'registering') {
        const percent = (importState.currentRegistered / importState.totalFound) * 100;
        return `${percent}%`;
    }
    return '0%';
  };

  // New Date Format Logic: "29 DEZ 2024, domingo"
  const getFormattedDateParts = (date: Date) => {
      if (!date || isNaN(date.getTime())) return { day: '--', month: '---', year: '----', weekday: '---' };
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
      const year = date.getFullYear();
      const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      
      return { day, month, year, weekday };
  };

  const getSystemBadgeColor = (system?: string) => {
      switch(system) {
          case 'PROJUDI': return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'SEEU': return 'bg-purple-100 text-purple-800 border-purple-200';
          case 'MPV': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
          default: return 'bg-slate-100 text-slate-800 border-slate-200';
      }
  };

  // Clear filters
  const clearFilters = () => setFilters({ process: '', date: '', time: '', court: '', type: '' });
  const hasActiveFilters = filters.process || filters.date || filters.time || filters.court || filters.type;

  return (
    <div className="w-full flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] animate-in fade-in duration-500 relative">
        
        {/* Manual Entry Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col">
                    <div className="bg-blue-600 px-6 py-4 flex justify-between items-center shrink-0">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            <Plus size={20}/> Nova Audiência Manual
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition">
                            <X size={20}/>
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Processo CNJ *</label>
                                <input 
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                    placeholder="0000000-00.0000.0.00.0000"
                                    value={manualForm.processNumber || ''}
                                    onChange={(e) => setManualForm({...manualForm, processNumber: e.target.value})}
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sistema</label>
                                <select 
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                    value={manualForm.system || 'PROJUDI'}
                                    onChange={(e) => setManualForm({...manualForm, system: e.target.value})}
                                >
                                    <option value="PROJUDI">PROJUDI</option>
                                    <option value="SEEU">SEEU</option>
                                    <option value="MPV">MPV</option>
                                    <option value="SEI">SEI</option>
                                </select>
                            </div>
                            
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vara / Juízo</label>
                                <input 
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                    value={manualForm.courtDivision || ''}
                                    onChange={(e) => setManualForm({...manualForm, courtDivision: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data *</label>
                                <input 
                                    type="date"
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                    value={typeof manualForm.date === 'string' ? manualForm.date : ''}
                                    onChange={(e) => setManualForm({...manualForm, date: e.target.value as any})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora</label>
                                <input 
                                    type="time"
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                    value={manualForm.time || ''}
                                    onChange={(e) => setManualForm({...manualForm, time: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                <input 
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                    placeholder="Ex: Instrução"
                                    value={manualForm.type || ''}
                                    onChange={(e) => setManualForm({...manualForm, type: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modalidade</label>
                                <select 
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                    value={manualForm.mode || 'Presencial'}
                                    onChange={(e) => setManualForm({...manualForm, mode: e.target.value as any})}
                                >
                                    <option value="Presencial">Presencial</option>
                                    <option value="Virtual">Virtual</option>
                                    <option value="Híbrido">Híbrido</option>
                                </select>
                            </div>
                            
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link (Virtual/Híbrido)</label>
                                <input 
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                    placeholder="https://..."
                                    value={manualForm.link || ''}
                                    onChange={(e) => setManualForm({...manualForm, link: e.target.value})}
                                />
                            </div>

                            <div className="col-span-2 h-px bg-slate-100 my-1"></div>

                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Classe Processual</label>
                                <input 
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                    value={manualForm.proceduralClass || ''}
                                    onChange={(e) => setManualForm({...manualForm, proceduralClass: e.target.value})}
                                />
                            </div>
                             <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assunto Principal</label>
                                <input 
                                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                    value={manualForm.mainSubject || ''}
                                    onChange={(e) => setManualForm({...manualForm, mainSubject: e.target.value})}
                                />
                            </div>
                        </div>

                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded">Cancelar</button>
                        <button onClick={handleManualSubmit} className="px-6 py-2 bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 rounded shadow-sm">Cadastrar</button>
                    </div>
                </div>
            </div>
        )}

        {/* Loading Overlay */}
        {importState.status !== 'idle' && (
            <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-[100] flex flex-col items-center justify-center transition-all p-4">
            <div className="w-full max-w-md p-8 flex flex-col items-center bg-white rounded-xl shadow-2xl border border-slate-200">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-white rounded-full p-6 shadow-lg border border-slate-100">
                        {importState.status === 'analyzing' ? (
                            <FileText size={48} className="text-blue-600 animate-pulse"/>
                        ) : (
                            <Calendar size={48} className="text-emerald-600 animate-bounce"/>
                        )}
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight text-center">
                    {importState.status === 'analyzing' ? 'Lendo Pauta de Audiência' : 'Agendando Eventos'}
                </h3>
                <div className="w-full bg-slate-100 rounded-full h-4 mb-4 overflow-hidden border border-slate-200 mt-4">
                    <div 
                        className={`h-4 rounded-full transition-all duration-300 ease-out ${
                            importState.status === 'registering' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: getProgressWidth() }}
                    >
                        <div className="w-full h-full opacity-30 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]"></div>
                    </div>
                </div>
            </div>
            </div>
        )}

        {/* --- FIXED HEADER SECTION --- */}
        <div className="flex flex-col gap-6 shrink-0 pb-2">
            
            {/* 1. Header and Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Eventos</h2>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    {/* Tab Switcher */}
                    <div className="bg-white border border-slate-200 p-1 rounded-lg flex gap-1 shadow-sm mr-4 shrink-0">
                        <button 
                            onClick={() => setViewMode('active')}
                            className={`px-3 md:px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                viewMode === 'active' 
                                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            Próximas
                        </button>
                        <button 
                            onClick={() => setViewMode('archived')}
                            className={`px-3 md:px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${
                                viewMode === 'archived' 
                                ? 'bg-slate-100 text-slate-700 shadow-sm' 
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <Archive size={14}/> <span className="hidden md:inline">Arquivo</span>
                        </button>
                    </div>

                    {/* Filter Toggle Button */}
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`h-10 px-3 md:px-4 font-semibold rounded border shadow-sm transition-all flex items-center gap-2 whitespace-nowrap ${
                            showFilters || hasActiveFilters 
                            ? 'bg-blue-100 text-blue-700 border-blue-200' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                        title="Filtrar Audiências"
                    >
                        <Filter size={18} />
                        <span className="hidden md:inline">Filtros</span>
                        {showFilters ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>

                    <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".pdf" 
                        className="hidden" 
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importState.status !== 'idle' || viewMode === 'archived'}
                        className="h-10 px-3 md:px-4 bg-white text-slate-700 font-semibold rounded border border-slate-300 shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        <Upload size={16} />
                        <span className="hidden md:inline">Carregar</span>
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        disabled={viewMode === 'archived'}
                        className="h-10 px-3 md:px-4 bg-blue-700 text-white font-semibold rounded shadow-md hover:bg-blue-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        <Plus size={16} />
                        <span className="hidden md:inline">Nova Audiência</span>
                        <span className="md:hidden">Nova</span>
                    </button>
                </div>
            </div>

            {/* 2. Microsoft Teams / Google Meet Rooms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a 
                    href="https://teams.microsoft.com/meet/296570756836?p=H70doJtm9GgPXLEb24" 
                    target="_blank" 
                    rel="noreferrer"
                    className="group relative overflow-hidden flex items-center gap-4 p-5 rounded-xl bg-[#464775] text-white shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border border-[#3f406a]"
                >
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                    <div className="bg-white p-3.5 rounded-xl shadow-lg shadow-black/10 flex items-center justify-center relative z-10 shrink-0">
                        <Video size={28} className="text-[#464775] fill-[#464775]/10" />
                    </div>
                    <div className="flex flex-col z-10 min-w-0">
                        <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-0.5">Entrar Agora</span>
                        <span className="text-xl font-bold tracking-tight truncate">Atendimentos MPV</span>
                        <span className="text-xs text-white/70 font-medium flex items-center gap-1 mt-1">
                            Microsoft Teams <ExternalLink size={10} />
                        </span>
                    </div>
                </a>

                <a 
                    href="https://meet.google.com/xsf-bquy-nji"
                    target="_blank" 
                    rel="noreferrer"
                    className="group relative overflow-hidden flex items-center gap-4 p-5 rounded-xl bg-[#00796B] text-white shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border border-[#004d40]"
                >
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                    <div className="bg-white p-3.5 rounded-xl shadow-lg shadow-black/10 flex items-center justify-center relative z-10 shrink-0">
                        <Video size={28} className="text-[#00796B] fill-[#00796B]/10" />
                    </div>
                    <div className="flex flex-col z-10 min-w-0">
                        <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-0.5">Entrar Agora</span>
                        <span className="text-xl font-bold tracking-tight truncate">Audiências Judiciais</span>
                        <span className="text-xs text-white/70 font-medium flex items-center gap-1 mt-1">
                            Google Meet <ExternalLink size={10} />
                        </span>
                    </div>
                </a>
            </div>

            {/* 3. NEW: Collapsible Filter Bar */}
            {showFilters && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row flex-wrap gap-3 items-stretch md:items-center animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider border-b md:border-b-0 md:border-r border-slate-200 pb-2 md:pb-0 md:pr-4">
                        <Filter size={14} />
                        Filtros
                    </div>

                    <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                        <Hash size={14} className="text-slate-400 shrink-0" />
                        <input 
                            type="text"
                            placeholder="Filtrar por Processo..."
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-100 transition placeholder:text-slate-400"
                            value={filters.process}
                            onChange={(e) => setFilters({...filters, process: e.target.value})}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">Data:</label>
                        <input 
                            type="date"
                            className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-100 transition"
                            value={filters.date}
                            onChange={(e) => setFilters({...filters, date: e.target.value})}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">Hora:</label>
                        <input 
                            type="time"
                            className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-100 transition"
                            value={filters.time}
                            onChange={(e) => setFilters({...filters, time: e.target.value})}
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input 
                            type="text"
                            placeholder="Filtrar por Vara / Juízo..."
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-100 transition placeholder:text-slate-400"
                            value={filters.court}
                            onChange={(e) => setFilters({...filters, court: e.target.value})}
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input 
                            type="text"
                            placeholder="Filtrar por Tipo de Audiência..."
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-100 transition placeholder:text-slate-400"
                            value={filters.type}
                            onChange={(e) => setFilters({...filters, type: e.target.value})}
                        />
                    </div>

                    {hasActiveFilters && (
                        <button 
                            onClick={clearFilters}
                            className="w-full md:w-auto text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded transition border border-red-100 md:border-transparent text-center"
                        >
                            Limpar
                        </button>
                    )}
                </div>
            )}

        </div>
        {/* --- END FIXED HEADER --- */}


        {/* --- SCROLLABLE CARD GRID --- */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-4 flex flex-wrap gap-6 content-start justify-start">
            {sortedAudiences.length === 0 ? (
                <div className="w-full bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center justify-center">
                        <div className="bg-slate-50 p-6 rounded-full mb-4">
                            {viewMode === 'active' ? (
                                <CalendarCheck size={48} className="text-slate-300"/>
                            ) : (
                                <Archive size={48} className="text-slate-300"/>
                            )}
                        
                        </div>
                        <h3 className="text-lg font-bold text-slate-600">
                            {hasActiveFilters ? 'Nenhum resultado para os filtros' : (viewMode === 'active' ? 'Nenhuma audiência agendada' : 'Arquivo vazio')}
                        </h3>
                        <p className="text-slate-400 mt-1">
                            {hasActiveFilters 
                                ? 'Tente limpar os filtros para ver mais resultados.'
                                : (viewMode === 'active' 
                                    ? 'Carregue uma pauta ou adicione manualmente.' 
                                    : 'Audiências realizadas ou canceladas aparecerão aqui.')}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {sortedAudiences.map((audience) => {
                        const isEditing = editingRowId === audience.id;
                        const { day, month, year, weekday } = getFormattedDateParts(audience.date);

                        return (
                            <div key={audience.id} className={`w-full sm:w-96 h-[450px] bg-white rounded-xl shadow-md border transition-all duration-300 flex flex-col overflow-hidden ${isEditing ? 'border-blue-400 ring-4 ring-blue-50/50 shadow-lg' : 'border-slate-300 hover:shadow-xl hover:border-slate-400'} ${viewMode === 'archived' ? 'opacity-90 grayscale-[0.1]' : ''}`}>
                                
                                {/* HEADER: High Impact Date with Year */}
                                <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-lg border border-slate-200 shadow-sm ${viewMode === 'archived' ? 'bg-slate-100 text-slate-500' : 'bg-white text-blue-700'}`}>
                                            <Calendar size={24} strokeWidth={2.5} />
                                        </div>
                                        {isEditing && editFormData ? (
                                            <input 
                                                type="date"
                                                className="border border-slate-300 rounded p-1 text-sm bg-white text-slate-900"
                                                value={formatDateForInput(editFormData.date)}
                                                onChange={(e) => handleEditChange('date', parseLocalDate(e.target.value))}
                                            />
                                        ) : (
                                            <div className="flex flex-col justify-center leading-none">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xl font-black text-blue-800 tracking-tight">{day} {month}</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-400 capitalize">{weekday}, {year}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 text-slate-700 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
                                        <Clock size={16} className="text-slate-400"/>
                                        {isEditing && editFormData ? (
                                            <input 
                                                type="time"
                                                className="border border-slate-300 rounded p-0 text-sm bg-white text-slate-900 outline-none w-20 px-1"
                                                value={editFormData.time}
                                                onChange={(e) => handleEditChange('time', e.target.value)}
                                            />
                                        ) : (
                                            <span className="font-bold text-lg leading-none text-slate-700">{audience.time}</span>
                                        )}
                                    </div>
                                </div>

                                {/* BODY: Scrollable */}
                                <div className="p-5 flex flex-col gap-3 flex-1 overflow-y-auto">
                                    
                                    {/* 1. Identification (Process & Vara) */}
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 group/copy flex-wrap">
                                            <span 
                                                onClick={() => !isEditing && viewMode === 'active' && handleCopyProcess(audience.id, audience.processNumber)}
                                                className={`text-base font-bold text-slate-900 tracking-tight break-all ${viewMode === 'active' ? 'hover:text-blue-700 cursor-pointer' : ''} transition-colors leading-tight`}
                                                title={viewMode === 'active' ? "Clique para copiar" : ""}
                                            >
                                                {audience.processNumber}
                                            </span>
                                            
                                            {/* System Tag */}
                                            {isEditing && editFormData ? (
                                                <select 
                                                    className="text-xs font-bold border border-slate-300 rounded px-2 py-1 bg-white text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                                                    value={editFormData.system}
                                                    onChange={(e) => handleEditChange('system', e.target.value)}
                                                >
                                                    <option value="PROJUDI">PROJUDI</option>
                                                    <option value="SEEU">SEEU</option>
                                                    <option value="MPV">MPV</option>
                                                    <option value="SEI">SEI</option>
                                                </select>
                                            ) : (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getSystemBadgeColor(audience.system || 'PROJUDI')}`}>
                                                    {audience.system || 'PROJUDI'}
                                                </span>
                                            )}

                                            {!isEditing && copiedId === audience.id && (
                                                <Check size={18} className="text-emerald-600 animate-in zoom-in" />
                                            )}
                                            {viewMode === 'archived' && (
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ml-2 ${
                                                    audience.status === 'Realizada' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'
                                                }`}>
                                                    {audience.status}
                                                </span>
                                            )}
                                        </div>
                                        {isEditing && editFormData ? (
                                            <input 
                                                className="w-full text-sm border border-slate-300 rounded p-1 bg-white text-slate-900"
                                                value={editFormData.courtDivision}
                                                onChange={(e) => handleEditChange('courtDivision', e.target.value)}
                                                placeholder="Vara / Juízo"
                                            />
                                        ) : (
                                            <div className="flex items-start gap-2 text-slate-500">
                                                <MapPin size={16} className="shrink-0 mt-0.5"/>
                                                <span className="text-xs font-medium leading-tight break-words">{audience.courtDivision || "Vara não informada"}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-px bg-slate-100 w-full"></div>

                                    {/* 2. Info Stack */}
                                    <div className="flex flex-col gap-3">
                                        
                                        {/* Legal Info */}
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                                                    <Briefcase size={12}/> Classe
                                                </span>
                                                {isEditing && editFormData ? (
                                                    <textarea 
                                                        className="w-full text-xs border border-slate-300 rounded p-1 bg-white text-slate-900 resize-none h-16"
                                                        value={editFormData.proceduralClass}
                                                        onChange={(e) => handleEditChange('proceduralClass', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="text-xs font-semibold text-slate-700 leading-snug break-words">
                                                        {audience.proceduralClass || <span className="text-slate-300 italic">Não informada</span>}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                                                    <FileSignature size={12}/> Assunto
                                                </span>
                                                {isEditing && editFormData ? (
                                                    <textarea 
                                                        className="w-full text-xs border border-slate-300 rounded p-1 bg-white text-slate-900 resize-none h-16"
                                                        value={editFormData.mainSubject}
                                                        onChange={(e) => handleEditChange('mainSubject', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="text-xs font-medium text-slate-600 leading-snug break-words">
                                                        {audience.mainSubject || <span className="text-slate-300 italic">Não informado</span>}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Logistics */}
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Tipo de Audiência</span>
                                                {isEditing && editFormData ? (
                                                    <input 
                                                        className="w-full text-sm border border-slate-300 rounded p-1 bg-white text-slate-900"
                                                        value={editFormData.type}
                                                        onChange={(e) => handleEditChange('type', e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200 w-fit break-words">
                                                        {audience.type}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Modalidade</span>
                                                {isEditing && editFormData ? (
                                                    <>
                                                        <select 
                                                            className="w-full text-sm border border-slate-300 rounded p-1 bg-white text-slate-900"
                                                            value={editFormData.mode}
                                                            onChange={(e) => handleEditChange('mode', e.target.value)}
                                                        >
                                                            <option value="Presencial">Presencial</option>
                                                            <option value="Virtual">Virtual</option>
                                                            <option value="Híbrido">Híbrido</option>
                                                        </select>
                                                        {(editFormData.mode === 'Virtual' || editFormData.mode === 'Híbrido') && (
                                                            <input 
                                                                className="w-full text-xs border border-blue-300 rounded p-1 bg-blue-50 text-slate-900 mt-1 placeholder:text-blue-300"
                                                                placeholder="Cole o link da sala..."
                                                                value={editFormData.link || ''}
                                                                onChange={(e) => handleEditChange('link', e.target.value)}
                                                            />
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded w-fit">
                                                            {audience.mode === 'Virtual' ? <Video size={12} className="text-blue-500"/> : <MapPin size={12} className="text-orange-500"/>}
                                                            {audience.mode}
                                                        </div>
                                                        {audience.link && (
                                                            <a href={audience.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-100 px-2 py-1 rounded transition-colors w-fit">
                                                                <ExternalLink size={12}/> Sala
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Footer Actions (Hidden in Archive) */}
                                {viewMode === 'active' && (
                                    <div className="p-3 border-t border-slate-100 flex items-center gap-3 bg-slate-50/50 shrink-0">
                                        {/* Status Selector (Flex-1) */}
                                        <div className="flex-1">
                                            {!isEditing ? (
                                                <div className="relative w-full">
                                                    <select 
                                                        className={`w-full appearance-none py-2 pl-3 pr-8 rounded font-bold text-xs uppercase border cursor-pointer outline-none transition-colors shadow-sm text-center ${
                                                            audience.status === 'Realizada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                                                            audience.status === 'Cancelada' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                                                            audience.status === 'Redesignada' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                                                            'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                        value={audience.status}
                                                        onChange={(e) => handleStatusChange(audience.id, e.target.value as any)}
                                                    >
                                                        <option value="Agendada">Agendada</option>
                                                        <option value="Realizada">Realizada</option>
                                                        <option value="Redesignada">Redesignada</option>
                                                        <option value="Cancelada">Cancelada</option>
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center px-1 text-slate-500">
                                                        <RefreshCw size={12} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <span className="text-xs text-slate-400 italic">Editando...</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Edit Button (Flex-1) */}
                                        {isEditing ? (
                                            <button onClick={handleSaveEdit} className="flex-1 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-1.5 text-xs font-bold transition-colors uppercase"><Save size={14}/> SALVAR</button>
                                        ) : (
                                            <button onClick={() => handleEditClick(audience)} className="flex-1 py-2 bg-white text-blue-600 rounded border border-blue-100 hover:bg-blue-50 shadow-sm transition-colors flex items-center justify-center gap-1.5 text-xs font-bold uppercase" title="Editar"><Edit size={14}/> EDITAR</button>
                                        )}
                                        
                                        {/* Delete Button (Flex-1) */}
                                        {isEditing ? (
                                            <button onClick={handleCancelEdit} className="flex-1 py-2 bg-white text-slate-500 rounded border border-slate-200 hover:bg-slate-50 shadow-sm flex items-center justify-center gap-1.5 text-xs font-bold transition-colors uppercase"><X size={14}/> CANCELAR</button>
                                        ) : (
                                            <button onClick={() => onDelete(audience.id)} className="flex-1 py-2 bg-white text-red-600 rounded border border-red-100 hover:bg-red-50 shadow-sm transition-colors flex items-center justify-center gap-1.5 text-xs font-bold uppercase" title="Excluir"><Trash2 size={14}/> EXCLUIR</button>
                                        )}
                                    </div>
                                )}
                                
                                {viewMode === 'archived' && (
                                    <div className="p-3 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 bg-slate-50/50 shrink-0">
                                        <Archive size={14} />
                                        <span className="text-xs italic font-medium">Arquivado - Somente Leitura</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
            )}
        </div>
        {/* --- END SCROLLABLE GRID --- */}
    </div>
  );
};

export default Events;