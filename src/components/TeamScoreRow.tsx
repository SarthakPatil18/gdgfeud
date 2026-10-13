import React, { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import type { TeamColor } from '../types';

interface TeamScoreRowProps {
  rank: number;
  teamName: string;
  score: number;
  color: TeamColor;
  strikes?: number;
  isFirstPlace?: boolean;
  onEditName?: (newName: string) => void;
  onScoreAdjust?: (delta: number) => void;
  isPresentationMode?: boolean;
}

export const TeamScoreRow: React.FC<TeamScoreRowProps> = ({
  rank,
  teamName,
  score,
  color,
  strikes = 0,
  isFirstPlace = false,
  onEditName,
  isPresentationMode = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(teamName);
  const [prevScore, setPrevScore] = useState(score);
  const [scorePulse, setScorePulse] = useState(false);

  useEffect(() => {
    if (score !== prevScore) {
      setScorePulse(true);
      const timer = setTimeout(() => setScorePulse(false), 500);
      setPrevScore(score);
      return () => clearTimeout(timer);
    }
  }, [score, prevScore]);

  useEffect(() => {
    setEditValue(teamName);
  }, [teamName]);

  const handleNameSubmit = () => {
    setIsEditing(false);
    if (editValue.trim() && onEditName) {
      onEditName(editValue.trim());
    } else {
      setEditValue(teamName);
    }
  };

  // Rank panel styling based on rank
  const getRankPanelStyle = () => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-b from-[#fff099] via-[#e5b72e] via-50% to-[#a87a0b] text-[#1c1502] border-[#ffe680] shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.4)]';
      case 2:
        return 'bg-gradient-to-b from-[#ffffff] via-[#d6dde8] via-50% to-[#8f9aa8] text-[#111827] border-[#ffffff] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.4)]';
      case 3:
        return 'bg-gradient-to-b from-[#f5af76] via-[#c97534] via-50% to-[#7c3f12] text-[#1f0d02] border-[#fbc9a4] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.5)]';
      default:
        return 'bg-gradient-to-b from-[#3d4758] via-[#242c3b] via-50% to-[#111622] text-[#f8fafc] border-[#525f75] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.6)]';
    }
  };

  // Team center panel gradients
  const getTeamGradient = () => {
    switch (color) {
      case 'red':
        return 'bg-gradient-to-b from-[#e31f2f] via-[#b3101d] via-50% to-[#7a0610] border-[#ff5a67]/60';
      case 'blue':
        return 'bg-gradient-to-b from-[#2177ea] via-[#0f54b8] via-50% to-[#083679] border-[#69a7ff]/60';
      case 'green':
        return 'bg-gradient-to-b from-[#18a857] via-[#0e7c3e] via-50% to-[#074b24] border-[#51e08e]/60';
      case 'purple':
        return 'bg-gradient-to-b from-[#8f24ea] via-[#6512b3] via-50% to-[#3f0775] border-[#c078ff]/60';
    }
  };

  return (
    <div className="relative w-full rounded-2xl p-[4px] sm:p-[6px] bg-gradient-to-r from-[#e3bb52] via-[#ffe58f] via-50% to-[#c29629] shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
      
      {/* Outer row dark rim */}
      <div className="relative w-full h-[68px] sm:h-[82px] md:h-[94px] rounded-xl bg-[#080d1a] p-[3px] sm:p-[4px] flex items-center gap-[4px] sm:gap-[6px] md:gap-[8px]">
        
        {/* 1. RANK PANEL (LEFT) */}
        <div
          className={`h-full w-[68px] sm:w-[86px] md:w-[104px] rounded-lg border-2 flex flex-col items-center justify-center shrink-0 relative overflow-hidden select-none ${getRankPanelStyle()}`}
        >
          {/* Subtle gloss line */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/25 pointer-events-none" />

          {/* Crown for 1st place */}
          {isFirstPlace ? (
            <div className="flex flex-col items-center justify-center -space-y-1 sm:-space-y-1.5 pt-0.5">
              <Crown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-[#1c1502] fill-[#1c1502] drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]" />
              <span className="font-game font-black text-2xl sm:text-3xl md:text-4xl leading-none">
                {rank}
              </span>
            </div>
          ) : (
            <span className="font-game font-black text-3xl sm:text-4xl md:text-5xl leading-none">
              {rank}
            </span>
          )}
        </div>

        {/* 2. TEAM NAME PANEL (CENTER) */}
        <div
          className={`h-full flex-1 rounded-lg border-2 relative overflow-hidden flex items-center justify-center px-4 shadow-[inset_0_3px_8px_rgba(255,255,255,0.3),inset_0_-4px_8px_rgba(0,0,0,0.6)] ${getTeamGradient()}`}
        >
          {/* Top gloss overlay reflex */}
          <div className="absolute top-0 left-0 right-0 h-[48%] gloss-overlay" />

          {/* Inline Edit or Display */}
          {isEditing && !isPresentationMode ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSubmit();
                if (e.key === 'Escape') {
                  setEditValue(teamName);
                  setIsEditing(false);
                }
              }}
              autoFocus
              className="bg-black/60 border-2 border-amber-300 rounded-lg px-3 py-1 text-center font-team font-black text-2xl sm:text-3xl md:text-4xl text-white outline-none w-full max-w-[400px] z-20"
            />
          ) : (
            <div
              onClick={() => {
                if (!isPresentationMode && onEditName) {
                  setIsEditing(true);
                }
              }}
              className="font-team font-black text-2xl sm:text-3xl md:text-4.5xl lg:text-5xl text-white tracking-wider text-center uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] cursor-pointer truncate max-w-full px-2 hover:scale-[1.01] transition-transform"
              title={!isPresentationMode ? 'Double click or click to edit team name' : undefined}
            >
              {teamName}
            </div>
          )}

          {/* Row Strikes Indicator */}
          {strikes > 0 && (
            <div className="absolute right-2 sm:right-4 flex items-center gap-1 z-20">
              {Array.from({ length: Math.min(strikes, 3) }).map((_, i) => (
                <span
                  key={i}
                  className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-md bg-gradient-to-b from-red-600 to-red-950 border border-red-300 text-white font-mono font-black text-xs sm:text-sm flex items-center justify-center shadow-[0_0_10px_#ef4444] animate-pulse"
                  title={`Row Strike ${i + 1}`}
                >
                  X
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3. SCORE PANEL (RIGHT) */}
        <div className="h-full w-[110px] sm:w-[150px] md:w-[190px] rounded-lg bg-gradient-to-b from-[#090e18] via-[#04060b] to-[#010204] border-2 border-[#1c273d] shadow-[inset_0_3px_10px_rgba(0,0,0,0.9)] flex items-center justify-center shrink-0 px-2 relative overflow-hidden">
          {/* Subtle inner reflection */}
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-white/[0.04] pointer-events-none" />

          {/* Big High-Contrast Score */}
          <span
            className={`font-condensed font-black text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none select-none transition-all duration-300 ${
              isFirstPlace
                ? 'text-[#fed843] drop-shadow-[0_0_12px_rgba(254,216,67,0.7)]'
                : 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]'
            } ${scorePulse ? 'animate-score-pulse' : ''}`}
          >
            {score}
          </span>
        </div>

      </div>
    </div>
  );
};
