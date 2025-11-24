
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
        prediction: { type: Type.STRING, description: "Previsione sintetica (es. Vittoria netta Inter)." },
        risk_level: { type: Type.STRING, enum: [RiskLevel.LOW, RiskLevel.MED, RiskLevel.HIGH], description: "Livello di rischio calcolato su 10 fattori." },
        recommended_bet: { type: Type.STRING, description: "La Giocata Principale (Sicura ma con valore)." },
        reasoning: { type: Type.STRING, description: "Analisi tecnica basata sui 10 fattori." },
        confidence_score: { type: Type.INTEGER, description: "0-100" },
        
        exact_score: { type: Type.STRING, description: "Risultato esatto basato su potenziale offensivo/difensivo." },
        bet_1x2: { type: Type.STRING, description: "1, X, o 2." },
        risky_bet: { type: Type.STRING, description: "Giocata alta quota (es. Combo o Marcatore)." },
        risky_reasoning: { type: Type.STRING, description: "Perché rischiare." },

        // STEFANICCHIO'S ARSENAL
        prediction_multigol: { type: Type.STRING, description: "Range gol probabile (es. 2-4, 3-6)." },
        prediction_over_under: { type: Type.STRING, description: "Linea Over/Under migliore." },
        prediction_goalscorer: { type: Type.STRING, description: "Marcatore più probabile." },
        prediction_combo: { type: Type.STRING, description: "Combo Bet logica (es. 1 + NoGoal)." },
        
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

    // CALCOLO MATEMATICO PRE-PROMPT
    const lowestOdd = Math.min(odds.home, odds.away);
    const isImbalanced = lowestOdd < 1.45; 
    const isVeryImbalanced = lowestOdd < 1.25; 
    const isTight = lowestOdd > 2.10; 

    let scenarioInstruction = "";
    if (isVeryImbalanced) {
        scenarioInstruction = "DOMINIO TOTALE. Squadra nettamente superiore. Risultati attesi: 3-0, 4-0, 4-1. NO 1-0 o 2-1.";
    } else if (isImbalanced) {
        scenarioInstruction = "CHIARA FAVORITA. Vittoria probabile con margine. Risultati: 2-0, 3-1. Evita sorprese se non motivate da assenze.";
    } else if (isTight) {
        scenarioInstruction = "EQUILIBRIO/SCACCHI. Match da X, 1-1, 0-0 o vittoria di misura 1-0. Partita decisa da episodi.";
    } else {
        scenarioInstruction = "PARTITA APERTA. Entrambe possono segnare. Focus su Over/Goal.";
    }

    let prompt = `Analizza il match: ${homeTeam} vs ${awayTeam} (${competition}).
    
    QUOTE: 1(${odds.home}) | X(${odds.draw}) | 2(${odds.away}).
    SCENARIO BASE IMPOSTO: ${scenarioInstruction}
    
    === LA MATRICE DEI 10 FATTORI (DEVI VALUTARLI TUTTI) ===
    1. DISPARITÀ TECNICA: Confronta le rose fornite. Chi ha più qualità pura?
    2. STATO DI FORMA: Analizza le ultime 5 partite nel contesto. Chi è in crisi? Chi vola?
    3. FATTORE CAMPO: Quanto pesa lo stadio oggi? (Es. Anfield/San Siro in Champions = Fortino).
    4. INFERMERIA: Controlla le news nel contesto. Manca il bomber? Manca il portiere?
    5. MOTIVAZIONI: Chi ha più bisogno di punti? (Salvezza vs Titolo vs 'Infrasettimanale inutile').
    6. TATTICA: Stili di gioco. Contropiede vs Possesso? Difesa alta vs Lancio lungo?
    7. STORICO (H2H): C'è una bestia nera?
    8. CALENDARIO/FATICA: Hanno giocato 3 giorni fa? C'è il turnover?
    9. METEO: ${weatherContext || "N/D"}. Se piove/vento -> più errori, Under o Over casuali.
    10. DATI GOL: Guarda gol fatti/subiti nel contesto. Difese colabrodo = Goleada.

    === CONTESTO REALE ===
    ${richContext}
    
    ${newsContext ? `ULTIME NEWS:\n${newsContext}` : ''}
    
    COMPITI:
    - Usa la Matrice dei 10 Fattori per dedurre il risultato.
    - Se c'è disparità tecnica E forma positiva -> GOLEADA.
    - Se c'è equilibrio ma difese deboli -> MULTIGOL ALTO.
    - NON ESSERE BANALE. Se i dati dicono 4-0, scrivi 4-0, non 1-0.
    - Stefanicchio vuole precisione sui Marcatori: scegli chi tira i rigori o chi è "on fire" dai dati.
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
          systemInstruction: "Sei un analista calcistico d'élite. Non indovini, CALCOLI. Usi una matrice a 10 fattori per determinare l'esito. Sei allergico ai pronostici banali se i dati suggeriscono altro. Se una squadra è nettamente più forte, prevedi un dominio.",
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
      
      DATI:
      ${context}
      
      Genera 6-8 eventi chiave in ordine cronologico.
      Se una squadra è molto più forte nel contesto, falla dominare (es. gol multipli).
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
