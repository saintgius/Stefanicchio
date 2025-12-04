
import React from 'react';
import { BetRecord } from '../types';

interface HeatmapProps {
  bets: BetRecord[];
}

export const Heatmap: React.FC<HeatmapProps> = ({ bets }) => {
  // Generate last 365 days
  const days = [];
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  // Create a map of date -> profit
  const activityMap: { [date: string]: { profit: number, count: number } } = {};
  
  bets.forEach(bet => {
      if (bet.result === 'PENDING') return;
      if (!activityMap[bet.date]) activityMap[bet.date] = { profit: 0, count: 0 };
      activityMap[bet.date].profit += bet.profit;
      activityMap[bet.date].count += 1;
  });

  // Fill days array for rendering (approx 52 weeks * 7 days)
  // For simplicity in CSS Grid, we render mostly squares
  // We will render columns (weeks)
  
  const weeks = [];
  let current = new Date(oneYearAgo);
  // Adjust to start on Sunday
  current.setDate(current.getDate() - current.getDay());

  while (current <= today) {
      const week = [];
      for (let i = 0; i < 7; i++) {
          const dateStr = current.toISOString().split('T')[0];
          const data = activityMap[dateStr];
          week.push({
              date: dateStr,
              profit: data ? data.profit : 0,
              hasBet: !!data
          });
          current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
  }

  const getColor = (day: any) => {
      if (!day.hasBet) return 'bg-neutral-800';
      if (day.profit > 50) return 'bg-green-400';
      if (day.profit > 0) return 'bg-green-600';
      if (day.profit === 0) return 'bg-neutral-600';
      if (day.profit > -20) return 'bg-red-800';
      return 'bg-red-600';
  };

  return (
    <div className="bg-cardbg border border-neutral-800 p-4 rounded-xl overflow-x-auto">
       <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-2">
         📅 The Streak (Ultimi 365gg)
       </h3>
       <div className="flex gap-1 min-w-max">
           {weeks.map((week, wIdx) => (
               <div key={wIdx} className="flex flex-col gap-1">
                   {week.map((day, dIdx) => (
                       <div 
                         key={day.date} 
                         className={`w-2.5 h-2.5 rounded-[1px] ${getColor(day)}`}
                         title={`${day.date}: ${day.profit.toFixed(2)}€`}
                       ></div>
                   ))}
               </div>
           ))}
       </div>
       <div className="flex items-center gap-4 mt-3 text-[10px] text-neutral-500">
           <div className="flex items-center gap-1"><div className="w-2 h-2 bg-neutral-800"></div> No Activity</div>
           <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-600"></div> Loss</div>
           <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-600"></div> Win</div>
       </div>
    </div>
  );
};
