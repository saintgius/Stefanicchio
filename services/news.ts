
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
    topic?: string; // Added to track source topic
}

export const NewsService = {
    fetchNews: async (apiKey: string, topic: string = 'Serie A'): Promise<NewsArticle[]> => {
        try {
            // Costruiamo una query specifica basata sul topic
            let q = '';
            if (topic === 'Champions League') {
                q = '"Champions League" OR "UEFA" OR "Inter" OR "Milan" OR "Juventus" OR "Atalanta" OR "Bologna"'; 
            } else {
                q = '"Serie A" AND (infortunio OR formazioni OR squalificato OR convocati OR "calciomercato")';
            }
            
            const query = encodeURIComponent(q);
            // Ordina per più recenti
            const targetUrl = `${NEWS_API_URL}?q=${query}&language=it&sortBy=publishedAt&pageSize=12&apiKey=${apiKey}`;
            const finalUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

            const response = await fetch(finalUrl);
            
            if (!response.ok) {
                throw new Error("Errore NewsAPI");
            }

            const data = await response.json();
            
            // Add topic tag to articles
            return (data.articles || []).map((a: any) => ({ ...a, topic }));
        } catch (e) {
            console.error("News Fetch Error", e);
            return [];
        }
    }
};
