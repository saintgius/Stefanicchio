
import React, { useState, useEffect } from 'react';
import { AnalysisResult, ProcessedMatch, RiskLevel, FootballDataMatch, WeatherData } from '../types';
import { StorageService } from '../services/storage';
import { X, TrendingUp, AlertOctagon, ShieldAlert, BrainCircuit, History, Zap, Swords, Percent, DollarSign, BarChart3, FileText, CloudRain, Wind, Sun, Cloud, CloudSnow, Thermometer, Crown, Ambulance, Megaphone, UserCog, Target, Crosshair, Layers, Timer, AlertTriangle, Gavel, Scale } from 'lucide-react';
import { Button } from './Button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

// Mini Icon component helper - Outside to avoid hoisting issues
const ArrowUpRightIcon = ({size, className}: {size: number, className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
);

interface MatchAnalysisOverlayProps {
  match: ProcessedMatch;
  analysis: AnalysisResult;
  onClose: () => void;
  onDelete: () => void;
  onAddToSlip: (match: string, selection: string, odds: number) => void;
  weather: WeatherData | null;
  league?: 'SA' | 'CL';
}

export const MatchAnalysisOverlay: React.FC<MatchAnalysisOverlayProps> = ({ match, analysis, onClose, onDelete, onAddToSlip, weather, league = 'SA' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'advanced'>('overview');
  
  // Advanced Form State
  const [homeAdvancedForm, setHomeAdvancedForm] = useState<{result: 'W'|'D'|'L', score: string, color: string, tooltip: string}[]>([]);
  const [awayAdvancedForm, setAwayAdvancedForm] = useState<{result: 'W'|'D'|'L', score: string, color: string, tooltip: string}[]>([]);
  
  const [homeRank, setHomeRank] = useState<number | null>(null);
  const [awayRank, setAwayRank] = useState<number | null>(null);
  const [h2hMatches, setH2hMatches] = useState<FootballDataMatch[]>([]);

  const isChampions = league === 'CL';
  const themeText = isChampions ? 'text-blue-500' : 'text-redzone-600';
  const themeBorder = isChampions ? 'border-blue-600' : 'border-redzone-600';
  const themeAccent = isChampions ? 'bg-blue-600' : 'bg-redzone-600';

  useEffect(() => {
    // New Advanced Form Logic
    setHomeAdvancedForm(StorageService.getAdvancedForm(match.homeTeam));
    setAwayAdvancedForm(StorageService.getAdvancedForm(match.awayTeam));
    
    setHomeRank(StorageService.getTeamRank(match.homeTeam));
    setAwayRank(StorageService.getTeamRank(match.awayTeam));
    setH2hMatches(StorageService.getH2HMatches(match.homeTeam, match.awayTeam));
  }, [match]);

  // Calculate implied probabilities
  const margin = (1/match.odds.home + 1/match.odds.draw + 1/match.odds.away);
  const probHome = Math.round(((1/match.odds.home) / margin) * 100);
  const probDraw = Math.round(((1/match.odds.draw) / margin) * 100);
  const probAway = Math.round(((1/match.odds.away) / margin) * 100);

  const getRiskColor = (level: RiskLevel) => {
    switch(level) {
      case RiskLevel.LOW: return 'text-green-500';
      case RiskLevel.MED: return 'text-yellow-500';
      case RiskLevel.HIGH: return 'text-red-500';
      default: return 'text-white';
    }
  };

  const renderAdvancedForm = (form: {result: 'W'|'D'|'L', score: string, color: string, tooltip: string}[]) => (
      <div className="flex gap-1.5">
          {form.map((f, i) => (
              <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full ${f.color} shadow-sm border border-black/20 cursor-help`}
                  title={f.tooltip}
              ></div>
          ))}
          {form.length === 0 && <span className="text-xs text-neutral-600">N/D</span>}
      </div>
  );

  const getWeatherIcon = () => {
      if (!weather) return <Sun size={20} className="text-neutral-500"/>;
      switch (weather.condition) {
          case 'RAIN': return <CloudRain size={24} className="text-blue-400" />;
          case 'WIND': return <Wind size={24} className="text-gray-300" />;
          case 'SNOW': return <CloudSnow size={24} className="text-white" />;
          case 'CLOUDY': return <Cloud size={24} className="text-gray-400" />;
          default: return <Sun size={24} className="text-yellow-500" />;
      }
  };

  // Chart Data for Confidence Gauge
  const confidenceData = [
    { name: 'Confidence', value: analysis.confidence_score },
    { name: 'Risk', value: 100 - analysis.confidence_score }
  ];
  const CONFIDENCE_COLORS = [analysis.confidence_score > 70 ? '#22c55e' : analysis.confidence_score > 40 ? '#eab308' : '#ef4444', '#1f2937'];

  // Chart Data for Probabilities
  const probsData = [
      { name: '1', prob: probHome },
      { name: 'X', prob: probDraw },
      { name: '2', prob: probAway }
  ];
  
  // Helper for quick add
  const QuickAddButton = ({ pick, odd }: {pick: string, odd: number}) => (
      <button 
        onClick={() => onAddToSlip(`${match.homeTeam} - ${match.awayTeam}`, pick, odd)}
        className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-2 py-1 rounded flex items-center gap-1"
      >
          <DollarSign size={10} /> Add
      </button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-darkbg animate-fade-in overflow-y-auto flex flex-col">
      
      {/* Header */}
      <div className="sticky top-0 bg-cardbg/95 backdrop-blur border-b border-neutral-800 p-4 flex justify-between items-center z-20 shadow-md">
        <div>
          <h2 className="font-black text-lg leading-none uppercase tracking-tight">
            WAR ROOM <span className={themeText}>AI</span>
          </h2>
          <p className="text-xs text-neutral-500 font-mono mt-1">{match.homeTeam} vs {match.awayTeam} <span className="opacity-50 mx-1">|</span> {isChampions ? 'UCL' : 'SA'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="bg-neutral-800 p-2 rounded-full hover:bg-neutral-700 transition-colors text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 bg-neutral-900 sticky top-[70px] z-10">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'overview' ? `${themeBorder} text-white` : 'border-transparent text-neutral-500'}`}
        >
          Analisi
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'stats' ? `${themeBorder} text-white` : 'border-transparent text-neutral-500'}`}
        >
          Forma
        </button>
        <button 
          onClick={() => setActiveTab('advanced')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'advanced' ? `${themeBorder} text-white` : 'border-transparent text-neutral-500'}`}
        >
          Pronostici
        </button>
      </div>

      <div className="p-4 space-y-6 pb-24 flex-1 overflow-y-auto">
        
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* TURNOVER ALERT */}
            {analysis.turnover_alert && (
                <div className="bg-yellow-900/20 border border-yellow-600 rounded-xl p-4 flex gap-3 animate-pulse">
                    <AlertTriangle size={24} className="text-yellow-500 shrink-0" />
                    <div>
                        <h3 className="text-yellow-500 font-bold uppercase text-xs mb-1">Massiccio Turnover Rilevato</h3>
                        <p className="text-neutral-300 text-sm leading-snug">{analysis.turnover_alert}</p>
                    </div>
                </div>
            )}

            {/* Main Prediction Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-[0_0_30px_rgba(220,38,38,0.1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit size={120} />
              </div>
              
              <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`${isChampions ? 'bg-blue-900/30 text-blue-500 border-blue-900/50' : 'bg-redzone-900/30 text-redzone-500 border-redzone-900/50'} border px-3 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2`}>
                      <Zap size={12} /> Consigliata
                    </span>
                    <span className={`font-mono font-bold ${getRiskColor(analysis.risk_level)} flex items-center gap-2 text-xs`}>
                      RISCHIO {analysis.risk_level}
                    </span>
                  </div>
                  
                  <div className="text-3xl font-black text-white mb-3 tracking-tighter">
                    {analysis.recommended_bet}
                  </div>
                  
                  <Button 
                    className="w-full mb-4 text-xs py-2 bg-green-600 hover:bg-green-500 border-none shadow-none text-white"
                    onClick={() => onAddToSlip(`${match.homeTeam} - ${match.awayTeam}`, analysis.recommended_bet, 1.85)} 
                  >
                    <DollarSign size={14} /> GIOCA QUESTA (Safe)
                  </Button>

                  <p className={`text-neutral-300 text-sm leading-relaxed border-l-2 pl-3 font-medium ${themeBorder}`}>
                    {analysis.reasoning}
                  </p>
              </div>
            </div>
            
            {/* REFEREE DOSSIER */}
            {analysis.referee_analysis && (
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-neutral-700">
                        <div className="bg-black p-1.5 rounded text-neutral-400">
                             <Gavel size={16} />
                        </div>
                        <h3 className="text-xs font-bold text-neutral-300 uppercase">Dossier Arbitro</h3>
                    </div>
                    <p className="text-sm text-white italic">{analysis.referee_analysis}</p>
                </div>
            )}
            
            {/* INJURIES & KEY PLAYERS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Unavailable */}
                <div className="bg-cardbg border border-red-900/30 rounded-xl p-4 bg-red-900/5">
                   <div className="flex items-center gap-2 mb-2">
                      <Ambulance size={16} className="text-red-400" />
                      <h3 className="text-xs font-bold text-red-400 uppercase">Probabili Indisponibili</h3>
                   </div>
                   <div className="text-xs text-neutral-300 space-y-1">
                       {analysis.unavailable_players && analysis.unavailable_players.length > 0 ? (
                           analysis.unavailable_players.map((p, i) => (
                               <div key={i} className="flex items-center gap-2">
                                   <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                                   {p}
                               </div>
                           ))
                       ) : (
                           <span className="text-neutral-500 italic">Nessun indisponibile di rilievo segnalato.</span>
                       )}
                   </div>
                </div>
                
                {/* Key Players */}
                <div className="bg-cardbg border border-yellow-900/30 rounded-xl p-4 bg-yellow-900/5">
                   <div className="flex items-center gap-2 mb-2">
                      <Crown size={16} className="text-yellow-500" />
                      <h3 className="text-xs font-bold text-yellow-500 uppercase">Uomini Chiave</h3>
                   </div>
                   <p className="text-xs text-neutral-300 leading-snug">
                       {analysis.key_players_analysis || "Analisi giocatori chiave non disponibile."}
                   </p>
                </div>
            </div>
            
            {/* NEW: MANAGER DUEL & ATMOSPHERE */}
            {analysis.manager_duel && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <UserCog size={16} className="text-purple-400" />
                        <h3 className="text-xs font-bold text-purple-400 uppercase">Duello Allenatori</h3>
                    </div>
                    <p className="text-xs text-neutral-300">{analysis.manager_duel}</p>
                </div>
            )}
            
            {/* DEEP TACTICAL INSIGHT */}
            <div className="bg-cardbg border border-neutral-800 rounded-xl p-5">
               <div className="flex items-center gap-2 mb-4 pb-2 border-b border-neutral-800">
                 <FileText size={18} className={isChampions ? 'text-blue-400' : 'text-red-400'} />
                 <h3 className="font-bold text-white text-sm uppercase">Analisi Tattica Profonda</h3>
               </div>
               <div className="text-sm text-neutral-300 leading-relaxed space-y-2 whitespace-pre-line">
                 {analysis.tactical_insight || "Analisi tattica non disponibile."}
               </div>
            </div>

            {/* CYNICAL MODE ALERT */}
            {analysis.cynical_take && (
              <div className="bg-black border border-pink-900/50 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
                <div className="flex items-center gap-2 mb-3 text-pink-500 font-bold uppercase text-xs tracking-widest">
                  <ShieldAlert size={16} /> Filtro Anti-Tifo Attivo
                </div>
                <p className="text-gray-300 italic text-sm font-medium">
                  "{analysis.cynical_take}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB: STATS (Form & History) */}
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-cardbg border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <History size={18} className="text-blue-500" />
                <h3 className="font-bold text-white text-sm uppercase">Forma Recente (Visual)</h3>
              </div>

              <div className="space-y-4">
                {/* HOME TEAM ROW */}
                <div className="flex flex-col gap-2">
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                        {homeRank && (
                          <span className="bg-neutral-800 text-white px-1.5 py-0.5 rounded text-[10px] font-bold border border-neutral-700">
                            {homeRank}°
                          </span>
                        )}
                        <span className="font-bold text-sm">{match.homeTeam}</span>
                     </div>
                   </div>
                   {renderAdvancedForm(homeAdvancedForm)}
                </div>
                
                <div className="w-full h-px bg-neutral-800"></div>
                
                {/* AWAY TEAM ROW */}
                <div className="flex flex-col gap-2">
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                        {awayRank && (
                          <span className="bg-neutral-800 text-white px-1.5 py-0.5 rounded text-[10px] font-bold border border-neutral-700">
                            {awayRank}°
                          </span>
                        )}
                        <span className="font-bold text-sm">{match.awayTeam}</span>
                     </div>
                   </div>
                   {renderAdvancedForm(awayAdvancedForm)}
                </div>
                
                <div className="mt-4 pt-4 border-t border-neutral-800 text-[10px] text-neutral-500 flex gap-4 justify-center">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-600 shadow-[0_0_5px_#22c55e]"></div> Netta</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Risicata</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-neutral-600"></div> X</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-600"></div> Persa</div>
                </div>
              </div>

            {/* H2H Matches */}
            {h2hMatches.length > 0 ? (
              <div className="bg-cardbg border border-neutral-800 rounded-xl p-5 mt-4">
                <div className="flex items-center gap-2 mb-4">
                   <Swords size={18} className="text-yellow-500" />
                   <h3 className="font-bold text-white text-sm uppercase">Precedenti (Stagione)</h3>
                </div>
                <div className="space-y-2">
                  {h2hMatches.map(m => (
                    <div key={m.id} className="bg-neutral-900/50 p-3 rounded border border-neutral-800 flex justify-between items-center text-sm">
                      <div className="text-neutral-400 text-xs font-mono">{new Date(m.utcDate).toLocaleDateString('it-IT', {month:'short', day:'numeric'})}</div>
                      <div className="font-bold text-white">
                        {m.homeTeam.name} <span className="text-yellow-500 mx-1">{m.score.fullTime.home} - {m.score.fullTime.away}</span> {m.awayTeam.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
               <div className="p-4 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl mt-4">
                 Nessun precedente diretto in questa stagione.
               </div>
            )}
             
             {/* Probabilities Chart */}
            <div className="bg-cardbg border border-neutral-800 rounded-xl p-5 mt-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-2">
                  <BarChart3 size={14} /> Probabilità Implicite
              </h3>
              <div className="h-24 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={probsData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={20} tick={{fill: '#6b7280', fontSize: 10}} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#171717', borderColor: '#333', color: '#fff' }} 
                            itemStyle={{ color: '#fff' }}
                            cursor={{fill: 'transparent'}}
                        />
                        <Bar dataKey="prob" fill="#dc2626" radius={[0, 4, 4, 0]} barSize={12}>
                            {
                                probsData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : index === 1 ? '#4b5563' : '#dc2626'} />
                                ))
                            }
                        </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* TAB: ADVANCED (Detailed Predictions) */}
        {activeTab === 'advanced' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* CONFIDENCE GAUGE */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center relative">
                <span className="text-[10px] font-bold uppercase text-neutral-500 mb-4 tracking-widest absolute top-4 left-4">AI Confidence</span>
                <div className="h-32 w-full max-w-[200px] relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={confidenceData}
                                cx="50%"
                                cy="100%"
                                startAngle={180}
                                endAngle={0}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {confidenceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CONFIDENCE_COLORS[index % CONFIDENCE_COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute bottom-0 left-0 w-full text-center -mb-2">
                         <span className="text-3xl font-black text-white">{analysis.confidence_score}%</span>
                    </div>
                </div>
            </div>

            {/* STEFANICCHIO'S ARSENAL (NEW MULTI-PICK GRID) */}
            <div className={`bg-neutral-900 border border-neutral-800 rounded-xl p-5 overflow-hidden relative`}>
                <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                    <Crosshair size={80} />
                </div>
                <h3 className="text-sm font-black text-white uppercase mb-4 flex items-center gap-2 tracking-wide relative z-10">
                    <Target size={18} className="text-purple-500" /> Stefanicchio's Arsenal
                </h3>
                
                <div className="grid grid-cols-2 gap-3 relative z-10">
                    {/* Multigol */}
                    <div className="bg-cardbg border border-neutral-700 p-3 rounded-lg flex flex-col justify-between">
                        <div className="text-[10px] text-neutral-500 font-bold uppercase mb-1 flex items-center gap-1">
                            <Layers size={10} /> Multigol
                        </div>
                        <div className="font-bold text-white text-sm mb-2">{analysis.prediction_multigol || "N/A"}</div>
                        <QuickAddButton pick={analysis.prediction_multigol} odd={1.75} />
                    </div>

                    {/* Over/Under */}
                    <div className="bg-cardbg border border-neutral-700 p-3 rounded-lg flex flex-col justify-between">
                         <div className="text-[10px] text-neutral-500 font-bold uppercase mb-1 flex items-center gap-1">
                            <ArrowUpRightIcon size={10} /> Over/Under
                        </div>
                        <div className="font-bold text-white text-sm mb-2">{analysis.prediction_over_under || "N/A"}</div>
                        <QuickAddButton pick={analysis.prediction_over_under} odd={1.80} />
                    </div>

                    {/* Goalscorer */}
                    <div className="bg-cardbg border border-neutral-700 p-3 rounded-lg flex flex-col justify-between">
                        <div className="text-[10px] text-neutral-500 font-bold uppercase mb-1 flex items-center gap-1">
                            <Target size={10} /> Marcatore
                        </div>
                        <div className="font-bold text-white text-sm mb-2">{analysis.prediction_goalscorer || "N/A"}</div>
                        <QuickAddButton pick={analysis.prediction_goalscorer} odd={2.50} />
                    </div>

                    {/* Combo */}
                    <div className="bg-cardbg border border-neutral-700 p-3 rounded-lg flex flex-col justify-between">
                        <div className="text-[10px] text-neutral-500 font-bold uppercase mb-1 flex items-center gap-1">
                            <Zap size={10} /> Combo
                        </div>
                        <div className="font-bold text-white text-sm mb-2">{analysis.prediction_combo || "N/A"}</div>
                        <QuickAddButton pick={analysis.prediction_combo} odd={2.20} />
                    </div>
                </div>
            </div>

            {/* EXACT SCORE BOARD */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${isChampions ? 'via-blue-600' : 'via-yellow-600'} to-transparent`}></div>
                <span className="text-[10px] font-bold uppercase text-neutral-500 mb-2 tracking-widest">Risultato Esatto</span>
                <div className="text-5xl font-black text-white tracking-tighter neon-text">
                  {analysis.exact_score || "-:-"}
                </div>
            </div>

             {/* RISKY BET SECTION */}
             <div className="bg-neutral-900/30 border border-orange-900/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-orange-900/20">
                  <AlertOctagon size={18} className="text-orange-500" />
                  <h3 className="font-bold text-white text-sm uppercase">Scommessa Rischiosa</h3>
                </div>
                <div className="text-lg font-black text-white mb-1">
                  {analysis.risky_bet || "N/A"}
                </div>
                <Button 
                    className="w-full mb-3 text-[10px] py-1 bg-orange-900/50 hover:bg-orange-800 border-orange-900 text-orange-200"
                    onClick={() => onAddToSlip(`${match.homeTeam} - ${match.awayTeam}`, analysis.risky_bet, 2.50)} // Placeholder odds
                  >
                    <DollarSign size={12} /> GIOCA QUESTA (Risky)
                  </Button>
                <p className="text-xs text-neutral-400 italic">
                  {analysis.risky_reasoning || "Dati non disponibili per il rischio."}
                </p>
             </div>

            {/* Cross-Market Logic */}
             <div className="bg-cardbg border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-neutral-800">
                <TrendingUp size={18} className="text-green-500" />
                <h3 className="font-bold text-white text-sm uppercase">Logica Cross-Market</h3>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {analysis.market_reasoning}
              </p>
            </div>

            {/* Variance Simulation */}
            <div className="bg-cardbg border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Percent size={18} className="text-red-500" />
                <h3 className="font-bold text-white text-sm uppercase">Stress Test (Drawdown)</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-neutral-400 font-mono">
                  <span>Stabilità</span>
                  <span>Max Drawdown</span>
                </div>
                
                <div className="h-3 bg-neutral-900 rounded-full overflow-hidden flex">
                  <div className="h-full bg-neutral-700" style={{ width: `${100 - Math.min(analysis.max_drawdown * 8, 90)}%` }}></div>
                  <div className="h-full bg-red-600 animate-pulse" style={{ width: `${Math.min(analysis.max_drawdown * 8, 90)}%` }}></div>
                </div>
                
                <div className="flex justify-between items-center mt-1">
                   <span className="text-[10px] text-neutral-500">Probabilità Varianza</span>
                   <span className="text-red-500 font-bold font-mono text-lg">
                     {analysis.max_drawdown} <span className="text-[10px] font-sans font-normal text-neutral-400">Perdite Consec.</span>
                   </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};