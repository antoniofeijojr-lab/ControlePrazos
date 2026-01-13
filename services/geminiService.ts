
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ExtractionResult, AudienceExtractionResult, AdministrativeExtractionResult } from "../types";

const apiKey = process.env.API_KEY || '';
if (!apiKey) {
    console.warn("API Key não encontrada em process.env.API_KEY.");
}
const ai = new GoogleGenAI({ apiKey });

const cleanJsonString = (text: string): string => {
    try {
        let clean = text.replace(/```json/g, '').replace(/```/g, '');
        const startIndex = clean.indexOf('{');
        const endIndex = clean.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
             return clean.substring(startIndex, endIndex + 1);
        }
        const startArr = clean.indexOf('[');
        const endArr = clean.lastIndexOf(']');
        if (startArr !== -1 && endArr !== -1) {
            return clean.substring(startArr, endArr + 1);
        }
        return "{}";
    } catch (e) {
        return "{}";
    }
};

export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  if (!apiKey) throw new Error("API Key não configurada.");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (!base64String) {
          reject(new Error("Falha ao ler o arquivo: base64 vazio."));
          return;
      }
      
      const commaIndex = base64String.indexOf(',');
      const base64 = commaIndex !== -1 ? base64String.substring(commaIndex + 1) : base64String;
      
      let mimeType = file.type;
      if (file.name.toLowerCase().endsWith('.pdf')) {
          mimeType = 'application/pdf';
      } else if (!mimeType) {
          mimeType = 'application/pdf';
      }

      resolve({
        inlineData: {
          data: base64,
          mimeType: mimeType
        }
      });
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo físico."));
    reader.readAsDataURL(file);
  });
};

export const sendChatMessage = async (history: { role: string; parts: { text: string }[] }[], newMessage: string) => {
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    history: history,
    config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2, 
        systemInstruction: 'Você é um Assistente Jurídico Sênior do Sistema da Promotoria de Justiça de Nhamundá. Sua comunicação deve ser formal, técnica e baseada em dados reais.',
    }
  });
  const result = await chat.sendMessage({ message: newMessage });
  return result.text;
};

const getExtractionPrompt = (dataType: 'HTML' | 'PDF', content: string) => `
  O Sistema analisará o ${dataType} fornecido para extrair dados de processos judiciais da Promotoria de Nhamundá.
  REGRAS DE ALTA PRECISÃO:
  1. STATUS PRISIONAL: Identifique se o réu está "Réu Preso" (busque por termos: flagrante, preventiva, custódia, estabelecimento prisional) ou "Em Liberdade" (busque por: alvará, soltura, liberdade provisória). Se não houver certeza, use "Não Informado".
  2. PRIORIDADE: Se houver réu preso ou menção a "URGENTE", a prioridade deve ser "Urgente".
  3. DATAS: 'startDate' (Ciência/Intimação) e 'endDate' (Vencimento Final).
  Campos: processNumber, proceduralClass, mainSubject, deadlineDuration, startDate, endDate, defendantStatus, manifestationPurpose, system, priority.
  ${content}
`;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
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
                    priority: { type: Type.STRING, enum: ['Baixa', 'Média', 'Alta', 'Urgente'] },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING }
                },
                required: ['processNumber', 'endDate', 'startDate', 'defendantStatus', 'priority']
            }
        }
    },
    required: ['deadlines']
};

export const extractDeadlinesFromHtml = async (htmlContent: string): Promise<ExtractionResult> => {
    const cleanHtml = htmlContent.substring(0, 500000);
    const prompt = getExtractionPrompt('HTML', cleanHtml);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: responseSchema }
    });
    const parsed = JSON.parse(cleanJsonString(response.text || '{}'));
    return { deadlines: parsed.deadlines || [] };
};

