import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, X as XIcon, Trophy, ArrowRight, ArrowLeft } from 'lucide-react';
import type { Question, Team } from '../types';
import { AnswerSlot } from './AnswerSlot';
import { soundEffects } from '../utils/soundEffects';

interface QuestionBoardProps {
  question: Question;
  allQuestions: Question[];
  currentQuestionIndex: number;
  teams: Team[];
  strikes: number;
  lastStrikeTeamId?: string | null;
  onRevealAnswer: (answerId: string) => void;
  onAddStrike: () => void;
  onAddStrikeToTeam?: (teamId: string) => void;
  onClearStrikes: () => void;
  onAwardPoints: (teamId: string, points: number) => void;
  onSelectQuestion: (index: number) => void;
  onSwitchToLeaderboard: () => void;
  isPresentationMode?: boolean;
}

export const QuestionBoard: React.FC<QuestionBoardProps> = ({
  question,
  allQuestions,
  currentQuestionIndex,
  teams,
  strikes,
  lastStrikeTeamId,
  onRevealAnswer,
  onAddStrike,
  onAddStrikeToTeam,
  onClearStrikes,
  onAwardPoints,
  onSelectQuestion,
  onSwitchToLeaderboard,
  isPresentationMode = false,
}) => {
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const [strikeFlash, setStrikeFlash] = useState(false);

  // Calculate current revealed round points
  const revealedPoints = question.answers
    .filter((a) => a.isRevealed)
    .reduce((sum, a) => sum + a.points, 0);

  const totalRoundPoints = revealedPoints * question.multiplier;

  // Timer countdown hook
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            soundEffects.playStrike(); // warning buzzer at 0s
            return 0;
          }
          if (prev <= 6) {
            soundEffects.playClockTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  // Trigger visual strike flash when strikes change
  useEffect(() => {
    if (strikes > 0) {
      setStrikeFlash(true);
      const timer = setTimeout(() => setStrikeFlash(false), 900);
      return () => clearTimeout(timer);
    }
  }, [strikes]);

  const handleStrikeClick = () => {
    onAddStrike();
    soundEffects.playStrike();
  };

  const handleRevealAnswer = (answerId: string) => {
    onRevealAnswer(answerId);
    soundEffects.playCorrectAnswer();
  };

  const handleRevealNextAnswer = () => {
    const nextUnrevealed = question.answers.find((a) => !a.isRevealed);
    if (nextUnrevealed) {
      handleRevealAnswer(nextUnrevealed.id);
    }
  };

  const handleAwardToTeam = (teamId: string) => {
    if (totalRoundPoints <= 0) return;
    onAwardPoints(teamId, totalRoundPoints);
    soundEffects.playFanfare();
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-3 sm:p-5 md:p-6 select-none">
      
      {/* Strike Big Flash Overlay */}
      {strikeFlash && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none bg-red-950/60 backdrop-blur-[2px] rounded-[18px]">
          {/* Team Banner if lastStrikeTeamId is set */}
          {lastStrikeTeamId && (
            <div className="px-6 py-2 rounded-2xl bg-black/90 border-2 border-red-500 font-team text-xl sm:text-3xl text-red-100 uppercase tracking-widest shadow-[0_0_30px_#ef4444] mb-4 animate-bounce">
              STRIKE FOR {teams.find((t) => t.id === lastStrikeTeamId)?.name || 'TEAM'}!
            </div>
          )}

          <div className="flex items-center gap-3 sm:gap-6 animate-strike">
            {Array.from({
              length: Math.min(
                lastStrikeTeamId
                  ? teams.find((t) => t.id === lastStrikeTeamId)?.strikes || strikes
                  : strikes,
                3
              ),
            }).map((_, i) => (
              <div
                key={i}
                className="w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl bg-gradient-to-b from-red-600 to-red-900 border-4 border-red-300 shadow-[0_0_50px_#ef4444] flex items-center justify-center"
              >
                <XIcon className="w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 text-white stroke-[3.5] drop-shadow-[0_0_15px_#ffffff]" />
              </div>
            ))}
          </div>

          {(lastStrikeTeamId
            ? (teams.find((t) => t.id === lastStrikeTeamId)?.strikes || strikes) >= 3
            : strikes >= 3) && (
            <div className="px-6 py-2 rounded-full bg-red-600 text-white font-team text-sm sm:text-xl uppercase tracking-wider shadow-[0_0_30px_#ef4444] mt-4 animate-pulse">
              🚨 3 STRIKES! STEAL OPPORTUNITY!
            </div>
          )}
        </div>
      )}

      {/* TOP STATUS BAR: Round Badge, Bank Counter, Row Strikes, & Timer */}
      <div className="flex flex-col gap-2.5 mb-2 sm:mb-4">
        
        <div className="flex items-center justify-between gap-3 px-1">
          {/* Left: Round Title & Multiplier */}
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-900/90 to-blue-950 border border-blue-400/60 font-condensed tracking-wider text-xs sm:text-sm md:text-base text-blue-100 uppercase shadow-md">
              {question.roundTitle}
            </span>
            {question.multiplier > 1 && (
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/30 to-amber-600/30 border border-amber-400 font-bold text-[11px] sm:text-xs text-amber-300 uppercase animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                {question.multiplier}X POINTS
              </span>
            )}
          </div>

          {/* Center: Prominent Family Feud Round Bank Accumulator */}
          <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-amber-950/90 via-black to-amber-950/90 px-4 sm:px-6 py-1 rounded-2xl border-2 border-[#ffd700] shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <span className="font-condensed text-xs sm:text-sm text-amber-300 uppercase tracking-widest font-bold">
              BANK
            </span>
            <span className="font-numbers font-black text-2xl sm:text-3xl md:text-4xl text-[#ffd700] drop-shadow-[0_0_12px_#ffd700] leading-none">
              {totalRoundPoints}
            </span>
          </div>

          {/* Right: Row Strikes & Optional Timer */}
          <div className="flex items-center gap-2">
            {/* Row Strikes Indicators */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {teams.map((t) => {
                const currentStrikes = t.strikes || 0;
                const isThreeStrikes = currentStrikes >= 3;
                const badgeColors = {
                  red: 'border-red-500/80 bg-red-950/60 text-red-200',
                  blue: 'border-blue-500/80 bg-blue-950/60 text-blue-200',
                  green: 'border-emerald-500/80 bg-emerald-950/60 text-emerald-200',
                  purple: 'border-purple-500/80 bg-purple-950/60 text-purple-200',
                }[t.color];

                return (
                  <div
                    key={t.id}
                    onClick={() => onAddStrikeToTeam && onAddStrikeToTeam(t.id)}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border text-[11px] sm:text-xs font-team uppercase flex items-center gap-1 cursor-pointer transition-all hover:scale-105 shadow-sm ${badgeColors}`}
                    title={`Click to add strike to ${t.name}`}
                  >
                    <span className="font-bold tracking-tight">{t.name}:</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((sIndex) => (
                        <span
                          key={sIndex}
                          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded text-[9px] sm:text-[10px] font-black flex items-center justify-center font-mono ${
                            currentStrikes >= sIndex
                              ? 'bg-red-600 text-white shadow-[0_0_6px_#ef4444]'
                              : 'bg-black/60 text-gray-600 border border-white/5'
                          }`}
                        >
                          X
                        </span>
                      ))}
                    </div>
                    {isThreeStrikes && (
                      <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-red-600 text-white font-bold animate-pulse">
                        OUT
                      </span>
                    )}
                  </div>
                );
              })}

              {/* In Host Mode, show strike buzzer button and clear button */}
              {!isPresentationMode && (
                <>
                  <button
                    onClick={handleStrikeClick}
                    className="p-1 rounded-md bg-red-900/60 hover:bg-red-600 border border-red-500/60 text-red-100 transition-all shadow-sm"
                    title="Strike Buzzer [X]"
                  >
                    <XIcon className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  {(strikes > 0 || teams.some((t) => (t.strikes || 0) > 0)) && (
                    <button
                      onClick={onClearStrikes}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                      title="Clear all strikes"
                    >
                      Clear
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Timer Display */}
            {(!isPresentationMode || timerRunning || timerSeconds < 30) && (
              <div className="flex items-center gap-1 bg-black/80 px-2 sm:px-2.5 py-1 rounded-xl border border-blue-500/50 shadow-md">
                {!isPresentationMode && (
                  <button
                    onClick={() => setTimerRunning(!timerRunning)}
                    className="text-blue-300 hover:text-white p-0.5"
                    title={timerRunning ? 'Pause timer' : 'Start timer'}
                  >
                    {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                )}
                <span
                  className={`font-mono font-bold text-base sm:text-lg w-6 text-center ${
                    timerSeconds <= 5 ? 'text-red-400 animate-pulse' : 'text-blue-200'
                  }`}
                >
                  {timerSeconds}
                </span>
                {!isPresentationMode && (
                  <button
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerSeconds(30);
                    }}
                    className="text-gray-400 hover:text-white p-0.5"
                    title="Reset timer to 30s"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Big Authentic Game Show Question Marquee */}
        <div
          onClick={handleRevealNextAnswer}
          className="relative w-full rounded-2xl p-[3px] bg-gradient-to-r from-[#d4af37] via-[#fff4cc] via-50% to-[#996e00] shadow-[0_10px_30px_rgba(0,0,0,0.85)] cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all group select-none"
          title="Click question marquee to reveal next answer"
        >
          <div className="w-full rounded-[13px] bg-gradient-to-b from-[#0f2a63] via-[#08183d] via-50% to-[#03091c] px-4 sm:px-8 py-3.5 sm:py-5 text-center border-2 border-[#25468d] shadow-[inset_0_3px_15px_rgba(0,0,0,0.95)] group-hover:border-amber-400/80 transition-colors relative overflow-hidden">
            {/* Top glass reflection line */}
            <div className="absolute top-0 left-0 right-0 h-[48%] gloss-overlay pointer-events-none" />

            <h2 className="relative font-team font-black text-lg sm:text-2xl md:text-3xl lg:text-4xl text-white uppercase tracking-wider leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] group-hover:text-amber-200 transition-colors px-2">
              "{question.questionText}"
            </h2>
          </div>
        </div>

      </div>

      {/* CENTER: 6 ANSWER SLOTS IN 2 COLUMNS (AUTHENTIC GAME-SHOW GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5 my-1 sm:my-2">
        {/* Left Column: Slots 1, 2, 3 */}
        <div className="flex flex-col gap-2.5 sm:gap-3.5">
          {question.answers.slice(0, 3).map((ans, idx) => (
            <AnswerSlot
              key={ans.id}
              slotNumber={idx + 1}
              answer={ans}
              onReveal={() => handleRevealAnswer(ans.id)}
            />
          ))}
        </div>

        {/* Right Column: Slots 4, 5, 6 */}
        <div className="flex flex-col gap-2.5 sm:gap-3.5">
          {question.answers.slice(3, 6).map((ans, idx) => (
            <AnswerSlot
              key={ans.id}
              slotNumber={idx + 4}
              answer={ans}
              onReveal={() => handleRevealAnswer(ans.id)}
            />
          ))}
        </div>
      </div>

      {/* BOTTOM ACTION BAR: Rendered ONLY in Host Mode, NEVER on Projector Screen */}
      {!isPresentationMode && (
        <div className="mt-2 sm:mt-3 pt-2 border-t border-blue-900/60 flex flex-wrap items-center justify-between gap-2">
          
          {/* Award Points to Team Section */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className="font-condensed text-xs sm:text-sm text-gray-300 uppercase flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Award {totalRoundPoints} pts to:
            </span>
            {teams.map((t) => {
              const colorClasses = {
                red: 'bg-red-700/80 hover:bg-red-600 border-red-400 text-white',
                blue: 'bg-blue-700/80 hover:bg-blue-600 border-blue-400 text-white',
                green: 'bg-emerald-700/80 hover:bg-emerald-600 border-emerald-400 text-white',
                purple: 'bg-purple-700/80 hover:bg-purple-600 border-purple-400 text-white',
              }[t.color];

              return (
                <button
                  key={t.id}
                  onClick={() => handleAwardToTeam(t.id)}
                  disabled={totalRoundPoints <= 0}
                  className={`px-2.5 py-1 rounded-lg border font-team text-xs sm:text-sm uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:scale-105 ${colorClasses}`}
                  title={`Award ${totalRoundPoints} pts to ${t.name}`}
                >
                  + {t.name}
                </button>
              );
            })}
          </div>

          {/* Right side navigation buttons */}
          <div className="flex items-center gap-2">
            {/* Question Switchers */}
            <button
              onClick={() => onSelectQuestion(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="p-1.5 rounded-lg bg-black/60 border border-gray-700 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous Question"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            
            <span className="text-xs font-mono text-gray-400">
              Q {currentQuestionIndex + 1}/{allQuestions.length}
            </span>

            <button
              onClick={() => onSelectQuestion(Math.min(allQuestions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === allQuestions.length - 1}
              className="p-1.5 rounded-lg bg-black/60 border border-gray-700 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next Question"
            >
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Switch back to Leaderboard */}
            <button
              onClick={onSwitchToLeaderboard}
              className="ml-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-team text-xs sm:text-sm uppercase tracking-wide shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all hover:scale-105"
            >
              Leaderboard ➔
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
