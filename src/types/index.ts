import type { AudioAssetKey } from './audio';

export type TeamColor = 'red' | 'blue' | 'green' | 'purple';

export interface Team {
  id: string;
  name: string;
  score: number;
  color: TeamColor;
  initialRank: number;
  strikes: number;
}

export interface RankedTeam extends Team {
  currentRank: number;
  isTied: boolean;
}

export interface Answer {
  id: string;
  text: string;
  points: number;
  isRevealed: boolean;
  isAwarded?: boolean;
  awardedToTeamId?: string | null;
}

export interface Question {
  id: string;
  roundTitle: string;
  multiplier: number;
  questionText: string;
  answers: Answer[];
  isRoundAwarded?: boolean;
  awardedToTeamId?: string | null;
}

export interface GameSettings {
  allowNegativeScores: boolean;
  timerDuration: number;
  soundEnabled: boolean;
  projectorSoundEnabled: boolean;
  volume: number;
  autoSortLeaderboard: boolean;
  enableCelebrationEffects: boolean;
}

export interface GameState {
  teams: Team[];
  activeTeamId: string;
  activeView: 'leaderboard' | 'question_board';
  activeQuestionIndex: number;
  questions: Question[];
  strikes: number;
  lastStrikeTeamId?: string | null;
  timerSeconds: number;
  timerActive: boolean;
  settings: GameSettings;
  winnerDeclared: boolean;
  lastUpdated?: number;
  lastActionText?: string;
}

export interface HistoryEntry {
  description: string;
  state: GameState;
  timestamp: number;
}

export type SyncMessage =
  | { type: 'STATE_UPDATE'; payload: GameState; senderId: string; timestamp: number }
  | { type: 'REQUEST_STATE'; senderId: string }
  | { type: 'TRIGGER_SOUND'; sound: AudioAssetKey | 'score' | 'tick'; senderId: string }
  | { type: 'STOP_SOUND'; senderId: string }
  | { type: 'PING'; senderId: string };

