import React, { useState, useRef, useMemo } from 'react';
import { Deadline, ManifestationPurpose, AdvisorStatus, PromoterDecision, SystemType } from '../types';
import { extractDeadlinesFromHtml, extractDeadlinesFromPdf } from '../services/geminiService';
import { Upload, Search, Archive, Trash2, Edit, Save, X, Calendar, Undo2, Lock, MessageCircle, Copy, Check, AlertCircle, Filter, RefreshCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface DeadlinesProps {
  deadlines: Deadline[];
  activeDeadlines: Deadline[];
  onImport: (newDeadlines: Deadline[], metadata?: any) => void;
  onUpdate: (updatedDeadlines: Deadline[]) => void;
  onDelete: (id: string) => void;
  expectedCounts: Record<string, number>;
  isArchiveView: boolean;
}

const MANIFESTATION_OPTIONS: ManifestationPurpose[] = [
    'Manifestação',
    'Ciência',
    'Alegacões Finais',
    'Oitiva',
    'Parecer',
    'Pendências de Incidentes',
    'Razões/Contrarrazões',
    'Análise de Juntadas',
    'Promoção',
    'Denúncia',
    'Outros'
];

const ADVISOR_STATUS_OPTIONS: AdvisorStatus[] = [
    'Pendente',
    'Analisando',
    'Sem Minuta',
    'Minutado',
    'Minuta Refeita'
];

const Deadlines: React.FC<DeadlinesProps> = ({ deadlines, activeDeadlines, onImport, onUpdate, onDelete }) => {
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
    
    // Advanced Filters State
    const [filters, setFilters] = useState({ 
        term: '', // Processo ou Assunto
        system: '',
        purpose: '',
        advisor: '',
        promoter: '',
        endDate: '' 
    });
    
    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importState, setImportState] = useState<{status: 'idle' | 'processing', message: string}>({status: 'idle', message: ''});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pastedHtml, setPastedHtml] = useState('');

    // Edit State
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<Deadline | null>(null);

    // Guidance Modal State
    const [guidanceModalOpen, setGuidanceModalOpen] = useState(false);
    const [selectedDeadlineId, setSelectedDeadlineId] = useState<string | null>(null);
    const [guidanceText, setGuidanceText] = useState('');

    // Copy Feedback State
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Filter Logic
    const filteredDeadlines = useMemo(() => {
        const viewFiltered = deadlines.filter(d => viewMode === 'active' ? !d.isArchived : d.isArchived);
        return viewFiltered.filter(d => {
            // Text Search (Process or Subject)
            if (filters.term && 
                !d.processNumber.toLowerCase().includes(filters.term.toLowerCase()) && 
                !d.mainSubject?.toLowerCase().includes(filters.term.toLowerCase())) {
                return false;
            }
            
            // System Filter
            if (filters.system && d.system !== filters.system) return false;

            // Purpose Filter (Finalidade)
            if (filters.purpose && d.manifestationPurpose !== filters.purpose) return false;

            // Advisor Filter
            if (filters.advisor && (d.advisorStatus || 'Pendente') !== filters.advisor) return false;

            // Promoter Filter
            if (filters.promoter && (d.promoterDecision || 'Pendente') !== filters.promoter) return false;

            // End Date Filter
            if (filters.endDate) {
                const filterDate = new Date(filters.endDate).toISOString().split('T')[0];
                const deadlineDate = new Date(d.endDate).toISOString().split('T')[0];
                if (filterDate !== deadlineDate) return false;
            }

            return true;
        });
    }, [deadlines, viewMode, filters]);

    // Handlers
    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportState({ status: 'processing', message: 'Analisando arquivo...' });
        
        try {
            // Robust check for PDF: MIME type OR extension
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            
            const result = isPdf 
                ? await extractDeadlinesFromPdf(file) 
                : await extractDeadlinesFromHtml(await file.text());
                
            processImportResult(result);
        } catch (error: any) { 
            console.error("Erro na importação:", error);
            // Show the actual error message to help debugging on Netlify
            alert(`Erro ao processar: ${error.message || 'Falha desconhecida na API'}`); 
            setImportState({ status: 'idle', message: '' }); 
        }
    };

    const handleImportPaste = async () => {
        if (!pastedHtml) return;
        setImportState({ status: 'processing', message: 'Processando texto...' });
        try {
            const result = await extractDeadlinesFromHtml(pastedHtml);
            processImportResult(result);
        } catch (error: any) { 
            console.error("Erro no paste:", error);
            alert(`Erro ao processar texto: ${error.message}`); 
            setImportState({ status: 'idle', message: '' }); 
        }
    };

    const processImportResult = (result: any) => {
        if (result.deadlines?.length) {
            const newD = result.deadlines.map((d: any) => ({
                id: uuidv4(), ...d, status: 'Pendente', isArchived: false,
                advisorStatus: 'Pendente', promoterDecision: 'Pendente',
                startDate: d.startDate ? new Date(d.startDate) : new Date(),
                endDate: d.endDate ? new Date(d.endDate) : new Date()
            }));
            onImport(newD, result.groupMetadata ? { purpose: result.groupMetadata.detectedPurpose, total: result.groupMetadata.totalRecordsInDocument } : undefined);
            setIsImportModalOpen(false);
            setImportState({ status: 'idle', message: '' });
        } else {
             setImportState({ status: 'idle', message: '' });
             alert("Nenhum processo foi identificado no arquivo. Verifique se é uma exportação válida do PROJUDI/SEEU.");
        }
    };

    // Copy to Clipboard
    const handleCopyProcess = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Quick Status Update (Directly on table)
    const handleStatusUpdate = (id: string, field: keyof Deadline, value: string) => {
        const deadline = deadlines.find(d => d.id === id);
        if (deadline) {
            onUpdate([{ ...deadline, [field]: value }]);
        }
    };

    // Guidance Handlers
    const openGuidance = (deadline: Deadline) => {
        setSelectedDeadlineId(deadline.id);
        setGuidanceText(deadline.instruction || '');
        setGuidanceModalOpen(true);
    };

    const saveGuidance = () => {
        if (selectedDeadlineId) {
            const deadline = deadlines.find(d => d.id === selectedDeadlineId);
            if (deadline) {
                onUpdate([{ ...deadline, instruction: guidanceText }]);
            }
        }
        setGuidanceModalOpen(false);
        setGuidanceText('');
        setSelectedDeadlineId(null);
    };

    // Edit Handlers
    const formatDateForInput = (date: Date) => date instanceof Date && !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : '';
    const handleEditClick = (d: Deadline) => { setEditingRowId(d.id); setEditFormData({ ...d }); };
    const handleSaveEdit = () => { if (editFormData) { onUpdate([editFormData]); setEditingRowId(null); } };
    const handleDeleteInEdit = () => { if (editFormData && confirm("Tem certeza que deseja excluir?")) { onDelete(editFormData.id); setEditingRowId(null); } };
    const handleChange = (f: keyof Deadline, v: any) => editFormData && setEditFormData({ ...editFormData, [f]: v });

    // Date Format Helper (DD/MM/AA)
    const formatDateDDMMAA = (date: Date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) return '--/--/--';
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    // Reset Filters
    const clearFilters = () => setFilters({ term: '', system: '', purpose: '', advisor: '', promoter: '', endDate: '' });

    // Helper for Status Colors
    const getSystemColor = (sys: string) => {
        switch(sys) {
            case 'PROJUDI': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'SEEU': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'MPV': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const getAdvisorColor = (status?: string) => {
        switch(status) {
            case 'Minutado':
            case 'Minuta Refeita': return 'bg-green-100 text-green-800';
            case 'Sem Minuta': return 'bg-red-100 text-red-800';
            case 'Analisando': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-slate-100 text-slate-600'; // Pendente
        }
    };

    const getPromoterColor = (status?: string) => {
        if (status === 'Assinado') return 'bg-green-100 text-green-800';
        if (status === 'Devolvido') return 'bg-red-100 text-red-800';
        if (status === 'Protocolo de recursos') return 'bg-indigo-100 text-indigo-800';
        return 'bg-slate-100 text-slate-600';
    };

    return (
        <div className="w-full flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] p-4 md:p-6 animate-in fade-in">
             
            {/* Header / Controls */}
            <div className="flex flex-col gap-6 mb-6 shrink-0">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Prazos Judiciais</h2>
                    </div>
                    <div className="flex gap-3">
                         <div className="bg-[#E5E5EA] p-0.5 rounded-lg flex shadow-sm">
                            <button onClick={() => setViewMode('active')} className={`px-4 py-1.5 rounded-[7px] text-xs font-semibold transition-all ${viewMode === 'active' ? 'bg-white text-black shadow-sm' : 'text-[#8E8E93]'}`}>Ativos</button>
                            <button onClick={() => setViewMode('archived')} className={`px-4 py-1.5 rounded-[7px] text-xs font-semibold transition-all ${viewMode === 'archived' ? 'bg-white text-black shadow-sm' : 'text-[#8E8E93]'}`}>Arquivo</button>
                        </div>
                        <button onClick={() => setIsImportModalOpen(true)} className="bg-[#007AFF] hover:bg-[#0071E3] text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-2">
                            <Upload size={16}/> Importar
                        </button>
                    </div>
                </div>

                {/* Advanced Filters */}
                <div className="bg-white p-3 rounded-xl border border-black/5 shadow-sm flex flex-col md:flex-row gap-3">
                    {/* Search Term */}
                    <div className="flex items-center gap-2 bg-[#F5F5F7] px-3 py-2 rounded-lg flex-1">
                        <Search size={16} className="text-[#8E8E93]"/>
                        <input 
                            className="bg-transparent outline-none text-sm text-[#1D1D1F] placeholder-[#8E8E93] w-full"
                            placeholder="Buscar por número ou assunto..."
                            value={filters.term}
                            onChange={e => setFilters({...filters, term: e.target.value})}
                        />
                    </div>
                    
                    {/* Filter Dropdowns */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <select 
                            className="bg-[#F5F5F7] text-sm text-[#1D1D1F] px-3 py-2 rounded-lg outline-none cursor-pointer border-r-[8px] border-transparent"
                            value={filters.system}
                            onChange={e => setFilters({...filters, system: e.target.value})}
                        >
                            <option value="">Sistema: Todos</option>
                            <option value="PROJUDI">PROJUDI</option>
                            <option value="SEEU">SEEU</option>
                            <option value="MPV">MPV</option>
                        </select>

                        <select 
                            className="bg-[#F5F5F7] text-sm text-[#1D1D1F] px-3 py-2 rounded-lg outline-none cursor-pointer border-r-[8px] border-transparent"
                            value={filters.purpose}
                            onChange={e => setFilters({...filters, purpose: e.target.value})}
                        >
                            <option value="">Finalidade: Todas</option>
                            {MANIFESTATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>

                         <select 
                            className="bg-[#F5F5F7] text-sm text-[#1D1D1F] px-3 py-2 rounded-lg outline-none cursor-pointer border-r-[8px] border-transparent"
                            value={filters.advisor}
                            onChange={e => setFilters({...filters, advisor: e.target.value})}
                        >
                            <option value="">Assessoria: Todos</option>
                            {ADVISOR_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        
                        <input 
                            type="date"
                            className="bg-[#F5F5F7] text-sm text-[#1D1D1F] px-3 py-2 rounded-lg outline-none cursor-pointer"
                            value={filters.endDate}
                            onChange={e => setFilters({...filters, endDate: e.target.value})}
                            title="Filtrar por Data Final"
                        />
                    </div>

                    {(filters.term || filters.system || filters.purpose || filters.advisor || filters.promoter || filters.endDate) && (
                        <button onClick={clearFilters} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Limpar Filtros">
                            <RefreshCw size={18}/>
                        </button>
                    )}
                </div>
            </div>

            {/* Table Spreadsheet View */}
            <div className="flex-1 bg-white rounded-xl border border-[#E5E5EA] shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="overflow-auto flex-1 w-full">
                    <table className="w-full text-left border-collapse min-w-[1300px]">
                        <thead className="bg-[#F9F9F9] sticky top-0 z-10 border-b border-[#E5E5EA]">
                            <tr>
                                <th className="p-4 text-sm font-bold text-[#86868B] uppercase tracking-wider w-[220px]">Processo</th>
                                <th className="p-4 text-sm font-bold text-[#86868B] uppercase tracking-wider w-[100px]">Sistema</th>
                                <th className="p-4 text-sm font-bold text-[#86868B] uppercase tracking-wider w-[240px]">Classe / Assunto</th>
                                <th className="p-4 text-sm font-bold text-[#86868B] uppercase tracking-wider w-[120px]">Parte</th>
                                <th className="p-4 text-sm font-bold text-[#86868B] uppercase tracking-wider w-[150px]">Finalidade</th>
                                <th className="p-4 text-sm font-bold text-[#86868B] uppercase tracking-wider w-[140px]">Assessoria</th>
                                <th className="p-4 text-sm font-bold text-[#86868B] uppercase tracking-wider w-[140px]">Promotora</th>
                                <th className="p-4 text-sm font-bold text-[#86868B] uppercase tracking-wider w-[110px]">Início</th>
                                <th className="p-4 text-sm font-bold text-[#86868B] uppercase tracking-wider w-[110px]">Final</th>
                                <th className="p-4 text-sm font-bold text-[#86868B] uppercase tracking-wider text-right w-[120px]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F5F5F7]">
                            {filteredDeadlines.map(d => {
                                const isEditing = editingRowId === d.id;
                                const isCopied = copiedId === d.id;
                                
                                // Archive Logic: Not allowed if Pending or Returned (Devolvido)
                                const canArchive = d.promoterDecision && d.promoterDecision !== 'Pendente' && d.promoterDecision !== 'Devolvido';

                                return (
                                    <tr key={d.id} className="hover:bg-[#F5F5F7]/60 group transition-colors text-base">
                                        
                                        {/* Processo (Copyable) - Icon on Right, Text Left */}
                                        <td className="p-4 align-top">
                                            {isEditing ? (
                                                <input 
                                                    className="w-full border border-gray-300 rounded p-1.5 text-base bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                                                    value={editFormData!.processNumber} 
                                                    onChange={e => handleChange('processNumber', e.target.value)}
                                                />
                                            ) : (
                                                <div 
                                                    className="flex justify-between items-center group/copy cursor-pointer" 
                                                    onClick={() => handleCopyProcess(d.id, d.processNumber)}
                                                    title="Clique para copiar número"
                                                >
                                                    <span className="font-medium text-[#1D1D1F] truncate group-hover/copy:text-blue-600 transition-colors">{d.processNumber}</span>
                                                    <div className="text-[#007AFF] p-1 rounded transition-all">
                                                        {isCopied ? <Check size={16} className="text-green-500"/> : <Copy size={16} className="opacity-0 group-hover/copy:opacity-100 text-slate-400"/>}
                                                    </div>
                                                </div>
                                            )}
                                        </td>

                                        {/* Sistema */}
                                        <td className="p-4 align-top">
                                            {isEditing ? (
                                                 <select 
                                                    className="w-full border border-gray-300 rounded p-1.5 text-base bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={editFormData!.system} 
                                                    onChange={e => handleChange('system', e.target.value)}
                                                >
                                                    <option value="PROJUDI">PROJUDI</option>
                                                    <option value="SEEU">SEEU</option>
                                                    <option value="MPV">MPV</option>
                                                    <option value="SEI">SEI</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold border uppercase ${getSystemColor(d.system)}`}>
                                                    {d.system}
                                                </span>
                                            )}
                                        </td>

                                        {/* Classe / Assunto */}
                                        <td className="p-4 align-top">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <input 
                                                        className="w-full border border-gray-300 rounded p-1.5 text-base bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Classe"
                                                        value={editFormData!.proceduralClass} 
                                                        onChange={e => handleChange('proceduralClass', e.target.value)}
                                                    />
                                                    <input 
                                                        className="w-full border border-gray-300 rounded p-1.5 text-base bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Assunto"
                                                        value={editFormData!.mainSubject} 
                                                        onChange={e => handleChange('mainSubject', e.target.value)}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1 max-w-[240px]">
                                                    <span className="font-semibold text-[#1D1D1F] leading-snug" title={d.proceduralClass}>{d.proceduralClass}</span>
                                                    <span className="text-slate-500 text-sm leading-snug" title={d.mainSubject}>{d.mainSubject}</span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Parte */}
                                        <td className="p-4 align-top">
                                            {isEditing ? (
                                                <select 
                                                    className="w-full border border-gray-300 rounded p-1.5 text-base bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={editFormData!.defendantStatus} 
                                                    onChange={e => handleChange('defendantStatus', e.target.value)}
                                                >
                                                    <option value="Réu Preso">Réu Preso</option>
                                                    <option value="Em Liberdade">Em Liberdade</option>
                                                    <option value="Não Informado">Não Inf.</option>
                                                </select>
                                            ) : (
                                                d.defendantStatus === 'Réu Preso' ? (
                                                    <span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100 text-sm">
                                                        <Lock size={12} /> Réu Preso
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 text-sm">Liberdade</span>
                                                )
                                            )}
                                        </td>

                                        {/* Finalidade (Editável e Sem Borda) */}
                                        <td className="p-4 align-top">
                                            <div className="relative">
                                                {isEditing ? (
                                                     <select
                                                        className="w-full border border-gray-300 rounded p-1.5 text-base bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={editFormData!.manifestationPurpose}
                                                        onChange={e => handleChange('manifestationPurpose', e.target.value)}
                                                    >
                                                        {MANIFESTATION_OPTIONS.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <select 
                                                        className="appearance-none w-full bg-transparent text-slate-700 font-medium cursor-pointer outline-none border-none p-0 m-0"
                                                        value={d.manifestationPurpose}
                                                        onChange={(e) => handleStatusUpdate(d.id, 'manifestationPurpose', e.target.value)}
                                                        title="Alterar Finalidade"
                                                    >
                                                        {MANIFESTATION_OPTIONS.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </td>

                                        {/* Status Assessoria (Editável ao Clicar) */}
                                        <td className="p-4 align-top">
                                            <div className="relative">
                                                <select 
                                                    className={`appearance-none w-full text-center px-2 py-1 rounded text-xs font-bold cursor-pointer outline-none transition-all ${getAdvisorColor(d.advisorStatus)}`}
                                                    value={d.advisorStatus || 'Pendente'}
                                                    onChange={(e) => handleStatusUpdate(d.id, 'advisorStatus', e.target.value)}
                                                    disabled={isEditing}
                                                >
                                                    {ADVISOR_STATUS_OPTIONS.map(status => (
                                                        <option key={status} value={status}>{status}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </td>

                                        {/* Status Promotoria (Editável ao Clicar) */}
                                        <td className="p-4 align-top">
                                            <div className="relative">
                                                <select 
                                                    className={`appearance-none w-full text-center px-2 py-1 rounded text-xs font-bold cursor-pointer outline-none transition-all ${getPromoterColor(d.promoterDecision)}`}
                                                    value={d.promoterDecision || 'Pendente'}
                                                    onChange={(e) => handleStatusUpdate(d.id, 'promoterDecision', e.target.value)}
                                                    disabled={isEditing}
                                                >
                                                    <option value="Pendente">Pendente</option>
                                                    <option value="Assinado">Assinado</option>
                                                    <option value="Devolvido">Devolvido</option>
                                                    <option value="Protocolo de recursos">Protocolado</option>
                                                </select>
                                            </div>
                                        </td>

                                        {/* Início */}
                                        <td className="p-4 align-top text-slate-600 font-medium">
                                            {isEditing ? (
                                                <input 
                                                    type="date"
                                                    className="w-full border border-gray-300 rounded p-1.5 text-base bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                                                    value={formatDateForInput(editFormData!.startDate)} 
                                                    onChange={e => handleChange('startDate', new Date(e.target.value))}
                                                />
                                            ) : (
                                                formatDateDDMMAA(d.startDate)
                                            )}
                                        </td>

                                        {/* Prazo Final */}
                                        <td className="p-4 align-top font-bold">
                                            {isEditing ? (
                                                <input 
                                                    type="date"
                                                    className="w-full border border-gray-300 rounded p-1.5 text-base bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                                                    value={formatDateForInput(editFormData!.endDate)} 
                                                    onChange={e => handleChange('endDate', new Date(e.target.value))}
                                                />
                                            ) : (
                                                <span className={`${new Date(d.endDate) < new Date() ? 'text-[#FF3B30]' : 'text-[#1D1D1F]'}`}>
                                                    {formatDateDDMMAA(d.endDate)}
                                                </span>
                                            )}
                                        </td>

                                        {/* Ações */}
                                        <td className="p-4 align-top text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                {isEditing ? (
                                                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                                                        <button onClick={handleSaveEdit} className="p-2 text-white bg-green-500 hover:bg-green-600 rounded transition shadow-sm"><Save size={18}/></button>
                                                        <button onClick={handleDeleteInEdit} className="p-2 text-white bg-red-500 hover:bg-red-600 rounded transition shadow-sm mx-1"><Trash2 size={18}/></button>
                                                        <button onClick={() => setEditingRowId(null)} className="p-2 text-slate-500 hover:bg-slate-200 rounded transition"><X size={18}/></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={() => openGuidance(d)} 
                                                            className={`p-2 rounded transition ${d.instruction ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`} 
                                                            title="Orientação da Promotoria"
                                                        >
                                                            <MessageCircle size={20} fill={d.instruction ? "currentColor" : "none"} />
                                                        </button>
                                                        <button onClick={() => handleEditClick(d)} className="p-2 text-[#007AFF] hover:bg-[#007AFF]/10 rounded transition" title="Editar"><Edit size={20}/></button>
                                                        
                                                        {viewMode === 'active' ? (
                                                            <button 
                                                                onClick={() => { if(canArchive) onUpdate([{...d, isArchived: true}]); }} 
                                                                className={`p-2 rounded transition ${canArchive ? 'text-[#8E8E93] hover:bg-black/5 cursor-pointer' : 'text-slate-200 cursor-not-allowed'}`} 
                                                                title={canArchive ? "Arquivar" : "Aguardando decisão válida da Promotora"}
                                                                disabled={!canArchive}
                                                            >
                                                                <Archive size={20}/>
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => { onUpdate([{...d, isArchived: false}]); }}
                                                                className="p-2 text-[#8E8E93] hover:bg-black/5 rounded transition"
                                                                title="Desarquivar"
                                                            >
                                                                <Undo2 size={20}/>
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>

                                    </tr>
                                );
                            })}
                            {filteredDeadlines.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-[#86868B]">
                                        Nenhum processo encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Guidance Modal */}
            {guidanceModalOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-white/20">
                        <div className="flex items-center gap-2 mb-4 text-amber-600 font-bold text-lg">
                            <AlertCircle size={24} />
                            <h3>Orientação da Promotoria</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">Instruções para o Assessor sobre este caso:</p>
                        <textarea 
                            className="w-full h-32 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none bg-amber-50/30 text-slate-800"
                            placeholder="Ex: Priorizar tese de legítima defesa; Verificar antecedentes..."
                            value={guidanceText}
                            onChange={(e) => setGuidanceText(e.target.value)}
                        />
                        <div className="flex gap-2 mt-4 justify-end">
                            <button onClick={() => setGuidanceModalOpen(false)} className="px-4 py-2 text-slate-600 text-sm font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button onClick={saveGuidance} className="px-4 py-2 bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 rounded-lg shadow-sm">Salvar Orientação</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] shadow-2xl p-8 w-full max-w-lg border border-white/20">
                        <h3 className="text-2xl font-bold text-[#1D1D1F] mb-6">Importar Prazos</h3>
                        {importState.status === 'processing' ? (
                            <div className="text-center py-8 text-[#007AFF] font-medium text-lg">Processando...</div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-5 bg-[#F2F2F7] rounded-xl text-base text-[#1D1D1F]">
                                    <p className="mb-2 font-semibold">Arraste um PDF ou cole o HTML.</p>
                                    <input type="file" ref={fileInputRef} onChange={handleImportFile} className="block w-full text-sm text-[#8E8E93] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#007AFF] file:text-white hover:file:bg-[#0071E3]"/>
                                </div>
                                <div className="text-center text-xs text-[#8E8E93] font-bold uppercase">Ou</div>
                                <textarea className="w-full bg-[#F2F2F7] rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#007AFF]" rows={4} placeholder="Cole o HTML aqui..." value={pastedHtml} onChange={e => setPastedHtml(e.target.value)}></textarea>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-3 text-[#1D1D1F] font-semibold bg-[#F2F2F7] rounded-xl hover:bg-[#E5E5EA]">Cancelar</button>
                                    <button onClick={handleImportPaste} className="flex-1 py-3 text-white font-semibold bg-[#007AFF] rounded-xl hover:bg-[#0071E3] shadow-lg shadow-blue-500/30">Importar</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Deadlines;