import React, { useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2, AlertTriangle } from 'lucide-react';
import type { GameState } from '../types';
import { INITIAL_GAME_STATE, DEFAULT_QUESTIONS } from '../data/defaultData';
import { StageBackground } from './StageBackground';
import { MarqueeFrame } from './MarqueeFrame';
import { GameHeader } from './GameHeader';
import { LeaderboardView } from './LeaderboardView';
import { QuestionBoard } from './QuestionBoard';
import { WinnerOverlay } from './WinnerOverlay';
import { syncManager } from '../utils/syncManager';
import { soundEffects } from '../utils/soundEffects';

export const ProjectorDisplayView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    return syncManager.getStoredState() || INITIAL_GAME_STATE;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ broadcast: true, websocket: false });
  const [isStale, setIsStale] = useState(false);

  // Subscribe to real-time state updates from Host panel
  useEffect(() => {
    const unsubscribeConn = syncManager.onConnectionChange(setSyncStatus);

    const unsubscribeState = syncManager.onStateChange((newState) => {
      setGameState(newState);
      setIsStale(false);
    });

    const unsubscribeSound = syncManager.onSoundTriggered((sound) => {
      // Audio is played on projector ONLY if explicitly configured by host
      // Prevents audio duplication/echo when host and display run on the same laptop
      if (gameState.settings.projectorSoundEnabled) {
        soundEffects.setEnabled(true);
        switch (sound) {
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
    });

    const unsubscribeStopSound = syncManager.onStopSoundTriggered(() => {
      soundEffects.stopActiveMusic();
    });

    return () => {
      unsubscribeConn();
      unsubscribeState();
      unsubscribeSound();
      unsubscribeStopSound();
    };
  }, [gameState.settings.projectorSoundEnabled]);

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

  // Keyboard shortcut on projector: strictly read-only, F key toggles fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  const activeQuestion =
    gameState.questions[gameState.activeQuestionIndex] || DEFAULT_QUESTIONS[0];

  return (
    <StageBackground>
      {/* 16:9 Presentation Scoreboard */}
      <div className="w-full max-w-[1240px] flex flex-col items-center select-none">
        
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
              onUpdateTeamName={() => {}}
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
              activeTeamId={gameState.activeTeamId}
              timerSeconds={gameState.timerSeconds}
              timerActive={gameState.timerActive}
              onRevealAnswer={() => {}}
              onAddStrike={() => {}}
              onAddStrikeToTeam={() => {}}
              onClearStrikes={() => {}}
              onAwardPoints={() => {}}
              onSelectQuestion={() => {}}
              onSwitchToLeaderboard={() => {}}
              isPresentationMode={true}
            />
          )}
        </MarqueeFrame>

      </div>

      {/* Subtle Stale / Connection Warning if Sync lost */}
      {(!syncStatus.broadcast && !syncStatus.websocket) || isStale ? (
        <div className="fixed top-2 right-2 z-40 bg-red-950/90 border border-red-500/80 text-red-200 px-3 py-1 rounded-full text-xs font-mono flex items-center gap-1.5 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          Sync Disconnected
        </div>
      ) : null}

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

export default ProjectorDisplayView;
