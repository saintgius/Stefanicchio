


import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/gemini';
import { UserStats, BetRecord } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Button } from '../components/Button';
import { Plus, DollarSign, Trophy, ChevronDown, ChevronUp, Layers, Trash2, TrendingUp, Target, BrainCircuit, Filter, Skull } from 'lucide-react';
import { BetSlip } from '../components/BetSlip';
import { Heatmap } from '../components/Heatmap';
import { Achievements } from '../components/Achievements';
import { ProfitChart } from '../components/ProfitChart';

interface ReportProps {
  isBetSlipOpen?: boolean;
  onOpenGlobalSlip?: () => void;
}

export const Report: React.FC<ReportProps> = ({ isBetSlipOpen, onOpenGlobalSlip }) => {
  const [stats, setStats] = useState<UserStats>({ totalWagered: 0, netProfit: 0, bets: [] });
  const [expandedBets, setExpandedBets] = useState<number[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'LOSS' | 'PENDING'>('ALL');

  // Long Press / Delete State
  const [betToDelete, setBetToDelete] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  // Autopsy State
  const [autopsyBet, setAutopsyBet] = useState<BetRecord | null>(null);
  const [autopsyResult, setAutopsyResult] = useState<string | null>(null);
  const [autopsyLoading, setAutopsyLoading] = useState(false);

  // Refresh stats when component becomes visible (managed by App tab state) or every few seconds
  useEffect(() => {
    setStats(StorageService.getStats());
    const interval = setInterval(() => setStats(StorageService.getStats()), 2000); // Polling for sync with Dashboard
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = (id: number, result: 'WIN' | 'LOSS') => {
    const updated = StorageService.updateBetStatus(id, result);
    if (updated) setStats(updated);
  };

  const handleDeleteBet = () => {
    if (betToDelete !== null) {
      const updated = StorageService.deleteBet(betToDelete);
      if (updated) setStats(updated);
      setBetToDelete(null);
    }
  };

  const toggleExpand = (id: number) => {
    if (isLongPress.current) return; // Prevent expand if long press was triggered
    setExpandedBets(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  // --- LONG PRESS HANDLERS ---
  const startPress = (id: number) => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
      setBetToDelete(id);
    }, 800);
  };

  const endPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  // --- AUTOPSY LOGIC ---
  const handleAutopsy = async (bet: BetRecord) => {
    setAutopsyBet(bet);
    setAutopsyLoading(true);
    setAutopsyResult(null);

    const keys = StorageService.getKeys();
    if (!keys.geminiKey) {
      setAutopsyResult("Chiave Gemini Mancante.");
      setAutopsyLoading(false);
      return;
    }

    const betDesc = bet.selections.map(s => `${s.match} (${s.selection})`).join(', ');
    const analysis = await GeminiService.generateAutopsy(keys.geminiKey, betDesc);
    setAutopsyResult(analysis);
    setAutopsyLoading(false);
  };

  // --- CALCULATIONS ---
  const settledBets = stats.bets.filter(b => b.result !== 'PENDING');
  const winCount = settledBets.filter(b => b.result === 'WIN').length;
  const winRate = settledBets.length > 0 ? (winCount / settledBets.length) * 100 : 0;
  const roi = stats.totalWagered > 0 ? (stats.netProfit / stats.totalWagered) * 100 : 0;

  // Cumulative Profit Trend
  const trendData = [...stats.bets]
    .sort((a, b) => a.id - b.id) // Sort by creation time ascending
    .filter(b => b.result !== 'PENDING')
    .reduce((acc: any[], bet) => {
      const lastValue = acc.length > 0 ? acc[acc.length - 1].value : 0;
      const newValue = bet.result === 'WIN' ? lastValue + bet.profit : lastValue - bet.stake;
      acc.push({ name: bet.date, value: newValue });
      return acc;
    }, []);
  // Add start point
  if (trendData.length > 0) trendData.unshift({ name: 'Start', value: 0 });

  // Filter Logic
  const filteredBets = stats.bets.filter(bet => {
    if (filter === 'ALL') return true;
    return bet.result === filter;
  });

  // AI Coach Logic
  const getCoachAdvice = () => {
    if (stats.bets.length < 5) return "Gioca almeno 5 schedine per sbloccare i consigli del Coach.";
    if (roi < -15) return "⚠️ Stop! Il tuo ROI è molto negativo. Riduci lo stake del 50% e concentrati solo su singole 'Low Risk'. Evita di inseguire le perdite.";
    if (winRate < 40) return "📉 Win Rate basso. Stai rischiando troppo su quote alte. Cerca valore tra quota 1.50 e 2.00.";
    if (roi > 10) return "🔥 Stai andando alla grande! Mantieni la disciplina e non alzare lo stake troppo in fretta.";
    return "⚖️ Andamento stabile. Analizza meglio i mercati secondari (Over/Goal) per trovare più valore.";
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24 relative">

      {/* DELETE CONFIRMATION MODAL */}
      {betToDelete !== null && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center animate-fade-in p-6">
          <div className="bg-neutral-900 border border-red-900 p-6 rounded-xl text-center max-w-sm w-full shadow-2xl">
            <Trash2 size={48} className="text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Eliminare Schedina?</h3>
            <p className="text-neutral-400 text-sm mb-6">
              Questa azione è irreversibile. Le statistiche (Profitto/ROI) verranno ricalcolate.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setBetToDelete(null)} variant="secondary" className="flex-1">
                ANNULLA
              </Button>
              <Button onClick={handleDeleteBet} variant="danger" className="flex-1">
                ELIMINA
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AUTOPSY MODAL */}
      {autopsyBet && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center animate-fade-in p-6">
          <div className="bg-neutral-900 border border-purple-900 p-6 rounded-xl text-center max-w-sm w-full shadow-[0_0_30px_rgba(147,51,234,0.2)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-purple-600"></div>
            <Skull size={48} className="text-purple-500 mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl font-black text-white mb-1 uppercase tracking-widest">The Autopsy</h3>
            <p className="text-[10px] text-neutral-500 mb-4 font-mono">Analisi Post-Mortem Scommessa</p>

            <div className="bg-black/40 p-4 rounded-lg border border-purple-900/30 mb-6 min-h-[100px] flex items-center justify-center">
              {autopsyLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-purple-400 animate-pulse">Analizzando il fallimento...</span>
                </div>
              ) : (
                <p className="text-neutral-300 text-sm italic leading-relaxed">
                  "{autopsyResult}"
                </p>
              )}
            </div>

            <Button onClick={() => setAutopsyBet(null)} className="w-full bg-purple-900/50 hover:bg-purple-800 border border-purple-800">
              CHIUDI
            </Button>
          </div>
        </div>
      )}

      {/* HEATMAP SECTION */}
      <Heatmap bets={stats.bets} />

      {/* HEADER STATS GRID */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-cardbg border border-neutral-800 p-4 rounded-xl relative overflow-hidden">
          <h3 className="text-neutral-500 text-[10px] font-bold uppercase mb-1">Profitto Netto</h3>
          <p className={`text-2xl font-black tracking-tighter ${stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(2)}€
          </p>
        </div>
        <div className="bg-cardbg border border-neutral-800 p-4 rounded-xl">
          <h3 className="text-neutral-500 text-[10px] font-bold uppercase mb-1">Totale Giocato</h3>
          <p className="text-2xl font-black tracking-tighter text-white">
            {stats.totalWagered.toFixed(2)}€
          </p>
        </div>
        <div className="bg-cardbg border border-neutral-800 p-4 rounded-xl">
          <h3 className="text-neutral-500 text-[10px] font-bold uppercase mb-1">ROI %</h3>
          <div className="flex items-end gap-1">
            <p className={`text-xl font-black ${roi >= 0 ? 'text-blue-400' : 'text-orange-500'}`}>
              {roi.toFixed(1)}%
            </p>
            <Target size={16} className="text-neutral-600 mb-1" />
          </div>
        </div>
        <div className="bg-cardbg border border-neutral-800 p-4 rounded-xl">
          <h3 className="text-neutral-500 text-[10px] font-bold uppercase mb-1">Win Rate</h3>
          <div className="flex items-end gap-1">
            <p className={`text-xl font-black ${winRate >= 50 ? 'text-purple-400' : 'text-neutral-400'}`}>
              {winRate.toFixed(0)}%
            </p>
            <TrendingUp size={16} className="text-neutral-600 mb-1" />
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS SECTION - NEW PREMIUM */}
      <Achievements />

      {/* COACH AI SECTION */}
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 border border-neutral-700 p-5 rounded-xl relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 p-3 opacity-5">
          <BrainCircuit size={100} />
        </div>
        <div className="flex items-start gap-3 relative z-10">
          <div className="bg-redzone-900/50 p-2 rounded-full border border-redzone-600 text-redzone-500 shrink-0">
            <BrainCircuit size={20} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-redzone-500 uppercase mb-1 tracking-widest">RedZone Coach</h3>
            <p className="text-sm text-gray-200 font-medium leading-snug italic">
              "{getCoachAdvice()}"
            </p>
          </div>
        </div>
      </div>

      {/* PROFIT CHART - NEW PREMIUM */}
      <ProfitChart bets={stats.bets} period="all" />

      {/* HISTORY SECTION */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            STORICO GIOCATE <span className="text-neutral-600 text-xs font-mono">({filteredBets.length})</span>
          </h3>
          <Button onClick={onOpenGlobalSlip} className="text-[10px] px-3 py-1.5 h-auto flex items-center gap-1">
            <Plus size={12} /> NUOVA
          </Button>
        </div>

        {/* FILTERS TAB */}
        <div className="flex bg-neutral-900 rounded-lg p-1 mb-4 border border-neutral-800">
          {(['ALL', 'WIN', 'LOSS', 'PENDING'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${filter === f ? 'bg-neutral-700 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              {f === 'ALL' ? 'TUTTE' : f === 'WIN' ? 'VINTE' : f === 'LOSS' ? 'PERSE' : 'APERTE'}
            </button>
          ))}
        </div>

        <div className="space-y-3 select-none">
          {filteredBets.map((bet) => (
            <div
              key={bet.id}
              className="bg-cardbg border border-neutral-800 rounded-lg overflow-hidden relative group transition-transform active:scale-[0.99]"
              onTouchStart={() => startPress(bet.id)}
              onTouchEnd={endPress}
              onMouseDown={() => startPress(bet.id)}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onClick={() => toggleExpand(bet.id)}
            >

              {/* Bet Header Row */}
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 transition-colors">

                {/* Left Side: Info */}
                <div className="flex items-center gap-3 pointer-events-none">
                  <div className={`p-2 rounded-full ${bet.type === 'MULTIPLE' ? 'bg-purple-900/20 text-purple-400' : 'bg-blue-900/20 text-blue-400'}`}>
                    {bet.type === 'MULTIPLE' ? <Layers size={16} /> : <DollarSign size={16} />}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      {bet.type === 'MULTIPLE' ? `Multipla (${bet.selections?.length || 0})` : bet.selections[0]?.match}
                    </div>
                    <div className="text-[10px] text-neutral-500 flex items-center gap-2">
                      {bet.date} • <span className="text-yellow-600 font-mono">@{bet.totalOdds.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-right pointer-events-none">
                    <div className="font-mono text-white text-sm font-bold">{bet.stake}€</div>
                    <div className="text-[10px] text-neutral-600 uppercase">Puntata</div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    {bet.result === 'PENDING' ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleStatusUpdate(bet.id, 'WIN')} className="bg-neutral-800 text-green-500 hover:bg-green-900/50 p-1.5 rounded text-xs font-bold border border-neutral-700">W</button>
                        <button onClick={() => handleStatusUpdate(bet.id, 'LOSS')} className="bg-neutral-800 text-red-500 hover:bg-red-900/50 p-1.5 rounded text-xs font-bold border border-neutral-700">L</button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className={`font-bold text-sm px-2 py-1 rounded border ${bet.result === 'WIN' ? 'bg-green-900/20 border-green-900 text-green-400' : 'bg-red-900/20 border-red-900 text-red-400'}`}>
                          {bet.result === 'WIN' ? `+${bet.profit.toFixed(2)}` : `-${bet.stake}`}
                        </div>
                        {bet.result === 'LOSS' && (
                          <button
                            onClick={() => handleAutopsy(bet)}
                            className="text-[8px] font-bold uppercase bg-purple-900/30 text-purple-400 border border-purple-900 rounded px-1 hover:bg-purple-900 flex items-center justify-center gap-1"
                          >
                            <Skull size={8} /> Autopsy
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedBets.includes(bet.id) && (
                <div className="bg-black/20 border-t border-neutral-800 p-3 text-sm space-y-2 animate-fade-in">
                  {bet.selections.map((sel, idx) => (
                    <div key={sel.id || idx} className="flex justify-between items-center text-neutral-400 border-b border-neutral-800/50 last:border-0 pb-2 last:pb-0">
                      <div className="flex flex-col">
                        <span className="text-xs text-white">{sel.match}</span>
                        <span className="text-[10px] text-neutral-500">Esito: <span className="text-neutral-300 font-bold">{sel.selection}</span></span>
                      </div>
                      <span className="font-mono text-yellow-600 text-xs">@{sel.odds.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between items-center mt-2">
                    <div className="text-[10px] text-neutral-500 uppercase">Vincita Potenziale</div>
                    <div className="text-green-500 font-bold font-mono">{(bet.stake * bet.totalOdds).toFixed(2)}€</div>
                  </div>
                  <div className="text-[10px] text-neutral-600 text-center pt-2 italic flex items-center justify-center gap-2">
                    <Trash2 size={10} /> Tieni premuto per eliminare.
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredBets.length === 0 && (
            <div className="text-center py-10 text-neutral-600 text-sm italic border border-dashed border-neutral-800 rounded-xl">
              Nessuna giocata qui. Stefanicchio sta ancora dormendo?
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
