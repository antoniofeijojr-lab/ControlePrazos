import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Deadlines from './components/Deadlines';
import Administrative from './components/Administrative';
import Events from './components/Events';
import AIAssistant from './components/AIAssistant';
import Tools from './components/Tools';
import LicenseView from './components/LicenseView';
import Intranet from './components/Intranet';
import { Deadline, SystemType, Priority, ManifestationPurpose, Audience, AdministrativeProcess } from './types';
import { Menu, Scale, ShieldCheck, Bell, Settings, User } from 'lucide-react';

// Mock Data e Helpers mantidos
const INITIAL_DEADLINES: Deadline[] = [
  { 
    id: '1', 
    processNumber: '0001234-55.2023.8.04.0001', 
    system: SystemType.PROJUDI, 
    proceduralClass: 'Ação Penal - Procedimento Ordinário',
    mainSubject: 'Homicídio Simples',
    manifestationPurpose: 'Denúncia',
    defendantStatus: 'Réu Preso',
    prosecutorOffice: 'Promotoria da Comarca de Nhamundá',
    deadlineDuration: '5 dias úteis',
    startDate: new Date(2023, 10, 10),
    endDate: new Date(2023, 10, 15), 
    priority: Priority.URGENT, 
    status: 'Pendente',
    advisorStatus: 'Pendente',
    promoterDecision: 'Pendente',
    isArchived: false
  },
  { 
    id: '2', 
    processNumber: '0005678-22.2023.8.04.0001', 
    system: SystemType.SEEU, 
    proceduralClass: 'Execução da Pena (Regime Fechado)',
    mainSubject: 'Progressão de Regime',
    manifestationPurpose: 'Parecer',
    defendantStatus: 'Réu Preso',
    prosecutorOffice: 'Promotoria da Comarca de Nhamundá',
    deadlineDuration: '10 dias corridos',
    startDate: new Date(2023, 10, 8),
    endDate: new Date(2023, 10, 18), 
    priority: Priority.HIGH, 
    status: 'Pendente',
    advisorStatus: 'Minutado',
    advisorDraftType: 'Parecer',
    promoterDecision: 'Assinado',
    isArchived: true
  },
  { 
    id: '3', 
    processNumber: 'MPV-2023-9988', 
    system: SystemType.MPV, 
    proceduralClass: 'Inquérito Civil (Improbidade)',
    mainSubject: 'Improbidade Administrativa',
    manifestationPurpose: 'Manifestação',
    defendantStatus: 'Não Informado',
    prosecutorOffice: 'Promotoria da Comarca de Nhamundá',
    deadlineDuration: '30 dias',
    startDate: new Date(2023, 9, 20),
    endDate: new Date(2023, 10, 20), 
    priority: Priority.MEDIUM, 
    status: 'Em Análise',
    advisorStatus: 'Minuta Refeita',
    promoterDecision: 'Devolvido',
    returnReason: 'Necessário complementar.',
    isArchived: false
  },
];

const INITIAL_AUDIENCES: Audience[] = [
    {
        id: '101',
        processNumber: '0001234-55.2023.8.04.0001',
        courtDivision: 'Vara Única de Nhamundá',
        proceduralClass: 'Ação Penal',
        mainSubject: 'Homicídio Qualificado',
        date: new Date(2023, 10, 25),
        time: '09:00',
        type: 'Instrução e Julgamento',
        mode: 'Presencial',
        parties: 'MP vs João da Silva',
        status: 'Agendada'
    }
];

