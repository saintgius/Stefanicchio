
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { LeagueStanding, TopScorer } from '../types';
import { X, Trophy, Target } from 'lucide-react';

interface LeagueStatsModalProps {
  onClose: () => void;
  league: 'SA' | 'CL' | 'PL' | 'LL'; // NEW PROP
}

export const LeagueStatsModal: React.FC<LeagueStatsModalProps> = ({ onClose, league }) => {
  const [activeTab, setActiveTab] = useState<'standings' | 'scorers'>('standings');
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [scorers, setScorers] = useState<TopScorer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = StorageService.getFootballData();
    // Filter data based on active league
    // If data.league is undefined (old data), fallback to 'SA' for consistency or just don't filter strict
    const filteredStandings = data.standings.filter(s => s.league === league || (!s.league && league === 'SA'));
    const filteredScorers = data.scorers.filter(s => s.league === league || (!s.league && league === 'SA'));

    setStandings(filteredStandings);
    setScorers(filteredScorers);
    setLoading(false);
  }, [league]);

  const getFormBadge = (result: string) => {
    if (result === 'W') return { label: 'V', color: 'bg-green-600 text-white' };
    if (result === 'D') return { label: 'P', color: 'bg-neutral-600 text-gray-300' };
    if (result === 'L') return { label: 'S', color: 'bg-red-600 text-white' };
    return { label: '-', color: 'bg-neutral-800 text-neutral-500' };
  };

  const isChampions = league === 'CL';
  const isPremier = league === 'PL';
  const isLiga = league === 'LL';

  let themeColor = 'text-yellow-500';
  let borderTheme = 'border-yellow-500';

  if (isChampions) {
    themeColor = 'text-blue-500';
    borderTheme = 'border-blue-500';
  } else if (isPremier) {
    themeColor = 'text-purple-500';
    borderTheme = 'border-purple-500';
  } else if (isLiga) {
    themeColor = 'text-orange-500';
    borderTheme = 'border-orange-500';
  }

  return (
    <div className="fixed inset-0 z-[100] bg-darkbg/95 backdrop-blur flex flex-col animate-fade-in">

      {/* Header */}
      <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
        <h2 className="font-bold text-lg text-white flex items-center gap-2">
          <Trophy size={18} className={themeColor} /> STATISTICHE {isChampions ? 'CHAMPIONS LEAGUE' : isPremier ? 'PREMIER LEAGUE' : isLiga ? 'LA LIGA' : 'SERIE A'}
        </h2>
        <button onClick={onClose} className="bg-neutral-800 p-2 rounded-full hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 bg-neutral-900">
        <button
          onClick={() => setActiveTab('standings')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'standings' ? `bg-neutral-800 text-white border-b-2 ${borderTheme}` : 'text-neutral-500'}`}
        >
          Classifica
        </button>
        <button
          onClick={() => setActiveTab('scorers')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'scorers' ? `bg-neutral-800 text-white border-b-2 ${borderTheme}` : 'text-neutral-500'}`}
        >
          Marcatori
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-0">
        {(activeTab === 'standings' && standings.length === 0) || (activeTab === 'scorers' && scorers.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-500 text-sm p-8 text-center">
            <p className="mb-4">Nessun dato disponibile per {isChampions ? 'la Champions League' : isPremier ? 'la Premier League' : 'la Serie A'}.</p>
            <div className="p-3 bg-red-900/20 border border-red-900 rounded-lg text-red-400 text-xs">
              ⚠️ Vai in Impostazioni e clicca <br /> <strong>"SINCRONIZZA (SA+PL+CL)"</strong> <br /> per aggiornare il database.
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'standings' && (
              <table className="w-full text-sm text-left text-neutral-300">
                <thead className="text-xs text-neutral-500 uppercase bg-neutral-900 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 w-10 text-center">#</th>
                    <th className="px-3 py-3">Squadra</th>
                    <th className="px-3 py-3 text-center">PT</th>
                    <th className="px-3 py-3 text-center hidden sm:table-cell">Forma</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team) => (
                    <tr key={team.team.id} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                      <td className="px-3 py-3 text-center font-mono text-neutral-500">
                        {team.position}
                        {team.position <= 4 && <span className="block w-1 h-1 bg-blue-500 rounded-full mx-auto mt-1"></span>}
                        {team.position > 17 && !isChampions && <span className="block w-1 h-1 bg-red-500 rounded-full mx-auto mt-1"></span>}
                      </td>
                      <td className="px-3 py-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          {team.team.crest && <img src={team.team.crest} alt="" className="w-5 h-5 object-contain" />}
                          {team.team.name.replace(' FC', '')}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-bold">{team.points}</td>
                      <td className="px-3 py-3 hidden sm:flex gap-0.5 justify-center items-center h-full mt-2">
                        {team.form?.split(',').slice(-5).map((res, i) => {
                          const badge = getFormBadge(res);
                          return (
                            <span key={i} className={`w-4 h-4 flex items-center justify-center text-[8px] font-bold rounded-sm ${badge.color}`}>
                              {badge.label}
                            </span>
                          )
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'scorers' && (
              <table className="w-full text-sm text-left text-neutral-300">
                <thead className="text-xs text-neutral-500 uppercase bg-neutral-900 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">#</th>
                    <th className="px-4 py-3">Giocatore</th>
                    <th className="px-4 py-3 text-right">Gol</th>
                  </tr>
                </thead>
                <tbody>
                  {scorers.map((scorer, index) => (
                    <tr key={index} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                      <td className="px-4 py-3 text-center font-mono text-neutral-500">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{scorer.player.name}</div>
                        <div className="text-xs text-neutral-500">{scorer.team.name}</div>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold text-lg ${themeColor}`}>{scorer.goals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
};
