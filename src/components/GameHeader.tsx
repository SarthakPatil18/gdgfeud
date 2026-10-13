import React from 'react';

interface GameHeaderProps {
  subtitle?: string;
}

export const GameHeader: React.FC<GameHeaderProps> = ({ subtitle }) => {
  return (
    <div className="relative z-30 flex flex-col items-center justify-center -mb-8 sm:-mb-10 md:-mb-12">
      {/* Oval Marquee Container */}
      <div className="relative">
        
        {/* Outer Gold Oval Frame with Marquee Bulbs */}
        <div className="relative w-[340px] sm:w-[460px] md:w-[580px] h-[130px] sm:h-[160px] md:h-[185px] rounded-[100px] p-[10px] sm:p-[13px] md:p-[15px] bg-gradient-to-b from-[#ffe58f] via-[#d4af37] via-50% to-[#664604] shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_40px_rgba(212,175,55,0.45)] border-[3px] border-[#fff7c2]/70 flex items-center justify-center">
          
          {/* Inner Golden Ridge Ring */}
          <div className="relative w-full h-full rounded-[85px] p-[6px] sm:p-[8px] md:p-[9px] bg-gradient-to-tr from-[#543602] via-[#a3791a] to-[#ffea9f] shadow-[inset_0_3px_8px_rgba(0,0,0,0.8),inset_0_-3px_8px_rgba(255,255,255,0.5)] flex items-center justify-center">
            
            {/* LED Matrix Dotted Oval Interior */}
            <div className="relative w-full h-full rounded-[72px] overflow-hidden led-pattern-dense flex items-center justify-center border-2 border-[#1e3a8a] shadow-[inset_0_0_25px_rgba(0,0,0,0.95)] px-4">
              
              {/* Radial Center Glow */}
              <div className="absolute inset-0 bg-radial from-blue-500/25 via-blue-900/10 to-transparent pointer-events-none" />

              {/* Header Content: Left Brackets | Title | Right Brackets */}
              <div className="relative flex items-center justify-between w-full px-2 sm:px-6 md:px-8">
                
                {/* Left Developer Angle Brackets (< Red, > Yellow) */}
                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                  {/* < Bracket in Google Red */}
                  <div className="relative font-mono font-black text-3xl sm:text-4xl md:text-5xl select-none leading-none transform -skew-x-6 drop-shadow-[0_4px_8px_rgba(234,67,53,0.7)]">
                    <span className="bg-gradient-to-b from-[#ff8b80] via-[#ea4335] to-[#a5170b] bg-clip-text text-transparent stroke-black">
                      &lt;
                    </span>
                  </div>
                  {/* > Bracket in Google Yellow */}
                  <div className="relative font-mono font-black text-3xl sm:text-4xl md:text-5xl select-none leading-none transform -skew-x-6 drop-shadow-[0_4px_8px_rgba(251,188,5,0.7)]">
                    <span className="bg-gradient-to-b from-[#fff2a8] via-[#fbbc05] to-[#b38200] bg-clip-text text-transparent">
                      &gt;
                    </span>
                  </div>
                </div>

                {/* Center 3D Golden Logo Text */}
                <div className="flex flex-col items-center justify-center mx-1 sm:mx-3 text-center">
                  {/* GDG Top Line */}
                  <div className="relative font-game font-black text-3xl sm:text-5xl md:text-6xl tracking-tight leading-[0.9] select-none">
                    <span className="gold-3d-text block transform scale-y-110">
                      GDG
                    </span>
                  </div>

                  {/* FEUD Bottom Line */}
                  <div className="relative font-game font-black text-2xl sm:text-4xl md:text-5xl tracking-normal leading-[0.9] -mt-0.5 sm:-mt-1 select-none">
                    <span className="gold-3d-text block transform scale-y-105">
                      FEUD
                    </span>
                  </div>
                </div>

                {/* Right Developer Angle Brackets (< Blue, > Green) */}
                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                  {/* < Bracket in Google Blue */}
                  <div className="relative font-mono font-black text-3xl sm:text-4xl md:text-5xl select-none leading-none transform -skew-x-6 drop-shadow-[0_4px_8px_rgba(66,133,244,0.7)]">
                    <span className="bg-gradient-to-b from-[#9bc5ff] via-[#4285f4] to-[#124fc2] bg-clip-text text-transparent">
                      &lt;
                    </span>
                  </div>
                  {/* > Bracket in Google Green */}
                  <div className="relative font-mono font-black text-3xl sm:text-4xl md:text-5xl select-none leading-none transform -skew-x-6 drop-shadow-[0_4px_8px_rgba(52,168,83,0.7)]">
                    <span className="bg-gradient-to-b from-[#a1f2b8] via-[#34a853] to-[#14732d] bg-clip-text text-transparent">
                      &gt;
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Marquee Bulbs around the Oval Rim */}
          {/* Top Arc Bulbs */}
          <div className="absolute -top-[5px] left-[15%] right-[15%] flex justify-between pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`oval-top-${i}`} className="bulb-sm bulb-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>

          {/* Bottom Arc Bulbs */}
          <div className="absolute -bottom-[5px] left-[15%] right-[15%] flex justify-between pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`oval-bot-${i}`} className="bulb-sm bulb-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>

          {/* Left Curve Bulbs */}
          <div className="absolute top-[20%] bottom-[20%] -left-[4px] flex flex-col justify-between pointer-events-none">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`oval-left-${i}`} className="bulb-sm bulb-pulse" style={{ animationDelay: `${i * 0.25}s` }} />
            ))}
          </div>

          {/* Right Curve Bulbs */}
          <div className="absolute top-[20%] bottom-[20%] -right-[4px] flex flex-col justify-between pointer-events-none">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`oval-right-${i}`} className="bulb-sm bulb-pulse" style={{ animationDelay: `${i * 0.25}s` }} />
            ))}
          </div>

        </div>

      </div>

      {subtitle && (
        <div className="mt-1 px-4 py-0.5 rounded-full bg-blue-950/80 border border-amber-400/50 text-amber-300 font-bold text-xs uppercase tracking-widest shadow-md">
          {subtitle}
        </div>
      )}
    </div>
  );
};
