import React from 'react';

interface StageBackgroundProps {
  children: React.ReactNode;
}

export const StageBackground: React.FC<StageBackgroundProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full bg-[#020718] overflow-hidden flex flex-col justify-between select-none">
      
      {/* 1. Overhead Truss Light Beams / Spotlights */}
      <div className="absolute top-0 left-0 right-0 h-[650px] pointer-events-none z-0 overflow-hidden">
        {/* Left Spotlight Beam */}
        <div className="absolute top-[-80px] left-[12%] w-[180px] h-[750px] bg-gradient-to-b from-blue-400/40 via-blue-600/15 to-transparent transform -rotate-12 blur-2xl origin-top" />
        
        {/* Center-Left Beam */}
        <div className="absolute top-[-80px] left-[32%] w-[160px] h-[750px] bg-gradient-to-b from-blue-300/35 via-blue-500/10 to-transparent transform -rotate-6 blur-2xl origin-top" />

        {/* Center Beam */}
        <div className="absolute top-[-60px] left-[45%] w-[220px] h-[800px] bg-gradient-to-b from-cyan-300/30 via-blue-500/10 to-transparent blur-3xl origin-top" />

        {/* Center-Right Beam */}
        <div className="absolute top-[-80px] right-[32%] w-[160px] h-[750px] bg-gradient-to-b from-blue-300/35 via-blue-500/10 to-transparent transform rotate-6 blur-2xl origin-top" />

        {/* Right Spotlight Beam */}
        <div className="absolute top-[-80px] right-[12%] w-[180px] h-[750px] bg-gradient-to-b from-blue-400/40 via-blue-600/15 to-transparent transform rotate-12 blur-2xl origin-top" />

        {/* Top Studio Light Truss Fixtures */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black to-transparent flex justify-around px-8 opacity-75">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-5 h-2 bg-gray-700 rounded-t-sm" />
              <div className="w-3.5 h-3.5 bg-blue-300 rounded-full shadow-[0_0_12px_#60a5fa] blur-[1px]" />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Side Stage Illuminated Columns / Architectural Pillars */}
      {/* Left Pillars */}
      <div className="absolute left-[-20px] top-[15%] bottom-[20%] w-[130px] hidden lg:flex flex-col justify-between pointer-events-none z-0 opacity-85">
        <div className="w-full h-[28%] rounded-r-3xl bg-gradient-to-r from-amber-600/80 via-amber-400/90 to-amber-200/50 border-y-2 border-r-4 border-amber-300/80 shadow-[0_0_35px_rgba(245,158,11,0.6)]" />
        <div className="w-full h-[32%] rounded-r-3xl bg-gradient-to-r from-blue-700/80 via-blue-500/90 to-cyan-300/50 border-y-2 border-r-4 border-cyan-400/80 shadow-[0_0_35px_rgba(59,130,246,0.6)]" />
        <div className="w-full h-[28%] rounded-r-3xl bg-gradient-to-r from-amber-600/80 via-amber-400/90 to-amber-200/50 border-y-2 border-r-4 border-amber-300/80 shadow-[0_0_35px_rgba(245,158,11,0.6)]" />
      </div>

      {/* Right Pillars */}
      <div className="absolute right-[-20px] top-[15%] bottom-[20%] w-[130px] hidden lg:flex flex-col justify-between pointer-events-none z-0 opacity-85">
        <div className="w-full h-[28%] rounded-l-3xl bg-gradient-to-l from-amber-600/80 via-amber-400/90 to-amber-200/50 border-y-2 border-l-4 border-amber-300/80 shadow-[0_0_35px_rgba(245,158,11,0.6)]" />
        <div className="w-full h-[32%] rounded-l-3xl bg-gradient-to-l from-blue-700/80 via-blue-500/90 to-cyan-300/50 border-y-2 border-l-4 border-cyan-400/80 shadow-[0_0_35px_rgba(59,130,246,0.6)]" />
        <div className="w-full h-[28%] rounded-l-3xl bg-gradient-to-l from-amber-600/80 via-amber-400/90 to-amber-200/50 border-y-2 border-l-4 border-amber-300/80 shadow-[0_0_35px_rgba(245,158,11,0.6)]" />
      </div>

      {/* 3. Main Stage Content Area */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-center items-center px-2 sm:px-4 md:px-8 py-3">
        {children}
      </div>

      {/* 4. Glossy Stage Floor Reflection & Platform */}
      <div className="relative w-full h-[85px] sm:h-[110px] pointer-events-none z-0 flex items-end justify-center">
        {/* Floor Curved Ellipse Glow */}
        <div className="absolute bottom-[-60px] w-[140%] max-w-[1700px] h-[160px] rounded-[100%] bg-gradient-to-t from-blue-900/60 via-blue-600/30 to-transparent blur-md" />
        
        {/* Floor Horizon Highlight Line */}
        <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent shadow-[0_0_15px_#38bdf8]" />
      </div>

    </div>
  );
};
