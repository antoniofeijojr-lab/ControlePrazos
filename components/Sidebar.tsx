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

  // Sidebar Fixed Positioning Logic:
  // Mobile: Fixed inset-0 (full screen overlay)
  // Desktop: Fixed top-16 (below header), bottom-0, width-64
  const sidebarClasses = `
    fixed z-40 w-64 
    bg-[#FBFBFD]/85 backdrop-blur-xl 
    text-[#1D1D1F] 
    border-r border-black/5
    shadow-2xl md:shadow-none 
    transform transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col
    
    /* Mobile Positioning */
    inset-y-0 left-0
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    
    /* Desktop Positioning */
    md:translate-x-0 md:top-16 md:bottom-0 md:left-0
  `;

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose} 
      />

      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full pt-6 md:pt-4">
            <div className="md:hidden p-4 flex justify-end shrink-0">
                <button onClick={onClose} className="text-[#86868B] hover:text-[#1D1D1F] transition-colors">
                    <X size={24} />
                </button>
            </div>
            
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                <div className="px-3 mb-2 md:hidden">
                    <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Menu Principal</span>
                </div>
                {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                    <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center text-left space-x-3 px-3 py-3 rounded-lg transition-all duration-200 text-[15px] font-medium leading-5 group ${
                        isActive
                        ? 'bg-[#007AFF] text-white shadow-sm'
                        : 'text-[#1D1D1F] hover:bg-black/5 active:bg-black/10'
                    }`}
                    >
                    <Icon size={20} className={`${isActive ? 'text-white' : 'text-[#86868B] group-hover:text-[#1D1D1F]'}`} strokeWidth={2} />
                    <span>{item.label}</span>
                    </button>
                );
                })}
            </nav>
            
            <div className="p-6 border-t border-black/5 bg-[#F5F5F7]/50 backdrop-blur-md flex flex-col gap-4">
                 <div className="font-bold text-[#1D1D1F] text-sm">Versão 1.0</div>
                 
                 <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-[#86868B] font-medium leading-tight">
                        Licenciado por<br/>Creative Commons
                    </span>
                    <div className="flex gap-1.5 opacity-80">
                        <img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="CC" className="h-6 w-6" />
                        <img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="BY" className="h-6 w-6" />
                        <img src="https://mirrors.creativecommons.org/presskit/icons/nc.svg" alt="NC" className="h-6 w-6" />
                        <img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="SA" className="h-6 w-6" />
                    </div>
                 </div>
            </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;