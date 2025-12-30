import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AdministrativeProcess, InterestedParty, AdminPartyType, AdminDeadlineStatus } from '../types';
import { extractAdministrativeData } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';
import { 
    Upload, FileText, ClipboardList, Plus, Search, Filter, Archive, 
    Trash2, Edit, Save, X, Calendar, AlertCircle, Clock, Users, 
    UserPlus, Check, ChevronDown, ChevronUp, Copy, Eye, FileBox, Hash, Briefcase, FileSignature, MapPin
} from 'lucide-react';

interface AdministrativeProps {
    processes: AdministrativeProcess[];
    onUpdate: (updated: AdministrativeProcess[]) => void;
    onDelete: (id: string) => void;
    onImport: (newProcesses: AdministrativeProcess[]) => void;
}

const Administrative: React.FC<AdministrativeProps> = ({ processes, onUpdate, onDelete, onImport }) => {
    // --- STATE ---
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({ term: '', status: '' });
    
    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit/Create Modal State
    const [editingProcess, setEditingProcess] = useState<AdministrativeProcess | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    // Party Management State (inside Edit Modal)
    const [newPartyName, setNewPartyName] = useState('');
    const [newPartyType, setNewPartyType] = useState<AdminPartyType>('Interessado (Pólo Passivo)');

    // --- HELPERS ---
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

    // Calculate Status & CNMP Deadline
    const calculateStatus = (process: AdministrativeProcess): AdminDeadlineStatus => {
        if (process.status === 'Prorrogado') return 'Prorrogado'; // Manual override
        
        const now = new Date();
        const deadline = new Date(process.legalDeadline);
        
        // Remove time part
        now.setHours(0,0,0,0);
        deadline.setHours(0,0,0,0);
        
        if (deadline < now) return 'Atrasado';
        return 'Em dia';
    };

    const calculateCnmpDeadline = (regDate: Date): Date => {
        const d = new Date(regDate);
        d.setFullYear(d.getFullYear() + 3);
        return d;
    };

    // Helper to format party type (remove parenthesis content)
    const formatPartyType = (type: string) => {
        return type.split('(')[0].trim();
    };

    // --- HANDLERS ---

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        processImport(file);
    };

    const handleTextImport = () => {
        if (!importText.trim()) return;
        processImport(importText);
    };

    const processImport = async (input: File | string) => {
        setIsProcessing(true);
        try {
            const result = await extractAdministrativeData(input);
            
            if (result.processes && result.processes.length > 0) {
                const newItems: AdministrativeProcess[] = result.processes.map(p => {
                    const regDate = parseLocalDate(p.registrationDate);
                    return {
                        id: uuidv4(),
                        procedureNumber: p.procedureNumber || "S/N",
                        proceduralClass: p.proceduralClass || "Não inf.",
                        mainSubject: p.mainSubject || "Geral",
                        originNumber: p.originNumber,
                        currentSector: p.currentSector || "Promotoria de Justiça de Nhamundá",
                        registrationDate: regDate,
                        secrecyLevel: p.secrecyLevel || "Público",
                        legalDeadline: p.legalDeadline ? parseLocalDate(p.legalDeadline) : new Date(new Date().setDate(new Date().getDate() + 30)), // Default 30 days if null
                        cnmpDeadline: calculateCnmpDeadline(regDate),
                        status: 'Em dia',
                        interestedParties: [],
                        isArchived: false
                    };
                });
                
                // Recalculate status for new items immediately
                const calculatedItems = newItems.map(p => ({
                    ...p,
                    status: calculateStatus(p)
                }));

                onImport(calculatedItems);
                setImportText('');
                setIsImportModalOpen(false);
            } else {
                alert("Nenhum processo identificado.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao processar dados.");
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // CRUD Handlers
    const handleSaveProcess = () => {
        if (!editingProcess) return;
        
        // Recalculate Logic on Save
        const updatedProcess = {
            ...editingProcess,
            cnmpDeadline: calculateCnmpDeadline(editingProcess.registrationDate),
            status: calculateStatus(editingProcess)
        };

        if (processes.some(p => p.id === updatedProcess.id)) {
            onUpdate([updatedProcess]);
        } else {
            onImport([updatedProcess]);
        }
        setIsEditModalOpen(false);
        setEditingProcess(null);
    };

    const handleAddNew = () => {
        const newItem: AdministrativeProcess = {
            id: uuidv4(),
            procedureNumber: '',
            proceduralClass: '',
            mainSubject: '',
            currentSector: 'Promotoria de Justiça de Nhamundá',
            registrationDate: new Date(),
            secrecyLevel: 'Público',
            legalDeadline: new Date(new Date().setDate(new Date().getDate() + 30)),
            cnmpDeadline: calculateCnmpDeadline(new Date()),
            status: 'Em dia',
            interestedParties: [],
            isArchived: false
        };
        setEditingProcess(newItem);
        setIsEditModalOpen(true);
    };

    const handleEdit = (p: AdministrativeProcess) => {
        setEditingProcess({ ...p });
        setIsEditModalOpen(true);
    };

    // Party Management
    const addParty = () => {
        if (!newPartyName.trim() || !editingProcess) return;
        const party: InterestedParty = {
            id: uuidv4(),
            name: newPartyName,
            type: newPartyType
        };
        setEditingProcess({
            ...editingProcess,
            interestedParties: [...editingProcess.interestedParties, party]
        });
        setNewPartyName('');
    };

    const removeParty = (partyId: string) => {
        if (!editingProcess) return;
        setEditingProcess({
            ...editingProcess,
            interestedParties: editingProcess.interestedParties.filter(p => p.id !== partyId)
        });
    };

    const handleArchive = (p: AdministrativeProcess) => {
        onUpdate([{ ...p, isArchived: true }]);
    };

    // --- FILTERS ---
    const filteredProcesses = useMemo(() => {
        return processes.filter(p => {
            const matchesView = viewMode === 'active' ? !p.isArchived : p.isArchived;
            if (!matchesView) return false;

            const matchesTerm = !filters.term || 
                p.procedureNumber.toLowerCase().includes(filters.term.toLowerCase()) ||
                p.mainSubject.toLowerCase().includes(filters.term.toLowerCase());

            const matchesStatus = !filters.status || p.status === filters.status;

            return matchesTerm && matchesStatus;
        });
    }, [processes, viewMode, filters]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Em dia': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Atrasado': return 'bg-red-100 text-red-700 border-red-200';
            case 'Prorrogado': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="w-full flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] animate-in fade-in duration-500 relative">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col gap-6 shrink-0 pb-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <FileBox size={28} className="text-blue-600"/> Administrativos (MPV)
                        </h2>
                        <p className="text-slate-500 mt-1 font-medium text-sm md:text-base">
                            Gestão de procedimentos extrajudiciais e administrativos.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                         {/* View Switcher */}
                         <div className="bg-white border border-slate-200 p-1 rounded-lg flex gap-1 shadow-sm mr-4 shrink-0">
                            <button 
                                onClick={() => setViewMode('active')}
                                className={`px-3 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'active' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                Ativos
                            </button>
                            <button 
                                onClick={() => setViewMode('archived')}
                                className={`px-3 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'archived' ? 'bg-slate-100 text-slate-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Archive size={14}/> Arquivo
                            </button>
                        </div>

                        {/* Import Button */}
                        <button 
                            onClick={() => setIsImportModalOpen(true)}
                            className="h-10 px-4 bg-white text-slate-700 font-semibold rounded border border-slate-300 shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                            <Upload size={16}/> Importar
                        </button>

                         <button 
                            onClick={handleAddNew}
                            className="h-10 px-4 bg-blue-700 text-white font-semibold rounded shadow-md hover:bg-blue-800 transition-all flex items-center gap-2"
                        >
                            <Plus size={16}/> Novo
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
                    <Search size={16} className="text-slate-400"/>
                    <input 
                        className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700"
                        placeholder="Buscar por número, assunto..."
                        value={filters.term}
                        onChange={e => setFilters({...filters, term: e.target.value})}
                    />
                    <div className="h-6 w-px bg-slate-200"></div>
                    <select 
                        className="bg-transparent outline-none text-sm font-bold text-slate-600 cursor-pointer"
                        value={filters.status}
                        onChange={e => setFilters({...filters, status: e.target.value})}
                    >
                        <option value="">Status: Todos</option>
                        <option value="Em dia">Em dia</option>
                        <option value="Atrasado">Atrasado</option>
                        <option value="Prorrogado">Prorrogado</option>
                    </select>
                </div>
            </div>

            {/* --- LIST --- */}
            {/* Flex Wrap Container with justify-start to align cards to the left */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-4 flex flex-wrap gap-6 content-start justify-start">
                {filteredProcesses.length === 0 && (
                    <div className="w-full py-12 text-center text-slate-400 flex flex-col items-center">
                        <FileText size={48} className="opacity-20 mb-4"/>
                        <p>Nenhum procedimento encontrado.</p>
                    </div>
                )}
                
                {filteredProcesses.map(p => {
                    const statusClass = getStatusBadge(p.status);
                    
                    return (
                        <div key={p.id} className="w-full sm:w-96 h-[450px] bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col">
                            {/* Card Header */}
                            <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
                                <div className="flex flex-col flex-1 mr-2 overflow-hidden">
                                    <h3 className="font-bold text-slate-800 text-base leading-tight whitespace-nowrap overflow-hidden text-ellipsis" title={p.procedureNumber}>
                                        {p.procedureNumber}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-1">
                                        <MapPin size={12} className="shrink-0 text-slate-400"/>
                                        <span className="truncate">{p.currentSector}</span>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border shrink-0 ${statusClass}`}>
                                    {p.status}
                                </div>
                            </div>

                            {/* Card Body - Scrollable */}
                            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                                
                                {/* 1. Full Width Important Fields (Classe & Assunto) */}
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1 flex items-center gap-1">
                                            <Briefcase size={12}/> Classe Processual
                                        </span>
                                        <span className="font-bold text-slate-800 text-xs block leading-snug break-words border-l-2 border-blue-500 pl-2">
                                            {p.proceduralClass}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1 flex items-center gap-1">
                                            <FileSignature size={12}/> Assunto Principal
                                        </span>
                                        <span className="font-medium text-slate-700 text-xs block leading-snug break-words border-l-2 border-slate-300 pl-2">
                                            {p.mainSubject}
                                        </span>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100"></div>

                                {/* 2. Details Vertical Stack */}
                                <div className="flex flex-col gap-3 text-sm">
                                    
                                    {/* Interessados */}
                                    <div className="col-span-1">
                                        <span className="text-xs text-slate-400 font-bold uppercase block mb-1 flex items-center gap-1">
                                            <Users size={12}/> Pessoas Interessadas
                                        </span>
                                        <div className="space-y-1">
                                            {p.interestedParties.length > 0 ? (
                                                p.interestedParties.map(party => (
                                                    <div key={party.id} className="text-xs text-slate-700 leading-snug break-words">
                                                        <span className="font-bold text-slate-600">{formatPartyType(party.type)}:</span>
                                                        <span className="ml-1">{party.name}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Nenhum interessado cadastrado.</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {p.originNumber && (
                                        <div>
                                            <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Origem</span>
                                            <span className="font-medium text-xs text-slate-700 truncate block" title={p.originNumber}>{p.originNumber}</span>
                                        </div>
                                    )}
                                    
                                    <div>
                                        <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Sigilo</span>
                                        <span className="font-medium text-xs text-slate-700 flex items-center gap-1">
                                            {p.secrecyLevel === 'Sigiloso' && <Eye size={12} className="text-red-500"/>}
                                            {p.secrecyLevel}
                                        </span>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100"></div>

                                {/* 3. Deadlines Row (Vertical in stack for narrow card) */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <div className="bg-slate-50 rounded p-1.5 border border-slate-100 text-center flex-1">
                                            <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Registro</span>
                                            <span className="font-bold text-slate-700 text-xs">
                                                {new Date(p.registrationDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="bg-blue-50 rounded p-1.5 border border-blue-100 text-center flex-1">
                                            <span className="text-[9px] text-blue-500 font-bold uppercase block mb-1">Prazo Legal</span>
                                            <span className="font-bold text-blue-800 text-xs">
                                                {new Date(p.legalDeadline).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded p-1.5 border border-slate-100 text-center w-full">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">CNMP (3 Anos)</span>
                                        <span className="font-bold text-slate-700 text-xs">
                                            {new Date(p.cnmpDeadline).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-3 border-t border-slate-100 flex gap-2 justify-end bg-slate-50/50 rounded-b-xl shrink-0">
                                {viewMode === 'active' ? (
                                    <>
                                        <button onClick={() => handleEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"><Edit size={16}/></button>
                                        <button onClick={() => handleArchive(p)} className="p-2 text-slate-500 hover:bg-slate-100 rounded transition" title="Arquivar"><Archive size={16}/></button>
                                        <button onClick={() => onDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded transition"><Trash2 size={16}/></button>
                                    </>
                                ) : (
                                    <button onClick={() => onDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded transition"><Trash2 size={16}/></button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- IMPORT MODAL --- */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Upload size={20}/> Importar Dados (MPV)
                        </h3>
                        
                        {isProcessing ? (
                            <div className="py-8 flex flex-col items-center justify-center text-blue-600">
                                <div className="animate-spin mb-2"><FileText size={32}/></div>
                                <span className="font-bold">Analisando documento...</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Opção 1: Arquivo PDF</label>
                                    <input 
                                        type="file"
                                        accept=".pdf"
                                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        onChange={handleFileUpload}
                                        ref={fileInputRef}
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                    <span className="text-xs text-slate-400 font-bold uppercase">OU</span>
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Opção 2: Colar Texto (Copia e Cola)</label>
                                    <textarea 
                                        className="w-full h-32 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white text-slate-900"
                                        placeholder="Cole aqui o conteúdo copiado do sistema MPV..."
                                        value={importText}
                                        onChange={e => setImportText(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleTextImport}
                                        className="w-full mt-2 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                                        disabled={!importText.trim()}
                                    >
                                        Processar Texto
                                    </button>
                                </div>
                            </div>
                        )}
                        <button onClick={() => setIsImportModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                </div>
            )}

            {/* --- EDIT MODAL --- */}
            {isEditModalOpen && editingProcess && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-lg">
                                {editingProcess.id ? 'Editar Procedimento' : 'Novo Procedimento'}
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Procedimento</label>
                                    <input 
                                        className="w-full border border-slate-300 rounded p-2 text-sm font-bold bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingProcess.procedureNumber}
                                        onChange={e => setEditingProcess({...editingProcess, procedureNumber: e.target.value})}
                                        placeholder="Ex: Procedimento Preparatório Nº ..."
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Classe (Cód - Nome)</label>
                                    <input 
                                        className="w-full border border-slate-300 rounded p-2 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingProcess.proceduralClass}
                                        onChange={e => setEditingProcess({...editingProcess, proceduralClass: e.target.value})}
                                        placeholder="Ex: 910003 - Procedimento Preparatório"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Assunto Principal (Cód - Nome)</label>
                                    <input 
                                        className="w-full border border-slate-300 rounded p-2 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingProcess.mainSubject}
                                        onChange={e => setEditingProcess({...editingProcess, mainSubject: e.target.value})}
                                        placeholder="Ex: 10388 - DIREITO ADMINISTRATIVO..."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Número de Origem</label>
                                    <input 
                                        className="w-full border border-slate-300 rounded p-2 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingProcess.originNumber || ''}
                                        onChange={e => setEditingProcess({...editingProcess, originNumber: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Sigilo</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded p-2 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingProcess.secrecyLevel}
                                        onChange={e => setEditingProcess({...editingProcess, secrecyLevel: e.target.value})}
                                    >
                                        <option value="Público">Público</option>
                                        <option value="Sigiloso">Sigiloso</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Setor Atual</label>
                                    <input 
                                        className="w-full border border-slate-300 rounded p-2 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingProcess.currentSector}
                                        onChange={e => setEditingProcess({...editingProcess, currentSector: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-slate-100"></div>

                            {/* Deadlines */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data Registro</label>
                                    <input 
                                        type="date"
                                        className="w-full border border-slate-300 rounded p-2 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formatDateForInput(editingProcess.registrationDate)}
                                        onChange={e => setEditingProcess({...editingProcess, registrationDate: parseLocalDate(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-blue-600 uppercase block mb-1">Prazo Legal</label>
                                    <input 
                                        type="date"
                                        className="w-full border border-blue-300 rounded p-2 text-sm font-bold text-blue-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formatDateForInput(editingProcess.legalDeadline)}
                                        onChange={e => setEditingProcess({...editingProcess, legalDeadline: parseLocalDate(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Status Manual</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded p-2 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingProcess.status}
                                        onChange={e => setEditingProcess({...editingProcess, status: e.target.value as any})}
                                    >
                                        <option value="Em dia">Em dia</option>
                                        <option value="Atrasado">Atrasado</option>
                                        <option value="Prorrogado">Prorrogado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100"></div>

                            {/* Interested Parties */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Pessoas Interessadas</label>
                                
                                <div className="flex gap-2 mb-3">
                                    <input 
                                        className="flex-1 border border-slate-300 rounded p-2 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Nome da Pessoa..."
                                        value={newPartyName}
                                        onChange={e => setNewPartyName(e.target.value)}
                                    />
                                    <select 
                                        className="border border-slate-300 rounded p-2 text-sm max-w-[150px] bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newPartyType}
                                        onChange={e => setNewPartyType(e.target.value as AdminPartyType)}
                                    >
                                        <option value="Advogado">Advogado</option>
                                        <option value="Investigado (Pólo Passivo)">Investigado</option>
                                        <option value="Noticiado (Pólo Passivo)">Noticiado</option>
                                        <option value="Noticiante (Pólo Ativo)">Noticiante</option>
                                        <option value="Interessado (Pólo Ativo)">Interessado (A)</option>
                                        <option value="Interessado (Pólo Passivo)">Interessado (P)</option>
                                    </select>
                                    <button onClick={addParty} className="bg-slate-200 hover:bg-slate-300 p-2 rounded text-slate-700 font-bold"><Plus size={18}/></button>
                                </div>

                                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded border border-slate-100 min-h-[50px]">
                                    {editingProcess.interestedParties.map(party => (
                                        <div key={party.id} className="bg-white border border-slate-200 rounded px-2 py-1 text-xs flex items-center gap-2 shadow-sm">
                                            <div>
                                                <span className="font-bold text-slate-700 block">{party.name}</span>
                                                <span className="text-[9px] text-slate-400 uppercase">{party.type}</span>
                                            </div>
                                            <button onClick={() => removeParty(party.id)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                        </div>
                                    ))}
                                    {editingProcess.interestedParties.length === 0 && <span className="text-xs text-slate-400 italic p-1">Nenhuma pessoa adicionada.</span>}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 rounded-b-xl">
                             <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded">Cancelar</button>
                             <button onClick={handleSaveProcess} className="px-6 py-2 bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 rounded shadow-sm">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Administrative;