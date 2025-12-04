

import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { BetSelection } from '../types';
import { Trash2, Plus, Ticket, X, ChevronDown, Calculator, AlertTriangle, ShieldAlert, BrainCircuit, Eraser, Check, ArrowDown, Share2, Copy } from 'lucide-react';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/gemini';

interface BetSlipProps {
  currentSelections: BetSelection[];
  onAddSelection: (selection: BetSelection) => void;
  onRemoveSelection: (id: string) => void;
  onClearSlip: () => void;
  onSave: (bet: { selections: BetSelection[], stake: number, totalOdds: number, type: 'SINGLE' | 'MULTIPLE', potentialReturn: number, date: string }) => void;
  onClose: () => void;
  onMinimize: () => void;
  initialSelection?: BetSelection | null;
}

export const BetSlip: React.FC<BetSlipProps> = ({ 
    currentSelections, 
    onAddSelection, 
    onRemoveSelection, 
    onClearSlip,
    onSave, 
    onClose,
    onMinimize
}) => {
  const [stake, setStake] = useState<number>(10);
  
  // Manual Entry State
  const [inputMatch, setInputMatch] = useState('');
  const [inputSelection, setInputSelection] = useState('');
  const [inputOdds, setInputOdds] = useState('');

  // Kelly / Bankroll Stats
  const [bankrollSettings, setBankrollSettings] = useState<{amount: number, strategy: string} | null>(null);
  const [kellyRecommendation, setKellyRecommendation] = useState<number | null>(null);

  // Tilt Detector State
  const [tiltDetected, setTiltDetected] = useState(false);
  const [tiltMessage, setTiltMessage] = useState('');
  const [showTiltModal, setShowTiltModal] = useState(false);
  const [tiltCooldown, setTiltCooldown] = useState(10);
  
  // Share State
  const [copied, setCopied] = useState(false);

  useEffect(() => {
      const br = StorageService.getBankrollSettings();
      setBankrollSettings(br);
  }, []);
  
  // Kelly Logic
  useEffect(() => {
      if (!bankrollSettings || currentSelections.length === 0) {
          setKellyRecommendation(null);
          return;
      }
      
      if (currentSelections.length === 1) {
          const odds = currentSelections[0].odds;
          const p = (1 / odds) + 0.03; // 3% edge assumption
          const b = odds - 1;
          const q = 1 - p;
          const f = (b * p - q) / b;
          
          const fraction = bankrollSettings.strategy === 'aggressive' ? 1 : bankrollSettings.strategy === 'moderate' ? 0.5 : 0.25;
          const suggested = Math.max(0, (f * fraction) * bankrollSettings.amount);
          setKellyRecommendation(parseFloat(suggested.toFixed(2)));
      } else {
          // Multiples: Conservative flat stake
          setKellyRecommendation(parseFloat((bankrollSettings.amount * 0.01).toFixed(2)));
      }
  }, [currentSelections, bankrollSettings]);

  const totalOdds = currentSelections.length > 0 
    ? currentSelections.reduce((acc, curr) => acc * curr.odds, 1) 
    : 0;
  
  const potentialReturn = stake * (totalOdds || 0);
  const isMultiple = currentSelections.length > 1;

  const handleAddManual = () => {
    if (!inputMatch || !inputSelection || !inputOdds) return;
    
    const newSelection: BetSelection = {
      id: Math.random().toString(36).substr(2, 9),
      match: inputMatch,
      selection: inputSelection,
      odds: parseFloat(inputOdds)
    };

    onAddSelection(newSelection);
    setInputMatch('');
    setInputSelection('');
    setInputOdds('');
  };

  const checkTilt = async () => {
      const stats = StorageService.getStats();
      const closedBets = stats.bets.filter(b => b.result !== 'PENDING');
      const last3 = closedBets.slice(0, 3);
      
      const isLossStreak = last3.length === 3 && last3.every(b => b.result === 'LOSS');
      if (!isLossStreak) return false;

      const avgLastStake = last3.reduce((sum, b) => sum + b.stake, 0) / 3;
      const isRageStake = stake > (avgLastStake * 1.5);

      if (isRageStake) {
          setTiltDetected(true);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          
          const keys = StorageService.getKeys();
          if (keys.geminiKey) {
             const msg = await GeminiService.getTiltWarning(keys.geminiKey);
             setTiltMessage(msg);
          } else {
             setTiltMessage("Stai inseguendo le perdite. Fermati.");
          }
          
          setShowTiltModal(true);
          
          let timeLeft = 10;
          setTiltCooldown(timeLeft);
          const timer = setInterval(() => {
             timeLeft -= 1;
             setTiltCooldown(timeLeft);
             if (timeLeft <= 0) clearInterval(timer);
          }, 1000);

          return true;
      }
      return false;
  };

  const handleSave = async () => {
    if (currentSelections.length === 0) return;
    if (await checkTilt()) return;
    completeSave();
  };

  const completeSave = () => {
    onSave({
        selections: currentSelections,
        stake,
        totalOdds,
        type: isMultiple ? 'MULTIPLE' : 'SINGLE',
        potentialReturn,
        date: new Date().toISOString().split('T')[0]
      });
  };

  const handleShare = () => {
      let text = "🚀 *RedZone Bet Slip* 🚀\n\n";
      currentSelections.forEach((sel, i) => {
          text += `⚽ ${sel.match}\n🎯 ${sel.selection} @${sel.odds.toFixed(2)}\n\n`;
      });
      text += `💰 *Quota Totale: ${totalOdds.toFixed(2)}*\n`;
      text += `💸 Puntata: ${stake}€\n`;
      text += `🏆 Potenziale: ${potentialReturn.toFixed(2)}€\n`;
      
      navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      });
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-darkbg/95 backdrop-blur flex items-center justify-center p-4 animate-fade-in ${tiltDetected ? 'border-4 border-red-600' : ''}`}>
      
      {showTiltModal && (
         <div className="absolute inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-pulse-fast">
            <ShieldAlert size={80} className="text-red-600 mb-6" />
            <h2 className="text-4xl font-black text-white mb-2">TILT DETECTED</h2>
            <p className="text-red-500 font-bold uppercase tracking-widest mb-8">Protezione Capitale Attiva</p>
            <div className="bg-neutral-900 p-6 rounded-xl border border-red-900 max-w-sm mb-8">
               <div className="flex gap-3">
                  <BrainCircuit className="text-red-500 shrink-0" size={24} />
                  <p className="text-white font-medium text-left italic">"{tiltMessage}"</p>
               </div>
            </div>
            <div className="flex flex-col gap-4 w-full max-w-xs">
               <button onClick={onClose} className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg uppercase">OK, Hai Ragione.</button>
               <button onClick={() => { setShowTiltModal(false); completeSave(); }} disabled={tiltCooldown > 0} className={`text-neutral-500 text-xs ${tiltCooldown > 0 ? 'opacity-50' : ''}`}>
                 {tiltCooldown > 0 ? `Attendi ${tiltCooldown}s` : "Ignora avviso"}
               </button>
            </div>
         </div>
      )}

      <div className="w-full max-w-lg bg-cardbg border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-neutral-900 p-4 flex justify-between items-center border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Ticket className={isMultiple ? "text-purple-500" : "text-blue-500"} size={24} />
            <div>
                <h2 className="text-white font-bold uppercase tracking-wide leading-none">
                    {isMultiple ? 'Crea Multipla' : 'Nuova Schedina'}
                </h2>
                <span className="text-[10px] text-neutral-500 font-mono">
                    {currentSelections.length} Eventi inseriti
                </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onMinimize} className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400"><ChevronDown size={20}/></button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-red-500"><X size={20}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {currentSelections.length > 0 && (
                <div className="space-y-2">
                    <div className="flex justify-between items-end mb-1 px-1">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Il tuo Biglietto</span>
                        <button onClick={onClearSlip} className="text-[10px] text-red-500 flex items-center gap-1 hover:underline"><Eraser size={10}/> SVUOTA</button>
                    </div>
                    {currentSelections.map((sel, idx) => (
                        <div key={sel.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                                <span className="text-neutral-600 font-mono text-xs">{idx + 1}</span>
                                <div>
                                    <div className="text-white font-bold text-sm">{sel.match}</div>
                                    <div className="text-xs text-neutral-400">
                                        Esito: <span className="text-blue-400 font-bold">{sel.selection}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-yellow-500">{sel.odds.toFixed(2)}</span>
                                <button onClick={() => onRemoveSelection(sel.id)} className="text-neutral-600 hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-center">
                        <ArrowDown size={16} className="text-neutral-700 animate-bounce mt-1" />
                    </div>
                </div>
            )}

            <div className={`bg-neutral-900/30 rounded-xl p-4 border-2 ${currentSelections.length === 0 ? 'border-dashed border-neutral-700' : 'border-neutral-800'}`}>
                <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-2">
                    <Plus size={14} /> {currentSelections.length === 0 ? 'Aggiungi Primo Evento' : 'Aggiungi Altro Evento'}
                </h3>
                
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Partita / Evento</label>
                        <input 
                            type="text"
                            className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-white text-sm focus:border-redzone-600 focus:outline-none transition-colors"
                            placeholder="Es. Milan - Inter"
                            value={inputMatch}
                            onChange={e => setInputMatch(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-3">
                        <div className="flex-[2]">
                            <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Esito</label>
                            <input 
                                type="text"
                                className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-white text-sm focus:border-redzone-600 focus:outline-none transition-colors"
                                placeholder="Es. 1, Over 2.5"
                                value={inputSelection}
                                onChange={e => setInputSelection(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Quota</label>
                            <input 
                                type="number"
                                step="0.01"
                                className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-white text-sm font-mono text-center focus:border-redzone-600 focus:outline-none transition-colors"
                                placeholder="2.00"
                                value={inputOdds}
                                onChange={e => setInputOdds(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button 
                        onClick={handleAddManual}
                        disabled={!inputMatch || !inputSelection || !inputOdds}
                        variant="secondary"
                        className="w-full py-3 mt-2"
                    >
                        AGGIUNGI ALLA LISTA
                    </Button>
                </div>
            </div>
        </div>

        <div className="bg-neutral-900 border-t border-neutral-800 p-5">
             
             <div className="flex justify-between items-center mb-4 px-1">
                 <div className="text-xs text-neutral-400 uppercase font-bold">Quota Totale</div>
                 <div className="flex items-center gap-3">
                     <button 
                        onClick={handleShare}
                        className="text-[10px] text-neutral-400 flex items-center gap-1 hover:text-white transition-colors"
                     >
                         {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />} 
                         {copied ? "COPIATO" : "COPIA TESTO"}
                     </button>
                     <div className="text-2xl font-black text-white font-mono">{currentSelections.length > 0 ? totalOdds.toFixed(2) : '0.00'}</div>
                 </div>
             </div>

             <div className="flex gap-4 mb-4">
                 <div className="flex-1">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">€</span>
                        <input 
                            type="number" 
                            step="0.01"
                            value={stake}
                            onChange={e => setStake(Number(e.target.value))}
                            className="w-full bg-black border border-neutral-700 rounded-lg py-3 pl-8 pr-3 text-white font-bold focus:border-white focus:outline-none"
                        />
                        <span className="absolute right-2 top-1 text-[10px] text-neutral-500 font-bold uppercase">Puntata</span>
                    </div>
                    {kellyRecommendation !== null && (
                        <div onClick={() => setStake(kellyRecommendation)} className="mt-1 text-[10px] text-blue-400 flex items-center gap-1 cursor-pointer hover:underline">
                            <Calculator size={10} /> Kelly: {kellyRecommendation}€
                        </div>
                    )}
                 </div>
                 <div className="flex-1 bg-neutral-800/50 rounded-lg border border-neutral-800 flex flex-col items-end justify-center px-3">
                     <span className="text-[10px] text-neutral-500 font-bold uppercase">Vincita Potenziale</span>
                     <span className="text-lg font-black text-green-500">{currentSelections.length > 0 ? potentialReturn.toFixed(2) : '0.00'}€</span>
                 </div>
             </div>

             <Button 
                onClick={handleSave} 
                className={`w-full py-4 text-lg flex items-center justify-center gap-2 ${isMultiple ? 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]'}`}
                disabled={currentSelections.length === 0}
            >
                {isMultiple ? <Ticket /> : <Check />}
                {isMultiple ? `GIOCA MULTIPLA (${currentSelections.length})` : 'GIOCA SINGOLA'}
             </Button>
        </div>

      </div>
    </div>
  );
};