
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { AnalysisResult } from '../types';
import { BookMarked, CheckCircle, XCircle, AlertTriangle, Save, Trophy, Percent, History } from 'lucide-react';
import { Button } from '../components/Button';

export const Archive: React.FC = () => {
    const [history, setHistory] = useState<{matchId: string, analysis: AnalysisResult}[]>([]);
    const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, accuracy: 0 });
    
    // Feedback Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [scoreInput, setScoreInput] = useState('');
    const [scorersInput, setScorersInput] = useState('');

    useEffect(() => {
        loadArchive();
    }, []);

    const loadArchive = () => {
        const allData = StorageService.getAllAnalyses();
        setHistory(allData);

        // Calc stats
        const rated = allData.filter(d => d.analysis.result);
        const wins = rated.filter(d => d.analysis.result === 'WIN').length;
        const losses = rated.filter(d => d.analysis.result === 'LOSS').length;
        const total = rated.length;
        const accuracy = total > 0 ? (wins / total) * 100 : 0;

        setStats({ total, wins, losses, accuracy });
    };

    const handleVote = (matchId: string, result: 'WIN' | 'LOSS') => {
        // Find current values to prepopulate if needed, or just set status
        const item = history.find(h => h.matchId === matchId);
        if (item) {
             StorageService.updateAnalysisFeedback(matchId, result, item.analysis.final_score || '', item.analysis.final_scorers || '');
             loadArchive();
        }
    };

    const startEditing = (item: {matchId: string, analysis: AnalysisResult}) => {
        setEditingId(item.matchId);
        setScoreInput(item.analysis.final_score || '');
        setScorersInput(item.analysis.final_scorers || '');
    };

    const saveDetails = (matchId: string) => {
        // Need current result status
        const item = history.find(h => h.matchId === matchId);
        const currentResult = item?.analysis.result || 'VOID';
        
        StorageService.updateAnalysisFeedback(matchId, currentResult, scoreInput, scorersInput);
        setEditingId(null);
        loadArchive();
    };

    const formatMatchName = (id: string) => {
        // id format: inter-milan-2023-10-20
        // remove date part roughly
        return id.replace(/-[0-9]{4}-[0-9]{2}-[0-9]{2}$/, '').replace(/-/g, ' ').toUpperCase();
    };

    const formatMatchDate = (id: string) => {
        const match = id.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})/);
        return match ? match[0] : 'Data N/D';
    };

    return (
        <div className="space-y-6 pb-24 animate-fade-in">
             <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
                 <div className="bg-yellow-900/20 p-3 rounded-full text-yellow-500 border border-yellow-900">
                     <BookMarked size={24} />
                 </div>
                 <div>
                     <h2 className="text-2xl font-black text-white uppercase tracking-tight">Archivio & Feedback</h2>
                     <p className="text-neutral-400 text-xs">Vota i pronostici passati per insegnare all'IA.</p>
                 </div>
             </div>

             {/* STATS SUMMARY */}
             <div className="grid grid-cols-3 gap-3">
                 <div className="bg-cardbg border border-neutral-800 p-4 rounded-xl text-center">
                     <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Accuratezza</div>
                     <div className="text-2xl font-black text-yellow-500 flex justify-center items-center gap-1">
                         <Percent size={18} /> {stats.accuracy.toFixed(0)}%
                     </div>
                 </div>
                 <div className="bg-cardbg border border-neutral-800 p-4 rounded-xl text-center">
                     <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Win</div>
                     <div className="text-2xl font-black text-green-500 flex justify-center items-center gap-1">
                         <Trophy size={18} /> {stats.wins}
                     </div>
                 </div>
                 <div className="bg-cardbg border border-neutral-800 p-4 rounded-xl text-center">
                     <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Loss</div>
                     <div className="text-2xl font-black text-red-500 flex justify-center items-center gap-1">
                         <AlertTriangle size={18} /> {stats.losses}
                     </div>
                 </div>
             </div>

             {/* HISTORY LIST */}
             <div className="space-y-4">
                 {history.length === 0 ? (
                     <div className="text-center py-10 text-neutral-500 italic border border-dashed border-neutral-800 rounded-xl">
                         Nessuna analisi salvata. Inizia a generare pronostici!
                     </div>
                 ) : (
                     history.map(({matchId, analysis}) => (
                         <div key={matchId} className={`bg-cardbg border rounded-xl p-4 transition-all ${analysis.result === 'WIN' ? 'border-green-900 bg-green-900/5' : analysis.result === 'LOSS' ? 'border-red-900 bg-red-900/5' : 'border-neutral-800'}`}>
                             
                             {/* HEADER */}
                             <div className="flex justify-between items-start mb-3">
                                 <div>
                                     <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-2">
                                         <History size={10} /> {formatMatchDate(matchId)}
                                     </div>
                                     <h3 className="font-bold text-white text-sm mt-1">{formatMatchName(matchId)}</h3>
                                 </div>
                                 <div className="text-right">
                                     <div className="text-[10px] text-neutral-500 uppercase">Bet IA</div>
                                     <div className="font-bold text-yellow-500 text-sm">{analysis.recommended_bet}</div>
                                 </div>
                             </div>

                             {/* FEEDBACK CONTROLS */}
                             <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-800">
                                 {editingId === matchId ? (
                                     <div className="space-y-3 animate-fade-in">
                                         <div>
                                             <label className="text-[10px] text-neutral-500 uppercase block mb-1">Risultato Finale</label>
                                             <input 
                                                 type="text" 
                                                 value={scoreInput} 
                                                 onChange={e => setScoreInput(e.target.value)}
                                                 className="w-full bg-black border border-neutral-700 rounded px-2 py-1 text-white text-sm"
                                                 placeholder="Es. 2-1"
                                             />
                                         </div>
                                         <div>
                                             <label className="text-[10px] text-neutral-500 uppercase block mb-1">Marcatori</label>
                                             <input 
                                                 type="text" 
                                                 value={scorersInput} 
                                                 onChange={e => setScorersInput(e.target.value)}
                                                 className="w-full bg-black border border-neutral-700 rounded px-2 py-1 text-white text-sm"
                                                 placeholder="Es. Lautaro, Thuram"
                                             />
                                         </div>
                                         <Button onClick={() => saveDetails(matchId)} className="w-full text-xs py-2">
                                             <Save size={14} className="mr-1"/> SALVA DETTAGLI
                                         </Button>
                                     </div>
                                 ) : (
                                     <div className="flex flex-col gap-2">
                                         {/* RESULT TOGGLE */}
                                         <div className="flex gap-2">
                                             <button 
                                                 onClick={() => handleVote(matchId, 'WIN')}
                                                 className={`flex-1 flex items-center justify-center gap-1 py-2 rounded font-bold text-xs transition-colors ${analysis.result === 'WIN' ? 'bg-green-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-green-400'}`}
                                             >
                                                 <CheckCircle size={14} /> PRESA
                                             </button>
                                             <button 
                                                 onClick={() => handleVote(matchId, 'LOSS')}
                                                 className={`flex-1 flex items-center justify-center gap-1 py-2 rounded font-bold text-xs transition-colors ${analysis.result === 'LOSS' ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-red-400'}`}
                                             >
                                                 <XCircle size={14} /> SBAGLIATA
                                             </button>
                                         </div>

                                         {/* DETAILS DISPLAY */}
                                         {(analysis.final_score || analysis.final_scorers) && (
                                             <div className="mt-2 pt-2 border-t border-neutral-800 text-xs text-neutral-400 flex justify-between cursor-pointer hover:text-white" onClick={() => startEditing({matchId, analysis})}>
                                                 <span>FT: {analysis.final_score || '-'}</span>
                                                 <span className="truncate max-w-[150px]">{analysis.final_scorers || ''}</span>
                                             </div>
                                         )}

                                         {(!analysis.final_score && !analysis.final_scorers) && (
                                              <div 
                                                onClick={() => startEditing({matchId, analysis})}
                                                className="text-[10px] text-center text-neutral-600 hover:text-neutral-400 cursor-pointer mt-1"
                                              >
                                                  + Aggiungi Risultato Esatto/Marcatori
                                              </div>
                                         )}
                                     </div>
                                 )}
                             </div>
                         </div>
                     ))
                 )}
             </div>
        </div>
    );
};
