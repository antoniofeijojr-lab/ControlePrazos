import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { ExtractionResult, AudienceExtractionResult, AdministrativeExtractionResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper robusto para limpar strings JSON que podem conter Markdown ou texto introdutório
const cleanJsonString = (text: string): string => {
    try {
        // Encontra o primeiro '{' e o último '}'
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        
        if (startIndex === -1 || endIndex === -1) {
            // Se não encontrar estrutura JSON, retorna objeto vazio
            return "{}";
        }
        
        // Extrai apenas o conteúdo JSON válido
        return text.substring(startIndex, endIndex + 1);
    } catch (e) {
        return "{}";
    }
};

// Helper to convert file to Base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64 = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 1. General Chat (Gemini 3 Pro)
export const sendChatMessage = async (history: { role: string; parts: { text: string }[] }[], newMessage: string) => {
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    history: history,
    config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2, 
        systemInstruction: `
        Você é um Assistente Jurídico Sênior da Promotoria de Justiça de Nhamundá.
        
        PROTOCOLO DE SEGURANÇA E VERACIDADE (ZERO ALUCINAÇÃO):

        1. **JURISPRUDÊNCIA (RISCO CRÍTICO)**:
           - Se o usuário pedir jurisprudência: VOCÊ DEVE USAR A FERRAMENTA DE BUSCA.
           - Busque especificamente no Jusbrasil (jusbrasil.com.br/jurisprudencia) e sites de tribunais (.jus.br).
           - **PROIBIDO INVENTAR**: Se a busca não retornar um caso real com número e link, diga que não localizou.
           - **PRIORIDADE**: Busque julgados RECENTES (2024, 2025, 2023).

        2. **ESTILO DE REDAÇÃO (HUMANIZADO E PERSUASIVO)**:
           - Evite frases curtas e o uso excessivo de ponto final ("staccato").
           - Construa parágrafos coesos, utilizando conectivos inteligentes (e.g., "haja vista", "porquanto", "nessa toada", "consoante", "posto que").
           - Ao citar jurisprudência, sempre crie um parágrafo introdutório elegante antes da citação e um parágrafo conclusivo analítico após a citação.

        3. **LEGISLAÇÃO**:
           - Use a ferramenta de busca para consultar o PLANALTO (planalto.gov.br).
        `,
    }
  });
  
  const result = await chat.sendMessage({ message: newMessage });
  return result.text;
};

