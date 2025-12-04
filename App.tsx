
import React, { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Report } from './pages/Report';
import { Settings } from './pages/Settings';
import { News } from './pages/News';
import { Scanner } from './pages/Scanner';
import { Archive } from './pages/Archive';
import { Navbar } from './components/Navbar';
import { StorageService } from './services/storage';
import { BetSlip } from './components/BetSlip';
import { BetSelection } from './types';
import { Ticket } from 'lucide-react';

// Define the order of tabs for swipe navigation
type TabType = 'dashboard' | 'scanner' | 'news' | 'archive' | 'report' | 'settings';
const TABS: TabType[] = ['dashboard', 'scanner', 'news', 'archive', 'report', 'settings'];

function App() {
  const [keys, setKeys] = useState<{ oddsKey: string | null, geminiKey: string | null, footballKey: string | null }>({ oddsKey: null, geminiKey: null, footballKey: null });
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Global Bet Slip State
  const [isBetSlipOpen, setIsBetSlipOpen] = useState(false);
  const [slipSelections, setSlipSelections] = useState<BetSelection[]>([]);

  // Swipe State (Updated for Smoother X/Y Logic)
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);
  const minSwipeDistance = 50;

  const refreshKeys = () => {
    setKeys(StorageService.getKeys());
  };

  useEffect(() => {
    refreshKeys();
    const interval = setInterval(refreshKeys, 1000); 
    return () => clearInterval(interval);
  }, []);

  const handleAddToSlip = (match: string, selection: string, odds: number) => {
      const exists = slipSelections.some(s => s.match === match);
      if (exists) {
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
      setSlipSelections([]);
  };

  // --- SWIPE HANDLERS (VECTOR LOGIC) ---
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({ 
        x: e.targetTouches[0].clientX, 
        y: e.targetTouches[0].clientY 
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ 
        x: e.targetTouches[0].clientX, 
        y: e.targetTouches[0].clientY 
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    
    // Solo se il movimento è prevalentemente orizzontale
    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
        const isLeftSwipe = distanceX > 0;
        const isRightSwipe = distanceX < 0;
        
        const currentIndex = TABS.indexOf(activeTab);

        if (isLeftSwipe) {
           if (currentIndex < TABS.length - 1) {
               setActiveTab(TABS[currentIndex + 1]);
           }
        }
        
        if (isRightSwipe) {
            if (currentIndex > 0) {
                setActiveTab(TABS[currentIndex - 1]);
            }
        }
    }
  };

  return (
    <div 
      className="min-h-screen bg-darkbg text-gray-100 pb-20 font-sans"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="max-w-4xl mx-auto p-4 pt-6">
        
        <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
          <Dashboard 
            oddsKey={keys.oddsKey} 
            geminiKey={keys.geminiKey} 
            footballKey={keys.footballKey}
            onNavigateSettings={() => setActiveTab('settings')} 
            onAddToSlip={handleAddToSlip}
          />
        </div>
        
        <div style={{ display: activeTab === 'scanner' ? 'block' : 'none' }}>
           <Scanner onSaveBet={handleSaveBet} />
        </div>
        
        <div style={{ display: activeTab === 'news' ? 'block' : 'none' }}>
           <News />
        </div>

        <div style={{ display: activeTab === 'archive' ? 'block' : 'none' }}>
           <Archive />
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
      
      {!isBetSlipOpen && slipSelections.length > 0 && (
         <button 
            onClick={() => setIsBetSlipOpen(true)}
            className="fixed bottom-24 right-4 z-40 bg-redzone-600 text-white p-3 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center animate-bounce border border-red-500"
         >
             <Ticket size={24} />
             <span className="absolute -top-2 -right-2 bg-white text-red-600 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border border-red-600 shadow-sm">
                 {slipSelections.length}
             </span>
         </button>
      )}

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
