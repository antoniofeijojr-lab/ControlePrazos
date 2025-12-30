import React, { useState, useRef, useMemo } from 'react';
import { Deadline, ManifestationPurpose } from '../types';
import { extractDeadlinesFromHtml, extractDeadlinesFromPdf } from '../services/geminiService';
import { Upload, ClipboardList, Search, Archive, Trash2, Edit, Save, X, Calendar, Undo2, Lock } from 'lucide-react';
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

const Deadlines: React.FC<DeadlinesProps> = ({ deadlines, activeDeadlines, onImport, onUpdate, onDelete }) => {
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
    const [filters, setFilters] = useState({ term: '', priority: '', system: '' });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importState, setImportState] = useState<{status: 'idle' | 'processing', message: string}>({status: 'idle', message: ''});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pastedHtml, setPastedHtml] = useState('');
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<Deadline | null>(null);

    // Filter Logic
    const filteredDeadlines = useMemo(() => {
        const viewFiltered = deadlines.filter(d => viewMode === 'active' ? !d.isArchived : d.isArchived);
        return viewFiltered.filter(d => {
            if (filters.term && !d.processNumber.includes(filters.term) && !d.mainSubject?.toLowerCase().includes(filters.term.toLowerCase())) return false;
            if (filters.priority && d.priority !== filters.priority) return false;
            if (filters.system && d.system !== filters.system) return false;
            return true;
        });
    }, [deadlines, viewMode, filters]);

    // Handlers
    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportState({ status: 'processing', message: 'Analisando...' });
        try {
            const result = file.type === 'application/pdf' ? await extractDeadlinesFromPdf(file) : await extractDeadlinesFromHtml(await file.text());
            processImportResult(result);
        } catch (error) { alert("Erro ao processar."); setImportState({ status: 'idle', message: '' }); }
    };

    const handleImportPaste = async () => {
        if (!pastedHtml) return;
        setImportState({ status: 'processing', message: 'Processando...' });
        try {
            const result = await extractDeadlinesFromHtml(pastedHtml);
            processImportResult(result);
        } catch (error) { alert("Erro."); setImportState({ status: 'idle', message: '' }); }
    };

    const processImportResult = (result: any) => {
        if (result.deadlines?.length) {
            const newD = result.deadlines.map((d: any) => ({
                id: uuidv4(), ...d, status: 'Pendente', isArchived: false,
                startDate: d.startDate ? new Date(d.startDate) : new Date(),
                endDate: d.endDate ? new Date(d.endDate) : new Date()
            }));
            onImport(newD, result.groupMetadata ? { purpose: result.groupMetadata.detectedPurpose, total: result.groupMetadata.totalRecordsInDocument } : undefined);
            setIsImportModalOpen(false);
            setImportState({ status: 'idle', message: '' });
        } else {
             setImportState({ status: 'idle', message: '' });
             alert("Nada encontrado.");
        }
    };

    const formatDateForInput = (date: Date) => date instanceof Date && !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : '';
    const handleEditClick = (d: Deadline) => { setEditingRowId(d.id); setEditFormData({ ...d }); };
    const handleSaveEdit = () => { if (editFormData) { onUpdate([editFormData]); setEditingRowId(null); } };
    const handleChange = (f: keyof Deadline, v: any) => editFormData && setEditFormData({ ...editFormData, [f]: v });

    return (
        <div className="w-full flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] p-6 md:p-8 animate-in fade-in">
             
            {/* Header / Controls */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Prazos Judiciais</h2>
                        <p className="text-[#86868B] font-medium mt-1 text-base">Gestão de expedientes e manifestações</p>
                    </div>
                    <div className="flex gap-3">
                         {/* Apple Segmented Control Style */}
                         <div className="bg-[#E5E5EA] p-0.5 rounded-lg flex shadow-sm">
                            <button onClick={() => setViewMode('active')} className={`px-4 py-1.5 rounded-[7px] text-sm font-semibold transition-all ${viewMode === 'active' ? 'bg-white text-black shadow-sm' : 'text-[#8E8E93]'}`}>Ativos</button>
                            <button onClick={() => setViewMode('archived')} className={`px-4 py-1.5 rounded-[7px] text-sm font-semibold transition-all ${viewMode === 'archived' ? 'bg-white text-black shadow-sm' : 'text-[#8E8E93]'}`}>Arquivo</button>
                        </div>
                        <button onClick={() => setIsImportModalOpen(true)} className="bg-[#007AFF] hover:bg-[#0071E3] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2">
                            <Upload size={18}/> Importar
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-2.5 rounded-xl border border-black/5 shadow-sm flex items-center gap-3 pl-4">
                    <Search size={18} className="text-[#8E8E93]"/>
                    <input 
                        className="flex-1 bg-transparent outline-none text-base text-[#1D1D1F] placeholder-[#8E8E93]"
                        placeholder="Buscar..."
                        value={filters.term}
                        onChange={e => setFilters({...filters, term: e.target.value})}
                    />
                    <select className="bg-[#F5F5F7] rounded-lg px-3 py-2 text-xs font-semibold text-[#1D1D1F] border-none outline-none cursor-pointer" onChange={e => setFilters({...filters, priority: e.target.value})}>
                        <option value="">Prioridade</option>
                        <option value="Urgente">Urgente</option>
                        <option value="Alta">Alta</option>
                        <option value="Média">Média</option>
                    </select>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto pb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start">
                {filteredDeadlines.map(d => {
                     const isEditing = editingRowId === d.id;
                     return (
                        <div key={d.id} className={`bg-white rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-black/5 flex flex-col transition-all duration-300 ${isEditing ? 'ring-2 ring-[#007AFF]' : ''}`}>
                            {/* Card Header */}
                            <div className="p-5 border-b border-[#F5F5F7]">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${d.system === 'PROJUDI' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {d.system}
                                    </span>
                                    {isEditing ? 
                                        <input type="date" className="text-xs border rounded p-1" value={formatDateForInput(editFormData!.endDate)} onChange={e => handleChange('endDate', new Date(e.target.value))} /> :
                                        <span className={`text-xs font-semibold flex items-center gap-1 ${new Date(d.endDate) < new Date() ? 'text-[#FF3B30]' : 'text-[#86868B]'}`}>
                                            <Calendar size={14}/> {new Date(d.endDate).toLocaleDateString()}
                                        </span>
                                    }
                                </div>
                                {isEditing ? 
                                    <input className="w-full font-bold text-sm border rounded p-1" value={editFormData!.processNumber} onChange={e => handleChange('processNumber', e.target.value)}/> :
                                    <h3 className="font-semibold text-[#1D1D1F] text-base truncate" title={d.processNumber}>{d.processNumber}</h3>
                                }
                            </div>

                            {/* Body */}
                            <div className="p-5 flex-1 space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">Classe</label>
                                    <p className="text-sm text-[#1D1D1F] font-medium leading-relaxed line-clamp-2">{d.proceduralClass}</p>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">Assunto</label>
                                    <p className="text-sm text-[#1D1D1F] leading-relaxed line-clamp-2">{d.mainSubject}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="bg-[#F2F2F7] text-[#1D1D1F] px-3 py-1.5 rounded-[6px] text-xs font-semibold border border-black/5">{d.manifestationPurpose}</span>
                                    {d.defendantStatus === 'Réu Preso' && <span className="flex items-center gap-1 text-xs font-bold text-[#FF3B30]"><Lock size={12}/> Réu Preso</span>}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-3 border-t border-[#F5F5F7] flex justify-end gap-2">
                                {isEditing ? (
                                    <>
                                        <button onClick={handleSaveEdit} className="p-2 text-[#34C759] hover:bg-[#34C759]/10 rounded-full transition"><Save size={18}/></button>
                                        <button onClick={() => setEditingRowId(null)} className="p-2 text-[#8E8E93] hover:bg-black/5 rounded-full transition"><X size={18}/></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleEditClick(d)} className="p-2 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-full transition"><Edit size={18}/></button>
                                        <button onClick={() => { onUpdate([{...d, isArchived: !d.isArchived}]); }} className="p-2 text-[#8E8E93] hover:bg-black/5 rounded-full transition">{viewMode === 'active' ? <Archive size={18}/> : <Undo2 size={18}/>}</button>
                                        <button onClick={() => onDelete(d.id)} className="p-2 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-full transition"><Trash2 size={18}/></button>
                                    </>
                                )}
                            </div>
                        </div>
                     );
                })}
            </div>

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