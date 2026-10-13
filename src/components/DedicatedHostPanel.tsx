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
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none">
      
      {/* 1. TOP PRO CONTROL BAR */}
      <header className="bg-black border-b border-zinc-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        
        {/* Brand & Sync Status */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-white text-sm tracking-wider">
            GDG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold uppercase tracking-wider text-white">
                Host Control Room
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                /host
              </span>
            </div>
            
            {/* Sync Status Badges */}
            <div className="flex items-center gap-3 text-xs mt-0.5 text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync 0ms
              </span>
              <span className={`flex items-center gap-1 ${syncStatus.websocket ? 'text-zinc-300' : 'text-zinc-500'}`}>
                <Radio className="w-3 h-3" />
                {syncStatus.websocket ? 'WebSocket Online' : 'Local Channel'}
              </span>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Launch Projector Display */}
          <button
            onClick={openProjectorWindow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-wider transition-all"
            title="Open /display in new window to move to the auditorium projector"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Projector Display ↗
          </button>

          {/* Undo Action */}
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium text-zinc-200 uppercase transition-all"
            title={history[0]?.description ? `Undo: ${history[0].description}` : 'Undo last action (Ctrl+Z)'}
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>

          {/* Audio Mute/Unmute */}
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
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
              gameState.settings.soundEnabled
                ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500'
                : 'bg-zinc-900 border-red-900/60 text-red-400'
            }`}
            title={gameState.settings.soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {gameState.settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Host */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all"
            title="Toggle Host Window Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Declare Grand Champions */}
          <button
            onClick={() => {
              updateAndBroadcast(
                'Declared Grand Champions!',
                (prev) => ({ ...prev, winnerDeclared: !prev.winnerDeclared }),
                'finalWinner'
              );
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold uppercase tracking-wider transition-all"
            title="Trigger Grand Champions Podium & Confetti on Projector"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Champion Finale
          </button>

          {/* Reset Game */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 border border-zinc-800 hover:border-red-800 text-zinc-400 hover:text-red-400 transition-all"
            title="Reset Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </header>

      {/* 2. PROJECTOR VIEW SELECTOR BAR */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Projector Screen:
          </span>
          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => {
                updateAndBroadcast('Switched projector to Leaderboard', (prev) => ({
                  ...prev,
                  activeView: 'leaderboard',
                }));
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                gameState.activeView === 'leaderboard'
                  ? 'bg-white text-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Leaderboard [L]
            </button>

            <button
              onClick={() => {
                updateAndBroadcast('Switched projector to Question Board', (prev) => ({
                  ...prev,
                  activeView: 'question_board',
                }));
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                gameState.activeView === 'question_board'
                  ? 'bg-white text-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Question Board [Q]
            </button>
          </div>
        </div>

        {/* Live Projector Feed Label */}
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-zinc-400 font-mono">
            On Projector: <strong className="text-white uppercase">{gameState.activeView === 'leaderboard' ? 'LEADERBOARD' : `Q${gameState.activeQuestionIndex + 1} • ${currentQ.roundTitle}`}</strong>
          </span>
        </div>
      </div>

      {/* 3. MAIN HOST CONTROL DASHBOARD */}
      <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1700px] mx-auto w-full">
        
        {/* LEFT COLUMN: 4 AUDITORIUM ROW TEAMS LIVE SCORING (Lg: 5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zinc-400" /> 4 Auditorium Teams Scoring
            </h2>
            <span className="text-xs text-zinc-500">
              Live sorted on projector
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {gameState.teams.map((team, idx) => {
              const rowColors = {
                red: {
                  pill: 'bg-red-500/10 text-red-400 border-red-500/30',
                  accentBorder: 'border-l-4 border-l-red-500',
                },
                blue: {
                  pill: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                  accentBorder: 'border-l-4 border-l-blue-500',
                },
                green: {
                  pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                  accentBorder: 'border-l-4 border-l-emerald-500',
                },
                purple: {
                  pill: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                  accentBorder: 'border-l-4 border-l-purple-500',
                },
              }[team.color];

              return (
                <div
                  key={team.id}
                  className={`p-3.5 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col gap-2.5 ${rowColors.accentBorder}`}
                >
                  {/* Name, Preset and Score Display */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${rowColors.pill}`}>
                          Row {idx + 1} • {team.color}
                        </span>
                        {/* Quick Name Presets */}
                        <div className="flex items-center gap-1">
                          {['Row ' + (idx + 1), 'Byte Bandits', 'Bug Hunters', 'Neural Ninjas', 'Cloud Chasers']
                            .slice(0, 3)
                            .map((preset) => (
                              <button
                                key={preset}
                                onClick={() => handleTeamRename(team.id, preset)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
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
                        className="w-full bg-black border border-zinc-800 focus:border-white rounded-lg px-2.5 py-1 text-sm font-semibold uppercase text-white outline-none transition-all"
                      />
                    </div>

                    {/* Direct Score Input */}
                    <div className="w-24 text-right">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                        Points
                      </label>
                      <input
                        type="number"
                        value={team.score}
                        onChange={(e) => handleScoreSet(team.id, parseInt(e.target.value || '0', 10))}
                        className="w-full bg-black border border-zinc-800 focus:border-white rounded-lg px-2 py-1 text-right font-mono text-3xl font-black text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick Score Increments & Decrements */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase w-6">Add:</span>
                      {[10, 25, 50, 100].map((pts) => (
                        <button
                          key={pts}
                          onClick={() => handleScoreAdjust(team.id, pts)}
                          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition-all hover:border-zinc-600"
                        >
                          +{pts}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase w-6">Sub:</span>
                      {[10, 25, 50].map((pts) => (
                        <button
                          key={pts}
                          onClick={() => handleScoreAdjust(team.id, -pts)}
                          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-bold transition-all hover:border-zinc-600"
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
                      className="flex-1 bg-black border border-zinc-800 focus:border-zinc-600 rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-600 outline-none"
                    />
                    <button
                      onClick={() => {
                        const val = parseInt(customDelta[team.id] || '0', 10);
                        if (!isNaN(val) && val !== 0) {
                          handleScoreAdjust(team.id, Math.abs(val));
                          setCustomDelta({ ...customDelta, [team.id]: '' });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-0.5"
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
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-0.5"
                    >
                      <Minus className="w-3 h-3" /> Sub
                    </button>
                  </div>

                  {/* Row Specific Strikes Controls */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800/80 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Strikes:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((sIndex) => (
                          <span
                            key={sIndex}
                            className={`w-4 h-4 rounded text-[10px] font-black flex items-center justify-center font-mono ${
                              (team.strikes || 0) >= sIndex
                                ? 'bg-red-600 text-white'
                                : 'bg-black text-zinc-700 border border-zinc-800'
                            }`}
                          >
                            X
                          </span>
                        ))}
                      </div>
                      {(team.strikes || 0) >= 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold animate-pulse">
                          OUT
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAddStrikeToTeam(team.id)}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-all flex items-center gap-1"
                        title={`Give strike to ${team.name}`}
                      >
                        <XIcon className="w-3 h-3 stroke-[3]" /> + Strike
                      </button>
                      {(team.strikes || 0) > 0 && (
                        <button
                          onClick={() => handleClearTeamStrikes(team.id)}
                          className="px-1.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px]"
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              Question Board Operations
            </h2>
            
            {/* Question Selector Tabs */}
            <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800">
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
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    idx === gameState.activeQuestionIndex
                      ? 'bg-white text-black shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Q{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Active Question Banner & Controls */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3.5">
            
            {/* Metadata row: Round, Multiplier, Strikes, Timer */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700 text-xs font-bold text-zinc-200">
                  {currentQ.roundTitle}
                </span>
                {currentQ.multiplier > 1 && (
                  <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-white font-mono text-xs font-bold">
                    {currentQ.multiplier}X
                  </span>
                )}
              </div>

              {/* Strikes Controls */}
              <div className="flex items-center gap-2 bg-black px-3 py-1 rounded-lg border border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 uppercase">Strikes:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((sIndex) => {
                    const isHit = gameState.strikes >= sIndex;
                    return (
                      <button
                        key={sIndex}
                        onClick={handleAddStrike}
                        className={`w-7 h-7 rounded border flex items-center justify-center transition-all ${
                          isHit
                            ? 'bg-red-600 border-red-500 text-white shadow-sm'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-red-400'
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
                    className="text-[10px] text-zinc-400 hover:text-white ml-1 px-1.5 py-0.5 rounded bg-zinc-900"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Countdown Timer Controls */}
              <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => {
                    const nextActive = !gameState.timerActive;
                    updateAndBroadcast(`Timer ${nextActive ? 'started' : 'paused'}`, (prev) => ({
                      ...prev,
                      timerActive: nextActive,
                    }));
                  }}
                  className="p-1 text-zinc-300 hover:text-white"
                  title={gameState.timerActive ? 'Pause Timer' : 'Start Timer'}
                >
                  {gameState.timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <span
                  className={`font-mono font-bold text-lg w-7 text-center ${
                    gameState.timerSeconds <= 5 ? 'text-red-400 animate-pulse' : 'text-white'
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
                  className="text-zinc-400 hover:text-white p-1"
                  title="Reset timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dedicated Row Strikes & Steals Action Panel */}
            <div className="bg-black p-3 rounded-xl border border-zinc-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center">
                    <XIcon className="w-3.5 h-3.5 text-white stroke-[3.5]" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Row Strikes & Steal Tracker
                  </span>
                  <span className="text-[10px] text-zinc-500 hidden md:inline">
                    (Shortcuts: <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Shift+1</kbd> to <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">Shift+4</kbd>)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAllStrikes}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium transition-all"
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
                  const rowThemes = {
                    red: 'border-l-4 border-l-red-500',
                    blue: 'border-l-4 border-l-blue-500',
                    green: 'border-l-4 border-l-emerald-500',
                    purple: 'border-l-4 border-l-purple-500',
                  }[team.color];

                  return (
                    <div
                      key={team.id}
                      className={`p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 flex flex-col justify-between gap-2 transition-all ${rowThemes}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="truncate">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                            Row {idx + 1}
                          </span>
                          <span className="text-xs font-bold uppercase text-white truncate block">
                            {team.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {[1, 2, 3].map((sIndex) => (
                            <span
                              key={sIndex}
                              className={`w-4 h-4 rounded text-[10px] font-black flex items-center justify-center font-mono ${
                                strikeCount >= sIndex
                                  ? 'bg-red-600 text-white'
                                  : 'bg-black text-zinc-700 border border-zinc-800'
                              }`}
                            >
                              X
                            </span>
                          ))}
                        </div>
                      </div>

                      {isMax && (
                        <div className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold text-center uppercase tracking-wider animate-pulse">
                          3 STRIKES (STEAL!)
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <button
                          onClick={() => handleAddStrikeToTeam(team.id)}
                          className="flex-1 py-1 px-2 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                          title={`Add strike to Row ${idx + 1} (${team.name}) [Shift+${idx + 1}]`}
                        >
                          <XIcon className="w-3.5 h-3.5 stroke-[3.5]" /> + Strike
                        </button>
                        {strikeCount > 0 && (
                          <button
                            onClick={() => handleClearTeamStrikes(team.id)}
                            className="px-2 py-1 rounded bg-black hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-medium"
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
            <div className="bg-zinc-950 rounded-xl p-3.5 border border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Question {gameState.activeQuestionIndex + 1} on Display
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 uppercase font-bold">
                  {currentQ.roundTitle}
                </span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-white leading-snug">
                "{currentQ.questionText}"
              </p>
            </div>

            {/* Answer Slots Grid (Reveal / Hide) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-zinc-400 tracking-wide">
                  Answer Slots (Press Keys 1–6 to Toggle)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRevealAll(true)}
                    className="text-[11px] font-bold text-white hover:underline cursor-pointer"
                  >
                    Reveal All
                  </button>
                  <span className="text-zinc-700">•</span>
                  <button
                    onClick={() => handleRevealAll(false)}
                    className="text-[11px] font-bold text-zinc-400 hover:text-white cursor-pointer"
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
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      ans.isRevealed
                        ? 'bg-zinc-900 border-zinc-500 text-white shadow-sm ring-1 ring-white/10'
                        : 'bg-black border-zinc-800 hover:border-zinc-700 text-zinc-400'
                    }`}
                    title={`Click or press [${idx + 1}] to toggle reveal on projector`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
                      <span className={`w-6 h-6 rounded-full font-mono text-xs flex items-center justify-center shrink-0 font-bold ${
                        ans.isRevealed ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={`text-xs sm:text-sm uppercase leading-tight line-clamp-2 ${ans.isRevealed ? 'text-white font-bold' : 'text-zinc-400'}`}>
                        {ans.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-base sm:text-lg text-white w-7 text-right">
                        {ans.points}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          ans.isRevealed
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                            : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
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
            <div className="mt-2 p-3.5 rounded-xl bg-black border border-zinc-800 flex flex-col gap-3">
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Accumulated Round Bank
                  </span>
                  <div className="font-mono text-3xl font-black text-white">
                    {roundBank} <span className="text-sm font-sans text-zinc-400 font-normal">PTS</span>
                  </div>
                </div>

                {/* Duplicate Award Status Badge */}
                {currentQ.isRoundAwarded ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Awarded to {gameState.teams.find((t) => t.id === currentQ.awardedToTeamId)?.name || 'Team'}
                    </span>
                    <button
                      onClick={handleUnlockRoundAward}
                      className="text-xs text-zinc-400 hover:text-white underline"
                      title="Unlock if awarded by mistake"
                    >
                      Re-award?
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-500">
                    Ready to award to winning row
                  </span>
                )}
              </div>

              {/* Award Buttons for 4 Teams */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {gameState.teams.map((t) => {
                  const awardButtonStyles = {
                    red: 'bg-zinc-900 hover:bg-red-600 hover:text-white text-red-400 border-red-500/30',
                    blue: 'bg-zinc-900 hover:bg-blue-600 hover:text-white text-blue-400 border-blue-500/30',
                    green: 'bg-zinc-900 hover:bg-emerald-600 hover:text-white text-emerald-400 border-emerald-500/30',
                    purple: 'bg-zinc-900 hover:bg-purple-600 hover:text-white text-purple-400 border-purple-500/30',
                  }[t.color];

                  return (
                    <button
                      key={t.id}
                      onClick={() => handleAwardRoundPoints(t.id)}
                      disabled={roundBank <= 0 || currentQ.isRoundAwarded}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed ${awardButtonStyles}`}
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
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 text-center shadow-2xl">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white uppercase mb-2">
              Reset Entire Game?
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              This will restore initial team scores and reset all revealed answers and strikes on both this host screen and the projector display.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase transition-all"
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
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase shadow-lg transition-all"
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

