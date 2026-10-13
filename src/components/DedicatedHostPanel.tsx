import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  ExternalLink,
  Undo2,
  Trophy,
  RotateCcw,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Radio,
  Play,
  Pause,
  X as XIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { GameState, HistoryEntry, Question } from '../types';
import { INITIAL_TEAMS, DEFAULT_QUESTIONS } from '../data/defaultData';
import { syncManager, type SoundEvent } from '../utils/syncManager';
import { soundEffects } from '../utils/soundEffects';

const INITIAL_GAME_STATE: GameState = {
  teams: INITIAL_TEAMS,
  activeView: 'leaderboard',
  activeQuestionIndex: 0,
  questions: DEFAULT_QUESTIONS,
  strikes: 0,
  timerSeconds: 30,
  timerActive: false,
  settings: {
    allowNegativeScores: false,
    timerDuration: 30,
    soundEnabled: true,
    projectorSoundEnabled: true,
    autoSortLeaderboard: true,
    enableCelebrationEffects: true,
  },
  winnerDeclared: false,
};

export const DedicatedHostPanel: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    return syncManager.getStoredState() || INITIAL_GAME_STATE;
  });

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [customDelta, setCustomDelta] = useState<{ [teamId: string]: string }>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ broadcast: true, websocket: false });
  const defaultTimerSeconds = 30;

  // Push history and broadcast state changes
  const updateAndBroadcast = useCallback((
    actionDescription: string,
    updater: (prev: GameState) => GameState,
    soundToTrigger?: SoundEvent
  ) => {
    setGameState((prev) => {
      // Save snapshot for Undo
      setHistory((hist) => [
        {
          description: actionDescription,
          timestamp: Date.now(),
          state: JSON.parse(JSON.stringify(prev)),
        },
        ...hist.slice(0, 30),
      ]);

      const next = updater(prev);
      syncManager.broadcastState(next);

      if (soundToTrigger) {
        syncManager.broadcastSound(soundToTrigger);
        if (next.settings.soundEnabled) {
          switch (soundToTrigger) {
            case 'correctDing':
              soundEffects.playCorrectAnswer();
              break;
            case 'strikeBuzzer':
              soundEffects.playStrike();
              break;
            case 'questionReveal':
              soundEffects.playQuestionReveal();
              break;
            case 'theme':
              soundEffects.playOpeningTheme();
              break;
            case 'faceoff':
              soundEffects.playFaceoff();
              break;
            case 'countdown':
              soundEffects.playCountdownMusic();
              break;
            case 'roundWin':
              soundEffects.playRoundWin();
              break;
            case 'finalWinner':
              soundEffects.playFinalWinner();
              break;
            case 'score':
              soundEffects.playScoreTick();
              break;
            case 'tick':
              soundEffects.playClockTick();
              break;
          }
        }
      }

      return next;
    });
  }, []);

  // Listen for sync status & external updates
  useEffect(() => {
    const unsubConn = syncManager.onConnectionChange(setSyncStatus);
    const unsubState = syncManager.onStateChange((externalState, source) => {
      if (source !== 'broadcast') {
        setGameState(externalState);
      }
    });

    return () => {
      unsubConn();
      unsubState();
    };
  }, []);

  // Fullscreen listener
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Undo action
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const [lastEntry, ...remainingHistory] = history;
    setGameState(lastEntry.state);
    syncManager.broadcastState(lastEntry.state);
    setHistory(remainingHistory);
    soundEffects.playScoreTick();
  }, [history]);

  // Open Projector View in a new popup / window
  const openProjectorWindow = () => {
    window.open('/display', 'GDG_FEUD_PROJECTOR_DISPLAY', 'width=1280,height=720,menubar=no,toolbar=no');
  };

  // Score adjustments
  const handleScoreAdjust = (teamId: string, delta: number) => {
    updateAndBroadcast(
      `Adjusted score for ${teamId} by ${delta > 0 ? `+${delta}` : delta}`,
      (prev) => ({
        ...prev,
        teams: prev.teams.map((t) => {
          if (t.id === teamId) {
            const newScore = t.score + delta;
            return {
              ...t,
              score: prev.settings.allowNegativeScores ? newScore : Math.max(0, newScore),
            };
          }
          return t;
        }),
      }),
      'score'
    );
  };

  const handleScoreSet = (teamId: string, newScore: number) => {
    updateAndBroadcast(`Set score for ${teamId} to ${newScore}`, (prev) => ({
      ...prev,
      teams: prev.teams.map((t) =>
        t.id === teamId
          ? {
              ...t,
              score: prev.settings.allowNegativeScores ? newScore : Math.max(0, newScore),
            }
          : t
      ),
    }));
  };

  const handleTeamRename = (teamId: string, newName: string) => {
    updateAndBroadcast(`Renamed team ${teamId} to ${newName}`, (prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === teamId ? { ...t, name: newName } : t)),
    }));
  };

  const currentQ: Question =
    gameState.questions[gameState.activeQuestionIndex] || DEFAULT_QUESTIONS[0];

  // Active round points calculation
  const revealedPoints = currentQ.answers
    .filter((a) => a.isRevealed)
    .reduce((sum, a) => sum + a.points, 0);

  const roundBank = revealedPoints * currentQ.multiplier;

  // Answer reveal toggle
  const handleToggleAnswer = (answerId: string) => {
    const isCurrentlyRevealed = !!currentQ.answers.find((a) => a.id === answerId)?.isRevealed;
    updateAndBroadcast(
      `${isCurrentlyRevealed ? 'Hid' : 'Revealed'} answer in Q${gameState.activeQuestionIndex + 1}`,
      (prev) => {
        const questionsCopy = [...prev.questions];
        const q = questionsCopy[prev.activeQuestionIndex];
        if (q) {
          q.answers = q.answers.map((a) =>
            a.id === answerId ? { ...a, isRevealed: !a.isRevealed } : a
          );
        }
        return { ...prev, questions: questionsCopy };
      },
      !isCurrentlyRevealed ? 'correctDing' : undefined
    );
  };

  const handleRevealAll = (reveal: boolean) => {
    updateAndBroadcast(
      `${reveal ? 'Revealed all' : 'Hid all'} answers in Q${gameState.activeQuestionIndex + 1}`,
      (prev) => {
        const questionsCopy = [...prev.questions];
        const q = questionsCopy[prev.activeQuestionIndex];
        if (q) {
          q.answers = q.answers.map((a) => ({ ...a, isRevealed: reveal }));
        }
        return { ...prev, questions: questionsCopy };
      },
      reveal ? 'correctDing' : undefined
    );
  };

  // Award round bank points to team (with duplicate award protection)
  const handleAwardRoundPoints = (teamId: string) => {
    if (roundBank <= 0) return;
    const targetTeam = gameState.teams.find((t) => t.id === teamId);
    if (!targetTeam) return;

    updateAndBroadcast(
      `Awarded ${roundBank} round pts to ${targetTeam.name}`,
      (prev) => {
        const questionsCopy = [...prev.questions];
        const q = questionsCopy[prev.activeQuestionIndex];
        if (q) {
          q.isRoundAwarded = true;
          q.awardedToTeamId = teamId;
        }

        return {
          ...prev,
          teams: prev.teams.map((t) =>
            t.id === teamId ? { ...t, score: t.score + roundBank } : t
          ),
          questions: questionsCopy,
        };
      },
      'roundWin'
    );
  };

  const handleUnlockRoundAward = () => {
    updateAndBroadcast('Unlocked round award for re-scoring', (prev) => {
      const questionsCopy = [...prev.questions];
      const q = questionsCopy[prev.activeQuestionIndex];
      if (q) {
        q.isRoundAwarded = false;
        q.awardedToTeamId = null;
      }
      return { ...prev, questions: questionsCopy };
    });
  };

  // Strikes
  // Row-specific strikes
  const handleAddStrikeToTeam = (teamId: string) => {
    const targetTeam = gameState.teams.find((t) => t.id === teamId);
    const teamName = targetTeam?.name || 'Row';
    const currentStrikes = targetTeam?.strikes || 0;
    const nextStrikes = Math.min(3, currentStrikes + 1);

    updateAndBroadcast(
      `Gave strike ${nextStrikes} to ${teamName}`,
      (prev) => ({
        ...prev,
        strikes: nextStrikes,
        lastStrikeTeamId: teamId,
        teams: prev.teams.map((t) =>
          t.id === teamId ? { ...t, strikes: nextStrikes } : t
        ),
      }),
      'strikeBuzzer'
    );
  };

  const handleClearTeamStrikes = (teamId: string) => {
    updateAndBroadcast(`Cleared strikes for team ${teamId}`, (prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === teamId ? { ...t, strikes: 0 } : t)),
    }));
  };

  const handleClearAllStrikes = () => {
    updateAndBroadcast('Cleared all row strikes', (prev) => ({
      ...prev,
      strikes: 0,
      lastStrikeTeamId: null,
      teams: prev.teams.map((t) => ({ ...t, strikes: 0 })),
    }));
  };

  const handleAddStrike = () => {
    // If lastStrikeTeamId is set and still has < 3 strikes, give another strike to that row
    const targetTeam =
      gameState.teams.find((t) => t.id === gameState.lastStrikeTeamId && (t.strikes || 0) < 3) ||
      gameState.teams.find((t) => (t.strikes || 0) < 3) ||
      gameState.teams[0];

    if (targetTeam) {
      handleAddStrikeToTeam(targetTeam.id);
    } else {
      updateAndBroadcast(
        'Triggered strike buzzer',
        (prev) => ({ ...prev, strikes: Math.min(3, prev.strikes + 1) }),
        'strikeBuzzer'
      );
    }
  };

  const handleClearStrikes = () => {
    handleClearAllStrikes();
  };

  // Countdown timer hook in host
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameState.timerActive && gameState.timerSeconds > 0) {
      interval = setInterval(() => {
        setGameState((prev) => {
          if (prev.timerSeconds <= 1) {
            syncManager.broadcastSound('strikeBuzzer');
            const updated = { ...prev, timerSeconds: 0, timerActive: false };
            syncManager.broadcastState(updated);
            return updated;
          }
          if (prev.timerSeconds <= 6) {
            syncManager.broadcastSound('tick');
          }
          const updated = { ...prev, timerSeconds: prev.timerSeconds - 1 };
          syncManager.broadcastState(updated);
          return updated;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.timerActive, gameState.timerSeconds]);

  // Keyboard shortcuts in host panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Shift + 1..4: Quick strike for Row 1, 2, 3, or 4
      if (e.shiftKey && ['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        const rowIdx = parseInt(e.code.replace('Digit', ''), 10) - 1;
        const targetRow = gameState.teams[rowIdx];
        if (targetRow) {
          e.preventDefault();
          handleAddStrikeToTeam(targetRow.id);
          return;
        }
      }

      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'l':
          e.preventDefault();
          updateAndBroadcast('Switched projector to Leaderboard', (prev) => ({
            ...prev,
            activeView: 'leaderboard',
          }));
          break;
        case 'q':
          e.preventDefault();
          updateAndBroadcast('Switched projector to Question Board', (prev) => ({
            ...prev,
            activeView: 'question_board',
          }));
          break;
        case 'x':
          e.preventDefault();
          handleAddStrike();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6': {
          const slotIdx = parseInt(e.key, 10) - 1;
          const ans = currentQ.answers[slotIdx];
          if (ans) {
            e.preventDefault();
            handleToggleAnswer(ans.id);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, updateAndBroadcast, currentQ.answers, gameState.teams]);

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col font-sans select-none">
      
      {/* 1. TOP DUAL-DISPLAY NAVIGATION & STATUS BAR */}
      <header className="bg-gradient-to-r from-[#0c142b] via-[#091024] to-[#060b1a] border-b border-amber-400/40 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xl sticky top-0 z-40">
        
        {/* Brand & Sync Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 p-[2px] flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            <div className="w-full h-full rounded-[10px] bg-black flex items-center justify-center font-game font-black text-amber-300 text-lg">
              GDG
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-team text-base sm:text-lg uppercase tracking-wider text-white">
                Host Control Room
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-900/60 border border-blue-400/50 text-blue-200">
                /host
              </span>
            </div>
            
            {/* Real-time Sync Badges */}
            <div className="flex items-center gap-3 text-xs mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                BroadcastChannel 0ms
              </span>
              <span className={`flex items-center gap-1 ${syncStatus.websocket ? 'text-emerald-400' : 'text-amber-400/80'}`}>
                <Radio className="w-3 h-3" />
                {syncStatus.websocket ? 'WebSocket Connected' : 'WebSocket Fallback'}
              </span>
            </div>
          </div>
        </div>

        {/* Global Host Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Launch Projector Window Button */}
          <button
            onClick={openProjectorWindow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider shadow-md hover:scale-105 transition-all"
            title="Open /display in new window to drag to the auditorium projector"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Launch Projector Display
          </button>

          {/* Undo Action */}
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase transition-all"
            title={history[0]?.description ? `Undo: ${history[0].description}` : 'Undo last action (Ctrl+Z)'}
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const nextVal = !gameState.settings.soundEnabled;
              updateAndBroadcast(
                `Toggled audio ${nextVal ? 'ON' : 'OFF'}`,
                (prev) => ({
                  ...prev,
                  settings: { ...prev.settings, soundEnabled: nextVal, projectorSoundEnabled: nextVal },
                })
              );
              soundEffects.setEnabled(nextVal);
              if (nextVal) soundEffects.playCorrectAnswer();
            }}
            className={`p-1.5 rounded-xl border text-xs font-bold transition-all ${
              gameState.settings.soundEnabled
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-red-500/20 border-red-400 text-red-300'
            }`}
            title={gameState.settings.soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {gameState.settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Host */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
            title="Toggle Host Window Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Grand Champions Finale */}
          <button
            onClick={() => {
              updateAndBroadcast(
                'Declared Grand Champions!',
                (prev) => ({ ...prev, winnerDeclared: !prev.winnerDeclared }),
                'finalWinner'
              );
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-team uppercase tracking-wider shadow-lg hover:scale-105 transition-all"
            title="Trigger Grand Champions Podium & Confetti on Projector"
          >
            <Trophy className="w-3.5 h-3.5" /> Declare Champion
          </button>

          {/* Reset Game */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-300 hover:text-white"
            title="Reset Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </header>

      {/* 2. PROJECTOR LIVE VIEW SELECTOR BAR */}
      <div className="bg-[#040814] border-b border-gray-800 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Projector Screen Mode:
          </span>
          <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-gray-700">
            <button
              onClick={() => {
                updateAndBroadcast('Switched projector to Leaderboard', (prev) => ({
                  ...prev,
                  activeView: 'leaderboard',
                }));
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-team uppercase tracking-wider transition-all ${
                gameState.activeView === 'leaderboard'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg scale-102'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📊 Show Leaderboard [L]
            </button>

            <button
              onClick={() => {
                updateAndBroadcast('Switched projector to Question Board', (prev) => ({
                  ...prev,
                  activeView: 'question_board',
                }));
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-team uppercase tracking-wider transition-all ${
                gameState.activeView === 'question_board'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg scale-102'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ❓ Show Question Board [Q]
            </button>
          </div>
        </div>

        {/* Live Projector Feed Label */}
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-gray-300 font-mono">
            Projector Showing: <strong className="text-amber-300 uppercase">{gameState.activeView === 'leaderboard' ? 'LEADERBOARD' : `Q${gameState.activeQuestionIndex + 1} • ${currentQ.roundTitle}`}</strong>
          </span>
        </div>
      </div>

      {/* 3. MAIN HOST CONTROL DASHBOARD */}
      <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1700px] mx-auto w-full">
        
        {/* LEFT COLUMN: 4 AUDITORIUM ROW TEAMS LIVE SCORING (Lg: 5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-team text-base uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <Sliders className="w-4 h-4" /> 4 Auditorium Teams Scoring
            </h2>
            <span className="text-xs text-gray-400">
              Live sorted on projector
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {gameState.teams.map((team, idx) => {
              const borderColors = {
                red: 'border-red-500/70 bg-gradient-to-br from-red-950/40 to-black/60',
                blue: 'border-blue-500/70 bg-gradient-to-br from-blue-950/40 to-black/60',
                green: 'border-emerald-500/70 bg-gradient-to-br from-emerald-950/40 to-black/60',
                purple: 'border-purple-500/70 bg-gradient-to-br from-purple-950/40 to-black/60',
              }[team.color];

              return (
                <div
                  key={team.id}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col gap-2.5 shadow-lg ${borderColors}`}
                >
                  {/* Name, Preset and Score Display */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 border border-white/10 text-gray-300">
                          {team.color.toUpperCase()} ROW
                        </span>
                        {/* Quick Name Presets */}
                        <div className="flex items-center gap-1">
                          {['Row ' + (idx + 1), 'Byte Bandits', 'Bug Hunters', 'Neural Ninjas', 'Cloud Chasers']
                            .slice(0, 3)
                            .map((preset) => (
                              <button
                                key={preset}
                                onClick={() => handleTeamRename(team.id, preset)}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white"
                              >
                                {preset}
                              </button>
                            ))}
                        </div>
                      </div>

                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => handleTeamRename(team.id, e.target.value)}
                        className="w-full bg-black/70 border border-gray-700 rounded-lg px-2.5 py-1 text-sm font-team uppercase text-white focus:border-amber-400 outline-none"
                      />
                    </div>

                    {/* Direct Score Input */}
                    <div className="w-24 text-right">
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                        Points
                      </label>
                      <input
                        type="number"
                        value={team.score}
                        onChange={(e) => handleScoreSet(team.id, parseInt(e.target.value || '0', 10))}
                        className="w-full bg-black/70 border border-gray-700 rounded-lg px-2 py-1 text-right font-condensed text-3xl font-black text-amber-300 focus:border-amber-400 outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick Score Increments & Decrements */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase w-6">Add:</span>
                      {[10, 25, 50, 100].map((pts) => (
                        <button
                          key={pts}
                          onClick={() => handleScoreAdjust(team.id, pts)}
                          className="px-2 py-1 rounded-md bg-emerald-900/50 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-200 text-xs font-bold transition-all hover:scale-105"
                        >
                          +{pts}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-bold text-red-400 uppercase w-6">Sub:</span>
                      {[10, 25, 50].map((pts) => (
                        <button
                          key={pts}
                          onClick={() => handleScoreAdjust(team.id, -pts)}
                          className="px-2 py-1 rounded-md bg-red-900/50 hover:bg-red-600 border border-red-500/50 text-red-200 text-xs font-bold transition-all hover:scale-105"
                        >
                          -{pts}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Delta Input */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="number"
                      placeholder="Custom points"
                      value={customDelta[team.id] || ''}
                      onChange={(e) => setCustomDelta({ ...customDelta, [team.id]: e.target.value })}
                      className="flex-1 bg-black/60 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-500 outline-none"
                    />
                    <button
                      onClick={() => {
                        const val = parseInt(customDelta[team.id] || '0', 10);
                        if (!isNaN(val) && val !== 0) {
                          handleScoreAdjust(team.id, Math.abs(val));
                          setCustomDelta({ ...customDelta, [team.id]: '' });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                    <button
                      onClick={() => {
                        const val = parseInt(customDelta[team.id] || '0', 10);
                        if (!isNaN(val) && val !== 0) {
                          handleScoreAdjust(team.id, -Math.abs(val));
                          setCustomDelta({ ...customDelta, [team.id]: '' });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-0.5"
                    >
                      <Minus className="w-3 h-3" /> Sub
                    </button>
                  </div>

                  {/* Row Specific Strikes Controls */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-red-400 uppercase">Strikes:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((sIndex) => (
                          <span
                            key={sIndex}
                            className={`w-4 h-4 rounded text-[11px] font-black flex items-center justify-center font-mono ${
                              (team.strikes || 0) >= sIndex
                                ? 'bg-red-600 text-white shadow-[0_0_6px_#ef4444]'
                                : 'bg-black/60 text-gray-600 border border-white/10'
                            }`}
                          >
                            X
                          </span>
                        ))}
                      </div>
                      {(team.strikes || 0) >= 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold animate-pulse">
                          OUT (3 STRIKES)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAddStrikeToTeam(team.id)}
                        className="px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-600 border border-red-500/60 text-red-100 text-[11px] font-bold transition-all hover:scale-105 flex items-center gap-1 shadow-sm"
                        title={`Give strike to ${team.name}`}
                      >
                        <XIcon className="w-3.5 h-3.5 stroke-[3]" /> + Strike
                      </button>
                      {(team.strikes || 0) > 0 && (
                        <button
                          onClick={() => handleClearTeamStrikes(team.id)}
                          className="px-1.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white text-[10px]"
                          title="Reset strikes for this row"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT COLUMN: QUESTION BOARD LIVE CONTROLS (Lg: 7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Header & Question Selector */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-team text-base uppercase tracking-wider text-amber-300 flex items-center gap-2">
              ❓ Question Board Live Operations
            </h2>
            
            {/* Question Selector Tabs */}
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-gray-800">
              {gameState.questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => {
                    updateAndBroadcast(`Selected question ${idx + 1}`, (prev) => ({
                      ...prev,
                      activeQuestionIndex: idx,
                      strikes: 0,
                    }));
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    idx === gameState.activeQuestionIndex
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Q{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Active Question Banner & Controls */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-[#0e1730] to-[#080d1c] border-2 border-blue-900/80 shadow-xl flex flex-col gap-3.5">
            
            {/* Metadata row: Round, Multiplier, Strikes, Timer */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-blue-900/60">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-blue-900/80 border border-blue-400/50 text-xs font-bold text-blue-200">
                  {currentQ.roundTitle}
                </span>
                {currentQ.multiplier > 1 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-bold">
                    {currentQ.multiplier}X
                  </span>
                )}
              </div>

              {/* Strikes Controls */}
              <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-xl border border-red-900/60">
                <span className="text-xs font-bold text-red-300 uppercase">Strikes:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((sIndex) => {
                    const isHit = gameState.strikes >= sIndex;
                    return (
                      <button
                        key={sIndex}
                        onClick={handleAddStrike}
                        className={`w-7 h-7 rounded border flex items-center justify-center transition-all ${
                          isHit
                            ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_#ef4444]'
                            : 'bg-black/60 border-red-950 text-red-900/40 hover:text-red-400'
                        }`}
                        title={`Give strike ${sIndex} [X]`}
                      >
                        <XIcon className="w-4 h-4 stroke-[3]" />
                      </button>
                    );
                  })}
                </div>
                {gameState.strikes > 0 && (
                  <button
                    onClick={handleClearStrikes}
                    className="text-[10px] text-gray-400 hover:text-white ml-1 px-1.5 py-0.5 rounded bg-white/10"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Countdown Timer Controls */}
              <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-xl border border-blue-500/40">
                <button
                  onClick={() => {
                    const nextActive = !gameState.timerActive;
                    updateAndBroadcast(`Timer ${nextActive ? 'started' : 'paused'}`, (prev) => ({
                      ...prev,
                      timerActive: nextActive,
                    }));
                  }}
                  className="p-1 text-blue-300 hover:text-white"
                  title={gameState.timerActive ? 'Pause Timer' : 'Start Timer'}
                >
                  {gameState.timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <span
                  className={`font-mono font-bold text-lg w-7 text-center ${
                    gameState.timerSeconds <= 5 ? 'text-red-400 animate-pulse' : 'text-blue-300'
                  }`}
                >
                  {gameState.timerSeconds}s
                </span>
                <button
                  onClick={() => {
                    updateAndBroadcast('Timer reset', (prev) => ({
                      ...prev,
                      timerActive: false,
                      timerSeconds: defaultTimerSeconds,
                    }));
                  }}
                  className="text-gray-400 hover:text-white p-1"
                  title="Reset timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dedicated Row Strikes & Steals Action Panel */}
            <div className="bg-black/60 p-3 rounded-2xl border-2 border-red-950/70 shadow-lg flex flex-col gap-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-red-600 flex items-center justify-center shadow-[0_0_8px_#ef4444]">
                    <XIcon className="w-3.5 h-3.5 text-white stroke-[3.5]" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-red-300">
                    Row Strikes & Steal Control
                  </span>
                  <span className="text-[10px] text-gray-400 hidden md:inline">
                    (Shortcuts: <kbd className="px-1 py-0.5 rounded bg-black border border-gray-700 text-amber-300 font-mono">Shift+1</kbd> to <kbd className="px-1 py-0.5 rounded bg-black border border-gray-700 text-amber-300 font-mono">Shift+4</kbd> or click below)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAllStrikes}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white font-bold transition-all"
                    title="Reset strikes for all rows"
                  >
                    Clear All Rows
                  </button>
                </div>
              </div>

              {/* 4 Row Action Cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                {gameState.teams.map((team, idx) => {
                  const strikeCount = team.strikes || 0;
                  const isMax = strikeCount >= 3;
                  const borderThemes = {
                    red: 'border-red-500/60 bg-gradient-to-b from-red-950/50 to-black/80',
                    blue: 'border-blue-500/60 bg-gradient-to-b from-blue-950/50 to-black/80',
                    green: 'border-emerald-500/60 bg-gradient-to-b from-emerald-950/50 to-black/80',
                    purple: 'border-purple-500/60 bg-gradient-to-b from-purple-950/50 to-black/80',
                  }[team.color];

                  return (
                    <div
                      key={team.id}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                        isMax
                          ? 'border-red-500 bg-red-950/80 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                          : borderThemes
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="truncate">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">
                            Row {idx + 1}
                          </span>
                          <span className="text-xs font-bold font-team uppercase text-white truncate block">
                            {team.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {[1, 2, 3].map((sIndex) => (
                            <span
                              key={sIndex}
                              className={`w-4 h-4 rounded text-[10px] font-black flex items-center justify-center font-mono ${
                                strikeCount >= sIndex
                                  ? 'bg-red-600 text-white shadow-[0_0_6px_#ef4444]'
                                  : 'bg-black/70 text-gray-700 border border-white/5'
                              }`}
                            >
                              X
                            </span>
                          ))}
                        </div>
                      </div>

                      {isMax && (
                        <div className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold text-center uppercase tracking-wider animate-pulse shadow-[0_0_10px_#ef4444]">
                          🚨 3 STRIKES (STEAL!)
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <button
                          onClick={() => handleAddStrikeToTeam(team.id)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-all hover:scale-[1.02] active:scale-95"
                          title={`Add strike to Row ${idx + 1} (${team.name}) [Shift+${idx + 1}]`}
                        >
                          <XIcon className="w-3.5 h-3.5 stroke-[3.5]" /> + Strike
                        </button>
                        {strikeCount > 0 && (
                          <button
                            onClick={() => handleClearTeamStrikes(team.id)}
                            className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-[10px] font-bold"
                            title={`Clear strikes for Row ${idx + 1}`}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question Text */}
            <div className="bg-black/60 rounded-xl p-3 border border-blue-900">
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                Current Question on Display
              </span>
              <p className="font-team text-lg sm:text-xl text-white">
                "{currentQ.questionText}"
              </p>
            </div>

            {/* Answer Slots Grid (Reveal / Hide) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-gray-300">
                  Answer Slots (Press 1–6 to Reveal on Projector)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRevealAll(true)}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    Reveal All
                  </button>
                  <span className="text-gray-600">•</span>
                  <button
                    onClick={() => handleRevealAll(false)}
                    className="text-[11px] font-bold text-gray-400 hover:text-white"
                  >
                    Hide All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentQ.answers.map((ans, idx) => (
                  <div
                    key={ans.id}
                    onClick={() => handleToggleAnswer(ans.id)}
                    className={`p-2.5 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] ${
                      ans.isRevealed
                        ? 'bg-gradient-to-r from-emerald-950/60 to-black/80 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                        : 'bg-black/60 border-gray-800 hover:border-gray-600'
                    }`}
                    title={`Click or press [${idx + 1}] to toggle reveal on projector`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 truncate mr-2">
                      <span className="w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400 text-amber-300 font-game text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className={`font-team text-sm truncate uppercase ${ans.isRevealed ? 'text-white font-bold' : 'text-gray-400'}`}>
                        {ans.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-condensed font-bold text-lg text-amber-300 w-8 text-right">
                        {ans.points}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          ans.isRevealed
                            ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {ans.isRevealed ? 'Revealed' : `Key [${idx + 1}]`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ROUND BANK ACCUMULATOR & AWARD POINTS SECTION */}
            <div className="mt-2 p-3.5 rounded-xl bg-gradient-to-r from-amber-950/30 via-black/80 to-blue-950/30 border border-amber-400/60 flex flex-col gap-3">
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300/80 block">
                    Accumulated Round Bank
                  </span>
                  <div className="font-condensed text-3xl font-black text-[#ffd700] drop-shadow-[0_0_10px_#ffd700]">
                    {roundBank} <span className="text-sm font-sans text-amber-300">PTS</span>
                  </div>
                </div>

                {/* Duplicate Award Status Badge */}
                {currentQ.isRoundAwarded ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Awarded to {gameState.teams.find((t) => t.id === currentQ.awardedToTeamId)?.name || 'Team'}
                    </span>
                    <button
                      onClick={handleUnlockRoundAward}
                      className="text-xs text-amber-300 hover:underline"
                      title="Unlock if awarded by mistake"
                    >
                      Re-award?
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">
                    Ready to award to winning row
                  </span>
                )}
              </div>

              {/* Award Buttons for 4 Teams */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {gameState.teams.map((t) => {
                  const colorClasses = {
                    red: 'bg-red-700 hover:bg-red-600 border-red-400 text-white',
                    blue: 'bg-blue-700 hover:bg-blue-600 border-blue-400 text-white',
                    green: 'bg-emerald-700 hover:bg-emerald-600 border-emerald-400 text-white',
                    purple: 'bg-purple-700 hover:bg-purple-600 border-purple-400 text-white',
                  }[t.color];

                  return (
                    <button
                      key={t.id}
                      onClick={() => handleAwardRoundPoints(t.id)}
                      disabled={roundBank <= 0 || currentQ.isRoundAwarded}
                      className={`px-3 py-2 rounded-xl border font-team text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:scale-103 ${colorClasses}`}
                      title={
                        currentQ.isRoundAwarded
                          ? 'Already awarded for this round'
                          : `Award ${roundBank} points to ${t.name}`
                      }
                    >
                      + {t.name}
                    </button>
                  );
                })}
              </div>

            </div>

          </div>

        </section>

      </main>

      {/* CONFIRM RESET DIALOG */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#111827] border-2 border-red-500 p-6 text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
            <h3 className="font-team text-xl text-white uppercase mb-2">
              Reset Entire Game?
            </h3>
            <p className="text-sm text-gray-300 mb-6">
              This will restore initial team scores (450, 320, 210, 150) and reset all revealed answers and strikes on both this host screen and the projector display.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-5 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  updateAndBroadcast('Reset entire game', () => ({
                    ...INITIAL_GAME_STATE,
                    settings: gameState.settings,
                  }));
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

