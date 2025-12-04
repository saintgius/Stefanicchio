
import React, { useState, useEffect } from 'react';
import { ProcessedMatch, OracleEvent } from '../types';
import { GeminiService } from '../services/gemini';
import { StorageService } from '../services/storage';
import { X, Sparkles, Clock, Trophy } from 'lucide-react';

interface OracleOverlayProps {
  match: ProcessedMatch;
  apiKey: string;
  onClose: () => void;
}

export const OracleOverlay: React.FC<OracleOverlayProps> = ({ match, apiKey, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<OracleEvent[]>([]);
  const [visibleEvents, setVisibleEvents] = useState<OracleEvent[]>([]);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const runSimulation = async () => {
      const context = StorageService.getMatchContext(match.homeTeam, match.awayTeam);
      const result = await GeminiService.simulateMatch(apiKey, match.homeTeam, match.awayTeam, context);
      
      // Ensure events are sorted by minute
      const sorted = result.sort((a, b) => a.minute - b.minute);
      setEvents(sorted);
      setLoading(false);
    };
    
    runSimulation();
  }, []);

  // Animation Loop
  useEffect(() => {
    if (loading || events.length === 0) return;
    
    let currentIndex = 0;
    const interval = setInterval(() => {
       if (currentIndex < events.length) {
           setVisibleEvents(prev => [...prev, events[currentIndex]]);
           currentIndex++;
           
           // Auto-scroll to bottom
           const container = document.getElementById('oracle-feed');
           if (container) container.scrollTop = container.scrollHeight;

       } else {
           setCompleted(true);
           clearInterval(interval);
       }
    }, 1500); // Add new event every 1.5s

    return () => clearInterval(interval);
  }, [loading, events]);

  const getEventIcon = (type: string) => {
      switch(type) {
          case 'GOAL': return '⚽';
          case 'CARD': return '🟨';
          case 'VAR': return '📺';
          case 'SUB': return '🔄';
          case 'FULLTIME': return '🏁';
          default: return '⚡';
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col font-mono">
        {/* Header */}
        <div className="border-b border-purple-900/50 p-4 flex justify-between items-center bg-purple-900/10 backdrop-blur">
            <div className="flex items-center gap-2">
                <Sparkles className="text-purple-400 animate-pulse" size={20} />
                <h2 className="text-purple-400 font-bold tracking-widest uppercase">The Oracle <span className="text-xs opacity-50">v2050</span></h2>
            </div>
            <button onClick={onClose} className="text-neutral-500 hover:text-white"><X size={24}/></button>
        </div>

        {/* Main Feed */}
        <div id="oracle-feed" className="flex-1 overflow-y-auto p-6 space-y-6 relative">
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-purple-500 gap-4">
                    <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-xs tracking-widest animate-pulse">GENERATING TIMELINE...</div>
                </div>
            )}

            {visibleEvents.map((ev, i) => (
                <div key={i} className="flex gap-4 animate-fade-in">
                    <div className="flex flex-col items-center">
                        <div className="text-purple-500 font-bold text-sm w-8 text-center">{ev.minute}'</div>
                        <div className="h-full w-px bg-purple-900/50 my-1"></div>
                    </div>
                    <div className="pb-4">
                         <div className={`p-4 rounded-xl border border-purple-900/30 bg-purple-900/10 max-w-xs ${ev.type === 'GOAL' ? 'shadow-[0_0_15px_rgba(168,85,247,0.3)] border-purple-500/50' : ''}`}>
                             <div className="flex items-center gap-2 mb-1">
                                 <span className="text-lg">{getEventIcon(ev.type)}</span>
                                 <span className="text-xs font-bold text-purple-300 uppercase">{ev.type}</span>
                                 {ev.team && <span className="text-xs text-neutral-400">• {ev.team}</span>}
                             </div>
                             <p className="text-neutral-200 text-sm leading-relaxed">
                                 {ev.description}
                             </p>
                         </div>
                    </div>
                </div>
            ))}

            {completed && (
                <div className="py-8 text-center animate-fade-in">
                    <div className="inline-block p-4 border border-purple-500 rounded-xl bg-purple-900/20">
                        <Trophy className="text-yellow-500 mx-auto mb-2" size={32} />
                        <div className="text-white font-bold uppercase tracking-widest text-sm">Simulazione Completata</div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer Overlay for Vibe */}
        <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-5"></div>
    </div>
  );
};
