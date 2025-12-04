
import React, { useState, useEffect } from 'react';
import { ProcessedMatch, AnalysisResult, RiskLevel, WeatherData } from '../types';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/gemini';
import { WeatherService } from '../services/weather';
import { PredictionEngine } from '../services/prediction-engine';
import { Button } from './Button';
import { BrainCircuit, CheckCircle, Trash2, Flame, Sparkles, CloudRain, Wind, Sun, Cloud, CloudSnow, Gem, Star, TowerControl, Eye, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { MatchAnalysisOverlay } from './MatchAnalysisOverlay';
import { OracleOverlay } from './OracleOverlay';

interface MatchCardProps {
  match: ProcessedMatch;
  geminiKey: string | null;
  league?: 'SA' | 'CL' | 'PL';
  onDeleteAnalysis?: () => void;
  onAddToSlip?: (match: string, selection: string, odds: number) => void;
  dropPercentage?: number;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, geminiKey, league = 'SA', onDeleteAnalysis, onAddToSlip, dropPercentage }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [prediction, setPrediction] = useState<any>(null);

  const isChampions = league === 'CL';
  const isPremier = league === 'PL';

  // Theme classes
  const themeAccent = isChampions ? 'blue' : isPremier ? 'purple' : 'red';
  const themeBg = isChampions ? 'from-blue-900/20 to-blue-950/10' : isPremier ? 'from-purple-900/20 to-purple-950/10' : 'from-red-900/20 to-red-950/10';
  const themeBorder = isChampions ? 'border-blue-500/30' : isPremier ? 'border-purple-500/30' : 'border-red-500/30';
  const themeGlow = isChampions ? 'shadow-glow-blue' : isPremier ? 'shadow-[0_0_20px_rgba(147,51,234,0.3)]' : 'shadow-glow-red';

  // Oracle State
  const [showOracle, setShowOracle] = useState(false);

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

    // Generate prediction stats
    try {
      const pred = PredictionEngine.generatePrediction(match, league);
      setPrediction(pred);
    } catch (e) {
      console.log('Prediction engine error:', e);
    }

  }, [match.id, league]);

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
      const richContext = StorageService.getMatchContext(match.homeTeam, match.awayTeam);

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

      let newsContext = null;
      const cachedNews = StorageService.getNews();
      if (cachedNews.length > 0) {
        const homeTerms = match.homeTeam.split(' ');
        const awayTerms = match.awayTeam.split(' ');

        const relevantNews = cachedNews.filter(article => {
          const text = (article.title + article.description).toLowerCase();
          return homeTerms.some(t => t.length > 3 && text.includes(t.toLowerCase())) ||
            awayTerms.some(t => t.length > 3 && text.includes(t.toLowerCase())) ||
            text.includes(league === 'CL' ? 'champions' : league === 'PL' ? 'premier' : 'serie a');
        });

        if (relevantNews.length > 0) {
          newsContext = relevantNews.slice(0, 5).map(n => `- ${n.title} (${n.publishedAt.split('T')[0]})`).join('\n');
        }
      }

      const compName = league === 'CL' ? 'Champions League' : league === 'PL' ? 'Premier League' : 'Serie A';

      const result = await GeminiService.analyzeMatch(
        geminiKey,
        match.homeTeam,
        match.awayTeam,
        match.odds,
        favTeam,
        richContext,
        weatherContext,
        newsContext,
        compName
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

  const handleCardClick = () => {
    if (analysis) {
      setShowOverlay(true);
    }
  };

  const getRiskBorder = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.LOW: return 'border-l-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
      case RiskLevel.MED: return 'border-l-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]';
      case RiskLevel.HIGH: return 'border-l-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse';
      default: return 'border-l-neutral-700';
    }
  };

  const getWeatherIcon = () => {
    if (!weather) return null;
    const iconClass = "drop-shadow-lg";
    switch (weather.condition) {
      case 'RAIN': return <CloudRain size={14} className={`text-blue-400 ${iconClass}`} />;
      case 'WIND': return <Wind size={14} className={`text-gray-300 ${iconClass}`} />;
      case 'SNOW': return <CloudSnow size={14} className={`text-white ${iconClass}`} />;
      case 'CLOUDY': return <Cloud size={14} className={`text-gray-400 ${iconClass}`} />;
      default: return <Sun size={14} className={`text-yellow-500 ${iconClass}`} />;
    }
  };

  // Calculate implied probability
  const impliedProb = match.odds.home > 0 ? (1 / match.odds.home) * 100 : 0;
  const isValueBet = analysis && (analysis.confidence_score > (impliedProb + 5));

  // Check for value from prediction engine
  const hasEngineValue = prediction?.valueEdges?.some((e: any) => e.isValue);

  // Power bar calculation
  const totalProb = (1 / match.odds.home) + (1 / match.odds.away);
  const homeStrength = ((1 / match.odds.home) / totalProb) * 100;

  // Team ranks from storage
  const homeRank = StorageService.getTeamRank(match.homeTeam);
  const awayRank = StorageService.getTeamRank(match.awayTeam);

  return (
    <>
      <div
        className={`
          premium-card rounded-2xl p-5 border-l-4 relative overflow-hidden
          ${analysis ? getRiskBorder(analysis.risk_level) : 'border-l-neutral-700/50'}
          hover-lift active-scale
        `}
      >
        {/* Ambient Glow Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${themeBg} opacity-50`} />

        {/* Value Bet Badge */}
        {(isValueBet || hasEngineValue) && (
          <div className="absolute -top-1 -right-1 z-20">
            <div className="value-badge text-white text-[10px] font-black px-3 py-1.5 rounded-bl-xl rounded-tr-xl flex items-center gap-1.5 shadow-lg">
              <Gem size={12} className="animate-pulse" />
              <span>VALUE</span>
            </div>
          </div>
        )}

        {/* Drop Alert Badge */}
        {dropPercentage && dropPercentage > 5 && (
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 animate-pulse shadow-lg">
              <Flame size={12} />
              <span>-{dropPercentage}%</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="relative z-10 flex justify-between items-start mb-4">
          <div className="flex flex-col gap-2">
            {/* League & Time */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`
                text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1
                ${isChampions ? 'bg-blue-900/50 text-blue-400 border border-blue-800/50' :
                  isPremier ? 'bg-purple-900/50 text-purple-400 border border-purple-800/50' :
                    'bg-neutral-800/80 text-neutral-400 border border-neutral-700/50'}
              `}>
                {isChampions ? <><Star size={10} fill="currentColor" /> UCL</> :
                  isPremier ? <><TowerControl size={10} /> PL</> : 'SERIE A'}
              </span>
              <span className="text-xs text-neutral-500 font-mono bg-neutral-900/50 px-2 py-0.5 rounded">
                {new Date(match.startTime).toLocaleString('it-IT', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            {/* Weather */}
            {weather && (
              <div className="flex items-center gap-2 glass-light px-2 py-1 rounded-lg w-fit">
                {getWeatherIcon()}
                <span className="text-[11px] text-neutral-300 font-medium">{weather.temp}°C</span>
                {weather.condition === 'WIND' && <span className="text-[10px] text-amber-400 font-bold">WIND!</span>}
                {weather.precip_prob > 60 && <span className="text-[10px] text-blue-400 font-bold">RAIN!</span>}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 items-center">
            {geminiKey && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowOracle(true); }}
                className="glass-light hover:bg-purple-900/30 text-purple-400 border border-purple-800/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] font-semibold transition-all hover:scale-105 active-scale"
              >
                <Sparkles size={12} className="animate-pulse" />
                ORACLE
              </button>
            )}
            {isCached && (
              <span className="text-[11px] text-green-400 flex items-center gap-1 bg-green-900/20 px-2 py-1 rounded-lg border border-green-800/30">
                <CheckCircle size={12} /> Salvata
              </span>
            )}
          </div>
        </div>

        {/* Teams & Odds - Premium Layout */}
        <div className="relative z-10 grid grid-cols-7 gap-2 items-center mb-4">
          {/* Home Team */}
          <div className="col-span-3 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center mb-2 border border-neutral-600/50 shadow-lg">
              <span className="text-lg font-black text-white">{match.homeTeam.charAt(0)}</span>
            </div>
            <span className="font-bold text-white text-sm leading-tight mb-1">{match.homeTeam}</span>
            {homeRank && (
              <span className="text-[10px] text-neutral-500 font-mono">#{homeRank}</span>
            )}
            <div className="mt-2 glass-card px-4 py-2 rounded-xl">
              <span className="text-lg font-black text-white font-mono">{match.odds.home.toFixed(2)}</span>
            </div>
          </div>

          {/* VS Divider */}
          <div className="col-span-1 flex flex-col items-center justify-center">
            <div className="text-neutral-600 font-black text-xs mb-2">VS</div>
            <div className="glass-card px-3 py-1.5 rounded-lg">
              <span className="text-sm font-bold text-neutral-400 font-mono">{match.odds.draw.toFixed(2)}</span>
            </div>
          </div>

          {/* Away Team */}
          <div className="col-span-3 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center mb-2 border border-neutral-600/50 shadow-lg">
              <span className="text-lg font-black text-white">{match.awayTeam.charAt(0)}</span>
            </div>
            <span className="font-bold text-white text-sm leading-tight mb-1">{match.awayTeam}</span>
            {awayRank && (
              <span className="text-[10px] text-neutral-500 font-mono">#{awayRank}</span>
            )}
            <div className="mt-2 glass-card px-4 py-2 rounded-xl">
              <span className="text-lg font-black text-white font-mono">{match.odds.away.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Power Bar - Premium */}
        <div className="relative z-10 mb-5 px-2">
          <div className="w-full h-2 bg-neutral-800/80 rounded-full overflow-hidden flex shadow-inner">
            <div
              className="h-full power-bar-home transition-all duration-500"
              style={{ width: `${homeStrength}%` }}
            />
            <div
              className="h-full power-bar-away transition-all duration-500"
              style={{ width: `${100 - homeStrength}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-neutral-500 mt-1.5 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1">
              {homeStrength > 55 ? <TrendingUp size={10} className="text-blue-400" /> :
                homeStrength < 45 ? <TrendingDown size={10} className="text-red-400" /> :
                  <Minus size={10} />}
              {Math.round(homeStrength)}%
            </span>
            <span className="flex items-center gap-1">
              {100 - homeStrength > 55 ? <TrendingUp size={10} className="text-red-400" /> :
                100 - homeStrength < 45 ? <TrendingDown size={10} className="text-blue-400" /> :
                  <Minus size={10} />}
              {Math.round(100 - homeStrength)}%
            </span>
          </div>
        </div>

        {/* Prediction Preview (if available) */}
        {prediction && !analysis && (
          <div className="relative z-10 mb-4 glass-light rounded-xl p-3">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-yellow-500" />
                <span className="text-neutral-400 font-medium">AI Preview:</span>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-400 font-bold">1: {prediction.homeWinProb}%</span>
                <span className="text-neutral-500 font-bold">X: {prediction.drawProb}%</span>
                <span className="text-red-400 font-bold">2: {prediction.awayWinProb}%</span>
              </div>
            </div>
            {prediction.valueEdges?.find((e: any) => e.isValue) && (
              <div className="mt-2 text-[10px] text-green-400 font-semibold flex items-center gap-1">
                <Gem size={10} />
                Value: {prediction.valueEdges.find((e: any) => e.isValue)?.market} (+{prediction.valueEdges.find((e: any) => e.isValue)?.edge}% edge)
              </div>
            )}
          </div>
        )}

        {/* Action Button / Analysis Preview */}
        <div className="relative z-10">
          {!analysis ? (
            <Button
              onClick={handleAnalyze}
              isLoading={loading}
              className={`
                w-full btn-premium py-3 rounded-xl font-bold text-sm tracking-wide
                ${isChampions ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-glow-blue' :
                  isPremier ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-[0_0_20px_rgba(147,51,234,0.4)]' :
                    'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-glow-red'}
                border-none
              `}
              variant="primary"
            >
              <BrainCircuit size={18} className={loading ? 'animate-spin' : ''} />
              {loading ? "ANALIZZANDO..." : "ANALISI AI COMPLETA"}
            </Button>
          ) : (
            <div
              onClick={handleCardClick}
              className="cursor-pointer glass-card hover:bg-neutral-800/50 p-4 rounded-xl flex justify-between items-center group transition-all hover:scale-[1.01] active-scale"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`
                    text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider
                    ${analysis.risk_level === RiskLevel.LOW ? 'bg-green-900/50 text-green-400 border border-green-700/50' :
                      analysis.risk_level === RiskLevel.MED ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/50' :
                        'bg-red-900/50 text-red-400 border border-red-700/50'}
                  `}>
                    {analysis.risk_level}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500 bg-neutral-800/50 px-2 py-0.5 rounded">
                    {analysis.confidence_score}% conf.
                  </span>
                </div>
                <div className="text-white font-bold text-base">{analysis.recommended_bet}</div>
              </div>
              <div className="flex items-center gap-3 text-neutral-500 group-hover:text-white transition-colors">
                <span className="text-[11px] uppercase font-bold tracking-wide">Dettagli</span>
                <Eye size={18} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlays */}
      {showOverlay && analysis && (
        <MatchAnalysisOverlay
          match={match}
          analysis={analysis}
          league={league}
          onClose={() => setShowOverlay(false)}
          onDelete={() => {
            if (onDeleteAnalysis) onDeleteAnalysis();
            else StorageService.deleteAnalysis(match.id);
            setAnalysis(null);
            setIsCached(false);
            setShowOverlay(false);
          }}
          onAddToSlip={onAddToSlip ? onAddToSlip : () => { }}
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
