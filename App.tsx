
import React, { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Report } from './pages/Report';
import { Settings } from './pages/Settings';
import { News } from './pages/News';
import { Navbar } from './components/Navbar';
import { StorageService } from './services/storage';
import { BetSlip } from './components/BetSlip';
import { BetSelection } from './types';
import { Ticket } from 'lucide-react';

function App() {
  const [keys, setKeys] = useState<{ oddsKey: string | null, geminiKey: string | null, footballKey: string | null }>({ oddsKey: null, geminiKey: null, footballKey: null });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report' | 'settings' | 'news'>('dashboard');
  
  // Global Bet Slip State
  const [isBetSlipOpen, setIsBetSlipOpen] = useState(false);
  const [slipSelections, setSlipSelections] = useState<BetSelection[]>([]);

  const refreshKeys = () => {
    setKeys(StorageService.getKeys());
  };

  useEffect(() => {
    refreshKeys();
    // Polling for key updates across tabs
    const interval = setInterval(refreshKeys, 1000); 
    return () => clearInterval(interval);
  }, []);

  const handleAddToSlip = (match: string, selection: string, odds: number) => {
      // Check for duplicates based on match name
      const exists = slipSelections.some(s => s.match === match);
      if (exists) {
          // If already exists, just open the slip without adding duplicate
          setIsBetSlipOpen(true);
          return;
      }

      const newBet: BetSelection = {
          id: Math.random().toString(36).substr(2, 9),
          match,
          selection,
          odds
      };
      setSlipSelections(prev => [...prev, newBet]);
      setIsBetSlipOpen(true);
  };

  const handleRemoveFromSlip = (id: string) => {
      setSlipSelections(prev => prev.filter(s => s.id !== id));
  };

  const handleClearSlip = () => {
      setSlipSelections([]);
  };

  const handleSaveBet = (betData: any) => {
      StorageService.saveBet(betData);
      setIsBetSlipOpen(false);
      setSlipSelections([]); // Clear after save
  };

  return (
    <div className="min-h-screen bg-darkbg text-gray-100 pb-20 font-sans">
      <div className="max-w-4xl mx-auto p-4 pt-6">
        
        {/* Keep all components mounted but toggle visibility */}
        <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
          <Dashboard 
            oddsKey={keys.oddsKey} 
            geminiKey={keys.geminiKey} 
            footballKey={keys.footballKey}
            onNavigateSettings={() => setActiveTab('settings')} 
            onAddToSlip={handleAddToSlip}
          />
        </div>
        
        <div style={{ display: activeTab === 'news' ? 'block' : 'none' }}>
           <News />
        </div>

        <div style={{ display: activeTab === 'report' ? 'block' : 'none' }}>
           <Report 
             isBetSlipOpen={isBetSlipOpen && activeTab === 'report'} 
             onOpenGlobalSlip={() => setIsBetSlipOpen(true)}
           />
        </div>
        
        <div style={{ display: activeTab === 'settings' ? 'block' : 'none' }}>
           <Settings />
        </div>

      </div>
      
      {/* FLOATING SLIP BUTTON (When Minimized) */}
      {!isBetSlipOpen && slipSelections.length > 0 && (
          <button 
            onClick={() => setIsBetSlipOpen(true)}
            className="fixed bottom-20 right-4 z-40 bg-redzone-600 text-white p-4 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] border-2 border-redzone-500 animate-bounce-small flex items-center gap-2"
          >
             <Ticket size={24} />
             <span className="absolute -top-1 -right-1 bg-white text-redzone-600 text-xs font-black w-5 h-5 flex items-center justify-center rounded-full border border-redzone-600">
                 {slipSelections.length}
             </span>
          </button>
      )}
      
      {/* Global Bet Slip Overlay */}
      {isBetSlipOpen && (
          <BetSlip 
            currentSelections={slipSelections}
            onAddSelection={(sel) => setSlipSelections(prev => [...prev, sel])}
            onRemoveSelection={handleRemoveFromSlip}
            onClearSlip={handleClearSlip}
            onSave={handleSaveBet} 
            onClose={() => setIsBetSlipOpen(false)} 
            onMinimize={() => setIsBetSlipOpen(false)}
          />
      )}

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;