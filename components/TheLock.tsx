
import React, { useState, useEffect } from 'react';
import { ProcessedMatch } from '../types';
import { StorageService } from '../services/storage';
import { Lock, Unlock, Gem, Trophy, ArrowRight } from 'lucide-react';
import { Button } from './Button';

interface TheLockProps {
  matches: ProcessedMatch[];
  onAddToSlip: (match: string, selection: string, odds: number) => void;
}

export const TheLock: React.FC<TheLockProps> = ({ matches, onAddToSlip }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [safeMatch, setSafeMatch] = useState<ProcessedMatch | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // FIND THE LOCK
    const findSafeBet = () => {
      // Strategy 1: High Confidence (Good Odds + Good Form)
      let candidates = matches.filter(m => {
        const isSafeOdds = m.odds.home >= 1.30 && m.odds.home <= 1.75;
        if (!isSafeOdds) return false;
        const form = StorageService.getFormArray(m.homeTeam);
        const winCount = form.filter(r => r === 'W').length;
        return winCount >= 3;
      });

      // Strategy 2: Fallback (Just Safe Odds) if no stats or no match found
      if (candidates.length === 0) {
          // Relaxed odds for fallback
          candidates = matches.filter(m => m.odds.home >= 1.20 && m.odds.home <= 1.65);
      }

      // Sort by lowest odds (Safest)
      candidates.sort((a, b) => a.odds.home - b.odds.home);

      if (candidates.length > 0) {
        setSafeMatch(candidates[0]);
      }
    };

    findSafeBet();
  }, [matches]);

  const handleUnlock = () => {
    setAnalyzing(true);
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    setTimeout(() => {
        setAnalyzing(false);
        setIsOpen(true);
        if (navigator.vibrate) navigator.vibrate(200);
    }, 1500);
  };

  if (!safeMatch) return null; 

  return (
    <div className="mb-6 animate-fade-in select-none">
      {!isOpen ? (
        <div 
            onClick={handleUnlock}
            className="bg-gradient-to-br from-yellow-900/80 to-neutral-900 border border-yellow-700/50 rounded-xl p-6 relative overflow-hidden cursor-pointer shadow-[0_0_20px_rgba(234,179,8,0.15)] group hover:scale-[1.02] transition-transform"
        >
            {/* Metallic Shine Effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent -translate-x-full group-hover:animate-shine"></div>
            
            <div className="flex flex-col items-center justify-center gap-3 text-center relative z-10">
                <div className={`p-4 bg-neutral-900 rounded-full border-2 border-yellow-600 shadow-lg ${analyzing ? 'animate-bounce' : ''}`}>
                    <Lock size={32} className="text-yellow-500" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest">La Cassaforte</h3>
                    <p className="text-xs text-yellow-500/80 font-mono mt-1">
                        {analyzing ? "DECIFRATURA ALGORITMO IN CORSO..." : "TAP TO UNLOCK DAILY SAFE BET"}
                    </p>
                </div>
            </div>
        </div>
      ) : (
        <div className="bg-gradient-to-b from-neutral-900 to-cardbg border-2 border-yellow-600 rounded-xl p-0 overflow-hidden relative shadow-[0_0_30px_rgba(234,179,8,0.2)] animate-open-safe">
            <div className="bg-yellow-600/20 p-3 flex justify-between items-center border-b border-yellow-600/30">
                <div className="flex items-center gap-2 text-yellow-500 font-bold uppercase text-xs tracking-widest">
                    <Unlock size={16} />
                    Cassaforte Aperta
                </div>
                <Gem size={16} className="text-yellow-400 animate-pulse" />
            </div>
            
            <div className="p-5 text-center">
                <h4 className="text-neutral-400 text-xs font-bold uppercase mb-2">Vittoria Casalinga</h4>
                <div className="text-2xl font-black text-white mb-1">{safeMatch.homeTeam}</div>
                <div className="text-sm text-neutral-400 mb-4">vs {safeMatch.awayTeam}</div>
                
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 mb-4 flex items-center justify-between">
                    <div className="text-left">
                        <div className="text-[10px] text-neutral-500 uppercase font-bold">Quota Sicura</div>
                        <div className="text-xl font-mono font-bold text-yellow-500">{safeMatch.odds.home.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-neutral-500 uppercase font-bold">Forma</div>
                        <div className="flex gap-1 mt-1">
                            {StorageService.getFormArray(safeMatch.homeTeam).slice(-3).map((r, i) => (
                                <span key={i} className={`w-3 h-3 rounded-sm ${r === 'W' ? 'bg-green-500' : 'bg-neutral-700'}`}></span>
                            ))}
                        </div>
                    </div>
                </div>

                <Button 
                    onClick={() => onAddToSlip(`${safeMatch.homeTeam} - ${safeMatch.awayTeam}`, '1', safeMatch.odds.home)}
                    className="w-full bg-yellow-700 hover:bg-yellow-600 text-white border-none shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                >
                    AGGIUNGI ALLA SCHEDINA <ArrowRight size={16} />
                </Button>
            </div>
        </div>
      )}
      <style>{`
        @keyframes shine {
            100% { left: 125%; }
        }
        .animate-shine {
            animation: shine 1s;
        }
        @keyframes openSafe {
            0% { transform: scaleY(0); opacity: 0; }
            100% { transform: scaleY(1); opacity: 1; }
        }
        .animate-open-safe {
            animation: openSafe 0.3s ease-out forwards;
            transform-origin: top;
        }
      `}</style>
    </div>
  );
};
