

import { OddsData, ProcessedMatch, HistoricalMatch } from '../types';

const BASE_URL = 'https://api.the-odds-api.com/v4/sports';

export const OddsService = {
  fetchMatches: async (apiKey: string, sportKey: string = 'soccer_italy_serie_a'): Promise<ProcessedMatch[]> => {
    try {
      // Fetch odds from ALL available bookmakers to find the best prices
      const response = await fetch(`${BASE_URL}/${sportKey}/odds?regions=eu&markets=h2h&apiKey=${apiKey}`);
      
      if (!response.ok) {
        throw new Error('Errore nel recupero quote');
      }

      const data: OddsData[] = await response.json();

      const processed = data.map(match => {
        // Initialize best odds tracking
        let bestHome = { price: 0, provider: 'N/A' };
        let bestDraw = { price: 0, provider: 'N/A' };
        let bestAway = { price: 0, provider: 'N/A' };

        // Iterate all bookmakers to find the "Super Bookmaker" odds
        match.bookmakers.forEach(bookie => {
            const h2h = bookie.markets.find(m => m.key === 'h2h')?.outcomes;
            if (h2h) {
                const home = h2h.find(o => o.name === match.home_team)?.price;
                const away = h2h.find(o => o.name === match.away_team)?.price;
                const draw = h2h.find(o => o.name === 'Draw')?.price;

                if (home && home > bestHome.price) bestHome = { price: home, provider: bookie.title };
                if (away && away > bestAway.price) bestAway = { price: away, provider: bookie.title };
                if (draw && draw > bestDraw.price) bestDraw = { price: draw, provider: bookie.title };
            }
        });

        // Create consistent ID
        const matchDate = new Date(match.commence_time).toISOString().split('T')[0];
        const slug = `${match.home_team}-${match.away_team}-${matchDate}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

        return {
          id: slug,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          startTime: match.commence_time,
          odds: {
            home: bestHome.price,
            draw: bestDraw.price,
            away: bestAway.price
          },
          providers: {
            home: bestHome.provider,
            draw: bestDraw.provider,
            away: bestAway.provider
          }
        };
      });

      // Sort by date ascending
      return processed.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    } catch (error) {
      console.error("Odds API Error:", error);
      throw error;
    }
  },

  fetchHistory: async (apiKey: string, sportKey: string = 'soccer_italy_serie_a'): Promise<HistoricalMatch[]> => {
    try {
      // Fetch last 90 days
      const response = await fetch(`${BASE_URL}/${sportKey}/scores?daysFrom=90&apiKey=${apiKey}`);
      
      if (!response.ok) {
        throw new Error('Errore nel recupero storico');
      }

      const data: HistoricalMatch[] = await response.json();
      return data.filter(m => m.completed); 
    } catch (error) {
      console.error("History API Error:", error);
      throw error;
    }
  }
};