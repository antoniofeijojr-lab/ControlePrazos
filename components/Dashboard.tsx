import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Deadline, Audience } from '../types';
import {
    Activity, Siren, Calendar, Archive, Plus, 
    Briefcase, FileText, Clock, Lock, HelpCircle,
    TrendingUp, Scale, AlertTriangle, ArrowUpRight
} from 'lucide-react';

interface DashboardProps {
  deadlines: Deadline[];
  audiences: Audience[];
}

const COLORS = {
    blue: '#007AFF',
    red: '#FF3B30',
    green: '#34C759',
    orange: '#FF9500',
    gray: '#8E8E93',
    lightGray: '#E5E5EA',
    dark: '#1D1D1F'
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md border border-black/5 shadow-xl rounded-[12px] p-4 text-sm z-50 font-sans">
          <p className="font-semibold text-[#1D1D1F] mb-1">{label || payload[0].name}</p>
          <div className="flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].color }}></div>
             <span className="font-medium text-[#86868B]">
               {payload[0].value} <span className="text-[#86868B]/70 font-normal">itens</span>
             </span>
          </div>
        </div>
      );
    }
    return null;
};

const Dashboard: React.FC<DashboardProps> = ({ deadlines, audiences }) => {
  const activeDeadlines = deadlines.filter(d => !d.isArchived);
  const archivedCount = deadlines.filter(d => d.isArchived).length;
  const urgentCount = activeDeadlines.filter(d => d.priority === 'Urgente').length;
  const nextAudiencesCount = audiences.filter(a => a.status === 'Agendada').length;

  // Mock State para data de atualização e percentual
  const [statsMeta, setStatsMeta] = useState({ 
      lastUpdate: new Date(), 
      trend: 2.5 
  });

  // Data: Carga de Trabalho (Purpose)
  const purposeCounts = activeDeadlines.reduce((acc: any, curr) => {
      const p = curr.manifestationPurpose || 'Outros';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
  }, {});
  const workloadData = Object.entries(purposeCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  // Data: Status Prisional
  const prisonData = [
      { name: 'Réu Preso', value: activeDeadlines.filter(d => d.defendantStatus === 'Réu Preso').length, color: COLORS.red },
      { name: 'Em Liberdade', value: activeDeadlines.filter(d => d.defendantStatus === 'Em Liberdade').length, color: COLORS.green },
      { name: 'Não Inf.', value: activeDeadlines.filter(d => d.defendantStatus === 'Não Informado').length, color: COLORS.gray },
  ].filter(d => d.value > 0);

  // Data: Prazos
  const now = new Date();
  let expired = 0, next7 = 0, next15 = 0, others = 0;
  activeDeadlines.forEach(d => {
      const end = new Date(d.endDate);
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) expired++;
      else if (diffDays <= 7) next7++;
      else if (diffDays <= 15) next15++;
      else others++;
  });
  const deadlineData = [
      { name: 'Vencidos', value: expired, fill: COLORS.red },
      { name: '7 dias', value: next7, fill: COLORS.orange },
      { name: '15 dias', value: next15, fill: COLORS.green },
      { name: 'Outros', value: others, fill: COLORS.gray },
  ];

  // Data: Natureza (Classe) - Simplificada
  let natureCounts = { Criminal: 0, Cível: 0, Infância: 0, Administrativo: 0 };
  activeDeadlines.forEach(d => {
      const txt = (d.proceduralClass + d.mainSubject).toLowerCase();
      if (txt.includes('criminal') || txt.includes('penal') || txt.includes('prisão')) natureCounts.Criminal++;
      else if (txt.includes('infância') || txt.includes('adolescente')) natureCounts.Infância++;
      else if (txt.includes('civil') || txt.includes('mpv') || txt.includes('administrativo')) natureCounts.Administrativo++;
      else natureCounts.Cível++;
  });
  const natureData = Object.entries(natureCounts)
    .map(([name, value]) => ({ name, value }))
    .filter(d => d.value > 0);

  // Componente de Card KPI
  const StatCard = ({ title, value, sub, icon: Icon, color, isMainKPI }: any) => (
      <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col justify-between h-[160px] relative overflow-hidden group transition-all duration-300 hover:-translate-y-1">
          <div className="flex justify-between items-start z-10">
              <div className="flex-1">
                  <h3 className="text-sm font-bold text-[#86868B] uppercase tracking-widest mb-2">{title}</h3>
                  <div className="flex items-center">
                    <div className="text-5xl font-bold text-[#1D1D1F] tracking-tight leading-none">{value}</div>
                    
                    {/* KPI Percentage */}
                    {isMainKPI && (
                         <div className="ml-6 flex items-center gap-1.5 text-[#34C759] bg-[#34C759]/10 px-3 py-1 rounded-lg text-sm font-bold">
                              <ArrowUpRight size={16} strokeWidth={3} />
                              {statsMeta.trend.toLocaleString('pt-BR')}%
                         </div>
                    )}
                  </div>
              </div>
              <div className={`p-3.5 rounded-2xl ${color === 'red' ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : color === 'green' ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#007AFF]/10 text-[#007AFF]'}`}>
                  <Icon size={24} strokeWidth={2.5} />
              </div>
          </div>
          
          <div className="z-10 mt-auto pt-3">
              {isMainKPI ? (
                  <div className="flex flex-col">
                      <span className="text-xs text-[#86868B]/80 font-medium">
                          Atualizado: {statsMeta.lastUpdate.toLocaleDateString('pt-BR')} às {statsMeta.lastUpdate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                      </span>
                  </div>
              ) : (
                  <span className={`text-sm font-medium ${color === 'red' ? 'text-[#FF3B30]' : color === 'green' ? 'text-[#34C759]' : 'text-[#86868B]'}`}>
                      {sub}
                  </span>
              )}
          </div>
      </div>
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#F5F5F7] p-4 md:p-6 animate-in fade-in duration-500 pb-24 w-full">
        
        {/* Header */}
        <div className="mb-6 flex justify-between items-end">
            <div>
                 <h2 className="text-3xl font-bold text-[#1D1D1F]">Visão Geral</h2>
            </div>
            <div className="text-xs font-semibold text-[#86868B] bg-white px-4 py-2 rounded-full shadow-sm border border-black/5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse"></div>
                Sistema Online
            </div>
        </div>

        {/* 1. KPI Cards - Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard 
                title="Processos Ativos" 
                value={activeDeadlines.length} 
                icon={Activity} 
                color="blue"
                isMainKPI={true}
            />
            <StatCard 
                title="Urgentes" 
                value={urgentCount} 
                sub="Requer atenção imediata" 
                icon={Siren} 
                color="red" 
            />
            <StatCard 
                title="Audiências" 
                value={nextAudiencesCount} 
                sub="Próximos 7 dias" 
                icon={Calendar} 
                color="blue" 
            />
            <StatCard 
                title="Arquivados" 
                value={archivedCount} 
                sub="Total no período" 
                icon={Archive} 
                color="green" 
            />
        </div>

        {/* 
            2. Main Content Grid 
            Usando w-full e gap ajustado para garantir encaixe perfeito 
        */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            
            {/* Left Column: Charts */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Carga de Trabalho */}
                <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col h-[230px]">
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                        <Briefcase size={18} className="text-[#86868B]"/>
                        <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wide">Carga de Trabalho</h3>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={workloadData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                                <CartesianGrid horizontal={true} vertical={false} stroke={COLORS.lightGray} strokeDasharray="3 3" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={120} 
                                    tick={{fontSize: 12, fill: '#1D1D1F', fontWeight: 600}} 
                                    axisLine={false} 
                                    tickLine={false}
                                />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#F5F5F7', radius: 4}} />
                                <Bar dataKey="count" fill="#2c3e50" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Status Prisional */}
                <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col h-[230px]">
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                        <Clock size={18} className="text-[#86868B]"/>
                        <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wide">Status Prisional</h3>
                    </div>
                    <div className="flex-1 relative min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={prisonData}
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {prisonData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-bold text-[#1D1D1F] tracking-tight">
                                {Math.round((activeDeadlines.filter(d => d.defendantStatus === 'Réu Preso').length / (activeDeadlines.length || 1)) * 100)}%
                            </span>
                            <span className="text-xs text-[#86868B] font-bold uppercase mt-1">Presos</span>
                        </div>
                    </div>
                </div>

                {/* 3. Previsão de Prazos */}
                <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col h-[230px]">
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                        <Calendar size={18} className="text-[#86868B]"/>
                        <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wide">Previsão de Prazos</h3>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={deadlineData} barSize={26}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.lightGray} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{fontSize: 12, fill: '#86868B', fontWeight: 600}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    dy={8}
                                />
                                <YAxis hide />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#F5F5F7', radius: 4}} />
                                <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                                    {deadlineData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Natureza Processual */}
                <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col h-[230px]">
                    <div className="flex items-center gap-2 mb-2 shrink-0">
                        <FileText size={18} className="text-[#86868B]"/>
                        <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wide">Natureza Processual</h3>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto pr-1 pt-1 custom-scrollbar">
                        {natureData.map((d, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm font-semibold mb-1.5">
                                    <span className="flex items-center gap-2 text-[#1D1D1F]">
                                        {d.name === 'Criminal' && <Lock size={14} className="text-[#FF3B30]"/>}
                                        {d.name === 'Cível' && <Scale size={14} className="text-[#2c3e50]"/>}
                                        {d.name === 'Infância' && <HelpCircle size={14} className="text-[#34C759]"/>}
                                        {d.name === 'Administrativo' && <Briefcase size={14} className="text-[#007AFF]"/>}
                                        {d.name}
                                    </span>
                                    <span className="text-[#86868B]">{d.value}</span>
                                </div>
                                <div className="w-full bg-[#F5F5F7] h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000"
                                        style={{ 
                                            width: `${(d.value / activeDeadlines.length) * 100}%`,
                                            backgroundColor: d.name === 'Criminal' ? COLORS.red : d.name === 'Administrativo' ? COLORS.blue : d.name === 'Infância' ? COLORS.green : '#2c3e50'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Right Column: Processos Recentes (SIMPLIFICADO) */}
            {/* Altura ajustada para alinhar perfeitamente com 2 linhas de gráficos (230*2 + gap) */}
            <div className="lg:col-span-1 h-[484px]">
                <div className="bg-white rounded-[24px] p-0 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col h-full overflow-hidden">
                    <div className="p-5 border-b border-[#F5F5F7] flex justify-between items-center bg-[#F9F9F9]/50 shrink-0">
                        <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wide flex items-center gap-2">
                            <TrendingUp size={18} /> Processos Recentes
                        </h3>
                        <div className="flex gap-1">
                            <button className="text-[#86868B] hover:text-[#1D1D1F] p-2 rounded-full hover:bg-black/5"><Plus size={18}/></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {activeDeadlines.slice(0, 10).map((d) => ( 
                            <div key={d.id} className="p-5 border-b border-[#F5F5F7] hover:bg-[#F5F5F7]/50 transition-colors cursor-pointer flex justify-between items-center">
                                {/* Lado Esquerdo: Número e Tags */}
                                <div className="flex flex-col gap-1.5 overflow-hidden">
                                    <span className="font-semibold text-base text-[#1D1D1F] tracking-tight font-mono truncate">{d.processNumber}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase">{d.system}</span>
                                        {d.defendantStatus === 'Réu Preso' && <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 uppercase">Réu Preso</span>}
                                    </div>
                                </div>
                                
                                {/* Lado Direito: Data de Vencimento */}
                                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                     <span className="text-[10px] uppercase font-bold text-[#86868B]">Vencimento</span>
                                     <div className={`flex items-center gap-1.5 font-bold ${new Date(d.endDate) < new Date() ? 'text-[#FF3B30]' : 'text-[#1D1D1F]'}`}>
                                        <Calendar size={14} />
                                        <span>{new Date(d.endDate).toLocaleDateString()}</span>
                                     </div>
                                </div>
                            </div>
                        ))}
                        {activeDeadlines.length === 0 && (
                            <div className="p-8 text-center text-[#86868B] text-sm">Nenhum processo recente.</div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default Dashboard;