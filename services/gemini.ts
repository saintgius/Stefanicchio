
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { AnalysisResult, RiskLevel, OracleEvent } from '../types';

export const GeminiService = {
  analyzeMatch: async (
    apiKey: string,
    homeTeam: string,
    awayTeam: string,
    odds: { home: number; draw: number; away: number },
    userFavoriteTeam: string,
    richContext: string,
    weatherContext: string | null,
    newsContext: string | null // NEW PARAMETER FOR NEWS
  ): Promise<AnalysisResult> => {
    
    const ai = new GoogleGenAI({ apiKey });

    const isFavoriteInvolved = 
      (userFavoriteTeam && homeTeam.toLowerCase().includes(userFavoriteTeam.toLowerCase())) || 
      (userFavoriteTeam && awayTeam.toLowerCase().includes(userFavoriteTeam.toLowerCase()));

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        prediction: { type: Type.STRING, description: "Previsione sintetica." },
        risk_level: { type: Type.STRING, enum: [RiskLevel.LOW, RiskLevel.MED, RiskLevel.HIGH], description: "Livello di rischio." },
        recommended_bet: { type: Type.STRING, description: "Giocata Sicura/Consigliata." },
        reasoning: { type: Type.STRING, description: "Motivazione breve." },
        confidence_score: { type: Type.INTEGER, description: "0-100" },
        
        exact_score: { type: Type.STRING, description: "Risultato esatto probabile." },
        bet_1x2: { type: Type.STRING, description: "1, X, o 2." },
        risky_bet: { type: Type.STRING, description: "Giocata alta quota." },
        risky_reasoning: { type: Type.STRING, description: "Perché rischiare." },
        
        tactical_insight: { type: Type.STRING, description: "Analisi Tattica Approfondita (min 150 parole). Cita le partite recenti, il METEO e le NOTIZIE infortuni se rilevanti." },
        key_duels: { type: Type.STRING, description: "Duelli chiave." },
        
        best_value_market: { type: Type.STRING, description: "Mercato con valore." },
        market_reasoning: { type: Type.STRING, description: "Logica matematica." },
        max_drawdown: { type: Type.INTEGER, description: "Max perdite consecutive simulate." },
        cynical_take: { type: Type.STRING, description: "Commento anti-tifo se necessario." }
      },
      required: ["prediction", "risk_level", "recommended_bet", "reasoning", "confidence_score", "exact_score", "bet_1x2", "risky_bet", "risky_reasoning", "tactical_insight", "key_duels", "best_value_market", "market_reasoning", "max_drawdown"]
    };

    let prompt = `Analizza ${homeTeam} vs ${awayTeam}. 
    Quote: 1(${odds.home}), X(${odds.draw}), 2(${odds.away}).
    
    === CONTESTO UFFICIALE E REALE ===
    ${richContext}
    
    ${weatherContext ? `=== CONDIZIONI METEO PREVISTE ===\n${weatherContext}\nConsidera come questo meteo influenza il gioco (es. Pioggia = campo veloce/pesante, Vento = problemi lanci lunghi).` : ''}
    
    ${newsContext ? `=== BREAKING NEWS (FONDAMENTALE) ===\n${newsContext}\nUsa queste notizie (Infortuni, cambi formazione, voci spogliatoio) per correggere l'analisi statistica. Se un top player manca, abbassa la probabilità di vittoria.` : ''}
    ==================================
    
    ISTRUZIONI CRITICHE:
    1. NON ALLUCINARE: Usa SOLO i dati forniti.
    2. TACTICAL INSIGHT: Integra l'analisi del meteo e delle NOTIZIE nella tua visione tattica.
    3. Cerca valore matematico.
    4. Rispondi in ITALIANO.
    `;

    if (isFavoriteInvolved) {
      prompt += `\nATTENZIONE: L'utente tifa ${userFavoriteTeam}. Sii CINICO e spietato sui difetti della sua squadra.`;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          systemInstruction: "Sei un analista di calcio professionista. Basi le tue previsioni ESCLUSIVAMENTE sui dati statistici e sulle NEWS fornite. Se ci sono notizie importanti (infortuni), usale per modificare il pronostico statistico.",
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as AnalysisResult;
      }
      throw new Error("Risposta vuota");
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return {
        prediction: "Dati Insufficienti",
        risk_level: RiskLevel.HIGH,
        recommended_bet: "No Bet",
        reasoning: "Impossibile completare l'analisi tecnica.",
        confidence_score: 0,
        exact_score: "-:-",
        bet_1x2: "N/A",
        risky_bet: "N/A",
        risky_reasoning: "N/A",
        tactical_insight: "Si è verificato un errore durante l'elaborazione dell'analisi AI o i dati di contesto erano insufficienti.",
        key_duels: "N/A",
        best_value_market: "N/A",
        market_reasoning: "N/A",
        max_drawdown: 0,
        timestamp: Date.now()
      };
    }
  },

  // --- ORACLE SIMULATION ---
  simulateMatch: async (
    apiKey: string,
    homeTeam: string,
    awayTeam: string,
    context: string
  ): Promise<OracleEvent[]> => {
    const ai = new GoogleGenAI({ apiKey });
    
    const schema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          minute: { type: Type.INTEGER },
          type: { type: Type.STRING, enum: ['KICKOFF', 'GOAL', 'CARD', 'VAR', 'SUB', 'FULLTIME', 'CHANCE'] },
          team: { type: Type.STRING, nullable: true },
          description: { type: Type.STRING }
        },
        required: ["minute", "type", "description"]
      }
    };

    const prompt = `
      Sei un Cronista Sportivo dal futuro (Anno 2050) che ha accesso agli archivi storici. 
      Devi raccontare la cronaca minuto per minuto della partita ${homeTeam} vs ${awayTeam} che si "è giocata" nel 2025.
      Basati su questi dati reali per rendere la simulazione credibile:
      ${context}
      
      Genera una timeline di 6-8 eventi chiave (Gol, VAR, Occasioni, Cartellini). 
      Il risultato finale deve essere coerente con le statistiche (es. se una squadra è molto più forte, probabilmente vince).
      Sii drammatico ed emozionante.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
      
      if (response.text) {
        return JSON.parse(response.text) as OracleEvent[];
      }
      return [];
    } catch (e) {
      console.error("Oracle Error", e);
      return [];
    }
  },

  // --- TILT DETECTOR ---
  getTiltWarning: async (apiKey: string): Promise<string> => {
     const ai = new GoogleGenAI({ apiKey });
     const prompt = `
       L'utente ha perso 3 scommesse di fila e sta provando a puntare una cifra alta (Rage Betting).
       Scrivi un messaggio breve, cinico, duro e diretto (massimo 20 parole) per dirgli di fermarsi subito.
       Usa un tono da "Coach Cattivo" o da "Amico Brutalmente Onesto".
       Esempio: "Stai regalando soldi al bookmaker perché sei arrabbiato. Spegni il telefono."
     `;
     
     try {
       const response = await ai.models.generateContent({
         model: 'gemini-2.5-flash',
         contents: prompt
       });
       return response.text || "Fermati. Stai giocando per rabbia, non per logica.";
     } catch (e) {
       return "Rilevato Rage Betting. Prenditi una pausa.";
     }
  },

  // --- THE AUTOPSY (Post-Match Analysis) ---
  generateAutopsy: async (
      apiKey: string, 
      betDetails: string
  ): Promise<string> => {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Sono un "Autopsy Bot". L'utente ha perso questa scommessa: "${betDetails}".
        Analizza il fallimento in modo cinico e analitico. 
        Spiega brevemente (max 30 parole) perché è andata male, citando statistiche generali del calcio o sfortuna (xG, VAR, difesa colabrodo).
        Usa un tono ironico ma educativo.
        Esempio: "Hai perso perché la difesa del Milan oggi era in vacanza e tu hai ignorato gli xG del Sassuolo."
      `;

      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt
          });
          return response.text || "Scommessa persa. A volte è solo sfortuna, ma controlla meglio le quote la prossima volta.";
      } catch (e) {
          return "Analisi Autopsy non disponibile.";
      }
  }
};