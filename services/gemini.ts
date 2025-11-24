
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
    competition: string = 'Serie A'
  ): Promise<AnalysisResult> => {
    
    const ai = new GoogleGenAI({ apiKey });

    const isFavoriteInvolved = 
      (userFavoriteTeam && homeTeam.toLowerCase().includes(userFavoriteTeam.toLowerCase())) || 
      (userFavoriteTeam && awayTeam.toLowerCase().includes(userFavoriteTeam.toLowerCase()));

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        prediction: { type: Type.STRING, description: "Previsione sintetica (es. Vittoria solida Inter)." },
        risk_level: { type: Type.STRING, enum: [RiskLevel.LOW, RiskLevel.MED, RiskLevel.HIGH], description: "Livello di rischio calcolato su 10 fattori." },
        recommended_bet: { type: Type.STRING, description: "La Giocata Principale (Sicura ma con valore)." },
        reasoning: { type: Type.STRING, description: "Analisi tecnica basata sui 10 fattori." },
        confidence_score: { type: Type.INTEGER, description: "0-100" },
        
        exact_score: { type: Type.STRING, description: "Risultato esatto CALCOLATO (non casuale)." },
        bet_1x2: { type: Type.STRING, description: "1, X, o 2." },
        risky_bet: { type: Type.STRING, description: "Giocata alta quota (es. Combo o Marcatore)." },
        risky_reasoning: { type: Type.STRING, description: "Perché rischiare." },

        // STEFANICCHIO'S ARSENAL
        prediction_multigol: { type: Type.STRING, description: "Range gol probabile (es. 1-3, 2-4)." },
        prediction_over_under: { type: Type.STRING, description: "Linea Over/Under migliore." },
        prediction_goalscorer: { type: Type.STRING, description: "Marcatore più probabile." },
        prediction_combo: { type: Type.STRING, description: "Combo Bet logica (es. 1X + Under 3.5)." },
        
        tactical_insight: { type: Type.STRING, description: "Analisi profonda: possesso, punti deboli, chiavi tattiche." },
        key_duels: { type: Type.STRING, description: "Duelli chiave in campo." },
        
        manager_duel: { type: Type.STRING, description: "Scontro tattico allenatori." },
        stadium_atmosphere: { type: Type.STRING, description: "Influenza pubblico/stadio." },

        best_value_market: { type: Type.STRING, description: "Mercato con valore matematico." },
        market_reasoning: { type: Type.STRING, description: "Logica matematica." },
        max_drawdown: { type: Type.INTEGER, description: "Max perdite consecutive simulate." },
        cynical_take: { type: Type.STRING, description: "Commento anti-tifo se necessario." },
        
        unavailable_players: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista infortunati." },
        key_players_analysis: { type: Type.STRING, description: "Chi è in forma?" }
      },
      required: ["prediction", "risk_level", "recommended_bet", "reasoning", "confidence_score", "exact_score", "bet_1x2", "risky_bet", "risky_reasoning", "prediction_multigol", "prediction_over_under", "prediction_goalscorer", "prediction_combo", "tactical_insight", "key_duels", "manager_duel", "stadium_atmosphere", "best_value_market", "market_reasoning", "max_drawdown"]
    };

    // CALCOLO MATEMATICO PRE-PROMPT (Base Statistica)
    const lowestOdd = Math.min(odds.home, odds.away);
    const favoriteOdd = odds.home < odds.away ? odds.home : odds.away;
    const isSuperFavorite = favoriteOdd < 1.35; // Probabilità > 74%
    const isBalanced = Math.abs(odds.home - odds.away) < 0.50; // Match equilibrato

    let prompt = `Sei il miglior analista calcistico al mondo. Stefanicchio si fida di te.
    Analizza il match: ${homeTeam} vs ${awayTeam} (${competition}).
    
    QUOTE: 1(${odds.home}) | X(${odds.draw}) | 2(${odds.away}).
    
    === ISTRUZIONI CRUCIALI PER IL RISULTATO ESATTO (MATCH DNA PROFILING) ===
    Non guardare solo il nome della lega. Guarda le SQUADRE nel CONTESTO fornito.
    
    1. ANALISI STILE SQUADRE (Dal contesto rose e storico):
       - Squadre "Zemaniane" (es. Atalanta, Barcellona, City, Milan di Fonseca): Tendono all'Over e Goleada.
       - Squadre "Ermetiche" (es. Juventus, Atletico, Inter in trasferta ostica): Tendono all'Under e vittoria di misura.
       
    2. ANALISI FORMA (Dal contesto "Ultime 5 partite"):
       - La favorita segna tanto ultimamente? Se SÌ -> Prevedi goleada (3-0, 3-1, 4-0).
       - La favorita vince ma segna poco? -> Prevedi "Corto Muso" (1-0, 2-0).
       - La sfavorita subisce tanto? -> Se SÌ, autorizza l'Over.
    
    3. COMPETIZIONE COME FATTORE PSICOLOGICO:
       - Serie A: Tatticismo esasperato se le quote sono equilibrate (X, 1-1, 0-0).
       - Champions: Se c'è disparità tecnica, il divario si amplia (Goleada probabile).
       
    4. REGOLA MATEMATICA QUOTE:
       - Se la quota favorita è < 1.30 E la squadra segna molto -> Risultato largo obbligatorio.
       - Se la quota favorita è > 2.00 (Match Pari) -> Risultato stretto obbligatorio (1-1, 2-1, 1-0).

    === LA MATRICE DEI 10 FATTORI (DEVI VALUTARLI TUTTI) ===
    1. DISPARITÀ TECNICA: Valore rosa (vedi contesto Rose).
    2. STATO DI FORMA: Leggi i risultati nel contesto. Chi è in crisi nera?
    3. FATTORE CAMPO: ${homeTeam} in casa è una fortezza?
    4. INFERMERIA: Leggi le news nel contesto. Assenze pesanti in difesa = Più Gol.
    5. MOTIVAZIONI: Salvezza? Scudetto? Passaggio turno?
    6. TATTICA: Scontro stili (Possesso vs Contropiede).
    7. STORICO (H2H): Vedi contesto. Si segnano sempre o mai?
    8. CALENDARIO: Turnover in vista?
    9. METEO: ${weatherContext || "N/D"}. (Pioggia = Più errori = Più gol casuali o match bloccato?)
    10. DATI GOL: Media gol fatti/subiti dalle classifiche nel contesto.

    === CONTESTO REALE (CLASSIFICA, ROSE, NEWS, PRECEDENTI) ===
    ${richContext}
    
    ${newsContext ? `ULTIME NEWS:\n${newsContext}` : ''}
    
    COMPITI FINALI:
    - Sii specifico. "Vittoria Inter" non basta. "Inter vince dominando sulle fasce" è meglio.
    - Se prevedi un risultato alto (es. 4-1), DEVE esserci una giustificazione nei dati (es. difesa avversaria disastrosa).
    - Se prevedi un risultato basso (es. 0-0), DEVE esserci una giustificazione tattica (es. due difese top).
    `;

    if (isFavoriteInvolved) {
        prompt += `\nNOTA: L'utente tifa ${userFavoriteTeam}. Sii brutale e onesto, non illuderlo.`;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          systemInstruction: "Sei un analista calcistico tattico. Il tuo obiettivo è il profitto a lungo termine. Non hai bias sulla lega, guardi solo i dati delle squadre in campo. Odi i pronostici banali.",
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
        reasoning: "Impossibile completare l'analisi a 10 fattori.",
        confidence_score: 0,
        exact_score: "-:-",
        bet_1x2: "N/A",
        risky_bet: "N/A",
        risky_reasoning: "N/A",
        prediction_multigol: "N/A",
        prediction_over_under: "N/A",
        prediction_goalscorer: "N/A",
        prediction_combo: "N/A",
        tactical_insight: "Errore tecnico AI.",
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
      Simula la cronaca della partita ${homeTeam} vs ${awayTeam}.
      
      DATI SQUADRE E STATISTICHE:
      ${context}
      
      Genera 6-8 eventi chiave in ordine cronologico.
      Se nel contesto una squadra è molto più forte (classifica/forma), la simulazione DEVE riflettere questo dominio.
      Se sono vicine in classifica, crea un match combattuto.
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
      return [];
    }
  },

  getTiltWarning: async (apiKey: string): Promise<string> => {
     const ai = new GoogleGenAI({ apiKey });
     try {
       const response = await ai.models.generateContent({
         model: 'gemini-2.5-flash',
         contents: "L'utente sta scommettendo per rabbia (Tilt). Dagli uno stop perentorio in 10 parole. Tono militare."
       });
       return response.text || "STOP. Stai regalando soldi al banco. Chiudi l'app.";
     } catch (e) {
       return "Rilevato Rage Betting. Prenditi una pausa.";
     }
  },

  generateAutopsy: async (
      apiKey: string, 
      betDetails: string
  ): Promise<string> => {
      const ai = new GoogleGenAI({ apiKey });
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Analizza perché questa scommessa è stata persa: "${betDetails}". Sii cinico, tecnico e breve (max 25 parole).`
          });
          return response.text || "Scommessa persa. Analisi non disponibile.";
      } catch (e) {
          return "Analisi non disponibile.";
      }
  }
};
