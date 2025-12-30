import React, { useState, useRef, useEffect } from 'react';
import { Mic, Loader2, Video, Upload, Save, FileText, Trash2, Calendar, AlertCircle, Download, FileType } from 'lucide-react';
import { transcribeAudio, transcribeVideo } from '../services/geminiService';
import { TranscriptionRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';

const Tools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audio' | 'video'>('audio');
  
  // Data State
  const [processNumber, setProcessNumber] = useState('');
  const [transcription, setTranscription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedTranscriptions, setSavedTranscriptions] = useState<TranscriptionRecord[]>([]);

  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Video File State
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from LocalStorage
  useEffect(() => {
      const saved = localStorage.getItem('promotoria-transcriptions');
      if (saved) {
          try {
              // Revive dates
              const parsed = JSON.parse(saved, (key, value) => {
                  if (key === 'date') return new Date(value);
                  return value;
              });
              setSavedTranscriptions(parsed);
          } catch (e) {
              console.error("Failed to load transcriptions", e);
          }
      }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
      localStorage.setItem('promotoria-transcriptions', JSON.stringify(savedTranscriptions));
  }, [savedTranscriptions]);

  // Audio Handler
  const toggleRecording = async () => {
      if (isRecording) {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const mediaRecorder = new MediaRecorder(stream);
              mediaRecorderRef.current = mediaRecorder;
              audioChunksRef.current = [];

              mediaRecorder.ondataavailable = (event) => {
                  audioChunksRef.current.push(event.data);
              };

              mediaRecorder.onstop = async () => {
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                  const reader = new FileReader();
                  reader.readAsDataURL(audioBlob);
                  reader.onloadend = async () => {
                      const base64Audio = (reader.result as string).split(',')[1];
                      setIsLoading(true);
                      try {
                          const text = await transcribeAudio(base64Audio, 'audio/webm');
                          setTranscription(text || "Não foi possível transcrever.");
                      } catch (err) {
                          console.error(err);
                          setTranscription("Erro na transcrição. Tente novamente.");
                      } finally {
                          setIsLoading(false);
                      }
                  };
                  stream.getTracks().forEach(track => track.stop());
              };

              mediaRecorder.start();
              setIsRecording(true);
          } catch (err) {
              console.error("Mic error", err);
              alert("Permissão de microfone necessária.");
          }
      }
  };

  // Video Handler
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      try {
          const text = await transcribeVideo(file);
          setTranscription(text || "Não foi possível transcrever o vídeo.");
      } catch (err) {
          console.error(err);
          setTranscription("Erro ao processar vídeo. O arquivo pode ser muito grande ou o formato não suportado.");
      } finally {
          setIsLoading(false);
          // Clear input
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  // Save Record
  const handleSave = () => {
      if (!processNumber.trim()) {
          alert("Por favor, informe o número do processo para salvar.");
          return;
      }
      if (!transcription.trim()) {
          alert("Não há transcrição para salvar.");
          return;
      }

      const newRecord: TranscriptionRecord = {
          id: uuidv4(),
          processNumber: processNumber.trim(),
          type: activeTab === 'audio' ? 'Audio' : 'Video',
          content: transcription,
          date: new Date(),
          originLink: undefined
      };

      setSavedTranscriptions(prev => [newRecord, ...prev]);
      setTranscription('');
      setProcessNumber('');
      alert("Transcrição salva com sucesso!");
  };

  const handleDelete = (id: string) => {
      if (confirm("Deseja excluir este registro?")) {
          setSavedTranscriptions(prev => prev.filter(t => t.id !== id));
      }
  };

  const handleDownload = (record: TranscriptionRecord, format: 'txt' | 'doc') => {
      const header = `PROMOTORIA DE JUSTIÇA DE NHAMUNDÁ\nCONTROLE DE PRAZOS - TRANSCRIÇÃO\n\nProcesso: ${record.processNumber}\nData: ${new Date(record.date).toLocaleString()}\nTipo: ${record.type}\nLink Original: ${record.originLink || 'N/A'}\n\n==================================================\n\n`;
      const content = record.content;
      const fullText = header + content;

      const mimeType = format === 'doc' ? 'application/msword' : 'text/plain';
      const extension = format;

      const blob = new Blob([fullText], {type: mimeType});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Sanitize filename
      const safeProcess = record.processNumber.replace(/[^a-z0-9]/gi, '_');
      link.download = `Transcricao_${safeProcess}_${new Date(record.date).toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">Ferramentas</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Tool Area */}
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button 
                        onClick={() => setActiveTab('audio')}
                        className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'audio' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center justify-center space-x-2">
                            <Mic size={20}/> <span>Transcrição de Áudio</span>
                        </div>
                    </button>
                    <button 
                        onClick={() => setActiveTab('video')}
                        className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'video' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center justify-center space-x-2">
                            <Video size={20}/> <span>Transcrição de Vídeo</span>
                        </div>
                    </button>
                </div>

                <div className="p-6 md:p-8 flex-1 flex flex-col">
                    
                    {/* Process Number Input (Always visible) */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Número do Processo (Destino)</label>
                        <input 
                            type="text"
                            value={processNumber}
                            onChange={(e) => setProcessNumber(e.target.value)}
                            placeholder="Ex: 0001234-55.2023.8.04.0001"
                            className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium bg-white"
                        />
                    </div>

                    {/* Audio Tab Content */}
                    {activeTab === 'audio' && (
                        <div className="flex flex-col items-center justify-center py-6 space-y-6">
                             <div className="bg-green-50 border border-green-100 p-4 rounded-lg text-sm text-green-800 text-left w-full">
                                <p>Grave ditados ou reuniões rápidas. O áudio será processado automaticamente.</p>
                            </div>
                            
                            <button 
                                onClick={toggleRecording}
                                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                                    isRecording 
                                    ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-200 shadow-xl' 
                                    : 'bg-slate-800 hover:bg-slate-700 shadow-lg'
                                }`}
                            >
                                <Mic size={32} className="text-white" />
                            </button>
                            <p className="text-slate-500 font-medium">
                                {isRecording ? 'Gravando... Clique para parar.' : 'Clique no microfone para gravar'}
                            </p>
                        </div>
                    )}

                    {/* Video Tab Content */}
                    {activeTab === 'video' && (
                        <div className="space-y-6">
                             <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
                                <div className="flex gap-2">
                                    <AlertCircle size={20} className="shrink-0"/>
                                    <div>
                                        <p className="font-bold mb-1">Transcrição de Vídeo com Identificação de Interlocutores</p>
                                        <p>Faça o upload do arquivo de vídeo (MP4, MOV) contendo a audiência ou reunião para realizar a transcrição. A inteligência artificial identificará automaticamente os diferentes falantes.</p>
                                    </div>
                                </div>
                            </div>

                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Arquivo de Vídeo (MP4, MOV)</label>
                                <input 
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleVideoUpload}
                                    accept="video/*"
                                    disabled={isLoading}
                                    className="block w-full text-sm text-slate-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-blue-50 file:text-blue-700
                                    hover:file:bg-blue-100
                                    cursor-pointer"
                                />
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="py-8 flex flex-col items-center justify-center space-y-3 text-blue-600 animate-in fade-in">
                            <Loader2 className="animate-spin" size={32} />
                            <span className="font-medium">Processando com Inteligência Artificial...</span>
                        </div>
                    )}

                    {/* Result Area */}
                    {transcription && (
                        <div className="mt-6 flex-1 flex flex-col animate-in slide-in-from-bottom-5">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-slate-700 text-sm">Resultado da Transcrição:</h4>
                                <button 
                                    onClick={() => setTranscription('')}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                                >
                                    Descartar
                                </button>
                            </div>
                            <textarea 
                                className="w-full flex-1 border border-slate-300 rounded-lg p-4 text-slate-700 leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-slate-50 text-sm"
                                value={transcription}
                                onChange={(e) => setTranscription(e.target.value)}
                            />
                            <div className="mt-4 flex justify-end">
                                <button 
                                    onClick={handleSave}
                                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-2"
                                >
                                    <Save size={18}/> Salvar no Processo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
              </div>
          </div>

          {/* History Sidebar */}
          <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col max-h-[600px] lg:max-h-none">
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <FileText size={20} className="text-slate-500"/> Arquivos Salvos
                      </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {savedTranscriptions.length === 0 ? (
                          <div className="text-center py-10 text-slate-400">
                              <p>Nenhuma transcrição salva.</p>
                          </div>
                      ) : (
                          savedTranscriptions.map((record) => (
                              <div key={record.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50 hover:bg-white hover:shadow-md transition-all group relative">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className="font-bold text-blue-700 text-xs break-all">{record.processNumber}</span>
                                      <button onClick={() => handleDelete(record.id)} className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3">
                                          <Trash2 size={14}/>
                                      </button>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                          record.type === 'Audio' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                                      }`}>
                                          {record.type}
                                      </span>
                                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                          <Calendar size={10}/> {new Date(record.date).toLocaleDateString()}
                                      </span>
                                  </div>
                                  {record.originLink && (
                                       <a href={record.originLink} target="_blank" rel="noreferrer" className="block text-[10px] text-blue-500 hover:underline mb-2 truncate">
                                           {record.originLink}
                                       </a>
                                  )}
                                  <p className="text-xs text-slate-600 line-clamp-3 bg-white p-2 rounded border border-slate-100 mb-3">
                                      {record.content}
                                  </p>
                                  <div className="flex gap-2">
                                      <button 
                                        onClick={() => handleDownload(record, 'txt')}
                                        className="flex-1 flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold py-1.5 rounded border border-slate-200 transition-colors"
                                      >
                                          <Download size={12}/> .TXT
                                      </button>
                                      <button 
                                        onClick={() => handleDownload(record, 'doc')}
                                        className="flex-1 flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold py-1.5 rounded border border-blue-200 transition-colors"
                                      >
                                          <FileType size={12}/> .DOC
                                      </button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Tools;