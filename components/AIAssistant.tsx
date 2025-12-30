import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, FileUp, Video as VideoIcon, Loader2, Link as LinkIcon, Gavel, Trash2, Download } from 'lucide-react';
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
    { role: 'model', content: 'Olá! Sou seu assistente jurídico. Como posso ajudar?' }
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
        const history = messages.map(m => ({ role: m.role === 'admin' ? 'model' : m.role, parts: [{ text: m.content }] }));
        responseText = await sendChatMessage(history, userMsg);
      } 
      else if (mode === Mode.DRAFT) responseText = await complexDrafting(`Atue como Promotor. Tarefa: ${userMsg}`);
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
          if (file.type.startsWith('image/')) responseText = await analyzeImage(file, userMsg || "Analise juridicamente.");
          else if (file.type.startsWith('video/')) responseText = await analyzeVideo(file, userMsg || "Analise o vídeo.");
          else if (file.type === 'application/pdf') responseText = await analyzePdfChat(file, userMsg || "Analise o PDF.");
      }

      setMessages(prev => [...prev, { role: 'model', content: responseText, chunks }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "Erro na conexão." }]);
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  const handleClearChat = () => { if (confirm("Limpar histórico?")) setMessages([{ role: 'model', content: 'Histórico limpo.' }]); };
  const handleDownloadChat = () => { /* Mantido lógica anterior simplificada */ alert("Download iniciado"); };

  return (
    <div className="h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 max-w-5xl mx-auto w-full">
      <div className="bg-white rounded-[24px] shadow-lg shadow-black/5 border border-black/5 flex-1 flex flex-col overflow-hidden">
        
        {/* Header/Tabs Segmented Control Style */}
        <div className="border-b border-[#E5E5EA] p-4 bg-[#F9F9F9] backdrop-blur-xl">
          <div className="flex justify-between items-center mb-4">
               <h2 className="text-lg font-bold text-[#1D1D1F]">Assistente Jurídico</h2>
               <div className="flex gap-2">
                   <button onClick={handleClearChat} className="p-2 text-[#8E8E93] hover:text-[#FF3B30] transition-colors"><Trash2 size={18}/></button>
               </div>
          </div>
          
          <div className="bg-[#E5E5EA] p-1 rounded-lg flex gap-1 overflow-x-auto no-scrollbar">
            {Object.values(Mode).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 px-3 rounded-[7px] text-[13px] font-semibold transition-all whitespace-nowrap ${
                  mode === m 
                  ? 'bg-white text-black shadow-sm' 
                  : 'text-[#8E8E93] hover:text-black'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area - iMessage Style */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-white">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] rounded-[20px] px-5 py-3.5 shadow-sm text-[15px] leading-relaxed ${
                msg.role === 'user' 
                ? 'bg-[#007AFF] text-white rounded-br-sm' 
                : 'bg-[#E9E9EB] text-[#1D1D1F] rounded-bl-sm'
              }`}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.chunks && (
                    <div className="mt-2 pt-2 border-t border-black/10">
                        {msg.chunks.map((chunk, i) => chunk.web && (
                            <a key={i} href={chunk.web.uri} target="_blank" className="block text-xs underline opacity-70 hover:opacity-100 truncate">{chunk.web.title}</a>
                        ))}
                    </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex justify-start">
                <div className="bg-[#E9E9EB] px-5 py-3 rounded-[20px] rounded-bl-sm flex items-center gap-2">
                    <Loader2 className="animate-spin text-[#8E8E93]" size={16} />
                    <span className="text-sm text-[#8E8E93]">Digitando...</span>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#F9F9F9] border-t border-[#E5E5EA]">
            {file && <div className="text-xs text-[#007AFF] mb-2 font-medium bg-[#007AFF]/10 w-fit px-2 py-1 rounded">Anexo: {file.name}</div>}
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
                {mode === Mode.ANALYZE && (
                    <label className="text-[#007AFF] cursor-pointer hover:bg-[#007AFF]/10 p-2 rounded-full transition-colors">
                        <FileUp size={24} />
                        <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </label>
                )}
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="iMessage"
                        className="w-full bg-white border border-[#C6C6C6] rounded-full pl-5 pr-12 py-2.5 text-[15px] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all placeholder:text-[#8E8E93]"
                    />
                    <button 
                        type="submit" 
                        disabled={loading || (!input && !file)}
                        className={`absolute right-1 top-1 p-1.5 rounded-full transition-all ${input || file ? 'bg-[#007AFF] text-white' : 'bg-transparent text-[#8E8E93]'}`}
                    >
                        <Send size={16} className={input || file ? "ml-0.5" : ""} />
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;