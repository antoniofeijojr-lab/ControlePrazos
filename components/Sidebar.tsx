import React from 'react';
import { ListTodo, Bot, Map, CalendarClock, X, Scale, Globe, FolderOpen, LayoutGrid } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutGrid },
    { id: 'intranet', label: 'Início', icon: Globe },
    { id: 'deadlines', label: 'Prazos Judiciais', icon: ListTodo },
    { id: 'administrative', label: 'Administrativo', icon: FolderOpen },
    { id: 'events', label: 'Eventos', icon: CalendarClock },
    { id: 'assistant', label: 'Assistente Jurídico', icon: Bot },
    { id: 'tools', label: 'Ferramentas', icon: Map },
    { id: 'license', label: 'Licença', icon: Scale },
  ];

  const handleNavigation = (viewId: string) => {
    setView(viewId);
    onClose();
  };

  const sidebarClasses = `
    fixed z-40 w-64 
    bg-[#0F172A] 
    text-white 
    border-r border-slate-800
    shadow-2xl md:shadow-none 
    transform transition-transform duration-300 ease-in-out flex flex-col
    inset-y-0 left-0
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0 md:top-16 md:bottom-0 md:left-0
  `;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose} 
      />

      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full pt-6 md:pt-4 font-sans">
            <div className="md:hidden p-4 flex justify-end shrink-0">
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>
            
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                    <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center text-left space-x-3 px-3 py-3 rounded-lg transition-all duration-200 text-[14px] font-medium tracking-tight group ${
                        isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                    >
                    <Icon size={18} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} strokeWidth={2} />
                    <span>{item.label}</span>
                    </button>
                );
                })}
            </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;