
import { OddsData, ProcessedMatch, HistoricalMatch } from '../types';

const BASE_URL = 'https://api.the-odds-api.com/v4/sports';

export const OddsService = {
  fetchMatches: async (apiKey: string, sportKey: string = 'soccer_italy_serie_a'): Promise<ProcessedMatch[]> => {
    try {
      const response = await fetch(`${BASE_URL}/${sportKey}/odds?regions=eu&markets=h2h&apiKey=${apiKey}`);
      
      if (!response.ok) {
        throw new Error('Errore nel recupero quote');
      }

      const data: OddsData[] = await response.json();

      const processed = data.map(match => {
        const h2h = match.bookmakers[0]?.markets.find(m => m.key === 'h2h')?.outcomes;
        
        // Find odds safely
        const homeOdd = h2h?.find(o => o.name === match.home_team)?.price || 0;
        const awayOdd = h2h?.find(o => o.name === match.away_team)?.price || 0;
        const drawOdd = h2h?.find(o => o.name === 'Draw')?.price || 0;

        // Create consistent ID
        const matchDate = new Date(match.commence_time).toISOString().split('T')[0];
        const slug = `${match.home_team}-${match.away_team}-${matchDate}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

        return {
          id: slug,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          startTime: match.commence_time,
          odds: {
            home: homeOdd,
            draw: drawOdd,
            away: awayOdd
          }
        };
      });

      // Sort by date ascending for "Next Matchday" filtering
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
