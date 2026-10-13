import React, { useState } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Undo2,
  Trophy,
  Sliders,
  Plus,
  Minus,
} from 'lucide-react';
import type { GameSettings, Question, Team } from '../types';
import { soundEffects } from '../utils/soundEffects';

interface HostControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  onUpdateTeamName: (teamId: string, name: string) => void;
  onSetTeamScore: (teamId: string, score: number) => void;
  onAdjustScore: (teamId: string, delta: number) => void;
  activeView: 'leaderboard' | 'question_board';
  onSwitchView: (view: 'leaderboard' | 'question_board') => void;
  questions: Question[];
  currentQuestionIndex: number;
  onSelectQuestion: (index: number) => void;
  onUpdateQuestion: (updated: Question) => void;
  settings: GameSettings;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onUndo: () => void;
  canUndo: boolean;
  lastActionText?: string;
  onResetGame: () => void;
  onDeclareWinner: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export const HostControlPanel: React.FC<HostControlPanelProps> = ({
  isOpen,
  onClose,
  teams,
  onUpdateTeamName,
  onSetTeamScore,
  onAdjustScore,
  activeView,
  onSwitchView,
  questions,
  currentQuestionIndex,
  onSelectQuestion,
  onUpdateQuestion,
  settings,
  onUpdateSettings,
  onUndo,
  canUndo,
  lastActionText,
  onResetGame,
  onDeclareWinner,
  onToggleFullscreen,
  isFullscreen,
}) => {
  const [activeTab, setActiveTab] = useState<'scores' | 'questions' | 'settings' | 'shortcuts'>('scores');
  const [customDelta, setCustomDelta] = useState<{ [teamId: string]: string }>({});
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  if (!isOpen) return null;

  const currentQ = questions[currentQuestionIndex];

  const handleCustomScoreChange = (teamId: string, val: string) => {
    setCustomDelta({ ...customDelta, [teamId]: val });
  };

  const handleCustomScoreSubmit = (teamId: string, isNegative = false) => {
    const val = parseInt(customDelta[teamId] || '0', 10);
    if (!isNaN(val) && val !== 0) {
      onAdjustScore(teamId, isNegative ? -Math.abs(val) : Math.abs(val));
      setCustomDelta({ ...customDelta, [teamId]: '' });
    }
  };

  const handleSoundToggle = () => {
    const nextVal = !settings.soundEnabled;
    onUpdateSettings({ soundEnabled: nextVal });
    soundEffects.setEnabled(nextVal);
    if (nextVal) {
      soundEffects.playCorrectAnswer();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#090e1c] border-2 border-amber-400/80 shadow-[0_0_50px_rgba(212,175,55,0.4)] overflow-hidden text-gray-100">
        
        {/* PANEL HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#111933] to-[#0a0f21] border-b border-amber-400/40">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-team text-lg uppercase tracking-wider text-white">
                Host Control Room
              </h2>
              <p className="text-xs text-gray-400 font-sans">
                Controls are hidden from the auditorium projector display
              </p>
            </div>
          </div>

          {/* Quick Utility Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase transition-all"
              title={lastActionText ? `Undo: ${lastActionText}` : 'Undo last action (Ctrl+Z)'}
            >
              <Undo2 className="w-4 h-4" /> Undo
            </button>

            <button
              onClick={handleSoundToggle}
              className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                settings.soundEnabled
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-red-500/20 border-red-400 text-red-300'
              }`}
              title={settings.soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-white ml-2"
              title="Close host panel (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS & QUICK VIEW SWITCH */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#060a14] border-b border-gray-800">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('scores')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'scores' ? 'bg-amber-400 text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Scores & Teams
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'questions' ? 'bg-amber-400 text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Question Bank
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'settings' ? 'bg-amber-400 text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'shortcuts' ? 'bg-amber-400 text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Shortcuts
            </button>
          </div>

          {/* View Switcher Toggle */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-gray-700">
            <button
              onClick={() => onSwitchView('leaderboard')}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                activeView === 'leaderboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => onSwitchView('question_board')}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                activeView === 'question_board'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Question Board
            </button>
          </div>
        </div>

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* TAB 1: SCORES & TEAMS */}
          {activeTab === 'scores' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                  Four Auditorium Teams Live Scores
                </h3>
                <span className="text-xs text-gray-400">
                  Click quick buttons or enter custom adjustments
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((team) => {
                  const borderColors = {
                    red: 'border-red-500/60 bg-red-950/20',
                    blue: 'border-blue-500/60 bg-blue-950/20',
                    green: 'border-emerald-500/60 bg-emerald-950/20',
                    purple: 'border-purple-500/60 bg-purple-950/20',
                  }[team.color];

                  return (
                    <div
                      key={team.id}
                      className={`p-4 rounded-xl border-2 flex flex-col justify-between gap-3 ${borderColors}`}
                    >
                      {/* Name & Current Score */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                            Team Name ({team.color.toUpperCase()})
                          </label>
                          <input
                            type="text"
                            value={team.name}
                            onChange={(e) => onUpdateTeamName(team.id, e.target.value)}
                            className="w-full bg-black/60 border border-gray-700 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:border-amber-400 outline-none"
                          />
                        </div>

                        {/* Direct Score Edit */}
                        <div className="w-24 text-right">
                          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                            Points
                          </label>
                          <input
                            type="number"
                            value={team.score}
                            onChange={(e) => onSetTeamScore(team.id, parseInt(e.target.value || '0', 10))}
                            className="w-full bg-black/60 border border-gray-700 rounded-lg px-2 py-1 text-right font-condensed text-2xl font-black text-amber-300 focus:border-amber-400 outline-none"
                          />
                        </div>
                      </div>

                      {/* Quick Add Buttons */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase w-7">Add:</span>
                          {[10, 25, 50, 100].map((pts) => (
                            <button
                              key={pts}
                              onClick={() => onAdjustScore(team.id, pts)}
                              className="px-2 py-1 rounded bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-200 text-xs font-bold transition-colors"
                            >
                              +{pts}
                            </button>
                          ))}
                        </div>

                        {/* Quick Subtract Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-red-400 uppercase w-7">Sub:</span>
                          {[10, 25, 50].map((pts) => (
                            <button
                              key={pts}
                              onClick={() => onAdjustScore(team.id, -pts)}
                              className="px-2 py-1 rounded bg-red-900/40 hover:bg-red-600 border border-red-500/50 text-red-200 text-xs font-bold transition-colors"
                            >
                              -{pts}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Points Input */}
                      <div className="flex items-center gap-1 pt-1 border-t border-gray-800">
                        <input
                          type="number"
                          placeholder="Custom pts"
                          value={customDelta[team.id] || ''}
                          onChange={(e) => handleCustomScoreChange(team.id, e.target.value)}
                          className="flex-1 bg-black/60 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 outline-none"
                        />
                        <button
                          onClick={() => handleCustomScoreSubmit(team.id, false)}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-0.5"
                          title="Add custom points"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                        <button
                          onClick={() => handleCustomScoreSubmit(team.id, true)}
                          className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-0.5"
                          title="Subtract custom points"
                        >
                          <Minus className="w-3 h-3" /> Sub
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tournament Grand Finale Action */}
              <div className="pt-4 flex items-center justify-between border-t border-gray-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={onDeclareWinner}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-team text-sm uppercase tracking-wider shadow-lg hover:scale-105 transition-all"
                  >
                    <Trophy className="w-4 h-4" /> Declare Grand Winner & Celebrate!
                  </button>
                </div>

                <button
                  onClick={() => setShowConfirmReset(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold uppercase transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Game
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: QUESTIONS MANAGER */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                  Family Feud Question Bank
                </h3>
                <span className="text-xs text-gray-400">
                  Select active question or edit answers and point values
                </span>
              </div>

              {/* Question selector chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => onSelectQuestion(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      idx === currentQuestionIndex
                        ? 'bg-blue-600 text-white border border-blue-400 shadow-md'
                        : 'bg-black/60 border border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    Q{idx + 1}: {q.roundTitle.split('•')[0]}
                  </button>
                ))}
              </div>

              {/* Active question details */}
              {currentQ && (
                <div className="p-4 rounded-xl bg-black/50 border border-blue-900 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                        Round Title
                      </label>
                      <input
                        type="text"
                        value={currentQ.roundTitle}
                        onChange={(e) =>
                          onUpdateQuestion({ ...currentQ, roundTitle: e.target.value })
                        }
                        className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-amber-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                        Multiplier
                      </label>
                      <select
                        value={currentQ.multiplier}
                        onChange={(e) =>
                          onUpdateQuestion({ ...currentQ, multiplier: Number(e.target.value) })
                        }
                        className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-amber-400 outline-none"
                      >
                        <option value={1}>1X (Single Points)</option>
                        <option value={2}>2X (Double Points)</option>
                        <option value={3}>3X (Triple Points)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Question Prompt
                    </label>
                    <input
                      type="text"
                      value={currentQ.questionText}
                      onChange={(e) =>
                        onUpdateQuestion({ ...currentQ, questionText: e.target.value })
                      }
                      className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-amber-400 outline-none"
                    />
                  </div>

                  {/* Answers List */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
                      Answers & Point Values (Sum to ~100)
                    </label>
                    <div className="space-y-2">
                      {currentQ.answers.map((ans, aIdx) => (
                        <div
                          key={ans.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-gray-800"
                        >
                          <span className="font-mono text-xs text-amber-400 w-5">
                            #{aIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={ans.text}
                            onChange={(e) => {
                              const newAnswers = [...currentQ.answers];
                              newAnswers[aIdx] = { ...ans, text: e.target.value };
                              onUpdateQuestion({ ...currentQ, answers: newAnswers });
                            }}
                            className="flex-1 bg-black/60 border border-gray-700 rounded px-2.5 py-1 text-xs text-white focus:border-amber-400 outline-none"
                          />
                          <div className="flex items-center gap-1 w-24">
                            <input
                              type="number"
                              value={ans.points}
                              onChange={(e) => {
                                const newAnswers = [...currentQ.answers];
                                newAnswers[aIdx] = {
                                  ...ans,
                                  points: parseInt(e.target.value || '0', 10),
                                };
                                onUpdateQuestion({ ...currentQ, answers: newAnswers });
                              }}
                              className="w-16 bg-black/60 border border-gray-700 rounded px-2 py-1 text-xs text-right text-amber-300 font-bold focus:border-amber-400 outline-none"
                            />
                            <span className="text-[10px] text-gray-400">pts</span>
                          </div>
                          <button
                            onClick={() => {
                              const newAnswers = [...currentQ.answers];
                              newAnswers[aIdx] = { ...ans, isRevealed: !ans.isRevealed };
                              onUpdateQuestion({ ...currentQ, answers: newAnswers });
                              if (!ans.isRevealed) soundEffects.playCorrectAnswer();
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition-all ${
                              ans.isRevealed
                                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500'
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                          >
                            {ans.isRevealed ? 'Revealed' : 'Hidden'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Game Settings & Rules
              </h3>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-gray-800 cursor-pointer">
                  <div>
                    <span className="text-sm font-bold text-white block">
                      Auto-sort Leaderboard
                    </span>
                    <span className="text-xs text-gray-400">
                      Instantly re-orders the 4 team rows from highest to lowest score
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoSortLeaderboard}
                    onChange={(e) =>
                      onUpdateSettings({ autoSortLeaderboard: e.target.checked })
                    }
                    className="w-5 h-5 accent-amber-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-gray-800 cursor-pointer">
                  <div>
                    <span className="text-sm font-bold text-white block">
                      Allow Negative Scores
                    </span>
                    <span className="text-xs text-gray-400">
                      Permits scores below 0 when subtracting points
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowNegativeScores}
                    onChange={(e) =>
                      onUpdateSettings({ allowNegativeScores: e.target.checked })
                    }
                    className="w-5 h-5 accent-amber-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-gray-800 cursor-pointer">
                  <div>
                    <span className="text-sm font-bold text-white block">
                      Sound Effects Active
                    </span>
                    <span className="text-xs text-gray-400">
                      Enable synthesized retro game show bell chimes, strikes, and fanfare
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => {
                      onUpdateSettings({ soundEnabled: e.target.checked });
                      soundEffects.setEnabled(e.target.checked);
                    }}
                    className="w-5 h-5 accent-amber-400 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Auditorium Host Keyboard Shortcuts
              </h3>
              <p className="text-xs text-gray-400">
                Use keyboard keys to operate the game seamlessly from your host laptop:
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800 flex items-center justify-between">
                  <span className="text-gray-300">Toggle Fullscreen</span>
                  <kbd className="px-2 py-0.5 rounded bg-gray-800 text-amber-300 font-mono font-bold">F</kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800 flex items-center justify-between">
                  <span className="text-gray-300">Host Control Room</span>
                  <kbd className="px-2 py-0.5 rounded bg-gray-800 text-amber-300 font-mono font-bold">H or Esc</kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800 flex items-center justify-between">
                  <span className="text-gray-300">Reveal Answers 1 to 6</span>
                  <kbd className="px-2 py-0.5 rounded bg-gray-800 text-amber-300 font-mono font-bold">1 - 6</kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800 flex items-center justify-between">
                  <span className="text-gray-300">Trigger Strike Buzzer</span>
                  <kbd className="px-2 py-0.5 rounded bg-gray-800 text-amber-300 font-mono font-bold">X</kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800 flex items-center justify-between">
                  <span className="text-gray-300">Leaderboard View</span>
                  <kbd className="px-2 py-0.5 rounded bg-gray-800 text-amber-300 font-mono font-bold">L</kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800 flex items-center justify-between">
                  <span className="text-gray-300">Question Board View</span>
                  <kbd className="px-2 py-0.5 rounded bg-gray-800 text-amber-300 font-mono font-bold">Q</kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800 flex items-center justify-between">
                  <span className="text-gray-300">Undo Last Action</span>
                  <kbd className="px-2 py-0.5 rounded bg-gray-800 text-amber-300 font-mono font-bold">Ctrl/Cmd + Z</kbd>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800 flex items-center justify-between">
                  <span className="text-gray-300">Start / Pause Timer</span>
                  <kbd className="px-2 py-0.5 rounded bg-gray-800 text-amber-300 font-mono font-bold">Space</kbd>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* CONFIRM RESET DIALOG */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md rounded-2xl bg-[#111827] border-2 border-red-500 p-6 text-center shadow-2xl">
            <h3 className="font-team text-xl text-white uppercase mb-2">
              Reset Entire Game?
            </h3>
            <p className="text-sm text-gray-300 mb-6">
              This will restore the initial demonstration team scores (450, 320, 210, 150) and reset all revealed answers and strikes.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-5 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmReset(false);
                  onResetGame();
                }}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase shadow-lg"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
