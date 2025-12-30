import { Deadline, Priority, SystemType } from '../types';
import { v4 as uuidv4 } from 'uuid'; // We'll assume a simple ID generator or use random string

// Simple unique ID generator if uuid isn't available
const generateId = () => Math.random().toString(36).substr(2, 9);

export const parseDeadlinesFromHtml = (htmlContent: string): Deadline[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const rows = Array.from(doc.querySelectorAll('tr'));
  
  const extractedDeadlines: Deadline[] = [];
  
  // Regex patterns
  // CNJ format: NNNNNNN-DD.YYYY.J.TR.OOOO (Allows for some whitespace robustness)
  const processRegex = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/; 
  // Date format: DD/MM/YYYY
  const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/;

  rows.forEach((row) => {
    // CRITICAL FIX: Use textContent instead of innerText for DOMParser compatibility
    const rawText = row.textContent || '';
    const text = rawText.replace(/\s+/g, ' ').trim(); // Normalize whitespace
    
    // Attempt to find a process number
    const processMatch = text.match(processRegex);
    // Attempt to find a date (assuming the first date found is the due date)
    const dateMatch = text.match(dateRegex);

    if (processMatch && dateMatch) {
      const processNumber = processMatch[0];
      
      // Parse Date (DD/MM/YYYY to Date object)
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1; // Month is 0-indexed
      const year = parseInt(dateMatch[3], 10);
      const endDate = new Date(year, month, day);

      // Infer System based on context or default to PROJUDI
      let system = SystemType.PROJUDI;
      const lowerText = text.toLowerCase();
      if (lowerText.includes('seeu')) system = SystemType.SEEU;
      else if (lowerText.includes('sei')) system = SystemType.SEI;
      else if (lowerText.includes('mpv') || lowerText.includes('simba')) system = SystemType.MPV;

      extractedDeadlines.push({
        id: generateId(),
        processNumber,
        system,
        proceduralClass: "Extraído via Regex",
        mainSubject: "Geral",
        manifestationPurpose: 'Manifestação',
        parties: "Verificar nos autos",
        prosecutorOffice: "Promotoria da Comarca de Nhamundá", // Default
        deadlineDuration: "?",
        startDate: new Date(),
        endDate: endDate,
        priority: Priority.MEDIUM,
        status: 'Pendente',
        defendantStatus: 'Não Informado'
      });
    }
  });

  return extractedDeadlines;
};