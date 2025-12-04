
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, ScanLine, Gem, DollarSign, ArrowRight, Loader2, Image as ImageIcon, Scale, Bot, Calculator, AlertTriangle, CheckCircle, TrendingUp, Diamond, ChevronDown, ChevronUp, Layers, Heart, X as XIcon, Hand } from 'lucide-react';
import { Button } from '../components/Button';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/gemini';
import { AnalysisResult, ArbitrageOpportunity, ProcessedMatch } from '../types';

interface ScannerProps {
    onSaveBet: (bet: any) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onSaveBet }) => {
    const [activeTab, setActiveTab] = useState<'ocr' | 'value' | 'arb' | 'gen'>('gen');
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [scannedBet, setScannedBet] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Value Finder State
    const [valueBets, setValueBets] = useState<{match: string, analysis: AnalysisResult, matchId: string}[]>([]);

    // Arbitrage State
    const [arbOpportunities, setArbOpportunities] = useState<ArbitrageOpportunity[]>([]);
    const [selectedArb, setSelectedArb] = useState<ArbitrageOpportunity | null>(null);
    const [arbStake, setArbStake] = useState<number>(100);

    // Smart Generator State
    const [genCriteria, setGenCriteria] = useState({ stake: 10, multiplier: 2, risk: 'LOW', league: 'ALL' });
    const [generatedSlip, setGeneratedSlip] = useState<any | null>(null);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (activeTab === 'value') scanForValue();
        if (activeTab === 'arb') scanForArbs();
    }, [activeTab]);


    // --- OCR LOGIC ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setScannedBet(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyzeOCR = async () => {
        if (!image) return;
        const keys = StorageService.getKeys();
        if (!keys.geminiKey) { alert("Chiave Gemini mancante!"); return; }

        setAnalyzing(true);
        try {
            const base64Data = image.split(',')[1];
            const result = await GeminiService.scanTicket(keys.geminiKey, base64Data);
            setScannedBet(result);
        } catch (e) {
            alert("Errore scansione. Riprova con una foto più chiara.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleConfirmScannedBet = () => {
        if (!scannedBet) return;
        const betData = {
            selections: scannedBet.bets.map((b: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                match: b.match,
                selection: b.selection,
                odds: b.odds
            })),
            stake: scannedBet.totalStake || 10,
            totalOdds: scannedBet.totalOdds,
            type: scannedBet.bets.length > 1 ? 'MULTIPLE' : 'SINGLE',
            potentialReturn: (scannedBet.totalStake || 10) * scannedBet.totalOdds,
            date: new Date().toISOString().split('T')[0]
        };
        onSaveBet(betData);
        setImage(null);
        setScannedBet(null);
    };

    // --- VALUE FINDER LOGIC ---
    const scanForValue = () => {
        const keys = Object.keys(localStorage);
        const found: any[] = [];
        keys.forEach(key => {
            if (key.startsWith('analysis_')) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const analysis = JSON.parse(raw);
                    const matchId = key.replace('analysis_', '');
                    if (analysis.confidence_score > 70 || analysis.risk_level === 'BASSO' || analysis.best_value_market) {
                        const matchName = matchId.replace(/-[0-9]{4}-[0-9]{2}-[0-9]{2}$/, '').replace(/-/g, ' ').toUpperCase();
                        found.push({ match: matchName, analysis: analysis, matchId: matchId });
                    }
                }
            }
        });
        setValueBets(found);
    };

    // --- ARBITRAGE SCANNER LOGIC ---
    const scanForArbs = () => {
        const upcomingMatches: ProcessedMatch[] = StorageService.getUpcomingMatches();
        const opportunities: ArbitrageOpportunity[] = [];
        
        const now = new Date();
        const validMatches = upcomingMatches.filter(m => new Date(m.startTime) > now);

        validMatches.forEach(match => {
            const { odds, providers } = match;
            
            if (odds && odds.home > 1 && odds.draw > 1 && odds.away > 1) {
                const sumProb = (1/odds.home) + (1/odds.draw) + (1/odds.away);
                const margin = sumProb * 100;
                
                if (margin < 107) { 
                    opportunities.push({
                        match: `${match.homeTeam} vs ${match.awayTeam}`,
                        home: { price: odds.home, bookie: providers.home },
                        draw: { price: odds.draw, bookie: providers.draw },
                        away: { price: odds.away, bookie: providers.away },
                        margin: margin,
                        profitPercentage: (1 - sumProb) * 100
                    });
                }
            }
        });
        
        setArbOpportunities(opportunities.sort((a,b) => a.margin - b.margin));
    };

    const getArbStake = (price: number, totalStake: number, margin: number) => {
        const sumProb = margin / 100;
        return ((totalStake * (1/price)) / sumProb).toFixed(2);
    };

    // --- SMART GENERATOR LOGIC ---
    const handleGenerateSlip = async () => {
        const keys = StorageService.getKeys();
        if (!keys.geminiKey) { alert("Chiave Gemini mancante!"); return; }

        const upcomingMatches = StorageService.getUpcomingMatches();
        
        if (upcomingMatches.length === 0) {
            alert("Nessuna partita futura in memoria. Vai nella Dashboard e scarica le quote.");
            return;
        }
        
        const now = new Date();
        const tomorrowEnd = new Date();
        tomorrowEnd.setDate(now.getDate() + 2); 
        tomorrowEnd.setHours(0,0,0,0); 

        const validMatches = upcomingMatches.filter(m => {
            const mDate = new Date(m.startTime);
            return mDate > new Date(now.getTime() - 2 * 60 * 60 * 1000) && mDate < tomorrowEnd;
        });

        if (validMatches.length === 0) {
            alert("Nessuna partita trovata per OGGI o DOMANI.");
            return;
        }

        let matchesList = "";
        let count = 0;
        
        validMatches.forEach(m => {
            if (count > 25) return;
            const mDate = new Date(m.startTime);
            const isToday = mDate.getDate() === now.getDate();
            const timeTag = isToday ? "[OGGI]" : "[DOMANI]";
            const hour = mDate.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
            
            matchesList += `${timeTag} ${hour} - ${m.homeTeam} vs ${m.awayTeam}: 1(${m.odds.home}) X(${m.odds.draw}) 2(${m.odds.away})\n`;
            count++;
        });

        setGenerating(true);
        try {
            const slip = await GeminiService.generateSmartSlip(keys.geminiKey, matchesList, genCriteria);
            setGeneratedSlip(slip);
        } catch (e) {
            alert("Errore generazione.");
        } finally {
            setGenerating(false);
        }
    };

    const handleConfirmGenerated = () => {
        if (!generatedSlip) return;
        const betData = {
            selections: generatedSlip.bets.map((b: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                match: b.match,
                selection: b.selection,
                odds: b.odds
            })),
            stake: genCriteria.stake,
            totalOdds: generatedSlip.totalOdds,
            type: generatedSlip.bets.length > 1 ? 'MULTIPLE' : 'SINGLE',
            potentialReturn: genCriteria.stake * generatedSlip.totalOdds,
            date: new Date().toISOString().split('T')[0]
        };
        onSaveBet(betData);
        setGeneratedSlip(null);
    };

    return (
        <div className="space-y-6 pb-24 animate-fade-in">
            
            {/* Header Tabs */}
            <div className="flex bg-neutral-900 rounded-xl p-1 border border-neutral-800 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('gen')}
                    className={`flex-1 min-w-[60px] py-3 text-[10px] font-bold uppercase rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${activeTab === 'gen' ? 'bg-cardbg text-purple-400 shadow-lg border border-purple-500' : 'text-neutral-500'}`}
                >
                    <Bot size={14} /> SMART
                </button>
                <button 
                    onClick={() => setActiveTab('arb')}
                    className={`flex-1 min-w-[60px] py-3 text-[10px] font-bold uppercase rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${activeTab === 'arb' ? 'bg-cardbg text-green-400 shadow-lg border border-green-500' : 'text-neutral-500'}`}
                >
                    <Scale size={14} /> ARB
                </button>
                <button 
                    onClick={() => setActiveTab('value')}
                    className={`flex-1 min-w-[60px] py-3 text-[10px] font-bold uppercase rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${activeTab === 'value' ? 'bg-cardbg text-blue-400 shadow-lg border border-blue-500' : 'text-neutral-500'}`}
                >
                    <Gem size={14} /> VALUE
                </button>
                <button 
                    onClick={() => setActiveTab('ocr')}
                    className={`flex-1 min-w-[60px] py-3 text-[10px] font-bold uppercase rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${activeTab === 'ocr' ? 'bg-cardbg text-white shadow-lg border border-redzone-600' : 'text-neutral-500'}`}
                >
                    <ScanLine size={14} /> OCR
                </button>
            </div>

            {/* --- SMART GENERATOR --- */}
            {activeTab === 'gen' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-900/50 to-neutral-900 border border-purple-800 rounded-xl p-6 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-20"><Bot size={80} /></div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight relative z-10 mb-1">Smart Generator</h3>
                        <p className="text-xs text-purple-300 relative z-10 mb-6">L'AI crea la tua schedina perfetta (Oggi/Domani).</p>

                        <div className="space-y-4 relative z-10 text-left">
                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase">Budget</label>
                                <div className="flex items-center gap-2 bg-black/50 p-2 rounded border border-neutral-700">
                                    <span className="text-neutral-500">€</span>
                                    <input 
                                        type="number" 
                                        value={genCriteria.stake}
                                        onChange={e => setGenCriteria({...genCriteria, stake: Number(e.target.value)})}
                                        className="bg-transparent text-white font-bold w-full outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase">Obiettivo (Moltiplicatore)</label>
                                <div className="flex gap-2 mt-1">
                                    {[2, 3, 5, 10].map(m => (
                                        <button 
                                            key={m}
                                            onClick={() => setGenCriteria({...genCriteria, multiplier: m})}
                                            className={`flex-1 py-2 text-xs font-bold rounded border ${genCriteria.multiplier === m ? 'bg-purple-600 text-white border-purple-500' : 'bg-neutral-800 text-neutral-500 border-neutral-700'}`}
                                        >
                                            x{m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase">Profilo Rischio</label>
                                <select 
                                    value={genCriteria.risk}
                                    onChange={e => setGenCriteria({...genCriteria, risk: e.target.value})}
                                    className="w-full mt-1 bg-black/50 text-white text-xs p-2 rounded border border-neutral-700"
                                >
                                    <option value="LOW">🛡️ Basso (Quote Sicure)</option>
                                    <option value="MED">⚖️ Medio (Valore)</option>
                                    <option value="HIGH">🔥 Alto (Underdog/Combo)</option>
                                </select>
                            </div>
                        </div>

                        <Button 
                            onClick={handleGenerateSlip} 
                            isLoading={generating}
                            className="w-full mt-6 bg-purple-600 hover:bg-purple-500 border-none shadow-[0_0_20px_rgba(147,51,234,0.4)]"
                        >
                            <Bot size={18} className="mr-2" /> {generating ? 'ELABORAZIONE...' : 'GENERA SCHEDINA'}
                        </Button>
                    </div>

                    {generatedSlip && (
                        <div className="bg-neutral-900 border border-purple-900 rounded-xl p-4 animate-fade-in">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-neutral-800">
                                <h3 className="text-purple-400 font-bold uppercase text-xs">{generatedSlip.strategyName}</h3>
                                <span className="text-lg font-black text-white font-mono">x{generatedSlip.totalOdds.toFixed(2)}</span>
                            </div>
                            
                            <div className="space-y-3 mb-4">
                                {generatedSlip.bets.map((b: any, i: number) => (
                                    <div key={i} className="flex justify-between items-start text-sm">
                                        <div>
                                            <div className="text-white font-bold">{b.match}</div>
                                            <div className="text-[10px] text-neutral-500 italic">{b.reason}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-purple-300 font-bold">{b.selection}</div>
                                            <div className="text-neutral-600 text-xs">@{b.odds}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="bg-neutral-800/50 p-3 rounded flex justify-between items-center mb-4">
                                <span className="text-xs text-neutral-400">Vincita Potenziale</span>
                                <span className="text-green-500 font-bold text-lg">{(genCriteria.stake * generatedSlip.totalOdds).toFixed(2)}€</span>
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={() => setGeneratedSlip(null)} variant="secondary" className="flex-1">SCARTA</Button>
                                <Button onClick={handleConfirmGenerated} className="flex-[2] bg-purple-600 hover:bg-purple-500">CONFERMA E SALVA</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- ARBITRAGE SCANNER --- */}
            {activeTab === 'arb' && (
                <div className="space-y-4">
                    <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                        <h3 className="text-green-400 font-bold flex items-center gap-2 mb-2"><Scale size={18}/> Scanner Arbitraggio & Lavagna</h3>
                        <p className="text-xs text-neutral-400">Se vedi un diamante <Diamond size={10} className="inline text-blue-400"/>, il banco sta regalando soldi.</p>
                    </div>

                    {arbOpportunities.length === 0 ? (
                        <div className="text-center py-12 text-neutral-600 text-sm border border-dashed border-neutral-800 rounded-xl">
                            Nessun arbitraggio oggi. I bookmaker sono svegli.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {arbOpportunities.map((arb, i) => {
                                const isSurebet = arb.profitPercentage > 0;
                                const isGreatValue = arb.margin < 104;
                                const isExpanded = selectedArb === arb;
                                
                                // Color Coding
                                let borderColor = 'border-neutral-800';
                                let bgBadge = 'bg-neutral-800 text-neutral-400';
                                if (arb.margin > 107) { borderColor = 'border-red-900'; bgBadge = 'bg-red-900/30 text-red-500'; }
                                else if (arb.margin > 105) { borderColor = 'border-yellow-900'; bgBadge = 'bg-yellow-900/30 text-yellow-500'; }
                                else if (isGreatValue) { borderColor = 'border-green-600'; bgBadge = 'bg-green-600 text-black font-black'; }
                                if (isSurebet) { borderColor = 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'; bgBadge = 'bg-blue-500 text-white font-black animate-pulse'; }

                                return (
                                    <div key={i} className={`bg-cardbg border p-4 rounded-xl transition-all ${borderColor}`}>
                                        <div 
                                            className="flex justify-between items-start mb-2 cursor-pointer"
                                            onClick={() => setSelectedArb(isExpanded ? null : arb)}
                                        >
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{arb.match}</h4>
                                                {isSurebet && <div className="text-[10px] text-blue-400 font-bold flex items-center gap-1 mt-1"><Diamond size={10} /> SUREBET (+{arb.profitPercentage.toFixed(2)}%)</div>}
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded ${bgBadge}`}>
                                                    Lavagna: {arb.margin.toFixed(2)}%
                                                </span>
                                                {isExpanded ? <ChevronUp size={16} className="text-neutral-500"/> : <ChevronDown size={16} className="text-neutral-500"/>}
                                            </div>
                                        </div>
                                        
                                        {!isExpanded && (
                                            <div className="flex justify-between gap-2 text-center text-xs mt-3 opacity-70">
                                                <span className="flex-1 bg-neutral-900 py-1 rounded">1: {arb.home.price}</span>
                                                <span className="flex-1 bg-neutral-900 py-1 rounded">X: {arb.draw.price}</span>
                                                <span className="flex-1 bg-neutral-900 py-1 rounded">2: {arb.away.price}</span>
                                            </div>
                                        )}

                                        {isExpanded && (
                                            <div className="mt-4 border-t border-neutral-800 pt-4 animate-fade-in">
                                                <div className="flex items-center gap-2 mb-4 bg-black/50 p-2 rounded border border-neutral-800">
                                                    <Calculator size={14} className="text-neutral-400" />
                                                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Budget Totale:</label>
                                                    <div className="flex items-center">
                                                        <span className="text-sm text-neutral-500 mr-1">€</span>
                                                        <input 
                                                            type="number" 
                                                            value={arbStake} 
                                                            onChange={(e) => setArbStake(Number(e.target.value))}
                                                            className="bg-transparent w-20 text-white font-bold outline-none text-sm" 
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center text-sm bg-neutral-900/50 p-2 rounded">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-white">Punta 1</span>
                                                            <span className="text-[10px] text-neutral-500">{arb.home.bookie || 'Miglior Quota'} @{arb.home.price}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-yellow-500 font-mono font-bold">{getArbStake(arb.home.price, arbStake, arb.margin)}€</div>
                                                            <div className="text-[9px] text-neutral-600">Ritorno: {(Number(getArbStake(arb.home.price, arbStake, arb.margin)) * arb.home.price).toFixed(2)}€</div>
                                                        </div>
                                                    </div>
                                                     <div className="flex justify-between items-center text-sm bg-neutral-900/50 p-2 rounded">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-white">Punta X</span>
                                                            <span className="text-[10px] text-neutral-500">{arb.draw.bookie || 'Miglior Quota'} @{arb.draw.price}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-yellow-500 font-mono font-bold">{getArbStake(arb.draw.price, arbStake, arb.margin)}€</div>
                                                            <div className="text-[9px] text-neutral-600">Ritorno: {(Number(getArbStake(arb.draw.price, arbStake, arb.margin)) * arb.draw.price).toFixed(2)}€</div>
                                                        </div>
                                                    </div>
                                                     <div className="flex justify-between items-center text-sm bg-neutral-900/50 p-2 rounded">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-white">Punta 2</span>
                                                            <span className="text-[10px] text-neutral-500">{arb.away.bookie || 'Miglior Quota'} @{arb.away.price}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-yellow-500 font-mono font-bold">{getArbStake(arb.away.price, arbStake, arb.margin)}€</div>
                                                            <div className="text-[9px] text-neutral-600">Ritorno: {(Number(getArbStake(arb.away.price, arbStake, arb.margin)) * arb.away.price).toFixed(2)}€</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {isSurebet && (
                                                    <div className="mt-3 text-center text-xs text-blue-400 font-bold bg-blue-900/20 p-2 rounded border border-blue-900/50">
                                                        Profitto Garantito: ~{((arbStake * (100/arb.margin)) - arbStake).toFixed(2)}€
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* --- VALUE FINDER (Existing) --- */}
            {activeTab === 'value' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <h3 className="text-white font-bold text-sm">Analisi "High Value" Trovate</h3>
                         <span className="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-900/50">{valueBets.length} MATCH</span>
                    </div>
                    {valueBets.length === 0 ? (
                        <div className="text-center py-12 text-neutral-600 text-sm border border-dashed border-neutral-800 rounded-xl">
                            <Gem size={32} className="mx-auto mb-2 opacity-50" /> Stefanicchio non ha trovato oro oggi.
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {valueBets.map((item, i) => (
                                <div key={i} className="bg-cardbg border border-neutral-800 p-4 rounded-xl flex justify-between items-center group hover:border-blue-600 transition-colors">
                                    <div>
                                        <div className="text-white font-bold text-sm mb-1">{item.match}</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded border border-green-900/50 font-bold">{item.analysis.recommended_bet}</span>
                                            <span className="text-[10px] text-neutral-500 font-mono">Conf: {item.analysis.confidence_score}%</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Button 
                                            onClick={() => onSaveBet({
                                                selections: [{id: 'val-'+i, match: item.match, selection: item.analysis.recommended_bet, odds: 1.80}],
                                                stake: 10, totalOdds: 1.80, type: 'SINGLE', potentialReturn: 18, date: new Date().toISOString().split('T')[0]
                                            })}
                                            className="px-3 py-2 h-auto text-[10px] bg-blue-600 hover:bg-blue-500"
                                        >GIOCA <ArrowRight size={10} className="ml-1"/></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- OCR SECTION --- */}
            {activeTab === 'ocr' && (
                <div className="space-y-6">
                    <div className="bg-cardbg border border-dashed border-neutral-700 rounded-xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                        {image ? (
                            <img src={image} alt="Preview" className="max-h-64 rounded-lg object-contain relative z-10" />
                        ) : (
                            <div className="space-y-4">
                                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-500">
                                    <Camera size={32} />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold">Carica Schedina</h3>
                                    <p className="text-xs text-neutral-500 mt-1">L'IA estrarrà i dati per te.</p>
                                </div>
                            </div>
                        )}
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        {!image && (
                             <Button onClick={() => fileInputRef.current?.click()} className="mt-6" variant="secondary">
                                <Upload size={16} /> SELEZIONA FOTO
                             </Button>
                        )}
                    </div>
                    {image && !scannedBet && (
                        <div className="flex gap-2">
                             <Button onClick={() => setImage(null)} variant="secondary" className="flex-1">RIFAI</Button>
                             <Button onClick={handleAnalyzeOCR} isLoading={analyzing} className="flex-1">ANALIZZA</Button>
                        </div>
                    )}
                    {scannedBet && (
                        <div className="bg-neutral-900 border border-green-900/50 rounded-xl p-4 animate-fade-in">
                            <h3 className="text-green-500 font-bold uppercase text-xs mb-4 flex items-center gap-2"><ScanLine size={16} /> Dati Estratti</h3>
                            <div className="space-y-2 mb-4">
                                {scannedBet.bets.map((b: any, i: number) => (
                                    <div key={i} className="flex justify-between text-sm border-b border-neutral-800 pb-2">
                                        <span className="text-white">{b.match}</span>
                                        <div className="text-right"><div className="text-neutral-400 font-bold">{b.selection}</div><div className="text-neutral-600 font-mono">@{b.odds}</div></div>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={handleConfirmScannedBet} className="w-full bg-green-600 hover:bg-green-500">SALVA</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
