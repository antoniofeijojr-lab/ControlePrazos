import React from 'react';
import { 
    Fingerprint, Scale, Gavel, Video, Users, FileText, 
    MessageCircle, Cloud, Mail, Clock, FileType, Newspaper, 
    ExternalLink 
} from 'lucide-react';

interface SystemLink {
    id: string;
    title: string;
    description: string;
    url: string;
    icon: React.ElementType;
    color: string; // Hex color for icon bg
}

const Intranet: React.FC = () => {
    
    // Apple-style vibrant colors
    const systems: SystemLink[] = [
        { id: 'ponto', title: 'Ponto Eletrônico', description: 'Registro de frequência', url: 'https://app2.pontomais.com.br/login', icon: Fingerprint, color: '#5856D6' }, // Indigo
        { id: 'mpvirtual', title: 'MPVirtual', description: 'Gestão administrativa', url: 'https://mpvirtual.mpam.mp.br/pages/login.jsf', icon: Scale, color: '#34C759' }, // Green
        { id: 'projudi', title: 'Projudi', description: 'Processo Judicial', url: 'https://projudi.tjam.jus.br/projudi/', icon: Gavel, color: '#007AFF' }, // Blue
        { id: 'meet', title: 'Google Meet', description: 'Sala de Audiências', url: 'https://meet.google.com/ybk-qpms-znz', icon: Video, color: '#FF9500' }, // Orange
        { id: 'teams', title: 'Microsoft Teams', description: 'Reuniões e Chat', url: 'https://teams.microsoft.com', icon: Users, color: '#AF52DE' }, // Purple
        { id: 'sei', title: 'SEI!', description: 'Sistema Eletrônico', url: 'https://sei.mpam.mp.br/sei/', icon: FileText, color: '#00C7BE' }, // Teal
        { id: 'whatsapp', title: 'WhatsApp Web', description: 'Mensagens', url: 'https://web.whatsapp.com/', icon: MessageCircle, color: '#30D158' }, // WhatsApp Green
        { id: 'onedrive', title: 'OneDrive', description: 'Arquivos na Nuvem', url: 'https://mpeam-my.sharepoint.com/', icon: Cloud, color: '#64D2FF' }, // Cyan
        { id: 'outlook', title: 'Outlook', description: 'E-mail Institucional', url: 'https://outlook.office.com/mail/', icon: Mail, color: '#0A84FF' }, // Blue
        { id: 'seeu', title: 'SEEU', description: 'Execução Penal', url: 'https://seeu.pje.jus.br/seeu/', icon: Clock, color: '#FFD60A' }, // Yellow
        { id: 'ilovepdf', title: 'ILovePDF', description: 'Ferramentas PDF', url: 'https://www.ilovepdf.com/pt', icon: FileType, color: '#FF3B30' }, // Red
        { id: 'domp', title: 'DOMP', description: 'Diário Oficial', url: 'https://doe.mpam.mp.br/pages/login.jsf', icon: Newspaper, color: '#8E8E93' }, // Gray
    ];

    return (
        <div className="w-full flex flex-col h-full bg-[#F5F5F7] relative overflow-hidden animate-in fade-in duration-700">
            <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-24">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl font-bold text-[#1D1D1F] mb-8 tracking-tight">Aplicativos & Sistemas</h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {systems.map((sys) => {
                            const Icon = sys.icon;
                            return (
                                <a 
                                    key={sys.id}
                                    href={sys.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group relative p-6 rounded-[24px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col items-center text-center border border-white hover:border-[#007AFF]/20 hover:-translate-y-1"
                                >
                                    {/* Icon Container with Apple-style Gradient bg */}
                                    <div 
                                        className="w-16 h-16 rounded-[18px] flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 shadow-sm"
                                        style={{ backgroundColor: `${sys.color}15` }} // 15 = 10% opacity hex
                                    >
                                        <Icon size={32} style={{ color: sys.color }} strokeWidth={2} />
                                    </div>

                                    <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-1 group-hover:text-[#007AFF] transition-colors">
                                        {sys.title}
                                    </h3>
                                    <p className="text-[13px] text-[#86868B] font-medium leading-relaxed">
                                        {sys.description}
                                    </p>

                                    <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <ExternalLink size={16} className="text-[#C7C7CC]" />
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Intranet;