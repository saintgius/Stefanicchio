
import React from 'react';
import { LayoutDashboard, PieChart, Settings, Newspaper, ScanLine, BookMarked } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'report' | 'settings' | 'news' | 'scanner' | 'archive';
  setActiveTab: (tab: 'dashboard' | 'report' | 'settings' | 'news' | 'scanner' | 'archive') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-cardbg border-t border-neutral-800 pb-safe z-50">
      <div className="flex justify-between items-center h-16 max-w-2xl mx-auto px-4">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 min-w-[40px] ${activeTab === 'dashboard' ? 'text-redzone-500' : 'text-neutral-500'}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[9px] font-bold tracking-widest uppercase">Home</span>
        </button>

        <button 
          onClick={() => setActiveTab('scanner')}
          className={`flex flex-col items-center gap-1 min-w-[40px] ${activeTab === 'scanner' ? 'text-redzone-500' : 'text-neutral-500'}`}
        >
          <ScanLine size={20} />
          <span className="text-[9px] font-bold tracking-widest uppercase">Scan</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('news')}
          className={`flex flex-col items-center gap-1 min-w-[40px] ${activeTab === 'news' ? 'text-redzone-500' : 'text-neutral-500'}`}
        >
          <Newspaper size={20} />
          <span className="text-[9px] font-bold tracking-widest uppercase">News</span>
        </button>

        <button 
          onClick={() => setActiveTab('archive')}
          className={`flex flex-col items-center gap-1 min-w-[40px] ${activeTab === 'archive' ? 'text-redzone-500' : 'text-neutral-500'}`}
        >
          <BookMarked size={20} />
          <span className="text-[9px] font-bold tracking-widest uppercase">Storico</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('report')}
          className={`flex flex-col items-center gap-1 min-w-[40px] ${activeTab === 'report' ? 'text-redzone-500' : 'text-neutral-500'}`}
        >
          <PieChart size={20} />
          <span className="text-[9px] font-bold tracking-widest uppercase">Report</span>
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 min-w-[40px] ${activeTab === 'settings' ? 'text-redzone-500' : 'text-neutral-500'}`}
        >
          <Settings size={20} />
          <span className="text-[9px] font-bold tracking-widest uppercase">Setup</span>
        </button>
      </div>
    </nav>
  );
};
