import React from 'react';
import type { Answer } from '../types';

interface AnswerSlotProps {
  slotNumber: number;
  answer?: Answer;
  onReveal: () => void;
  isFocused?: boolean;
}

export const AnswerSlot: React.FC<AnswerSlotProps> = ({
  slotNumber,
  answer,
  onReveal,
  isFocused = false,
}) => {
  const isRevealed = !!answer?.isRevealed;

  return (
    <div
      onClick={onReveal}
      className={`relative w-full h-[64px] sm:h-[76px] md:h-[86px] rounded-xl cursor-pointer perspective-1000 group transition-all duration-200 ${
        isFocused ? 'ring-2 ring-amber-400 scale-[1.02]' : ''
      }`}
      title={isRevealed ? 'Revealed' : `Click or press ${slotNumber} to reveal`}
    >
      {/* Outer gold beveled rim */}
      <div className="w-full h-full rounded-xl p-[3px] bg-gradient-to-r from-[#d4af37] via-[#fff0a8] to-[#996e00] shadow-[0_4px_10px_rgba(0,0,0,0.7)] group-hover:shadow-[0_0_15px_rgba(212,175,55,0.6)] transition-all">
        
        {/* Flip container */}
        <div
          className={`w-full h-full rounded-lg relative transform-style-3d transition-transform duration-500 ${
            isRevealed ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT FACE (UNREVEALED: Big Blue Numbered Tile) */}
          <div className="absolute inset-0 backface-hidden rounded-lg bg-gradient-to-b from-[#194bb5] via-[#0d2f78] to-[#061845] border border-[#3b82f6]/60 shadow-[inset_0_2px_6px_rgba(255,255,255,0.3),inset_0_-2px_6px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden">
            {/* Top gloss line */}
            <div className="absolute top-0 left-0 right-0 h-1/2 gloss-overlay" />

            {/* Glowing slot number medallion */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#fff3b0] via-[#d4af37] to-[#7a5509] p-[2px] shadow-[0_0_12px_rgba(212,175,55,0.5)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-[#0a183d] to-[#04091a] flex items-center justify-center">
                <span className="font-game font-black text-xl sm:text-2xl text-[#ffea85] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {slotNumber}
                </span>
              </div>
            </div>

            {/* Slot indicator label */}
            <span className="absolute bottom-1 right-2 text-[10px] font-mono text-blue-300/60 uppercase tracking-widest hidden sm:inline">
              Key [{slotNumber}]
            </span>
          </div>

          {/* BACK FACE (REVEALED: Answer Text on Left, Points on Right) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg bg-gradient-to-b from-[#0b1b42] via-[#06102b] to-[#020718] border border-[#d4af37] shadow-[inset_0_2px_6px_rgba(255,255,255,0.1),inset_0_-2px_6px_rgba(0,0,0,0.9)] flex items-center justify-between p-1.5 sm:p-2 overflow-hidden">
            
            {/* Answer Text */}
            <div className="flex-1 flex items-center px-2 sm:px-3">
              <span className="font-team font-black text-base sm:text-xl md:text-2xl text-white uppercase tracking-wide truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {answer?.text || `Answer ${slotNumber}`}
              </span>
            </div>

            {/* Point Value Pill */}
            <div className="h-full min-w-[56px] sm:min-w-[70px] md:min-w-[85px] rounded-md bg-gradient-to-b from-[#080d1a] to-[#010308] border border-amber-400/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center px-2 shrink-0">
              <span className="font-condensed font-black text-2xl sm:text-3xl md:text-4xl text-[#fed843] leading-none drop-shadow-[0_0_8px_rgba(254,216,67,0.7)]">
                {answer?.points || 0}
              </span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
