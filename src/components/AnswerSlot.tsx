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
      className={`relative w-full h-[74px] sm:h-[86px] md:h-[98px] rounded-2xl cursor-pointer perspective-1000 group transition-all duration-300 select-none ${
        isFocused ? 'ring-2 ring-amber-400 scale-[1.02]' : 'hover:scale-[1.015]'
      }`}
      title={isRevealed ? `Revealed: ${answer?.text} (${answer?.points} pts)` : `Click or press [${slotNumber}] to reveal`}
    >
      {/* Outer 3D Gold Metallic Beveled Rim */}
      <div className="w-full h-full rounded-2xl p-[3px] bg-gradient-to-r from-[#e6c65b] via-[#fff8db] via-45% to-[#8f6406] shadow-[0_8px_20px_rgba(0,0,0,0.8)] group-hover:shadow-[0_0_25px_rgba(230,198,91,0.65)] transition-all">
        
        {/* Flip container with 3D preserve */}
        <div
          className={`w-full h-full rounded-[13px] relative transform-style-3d transition-transform duration-600 ease-out ${
            isRevealed ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT FACE (UNREVEALED: Authentic Family Feud Golden Oval Tile) */}
          <div className="absolute inset-0 backface-hidden rounded-[13px] bg-gradient-to-b from-[#1a4ec8] via-[#0b2b7a] via-50% to-[#04143b] border border-[#4d8eff]/60 shadow-[inset_0_3px_10px_rgba(255,255,255,0.3),inset_0_-4px_12px_rgba(0,0,0,0.85)] flex items-center justify-center overflow-hidden">
            {/* Top glass reflection line */}
            <div className="absolute top-0 left-0 right-0 h-[46%] gloss-overlay pointer-events-none" />

            {/* Authentic Centered 3D Golden Medallion */}
            <div className="relative w-16 sm:w-20 md:w-24 h-11 sm:h-13 md:h-15 rounded-full bg-gradient-to-b from-[#fff6b8] via-[#d4af37] to-[#785307] p-[2.5px] shadow-[0_0_18px_rgba(212,175,55,0.6),0_4px_8px_rgba(0,0,0,0.7)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-[#0b1c42] via-[#051029] to-[#020714] border border-amber-300/50 flex items-center justify-center shadow-inner">
                <span className="font-game font-black text-2xl sm:text-3xl md:text-4xl text-[#ffea85] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                  {slotNumber}
                </span>
              </div>
            </div>
          </div>

          {/* BACK FACE (REVEALED: Answer Text on Left, Vertical Divider, Gold Points Capsule on Right) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-[13px] bg-gradient-to-b from-[#0d2252] via-[#071436] via-50% to-[#020717] border-2 border-[#d4af37] shadow-[inset_0_2px_10px_rgba(255,255,255,0.2),inset_0_-3px_10px_rgba(0,0,0,0.95)] flex items-center justify-between p-1.5 sm:p-2 overflow-hidden">
            {/* Top glass reflection line */}
            <div className="absolute top-0 left-0 right-0 h-[45%] gloss-overlay pointer-events-none" />

            {/* Answer Text Area (Accommodates 1 or 2 lines without clipping) */}
            <div className="flex-1 flex items-center px-3 sm:px-4 md:px-5 min-w-0 pr-2">
              <span className="font-team font-black text-sm sm:text-lg md:text-2xl lg:text-[26px] text-white uppercase tracking-wide line-clamp-2 leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                {answer?.text || `Answer ${slotNumber}`}
              </span>
            </div>

            {/* Vertical Golden Ridge Divider */}
            <div className="w-[3px] h-[80%] bg-gradient-to-b from-transparent via-[#ffd700] to-transparent shrink-0 opacity-80" />

            {/* Authentic Gold Point Capsule */}
            <div className="h-full min-w-[66px] sm:min-w-[82px] md:min-w-[96px] rounded-lg bg-gradient-to-b from-[#0a1224] to-[#01040a] border-2 border-[#ffd700] shadow-[inset_0_2px_8px_rgba(0,0,0,0.95),0_0_15px_rgba(255,215,0,0.3)] flex items-center justify-center px-2 shrink-0 ml-1.5 sm:ml-2">
              <span className="font-condensed font-black text-3xl sm:text-4xl md:text-5xl text-[#fed843] leading-none drop-shadow-[0_0_12px_rgba(254,216,67,0.85)]">
                {answer?.points ?? 0}
              </span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
