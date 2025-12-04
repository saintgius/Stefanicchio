
import React, { useState } from 'react';
import { Button } from '../components/Button';
import { StorageService } from '../services/storage';
import { Key, ExternalLink, Info, Shield } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [oddsKey, setOddsKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [footballKey, setFootballKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (oddsKey && geminiKey) {
      StorageService.saveKeys(oddsKey, geminiKey, footballKey);
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-darkbg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-cardbg border border-neutral-800 p-8 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.1)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-redzone-600 to-transparent"></div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tighter mb-2 neon-text">
            REDZONE <span className="text-redzone-600">BET</span>
          </h1>
          <p className="text-neutral-400">Initialize AI Tactical Assistant</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-300 flex items-center gap-2">
              <Key size={16} className="text-redzone-500" /> The Odds API Key
            </label>
            <input
              type="text"
              value={oddsKey}
              onChange={(e) => setOddsKey(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white focus:border-redzone-600 focus:outline-none transition-colors"
              placeholder="Enter key..."
              required
            />
            <a 
              href="https://the-odds-api.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-redzone-500 hover:text-redzone-400 flex items-center gap-1"
            >
              Get Free Key <ExternalLink size={10} />
            </a>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-300 flex items-center gap-2">
              <BrainCircuitIcon className="text-blue-500 w-4 h-4" /> Gemini API Key
            </label>
            <input
              type="text"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="Enter key..."
              required
            />
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
            >
              Get Free Key <ExternalLink size={10} />
            </a>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-300 flex items-center gap-2">
              <Shield size={16} className="text-yellow-500" /> Football Data API Key
            </label>
            <input
              type="text"
              value={footballKey}
              onChange={(e) => setFootballKey(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none transition-colors"
              placeholder="Enter key (optional)..."
            />
            <a 
              href="https://www.football-data.org/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1"
            >
              Get Free Key <ExternalLink size={10} />
            </a>
          </div>
            
            <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800 text-xs text-neutral-400 flex gap-2">
                <Info size={16} className="shrink-0 text-redzone-500"/>
                Keys are stored locally on your device. We do not track your data.
            </div>

          <Button type="submit" className="w-full py-3 text-lg">
            ENTER WAR ROOM
          </Button>
        </form>
      </div>
    </div>
  );
};

const BrainCircuitIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
    <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
    <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
    <path d="M6 18a4 4 0 0 1-1.97-1.375" />
    <path d="M18 18a4 4 0 0 1 1.97-1.375" />
  </svg>
);