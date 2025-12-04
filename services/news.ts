
const NEWS_API_URL = 'https://newsapi.org/v2/everything';
const PROXY_URL = 'https://corsproxy.io/?';

export interface NewsArticle {
    source: { id: string | null, name: string };
    author: string | null;
    title: string;
    description: string;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    topic?: string;
}

export const NewsService = {
    fetchNews: async (apiKey: string, topic: string = 'ALL'): Promise<NewsArticle[]> => {
        try {
            // Query espansa per includere Big Europee e termini specifici Champions e Premier
            const teams = '"Inter" OR "Milan" OR "Juventus" OR "Roma" OR "Napoli" OR "Real Madrid" OR "Manchester City" OR "Barcelona" OR "Bayern Munich" OR "PSG" OR "Arsenal" OR "Liverpool" OR "Atletico Madrid" OR "Chelsea" OR "Manchester United" OR "Tottenham" OR "Aston Villa" OR "Newcastle" OR "Everton"';
            const competitions = '"Serie A" OR "Champions League" OR "UEFA" OR "Coppa Italia" OR "Premier League"';
            const keywords = 'calcio OR gol OR infortunio OR formazioni OR conferenza';

            // Costruzione query bilanciata
            const q = `(${competitions} OR ${teams}) AND (${keywords})`;
            
            const query = encodeURIComponent(q);
            const targetUrl = `${NEWS_API_URL}?q=${query}&language=it&sortBy=publishedAt&pageSize=40&apiKey=${apiKey}`;
            const finalUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

            const response = await fetch(finalUrl);
            
            if (!response.ok) {
                throw new Error("Errore NewsAPI");
            }

            const data = await response.json();
            
            return (data.articles || []).map((a: any) => {
                const txt = (a.title + a.description).toLowerCase();
                let detTopic = 'SERIE A';
                
                // Detection più aggressiva per Champions e PL
                if (txt.includes('champions') || txt.includes('uefa') || txt.includes('real') || txt.includes('bayern') || txt.includes('psg') || txt.includes('barcellona') || txt.includes('atletico')) {
                    detTopic = 'CHAMPIONS';
                } else if (txt.includes('premier league') || txt.includes('arsenal') || txt.includes('liverpool') || txt.includes('city') || txt.includes('united') || txt.includes('chelsea') || txt.includes('tottenham') || txt.includes('aston villa') || txt.includes('newcastle')) {
                    detTopic = 'PREMIER';
                }
                return { ...a, topic: detTopic };
            });
        } catch (e) {
            console.error("News Fetch Error", e);
            return [];
        }
    }
};
