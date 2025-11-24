
import React, { useState, useEffect } from 'react';
import { NewsService, NewsArticle } from '../services/news';
import { StorageService } from '../services/storage';
import { Newspaper, RefreshCw, ExternalLink, Calendar, Trophy, Shield } from 'lucide-react';

export const News: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<'Serie A' | 'Champions League'>('Serie A');

  const loadNews = async () => {
    const keys = StorageService.getKeys();
    if (!keys.newsKey) {
      setError("Chiave NewsAPI mancante.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedNews = await NewsService.fetchNews(keys.newsKey, activeTopic);
      setArticles(fetchedNews);
      StorageService.saveNews(fetchedNews);
    } catch (err) {
      console.error(err);
      setError("Errore caricamento notizie.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
     loadNews();
  }, [activeTopic]);

  const isChampions = activeTopic === 'Champions League';

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-white">
           <Newspaper className={isChampions ? 'text-blue-500' : 'text-redzone-500'} />
           ULTIME NOTIZIE
        </h2>
        <button 
          onClick={loadNews} 
          disabled={loading}
          className="bg-neutral-800 p-2 rounded-full hover:bg-neutral-700 transition-colors text-neutral-400 hover:text-white border border-neutral-700"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      
      {/* TOPIC TOGGLE */}
      <div className="flex gap-2">
         <button 
           onClick={() => setActiveTopic('Serie A')}
           className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 border transition-colors ${!isChampions ? 'bg-redzone-900/20 border-redzone-600 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-500'}`}
         >
           <Shield size={14} /> Serie A
         </button>
         <button 
           onClick={() => setActiveTopic('Champions League')}
           className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 border transition-colors ${isChampions ? 'bg-blue-900/20 border-blue-600 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-500'}`}
         >
           <Trophy size={14} /> Champions League
         </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-900 text-red-400 rounded text-sm text-center">
           {error} <br/> Vai in impostazioni per aggiungere la chiave.
        </div>
      )}

      <div className="space-y-4">
        {articles.map((article, index) => (
          <a 
            key={index} 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`block bg-cardbg border rounded-xl overflow-hidden transition-all active:scale-[0.99] group ${isChampions ? 'border-neutral-800 hover:border-blue-600' : 'border-neutral-800 hover:border-redzone-600'}`}
          >
            {article.urlToImage && (
              <div className="h-32 w-full overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                <img src={article.urlToImage} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute bottom-2 left-3 z-20">
                   <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded uppercase ${isChampions ? 'bg-blue-600' : 'bg-redzone-600'}`}>
                      {article.source.name}
                   </span>
                </div>
              </div>
            )}
            <div className="p-4">
               <div className="flex items-center gap-2 text-[10px] text-neutral-500 mb-2">
                  <Calendar size={10} /> {new Date(article.publishedAt).toLocaleString('it-IT')}
                  <span className={`px-1.5 rounded text-[9px] font-bold ${isChampions ? 'bg-blue-900/30 text-blue-400' : 'bg-redzone-900/30 text-redzone-400'}`}>
                      {isChampions ? 'UCL' : 'SERIE A'}
                  </span>
               </div>
               <h3 className="font-bold text-white text-sm leading-tight mb-2">{article.title}</h3>
               <p className="text-xs text-neutral-400 line-clamp-2">{article.description}</p>
               <div className={`mt-3 text-xs flex items-center gap-1 font-bold ${isChampions ? 'text-blue-400' : 'text-redzone-400'}`}>
                  LEGGI ARTICOLO <ExternalLink size={10} />
               </div>
            </div>
          </a>
        ))}
      </div>

      {!loading && articles.length === 0 && !error && (
         <div className="text-center text-neutral-500 py-10">
            Nessuna notizia trovata per {activeTopic}.
         </div>
      )}
    </div>
  );
};
