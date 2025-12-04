
import React, { useState, useEffect } from 'react';
import { AnalysisResult, ProcessedMatch, RiskLevel, FootballDataMatch, WeatherData } from '../types';
import { StorageService } from '../services/storage';
import { PredictionEngine } from '../services/prediction-engine';
import { ConfidenceMeter } from './ConfidenceMeter';
import { H2HVisualizer } from './H2HVisualizer';
import { WhyThisPick } from './WhyThisPick';
import { X, TrendingUp, AlertOctagon, ShieldAlert, BrainCircuit, History, Zap, Swords, Percent, DollarSign, BarChart3, FileText, CloudRain, Wind, Sun, Cloud, CloudSnow, Thermometer, Crown, Ambulance, Megaphone, UserCog, Target, Crosshair, Layers, Timer, AlertTriangle, Gavel, Scale, Trash2, Layout, Gem, TrendingDown, Activity, PieChart as PieChartIcon } from 'lucide-react';
import { Button } from './Button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, RadialBarChart, RadialBar } from 'recharts';

interface MatchAnalysisOverlayProps {
  match: ProcessedMatch;
  analysis: AnalysisResult;
  onClose: () => void;
  onDelete: () => void;
  onAddToSlip: (match: string, selection: string, odds: number) => void;
  weather: WeatherData | null;
  league?: 'SA' | 'CL' | 'PL';
}

