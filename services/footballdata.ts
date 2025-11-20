
import { LeagueStanding, FootballDataMatch, TopScorer } from '../types';

const BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION_CODE = 'SA'; // Serie A

// Proxy per aggirare le restrizioni CORS dei browser (fondamentale per client-side apps)
const PROXY_URL = 'https://corsproxy.io/?';

export const FootballDataService = {
  
  fetchStandings: async (apiKey: string): Promise<LeagueStanding[]> => {
    try {
      const targetUrl = `${BASE_URL}/competitions/${COMPETITION_CODE}/standings`;
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

  fetchSeasonMatches: async (apiKey: string): Promise<FootballDataMatch[]> => {
    try {
      const targetUrl = `${BASE_URL}/competitions/${COMPETITION_CODE}/matches?status=FINISHED`;
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

  fetchTopScorers: async (apiKey: string): Promise<TopScorer[]> => {
    try {
      const targetUrl = `${BASE_URL}/competitions/${COMPETITION_CODE}/scorers?limit=15`;
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
  }
};