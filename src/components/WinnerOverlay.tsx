import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Crown, Trophy, X } from 'lucide-react';
import type { Team } from '../types';
import { soundEffects } from '../utils/soundEffects';

interface WinnerOverlayProps {
  teams: Team[];
  onClose: () => void;
}

export const WinnerOverlay: React.FC<WinnerOverlayProps> = ({ teams, onClose }) => {
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const winner = sortedTeams[0];

  useEffect(() => {
    soundEffects.playFanfare();

    // Fire fireworks/confetti sequence
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#ffd700', '#ea4335', '#4285f4', '#34a853', '#ffffff'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#ffd700', '#ea4335', '#4285f4', '#34a853', '#ffffff'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Container */}
      <div className="relative w-full max-w-2xl rounded-3xl p-1 bg-gradient-to-b from-[#ffe58f] via-[#d4af37] to-[#734f07] shadow-[0_0_80px_rgba(212,175,55,0.7)]">
        <div className="relative rounded-[22px] bg-gradient-to-b from-[#091533] via-[#050c21] to-[#020510] p-6 sm:p-8 text-center overflow-hidden border-2 border-blue-900">
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Crown & Trophy Header */}
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="relative">
              <Crown className="w-16 h-16 sm:w-20 sm:h-20 text-[#fed843] fill-[#fed843] animate-bounce drop-shadow-[0_0_20px_#fed843]" />
              <Trophy className="w-8 h-8 text-white absolute -bottom-1 -right-1" />
            </div>
            
            <h1 className="font-game text-3xl sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 uppercase tracking-wider mt-2">
              GRAND CHAMPIONS!
            </h1>
            <p className="text-blue-300/80 text-sm sm:text-base font-sans mt-1">
              GDG Feud Orientation Tournament Winner
            </p>
          </div>

          {/* Winner Spotlight Card */}
          <div className="relative my-6 p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-amber-500/20 via-blue-950/40 to-transparent border-2 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-300">
              1st Place Winners
            </span>
            <div className="font-team text-4xl sm:text-6xl text-white uppercase tracking-wider my-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
              {winner.name}
            </div>
            <div className="font-condensed text-5xl sm:text-7xl text-[#ffd700] drop-shadow-[0_0_15px_#ffd700]">
              {winner.score} <span className="text-3xl text-amber-300/70">PTS</span>
            </div>
          </div>

          {/* Final Standings List */}
          <div className="space-y-2 mt-4 text-left">
            <h3 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
              Final Standings
            </h3>
            {sortedTeams.slice(1).map((team, idx) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <span className="font-game text-base text-gray-400 w-6">
                    #{idx + 2}
                  </span>
                  <span className="font-team text-base text-white uppercase">
                    {team.name}
                  </span>
                </div>
                <span className="font-condensed text-2xl text-white font-bold">
                  {team.score} PTS
                </span>
              </div>
            ))}
          </div>

          {/* Close Action */}
          <button
            onClick={onClose}
            className="mt-6 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-team text-base uppercase tracking-wider shadow-lg transition-transform hover:scale-105"
          >
            Back to Scoreboard
          </button>

        </div>
      </div>
    </div>
  );
};
