

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
    newsContext: string | null,
    competition: string = 'Serie A' // NEW PARAMETER
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
        
        tactical_insight: { type: Type.STRING, description: "Analisi Tattica Approfondita (min 150 parole). Usa i NOMI DEI GIOCATORI reali presenti nelle ROSE fornite nel contesto. Cita duelli specifici e caratteristiche tecniche." },
        key_duels: { type: Type.STRING, description: "Duelli chiave (es. Attaccante X vs Difensore Y)." },
        
        manager_duel: { type: Type.STRING, description: "Analisi breve dello scontro tra allenatori (nomi, moduli e chi ha la meglio tatticamente)." },
        stadium_atmosphere: { type: Type.STRING, description: "Analisi breve del fattore campo (tifosi, stadio caldo, pressione)." },

        best_value_market: { type: Type.STRING, description: "Mercato con valore." },
        market_reasoning: { type: Type.STRING, description: "Logica matematica." },
        max_drawdown: { type: Type.INTEGER, description: "Max perdite consecutive simulate." },
        cynical_take: { type: Type.STRING, description: "Commento anti-tifo se necessario." },
        
        unavailable_players: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista di nomi di giocatori infortunati/squalificati estratti dalle NEWS/REPORT MEDICO. Se non citati, lascia vuoto." },
        key_players_analysis: { type: Type.STRING, description: "Analisi breve (max 30 parole) su chi è in forma, basandoti sui tag [TOP SCORER] e sulle news di formazione." }
      },
      required: ["prediction", "risk_level", "recommended_bet", "reasoning", "confidence_score", "exact_score", "bet_1x2", "risky_bet", "risky_reasoning", "tactical_insight", "key_duels", "manager_duel", "stadium_atmosphere", "best_value_market", "market_reasoning", "max_drawdown"]
    };

    let competitionInstruction = "";
    if (competition.includes('Champions') || competition.includes('CL')) {
        competitionInstruction = `
        IMPORTANTE - CONTESTO CHAMPIONS LEAGUE (NOTTI MAGICHE):
        1. Questa è l'Elite. Le squadre giocano diversamente che in campionato.
        2. "DNA EUROPEO": Squadre come Real Madrid, Milan, Liverpool hanno un bonus mentale enorme in questa competizione.
        3. FATTORE CAMPO: Giocare ad Anfield, San Siro, Westfalenstadion cambia le partite. Consideralo.
        4. MOTIVAZIONI: Chi deve vincere per forza? Chi è già qualificato?
        5. GESTIONE ALLENATORI: I top coach preparano queste gare sui dettagli.
        `;
    } else {
        competitionInstruction = `
        IMPORTANTE - CONTESTO SERIE A (TATTICISMO):
        1. Il campionato italiano è scacchi. Molta tattica, difese chiuse.
        2. Considera la stanchezza post-coppe se hanno giocato in settimana.
        3. Scontri salvezza o alta classifica? La paura di perdere spesso porta al pareggio (X).
        `;
    }

    let prompt = `Analizza ${homeTeam} vs ${awayTeam} (${competition}). 
    Quote: 1(${odds.home}), X(${odds.draw}), 2(${odds.away}).
    
    ${competitionInstruction}

    === CONTESTO UFFICIALE E REALE ===
    ${richContext}
    
    ${weatherContext ? `=== CONDIZIONI METEO PREVISTE ===\n${weatherContext}\nConsidera come questo meteo influenza il gioco.` : ''}
    
    ${newsContext ? `=== BREAKING NEWS (FONDAMENTALE) ===\n${newsContext}\nUsa queste notizie (Infortuni, cambi formazione, voci spogliatoio) per correggere l'analisi statistica.` : ''}
    ==================================
    
    ISTRUZIONI CRITICHE PER L'ANALISI:
    1. NON ALLUCINARE: Usa SOLO i dati forniti.
    2. SQUADS & PLAYERS: Nel contesto sopra hai le ROSE COMPLETE.
    3. MEDICAL REPORT: Estrai infortuni reali.
    4. DUELLO ALLENATORI: Analizza lo scontro in panchina.
    5. FATTORE STADIO: Quanto influirà il pubblico?
    6. Rispondi in ITALIANO.
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
          systemInstruction: "Sei un analista di calcio professionista specializzato in Betting Exchange e Analisi Tattica Avanzata. Non dare risposte banali. Analizza i matchup tattici.",
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
        manager_duel: "N/A",
        stadium_atmosphere: "N/A",
        best_value_market: "N/A",
        market_reasoning: "N/A",
        max_drawdown: 0,
        unavailable_players: [],
        key_players_analysis: "N/A",
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
      
      === DATI REALI ===
      ${context}
      
      Genera una timeline di 6-8 eventi chiave (Gol, VAR, Occasioni, Cartellini). 
      IMPORTANTE: Usa i nomi REALI dei giocatori forniti nelle rose (squads) nel contesto sopra. Cita gli assistman.
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