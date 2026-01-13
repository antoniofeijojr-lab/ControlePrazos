
import React, { useState, useMemo } from 'react';
import { Deadline, AdvisorStatus, PromoterDecision, SystemType, Priority } from '../types';
import { extractDeadlinesFromHtml, extractDeadlinesFromPdf } from '../services/geminiService';
import { Upload, Search, Trash2, Edit, X, MessageCircle, Copy, Check, RefreshCw, Calendar, Save, Plus, FileText, Lock, Accessibility } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Define the available statuses for advisors and promoter decisions
const advisorStatuses: AdvisorStatus[] = ['Pendente', 'Analisando', 'Sem Minuta', 'Minutado', 'Minuta Refeita'];
const promoterDecisions: PromoterDecision[] = ['Pendente', 'Assinado', 'Assinatura em Lote', 'Assinatura com Alterações', 'Minuta Substituída', 'Protocolo de recursos', 'Devolvido'];

interface DeadlinesProps {
  deadlines: Deadline[];
  activeDeadlines: Deadline[];
  onImport: (newDeadlines: Deadline[], metadata?: any) => void;
  onUpdate: (updatedDeadlines: Deadline[]) => void;
  onDelete: (id: string) => void;
}

const Deadlines: React.FC<DeadlinesProps> = ({ deadlines, onImport, onUpdate, onDelete }) => {
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
    const [filters, setFilters] = useState({ term: '', system: '', purpose: '', advisor: '', endDate: '' });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
    const [importState, setImportState] = useState<{status: 'idle' | 'processing', message: string}>({status: 'idle', message: ''});
    
    const [isGuidanceModalOpen, setIsGuidanceModalOpen] = useState(false);
    const [selectedDeadlineId, setSelectedDeadlineId] = useState<string | null>(null);
    const [guidanceText, setGuidanceText] = useState('');

    const [activeRowId, setActiveRowId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Helper para evitar RangeError: Invalid time value
    const safeFormatDate = (date: any) => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '--/--/----';
        return d.toLocaleDateString();
    };

    const parseInputDate = (d: any) => {
        const date = new Date(d);
        return isNaN(date.getTime()) ? new Date() : date;
    };

    const filteredDeadlines = useMemo(() => {
        return deadlines.filter(d => (viewMode === 'active' ? !d.isArchived : d.isArchived))
            .filter(d => {
                const termLower = filters.term.toLowerCase();
                if (filters.term && 
                    !d.processNumber.toLowerCase().includes(termLower) && 
                    !d.mainSubject?.toLowerCase().includes(termLower) &&
                    !d.proceduralClass?.toLowerCase().includes(termLower)
                ) return false;
                if (filters.system && d.system !== filters.system) return false;
                return true;
            });
    }, [deadlines, viewMode, filters]);

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportState({ status: 'processing', message: 'Analisando documento...' });
        try {
            const isPdf = file.name.toLowerCase().endsWith('.pdf');
            const result = isPdf ? await extractDeadlinesFromPdf(file) : await extractDeadlinesFromHtml(await file.text());
            if (result.deadlines?.length) {
                const newD = result.deadlines.map((d: any) => ({
                    id: uuidv4(), ...d, isArchived: false,
                    advisorStatus: 'Pendente', promoterDecision: 'Pendente',
                    startDate: parseInputDate(d.startDate),
                    endDate: parseInputDate(d.endDate)
                }));
                onImport(newD, result.groupMetadata);
                setIsImportModalOpen(false);
            } else alert("O Sistema não conseguiu identificar processos neste arquivo.");
        } catch (error: any) { alert(`Erro no processamento do Sistema: ${error.message}`); }
        finally { setImportState({ status: 'idle', message: '' }); }
    };

    const handleNewManual = () => {
        const newDeadline: Deadline = {
            id: uuidv4(),
            processNumber: '',
            system: SystemType.PROJUDI,
            proceduralClass: '',
            mainSubject: '',
            manifestationPurpose: 'Manifestação',
            defendantStatus: 'Não Informado',
            prosecutorOffice: 'Promotoria de Justiça de Nhamundá',
            deadlineDuration: '',
            startDate: new Date(),
            endDate: new Date(new Date().getTime() + 5*24*60*60*1000),
            priority: Priority.MEDIUM,
            status: 'Pendente',
            isArchived: false
        };
        setEditingDeadline(newDeadline);
        setIsEditModalOpen(true);
    };

    const handleStatusUpdate = (id: string, field: 'advisorStatus' | 'promoterDecision', value: string) => {
        const item = deadlines.find(d => d.id === id);
        if (item) onUpdate([{ ...item, [field]: value as any }]);
    };

    const handleEdit = (deadline: Deadline) => {
        setEditingDeadline({ ...deadline });
        setIsEditModalOpen(true);
    };

    const saveEdit = () => {
        if (editingDeadline) {
            onUpdate([editingDeadline]);
            setIsEditModalOpen(false);
            setEditingDeadline(null);
        }
    };

    const handleDeleteFromModal = () => {
        if (editingDeadline) {
            if (confirm('Deseja excluir este prazo permanentemente da lista?')) {
                onDelete(editingDeadline.id);
                setIsEditModalOpen(false);
                setEditingDeadline(null);
            }
        }
    };

    const openGuidance = (deadline: Deadline) => {
        setSelectedDeadlineId(deadline.id);
        setGuidanceText(deadline.instruction || '');
        setIsGuidanceModalOpen(true);
    };

    const saveGuidance = () => {
        if (selectedDeadlineId) {
            const deadline = deadlines.find(d => d.id === selectedDeadlineId);
            if (deadline) onUpdate([{ ...deadline, instruction: guidanceText }]);
        }
        setIsGuidanceModalOpen(false);
        setGuidanceText('');
        setSelectedDeadlineId(null);
    };

    const handleCopyProcess = (e: React.MouseEvent, id: string, text: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getSystemBadge = (sys: string) => {
        switch(sys) {
            case 'PROJUDI': return 'bg-blue-100 text-blue-900 border-blue-200';
            case 'SEEU': return 'bg-purple-100 text-purple-900 border-purple-200';
            case 'MPV': return 'bg-emerald-100 text-emerald-900 border-emerald-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const getStatusColor = (status?: string) => {
        if (status === 'Minutado' || status === 'Assinado' || status === 'Protocolo de recursos') return 'bg-emerald-100 text-emerald-900 border-emerald-200';
        if (status === 'Analisando' || status === 'Em Análise') return 'bg-blue-100 text-blue-900 border-blue-200';
        if (status === 'Devolvido' || status === 'Sem Minuta' || status === 'Minuta Substituída') return 'bg-amber-100 text-amber-900 border-amber-200';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    return (
        <div className="w-full flex flex-col h-full p-6 bg-slate-50 animate-in fade-in overflow-hidden">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Prazos Judiciais</h2>
                    <p className="text-slate-500 font-medium text-sm">Controle rigoroso da Promotoria de Nhamundá</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-slate-200 p-1 rounded-lg flex shadow-inner">
                        <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all uppercase tracking-tighter ${viewMode === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Ativos</button>
                        <button onClick={() => setViewMode('archived')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all uppercase tracking-tighter ${viewMode === 'archived' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Arquivo</button>
                    </div>
                    <button onClick={handleNewManual} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 px-5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2">
                        <Plus size={16}/> NOVO PRAZO
                    </button>
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-lg transition-all flex items-center gap-2">
                        <Upload size={16}/> IMPORTAR IA
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4">
                    <div className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg flex items-center gap-2 max-w-md">
                        <Search size={16} className="text-slate-400"/>
                        <input className="bg-transparent outline-none text-sm w-full font-medium" placeholder="Buscar processo ou assunto..." value={filters.term} onChange={e => setFilters({...filters, term: e.target.value})}/>
                    </div>
                </div>
                
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[1400px]">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <th className="p-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-[220px]">Processo</th>
                                <th className="p-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-[90px]">Sistema</th>
                                <th className="p-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest min-w-[200px]">Classe / Assunto</th>
                                <th className="p-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-[150px]">Finalidade</th>
                                <th className="p-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-[160px]">Assessoria</th>
                                <th className="p-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-[160px]">Promotora</th>
                                <th className="p-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center w-[110px]">Início</th>
                                <th className="p-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center w-[110px]">Vencimento</th>
                                <th className="p-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right w-[100px]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredDeadlines.map(d => {
                                const isUrgent = d.priority === 'Urgente' || d.defendantStatus === 'Réu Preso';
                                const isSelected = activeRowId === d.id;
                                return (
                                    <tr 
                                        key={d.id} 
                                        onClick={() => setActiveRowId(d.id)}
                                        className={`transition-colors group cursor-pointer ${isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50/50'}`}
                                    >
                                        <td className="p-4 font-mono text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className={`inline-flex items-center gap-2 cursor-pointer transition-all duration-200 ${copiedId === d.id ? 'text-emerald-600 font-bold' : isUrgent ? 'text-red-600 font-bold' : 'text-slate-900'}`}
                                                    onClick={(e) => handleCopyProcess(e, d.id, d.processNumber)}
                                                >
                                                    <span className="truncate">{d.processNumber || 'Sem número'}</span>
                                                    {copiedId === d.id ? <Check size={14} className="text-emerald-500 animate-in zoom-in" /> : <Copy size={12} className="opacity-0 group-hover:opacity-30" />}
                                                </div>
                                                {d.defendantStatus === 'Réu Preso' ? (
                                                    <div className="bg-red-100 text-red-700 p-1 rounded-full flex items-center justify-center shrink-0" title="Réu Preso">
                                                        <Lock size={12} strokeWidth={3} />
                                                    </div>
                                                ) : d.defendantStatus === 'Em Liberdade' ? (
                                                    <div className="bg-emerald-100 text-emerald-700 p-1 rounded-full flex items-center justify-center shrink-0" title="Réu em Liberdade">
                                                        <Accessibility size={12} strokeWidth={3} />
                                                    </div>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getSystemBadge(d.system)}`}>
                                                {d.system}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-xs font-bold text-slate-900 truncate">{d.proceduralClass || 'Não especificada'}</span>
                                                <span className="text-[11px] font-medium text-slate-500 truncate">{d.mainSubject}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs font-medium text-slate-700 truncate block">{d.manifestationPurpose}</span>
                                        </td>
                                        <td className="p-4">
                                            <select 
                                                className={`w-full px-2 py-1.5 rounded text-[10px] font-bold border uppercase outline-none cursor-pointer transition-colors ${getStatusColor(d.advisorStatus)}`}
                                                value={d.advisorStatus || 'Pendente'}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => handleStatusUpdate(d.id, 'advisorStatus', e.target.value)}
                                            >
                                                {advisorStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <select 
                                                className={`w-full px-2 py-1.5 rounded text-[10px] font-bold border uppercase outline-none cursor-pointer transition-colors ${getStatusColor(d.promoterDecision)}`}
                                                value={d.promoterDecision || 'Pendente'}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => handleStatusUpdate(d.id, 'promoterDecision', e.target.value)}
                                            >
                                                {promoterDecisions.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded py-1">
                                                {safeFormatDate(d.startDate)}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className={`text-sm font-bold rounded px-2 py-1 border ${isUrgent ? 'bg-red-50 text-red-800 border-red-100' : 'bg-slate-50 text-slate-900 border-slate-200'}`}>
                                                {safeFormatDate(d.endDate)}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); openGuidance(d); }} className={`p-2 transition-colors rounded ${d.instruction ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-blue-600'}`}>
                                                    <MessageCircle size={18} fill={d.instruction ? "currentColor" : "none"} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(d); }} className="p-2 text-slate-400 hover:text-blue-600 transition rounded">
                                                    <Edit size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Instrução da Promotoria */}
            {isGuidanceModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-slate-200 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><MessageCircle size={20} className="text-amber-500"/> Orientações da Promotora</h3>
                            <button onClick={() => setIsGuidanceModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-4">Insira diretrizes estratégicas para a elaboração da peça:</p>
                        <textarea 
                            className="w-full h-40 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 resize-none shadow-inner"
                            placeholder="Ex: Pugnar pelo indeferimento do pedido de liberdade provisória em razão da reincidência..."
                            value={guidanceText}
                            onChange={(e) => setGuidanceText(e.target.value)}
                        />
                        <div className="flex gap-3 mt-6 justify-end">
                            <button onClick={() => setIsGuidanceModalOpen(false)} className="px-5 py-2 text-slate-500 text-xs font-bold uppercase">Cancelar</button>
                            <button onClick={saveGuidance} className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase rounded-lg shadow-lg flex items-center gap-2 transition-all">
                                <Save size={16} /> Salvar Orientações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edição/Manual */}
            {isEditModalOpen && editingDeadline && (
                <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-8 w-full max-w-2xl border border-white/50 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3"><FileText size={26} className="text-blue-600"/> Dados do Prazo</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition p-2 bg-slate-50 hover:bg-slate-100 rounded-full"><X size={24} /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 tracking-wider">Processo CNJ</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner" value={editingDeadline.processNumber} onChange={(e) => setEditingDeadline({...editingDeadline, processNumber: e.target.value})} placeholder="0000000-00.0000.0.00.0000"/>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 tracking-wider">Sistema</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer" value={editingDeadline.system} onChange={(e) => setEditingDeadline({...editingDeadline, system: e.target.value as any})}>
                                    <option value="PROJUDI">PROJUDI</option>
                                    <option value="SEEU">SEEU</option>
                                    <option value="MPV">MPV</option>
                                    <option value="SEI">SEI</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 tracking-wider">Vencimento</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={!isNaN(new Date(editingDeadline.endDate).getTime()) ? new Date(editingDeadline.endDate).toISOString().split('T')[0] : ''} onChange={(e) => setEditingDeadline({...editingDeadline, endDate: parseInputDate(e.target.value)})}/>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 tracking-wider">Status do Réu</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer" value={editingDeadline.defendantStatus} onChange={(e) => setEditingDeadline({...editingDeadline, defendantStatus: e.target.value as any})}>
                                    <option value="Réu Preso">Réu Preso</option>
                                    <option value="Em Liberdade">Em Liberdade</option>
                                    <option value="Não Informado">Não Informado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 tracking-wider">Prioridade</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer" value={editingDeadline.priority} onChange={(e) => setEditingDeadline({...editingDeadline, priority: e.target.value as any})}>
                                    <option value="Baixa">Baixa</option>
                                    <option value="Média">Média</option>
                                    <option value="Alta">Alta</option>
                                    <option value="Urgente">Urgente</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 tracking-wider">Classe Processual</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={editingDeadline.proceduralClass || ''} onChange={(e) => setEditingDeadline({...editingDeadline, proceduralClass: e.target.value})}/>
                            </div>
                             <div className="col-span-2">
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 tracking-wider">Assunto Principal</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={editingDeadline.mainSubject || ''} onChange={(e) => setEditingDeadline({...editingDeadline, mainSubject: e.target.value})}/>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10 pt-6 border-t border-slate-100">
                            <button onClick={handleDeleteFromModal} className="px-6 py-3 text-red-600 hover:bg-red-50 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 mr-auto border border-transparent hover:border-red-100 shadow-sm active:scale-95">
                                <Trash2 size={18} /> Excluir Prazo
                            </button>
                            <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 text-slate-500 text-xs font-bold uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                            <button onClick={saveEdit} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95">
                                <Save size={18} /> Salvar Registro
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Importação */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-slate-200 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="text-xl font-bold text-slate-900 tracking-tight uppercase">IMPORTAÇÃO POR IA</h3>
                             <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={24}/></button>
                        </div>
                        
                        {importState.status === 'processing' ? (
                            <div className="text-center py-12">
                                <RefreshCw size={48} className="animate-spin text-blue-600 mx-auto mb-4"/>
                                <p className="font-bold text-slate-600 uppercase tracking-widest text-[10px]">O Sistema está analisando o documento...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-blue-400 transition-colors bg-slate-50 group cursor-pointer" onClick={() => document.getElementById('fileIn')?.click()}>
                                    <input type="file" id="fileIn" className="hidden" onChange={handleImportFile} accept=".pdf,.html"/>
                                    <Upload size={52} className="mx-auto text-slate-300 mb-4 group-hover:text-blue-500 transition-colors"/>
                                    <p className="font-bold text-slate-800 text-lg">Selecione PDF ou HTML</p>
                                    <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest leading-relaxed">Extração automática de processos do PROJUDI ou SEEU</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
                                    <Calendar size={20} className="text-blue-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-blue-800 font-medium">O Sistema identificará automaticamente números de processos, classes processuais, datas de início e de vencimento.</p>
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
