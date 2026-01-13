import React, { useState, useRef, useEffect } from 'react';
import { Send, FileUp, Loader2, Bot } from 'lucide-react';
import { sendChatMessage, complexDrafting, searchLegalInfo, analyzeImage, analyzeVideo, analyzePdfChat, searchJurisprudence } from '../services/geminiService';
import { GroundingChunk } from '../types';
import ReactMarkdown from 'react-markdown';

enum Mode {
  CHAT = 'Chat',
  RESEARCH = 'Pesquisa',
  JURISPRUDENCE = 'Jurisprudência',
  DRAFT = 'Redação',
  ANALYZE = 'Análise'
}

const AIAssistant: React.FC = () => {
  const [mode, setMode] = useState<Mode>(Mode.CHAT);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: string, content: string, chunks?: GroundingChunk[] }[]>([
    { role: 'model', content: 'Olá! Sou o Assistente Jurídico da PJ-Nhamundá. Posso analisar processos, redigir minutas ou pesquisar jurisprudência. Como posso ser útil hoje?' }
  ]);
  const [file, setFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !file) || loading) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg + (file ? ` [Arquivo: ${file.name}]` : '') }]);
    setInput('');
    setLoading(true);

    try {
      let responseText = '';
      let chunks: GroundingChunk[] | undefined;

      if (mode === Mode.CHAT) {
        responseText = await sendChatMessage(messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })), userMsg);
      } 
      else if (mode === Mode.DRAFT) responseText = await complexDrafting(`Redija uma minuta formal para a Promotoria: ${userMsg}`);
      else if (mode === Mode.RESEARCH) {
        const result = await searchLegalInfo(userMsg);
        responseText = result.text || "Sem resultados.";
        chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[];
      }
      else if (mode === Mode.JURISPRUDENCE) {
        const result = await searchJurisprudence(userMsg);
        responseText = result.text || "Não encontrado.";
        chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[];
      }
      else if (mode === Mode.ANALYZE && file) {
          if (file.type.startsWith('image/')) responseText = await analyzeImage(file, userMsg);
          else if (file.type.startsWith('video/')) responseText = await analyzeVideo(file, userMsg);
          else if (file.type === 'application/pdf') responseText = await analyzePdfChat(file, userMsg);
      }

      setMessages(prev => [...prev, { role: 'model', content: responseText, chunks }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "Houve um erro no processamento do Sistema." }]);
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 bg-slate-50 max-w-6xl mx-auto w-full font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        
        <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex justify-between items-center font-heading">
            <div className="flex items-center gap-3">
                <div className="bg-slate-900 p-2 rounded-lg text-white">
                    <Bot size={20}/>
                </div>
                <div>
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Assistente PJ-Nhamundá</h2>
                    <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> ONLINE</p>
                </div>
            </div>
            
            <div className="bg-slate-200 p-0.5 rounded-lg flex gap-0.5">
                {Object.values(Mode).map((m) => (
                <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`py-1 px-3 rounded-md text-[11px] font-bold uppercase tracking-tighter transition-all ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {m}
                </button>
                ))}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-sans">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm text-[14px] leading-relaxed ${
                msg.role === 'user' 
                ? 'bg-slate-900 text-white rounded-br-sm' 
                : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-sm'
              }`}>
                <div className="prose prose-slate max-w-none prose-sm">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.chunks && (
                    <div className="mt-4 pt-3 border-t border-slate-200 font-heading">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fontes Verificadas:</p>
                        {msg.chunks.map((chunk, i) => chunk.web && (
                            <a key={i} href={chunk.web.uri} target="_blank" className="block text-[11px] text-blue-700 hover:underline mb-1 truncate font-bold font-sans">● {chunk.web.title}</a>
                        ))}
                    </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl flex items-center gap-2">
                    <Loader2 className="animate-spin text-slate-400" size={16} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-heading">Processando...</span>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
                {mode === Mode.ANALYZE && (
                    <button type="button" className="text-slate-500 cursor-pointer hover:bg-slate-200 p-2 rounded-xl transition-colors">
                        <FileUp size={22} />
                        <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </button>
                )}
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Descreva o caso ou solicite uma pesquisa..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-medium outline-none focus:border-blue-500 transition-all placeholder:text-slate-400 font-sans"
                    />
                    <button 
                        type="submit" 
                        disabled={loading || (!input && !file)}
                        className={`absolute right-2 top-2 p-1.5 rounded-lg transition-all ${input || file ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-300'}`}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;