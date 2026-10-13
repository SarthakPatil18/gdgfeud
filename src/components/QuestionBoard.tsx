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
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none bg-red-950/50 backdrop-blur-[2px] rounded-[18px]">
          {/* Team Banner if lastStrikeTeamId is set */}
          {lastStrikeTeamId && (
            <div className="px-6 py-2 rounded-2xl bg-black/85 border-2 border-red-500 font-team text-xl sm:text-3xl text-red-100 uppercase tracking-widest shadow-[0_0_30px_#ef4444] mb-4 animate-bounce">
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

      {/* TOP BAR: Round Badge, Question Text & Round Points Bank */}
      <div className="flex flex-col gap-2 mb-2 sm:mb-3">
        
        {/* Upper metadata row */}
        <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
          {/* Round Title & Multiplier */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-900/80 border border-blue-400/60 font-condensed tracking-wider text-sm sm:text-base text-blue-200 uppercase">
              {question.roundTitle}
            </span>
            {question.multiplier > 1 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/30 border border-amber-400 font-bold text-xs sm:text-sm text-amber-300 uppercase animate-pulse">
                {question.multiplier}X POINTS
              </span>
            )}
          </div>

          {/* Row Strikes Indicators */}
          <div className="flex items-center gap-1.5 flex-wrap">
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
                  className={`px-2 py-0.5 rounded-lg border text-xs font-team uppercase flex items-center gap-1 cursor-pointer transition-all hover:scale-105 shadow-sm ${badgeColors}`}
                  title={`Click to add strike to ${t.name}`}
                >
                  <span className="font-bold">{t.name}:</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3].map((sIndex) => (
                      <span
                        key={sIndex}
                        className={`w-3.5 h-3.5 rounded text-[10px] font-black flex items-center justify-center font-mono ${
                          currentStrikes >= sIndex
                            ? 'bg-red-600 text-white shadow-[0_0_6px_#ef4444]'
                            : 'bg-black/50 text-gray-600'
                        }`}
                      >
                        X
                      </span>
                    ))}
                  </div>
                  {isThreeStrikes && (
                    <span className="text-[9px] px-1 rounded bg-red-600 text-white font-bold animate-pulse">
                      OUT
                    </span>
                  )}
                </div>
              );
            })}

            {/* Quick General Strike Buzzer & Reset */}
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
          </div>

          {/* Round Points Bank */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-950/80 to-black/80 px-3 sm:px-4 py-1 rounded-xl border border-amber-400/70 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <span className="font-condensed text-xs sm:text-sm text-amber-300/80 uppercase">
              Round Bank
            </span>
            <span className="font-numbers font-bold text-2xl sm:text-3xl text-[#ffd700] drop-shadow-[0_0_8px_#ffd700]">
              {totalRoundPoints}
            </span>
          </div>

          {/* Timer Widget */}
          <div className="flex items-center gap-1.5 bg-black/70 px-2 sm:px-3 py-1 rounded-xl border border-blue-500/50">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="text-blue-300 hover:text-white p-1"
              title={timerRunning ? 'Pause timer' : 'Start timer'}
            >
              {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <span
              className={`font-mono font-bold text-lg sm:text-xl w-7 text-center ${
                timerSeconds <= 5 ? 'text-red-400 animate-pulse' : 'text-blue-300'
              }`}
            >
              {timerSeconds}
            </span>
            <button
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(30);
              }}
              className="text-gray-400 hover:text-white p-1"
              title="Reset timer to 30s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Large Main Question Banner - Click to reveal answer */}
        <div
          onClick={handleRevealNextAnswer}
          className="relative w-full rounded-xl p-[2px] bg-gradient-to-r from-[#d4af37] via-[#fff4cc] to-[#996e00] shadow-[0_4px_12px_rgba(0,0,0,0.8)] cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all group select-none"
          title="Click question to reveal the next answer"
        >
          <div className="w-full rounded-[10px] bg-gradient-to-b from-[#091b40] via-[#051029] to-[#020614] px-4 py-2.5 sm:py-3.5 text-center border border-[#1e3a8a] shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] group-hover:border-amber-400/80 transition-colors">
            <h2 className="font-team text-lg sm:text-2xl md:text-3xl text-white uppercase tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:text-amber-200 transition-colors">
              "{question.questionText}"
            </h2>
            <div className="text-[10px] sm:text-xs text-amber-300/80 font-sans mt-0.5 flex items-center justify-center gap-1.5">
              <span>✦ Click question to reveal answer</span>
              <span className="text-gray-400">
                ({question.answers.filter((a) => a.isRevealed).length}/{question.answers.length} revealed)
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* CENTER: 6 ANSWER SLOTS IN 2 COLUMNS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 my-1">
        {/* Left Column: Slots 1, 2, 3 */}
        <div className="flex flex-col gap-2 sm:gap-3">
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
        <div className="flex flex-col gap-2 sm:gap-3">
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

      {/* BOTTOM ACTION BAR: Award Points to Teams & Navigation */}
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

    </div>
  );
};
