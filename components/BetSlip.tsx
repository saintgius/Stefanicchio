
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { BetSelection, ProcessedMatch } from '../types';
import { Trash2, Plus, Ticket, X, ChevronDown, Calculator, AlertTriangle, ShieldAlert, BrainCircuit, Eraser, Check, ArrowDown, Share2, Copy, Sparkles, Zap, TrendingUp, Gem, DollarSign, RefreshCw, Target, Percent, BarChart3 } from 'lucide-react';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/gemini';
import { PredictionEngine } from '../services/prediction-engine';

interface BetSlipProps {
    currentSelections: BetSelection[];
    onAddSelection: (selection: BetSelection) => void;
    onRemoveSelection: (id: string) => void;
    onClearSlip: () => void;
    onSave: (bet: { selections: BetSelection[], stake: number, totalOdds: number, type: 'SINGLE' | 'MULTIPLE', potentialReturn: number, date: string }) => void;
    onClose: () => void;
    onMinimize: () => void;
    initialSelection?: BetSelection | null;
    availableMatches?: ProcessedMatch[];
}

interface SmartPick {
    match: string;
    selection: string;
    odds: number;
    confidence: number;
    edge: number;
    reasoning: string;
    type: 'value' | 'safe' | 'risky';
}

export const BetSlip: React.FC<BetSlipProps> = ({
    currentSelections,
    onAddSelection,
    onRemoveSelection,
    onClearSlip,
    onSave,
    onClose,
    onMinimize,
    availableMatches = []
}) => {
    const [stake, setStake] = useState<number>(10);
    const [activeTab, setActiveTab] = useState<'manual' | 'smart'>('manual');

    // Manual Entry State
    const [inputMatch, setInputMatch] = useState('');
    const [inputSelection, setInputSelection] = useState('');
    const [inputOdds, setInputOdds] = useState('');

    // Smart Parlay Builder State
    const [smartPicks, setSmartPicks] = useState<SmartPick[]>([]);
    const [loadingPicks, setLoadingPicks] = useState(false);
    const [riskProfile, setRiskProfile] = useState<'safe' | 'balanced' | 'aggressive'>('balanced');
    const [targetOdds, setTargetOdds] = useState<number>(3);

    // Kelly / Bankroll Stats
    const [bankrollSettings, setBankrollSettings] = useState<{ amount: number, strategy: string } | null>(null);
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
            const p = (1 / odds) + 0.03;
            const b = odds - 1;
            const q = 1 - p;
            const f = (b * p - q) / b;

            const fraction = bankrollSettings.strategy === 'aggressive' ? 1 : bankrollSettings.strategy === 'moderate' ? 0.5 : 0.25;
            const suggested = Math.max(0, (f * fraction) * bankrollSettings.amount);
            setKellyRecommendation(parseFloat(suggested.toFixed(2)));
        } else {
            setKellyRecommendation(parseFloat((bankrollSettings.amount * 0.01).toFixed(2)));
        }
    }, [currentSelections, bankrollSettings]);

    // Generate Smart Picks usando il Prediction Engine
    const generateSmartPicks = async () => {
        setLoadingPicks(true);
        setSmartPicks([]);

        try {
            const picks: SmartPick[] = [];

            for (const match of availableMatches.slice(0, 8)) {
                try {
                    const prediction = PredictionEngine.generatePrediction(match, 'SA');

                    // Trova value bets
                    for (const edge of prediction.valueEdges) {
                        if (edge.isValue) {
                            let odds = match.odds.home;
                            if (edge.market === 'X') odds = match.odds.draw;
                            if (edge.market === '2') odds = match.odds.away;
                            if (edge.market.includes('Over')) odds = 1.85;
                            if (edge.market.includes('BTTS')) odds = 1.90;

                            picks.push({
                                match: `${match.homeTeam} - ${match.awayTeam}`,
                                selection: edge.market,
                                odds: odds,
                                confidence: prediction.homeWinProb > prediction.awayWinProb ? prediction.homeWinProb : prediction.awayWinProb,
                                edge: edge.edge,
                                reasoning: `Edge +${edge.edge}% rispetto alle quote. ${prediction.mostLikelyScore} risultato più probabile.`,
                                type: edge.edge > 10 ? 'value' : edge.edge > 5 ? 'safe' : 'risky'
                            });
                        }
                    }

                    // Aggiungi pick safe se Over/BTTS hanno buone prob
                    if (prediction.over25Prob > 55) {
                        picks.push({
                            match: `${match.homeTeam} - ${match.awayTeam}`,
                            selection: 'Over 2.5',
                            odds: 1.85,
                            confidence: prediction.over25Prob,
                            edge: prediction.over25Prob - 54,
                            reasoning: `${prediction.over25Prob}% probabilità Over. xG: ${prediction.expectedGoalsHome} + ${prediction.expectedGoalsAway}`,
                            type: 'safe'
                        });
                    }

                    if (prediction.bttsProb > 55) {
                        picks.push({
                            match: `${match.homeTeam} - ${match.awayTeam}`,
                            selection: 'Goal Entrambe',
                            odds: 1.90,
                            confidence: prediction.bttsProb,
                            edge: prediction.bttsProb - 53,
                            reasoning: `${prediction.bttsProb}% probabilità BTTS. Entrambe segnano spesso.`,
                            type: 'safe'
                        });
                    }
                } catch (e) {
                    console.log('Error analyzing match:', e);
                }
            }

            // Filtra in base al profilo di rischio
            let filtered = picks;
            if (riskProfile === 'safe') {
                filtered = picks.filter(p => p.type === 'safe' || p.edge > 8);
            } else if (riskProfile === 'aggressive') {
                filtered = picks.filter(p => p.odds >= 2.0);
            }

            // Ordina per edge e limita
            filtered.sort((a, b) => b.edge - a.edge);
            setSmartPicks(filtered.slice(0, 6));

        } catch (e) {
            console.error('Smart picks error:', e);
        } finally {
            setLoadingPicks(false);
        }
    };

    // Auto-genera multipla ottimale
    const generateOptimalParlay = () => {
        if (smartPicks.length < 2) return;

        // Seleziona i migliori pick per raggiungere la quota target
        let selectedPicks: SmartPick[] = [];
        let currentOdds = 1;

        const sortedPicks = [...smartPicks].sort((a, b) => b.confidence - a.confidence);

        for (const pick of sortedPicks) {
            if (currentOdds * pick.odds <= targetOdds * 1.3) {
                selectedPicks.push(pick);
                currentOdds *= pick.odds;

                if (currentOdds >= targetOdds * 0.9) break;
                if (selectedPicks.length >= 4) break;
            }
        }

        // Aggiungi alla schedina
        for (const pick of selectedPicks) {
            const newSelection: BetSelection = {
                id: Math.random().toString(36).substr(2, 9),
                match: pick.match,
                selection: pick.selection,
                odds: pick.odds
            };
            onAddSelection(newSelection);
        }
    };

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

    const handleAddSmartPick = (pick: SmartPick) => {
        const newSelection: BetSelection = {
            id: Math.random().toString(36).substr(2, 9),
            match: pick.match,
            selection: pick.selection,
            odds: pick.odds
        };
        onAddSelection(newSelection);
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
        let text = "🚀 *RedZone AI - Smart Parlay* 🚀\n\n";
        currentSelections.forEach((sel, i) => {
            text += `⚽ ${sel.match}\n🎯 ${sel.selection} @${sel.odds.toFixed(2)}\n\n`;
        });
        text += `💰 *Quota Totale: ${totalOdds.toFixed(2)}*\n`;
        text += `💸 Puntata: ${stake}€\n`;
        text += `🏆 Potenziale: ${potentialReturn.toFixed(2)}€\n`;
        text += `\n🤖 Generato con RedZone AI`;

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const getPickTypeStyle = (type: SmartPick['type']) => {
        switch (type) {
            case 'value': return 'border-green-500/50 bg-green-900/20';
            case 'safe': return 'border-blue-500/50 bg-blue-900/20';
            case 'risky': return 'border-orange-500/50 bg-orange-900/20';
        }
    };

    const getPickBadge = (type: SmartPick['type']) => {
        switch (type) {
            case 'value': return <span className="bg-green-500/20 text-green-400 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Gem size={10} />VALUE</span>;
            case 'safe': return <span className="bg-blue-500/20 text-blue-400 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Target size={10} />SAFE</span>;
            case 'risky': return <span className="bg-orange-500/20 text-orange-400 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Zap size={10} />RISK</span>;
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] bg-darkbg/98 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in ${tiltDetected ? 'border-4 border-red-600' : ''}`}>

            {showTiltModal && (
                <div className="absolute inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-pulse-fast">
                    <ShieldAlert size={80} className="text-red-600 mb-6" />
                    <h2 className="text-4xl font-black text-white mb-2">TILT DETECTED</h2>
                    <p className="text-red-500 font-bold uppercase tracking-widest mb-8">Protezione Capitale Attiva</p>
                    <div className="glass-card p-6 rounded-xl max-w-sm mb-8">
                        <div className="flex gap-3">
                            <BrainCircuit className="text-red-500 shrink-0" size={24} />
                            <p className="text-white font-medium text-left italic">"{tiltMessage}"</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 w-full max-w-xs">
                        <button onClick={onClose} className="btn-premium bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-xl uppercase">OK, Hai Ragione.</button>
                        <button onClick={() => { setShowTiltModal(false); completeSave(); }} disabled={tiltCooldown > 0} className={`text-neutral-500 text-xs ${tiltCooldown > 0 ? 'opacity-50' : ''}`}>
                            {tiltCooldown > 0 ? `Attendi ${tiltCooldown}s` : "Ignora avviso"}
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full max-w-lg glass-card rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="glass-panel p-4 flex justify-between items-center border-b border-neutral-800/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isMultiple ? 'bg-purple-600/20' : 'bg-blue-600/20'}`}>
                            <Ticket className={isMultiple ? "text-purple-400" : "text-blue-400"} size={22} />
                        </div>
                        <div>
                            <h2 className="text-white font-bold uppercase tracking-wide leading-none">
                                {isMultiple ? 'Smart Multipla' : 'Nuova Schedina'}
                            </h2>
                            <span className="text-[10px] text-neutral-500 font-mono">
                                {currentSelections.length} Eventi • Quota {totalOdds.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onMinimize} className="glass-light p-2 rounded-xl hover:bg-neutral-700/50 text-neutral-400 active-scale"><ChevronDown size={20} /></button>
                        <button onClick={onClose} className="glass-light p-2 rounded-xl hover:bg-red-900/30 text-neutral-400 hover:text-red-400 active-scale"><X size={20} /></button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex glass-panel border-b border-neutral-800/50">
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'manual' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        <Plus size={14} /> Manuale
                    </button>
                    <button
                        onClick={() => { setActiveTab('smart'); if (smartPicks.length === 0) generateSmartPicks(); }}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'smart' ? 'text-white border-b-2 border-purple-500' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        <Sparkles size={14} className="text-purple-400" /> AI Builder
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-5">

                    {/* Current Selections */}
                    {currentSelections.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-end mb-1 px-1">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Il tuo Biglietto</span>
                                <button onClick={onClearSlip} className="text-[10px] text-red-500 flex items-center gap-1 hover:underline"><Eraser size={10} /> SVUOTA</button>
                            </div>
                            {currentSelections.map((sel, idx) => (
                                <div key={sel.id} className="glass-light rounded-xl p-3 flex justify-between items-center group hover-lift">
                                    <div className="flex items-center gap-3">
                                        <span className="text-neutral-600 font-mono text-xs w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center">{idx + 1}</span>
                                        <div>
                                            <div className="text-white font-bold text-sm">{sel.match}</div>
                                            <div className="text-xs text-neutral-400">
                                                <span className="text-blue-400 font-bold">{sel.selection}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-lg">{sel.odds.toFixed(2)}</span>
                                        <button onClick={() => onRemoveSelection(sel.id)} className="text-neutral-600 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-900/20">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* MANUAL TAB */}
                    {activeTab === 'manual' && (
                        <div className={`glass-light rounded-xl p-4 ${currentSelections.length === 0 ? 'border-2 border-dashed border-neutral-700' : ''}`}>
                            <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-2">
                                <Plus size={14} /> {currentSelections.length === 0 ? 'Aggiungi Primo Evento' : 'Aggiungi Evento'}
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Partita</label>
                                    <input
                                        type="text"
                                        className="w-full glass-card border border-neutral-700 rounded-xl p-3 text-white text-sm focus:border-red-500 focus:outline-none transition-colors"
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
                                            className="w-full glass-card border border-neutral-700 rounded-xl p-3 text-white text-sm focus:border-red-500 focus:outline-none transition-colors"
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
                                            className="w-full glass-card border border-neutral-700 rounded-xl p-3 text-white text-sm font-mono text-center focus:border-red-500 focus:outline-none transition-colors"
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
                                    className="w-full py-3 mt-2 active-scale"
                                >
                                    AGGIUNGI
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* SMART BUILDER TAB */}
                    {activeTab === 'smart' && (
                        <div className="space-y-4">
                            {/* Controls */}
                            <div className="glass-light rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-purple-400 uppercase flex items-center gap-2">
                                        <BrainCircuit size={14} /> AI Parlay Builder
                                    </h3>
                                    <button
                                        onClick={generateSmartPicks}
                                        disabled={loadingPicks}
                                        className="text-[10px] text-neutral-400 flex items-center gap-1 hover:text-white transition-colors"
                                    >
                                        <RefreshCw size={12} className={loadingPicks ? 'animate-spin' : ''} /> Rigenera
                                    </button>
                                </div>

                                {/* Risk Profile */}
                                <div className="mb-3">
                                    <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-2">Profilo Rischio</label>
                                    <div className="flex gap-2">
                                        {(['safe', 'balanced', 'aggressive'] as const).map(profile => (
                                            <button
                                                key={profile}
                                                onClick={() => { setRiskProfile(profile); generateSmartPicks(); }}
                                                className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all active-scale ${riskProfile === profile
                                                        ? profile === 'safe' ? 'bg-blue-600 text-white'
                                                            : profile === 'aggressive' ? 'bg-orange-600 text-white'
                                                                : 'bg-purple-600 text-white'
                                                        : 'glass-card text-neutral-400 hover:text-white'
                                                    }`}
                                            >
                                                {profile === 'safe' ? '🛡️ Sicuro' : profile === 'aggressive' ? '🔥 Aggressivo' : '⚖️ Bilanciato'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Target Odds */}
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] text-neutral-500 uppercase font-bold">Quota Target</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="2"
                                            max="10"
                                            step="0.5"
                                            value={targetOdds}
                                            onChange={e => setTargetOdds(Number(e.target.value))}
                                            className="w-24 accent-purple-500"
                                        />
                                        <span className="text-white font-bold font-mono w-10 text-right">{targetOdds.toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Smart Picks Grid */}
                            {loadingPicks ? (
                                <div className="flex flex-col items-center py-8">
                                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                                    <span className="text-neutral-400 text-sm">Analizzando partite...</span>
                                </div>
                            ) : smartPicks.length > 0 ? (
                                <>
                                    <div className="space-y-2">
                                        {smartPicks.map((pick, i) => (
                                            <div
                                                key={i}
                                                className={`glass-light rounded-xl p-3 border ${getPickTypeStyle(pick.type)} hover-lift cursor-pointer transition-all`}
                                                onClick={() => handleAddSmartPick(pick)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="text-white font-bold text-sm">{pick.match}</div>
                                                        <div className="text-xs text-neutral-400 mt-0.5">{pick.selection}</div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        {getPickBadge(pick.type)}
                                                        <span className="font-mono font-bold text-yellow-500 text-lg">{pick.odds.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="text-neutral-500">{pick.reasoning}</span>
                                                    <span className="text-green-400 font-bold flex items-center gap-1">
                                                        <TrendingUp size={10} /> +{pick.edge.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Auto-Generate Button */}
                                    <Button
                                        onClick={generateOptimalParlay}
                                        className="w-full btn-premium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 py-3 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(147,51,234,0.4)] active-scale"
                                    >
                                        <Sparkles size={16} /> GENERA MULTIPLA OTTIMALE @{targetOdds.toFixed(1)}
                                    </Button>
                                </>
                            ) : (
                                <div className="text-center py-8 text-neutral-500">
                                    <BarChart3 size={40} className="mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">Nessuna partita disponibile</p>
                                    <p className="text-xs mt-1">Carica le partite dalla Dashboard</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="glass-panel border-t border-neutral-800/50 p-5">

                    <div className="flex justify-between items-center mb-4 px-1">
                        <div className="text-xs text-neutral-400 uppercase font-bold">Quota Totale</div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleShare}
                                className="text-[10px] text-neutral-400 flex items-center gap-1 hover:text-white transition-colors"
                            >
                                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                {copied ? "COPIATO" : "CONDIVIDI"}
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
                                    className="w-full glass-card border border-neutral-700 rounded-xl py-3 pl-8 pr-3 text-white font-bold focus:border-white focus:outline-none"
                                />
                                <span className="absolute right-2 top-1 text-[10px] text-neutral-500 font-bold uppercase">Puntata</span>
                            </div>
                            {kellyRecommendation !== null && (
                                <div onClick={() => setStake(kellyRecommendation)} className="mt-1 text-[10px] text-blue-400 flex items-center gap-1 cursor-pointer hover:underline">
                                    <Calculator size={10} /> Kelly: {kellyRecommendation}€
                                </div>
                            )}
                        </div>
                        <div className="flex-1 glass-light rounded-xl flex flex-col items-end justify-center px-4">
                            <span className="text-[10px] text-neutral-500 font-bold uppercase">Vincita</span>
                            <span className="text-xl font-black text-green-500">{currentSelections.length > 0 ? potentialReturn.toFixed(2) : '0.00'}€</span>
                        </div>
                    </div>

                    <Button
                        onClick={handleSave}
                        className={`w-full btn-premium py-4 text-lg flex items-center justify-center gap-2 rounded-xl font-bold active-scale ${isMultiple
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-[0_0_20px_rgba(147,51,234,0.4)]'
                                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-glow-green'
                            }`}
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