export const extractDeadlinesFromPdf = async (file: File): Promise<ExtractionResult> => {
    const pdfPart = await fileToGenerativePart(file);
    const prompt = getExtractionPrompt('PDF', 'Extraia os processos com foco absoluto no status prisional (Preso/Liberdade) e urgência.');
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [pdfPart, { text: prompt }] },
        config: { responseMimeType: 'application/json', responseSchema: responseSchema }
    });
    const parsed = JSON.parse(cleanJsonString(response.text || '{}'));
    return { deadlines: parsed.deadlines || [] };
};

export const quickSummary = async (text: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `O Sistema resume este caso jurídico em 1 frase curta: ${text}`,
  });
  return response.text;
};

export const complexDrafting = async (prompt: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 32768 } }
  });
  return response.text;
};

export const searchLegalInfo = async (query: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: { tools: [{ googleSearch: {} }] },
  });
  return response;
};

export const searchJurisprudence = async (query: string) => {
  const restrictedQuery = `"${query}" (site:jusbrasil.com.br/jurisprudencia/ OR site:stj.jus.br OR site:stf.jus.br OR site:tjam.jus.br)`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: restrictedQuery,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.1,
      systemInstruction: 'O Sistema atua como Jurista Sênior. Forneça parágrafos introdutórios, citações reais e análise conclusiva.'
    },
  });
  return response;
};

export const analyzeImage = async (file: File, prompt: string) => {
  const imagePart = await fileToGenerativePart(file);
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [imagePart, { text: prompt }] }
  });
  return response.text;
};

export const analyzeVideo = async (file: File, prompt: string) => {
  const videoPart = await fileToGenerativePart(file);
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [videoPart, { text: prompt }] }
  });
  return response.text;
}

export const analyzePdfChat = async (file: File, prompt: string) => {
    const pdfPart = await fileToGenerativePart(file);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [pdfPart, { text: prompt }] }
    });
    return response.text;
}

export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { data: base64Audio, mimeType: mimeType } }, { text: "O Sistema transcreverá este áudio." }] }
    });
    return response.text;
}

export const transcribeVideo = async (file: File) => {
  const videoPart = await fileToGenerativePart(file);
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [videoPart, { text: "O Sistema transcreverá o áudio deste vídeo." }] }
  });
  return response.text;
}

const audienceSchema = {
    type: Type.OBJECT,
    properties: {
        audiences: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    processNumber: { type: Type.STRING },
                    date: { type: Type.STRING },
                    time: { type: Type.STRING },
                    courtDivision: { type: Type.STRING },
                    type: { type: Type.STRING },
                    mode: { type: Type.STRING, enum: ['Virtual', 'Presencial', 'Híbrido'] }
                },
                required: ['processNumber', 'date', 'time']
            }
        }
    },
    required: ['audiences']
};

export const extractAudiencesFromPdf = async (file: File): Promise<AudienceExtractionResult> => {
    const pdfPart = await fileToGenerativePart(file);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [pdfPart, { text: "O Sistema extrairá audiências em JSON." }] },
        config: { responseMimeType: 'application/json', responseSchema: audienceSchema }
    });
    const parsed = JSON.parse(cleanJsonString(response.text || '{}'));
    return { audiences: parsed.audiences || [], total: parsed.audiences?.length || 0 };
}

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
                    registrationDate: { type: Type.STRING }
                },
                required: ['procedureNumber', 'registrationDate']
            }
        }
    },
    required: ['processes']
};

export const extractAdministrativeData = async (input: File | string): Promise<AdministrativeExtractionResult> => {
    let parts: any[] = [];
    if (input instanceof File) {
        const pdfPart = await fileToGenerativePart(input);
        parts = [pdfPart];
    } else {
        parts = [{ text: input }];
    }
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...parts, { text: "O Sistema extrairá processos administrativos MPV em JSON." }] },
        config: { responseMimeType: 'application/json', responseSchema: administrativeSchema }
    });
    const parsed = JSON.parse(cleanJsonString(response.text || '{}'));
    return { processes: parsed.processes || [], total: parsed.processes?.length || 0 };
};