export const MatchAnalysisOverlay: React.FC<MatchAnalysisOverlayProps> = ({ match, analysis, onClose, onDelete, onAddToSlip, weather, league = 'SA' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'h2h' | 'advanced'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);

  // Form State
  const [homeAdvancedForm, setHomeAdvancedForm] = useState<{ result: 'W' | 'D' | 'L', score: string, color: string, tooltip: string }[]>([]);
  const [awayAdvancedForm, setAwayAdvancedForm] = useState<{ result: 'W' | 'D' | 'L', score: string, color: string, tooltip: string }[]>([]);

  const [homeRank, setHomeRank] = useState<number | null>(null);
  const [awayRank, setAwayRank] = useState<number | null>(null);
  const [h2hMatches, setH2hMatches] = useState<FootballDataMatch[]>([]);

  const isChampions = league === 'CL';
  const isPremier = league === 'PL';

  // Theme colors
  const themeAccent = isChampions ? 'blue' : isPremier ? 'purple' : 'red';
  const themeBg = isChampions ? 'from-blue-600 to-blue-800' : isPremier ? 'from-purple-600 to-purple-800' : 'from-red-600 to-red-800';

  useEffect(() => {
    setHomeAdvancedForm(StorageService.getAdvancedForm(match.homeTeam));
    setAwayAdvancedForm(StorageService.getAdvancedForm(match.awayTeam));
    setHomeRank(StorageService.getTeamRank(match.homeTeam));
    setAwayRank(StorageService.getTeamRank(match.awayTeam));
    setH2hMatches(StorageService.getH2HMatches(match.homeTeam, match.awayTeam));

    // Get prediction engine data
    try {
      const pred = PredictionEngine.generatePrediction(match, league);
      setPrediction(pred);
    } catch (e) {
      console.log('Prediction error', e);
    }
  }, [match, league]);

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.LOW: return 'text-green-500';
      case RiskLevel.MED: return 'text-yellow-500';
      case RiskLevel.HIGH: return 'text-red-500';
      default: return 'text-white';
    }
  };

  const getRiskBg = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.LOW: return 'bg-green-900/30 border-green-700/50';
      case RiskLevel.MED: return 'bg-yellow-900/30 border-yellow-700/50';
      case RiskLevel.HIGH: return 'bg-red-900/30 border-red-700/50';
      default: return 'bg-neutral-800';
    }
  };

  const renderAdvancedForm = (form: { result: 'W' | 'D' | 'L', score: string, color: string, tooltip: string }[]) => (
    <div className="flex gap-2">
      {form.map((f, i) => (
        <div
          key={i}
          className={`w-8 h-8 rounded-lg ${f.color} shadow-lg flex items-center justify-center cursor-help transition-transform hover:scale-110`}
          title={f.tooltip}
        >
          <span className="text-[10px] font-black">{f.result}</span>
        </div>
      ))}
      {form.length === 0 && <span className="text-xs text-neutral-600 italic">Dati non disponibili</span>}
    </div>
  );

  // Chart Data
  const margin = (1 / match.odds.home + 1 / match.odds.draw + 1 / match.odds.away);
  const probHome = Math.round(((1 / match.odds.home) / margin) * 100);
  const probDraw = Math.round(((1 / match.odds.draw) / margin) * 100);
  const probAway = Math.round(((1 / match.odds.away) / margin) * 100);

  const probsData = [
    { name: '1', prob: prediction?.homeWinProb || probHome, fill: '#3b82f6' },
    { name: 'X', prob: prediction?.drawProb || probDraw, fill: '#6b7280' },
    { name: '2', prob: prediction?.awayWinProb || probAway, fill: '#ef4444' }
  ];

  const QuickAddButton = ({ pick, odd }: { pick: string, odd: number }) => (
    <button
      onClick={() => onAddToSlip(`${match.homeTeam} - ${match.awayTeam}`, pick, odd)}
      className="btn-premium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:scale-105 active-scale shadow-glow-green"
    >
      <DollarSign size={12} /> GIOCA
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-darkbg/98 backdrop-blur-sm animate-fade-in overflow-hidden flex flex-col">

      {/* Premium Header */}
      <div className={`relative overflow-hidden`}>
        <div className={`absolute inset-0 bg-gradient-to-r ${themeBg} opacity-20`} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-darkbg" />

        <div className="relative z-10 p-5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`
                text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider
                ${isChampions ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  isPremier ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'}
              `}>
                WAR ROOM AI
              </span>
            </div>
            <h2 className="font-black text-xl text-white tracking-tight mb-1">
              {match.homeTeam} <span className="text-neutral-500 font-normal">vs</span> {match.awayTeam}
            </h2>
            <p className="text-xs text-neutral-500 font-mono">
              {new Date(match.startTime).toLocaleString('it-IT', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="glass-card p-2.5 rounded-xl hover:bg-neutral-700/50 transition-all hover:scale-105 active-scale"
          >
            <X size={20} className="text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex glass-panel border-y border-neutral-800/50 sticky top-0 z-20">
        {[
          { id: 'overview', label: 'Analisi', icon: BrainCircuit },
          { id: 'stats', label: 'Stats', icon: BarChart3 },
          { id: 'h2h', label: 'H2H', icon: Swords },
          { id: 'advanced', label: 'Picks', icon: Target }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all
              ${activeTab === tab.id
                ? `text-white tab-active`
                : 'text-neutral-500 hover:text-neutral-300'}
            `}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-28">

        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5 animate-slide-up">

            {/* Turnover Alert */}
            {analysis.turnover_alert && (
              <div className="glass-card border-l-4 border-l-yellow-500 p-4 flex gap-4 animate-pulse">
                <AlertTriangle size={24} className="text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-yellow-500 font-black uppercase text-xs mb-1 tracking-wide">⚠️ Turnover Alert</h3>
                  <p className="text-neutral-300 text-sm leading-relaxed">{analysis.turnover_alert}</p>
                </div>
              </div>
            )}

            {/* Main Recommendation Card */}
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden border-l-4 border-l-green-500">
              <div className="absolute top-0 right-0 w-40 h-40 opacity-5">
                <BrainCircuit size={160} />
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${getRiskBg(analysis.risk_level)} border`}>
                      <Zap size={18} className={getRiskColor(analysis.risk_level)} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Consigliata</span>
                      <div className={`text-xs font-black ${getRiskColor(analysis.risk_level)} uppercase mt-0.5`}>
                        Rischio {analysis.risk_level}
                      </div>
                    </div>
                  </div>
                  <ConfidenceMeter value={analysis.confidence_score} size="sm" />
                </div>

                <div className="text-2xl font-black text-white mb-4 tracking-tight leading-tight">
                  {analysis.recommended_bet}
                </div>

                <Button
                  className="w-full btn-premium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3 rounded-xl font-bold border-none shadow-glow-green mb-4"
                  onClick={() => onAddToSlip(`${match.homeTeam} - ${match.awayTeam}`, analysis.recommended_bet, 1.85)}
                >
                  <DollarSign size={16} /> AGGIUNGI ALLA SCHEDINA
                </Button>

                <p className="text-neutral-300 text-sm leading-relaxed border-l-2 border-neutral-700 pl-4">
                  {analysis.reasoning}
                </p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-4 rounded-xl">
                <h3 className="text-[10px] font-bold text-neutral-500 uppercase mb-2 flex items-center gap-2">
                  <UserCog size={12} /> Allenatori
                </h3>
                <p className="text-sm text-white leading-snug">{analysis.manager_duel || "N/A"}</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <h3 className="text-[10px] font-bold text-neutral-500 uppercase mb-2 flex items-center gap-2">
                  <Megaphone size={12} /> Atmosfera
                </h3>
                <p className="text-sm text-white leading-snug">{analysis.stadium_atmosphere || "N/A"}</p>
              </div>
            </div>

            {/* Key Duels */}
            <div className="glass-card p-4 rounded-xl">
              <h3 className="text-xs font-bold text-white uppercase mb-3 flex items-center gap-2">
                <Swords size={14} className="text-red-500" /> Duelli Chiave
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">{analysis.key_duels}</p>
            </div>

            {/* Injuries */}
            {analysis.unavailable_players && analysis.unavailable_players.length > 0 && (
              <div className="glass-card border-l-4 border-l-red-500 p-4 rounded-xl">
                <h3 className="text-xs font-bold text-red-400 uppercase mb-3 flex items-center gap-2">
                  <Ambulance size={14} /> Infermeria
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.unavailable_players.map((p, i) => (
                    <span key={i} className="bg-red-900/30 text-red-300 text-xs px-2 py-1 rounded-lg border border-red-800/50">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Referee */}
            {analysis.referee_analysis && (
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-neutral-800 p-2 rounded-lg">
                    <Gavel size={16} className="text-neutral-400" />
                  </div>
                  <h3 className="text-xs font-bold text-white uppercase">Dossier Arbitro</h3>
                </div>
                <p className="text-sm text-neutral-300 italic">{analysis.referee_analysis}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: STATS */}
        {activeTab === 'stats' && (
          <div className="space-y-5 animate-slide-up">

            {/* Visual Form */}
            <div className="glass-card p-5 rounded-xl">
              <h3 className="font-bold text-white text-sm uppercase mb-4 flex items-center gap-2">
                <History size={16} className="text-blue-500" /> Forma Recente
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">{match.homeTeam}</span>
                    {homeRank && <span className="text-[10px] text-neutral-500 font-mono">#{homeRank}</span>}
                  </div>
                  {renderAdvancedForm(homeAdvancedForm)}
                </div>

                <div className="h-px bg-neutral-800" />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">{match.awayTeam}</span>
                    {awayRank && <span className="text-[10px] text-neutral-500 font-mono">#{awayRank}</span>}
                  </div>
                  {renderAdvancedForm(awayAdvancedForm)}
                </div>
              </div>
            </div>

            {/* Tactical Board */}
            <div className="glass-card p-5 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/football-field.png')]" />

              <h3 className="font-bold text-white text-sm uppercase mb-4 flex items-center gap-2 relative z-10">
                <Layout size={16} className="text-purple-500" /> Tattica
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                <div className="glass-light p-4 rounded-xl text-center">
                  <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">{match.homeTeam}</div>
                  <div className="text-2xl font-black text-white">{analysis.predicted_formation_home || "?"}</div>
                </div>
                <div className="glass-light p-4 rounded-xl text-center">
                  <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">{match.awayTeam}</div>
                  <div className="text-2xl font-black text-white">{analysis.predicted_formation_away || "?"}</div>
                </div>
              </div>

              <p className="text-sm text-neutral-300 leading-relaxed relative z-10 bg-neutral-900/50 p-3 rounded-xl">
                {analysis.tactical_insight || "Analisi tattica non disponibile."}
              </p>
            </div>

            {/* Probability Chart */}
            <div className="glass-card p-5 rounded-xl">
              <h3 className="text-xs font-bold text-neutral-400 uppercase mb-4 flex items-center gap-2">
                <PieChartIcon size={14} /> Probabilità {prediction ? '(Poisson)' : '(Quote)'}
              </h3>
              <div className="h-28 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={probsData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={25} tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <Bar dataKey="prob" radius={[0, 8, 8, 0]} barSize={20}>
                      {probsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-around mt-3 text-center">
                {probsData.map((p, i) => (
                  <div key={i}>
                    <div className="text-lg font-black text-white">{p.prob}%</div>
                    <div className="text-[10px] text-neutral-500 uppercase">{p.name === '1' ? 'Casa' : p.name === 'X' ? 'Pareggio' : 'Ospite'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prediction Engine Stats */}
            {prediction && (
              <div className="glass-card p-5 rounded-xl border-l-4 border-l-blue-500">
                <h3 className="text-xs font-bold text-blue-400 uppercase mb-4 flex items-center gap-2">
                  <Activity size={14} /> Prediction Engine v2.0
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="glass-light p-3 rounded-lg">
                    <div className="text-[10px] text-neutral-500 uppercase mb-1">xG Casa</div>
                    <div className="text-xl font-black text-blue-400">{prediction.expectedGoalsHome}</div>
                  </div>
                  <div className="glass-light p-3 rounded-lg">
                    <div className="text-[10px] text-neutral-500 uppercase mb-1">xG Ospite</div>
                    <div className="text-xl font-black text-red-400">{prediction.expectedGoalsAway}</div>
                  </div>
                  <div className="glass-light p-3 rounded-lg">
                    <div className="text-[10px] text-neutral-500 uppercase mb-1">Over 2.5</div>
                    <div className="text-xl font-black text-white">{prediction.over25Prob}%</div>
                  </div>
                  <div className="glass-light p-3 rounded-lg">
                    <div className="text-[10px] text-neutral-500 uppercase mb-1">BTTS</div>
                    <div className="text-xl font-black text-white">{prediction.bttsProb}%</div>
                  </div>
                </div>

                {/* Value Edges */}
                {prediction.valueEdges?.some((e: any) => e.isValue) && (
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-700/30 rounded-xl">
                    <h4 className="text-[10px] text-green-400 font-bold uppercase mb-2 flex items-center gap-1">
                      <Gem size={12} /> Value Bets Rilevati
                    </h4>
                    {prediction.valueEdges.filter((e: any) => e.isValue).map((edge: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-white font-medium">{edge.market}</span>
                        <span className="text-green-400 font-bold">+{edge.edge}% edge</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: H2H */}
        {activeTab === 'h2h' && (
          <div className="space-y-5 animate-slide-up">
            <H2HVisualizer homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
          </div>
        )}

        {/* TAB: ADVANCED PICKS */}
        {activeTab === 'advanced' && (
          <div className="space-y-5 animate-slide-up">

            {/* Confidence Meter Large */}
            <div className="glass-card p-6 rounded-xl flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase text-neutral-500 mb-4 tracking-widest">AI Confidence Score</span>
              <ConfidenceMeter value={analysis.confidence_score} size="lg" />
            </div>

            {/* Why This Pick - AI Explainer */}
            {prediction?.whyThisPick && prediction.whyThisPick.length > 0 && (
              <WhyThisPick
                reasons={prediction.whyThisPick}
                recommendedBet={analysis.recommended_bet}
              />
            )}

            {/* Stefanicchio's Arsenal */}
            <div className="glass-card p-5 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Crosshair size={80} />
              </div>

              <h3 className="text-sm font-black text-white uppercase mb-4 flex items-center gap-2 tracking-wide relative z-10">
                <Target size={18} className="text-purple-500" /> Pick Multipli
              </h3>

              <div className="grid grid-cols-2 gap-3 relative z-10">
                {[
                  { label: 'Multigol', value: analysis.prediction_multigol, icon: Layers, odd: 1.75 },
                  { label: 'Over/Under', value: analysis.prediction_over_under, icon: TrendingUp, odd: 1.80 },
                  { label: 'Marcatore', value: analysis.prediction_goalscorer, icon: Target, odd: 2.50 },
                  { label: 'Combo', value: analysis.prediction_combo, icon: Zap, odd: 2.20 },
                ].map((pick, i) => (
                  <div key={i} className="glass-light p-4 rounded-xl flex flex-col gap-3">
                    <div className="text-[10px] text-neutral-500 font-bold uppercase flex items-center gap-1">
                      <pick.icon size={12} /> {pick.label}
                    </div>
                    <div className="font-bold text-white text-sm flex-1">{pick.value || "N/A"}</div>
                    {pick.value && pick.value !== "N/A" && (
                      <QuickAddButton pick={pick.value} odd={pick.odd} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Exact Score */}
            <div className="glass-card p-6 rounded-xl text-center relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${themeAccent}-500 to-transparent`} />

              <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-widest">Risultato Esatto</span>
              <div className="text-5xl font-black text-white tracking-tight my-3 neon-text">
                {analysis.exact_score || "-:-"}
              </div>
              {analysis.exact_score_reasoning && (
                <p className="text-xs text-neutral-400 italic max-w-xs mx-auto mb-4">
                  "{analysis.exact_score_reasoning}"
                </p>
              )}
              {analysis.exact_score && analysis.exact_score !== "-:-" && (
                <QuickAddButton pick={`Risultato Esatto: ${analysis.exact_score}`} odd={8.50} />
              )}
            </div>

            {/* Risky Bet */}
            {analysis.risky_bet && (
              <div className="glass-card border-l-4 border-l-orange-500 p-5 rounded-xl">
                <h3 className="text-xs font-bold text-orange-400 uppercase mb-2 flex items-center gap-2">
                  <AlertOctagon size={14} /> Scommessa Rischiosa
                </h3>
                <div className="text-lg font-bold text-white mb-2">{analysis.risky_bet}</div>
                <p className="text-sm text-neutral-400 italic mb-3">{analysis.risky_reasoning}</p>
                <QuickAddButton pick={analysis.risky_bet} odd={4.50} />
              </div>
            )}

            {/* Best Value Market */}
            <div className="glass-card p-5 rounded-xl">
              <h3 className="text-xs font-bold text-green-400 uppercase mb-2 flex items-center gap-2">
                <Gem size={14} /> Best Value Market
              </h3>
              <div className="text-lg font-bold text-white mb-2">{analysis.best_value_market}</div>
              <p className="text-sm text-neutral-400">{analysis.market_reasoning}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="glass-panel p-4 border-t border-neutral-800/50 sticky bottom-0 z-20">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full glass-card hover:bg-red-900/30 text-neutral-400 hover:text-red-400 p-3 rounded-xl transition-all flex items-center justify-center gap-2 active-scale"
        >
          <Trash2 size={18} />
          <span className="text-sm font-bold uppercase">Elimina Analisi</span>
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/95 z-[150] flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="glass-card p-6 rounded-2xl text-center max-w-sm w-full border border-red-900/50">
            <Trash2 size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Eliminare Analisi?</h3>
            <p className="text-neutral-400 text-sm mb-6">
              Questa azione è irreversibile. Il pronostico verrà perso per sempre.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setShowDeleteConfirm(false)} variant="secondary" className="flex-1">
                ANNULLA
              </Button>
              <Button onClick={onDelete} variant="danger" className="flex-1">
                ELIMINA
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