// 2. Fast AI Responses (Gemini 3 Flash)
export const quickSummary = async (text: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Resuma este caso jurídico em 1 frase para controle de prazos: ${text}`,
  });
  return response.text;
};

// 3. Thinking Mode (Gemini 3 Pro with budget)
export const complexDrafting = async (prompt: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
    }
  });
  return response.text;
};

// 4. Search Grounding (Gemini 3 Flash + Google Search)
export const searchLegalInfo = async (query: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  return response;
};

// 4.1 Specialized Jurisprudence Search (Anti-Hallucination - STRICT MODE)
export const searchJurisprudence = async (query: string) => {
  // Query otimizada para buscar EXCLUSIVAMENTE em sites oficiais e JUSBRASIL
  const restrictedQuery = `"${query}" (site:jusbrasil.com.br/jurisprudencia/ OR site:stj.jus.br OR site:stf.jus.br OR site:tjam.jus.br OR site:trf1.jus.br)`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: restrictedQuery,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.1, // Levemente acima de 0 para permitir fluidez na redação dos parágrafos, mas mantendo rigor nos dados.
      systemInstruction: `
        ATUE COMO UM JURISTA SÊNIOR E AUDITOR. 
        
        OBJETIVO: Encontrar jurisprudência REAL e redigir uma fundamentação persuasiva e fluida.

        REGRAS DE DADOS (VERACIDADE ABSOLUTA):
        1. **FONTE OBRIGATÓRIA**: Cite APENAS julgados que apareçam nos 'Grounding Chunks' (resultados da busca).
        2. **RECÊNCIA**: Priorize ABSOLUTAMENTE os julgados mais recentes (2025, 2024, 2023). Se houver julgados antigos e novos, DESCARTE os antigos.
        3. **PROIBIÇÃO**: JAMAIS invente números de processos, relatores ou ementas.

        ESTILO DE REDAÇÃO (PERSUASIVO E FLUIDO):
        1. **Conectivos**: Evite o excesso de ponto final (frases curtas). Use vírgulas e conectivos lógicos (haja vista, porquanto, nessa senda, em que pese, não obstante) para criar um texto que flui naturalmente.
        2. **Estrutura Obrigatória**:
           - **Parágrafo Introdutório**: Introduza o tema e a tese, preparando o leitor para a jurisprudência que virá a seguir. Deve ser um parágrafo argumentativo, não apenas descritivo.
           - **A Citação**: Coloque a ementa/julgado encontrado (com Fonte, Data e Link).
           - **Parágrafo Conclusivo (Pós-Julgado)**: Analise o julgado citado, reforçando como ele pacifica o entendimento ou se aplica ao caso em tese, fechando o raciocínio com firmeza.

        FORMATO DA RESPOSTA:
        Não use listas ou tópicos para a redação. Escreva como se fosse uma petição ou parecer de alta qualidade.
        Ao final da citação, inclua explicitamente o Link de Verificação.
      `
    },
  });
  return response;
};

// 5. Maps Grounding (Gemini 2.5 Flash + Google Maps)
export const searchLocation = async (query: string, location?: { lat: number; lng: number }) => {
  const config: any = {
    tools: [{ googleMaps: {} }],
  };
  
  if (location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: location.lat,
          longitude: location.lng
        }
      }
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: config,
  });
  return response;
};

// 6. Image Generation (Gemini 3 Pro Image)
export const generateImage = async (prompt: string, size: '1K' | '2K' | '4K') => {
  const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
          imageConfig: {
              imageSize: size
          }
      }
  });
  
  // Extract images
  const images: string[] = [];
  if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
              images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
          }
      }
  }
  return images;
};

// 7. Analyze Images (Gemini 3 Pro)
export const analyzeImage = async (file: File, prompt: string) => {
  const imagePart = await fileToGenerativePart(file);
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [imagePart, { text: prompt }]
    }
  });
  return response.text;
};

// 8. Video Understanding (Gemini 3 Pro)
export const analyzeVideo = async (file: File, prompt: string) => {
  const videoPart = await fileToGenerativePart(file);
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
        parts: [videoPart, { text: prompt }]
    }
  });
  return response.text;
}

// 9. Analyze PDF Chat (Gemini 2.5 Flash)
export const analyzePdfChat = async (file: File, prompt: string) => {
    const pdfPart = await fileToGenerativePart(file);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [pdfPart, { text: prompt }]
        }
    });
    return response.text;
}

// 10. Transcribe Audio (Gemini 3 Flash)
export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Audio,
                        mimeType: mimeType
                    }
                },
                { text: "Transcreva este áudio com precisão." }
            ]
        }
    });
    return response.text;
}

// 11. Transcribe Video (Gemini 3 Pro)
export const transcribeVideo = async (file: File) => {
  const videoPart = await fileToGenerativePart(file);
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
        parts: [videoPart, { text: `
          Transcreva o áudio deste vídeo em Português do Brasil.
          
          REGRAS DE TRANSCRIÇÃO:
          1. **Identificação de Interlocutores**: É obrigatório identificar quem está falando. Use termos como "Interlocutor 1", "Interlocutor 2", ou cargos (Juiz, Promotor, Advogado) se for possível inferir pelo contexto visual ou de fala.
          2. **Formato**: Apresente o texto em formato de diálogo/roteiro.
          3. **Precisão**: Transcreva exatamente o que foi dito.
        ` }]
    }
  });
  return response.text;
}

// Shared Prompts Logic
const getExtractionPrompt = (dataType: 'HTML' | 'PDF', content: string) => `
  Analise o ${dataType} fornecido e extraia os dados dos processos judiciais para um JSON estruturado.
  
  LÓGICA PRIORITÁRIA PARA DETECTAR FINALIDADE (detectedPurpose):
  O sistema de origem (PROJUDI/SEEU) exibe um padrão de contagem.
  **REGRA DE OURO:** Se você encontrar no texto um padrão como "Nome da Finalidade (N)" seguido logo abaixo por "N registro(s) encontrado(s)", ENTÃO a finalidade (detectedPurpose) de TODOS os processos extraídos DEVE ser essa.
  
  Exemplo: 
  Texto encontrado: "Ciência (16)" ... "16 registro(s) encontrado(s), exibindo de 1 até 16".
  Conclusão: detectedPurpose = "Ciência". Todos os items na lista 'deadlines' devem ter manifestationPurpose = "Ciência".
  
  REGRAS DE EXTRAÇÃO ESTRITAS:
  
  1. **METADADOS**: Identifique o 'detectedPurpose' (Finalidade) aplicando a regra de ouro acima. Se não houver o padrão de contagem explícito, infira pelo conteúdo predominante.
  
  2. **CAMPOS OBRIGATÓRIOS PARA CADA PROCESSO**:
  
     - **processNumber**: 
       - Extraia o número EXATO conforme aparece visualmente no documento. 
       - **CRÍTICO:** NÃO adicione zeros à esquerda, NÃO complete e NÃO padronize para o formato CNJ se o número original for diferente. 
       - Ignore ícones, caixas de seleção, clipes ou símbolos gráficos que possam estar sobrepostos aos números. O foco é a sequência numérica exata.
     
     - **proceduralClass**: Extraia o nome completo da Classe Processual.
     
     - **mainSubject** (CRÍTICO): 
       - O Assunto Principal é SEMPRE o conteúdo que estiver dentro do **ÚLTIMO parênteses** da descrição.
       
     - **deadlineDuration**: Extraia a duração exata do prazo.
     
     - **startDate**: Data de INÍCIO do prazo (YYYY-MM-DD).
     
     - **endDate**: Data FINAL/Vencimento do prazo (YYYY-MM-DD).
     
     - **defendantStatus** (MUITO IMPORTANTE):
       - "Réu Preso": APENAS se houver menção explícita de "Mandado de Prisão Cumprido", "Prisão Preventiva Vigente", "Flagrante Convertido" ou "Custodiado".
       - "Em Liberdade": Se houver menção a "Alvará de Soltura", "Liberdade Provisória", "Relaxamento de Prisão", "Medidas Cautelares Diversas" ou se o réu estiver solto.
       - "Não Informado": Se não houver informação clara sobre a custódia.
       - NÃO classifique como Preso se ele "responde em liberdade".

     - **prosecutorOffice**:
       - Extraia o nome da Promotoria de Justiça.
       - Use "Promotoria de Justiça de Nhamundá" ou similar completo.
       - NÃO abrevie.

     - **manifestationPurpose**: 
       - Se a REGRA DE OURO (ex: "Ciência (16)") foi ativada, force este campo para ser igual ao detectedPurpose para TODOS os itens.
       - Caso contrário, escolha a melhor opção baseada no item individual: ['Manifestação', 'Ciência', 'Alegacões Finais', 'Oitiva', 'Parecer', 'Pendências de Incidentes', 'Razões/Contrarrazões', 'Análise de Juntadas', 'Promoção', 'Denúncia', 'Outros'].

  Conteúdo: ${content}
`;

const getAudiencePrompt = () => `
  Analise o documento visual (Pauta de Audiência) e extraia os dados para um JSON.
  
  **INSTRUÇÕES CRÍTICAS DE PRECISÃO (OCR):**
  1. **Processo (processNumber):** 
     - Extraia EXATAMENTE a sequência de números e pontuações visível no papel. 
     - **NÃO TENTE CORRIGIR** ou adicionar prefixos (ex: não adicione '000' no início se não estiver escrito). 
     - O sistema PROJUDI varia o formato. Respeite o que está escrito.
     - **IGNORE** ícones (lápis, clips, balões) que possam estar desenhados sobre ou muito próximos ao número.
  
  2. **Data e Hora:**
     - Extraia a data exata. Ignore ícones de calendário sobrepostos.
  
  Extraia para CADA audiência:
  - processNumber: Número exato (string).
  - system: Identifique o sistema se possível (PROJUDI, SEEU, MPV, PJE). Se não explícito, deixe vazio.
  - date: Data da audiência (YYYY-MM-DD)
  - time: Hora da audiência (HH:mm)
  - courtDivision: A Vara ou Juízo onde ocorrerá a audiência. Extraia o nome EXATAMENTE como está escrito.
  - type: Tipo da audiência (ex: Instrução e Julgamento, Custódia, Conciliação, Preliminar)
  - mode: 'Virtual', 'Presencial' ou 'Híbrido' (se não informado, assuma Presencial, a menos que mencione link/sala virtual)
  - link: Link da sala virtual (se houver)
  
  Ordene por horário.
`;

const getAdministrativePrompt = (content: string) => `
    Analise o texto fornecido (extraído do sistema MPV ou similar) e extraia os dados dos Processos Administrativos.

    ESTRUTURA A SER EXTRAÍDA PARA CADA PROCESSO:
    1. **procedureNumber**: Ex: "Procedimento Preparatório Nº 254.2025.000022". Capture o texto completo.
    
    2. **proceduralClass**: OBRIGATÓRIO: O CAMPO DEVE INICIAR COM O CÓDIGO NUMÉRICO.
       - Extraia o texto completo da linha.
       - Se o texto for apenas "Procedimento Preparatório", PROCURE O CÓDIGO NUMÉRICO ASSOCIADO (ex: 910003) no contexto e anexe.
       - Formato Final: "CÓDIGO - DESCRIÇÃO".
    
    3. **mainSubject**: OBRIGATÓRIO: O CAMPO DEVE INICIAR COM O CÓDIGO NUMÉRICO.
       - Extraia TUDO o que estiver no campo Assunto, incluindo o código numérico inicial.
       - Formato Final: "CÓDIGO - DESCRIÇÃO".
    
    4. **originNumber**: Número de Origem (se houver). Se não encontrar, deixe como string vazia.
    
    5. **currentSector**: Extraia o nome completo da Promotoria/Setor.
       - **IMPORTANTE**: Use o nome por extenso, sem siglas isoladas. Ex: "Promotoria de Justiça da Comarca de Nhamundá".
    
    6. **registrationDate**: Data do Registro (YYYY-MM-DD).
    
    7. **secrecyLevel**: Nível de Sigilo (Ex: "Público", "Sigiloso").
    
    8. **legalDeadline**: Data do Prazo Legal / Vencimento do procedimento (YYYY-MM-DD). Se não houver, deixe null.

    OBSERVAÇÕES:
    - O "Prazo CNMP (3 anos)" será calculado pelo frontend.
    - Se houver múltiplas entradas, extraia todas.

    Conteúdo: ${content}
`;

// Updated Schema
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        groupMetadata: {
            type: Type.OBJECT,
            properties: {
                detectedPurpose: { type: Type.STRING },
                totalRecordsInDocument: { type: Type.INTEGER }
            },
            required: ['detectedPurpose', 'totalRecordsInDocument']
        },
        deadlines: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    processNumber: { type: Type.STRING },
                    system: { type: Type.STRING, enum: ['PROJUDI', 'SEEU', 'MPV', 'SEI'] },
                    proceduralClass: { type: Type.STRING },
                    mainSubject: { type: Type.STRING },
                    manifestationPurpose: { type: Type.STRING },
                    defendantStatus: { type: Type.STRING, enum: ['Réu Preso', 'Em Liberdade', 'Não Informado'] },
                    prosecutorOffice: { type: Type.STRING },
                    deadlineDuration: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ['Baixa', 'Média', 'Alta', 'Urgente'] },
                },
                required: ['processNumber', 'endDate', 'manifestationPurpose', 'defendantStatus', 'prosecutorOffice']
            }
        }
    },
    required: ['deadlines']
};

const audienceSchema = {
    type: Type.OBJECT,
    properties: {
        audiences: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    processNumber: { type: Type.STRING },
                    system: { type: Type.STRING },
                    date: { type: Type.STRING },
                    time: { type: Type.STRING },
                    courtDivision: { type: Type.STRING },
                    type: { type: Type.STRING },
                    mode: { type: Type.STRING, enum: ['Virtual', 'Presencial', 'Híbrido'] },
                    link: { type: Type.STRING }
                },
                required: ['processNumber', 'date', 'time', 'type', 'courtDivision']
            }
        }
    },
    required: ['audiences']
};

const administrativeSchema = {
    type: Type.OBJECT,
    properties: {
        processes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    procedureNumber: { type: Type.STRING },
                    proceduralClass: { type: Type.STRING },
                    mainSubject: { type: Type.STRING },
                    originNumber: { type: Type.STRING },
                    currentSector: { type: Type.STRING },
                    registrationDate: { type: Type.STRING },
                    secrecyLevel: { type: Type.STRING },
                    legalDeadline: { type: Type.STRING }
                },
                required: ['procedureNumber', 'proceduralClass', 'registrationDate']
            }
        }
    },
    required: ['processes']
};

// 11. Extract Deadlines from HTML
export const extractDeadlinesFromHtml = async (htmlContent: string): Promise<ExtractionResult> => {
    const cleanHtml = htmlContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/\s+/g, ' ')
        .substring(0, 950000);

    const prompt = getExtractionPrompt('HTML', cleanHtml);

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema
        }
    });

    try {
        const cleanText = cleanJsonString(response.text || '{}');
        const parsed = JSON.parse(cleanText);
        return {
            deadlines: parsed.deadlines || [],
            groupMetadata: parsed.groupMetadata
        };
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return { deadlines: [] };
    }
};

// 12. Extract Deadlines from PDF
export const extractDeadlinesFromPdf = async (file: File): Promise<ExtractionResult> => {
    const pdfPart = await fileToGenerativePart(file);
    const prompt = getExtractionPrompt('PDF', 'Analise o arquivo anexo.');

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [pdfPart, { text: prompt }]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema
        }
    });

    try {
        const cleanText = cleanJsonString(response.text || '{}');
        const parsed = JSON.parse(cleanText);
        return {
            deadlines: parsed.deadlines || [],
            groupMetadata: parsed.groupMetadata
        };
    } catch (e) {
         console.error("JSON Parse Error:", e);
         return { deadlines: [] };
    }
};

// 13. Extract Audiences from PDF
export const extractAudiencesFromPdf = async (file: File): Promise<AudienceExtractionResult> => {
    const pdfPart = await fileToGenerativePart(file);
    const prompt = getAudiencePrompt();

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [pdfPart, { text: prompt }]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: audienceSchema
        }
    });

    try {
        const cleanText = cleanJsonString(response.text || '{}');
        const parsed = JSON.parse(cleanText);
        return {
            audiences: parsed.audiences || [],
            total: parsed.audiences?.length || 0
        };
    } catch (e) {
         console.error("JSON Parse Error:", e);
         return { audiences: [], total: 0 };
    }
}

// 14. Extract Administrative Processes (MPV) - Support PDF and Text
export const extractAdministrativeData = async (input: File | string): Promise<AdministrativeExtractionResult> => {
    let parts: any[] = [];
    let prompt = "";

    if (input instanceof File) {
        const pdfPart = await fileToGenerativePart(input);
        parts = [pdfPart];
        prompt = getAdministrativePrompt("Analise o PDF anexo.");
    } else {
        // String input (Copy & Paste)
        prompt = getAdministrativePrompt(input);
    }

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [...parts, { text: prompt }]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: administrativeSchema
        }
    });

    try {
        const cleanText = cleanJsonString(response.text || '{}');
        const parsed = JSON.parse(cleanText);
        return {
            processes: parsed.processes || [],
            total: parsed.processes?.length || 0
        };
    } catch (e) {
         console.error("JSON Parse Error:", e);
         return { processes: [], total: 0 };
    }
};