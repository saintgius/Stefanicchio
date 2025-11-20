
import React, { useState, useEffect, useRef } from 'react';
import { ProcessedMatch, AnalysisResult, RiskLevel, WeatherData } from '../types';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/gemini';
import { WeatherService } from '../services/weather';
import { Button } from './Button';
import { BrainCircuit, CheckCircle, ChevronRight, Trash2, Flame, Sparkles, CloudRain, Wind, Sun, Cloud, CloudSnow, Gem } from 'lucide-react';
import { MatchAnalysisOverlay } from './MatchAnalysisOverlay';
import { OracleOverlay } from './OracleOverlay';

interface MatchCardProps {
  match: ProcessedMatch;
  geminiKey: string | null;
  onDeleteAnalysis?: () => void;
  onAddToSlip?: (match: string, selection: string, odds: number) => void;
  dropPercentage?: number;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, geminiKey, onDeleteAnalysis, onAddToSlip, dropPercentage }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  
  // Oracle State
  const [showOracle, setShowOracle] = useState(false);

  // Long Press Refs
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    const cached = StorageService.getAnalysis(match.id);
    if (cached) {
      setAnalysis(cached);
      setIsCached(true);
    } else {
        setAnalysis(null);
        setIsCached(false);
    }

    // Load Weather
    WeatherService.getMatchWeather(match.homeTeam, match.startTime).then(setWeather);

  }, [match.id]);

  const handleAnalyze = async () => {
    if (analysis) {
      setShowOverlay(true);
      return;
    }

    if (!geminiKey) {
      alert("Chiave API Gemini mancante. Vai in Impostazioni per configurarla.");
      return;
    }

    setLoading(true);
    try {
      const favTeam = StorageService.getFavoriteTeam();
      
      // Recupera contesto RICCO (Classifica + Precedenti)
      const richContext = StorageService.getMatchContext(match.homeTeam, match.awayTeam);

      // Prepara Contesto Meteo per AI
      let weatherContext = null;
      if (weather) {
          const conditionMap = {
              'SUN': 'Soleggiato, campo perfetto',
              'RAIN': 'Pioggia, campo bagnato/pesante',
              'CLOUDY': 'Nuvoloso',
              'SNOW': 'Neve, campo difficile',
              'WIND': 'Vento Forte, traiettorie imprevedibili'
          };
          weatherContext = `Condizioni: ${conditionMap[weather.condition] || 'N/D'}. Temperatura: ${weather.temp}°C. Vento: ${weather.wind_speed}km/h. Probabilità Pioggia: ${weather.precip_prob}%.`;
      }
      
      // Prepara Contesto NEWS per AI
      let newsContext = null;
      const cachedNews = StorageService.getNews();
      if (cachedNews.length > 0) {
          const homeTerms = match.homeTeam.split(' ');
          const awayTerms = match.awayTeam.split(' ');
          
          const relevantNews = cachedNews.filter(article => {
              const text = (article.title + article.description).toLowerCase();
              // Filter matches by team name
              return homeTerms.some(t => t.length > 3 && text.includes(t.toLowerCase())) || 
                     awayTerms.some(t => t.length > 3 && text.includes(t.toLowerCase())) ||
                     text.includes('serie a');
          });

          if (relevantNews.length > 0) {
              newsContext = relevantNews.slice(0, 5).map(n => `- ${n.title} (${n.publishedAt.split('T')[0]})`).join('\n');
          }
      }

      const result = await GeminiService.analyzeMatch(
        geminiKey, 
        match.homeTeam, 
        match.awayTeam, 
        match.odds, 
        favTeam,
        richContext,
        weatherContext,
        newsContext
      );

      StorageService.saveAnalysis(match.id, result);
      setAnalysis(result);
      setIsCached(false); 
      setShowOverlay(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
      // Update Storage first
      if (onDeleteAnalysis) {
          onDeleteAnalysis();
      } else {
          StorageService.deleteAnalysis(match.id);
      }
      
      // Then update UI state
      setAnalysis(null);
      setIsCached(false);
      setShowOverlay(false);
      setShowDeleteConfirm(false);
  };

  // --- LONG PRESS HANDLERS ---
  const startPress = () => {
    if (!analysis) return;
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      // Trigger Delete Mode
      if (navigator.vibrate) navigator.vibrate(50);
      setShowDeleteConfirm(true);
    }, 800); // 800ms for long press
  };

  const endPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleCardClick = () => {
    if (isLongPress.current) return; // Don't open overlay if it was a long press
    if (analysis) {
      setShowOverlay(true);
    }
  };

  const getRiskColor = (level: RiskLevel) => {
    switch(level) {
      case RiskLevel.LOW: return 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
      case RiskLevel.MED: return 'border-yellow-500';
      case RiskLevel.HIGH: return 'border-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]';
      default: return 'border-neutral-800';
    }
  };

  const getWeatherIcon = () => {
      if (!weather) return null;
      switch (weather.condition) {
          case 'RAIN': return <CloudRain size={12} className="text-blue-400" />;
          case 'WIND': return <Wind size={12} className="text-gray-300" />;
          case 'SNOW': return <CloudSnow size={12} className="text-white" />;
          case 'CLOUDY': return <Cloud size={12} className="text-gray-400" />;
          default: return <Sun size={12} className="text-yellow-500" />;
      }
  };

  // --- VALUE BET FINDER ---
  // Implied Probability (Home) = (1 / Decimal Odds) * 100
  // If Gemini Confidence > Implied Prob + 5% Margin -> VALUE
  const impliedProb = match.odds.home > 0 ? (1 / match.odds.home) * 100 : 0;
  const isValueBet = analysis && (analysis.confidence_score > (impliedProb + 5));

  return (
    <>
      <div 
        className={`bg-cardbg rounded-xl p-4 border-l-4 relative transition-all select-none ${analysis ? getRiskColor(analysis.risk_level) : 'border-l-neutral-700 border border-neutral-800'}`}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
      >
        {/* Delete Confirm Overlay (Visible on Long Press trigger) */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center rounded-xl animate-fade-in">
             <p className="text-white font-bold mb-4">Eliminare Analisi?</p>
             <div className="flex gap-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }} 
                  className="bg-red-600 text-white p-3 rounded-full hover:bg-red-500"
                >
                  <Trash2 size={24} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }} 
                  className="bg-neutral-700 text-white px-4 py-2 rounded-full font-bold"
                >
                  Annulla
                </button>
             </div>
          </div>
        )}
        
        {/* Value Bet Badge (Floating) */}
        {isValueBet && (
             <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_10px_#2563eb] animate-pulse">
                 <Gem size={10} /> VALUE DETECTED
             </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 font-mono">{new Date(match.startTime).toLocaleString('it-IT', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'})}</span>
                {dropPercentage && dropPercentage > 5 && (
                    <span className="bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 border border-red-900 animate-pulse">
                        <Flame size={10} /> DROP -{dropPercentage}%
                    </span>
                )}
            </div>
            {weather && (
                <div className="flex items-center gap-2 text-[10px] text-neutral-400 bg-neutral-900/50 px-1.5 py-0.5 rounded w-fit">
                    {getWeatherIcon()}
                    <span>{weather.temp}°C</span>
                    {weather.condition === 'WIND' && <span className="text-red-400 font-bold">WIND ALERT</span>}
                    {weather.precip_prob > 60 && <span className="text-blue-400 font-bold">RAIN ALERT</span>}
                </div>
            )}
          </div>
          <div className="flex gap-2">
              {geminiKey && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowOracle(true); }}
                    className="text-[10px] bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 border border-purple-900/50 px-2 py-0.5 rounded flex items-center gap-1"
                  >
                      <Sparkles size={10} /> ORACLE
                  </button>
              )}
              {isCached && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={12}/> Cached</span>}
          </div>
        </div>

        {/* Teams & Odds */}
        <div className="grid grid-cols-3 gap-2 text-center mb-6">
          <div className="flex flex-col items-center justify-center">
            <span className="font-bold text-lg leading-tight">{match.homeTeam}</span>
            <span className="bg-neutral-800 text-neutral-300 px-2 py-1 rounded mt-2 text-sm font-mono">{match.odds.home.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-center justify-center text-neutral-500 font-mono text-sm">
            VS
            <span className="bg-neutral-800 text-neutral-300 px-2 py-1 rounded mt-2 text-sm">{match.odds.draw.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="font-bold text-lg leading-tight">{match.awayTeam}</span>
            <span className="bg-neutral-800 text-neutral-300 px-2 py-1 rounded mt-2 text-sm font-mono">{match.odds.away.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        {!analysis ? (
          <Button 
            onClick={handleAnalyze} 
            isLoading={loading}
            className="w-full"
          >
            <BrainCircuit size={18} /> {loading ? "ANALISI..." : "ANALISI IA"}
          </Button>
        ) : (
          <div onClick={handleCardClick} className="cursor-pointer bg-neutral-900/50 hover:bg-neutral-800 p-3 rounded-lg border border-neutral-800 mt-2 flex justify-between items-center group transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  analysis.risk_level === RiskLevel.LOW ? 'bg-green-900 text-green-300' :
                  analysis.risk_level === RiskLevel.MED ? 'bg-yellow-900 text-yellow-300' :
                  'bg-red-900 text-red-300'
                }`}>
                  {analysis.risk_level}
                </span>
                <span className="text-[10px] font-mono text-neutral-400">Value: {analysis.best_value_market}</span>
              </div>
              <div className="text-white font-bold text-sm">{analysis.recommended_bet}</div>
            </div>
            <ChevronRight className="text-neutral-500 group-hover:text-white transition-colors" />
          </div>
        )}
      </div>

      {showOverlay && analysis && (
        <MatchAnalysisOverlay 
          match={match} 
          analysis={analysis} 
          onClose={() => setShowOverlay(false)} 
          onDelete={handleDelete}
          onAddToSlip={onAddToSlip ? onAddToSlip : () => {}}
          weather={weather}
        />
      )}
      
      {showOracle && geminiKey && (
          <OracleOverlay 
            match={match}
            apiKey={geminiKey}
            onClose={() => setShowOracle(false)}
          />
      )}
    </>
  );
};