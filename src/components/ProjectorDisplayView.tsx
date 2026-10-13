import React, { useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { GameState } from '../types';
import { INITIAL_TEAMS, DEFAULT_QUESTIONS } from '../data/defaultData';
import { StageBackground } from './StageBackground';
import { MarqueeFrame } from './MarqueeFrame';
import { GameHeader } from './GameHeader';
import { LeaderboardView } from './LeaderboardView';
import { QuestionBoard } from './QuestionBoard';
import { WinnerOverlay } from './WinnerOverlay';
import { syncManager } from '../utils/syncManager';
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

export const ProjectorDisplayView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    return syncManager.getStoredState() || INITIAL_GAME_STATE;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Subscribe to real-time state updates from Host panel
  useEffect(() => {
    const unsubscribeState = syncManager.onStateChange((newState) => {
      setGameState(newState);
    });

    const unsubscribeSound = syncManager.onSoundTriggered((sound) => {
      if (gameState.settings.projectorSoundEnabled || gameState.settings.soundEnabled) {
        soundEffects.setEnabled(true);
        switch (sound) {
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
    });

    const unsubscribeStopSound = syncManager.onStopSoundTriggered(() => {
      soundEffects.stopActiveMusic();
    });

    return () => {
      unsubscribeState();
      unsubscribeSound();
      unsubscribeStopSound();
    };
  }, [gameState.settings.projectorSoundEnabled, gameState.settings.soundEnabled]);

  // Fullscreen listener
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Answer reveal handler on projector display (interactive click or presenter remote)
  const handleRevealAnswer = useCallback((answerId: string) => {
    setGameState((prev) => {
      const activeQ = prev.questions[prev.activeQuestionIndex];
      if (!activeQ) return prev;

      const updatedQuestions = prev.questions.map((q, qIdx) => {
        if (qIdx !== prev.activeQuestionIndex) return q;
        return {
          ...q,
          answers: q.answers.map((a) =>
            a.id === answerId ? { ...a, isRevealed: true } : a
          ),
        };
      });

      const updatedState = { ...prev, questions: updatedQuestions };
      syncManager.broadcastState(updatedState);
      syncManager.broadcastSound('correctDing');
      return updatedState;
    });
  }, []);

  // Strike handlers on projector
  const handleAddStrikeToTeam = useCallback((teamId: string) => {
    setGameState((prev) => {
      const currentTeam = prev.teams.find((t) => t.id === teamId);
      const nextStrikes = Math.min(3, (currentTeam?.strikes || 0) + 1);
      const updatedState = {
        ...prev,
        strikes: nextStrikes,
        lastStrikeTeamId: teamId,
        teams: prev.teams.map((t) => (t.id === teamId ? { ...t, strikes: nextStrikes } : t)),
      };
      syncManager.broadcastState(updatedState);
      syncManager.broadcastSound('strikeBuzzer');
      return updatedState;
    });
  }, []);

  const handleClearStrikes = useCallback(() => {
    setGameState((prev) => {
      const updatedState = {
        ...prev,
        strikes: 0,
        lastStrikeTeamId: null,
        teams: prev.teams.map((t) => ({ ...t, strikes: 0 })),
      };
      syncManager.broadcastState(updatedState);
      return updatedState;
    });
  }, []);

  const handleAddStrike = useCallback(() => {
    setGameState((prev) => {
      const nextStrikes = Math.min(3, prev.strikes + 1);
      const updatedState = { ...prev, strikes: nextStrikes };
      syncManager.broadcastState(updatedState);
      syncManager.broadcastSound('strikeBuzzer');
      return updatedState;
    });
  }, []);

  // Keyboard and presenter remote shortcuts on projector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      if (gameState.activeView === 'question_board') {
        const activeQ = gameState.questions[gameState.activeQuestionIndex];
        if (!activeQ) return;

        // Space / Enter / ArrowRight / PageDown: Reveal next unrevealed answer
        if ([' ', 'Enter', 'ArrowRight', 'PageDown'].includes(e.key)) {
          e.preventDefault();
          const nextUnrevealed = activeQ.answers.find((a) => !a.isRevealed);
          if (nextUnrevealed) {
            handleRevealAnswer(nextUnrevealed.id);
          }
          return;
        }

        // Keys 1..6: Direct reveal of slots
        if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
          const slotIdx = parseInt(e.key, 10) - 1;
          const ans = activeQ.answers[slotIdx];
          if (ans) {
            e.preventDefault();
            handleRevealAnswer(ans.id);
          }
          return;
        }

        // Key X: Strike buzzer
        if (e.key.toLowerCase() === 'x') {
          e.preventDefault();
          handleAddStrike();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    toggleFullscreen,
    gameState.activeView,
    gameState.activeQuestionIndex,
    gameState.questions,
    handleRevealAnswer,
    handleAddStrike,
  ]);

  const activeQuestion =
    gameState.questions[gameState.activeQuestionIndex] || DEFAULT_QUESTIONS[0];

  return (
    <StageBackground>
      {/* 16:9 Presentation Scoreboard */}
      <div className="w-full max-w-[1240px] flex flex-col items-center">
        
        {/* GDG FEUD Header Marquee */}
        <GameHeader
          subtitle={
            gameState.activeView === 'question_board'
              ? `${activeQuestion.roundTitle}`
              : undefined
          }
        />

        {/* Central Marquee Stadium Frame */}
        <MarqueeFrame>
          {gameState.activeView === 'leaderboard' ? (
            <LeaderboardView
              teams={gameState.teams}
              onUpdateTeamName={() => {}} // Read-only on projector
              onAdjustScore={() => {}}
              isPresentationMode={true}
              autoSort={gameState.settings.autoSortLeaderboard}
            />
          ) : (
            <QuestionBoard
              question={activeQuestion}
              allQuestions={gameState.questions}
              currentQuestionIndex={gameState.activeQuestionIndex}
              teams={gameState.teams}
              strikes={gameState.strikes}
              lastStrikeTeamId={gameState.lastStrikeTeamId}
              onRevealAnswer={handleRevealAnswer}
              onAddStrike={handleAddStrike}
              onAddStrikeToTeam={handleAddStrikeToTeam}
              onClearStrikes={handleClearStrikes}
              onAwardPoints={() => {}}
              onSelectQuestion={() => {}}
              onSwitchToLeaderboard={() => {}}
              isPresentationMode={true}
            />
          )}
        </MarqueeFrame>

      </div>

      {/* Subtle Auto-Hiding Fullscreen Trigger in bottom-right corner */}
      <div className="fixed bottom-2 right-2 z-30 opacity-20 hover:opacity-100 transition-opacity">
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-full bg-black/60 border border-amber-400/40 text-amber-300 hover:text-white"
          title="Toggle Fullscreen (F)"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Winner Celebration Overlay (Triggered by Host) */}
      {gameState.winnerDeclared && (
        <WinnerOverlay
          teams={gameState.teams}
          onClose={() => {}}
        />
      )}
    </StageBackground>
  );
};
