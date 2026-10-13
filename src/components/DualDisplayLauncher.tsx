import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ExternalLink,
  Laptop,
  Radio,
  CheckCircle2,
  Tv,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { syncManager } from '../utils/syncManager';

interface DualDisplayLauncherProps {
  onSelectView: (view: 'host' | 'display' | 'all_in_one') => void;
}

export const DualDisplayLauncher: React.FC<DualDisplayLauncherProps> = ({ onSelectView }) => {
  const [syncStatus, setSyncStatus] = useState({ broadcast: true, websocket: false });
  const [testPingCount, setTestPingCount] = useState(0);

  useEffect(() => {
    return syncManager.onConnectionChange(setSyncStatus);
  }, []);

  const handleTestPing = () => {
    setTestPingCount((prev) => prev + 1);
    syncManager.broadcastSound('tick');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col justify-between p-4 sm:p-8 font-sans select-none">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-600/20 via-blue-900/10 to-transparent blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <header className="relative z-10 max-w-5xl mx-auto w-full text-center py-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/80 border border-blue-400/40 text-blue-300 text-xs font-mono mb-4 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> GDG FEUD • Dual-Display System Architecture
        </div>
        
        <h1 className="font-game text-4xl sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 tracking-tight leading-tight">
          GDG FEUD
        </h1>
        <p className="text-gray-300 text-sm sm:text-base max-w-xl mx-auto mt-2 font-sans">
          Interactive Family Feud scoreboard for college orientation events with dual-screen projector synchronization.
        </p>
      </header>

      {/* Main Mode Selection Cards */}
      <main className="relative z-10 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
        
        {/* CARD 1: PROJECTOR DISPLAY (/display) */}
        <div
          onClick={() => onSelectView('display')}
          className="group relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0e1b3d] to-[#070e24] border-2 border-blue-500/60 hover:border-blue-400 shadow-[0_10px_40px_rgba(30,58,138,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.5)] cursor-pointer transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3.5 rounded-2xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                <Tv className="w-8 h-8" />
              </div>
              <span className="font-mono text-xs px-3 py-1 rounded-full bg-black/60 border border-blue-400/50 text-blue-200">
                /display
              </span>
            </div>

            <h2 className="font-team text-2xl sm:text-3xl uppercase tracking-wider text-white mb-2">
              Projector Display
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed mb-4">
              Full-screen game-show interface designed for the auditorium projector. Displays the golden marquee, live scoreboards, question slots, strikes, and celebration effects.
            </p>

            <ul className="space-y-2 text-xs text-blue-200/80 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Never shows host administrative controls
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Instant 0ms sync with laptop host panel
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Press [F] for full-screen projector view
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-blue-900/60">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 group-hover:text-blue-300 flex items-center gap-1">
              Launch Projector Screen <ArrowRight className="w-4 h-4" />
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open('/display', 'GDG_FEUD_PROJECTOR_DISPLAY', 'width=1280,height=720');
              }}
              className="p-2 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CARD 2: HOST CONTROL PANEL (/host) */}
        <div
          onClick={() => onSelectView('host')}
          className="group relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#1c1809] to-[#0d0b04] border-2 border-amber-500/60 hover:border-amber-400 shadow-[0_10px_40px_rgba(180,83,9,0.25)] hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] cursor-pointer transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                <Sliders className="w-8 h-8" />
              </div>
              <span className="font-mono text-xs px-3 py-1 rounded-full bg-black/60 border border-amber-400/50 text-amber-200">
                /host
              </span>
            </div>

            <h2 className="font-team text-2xl sm:text-3xl uppercase tracking-wider text-white mb-2">
              Host Control Room
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed mb-4">
              Dedicated operator console for the host's laptop screen. Complete control over live scoring, question revealing, strikes, countdown timers, and round awards.
            </p>

            <ul className="space-y-2 text-xs text-amber-200/80 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Quick scoring (+10, +25, +50, +100, -10, etc.)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Answer flip reveals & duplicate award prevention
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Full undo history (Ctrl+Z) & strike buzzers
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Authentic Family Feud soundtrack mapping (IndexedDB offline)
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-amber-900/60">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
              Open Host Control Room <ArrowRight className="w-4 h-4" />
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open('/host', 'GDG_FEUD_HOST_PANEL', 'width=1280,height=800');
              }}
              className="p-2 rounded-xl bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

      </main>

      {/* Interactive Extended Desktop Setup Guide */}
      <section className="relative z-10 max-w-5xl mx-auto w-full p-5 sm:p-6 rounded-2xl bg-black/60 border border-gray-800 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="font-team text-sm uppercase tracking-wider text-amber-300 flex items-center gap-2">
            <Laptop className="w-4 h-4" /> Single-Laptop Extended Desktop Setup Guide
          </h3>

          {/* Real-time Sync Health & Ping Test */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              BroadcastChannel (0ms)
            </span>
            <span className={`text-xs flex items-center gap-1 ${syncStatus.websocket ? 'text-emerald-400' : 'text-amber-400'}`}>
              <Radio className="w-3 h-3" />
              {syncStatus.websocket ? 'WebSocket' : 'Local Fallback'}
            </span>
            <button
              onClick={handleTestPing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-200"
              title="Broadcast test sync ping"
            >
              <Zap className="w-3 h-3 text-amber-400" /> Test Sync {testPingCount > 0 ? `(${testPingCount})` : ''}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-gray-300">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="font-bold text-amber-400 block mb-1">Step 1: Connect Cable</span>
            Connect your laptop to the auditorium projector via HDMI or USB-C.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="font-bold text-amber-400 block mb-1">Step 2: Extend Screen</span>
            In Display Settings, select <strong>"Extend Desktop"</strong> (not Mirror displays).
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="font-bold text-amber-400 block mb-1">Step 3: Move Display</span>
            Open <code className="text-blue-300 font-mono">/display</code> in a new window, drag it onto the projector, and press <strong>[F]</strong> for fullscreen.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="font-bold text-amber-400 block mb-1">Step 4: Host on Laptop</span>
            Keep <code className="text-amber-300 font-mono">/host</code> open on your laptop screen to operate the event with zero latency.
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl mx-auto w-full text-center text-xs text-gray-500 py-4">
        Google Developer Groups (GDG) Feud • Live Auditorium Presentation System
      </footer>

    </div>
  );
};
