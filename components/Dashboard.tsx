import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Deadline, Audience } from '../types';
import {
    Activity, Siren, Calendar, Archive,
    Briefcase, Clock, TrendingUp, CheckCircle2, Layout
} from 'lucide-react';

interface DashboardProps {
  deadlines: Deadline[];
  audiences: Audience[];
}

const COLORS = {
    blue: '#2563EB',
    red: '#991B1B',
    green: '#065F46',
    orange: '#D97706',
    gray: '#64748B',
    slate: '#0F172A',
    lightGray: '#E2E8F0',
    purple: '#7C3AED'
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 shadow-xl rounded-lg p-3 text-xs z-50">
          <p className="font-bold text-slate-900 mb-1">{label || payload[0].name}</p>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].color || payload[0].fill }}></div>
             <span className="font-medium text-slate-600">
               {payload[0].value} itens
             </span>
          </div>
        </div>
      );
    }
    return null;
};

const Dashboard: React.FC<DashboardProps> = ({ deadlines, audiences }) => {
  const activeDeadlines = deadlines.filter(d => !d.isArchived);
  const totalProcesses = deadlines.length;
  const archivedCount = deadlines.filter(d => d.isArchived).length;
  const urgentCount = activeDeadlines.filter(d => d.priority === 'Urgente').length;
  const nextAudiencesCount = audiences.filter(a => a.status === 'Agendada').length;

  const realPercentage = totalProcesses > 0 
    ? Math.round((activeDeadlines.length / totalProcesses) * 100) 
    : 0;

  // Carga por Finalidade
  const purposeCounts = activeDeadlines.reduce((acc: any, curr) => {
      const p = curr.manifestationPurpose || 'Outros';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
  }, {});
  const workloadData = Object.entries(purposeCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  // Distribuição por Sistema
  const systemCounts = activeDeadlines.reduce((acc: any, curr) => {
      const s = curr.system || 'Outros';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
  }, {});
  const systemData = [
      { name: 'PROJUDI', value: systemCounts['PROJUDI'] || 0, color: COLORS.blue },
      { name: 'SEEU', value: systemCounts['SEEU'] || 0, color: COLORS.purple },
      { name: 'OUTROS', value: (systemCounts['MPV'] || 0) + (systemCounts['SEI'] || 0), color: COLORS.gray },
  ].filter(d => d.value > 0);

  const prisonData = [
      { name: 'Réu Preso', value: activeDeadlines.filter(d => d.defendantStatus === 'Réu Preso').length, color: COLORS.red },
      { name: 'Em Liberdade', value: activeDeadlines.filter(d => d.defendantStatus === 'Em Liberdade').length, color: COLORS.green },
  ].filter(d => d.value > 0);

  const StatCard = ({ title, value, sub, icon: Icon, color, isMainKPI }: any) => (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between h-[150px] transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
              <div>
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</h3>
                  <div className="flex items-center">
                    <div className="text-3xl font-bold text-slate-900 tracking-tight">{value}</div>
                    {isMainKPI && (
                         <div className="ml-3 flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100">
                              <CheckCircle2 size={10} strokeWidth={2} />
                              {realPercentage}% ATIVO
                         </div>
                    )}
                  </div>
              </div>
              <div className={`p-3 rounded-xl ${color === 'red' ? 'bg-red-50 text-red-700' : color === 'green' ? 'bg-emerald-50 text-emerald-700' : color === 'purple' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                  <Icon size={22} strokeWidth={2} />
              </div>
          </div>
          <div className="mt-auto">
              <span className={`text-xs font-medium ${color === 'red' ? 'text-red-800' : color === 'green' ? 'text-emerald-800' : 'text-slate-500'}`}>
                  {sub || 'Informação Geral'}
              </span>
          </div>
      </div>
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-6 animate-in fade-in w-full">
        <div className="mb-8 flex justify-between items-end">
            <div>
                 <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Visão Geral</h2>
                 <p className="text-slate-500 font-medium text-sm">Análise em tempo real dos processos de Nhamundá</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Ativo" value={activeDeadlines.length} icon={Activity} color="blue" isMainKPI={true} />
            <StatCard title="Prazos Urgentes" value={urgentCount} sub="Exige prioridade alta" icon={Siren} color="red" />
            <StatCard title="Audiências" value={nextAudiencesCount} sub="Próximos compromissos" icon={Calendar} color="blue" />
            <StatCard title="Arquivados" value={archivedCount} sub="Processos finalizados" icon={Archive} color="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
            <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 h-[280px] flex flex-col">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2"><Briefcase size={16}/> Carga por Finalidade</h3>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={workloadData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid horizontal={true} vertical={false} stroke={COLORS.lightGray} strokeDasharray="3 3" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 9, fill: COLORS.slate, fontWeight: 600, fontFamily: 'Inter'}} axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" fill={COLORS.blue} radius={[0, 4, 4, 0]} barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 h-[280px] flex flex-col">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2"><Layout size={16}/> Distribuição por Sistema</h3>
                        <div className="flex-1 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={systemData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                        {systemData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 h-[200px] flex flex-col">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={16}/> Status Prisional (Ativos)</h3>
                    <div className="flex-1 flex items-center gap-8 px-4">
                        {prisonData.map((item, idx) => (
                            <div key={idx} className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.name}</span>
                                <span className="text-2xl font-bold text-slate-900">{item.value}</span>
                                <div className="w-full h-1 bg-slate-200 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full" style={{ width: `${(item.value / activeDeadlines.length) * 100}%`, backgroundColor: item.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1">
                <div className="bg-white rounded-xl p-0 shadow-sm border border-slate-200 h-full overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={16}/> Próximos Vencimentos</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {activeDeadlines.slice(0, 10).map((d) => (
                            <div key={d.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                <div className="flex flex-col gap-1 min-w-0">
                                    <span className="font-medium text-xs text-slate-900 tracking-tight font-mono">{d.processNumber}</span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase truncate">{d.manifestationPurpose}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${new Date(d.endDate) < new Date() ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                        {new Date(d.endDate).toLocaleDateString().slice(0, 5)}
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{d.system}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;