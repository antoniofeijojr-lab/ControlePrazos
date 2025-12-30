
export enum SystemType {
  PROJUDI = 'PROJUDI',
  SEEU = 'SEEU',
  MPV = 'MPV',
  SEI = 'SEI'
}

export enum Priority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  URGENT = 'Urgente'
}

export type DefendantStatus = 'Réu Preso' | 'Em Liberdade' | 'Não Informado';

export type ManifestationPurpose = 
  | 'Manifestação' 
  | 'Ciência' 
  | 'Alegacões Finais' 
  | 'Oitiva' 
  | 'Parecer' 
  | 'Pendências de Incidentes' 
  | 'Razões/Contrarrazões' 
  | 'Análise de Juntadas' 
  | 'Promoção' 
  | 'Denúncia'
  | 'Outros';

export type PromoterDecision = 
  | 'Pendente' 
  | 'Assinado' 
  | 'Assinatura em Lote'
  | 'Assinatura com Alterações'
  | 'Minuta Substituída'
  | 'Protocolo de recursos'
  | 'Devolvido';

export type AdvisorStatus = 'Pendente' | 'Minuta Pronta' | 'Em Correção';

export interface Deadline {
  id: string;
  processNumber: string; 
  courtDivision?: string; // Vara / Juízo
  system: SystemType;
  proceduralClass: string; 
  mainSubject: string; 
  manifestationPurpose: ManifestationPurpose; 
  defendantStatus: DefendantStatus; 
  prosecutorOffice: string; 
  deadlineDuration: string; 
  startDate: Date; 
  endDate: Date; 
  priority: Priority;
  status: 'Pendente' | 'Em Análise' | 'Concluído';
  isArchived?: boolean; // Flag para controle de arquivo
  
  // Workflow fields
  advisorDraftType?: string; // Tipo de Minuta feita pelo assessor (Agora: Peça Jurídica)
  advisorStatus?: AdvisorStatus; // Status do trabalho do assessor
  promoterDecision?: PromoterDecision; // Decisão da Promotora
  returnReason?: string; // Motivo da devolução (Texto rico)
  instruction?: string; // Instrução da Promotora para o Assessor (Novo Campo)
  parties?: string; // Mantido na estrutura para compatibilidade, mas oculto na UI
}

export interface Audience {
  id: string;
  processNumber: string;
  system?: string; // Novo campo para o sistema (PROJUDI, SEEU, etc.)
  courtDivision?: string; // Vara / Juízo (Novo campo principal)
  proceduralClass?: string; // Novo: Preenchimento manual
  mainSubject?: string; // Novo: Preenchimento manual
  date: Date;
  time: string; // HH:mm
  type: string; // Instrução e Julgamento, Custódia, etc.
  mode: 'Virtual' | 'Presencial' | 'Híbrido';
  parties?: string; // Mantido opcionalmente
  status: 'Agendada' | 'Realizada' | 'Cancelada' | 'Redesignada';
  link?: string; // Link da sala virtual
  notes?: string;
}

// --- TIPOS PARA O MÓDULO ADMINISTRATIVO (MPV) ---

export type AdminPartyType = 
  | 'Advogado' 
  | 'Investigado (Pólo Passivo)' 
  | 'Noticiado (Pólo Passivo)' 
  | 'Noticiante (Pólo Ativo)' 
  | 'Interessado (Pólo Ativo)' 
  | 'Interessado (Pólo Passivo)';

export type AdminDeadlineStatus = 'Em dia' | 'Atrasado' | 'Prorrogado';

export interface InterestedParty {
    id: string;
    name: string;
    type: AdminPartyType;
}

export interface AdministrativeProcess {
    id: string;
    procedureNumber: string; // Ex: Procedimento Preparatório Nº 254.2025.000022
    proceduralClass: string; // Classe
    mainSubject: string; // Assunto Principal
    originNumber?: string; // Número de Origem
    currentSector: string; // Setor Atual
    registrationDate: Date; // Registro
    secrecyLevel: string; // Nível de Sigilo
    
    // Prazos
    legalDeadline: Date; // Prazo Legal (Prioridade)
    cnmpDeadline: Date; // Prazo de 3 anos CNMP
    status: AdminDeadlineStatus; // Calculado ou manual
    
    // Pessoas
    interestedParties: InterestedParty[];
    
    isArchived: boolean;
    notes?: string;
}

export interface TranscriptionRecord {
  id: string;
  processNumber: string;
  type: 'Audio' | 'Video';
  content: string;
  date: Date;
  originLink?: string; // Para vídeos do Teams/Meet
}

export interface ExtractionResult {
  deadlines: any[]; 
  groupMetadata?: {
    detectedPurpose: ManifestationPurpose;
    totalRecordsInDocument: number; 
  };
}

export interface AudienceExtractionResult {
  audiences: any[];
  total: number;
}

// Resultado da extração Administrativa
export interface AdministrativeExtractionResult {
    processes: any[];
    total: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  attachments?: {
    type: 'image' | 'video' | 'audio';
    url: string; 
  }[];
  isThinking?: boolean;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        reviewText: string;
      }[]
    }
  };
}

export interface SearchResult {
  text: string;
  chunks: GroundingChunk[];
}
