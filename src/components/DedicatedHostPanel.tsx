import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  ExternalLink,
  Undo2,
  Redo2,
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
  Square,
  FolderKanban,
  Music,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { GameState, HistoryEntry, Question } from '../types';
import { INITIAL_GAME_STATE, createNewGameState } from '../data/defaultData';
import { syncManager, type SoundEvent } from '../utils/syncManager';
import { soundEffects } from '../utils/soundEffects';
import { QuestionManagerModal } from './QuestionManagerModal';
import { AudioAssetManagerModal } from './AudioAssetManagerModal';

export const DedicatedHostPanel: React.FC = () => {
  // Authoritative State
  const [gameState, setGameState] = useState<GameState>(() => {
    return syncManager.getStoredState() || INITIAL_GAME_STATE;
  });

  // Undo / Redo Stacks
  const [pastHistory, setPastHistory] = useState<HistoryEntry[]>([]);
  const [futureHistory, setFutureHistory] = useState<HistoryEntry[]>([]);

  // Modals & UI States
  const [isQuestionManagerOpen, setIsQuestionManagerOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetTeamScoreId, setResetTeamScoreId] = useState<string | null>(null);
  const [resetTeamStrikesId, setResetTeamStrikesId] = useState<string | null>(null);
  const [customDelta, setCustomDelta] = useState<{ [teamId: string]: string }>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ broadcast: true, websocket: false });

  // Debounce ref to prevent duplicate rapid strike events
  const lastStrikeTimeRef = useRef<number>(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, type: 'info' | 'error' | 'success' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Sync state mutation with Undo history and Broadcast
  const updateAndBroadcast = useCallback((
    actionDescription: string,
    updater: (prev: GameState) => GameState,
    soundToTrigger?: SoundEvent
  ) => {
    setGameState((prev) => {
      // 1. Record snapshot for Undo
      setPastHistory((past) => [
        {
          description: actionDescription,
          timestamp: Date.now(),
          state: JSON.parse(JSON.stringify(prev)),
        },
        ...past.slice(0, 40),
      ]);

      // 2. Clear Redo stack on new action
      setFutureHistory([]);

      // 3. Compute new state
      const next = updater(prev);
      const nextWithMeta: GameState = {
        ...next,
        lastActionText: actionDescription,
        lastUpdated: Date.now(),
      };

      // 4. Authoritative Broadcast & Persist
      syncManager.broadcastState(nextWithMeta);

      // 5. Trigger Sound (if sound is enabled and not muted)
      if (soundToTrigger && next.settings.soundEnabled) {
        syncManager.broadcastSound(soundToTrigger);
        switch (soundToTrigger) {
          case 'correctDing':
            soundEffects.playCorrectAnswer();
            break;
          case 'strikeBuzzer':
            soundEffects.playStrike();
            break;
          case 'thirdStrike':
            soundEffects.playThirdStrike();
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

      return nextWithMeta;
    });
  }, []);

  // UNDO Action - Restores previous state WITHOUT replaying sounds
  const handleUndo = useCallback(() => {
    if (pastHistory.length === 0) return;
    const [previousEntry, ...remainingPast] = pastHistory;

    setGameState((current) => {
      // Push current to future for Redo
      setFutureHistory((future) => [
        {
          description: current.lastActionText || 'Previous State',
          timestamp: Date.now(),
          state: JSON.parse(JSON.stringify(current)),
        },
        ...future,
      ]);

      setPastHistory(remainingPast);

      const restoredState: GameState = {
        ...previousEntry.state,
        lastActionText: `Undo: ${previousEntry.description}`,
        lastUpdated: Date.now(),
      };

      syncManager.broadcastState(restoredState);
      showToast(`Undone: ${previousEntry.description}`, 'info');
      return restoredState;
    });
  }, [pastHistory, showToast]);

  // REDO Action - Advances to future state WITHOUT replaying sounds
  const handleRedo = useCallback(() => {
    if (futureHistory.length === 0) return;
    const [nextEntry, ...remainingFuture] = futureHistory;

    setGameState((current) => {
      setPastHistory((past) => [
        {
          description: current.lastActionText || 'Current State',
          timestamp: Date.now(),
          state: JSON.parse(JSON.stringify(current)),
        },
        ...past,
      ]);

      setFutureHistory(remainingFuture);

      const restoredState: GameState = {
        ...nextEntry.state,
        lastActionText: `Redo: ${nextEntry.description}`,
        lastUpdated: Date.now(),
      };

      syncManager.broadcastState(restoredState);
      showToast(`Redone: ${nextEntry.description}`, 'info');
      return restoredState;
    });
  }, [futureHistory, showToast]);

  // Listen for sync status & external updates (cross-window storage & websockets)
  useEffect(() => {
    const unsubConn = syncManager.onConnectionChange(setSyncStatus);
    const unsubState = syncManager.onStateChange((externalState, source) => {
      // If external state comes from another tab via storage or ws
      if (source !== 'broadcast') {
        setGameState(externalState);
      }
    });

    return () => {
      unsubConn();
      unsubState();
    };
  }, []);

  // Synchronize audio engine settings with gameState
  useEffect(() => {
    soundEffects.setEnabled(gameState.settings.soundEnabled);
    if (typeof gameState.settings.volume === 'number') {
      soundEffects.setVolume(gameState.settings.volume);
    }
  }, [gameState.settings.soundEnabled, gameState.settings.volume]);

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

  // Launch Projector Display Window
  const openProjectorWindow = () => {
    window.open('/display', 'GDG_FEUD_PROJECTOR_DISPLAY', 'width=1280,height=720,menubar=no,toolbar=no');
  };

  // Active Team & Current Question
  const activeTeam = gameState.teams.find((t) => t.id === gameState.activeTeamId) || gameState.teams[0];
  const currentQ: Question =
    gameState.questions[gameState.activeQuestionIndex] || gameState.questions[0];

  // Active round accumulated bank calculation
  const revealedPoints = currentQ?.answers
    ? currentQ.answers.filter((a) => a.isRevealed).reduce((sum, a) => sum + (a.points || 0), 0)
    : 0;
  const roundBank = revealedPoints * (currentQ?.multiplier || 1);

  // 1. SELECT ACTIVE TEAM
  const handleSelectActiveTeam = (teamId: string) => {
    const targetTeam = gameState.teams.find((t) => t.id === teamId);
    if (!targetTeam) return;
    updateAndBroadcast(`Selected active team: ${targetTeam.name}`, (prev) => ({
      ...prev,
      activeTeamId: teamId,
    }));
  };

  // 2. STRIKE CONTROLS
  const handleAddStrikeToTeam = (teamId: string) => {
    // Debounce rapid clicks within 300ms
    const now = Date.now();
    if (now - lastStrikeTimeRef.current < 300) return;
    lastStrikeTimeRef.current = now;

    const targetTeam = gameState.teams.find((t) => t.id === teamId);
    if (!targetTeam) return;

    const currentStrikes = targetTeam.strikes || 0;
    if (currentStrikes >= 3) {
      showToast(`${targetTeam.name} already has maximum 3 strikes.`, 'error');
      return;
    }

    const nextStrikes = currentStrikes + 1;
    const isThirdStrike = nextStrikes === 3;

    updateAndBroadcast(
      `Strike ${nextStrikes} given to ${targetTeam.name}`,
      (prev) => ({
        ...prev,
        strikes: nextStrikes,
        lastStrikeTeamId: teamId,
        teams: prev.teams.map((t) => (t.id === teamId ? { ...t, strikes: nextStrikes } : t)),
      }),
      isThirdStrike ? 'thirdStrike' : 'strikeBuzzer'
    );
  };

  const handleRemoveStrikeFromTeam = (teamId: string) => {
    const targetTeam = gameState.teams.find((t) => t.id === teamId);
    if (!targetTeam) return;

    const currentStrikes = targetTeam.strikes || 0;
    if (currentStrikes <= 0) {
      showToast(`${targetTeam.name} has 0 strikes.`, 'info');
      return;
    }

    const nextStrikes = currentStrikes - 1;
    updateAndBroadcast(`Removed strike from ${targetTeam.name}`, (prev) => ({
      ...prev,
      strikes: nextStrikes,
      lastStrikeTeamId: teamId,
      teams: prev.teams.map((t) => (t.id === teamId ? { ...t, strikes: nextStrikes } : t)),
    }));
  };

  const handleConfirmResetTeamStrikes = () => {
    if (!resetTeamStrikesId) return;
    const targetTeam = gameState.teams.find((t) => t.id === resetTeamStrikesId);
    updateAndBroadcast(`Reset strikes for ${targetTeam?.name || 'team'}`, (prev) => ({
      ...prev,
      strikes: 0,
      teams: prev.teams.map((t) => (t.id === resetTeamStrikesId ? { ...t, strikes: 0 } : t)),
    }));
    setResetTeamStrikesId(null);
  };

  const handleClearAllStrikes = () => {
    updateAndBroadcast('Cleared strikes for all rows', (prev) => ({
      ...prev,
      strikes: 0,
      lastStrikeTeamId: null,
      teams: prev.teams.map((t) => ({ ...t, strikes: 0 })),
    }));
  };

  // 3. SCORE CONTROLS
  const handleScoreAdjust = (teamId: string, delta: number) => {
    const targetTeam = gameState.teams.find((t) => t.id === teamId);
    if (!targetTeam) return;

    if (!gameState.settings.allowNegativeScores && targetTeam.score + delta < 0) {
      showToast(
        `Negative scores are disabled. Cannot reduce ${targetTeam.name} below 0.`,
        'error'
      );
      return;
    }

    updateAndBroadcast(
      `Adjusted score for ${targetTeam.name} by ${delta > 0 ? `+${delta}` : delta}`,
      (prev) => ({
        ...prev,
        teams: prev.teams.map((t) => {
          if (t.id === teamId) {
            const nextScore = prev.settings.allowNegativeScores
              ? t.score + delta
              : Math.max(0, t.score + delta);
            return { ...t, score: nextScore };
          }
          return t;
        }),
      }),
      'score'
    );
  };

  const handleScoreSet = (teamId: string, newScore: number) => {
    const validScore = gameState.settings.allowNegativeScores ? newScore : Math.max(0, newScore);
    const targetTeam = gameState.teams.find((t) => t.id === teamId);
    updateAndBroadcast(`Set score for ${targetTeam?.name || teamId} to ${validScore}`, (prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === teamId ? { ...t, score: validScore } : t)),
    }));
  };

  const handleConfirmResetTeamScore = () => {
    if (!resetTeamScoreId) return;
    const targetTeam = gameState.teams.find((t) => t.id === resetTeamScoreId);
    updateAndBroadcast(`Reset score for ${targetTeam?.name || 'team'} to 0`, (prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === resetTeamScoreId ? { ...t, score: 0 } : t)),
    }));
    setResetTeamScoreId(null);
  };

  const handleTeamRename = (teamId: string, newName: string) => {
    updateAndBroadcast(`Renamed team to ${newName}`, (prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === teamId ? { ...t, name: newName } : t)),
    }));
  };

  // 4. ANSWER REVEAL & MANUAL SCORING
  const handleToggleAnswer = (answerId: string) => {
    if (!currentQ) return;
    const targetAnswer = currentQ.answers.find((a) => a.id === answerId);
    if (!targetAnswer) return;

    const willReveal = !targetAnswer.isRevealed;

    updateAndBroadcast(
      `${willReveal ? 'Revealed' : 'Hid'} answer: "${targetAnswer.text}"`,
      (prev) => {
        const questionsCopy = prev.questions.map((q, idx) => {
          if (idx !== prev.activeQuestionIndex) return q;
          return {
            ...q,
            answers: q.answers.map((a) =>
              a.id === answerId ? { ...a, isRevealed: willReveal } : a
            ),
          };
        });
        return { ...prev, questions: questionsCopy };
      },
      willReveal ? 'correctDing' : undefined
    );
  };

  const handleRevealAll = (reveal: boolean) => {
    if (!currentQ) return;
    updateAndBroadcast(
      `${reveal ? 'Revealed all' : 'Hid all'} answers in Q${gameState.activeQuestionIndex + 1}`,
      (prev) => {
        const questionsCopy = prev.questions.map((q, idx) => {
          if (idx !== prev.activeQuestionIndex) return q;
          return {
            ...q,
            answers: q.answers.map((a) => ({ ...a, isRevealed: reveal })),
          };
        });
        return { ...prev, questions: questionsCopy };
      },
      reveal ? 'correctDing' : undefined
    );
  };

  // Manual Award of Individual Answer Points to Active Team
  const handleAwardIndividualAnswer = (answerId: string) => {
    if (!currentQ || !activeTeam) return;
    const targetAnswer = currentQ.answers.find((a) => a.id === answerId);
    if (!targetAnswer) return;

    if (targetAnswer.isAwarded) {
      showToast(`This answer has already been awarded. Reverse award first if needed.`, 'error');
      return;
    }

    const pointsToAward = targetAnswer.points * (currentQ.multiplier || 1);

    updateAndBroadcast(
      `Awarded +${pointsToAward} pts ("${targetAnswer.text}") to ${activeTeam.name}`,
      (prev) => {
        const questionsCopy = prev.questions.map((q, idx) => {
          if (idx !== prev.activeQuestionIndex) return q;
          return {
            ...q,
            answers: q.answers.map((a) =>
              a.id === answerId
                ? { ...a, isRevealed: true, isAwarded: true, awardedToTeamId: prev.activeTeamId }
                : a
            ),
          };
        });

        const teamsCopy = prev.teams.map((t) =>
          t.id === prev.activeTeamId ? { ...t, score: t.score + pointsToAward } : t
        );

        return { ...prev, questions: questionsCopy, teams: teamsCopy };
      },
      'score'
    );
  };

  // Reverse / Undo an Individual Answer Award
  const handleReverseAnswerAward = (answerId: string) => {
    if (!currentQ) return;
    const targetAnswer = currentQ.answers.find((a) => a.id === answerId);
    if (!targetAnswer || !targetAnswer.isAwarded) return;

    const awardedTeamId = targetAnswer.awardedToTeamId;
    const pointsToRemove = targetAnswer.points * (currentQ.multiplier || 1);
    const awardedTeam = gameState.teams.find((t) => t.id === awardedTeamId);

    updateAndBroadcast(
      `Reversed award of ${pointsToRemove} pts for "${targetAnswer.text}" from ${awardedTeam?.name || 'team'}`,
      (prev) => {
        const questionsCopy = prev.questions.map((q, idx) => {
          if (idx !== prev.activeQuestionIndex) return q;
          return {
            ...q,
            answers: q.answers.map((a) =>
              a.id === answerId ? { ...a, isAwarded: false, awardedToTeamId: null } : a
            ),
          };
        });

        const teamsCopy = prev.teams.map((t) => {
          if (t.id === awardedTeamId) {
            const nextScore = prev.settings.allowNegativeScores
              ? t.score - pointsToRemove
              : Math.max(0, t.score - pointsToRemove);
            return { ...t, score: nextScore };
          }
          return t;
        });

        return { ...prev, questions: questionsCopy, teams: teamsCopy };
      }
    );
  };

  // Award Full Round Bank to Team
  const handleAwardRoundPoints = (teamId: string) => {
    if (roundBank <= 0) {
      showToast('No revealed points in round bank to award.', 'info');
      return;
    }
    const targetTeam = gameState.teams.find((t) => t.id === teamId);
    if (!targetTeam) return;

    updateAndBroadcast(
      `Awarded full round bank (${roundBank} pts) to ${targetTeam.name}`,
      (prev) => {
        const questionsCopy = prev.questions.map((q, idx) => {
          if (idx !== prev.activeQuestionIndex) return q;
          return {
            ...q,
            isRoundAwarded: true,
            awardedToTeamId: teamId,
            answers: q.answers.map((a) =>
              a.isRevealed ? { ...a, isAwarded: true, awardedToTeamId: teamId } : a
            ),
          };
        });

        const teamsCopy = prev.teams.map((t) =>
          t.id === teamId ? { ...t, score: t.score + roundBank } : t
        );

        return { ...prev, questions: questionsCopy, teams: teamsCopy };
      },
      'roundWin'
    );
  };

  const handleUnlockRoundAward = () => {
    updateAndBroadcast('Unlocked round award for re-scoring', (prev) => {
      const questionsCopy = prev.questions.map((q, idx) => {
        if (idx !== prev.activeQuestionIndex) return q;
        return {
          ...q,
          isRoundAwarded: false,
          awardedToTeamId: null,
          answers: q.answers.map((a) => ({ ...a, isAwarded: false, awardedToTeamId: null })),
        };
      });
      return { ...prev, questions: questionsCopy };
    });
  };

  // 5. QUESTION NAVIGATION
  const handleNavigateQuestion = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= gameState.questions.length) return;
    updateAndBroadcast(`Switched to question ${targetIndex + 1}`, (prev) => ({
      ...prev,
      activeQuestionIndex: targetIndex,
      strikes: 0,
      activeView: 'question_board',
    }));
  };

  // 6. TIMER LOGIC (Host is Authoritative)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameState.timerActive && gameState.timerSeconds > 0) {
      interval = setInterval(() => {
        setGameState((prev) => {
          if (prev.timerSeconds <= 1) {
            syncManager.broadcastSound('strikeBuzzer');
            soundEffects.playStrike();
            const updated = { ...prev, timerSeconds: 0, timerActive: false };
            syncManager.broadcastState(updated);
            return updated;
          }
          if (prev.timerSeconds <= 6) {
            syncManager.broadcastSound('tick');
            soundEffects.playClockTick();
          }
          const updated = { ...prev, timerSeconds: prev.timerSeconds - 1 };
          syncManager.broadcastState(updated);
          return updated;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.timerActive, gameState.timerSeconds]);

  // 7. KEYBOARD SHORTCUTS
  const actionsRef = useRef({
    handleUndo,
    handleRedo,
    handleAddStrikeToTeam,
    handleNavigateQuestion,
    handleToggleAnswer,
    toggleFullscreen,
    updateAndBroadcast,
    gameState,
    activeTeam,
    currentQ,
  });

  useEffect(() => {
    actionsRef.current = {
      handleUndo,
      handleRedo,
      handleAddStrikeToTeam,
      handleNavigateQuestion,
      handleToggleAnswer,
      toggleFullscreen,
      updateAndBroadcast,
      gameState,
      activeTeam,
      currentQ,
    };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const {
        handleUndo: doUndo,
        handleRedo: doRedo,
        handleAddStrikeToTeam: doAddStrike,
        handleNavigateQuestion: doNavQ,
        handleToggleAnswer: doToggleAns,
        toggleFullscreen: doToggleFs,
        updateAndBroadcast: doUpdate,
        gameState: currentGs,
        activeTeam: currentTeam,
        currentQ: currentQuestion,
      } = actionsRef.current;

      // Ctrl+Z / Cmd+Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        doUndo();
        return;
      }

      // Ctrl+Y / Cmd+Shift+Z: Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        doRedo();
        return;
      }

      // Shift + 1..4: Strike for Row 1, 2, 3, 4
      if (e.shiftKey && ['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        const rowIdx = parseInt(e.code.replace('Digit', ''), 10) - 1;
        const targetRow = currentGs.teams[rowIdx];
        if (targetRow) {
          e.preventDefault();
          doAddStrike(targetRow.id);
          return;
        }
      }

      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          doToggleFs();
          break;
        case 'l':
          e.preventDefault();
          doUpdate('Switched projector to Leaderboard', (prev) => ({
            ...prev,
            activeView: 'leaderboard',
          }));
          break;
        case 'q':
          e.preventDefault();
          doUpdate('Switched projector to Question Board', (prev) => ({
            ...prev,
            activeView: 'question_board',
          }));
          break;
        case 'x':
          e.preventDefault();
          if (currentTeam) doAddStrike(currentTeam.id);
          break;
        case 'n':
        case 'arrowright':
          e.preventDefault();
          doNavQ(currentGs.activeQuestionIndex + 1);
          break;
        case 'p':
        case 'arrowleft':
          e.preventDefault();
          doNavQ(currentGs.activeQuestionIndex - 1);
          break;
        case 'm': {
          e.preventDefault();
          const nextSound = !currentGs.settings.soundEnabled;
          doUpdate(`Toggled audio ${nextSound ? 'ON' : 'OFF'}`, (prev) => ({
            ...prev,
            settings: { ...prev.settings, soundEnabled: nextSound },
          }));
          break;
        }
        case 't': {
          e.preventDefault();
          const nextTimer = !currentGs.timerActive;
          doUpdate(`Timer ${nextTimer ? 'started' : 'paused'}`, (prev) => ({
            ...prev,
            timerActive: nextTimer,
          }));
          break;
        }
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8': {
          const slotIdx = parseInt(e.key, 10) - 1;
          const ans = currentQuestion?.answers?.[slotIdx];
          if (ans) {
            e.preventDefault();
            doToggleAns(ans.id);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none">
      
      {/* 1. TOP HEADER & PRO SYSTEM BAR */}
      <header className="bg-black border-b border-zinc-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        
        {/* Brand & Sync Status */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 text-sm tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            GDG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold uppercase tracking-wider text-white">
                GDG Feud • Host Console
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                /host
              </span>
            </div>
            
            {/* Sync Indicators & Last Action */}
            <div className="flex items-center gap-3 text-xs mt-0.5 text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync (0ms)
              </span>
              <span className={`flex items-center gap-1 text-[11px] ${syncStatus.websocket ? 'text-zinc-300' : 'text-zinc-500'}`}>
                <Radio className="w-3 h-3" />
                {syncStatus.websocket ? 'WebSocket Online' : 'Local Channel'}
              </span>
              {gameState.lastActionText && (
                <span className="text-zinc-500 text-[11px] truncate max-w-[280px] hidden md:inline">
                  • Last: {gameState.lastActionText}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Operational Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Launch Projector Display Window */}
          <button
            onClick={openProjectorWindow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md"
            title="Open audience presentation window (/display) to drag onto projector"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Projector Display ↗
          </button>

          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={pastHistory.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-zinc-200 uppercase transition-all"
            title={pastHistory[0]?.description ? `Undo: ${pastHistory[0].description} (Ctrl+Z)` : 'Nothing to undo'}
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>

          {/* Redo Button */}
          <button
            onClick={handleRedo}
            disabled={futureHistory.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-zinc-200 uppercase transition-all"
            title={futureHistory[0]?.description ? `Redo: ${futureHistory[0].description} (Ctrl+Y)` : 'Nothing to redo'}
          >
            <Redo2 className="w-3.5 h-3.5" /> Redo
          </button>

          {/* Question Bank Manager Modal Trigger */}
          <button
            onClick={() => setIsQuestionManagerOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-amber-300 uppercase transition-all"
            title="Open Question Bank & Round Manager"
          >
            <FolderKanban className="w-3.5 h-3.5 text-amber-400" /> Questions ({gameState.questions.length})
          </button>

          {/* Audio Assets Manager Trigger */}
          <button
            onClick={() => setIsAudioModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 hover:text-white uppercase transition-all"
            title="Configure authentic audio tracks"
          >
            <Music className="w-3.5 h-3.5 text-zinc-400" /> Audio
          </button>

          {/* Master Audio Mute Toggle */}
          <button
            onClick={() => {
              const nextVal = !gameState.settings.soundEnabled;
              updateAndBroadcast(`Toggled audio ${nextVal ? 'ON' : 'OFF'}`, (prev) => ({
                ...prev,
                settings: { ...prev.settings, soundEnabled: nextVal },
              }));
              soundEffects.setEnabled(nextVal);
              if (nextVal) soundEffects.playCorrectAnswer();
            }}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
              gameState.settings.soundEnabled
                ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500'
                : 'bg-zinc-900 border-red-900 text-red-400'
            }`}
            title={gameState.settings.soundEnabled ? 'Mute Audio (M)' : 'Unmute Audio (M)'}
          >
            {gameState.settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Stop Audio Button */}
          <button
            onClick={() => {
              soundEffects.stopActiveMusic();
              syncManager.broadcastStopSound();
              showToast('Stopped active sound', 'info');
            }}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all"
            title="Stop playing music"
          >
            <Square className="w-4 h-4" />
          </button>

          {/* Fullscreen Host */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all"
            title="Toggle Host Window Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Grand Champions Finale */}
          <button
            onClick={() => {
              updateAndBroadcast(
                'Toggled Grand Champions Podium',
                (prev) => ({ ...prev, winnerDeclared: !prev.winnerDeclared }),
                'finalWinner'
              );
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-amber-950 border border-amber-500/60 text-amber-300 text-xs font-bold uppercase tracking-wider transition-all"
            title="Trigger Grand Champions Podium & Confetti on Projector"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Champions Finale
          </button>

          {/* Reset Entire Game */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 border border-zinc-800 hover:border-red-800 text-zinc-400 hover:text-red-400 transition-all"
            title="Reset Game Session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </header>

      {/* 2. PROJECTOR SCREEN VIEW SELECTOR & ACTIVE TEAM BANNER */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-4 sm:px-6 py-2 flex items-center justify-between gap-4 flex-wrap">
        
        {/* Projector View Mode Toggles */}
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
              className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                gameState.activeView === 'leaderboard'
                  ? 'bg-amber-400 text-black shadow'
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
              className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                gameState.activeView === 'question_board'
                  ? 'bg-amber-400 text-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Question Board [Q]
            </button>
          </div>
        </div>

        {/* ACTIVE TEAM HIGHLIGHT STATUS BADGE */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 uppercase font-bold">Active Scoring Team:</span>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-amber-400 text-amber-300 font-bold text-xs uppercase shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            {activeTeam?.name || 'None'} ({activeTeam?.score || 0} pts)
          </div>
        </div>

        {/* Projector Live Status Feed */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400 font-mono">
            Screen: <strong className="text-white uppercase">{gameState.activeView === 'leaderboard' ? 'LEADERBOARD' : `Q${gameState.activeQuestionIndex + 1} • ${currentQ?.roundTitle}`}</strong>
          </span>
        </div>

      </div>

      {/* TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div
          className={`px-6 py-2 flex items-center justify-between text-xs font-bold border-b ${
            toastMessage.type === 'error'
              ? 'bg-red-950 border-red-800 text-red-200'
              : toastMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-200'
              : 'bg-zinc-900 border-zinc-700 text-zinc-200'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-400 hover:text-white ml-2">
            ×
          </button>
        </div>
      )}

      {/* 3. MAIN DASHBOARD: 2 COLUMNS */}
      <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1700px] mx-auto w-full">
        
        {/* LEFT COLUMN: 4 AUDITORIUM ROW TEAMS LIVE SCORING & STRIKES (5 COLS) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" /> 4 Auditorium Teams
            </h2>
            <span className="text-xs text-zinc-500">
              Click a row to select as Active Team
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {gameState.teams.map((team, idx) => {
              const isActive = team.id === gameState.activeTeamId;
              const strikeCount = team.strikes || 0;
              const isMaxStrikes = strikeCount >= 3;

              const teamStyles = {
                red: {
                  pill: 'bg-red-500/10 text-red-400 border-red-500/30',
                  accentBorder: isActive
                    ? 'border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                    : 'border border-zinc-800 border-l-4 border-l-red-500',
                  strikeBadge: 'bg-red-600 text-white',
                },
                blue: {
                  pill: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                  accentBorder: isActive
                    ? 'border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                    : 'border border-zinc-800 border-l-4 border-l-blue-500',
                  strikeBadge: 'bg-blue-600 text-white',
                },
                green: {
                  pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                  accentBorder: isActive
                    ? 'border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'border border-zinc-800 border-l-4 border-l-emerald-500',
                  strikeBadge: 'bg-emerald-600 text-white',
                },
                purple: {
                  pill: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                  accentBorder: isActive
                    ? 'border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                    : 'border border-zinc-800 border-l-4 border-l-purple-500',
                  strikeBadge: 'bg-purple-600 text-white',
                },
              }[team.color];

              return (
                <div
                  key={team.id}
                  onClick={() => handleSelectActiveTeam(team.id)}
                  className={`p-3.5 rounded-xl bg-zinc-950 flex flex-col gap-2.5 cursor-pointer transition-all ${teamStyles.accentBorder}`}
                >
                  {/* Row Header & Active Team Badge */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${teamStyles.pill}`}>
                          Row {idx + 1} • {team.color}
                        </span>

                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase flex items-center gap-1 animate-pulse">
                            ★ Active Team
                          </span>
                        )}

                        {/* Presets */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {['Row ' + (idx + 1), 'Bandits', 'Ninjas'].map((preset) => (
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
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleTeamRename(team.id, e.target.value)}
                        className="w-full bg-black border border-zinc-800 focus:border-amber-400 rounded-lg px-2.5 py-1 text-sm font-semibold uppercase text-white outline-none transition-all"
                      />
                    </div>

                    {/* Score Display & Reset Score */}
                    <div className="w-28 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] uppercase font-bold text-zinc-500">
                          Score
                        </label>
                        <button
                          onClick={() => setResetTeamScoreId(team.id)}
                          className="text-[9px] text-zinc-500 hover:text-red-400 underline"
                          title="Reset score to 0"
                        >
                          Reset
                        </button>
                      </div>
                      <input
                        type="number"
                        value={team.score}
                        onChange={(e) => handleScoreSet(team.id, parseInt(e.target.value || '0', 10))}
                        className="w-full bg-black border border-zinc-800 focus:border-amber-400 rounded-lg px-2 py-1 text-right font-mono text-2xl sm:text-3xl font-black text-amber-300 outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick Score Increments & Decrements */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80" onClick={(e) => e.stopPropagation()}>
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
                  <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
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

                  {/* Independent Strikes Row Controls */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800/80 text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Strikes:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((sIndex) => (
                          <span
                            key={sIndex}
                            className={`w-5 h-5 rounded text-[11px] font-black flex items-center justify-center font-mono ${
                              strikeCount >= sIndex
                                ? 'bg-red-600 text-white shadow-[0_0_8px_#ef4444]'
                                : 'bg-black text-zinc-700 border border-zinc-800'
                            }`}
                          >
                            X
                          </span>
                        ))}
                      </div>

                      {isMaxStrikes && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold tracking-wider animate-pulse ml-1">
                          3 STRIKES
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Add Strike Control */}
                      <button
                        onClick={() => handleAddStrikeToTeam(team.id)}
                        disabled={isMaxStrikes}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold transition-all flex items-center gap-1"
                        title={`Add strike to ${team.name}`}
                      >
                        <XIcon className="w-3 h-3 stroke-[3]" /> + Strike
                      </button>

                      {/* Remove Strike Control */}
                      <button
                        onClick={() => handleRemoveStrikeFromTeam(team.id)}
                        disabled={strikeCount <= 0}
                        className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 text-[11px] font-bold transition-all"
                        title={`Remove 1 strike from ${team.name}`}
                      >
                        - Strike
                      </button>

                      {/* Reset Strikes with confirmation */}
                      {strikeCount > 0 && (
                        <button
                          onClick={() => setResetTeamStrikesId(team.id)}
                          className="px-1.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white text-[10px]"
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

          {/* Quick Clear All Strikes for All Teams */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <span className="text-zinc-400">
              Auditorium Strikes Controls
            </span>
            <button
              onClick={handleClearAllStrikes}
              className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold uppercase transition-all"
            >
              Clear Strikes on All Rows
            </button>
          </div>

        </section>

        {/* RIGHT COLUMN: QUESTION BOARD LIVE CONTROLS & MANUAL SCORING (7 COLS) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Header & Question Navigation Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Live Question Board Operations
              </h2>
            </div>
            
            {/* Prev / Next & Tab Navigator */}
            <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => handleNavigateQuestion(gameState.activeQuestionIndex - 1)}
                disabled={gameState.activeQuestionIndex === 0}
                className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-20"
                title="Previous Question [P or Left]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {gameState.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => handleNavigateQuestion(idx)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      idx === gameState.activeQuestionIndex
                        ? 'bg-amber-400 text-black shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Q{idx + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleNavigateQuestion(gameState.activeQuestionIndex + 1)}
                disabled={gameState.activeQuestionIndex === gameState.questions.length - 1}
                className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-20"
                title="Next Question [N or Right]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ACTIVE QUESTION PANEL */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3.5 shadow-sm">
            
            {/* Metadata Bar: Round, Multiplier, Strikes, Timer */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700 text-xs font-bold text-amber-300">
                  {currentQ?.roundTitle}
                </span>
                {(currentQ?.multiplier || 1) > 1 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/50 font-mono text-xs font-bold">
                    {currentQ.multiplier}X MULTIPLIER
                  </span>
                )}
              </div>

              {/* Authoritative Timer Controls */}
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
                  title={gameState.timerActive ? 'Pause Timer [T]' : 'Start Timer [T]'}
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
                      timerSeconds: prev.settings.timerDuration || 30,
                    }));
                  }}
                  className="text-zinc-400 hover:text-white p-1"
                  title="Reset timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Question Text Marquee */}
            <div className="bg-black rounded-xl p-3.5 border border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Question #{gameState.activeQuestionIndex + 1} Prompt
                </span>
                <button
                  onClick={() => setIsQuestionManagerOpen(true)}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  Edit Question / Answers
                </button>
              </div>
              <p className="text-base sm:text-lg font-bold text-white leading-snug">
                "{currentQ?.questionText}"
              </p>
            </div>

            {/* ANSWER SLOTS GRID WITH REVEAL & INDIVIDUAL MANUAL AWARD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-zinc-300 tracking-wide">
                    Answer Slots & Manual Scoring
                  </span>
                  <span className="text-[11px] text-zinc-500 ml-2">
                    (Keys 1–{currentQ?.answers?.length || 6} to toggle reveal)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRevealAll(true)}
                    className="text-[11px] font-bold text-amber-300 hover:underline cursor-pointer"
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

              <div className="grid grid-cols-1 gap-2">
                {currentQ?.answers?.map((ans, idx) => {
                  const isRevealed = ans.isRevealed;
                  const isAwarded = ans.isAwarded;
                  const awardedTeam = isAwarded
                    ? gameState.teams.find((t) => t.id === ans.awardedToTeamId)
                    : null;
                  const effectivePts = ans.points * (currentQ.multiplier || 1);

                  return (
                    <div
                      key={ans.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isRevealed
                          ? 'bg-zinc-900 border-zinc-600 text-white shadow-sm ring-1 ring-white/10'
                          : 'bg-black border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {/* Left: Slot number & Answer text (Click to toggle reveal) */}
                      <div
                        onClick={() => handleToggleAnswer(ans.id)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                        title={`Click to ${isRevealed ? 'hide' : 'reveal'} [Key ${idx + 1}]`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full font-mono text-xs flex items-center justify-center shrink-0 font-bold ${
                            isRevealed ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span
                          className={`text-xs sm:text-sm uppercase leading-tight line-clamp-1 ${
                            isRevealed ? 'text-white font-bold' : 'text-zinc-400'
                          }`}
                        >
                          {ans.text}
                        </span>
                      </div>

                      {/* Right: Points value & Manual Award Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Point Badge */}
                        <span className="font-mono font-bold text-base text-amber-300 w-10 text-right">
                          {effectivePts}
                        </span>

                        {/* Reveal Toggle Badge */}
                        <button
                          onClick={() => handleToggleAnswer(ans.id)}
                          className={`text-[10px] font-bold uppercase px-2 py-1 rounded transition-all ${
                            isRevealed
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80 hover:bg-emerald-900/60'
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                          }`}
                        >
                          {isRevealed ? 'Revealed' : 'Reveal [Key ' + (idx + 1) + ']'}
                        </button>

                        {/* SEPARATE MANUAL AWARD ACTION (Requirement 3 & 7) */}
                        {isAwarded ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-zinc-900 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Awarded to {awardedTeam?.name || 'Team'}
                            </span>
                            <button
                              onClick={() => handleReverseAnswerAward(ans.id)}
                              className="text-[10px] px-1.5 py-1 rounded bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-800"
                              title="Reverse this answer award"
                            >
                              Undo Award
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAwardIndividualAnswer(ans.id)}
                            disabled={!activeTeam}
                            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold uppercase transition-all shadow-sm"
                            title={`Award ${effectivePts} pts to ${activeTeam?.name || 'Active Team'}`}
                          >
                            + Award to {activeTeam?.name || 'Team'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ROUND ACCUMULATED BANK & FULL ROUND AWARD */}
            <div className="mt-2 p-3.5 rounded-xl bg-black border border-zinc-800 flex flex-col gap-3">
              
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                    Accumulated Round Bank Points
                  </span>
                  <div className="font-mono text-3xl font-black text-white">
                    {roundBank} <span className="text-sm font-sans text-amber-400 font-normal">PTS</span>
                  </div>
                </div>

                {/* Duplicate Award Status Badge */}
                {currentQ?.isRoundAwarded ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-emerald-700 text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Awarded to{' '}
                      {gameState.teams.find((t) => t.id === currentQ.awardedToTeamId)?.name || 'Team'}
                    </span>
                    <button
                      onClick={handleUnlockRoundAward}
                      className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                      title="Unlock if awarded by mistake"
                    >
                      Unlock Bank?
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400">
                    Ready to award entire bank to a row team
                  </span>
                )}
              </div>

              {/* Quick Award Full Bank to Any Row Team */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {gameState.teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleAwardRoundPoints(t.id)}
                    disabled={roundBank <= 0 || currentQ?.isRoundAwarded}
                    className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-amber-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title={
                      currentQ?.isRoundAwarded
                        ? 'Already awarded for this round'
                        : `Award entire ${roundBank} points to ${t.name}`
                    }
                  >
                    + Award Bank to {t.name}
                  </button>
                ))}
              </div>

            </div>

          </div>

        </section>

      </main>

      {/* CONFIRM RESET ENTIRE GAME DIALOG */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 text-center shadow-2xl">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white uppercase mb-2">
              Start Fresh Game Session?
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              This will reset all team scores to 0, clear strikes, and reset revealed answers on both this host console and the projector display. Your question bank will be safely preserved.
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
                  const freshState = createNewGameState(true);
                  // Preserve question bank & audio settings
                  freshState.questions = gameState.questions;
                  freshState.settings = gameState.settings;
                  updateAndBroadcast('Reset game session', () => freshState);
                  showToast('Fresh game session started.', 'success');
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase shadow-lg transition-all"
              >
                Confirm New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESET TEAM SCORE DIALOG */}
      {resetTeamScoreId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 text-center shadow-2xl">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h4 className="text-base font-bold text-white uppercase mb-1">
              Reset Score to 0?
            </h4>
            <p className="text-xs text-zinc-400 mb-4">
              Reset score for {gameState.teams.find((t) => t.id === resetTeamScoreId)?.name} to 0 points?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setResetTeamScoreId(null)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-white text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResetTeamScore}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESET TEAM STRIKES DIALOG */}
      {resetTeamStrikesId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 text-center shadow-2xl">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h4 className="text-base font-bold text-white uppercase mb-1">
              Reset Strikes to 0?
            </h4>
            <p className="text-xs text-zinc-400 mb-4">
              Clear all strikes for {gameState.teams.find((t) => t.id === resetTeamStrikesId)?.name}?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setResetTeamStrikesId(null)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-white text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResetTeamStrikes}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase"
              >
                Clear Strikes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION MANAGER MODAL */}
      <QuestionManagerModal
        isOpen={isQuestionManagerOpen}
        onClose={() => setIsQuestionManagerOpen(false)}
        questions={gameState.questions}
        activeQuestionIndex={gameState.activeQuestionIndex}
        onSaveQuestions={(newQuestions) => {
          updateAndBroadcast('Updated question bank', (prev) => ({
            ...prev,
            questions: newQuestions,
          }));
        }}
        onSelectActiveQuestion={(index) => {
          handleNavigateQuestion(index);
        }}
        onResetRevealState={(qIndex) => {
          updateAndBroadcast(
            qIndex !== undefined ? `Reset reveals for Q${qIndex + 1}` : 'Reset all reveals',
            (prev) => {
              const updatedQuestions = prev.questions.map((q, idx) => {
                if (qIndex !== undefined && idx !== qIndex) return q;
                return {
                  ...q,
                  isRoundAwarded: false,
                  awardedToTeamId: null,
                  answers: q.answers.map((a) => ({ ...a, isRevealed: false, isAwarded: false, awardedToTeamId: null })),
                };
              });
              return { ...prev, questions: updatedQuestions };
            }
          );
        }}
      />

      {/* AUDIO ASSETS MANAGER MODAL */}
      <AudioAssetManagerModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
      />

    </div>
  );
};
