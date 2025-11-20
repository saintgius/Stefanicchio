
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
}

export const NewsService = {
    fetchSerieANews: async (apiKey: string): Promise<NewsArticle[]> => {
        try {
            // Query specifica per la Serie A e notizie rilevanti per il betting
            const query = encodeURIComponent('"Serie A" AND (infortunio OR formazioni OR squalificato OR convocati)');
            // Ordina per più recenti
            const targetUrl = `${NEWS_API_URL}?q=${query}&language=it&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
            const finalUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

            const response = await fetch(finalUrl);
            
            if (!response.ok) {
                throw new Error("Errore NewsAPI");
            }

            const data = await response.json();
            return data.articles || [];
        } catch (e) {
            console.error("News Fetch Error", e);
            return [];
        }
    }
};