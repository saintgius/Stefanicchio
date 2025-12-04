
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { AnalysisResult, RiskLevel, OracleEvent, ProcessedMatch } from '../types';
import { StorageService } from './storage';
import { PredictionEngine } from './prediction-engine';

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

    // FETCH LEARNING HISTORY FROM STORAGE
    const learningContext = StorageService.getLearningContext();

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
        exact_score_reasoning: { type: Type.STRING, description: "Breve spiegazione logica del risultato esatto (max 15 parole) basata su attacco/difesa." },
        bet_1x2: { type: Type.STRING, description: "1, X, o 2." },
        risky_bet: { type: Type.STRING, description: "Giocata alta quota (es. Combo o Marcatore)." },
        risky_reasoning: { type: Type.STRING, description: "Perché rischiare." },

        // STEFANICCHIO'S ARSENAL
        prediction_multigol: { type: Type.STRING, description: "Range gol probabile (es. 1-3, 2-4)." },
        prediction_over_under: { type: Type.STRING, description: "Linea Over/Under migliore." },
        prediction_goalscorer: { type: Type.STRING, description: "Marcatore più probabile." },
        prediction_combo: { type: Type.STRING, description: "Combo Bet logica (es. 1X + Over 1.5)." },

        tactical_insight: { type: Type.STRING, description: "Analisi profonda: moduli, chiavi tattiche, mismatch (es. Fasce vs Centro)." },
        key_duels: { type: Type.STRING, description: "Duelli chiave in campo." },

        manager_duel: { type: Type.STRING, description: "Scontro tattico allenatori." },
        stadium_atmosphere: { type: Type.STRING, description: "Influenza pubblico/stadio." },

        predicted_formation_home: { type: Type.STRING, description: "Modulo tattico probabile Casa (es. 3-5-2)." },
        predicted_formation_away: { type: Type.STRING, description: "Modulo tattico probabile Ospite (es. 4-3-3)." },

        turnover_alert: { type: Type.STRING, description: "Avviso se mancano titolari chiave (es. 'Mancano Lautaro e Barella'). Se titolari, lascia vuoto." },
        referee_analysis: { type: Type.STRING, description: "Analisi arbitro (Nome, media cartellini, tendenza)." },

        best_value_market: { type: Type.STRING, description: "Mercato con valore matematico." },
        market_reasoning: { type: Type.STRING, description: "Logica matematica." },
        max_drawdown: { type: Type.INTEGER, description: "Max perdite consecutive simulate." },
        cynical_take: { type: Type.STRING, description: "Commento anti-tifo se necessario." },

        unavailable_players: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista infortunati." },
        key_players_analysis: { type: Type.STRING, description: "Chi è in forma?" }
      },
      required: ["prediction", "risk_level", "recommended_bet", "reasoning", "confidence_score", "exact_score", "exact_score_reasoning", "bet_1x2", "risky_bet", "risky_reasoning", "prediction_multigol", "prediction_over_under", "prediction_goalscorer", "prediction_combo", "tactical_insight", "key_duels", "manager_duel", "stadium_atmosphere", "predicted_formation_home", "predicted_formation_away", "best_value_market", "market_reasoning", "max_drawdown", "referee_analysis"]
    };

    // --- LEAGUE SPECIFIC LOGIC (THE BRAIN) ---
    let leagueContext = "";
    if (competition.includes('Premier')) {
      leagueContext = `
        [[[ MODALITÀ PREMIER LEAGUE ATTIVA ]]]
        - FISICA E RITMO: Qui non si gestisce. Si corre per 90 minuti. I ribaltoni finali sono frequenti.
        - FATTORE CASA: Gli stadi inglesi spingono. Le piccole in casa possono aggredire le grandi.
        - ARBITRAGGIO: Si fischia meno ("Let it flow"). Meno falli tattici, più intensità.
        - GOL: Tendenza all'Over e al "Goal" (Entrambe segnano) più alta rispetto all'Italia.
        - ALLENATORI: Analizza lo scontro tra filosofie (es. Pep Guardiola vs Calcio diretto).
        `;
    } else if (competition.includes('Champions')) {
      leagueContext = `
        [[[ MODALITÀ CHAMPIONS LEAGUE ATTIVA ]]]
        - DNA EUROPEO: Real, Bayern, Liverpool si trasformano. La storia conta.
        - DOPPIO CONFRONTO: Se è un ritorno, considera l'andata.
        - DIFFERENZA RETI: Spesso c'è un divario tecnico enorme nei gironi/fase lega -> Goleade possibili.
        `;
    } else {
      leagueContext = `
        [[[ MODALITÀ SERIE A ATTIVA ]]]
        - TATTICISMO: Le difese vincono le partite. L'1-0 è un risultato sacro.
        - GESTIONE: Chi va in vantaggio tende a chiudersi (Catenaccio moderno).
        - PAREGGI: Il pareggio tattico è un risultato molto più frequente che in Premier.
        `;
    }

    let prompt = `Sei il miglior analista calcistico al mondo. Stefanicchio si fida di te.
    Analizza il match: ${homeTeam} vs ${awayTeam} (${competition}).
    
    QUOTE: 1(${odds.home}) | X(${odds.draw}) | 2(${odds.away}).
    
    ${leagueContext}
    
    === MATCH DNA PROFILING (INTELLIGENZA ADATTIVA) ===
    1. STILE OFFENSIVO vs DIFENSIVO:
       - Guarda i gol fatti e subiti nel contesto.
       - Se due squadre segnano molto, prevedi gol.
       - Se due squadre sono chiuse, rispetta l'Under.
    
    2. DISPARITÀ TECNICA:
       - Super favorita (< 1.40) + Avversario debole in difesa = GOLEADA (specialmente in Premier/Champions).
       - Super favorita + Avversario solido = 1-0/2-0 (specialmente in Serie A).
       
    3. CHECK COLABRODO:
       - Controlla "Ultime 5 partite" nel contesto. Se subiscono 3+ gol spesso, aumenta probabilità Over.

    === REGOLA SUPREMA ANTI-ALLUCINAZIONE GIOCATORI ===
    1. LEGGI LA SEZIONE "*** CANNONIERI UFFICIALI ***" E "ROSA COMPLETA" NEL CONTESTO SOTTOSTANTE.
    2. USA SOLO I NOMI PRESENTI IN QUELLE LISTE.
    3. SE NON TROVI DATI SU UN GIOCATORE, NON INVENTARE GOL O FORMA.

    === ANALISI TATTICA & FORMAZIONI (ENHANCED) ===
    1. INFERISCI LA FORMAZIONE: Basandoti sulla lista della rosa nel contesto e sullo stile dell'allenatore (es. Inzaghi usa sempre 3-5-2, Motta 4-2-3-1), prevedi il modulo per entrambe le squadre.
    2. ANALISI H2H (PRECEDENTI): Cerca nella sezione 'PRECEDENTI DIRETTI' del contesto.
       - C'è una "Bestia Nera"? Una squadra che vince sempre contro l'altra?
       - I match finiscono spesso Over o Under?
       - Considera questo dato pesantemente nel calcolo del 'confidence_score'.

    === MEMORIA STORICA (FEEDBACK LOOP) ===
    Ecco come sono andate le tue previsioni passate (Impara dai tuoi errori/successi):
    ${learningContext}

    === LA MATRICE DEI 10 FATTORI ===
    1. DISPARITÀ TECNICA: Valore rosa.
    2. STATO DI FORMA: Leggi "ULTIME 5 PARTITE" nel contesto. Chi arriva meglio? Chi segna di più?
    3. FATTORE CAMPO: ${homeTeam} in casa.
    4. INFERMERIA: Assenze (Vedi news e contesto).
    5. MOTIVAZIONI: Classifica.
    6. TATTICA: Scontro stili (es. Possesso vs Contropiede). Analizza moduli previsti.
    7. STORICO (H2H): Precedenti diretti. Trend vittorie/gol.
    8. CALENDARIO: Turnover?
    9. METEO: ${weatherContext || "N/D"}.
    10. DATI GOL: Media gol reale.
    
    11. DOSSIER ARBITRO: Stima un arbitro probabile o analizza lo stile arbitrale tipico.
    12. TURNOVER SCANNER: Leggi le NEWS e il CONTESTO per rilevare turnover massiccio.

    === CONTESTO REALE (CLASSIFICA, MARCATORI, ROSE, PRECEDENTI) ===
    ${richContext}
    
    ${newsContext ? `ULTIME NEWS:\n${newsContext}` : ''}
    
    ${(() => {
        try {
          const matchData: ProcessedMatch = {
            id: `${homeTeam}-${awayTeam}`,
            homeTeam,
            awayTeam,
            startTime: new Date().toISOString(),
            odds,
            providers: { home: '', draw: '', away: '' }
          };
          const leagueCode = competition.includes('Premier') ? 'PL' : competition.includes('Champions') ? 'CL' : 'SA';
          return PredictionEngine.generateEnhancedContext(matchData, leagueCode);
        } catch (e) {
          return '(Prediction Engine: dati insufficienti)';
        }
      })()}
    
    COMPITI FINALI:
    - RISPETTA I CALCOLI MATEMATICI: Se il Prediction Engine rileva un VALUE BET, evidenzialo fortemente nel consiglio.
    - Usa il risultato esatto suggerito dal Poisson come base, modificalo solo se hai forti ragioni contestuali.
    - Compila i campi 'predicted_formation_home' e 'predicted_formation_away' con i moduli (es. 4-3-3).
    - Usa 'tactical_insight' per spiegare come i moduli interagiscono (es. "Il 3-5-2 dell'Inter soffrirà gli esterni del 4-3-3").
    - Se il precedente storico è netto, citalo nel 'reasoning'.
    - Compila 'exact_score_reasoning' spiegando BREVEMENTE perché quel risultato (es. "Inter in forma, Milan troppi gol subiti").
    `;

    if (isFavoriteInvolved) {
      prompt += `\nNOTA: L'utente tifa ${userFavoriteTeam}. Sii brutale e onesto.`;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          systemInstruction: "Sei un analista calcistico esperto. Non inventi mai statistiche. Usi solo i dati forniti nel contesto. Deduzione tattica basata sulle rose.",
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
        predicted_formation_home: "N/A",
        predicted_formation_away: "N/A",
        timestamp: Date.now()
      };
    }
  },

  scanTicket: async (apiKey: string, imageBase64: string): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey });

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        bets: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              match: { type: Type.STRING },
              selection: { type: Type.STRING },
              odds: { type: Type.NUMBER }
            },
            required: ["match", "selection", "odds"]
          }
        },
        totalStake: { type: Type.NUMBER },
        totalOdds: { type: Type.NUMBER }
      },
      required: ["bets", "totalStake", "totalOdds"]
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64
            }
          },
          {
            text: "Analizza questa immagine di una schedina/scommessa calcistica. Estrai i dettagli. Se non trovi lo Stake (Puntata), metti 0."
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
      return null;
    } catch (e) {
      console.error("OCR Error", e);
      throw new Error("Impossibile leggere la schedina.");
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
      Se nel contesto una squadra è molto più forte, rifletti questo dominio.
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
  },

  generateSmartSlip: async (
    apiKey: string,
    matchesList: string,
    criteria: { stake: number, multiplier: number, risk: string, league: string }
  ): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey });

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        bets: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              match: { type: Type.STRING },
              selection: { type: Type.STRING },
              odds: { type: Type.NUMBER },
              reason: { type: Type.STRING }
            },
            required: ["match", "selection", "odds", "reason"]
          }
        },
        totalOdds: { type: Type.NUMBER },
        strategyName: { type: Type.STRING }
      },
      required: ["bets", "totalOdds", "strategyName"]
    };

    const prompt = `
          Sei un Bookmaker/Tipster professionista. Genera una schedina vincente.
          
          CRITERI UTENTE:
          - Budget: ${criteria.stake}€
          - Obiettivo Moltiplicatore: x${criteria.multiplier}
          - Rischio: ${criteria.risk}
          - Competizione: ${criteria.league}
          
          LISTA PARTITE E QUOTE 1X2 DISPONIBILI:
          ${matchesList}
          
          ISTRUZIONI CRITICHE (MERCATI VARIABILI):
          1. NON limitarti all'1X2. Devi spaziare tra i mercati per trovare valore.
          2. PUOI SUGGERIRE:
             - Multigol (es. 1-3, 2-4, 2-5)
             - Goal / No Goal
             - Under / Over (1.5, 2.5, 3.5)
             - Doppia Chance (1X, X2, 12)
             - Combo (es. 1X + Over 1.5)
          
          3. STIMA DELLE QUOTE:
             - Poiché hai solo le quote 1X2 in input, devi *STIMARE* realisticamente la quota del mercato alternativo basandoti sui rapporti di forza.
             - Esempio: Se la Favorita è a 1.30, l'Over 2.5 sarà circa 1.50-1.60.
             - Esempio: Se è un match equilibrato (2.80 - 3.00 - 2.80), l'Under 2.5 o Goal sarà circa 1.70-1.80.
             - Sii conservativo nelle stime.

          4. COSTRUZIONE SCHEDINA:
             - Seleziona le 3-6 partite migliori per raggiungere la quota totale obiettivo (x${criteria.multiplier}).
             - Motiva ogni scelta in poche parole.
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
        return JSON.parse(response.text);
      }
      return null;
    } catch (e) {
      console.error("Smart Generator Error", e);
      throw new Error("Impossibile generare schedina.");
    }
  }
};
