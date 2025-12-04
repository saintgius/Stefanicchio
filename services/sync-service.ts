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

        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const log = (msg: string) => {
            if (onProgress) onProgress(msg);
            console.log(`[SyncService] ${msg}`);
        };

        log('Avvio sincronizzazione...');

        // 1. SYNC SERIE A
        log('SA: Classifica...');
        const standingsSA = await FootballDataService.fetchStandings(footballKey, 'SA');
        await wait(1500);

        log('SA: Partite...');
        const matchesSA = await FootballDataService.fetchSeasonMatches(footballKey, 'SA');
        await wait(1500);

        log('SA: Marcatori...');
        const scorersSA = await FootballDataService.fetchTopScorers(footballKey, 'SA');
        await wait(1500);

        log('SA: Rose...');
        const squadsSA = await FootballDataService.fetchTeams(footballKey, 'SA');
        await wait(2000);

        // TAG SA DATA
        const standingsSA_Tagged = standingsSA.map(s => ({ ...s, league: 'SA' as const }));
        const scorersSA_Tagged = scorersSA.map(s => ({ ...s, league: 'SA' as const }));

        // 2. SYNC PREMIER LEAGUE (PL)
        log('PL: Classifica...');
        let standingsPL: any[] = [], matchesPL: any[] = [], scorersPL: any[] = [], squadsPL: any[] = [];

        try {
            standingsPL = await FootballDataService.fetchStandings(footballKey, 'PL');
            await wait(1500);

            log('PL: Partite...');
            matchesPL = await FootballDataService.fetchSeasonMatches(footballKey, 'PL');
            await wait(1500);

            log('PL: Marcatori...');
            scorersPL = await FootballDataService.fetchTopScorers(footballKey, 'PL');
            await wait(1500);

            log('PL: Rose...');
            squadsPL = await FootballDataService.fetchTeams(footballKey, 'PL');
            await wait(2000);
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
            await wait(1500);

            log('CL: Partite...');
            matchesCL = await FootballDataService.fetchSeasonMatches(footballKey, 'CL');
            await wait(1500);

            log('CL: Marcatori...');
            scorersCL = await FootballDataService.fetchTopScorers(footballKey, 'CL');
            await wait(1500);

            log('CL: Rose...');
            squadsCL = await FootballDataService.fetchTeams(footballKey, 'CL');
        } catch (e) {
            console.warn("Champions League sync partial fail", e);
        }

        // TAG CL DATA
        const standingsCL_Tagged = standingsCL.map(s => ({ ...s, league: 'CL' as const }));
        const scorersCL_Tagged = scorersCL.map(s => ({ ...s, league: 'CL' as const }));

        // 4. MERGE DATA
        const mergedStandings = [...standingsSA_Tagged, ...standingsPL_Tagged, ...standingsCL_Tagged];
        const mergedMatches = [...matchesSA, ...matchesPL, ...matchesCL];
        const mergedScorers = [...scorersSA_Tagged, ...scorersPL_Tagged, ...scorersCL_Tagged];
        const mergedSquads = [...squadsSA, ...squadsPL, ...squadsCL];

        StorageService.saveFootballData(mergedStandings, mergedMatches, mergedScorers, mergedSquads);
        log('Sincronizzazione completata!');
    }
};