const dateReviver = (key: string, value: any) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return new Date(value);
    }
    return value;
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [expectedCounts, setExpectedCounts] = useState<Record<string, number>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [deadlines, setDeadlines] = useState<Deadline[]>(() => {
      try {
          const saved = localStorage.getItem('promotoria-deadlines');
          if (saved) return JSON.parse(saved, dateReviver);
      } catch (e) { console.error(e); }
      return INITIAL_DEADLINES;
  });

  const [audiences, setAudiences] = useState<Audience[]>(() => {
      try {
          const saved = localStorage.getItem('promotoria-audiences');
          if (saved) return JSON.parse(saved, dateReviver);
      } catch (e) { console.error(e); }
      return INITIAL_AUDIENCES;
  });

  const [adminProcesses, setAdminProcesses] = useState<AdministrativeProcess[]>(() => {
    try {
        const saved = localStorage.getItem('promotoria-admin-processes');
        if (saved) return JSON.parse(saved, dateReviver);
    } catch (e) { console.error(e); }
    return [];
  });

  useEffect(() => { localStorage.setItem('promotoria-deadlines', JSON.stringify(deadlines)); }, [deadlines]);
  useEffect(() => { localStorage.setItem('promotoria-audiences', JSON.stringify(audiences)); }, [audiences]);
  useEffect(() => { localStorage.setItem('promotoria-admin-processes', JSON.stringify(adminProcesses)); }, [adminProcesses]);

  const sortDeadlines = (items: Deadline[]) => [...items].sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  const activeDeadlines = deadlines.filter(d => !d.isArchived);

  // Handlers
  const handleImportDeadlines = (newDeadlines: Deadline[], metadata?: any) => {
    const uniqueBatch = newDeadlines.filter((item, index, self) => index === self.findIndex((t) => (t.processNumber.trim() === item.processNumber.trim())));
    const uniqueNewDeadlines = uniqueBatch.filter(newItem => !activeDeadlines.some(existingItem => existingItem.processNumber.trim() === newItem.processNumber.trim()));
    if (uniqueNewDeadlines.length > 0) setDeadlines(prev => sortDeadlines([...prev, ...uniqueNewDeadlines]));
    if (metadata) setExpectedCounts(prev => ({ ...prev, [metadata.purpose]: Math.max(prev[metadata.purpose] || 0, metadata.total) }));
  };

  const handleUpdateDeadlines = (updatedItems: Deadline[]) => {
      setDeadlines(prev => sortDeadlines(prev.map(item => {
          const updated = updatedItems.find(u => u.id === item.id);
          return updated ? { ...item, ...updated } : item;
      })));
  };

  const handleDeleteDeadline = (id: string) => setDeadlines((prev) => prev.filter((item) => item.id !== id));
  const handleImportAudiences = (newAudiences: Audience[]) => setAudiences(prev => [...prev, ...newAudiences]);
  const handleUpdateAudiences = (updatedItems: Audience[]) => setAudiences(prev => prev.map(item => updatedItems.find(u => u.id === item.id) ? { ...item, ...updatedItems.find(u => u.id === item.id)! } : item));
  const handleDeleteAudience = (id: string) => setAudiences(prev => prev.filter(a => a.id !== id));
  const handleUpdateAdmin = (updated: AdministrativeProcess[]) => setAdminProcesses(prev => prev.map(p => updated.find(u => u.id === p.id) ? { ...p, ...updated.find(u => u.id === p.id)! } : p));
  const handleDeleteAdmin = (id: string) => setAdminProcesses(prev => prev.filter(p => p.id !== id));
  const handleImportAdmin = (newProcesses: AdministrativeProcess[]) => {
      const uniqueNew = newProcesses.filter(np => !adminProcesses.some(ep => ep.procedureNumber === np.procedureNumber));
      setAdminProcesses(prev => [...prev, ...uniqueNew]);
  };

  const renderView = () => {
    switch(currentView) {
      case 'dashboard': return <Dashboard deadlines={deadlines} audiences={audiences} />;
      case 'intranet': return <Intranet />;
      case 'deadlines': return <Deadlines deadlines={deadlines} activeDeadlines={activeDeadlines} onImport={handleImportDeadlines} onUpdate={handleUpdateDeadlines} onDelete={handleDeleteDeadline} expectedCounts={expectedCounts} isArchiveView={false} />;
      case 'administrative': return <Administrative processes={adminProcesses} onUpdate={handleUpdateAdmin} onDelete={handleDeleteAdmin} onImport={handleImportAdmin} />;
      case 'events': return <Events audiences={audiences} onImport={handleImportAudiences} onUpdate={handleUpdateAudiences} onDelete={handleDeleteAudience} />;
      case 'assistant': return <AIAssistant />;
      case 'tools': return <Tools />;
      case 'license': return <LicenseView />;
      default: return <Dashboard deadlines={deadlines} audiences={audiences} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F7] font-sans text-[#1D1D1F] selection:bg-[#007AFF] selection:text-white">
      
      {/* 1. Header Fixo no Topo (h-16 = 64px) */}
      <header className="glass-panel fixed top-0 left-0 right-0 h-16 z-50 px-6 md:px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
              <div className="md:hidden">
                <button onClick={() => setIsSidebarOpen(true)} className="text-[#007AFF] active:opacity-50 hover:bg-black/5 p-1 rounded-lg transition-colors">
                    <Menu size={24} />
                </button>
              </div>
              
              {/* Ícone Minimalista */}
              <div className="hidden md:flex items-center justify-center w-10 h-10 bg-white rounded-xl shadow-sm border border-black/5 text-[#1D1D1F]">
                <Scale size={20} />
              </div>

              {/* Títulos com Hierarquia Visual e Tipografia Inter (AUMENTADO e SEM BOLINHA AZUL) */}
              <div className="flex flex-col justify-center">
                  <h1 className="text-lg md:text-xl font-black tracking-wide text-[#1D1D1F] uppercase leading-tight">
                      PROMOTORIA DE JUSTIÇA DE NHAMUNDÁ
                  </h1>
                  <p className="text-base font-medium text-[#86868B] tracking-normal leading-none mt-1">
                      Controle de Prazos
                  </p>
              </div>
          </div>

          {/* Controles do Lado Direito (REMOVIDOS ÍCONES) */}
          <div className="flex items-center gap-4">
             {/* Área vazia para manter espaçamento se necessário ou futuro uso */}
          </div>
      </header>

      {/* 2. Container Principal (Deslocado 64px para baixo) */}
      <div className="flex flex-1 pt-16">
          {/* Sidebar (Fixo à esquerda, abaixo do header) */}
          <Sidebar currentView={currentView} setView={setCurrentView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          
          {/* Área de Conteúdo (Margem esquerda da sidebar em Desktop) */}
          <div className="flex-1 md:ml-64 transition-all duration-300 relative">
              <main className="h-[calc(100vh-4rem)] overflow-hidden">
                {renderView()}
              </main>
          </div>
      </div>
    </div>
  );
};

export default App;