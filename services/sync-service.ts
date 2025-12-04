import { StorageService } from './storage';
import { FootballDataService } from './footballdata';
import { LeagueStanding, FootballDataMatch, TopScorer, TeamSquad } from '../types';

export const SyncService = {
    isStale: (): boolean => {
        const { lastSync } = StorageService.getFootballData();
        if (!lastSync) return true;

        const lastSyncDate = new Date(lastSync);
        const now = new Date();

        // Check if last sync was on a different day (before today's midnight)
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return lastSyncDate < todayMidnight;
    },

    syncAll: async (footballKey: string, onProgress?: (msg: string) => void): Promise<void> => {
        if (!footballKey) throw new Error("API Key mancante");

        // IMPORTANT: Football-Data.org free tier = 10 requests/minute
        // With 4 leagues × 4 endpoints = 16 calls, we need ~7 seconds between calls
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const API_DELAY = 6500; // 6.5 seconds between calls to stay under rate limit

        const log = (msg: string) => {
            if (onProgress) onProgress(msg);
            console.log(`[SyncService] ${msg}`);
        };

        log('Avvio sincronizzazione (attendere ~2 minuti)...');

        // 1. SYNC SERIE A
        log('SA: Classifica...');
        const standingsSA = await FootballDataService.fetchStandings(footballKey, 'SA');
        await wait(API_DELAY);

        log('SA: Partite...');
        const matchesSA = await FootballDataService.fetchSeasonMatches(footballKey, 'SA');
        await wait(API_DELAY);

        log('SA: Marcatori...');
        const scorersSA = await FootballDataService.fetchTopScorers(footballKey, 'SA');
        await wait(API_DELAY);

        log('SA: Rose...');
        const squadsSA = await FootballDataService.fetchTeams(footballKey, 'SA');
        await wait(API_DELAY);

        // TAG SA DATA
        const standingsSA_Tagged = standingsSA.map(s => ({ ...s, league: 'SA' as const }));
        const scorersSA_Tagged = scorersSA.map(s => ({ ...s, league: 'SA' as const }));

        // 2. SYNC PREMIER LEAGUE (PL)
        log('PL: Classifica...');
        let standingsPL: any[] = [], matchesPL: any[] = [], scorersPL: any[] = [], squadsPL: any[] = [];

        try {
            standingsPL = await FootballDataService.fetchStandings(footballKey, 'PL');
            await wait(API_DELAY);

            log('PL: Partite...');
            matchesPL = await FootballDataService.fetchSeasonMatches(footballKey, 'PL');
            await wait(API_DELAY);

            log('PL: Marcatori...');
            scorersPL = await FootballDataService.fetchTopScorers(footballKey, 'PL');
            await wait(API_DELAY);

            log('PL: Rose...');
            squadsPL = await FootballDataService.fetchTeams(footballKey, 'PL');
            await wait(API_DELAY);
        } catch (e) {
            console.warn("Premier League sync partial fail", e);
        }

        const standingsPL_Tagged = standingsPL.map(s => ({ ...s, league: 'PL' as const }));
        const scorersPL_Tagged = scorersPL.map(s => ({ ...s, league: 'PL' as const }));

        // 3. SYNC CHAMPIONS LEAGUE
        log('CL: Classifica...');
        let standingsCL: any[] = [], matchesCL: any[] = [], scorersCL: any[] = [], squadsCL: any[] = [];

        try {
            standingsCL = await FootballDataService.fetchStandings(footballKey, 'CL');
            await wait(API_DELAY);

            log('CL: Partite...');
            matchesCL = await FootballDataService.fetchSeasonMatches(footballKey, 'CL');
            await wait(API_DELAY);

            log('CL: Marcatori...');
            scorersCL = await FootballDataService.fetchTopScorers(footballKey, 'CL');
            await wait(API_DELAY);

            log('CL: Rose...');
            squadsCL = await FootballDataService.fetchTeams(footballKey, 'CL');
            await wait(API_DELAY);
        } catch (e) {
            console.warn("Champions League sync partial fail", e);
        }

        // TAG CL DATA
        const standingsCL_Tagged = standingsCL.map(s => ({ ...s, league: 'CL' as const }));
        const scorersCL_Tagged = scorersCL.map(s => ({ ...s, league: 'CL' as const }));

        // 4. SYNC LA LIGA (PD = Primera División)
        log('LL: Classifica...');
        let standingsLL: any[] = [], matchesLL: any[] = [], scorersLL: any[] = [], squadsLL: any[] = [];

        try {
            standingsLL = await FootballDataService.fetchStandings(footballKey, 'PD');
            log(`LL: Classifica OK (${standingsLL.length} squadre)`);
            await wait(1500);

            log('LL: Partite...');
            matchesLL = await FootballDataService.fetchSeasonMatches(footballKey, 'PD');
            log(`LL: Partite OK (${matchesLL.length} partite)`);
            await wait(1500);

            log('LL: Marcatori...');
            scorersLL = await FootballDataService.fetchTopScorers(footballKey, 'PD');
            log(`LL: Marcatori OK (${scorersLL.length} giocatori)`);
            await wait(1500);

            log('LL: Rose...');
            squadsLL = await FootballDataService.fetchTeams(footballKey, 'PD');
            log(`LL: Rose OK (${squadsLL.length} squadre)`);
        } catch (e: any) {
            console.error("La Liga sync failed:", e);
            log(`LL: ERRORE - ${e.message || 'Errore sconosciuto'}`);
        }

        // TAG LL DATA
        const standingsLL_Tagged = standingsLL.map(s => ({ ...s, league: 'LL' as const }));
        const scorersLL_Tagged = scorersLL.map(s => ({ ...s, league: 'LL' as const }));

        // 5. MERGE DATA
        const mergedStandings = [...standingsSA_Tagged, ...standingsPL_Tagged, ...standingsCL_Tagged, ...standingsLL_Tagged];
        const mergedMatches = [...matchesSA, ...matchesPL, ...matchesCL, ...matchesLL];
        const mergedScorers = [...scorersSA_Tagged, ...scorersPL_Tagged, ...scorersCL_Tagged, ...scorersLL_Tagged];
        const mergedSquads = [...squadsSA, ...squadsPL, ...squadsCL, ...squadsLL];

        StorageService.saveFootballData(mergedStandings, mergedMatches, mergedScorers, mergedSquads);
        log('Sincronizzazione completata!');
    }
};
