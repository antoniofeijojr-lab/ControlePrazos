import React, { useState, useMemo } from 'react';
import { AdministrativeProcess } from '../types';
import { 
    Archive, Trash2, Edit, MapPin, FileBox, Briefcase, FileSignature, Search, Plus, FileText
} from 'lucide-react';

interface AdministrativeProps {
    processes: AdministrativeProcess[];
    onUpdate: (updated: AdministrativeProcess[]) => void;
    onDelete: (id: string) => void;
    onImport: (newProcesses: AdministrativeProcess[]) => void;
}

const Administrative: React.FC<AdministrativeProps> = ({ processes, onDelete }) => {
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
    const [filters, setFilters] = useState({ term: '', status: '' });

    const filteredProcesses = useMemo(() => {
        return processes.filter(p => {
            const matchesView = viewMode === 'active' ? !p.isArchived : p.isArchived;
            if (!matchesView) return false;
            const matchesTerm = !filters.term || 
                p.procedureNumber.toLowerCase().includes(filters.term.toLowerCase()) ||
                p.mainSubject.toLowerCase().includes(filters.term.toLowerCase());
            return matchesTerm;
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
        <div className="w-full flex flex-col h-full p-6 bg-slate-50 animate-in fade-in">
            <div className="flex flex-col gap-6 shrink-0 pb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <FileBox size={28} className="text-blue-600"/> Administrativos
                        </h2>
                        <p className="text-slate-500 font-medium text-sm">Gestão extrajudicial MPV</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                         <div className="bg-white border border-slate-200 p-1 rounded-lg flex gap-1 shadow-sm">
                            <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all uppercase ${viewMode === 'active' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Ativos</button>
                            <button onClick={() => setViewMode('archived')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all uppercase flex items-center gap-2 ${viewMode === 'archived' ? 'bg-slate-100 text-slate-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Archive size={14}/> Arquivo</button>
                        </div>
                        <button className="h-10 px-4 bg-blue-700 text-white font-bold rounded shadow-md hover:bg-blue-800 transition-all flex items-center gap-2 text-xs uppercase"><Plus size={16}/> Novo</button>
                    </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
                    <Search size={16} className="text-slate-400"/>
                    <input className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700" placeholder="Buscar procedimento..." value={filters.term} onChange={e => setFilters({...filters, term: e.target.value})}/>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-4 flex flex-wrap gap-6 content-start justify-start">
                {filteredProcesses.length === 0 && (
                    <div className="w-full py-12 text-center text-slate-400">
                        <FileText size={48} className="opacity-20 mx-auto mb-4"/>
                        <p>Nenhum procedimento encontrado.</p>
                    </div>
                )}
                
                {filteredProcesses.map(p => (
                    <div key={p.id} className="w-full sm:w-80 h-auto bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                            <div className="flex flex-col flex-1 mr-2 overflow-hidden">
                                <h3 className="font-bold text-slate-800 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{p.procedureNumber}</h3>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase mt-1">
                                    <MapPin size={10} className="shrink-0"/> <span className="truncate">{p.currentSector}</span>
                                </div>
                            </div>
                            <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 ${getStatusBadge(p.status)}`}>{p.status}</div>
                        </div>

                        <div className="p-4 space-y-3 flex-1">
                            <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1"><Briefcase size={10} className="inline mr-1"/> Classe</span>
                                <span className="font-bold text-slate-800 text-xs block leading-snug border-l-2 border-blue-500 pl-2">{p.proceduralClass}</span>
                            </div>
                            <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1"><FileSignature size={10} className="inline mr-1"/> Assunto</span>
                                <span className="font-medium text-slate-700 text-xs block leading-snug border-l-2 border-slate-300 pl-2">{p.mainSubject}</span>
                            </div>
                        </div>

                        <div className="p-3 border-t border-slate-100 flex gap-2 justify-end bg-slate-50/50">
                            <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"><Edit size={14}/></button>
                            <button onClick={() => onDelete(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Administrative;