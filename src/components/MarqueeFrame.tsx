import React from 'react';

interface MarqueeFrameProps {
  children: React.ReactNode;
}

export const MarqueeFrame: React.FC<MarqueeFrameProps> = ({ children }) => {
  // Generate light bulbs along the outer perimeter
  // We place bulbs along the perimeter of the main scoreboard frame
  return (
    <div className="relative w-full max-w-[1240px] mx-auto">
      {/* Outer Golden Marquee Stadium Frame */}
      <div className="relative rounded-[42px] p-[14px] sm:p-[18px] md:p-[22px] bg-gradient-to-b from-[#ffea9f] via-[#d4af37] via-45% to-[#7a5509] shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(212,175,55,0.35)] border-[3px] border-[#fff7c2]/60">
        
        {/* Inner Golden Ridge */}
        <div className="relative rounded-[32px] p-[10px] sm:p-[14px] md:p-[16px] bg-gradient-to-tr from-[#694705] via-[#a3791a] to-[#ffd768] shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),inset_0_-4px_12px_rgba(255,255,255,0.4)]">
          
          {/* Beveled dark inner bezel */}
          <div className="relative rounded-[24px] p-[8px] sm:p-[10px] bg-gradient-to-b from-[#11192b] to-[#060a14] shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] border-[2px] border-[#38496e]">
            
            {/* LED Matrix Dotted Background Interior */}
            <div className="relative rounded-[18px] overflow-hidden led-pattern min-h-[460px] md:min-h-[520px] shadow-[inset_0_0_50px_rgba(0,0,0,0.9)]">
              {children}
            </div>

          </div>
        </div>

        {/* Perimeter Light Bulbs - Top Row */}
        <div className="absolute top-[8px] left-[60px] right-[60px] flex justify-between pointer-events-none z-20">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={`top-${i}`} className="bulb bulb-pulse" style={{ animationDelay: `${(i % 5) * 0.25}s` }} />
          ))}
        </div>

        {/* Perimeter Light Bulbs - Bottom Row */}
        <div className="absolute bottom-[8px] left-[60px] right-[60px] flex justify-between pointer-events-none z-20">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={`bottom-${i}`} className="bulb bulb-pulse" style={{ animationDelay: `${(i % 5) * 0.25}s` }} />
          ))}
        </div>

        {/* Perimeter Light Bulbs - Left Column */}
        <div className="absolute top-[60px] bottom-[60px] left-[8px] flex flex-col justify-between pointer-events-none z-20">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={`left-${i}`} className="bulb bulb-pulse" style={{ animationDelay: `${(i % 5) * 0.25}s` }} />
          ))}
        </div>

        {/* Perimeter Light Bulbs - Right Column */}
        <div className="absolute top-[60px] bottom-[60px] right-[8px] flex flex-col justify-between pointer-events-none z-20">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={`right-${i}`} className="bulb bulb-pulse" style={{ animationDelay: `${(i % 5) * 0.25}s` }} />
          ))}
        </div>

        {/* Corner Accent Bulbs */}
        <div className="absolute top-[16px] left-[24px] bulb bulb-pulse z-20 pointer-events-none" />
        <div className="absolute top-[16px] right-[24px] bulb bulb-pulse z-20 pointer-events-none" />
        <div className="absolute bottom-[16px] left-[24px] bulb bulb-pulse z-20 pointer-events-none" />
        <div className="absolute bottom-[16px] right-[24px] bulb bulb-pulse z-20 pointer-events-none" />
      </div>

      {/* Scoreboard Pedestal Feet (matches reference bottom corners and center stage) */}
      <div className="relative flex justify-between items-center px-16 -mt-3 pointer-events-none">
        {/* Left Stand */}
        <div className="w-24 h-7 rounded-b-xl bg-gradient-to-b from-[#1a2233] to-[#0a0f1d] border-t-2 border-[#d4af37] shadow-[0_10px_20px_rgba(0,0,0,0.9)] flex items-center justify-center">
          <div className="w-16 h-2 bg-[#d4af37]/40 rounded-full" />
        </div>

        {/* Center Stage Dais */}
        <div className="w-56 h-8 rounded-t-full bg-gradient-to-t from-[#0e2a5c] via-[#1a4a9c] to-[#3b82f6]/40 border-t-2 border-[#d4af37] shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center justify-center">
          <div className="w-36 h-2 bg-blue-300/60 rounded-full blur-[2px]" />
        </div>

        {/* Right Stand */}
        <div className="w-24 h-7 rounded-b-xl bg-gradient-to-b from-[#1a2233] to-[#0a0f1d] border-t-2 border-[#d4af37] shadow-[0_10px_20px_rgba(0,0,0,0.9)] flex items-center justify-center">
          <div className="w-16 h-2 bg-[#d4af37]/40 rounded-full" />
        </div>
      </div>
    </div>
  );
};
