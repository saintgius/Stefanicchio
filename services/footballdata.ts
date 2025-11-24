
import { LeagueStanding, FootballDataMatch, TopScorer, TeamSquad } from '../types';

const BASE_URL = 'https://api.football-data.org/v4';

// Proxy per aggirare le restrizioni CORS dei browser (fondamentale per client-side apps)
const PROXY_URL = 'https://corsproxy.io/?';

export const FootballDataService = {
  
  fetchStandings: async (apiKey: string, competitionCode: string = 'SA'): Promise<LeagueStanding[]> => {
    try {
      const targetUrl = `${BASE_URL}/competitions/${competitionCode}/standings`;
      // Wrappiamo l'URL con il proxy e codifichiamo i parametri
      const finalUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

      const response = await fetch(finalUrl, {
        headers: { 'X-Auth-Token': apiKey }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore fetch classifica (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      // La classifica totale è solitamente il primo elemento dell'array 'standings' con type='TOTAL'
      return data.standings?.[0]?.table || [];
    } catch (error) {
      console.error("FootballData Standings Error:", error);
      throw error;
    }
  },

  fetchSeasonMatches: async (apiKey: string, competitionCode: string = 'SA'): Promise<FootballDataMatch[]> => {
    try {
      const targetUrl = `${BASE_URL}/competitions/${competitionCode}/matches?status=FINISHED`;
      const finalUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

      const response = await fetch(finalUrl, {
         headers: { 'X-Auth-Token': apiKey }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore fetch partite (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.matches || [];
    } catch (error) {
      console.error("FootballData Matches Error:", error);
      throw error;
    }
  },

  fetchTopScorers: async (apiKey: string, competitionCode: string = 'SA'): Promise<TopScorer[]> => {
    try {
      // Aumentato limit a 100 per catturare i bomber di tutte le squadre
      const targetUrl = `${BASE_URL}/competitions/${competitionCode}/scorers?limit=100`;
      const finalUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

      const response = await fetch(finalUrl, {
         headers: { 'X-Auth-Token': apiKey }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore fetch marcatori (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.scorers || [];
    } catch (error) {
      console.error("FootballData Scorers Error:", error);
      throw error;
    }
  },

  fetchTeams: async (apiKey: string, competitionCode: string = 'SA'): Promise<TeamSquad[]> => {
      try {
        const targetUrl = `${BASE_URL}/competitions/${competitionCode}/teams`;
        const finalUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;
  
        const response = await fetch(finalUrl, {
           headers: { 'X-Auth-Token': apiKey }
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Errore fetch squadre (${response.status}): ${errorText}`);
        }
  
        const data = await response.json();
        return data.teams || [];
      } catch (error) {
        console.error("FootballData Teams Error:", error);
        throw error;
      }
  }
};
