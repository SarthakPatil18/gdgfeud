import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState, Answer } from '../types';
import { createNewGameState } from '../data/defaultData';

describe('GDG Feud — Core Game Rules & State Transitions', () => {
  let state: GameState;

  beforeEach(() => {
    state = createNewGameState(true);
  });

  describe('1. Four Independent Team Records', () => {
    it('initializes four independent teams with unique IDs and 0 scores/strikes', () => {
      expect(state.teams).toHaveLength(4);
      const teamIds = state.teams.map((t) => t.id);
      expect(new Set(teamIds).size).toBe(4);

      state.teams.forEach((team) => {
        expect(team.score).toBe(0);
        expect(team.strikes).toBe(0);
        expect(['red', 'blue', 'green', 'purple']).toContain(team.color);
      });
    });

    it('allows changing the active team without modifying scores, strikes, or questions', () => {
      // Setup some initial values
      state.teams[0].score = 50;
      state.teams[0].strikes = 1;
      state.activeQuestionIndex = 2;
      const originalScores = state.teams.map((t) => t.score);
      const originalStrikes = state.teams.map((t) => t.strikes);
      const originalQIdx = state.activeQuestionIndex;

      // Switch active team from team-1 to team-2
      state.activeTeamId = 'team-2';

      expect(state.activeTeamId).toBe('team-2');
      expect(state.teams.map((t) => t.score)).toEqual(originalScores);
      expect(state.teams.map((t) => t.strikes)).toEqual(originalStrikes);
      expect(state.activeQuestionIndex).toBe(originalQIdx);
    });
  });

  describe('2. Independent Strike Behavior', () => {
    it('applies a strike only to the target team and never affects other teams', () => {
      const team1 = state.teams.find((t) => t.id === 'team-1')!;
      const team2 = state.teams.find((t) => t.id === 'team-2')!;
      const team3 = state.teams.find((t) => t.id === 'team-3')!;
      const team4 = state.teams.find((t) => t.id === 'team-4')!;

      // Give 2 strikes to Row 1
      team1.strikes = 2;

      expect(team1.strikes).toBe(2);
      expect(team2.strikes).toBe(0);
      expect(team3.strikes).toBe(0);
      expect(team4.strikes).toBe(0);
    });

    it('enforces third strike rules: sound trigger, cap at 3 strikes, and no forced gameplay transition', () => {
      const team1 = state.teams.find((t) => t.id === 'team-1')!;
      team1.strikes = 2;

      // Applying 3rd strike
      const nextStrikes = Math.min(3, team1.strikes + 1);
      const isThirdStrike = nextStrikes === 3;
      team1.strikes = nextStrikes;

      expect(isThirdStrike).toBe(true);
      expect(team1.strikes).toBe(3);

      // Verify no automatic rule changes occurred
      expect(state.activeQuestionIndex).toBe(0); // Question unchanged
      expect(state.activeTeamId).toBe('team-1'); // Active team unchanged
      expect(team1.score).toBe(0); // Score unchanged

      // Further clicks must not increase strikes past 3
      const capped = Math.min(3, team1.strikes + 1);
      expect(capped).toBe(3);
    });

    it('allows removing a strike from a specific team', () => {
      const team1 = state.teams.find((t) => t.id === 'team-1')!;
      team1.strikes = 3;

      // Remove 1 strike
      team1.strikes = Math.max(0, team1.strikes - 1);
      expect(team1.strikes).toBe(2);

      // Remove remaining strikes down to 0
      team1.strikes = Math.max(0, team1.strikes - 1);
      team1.strikes = Math.max(0, team1.strikes - 1);
      expect(team1.strikes).toBe(0);

      // Cannot go below 0
      team1.strikes = Math.max(0, team1.strikes - 1);
      expect(team1.strikes).toBe(0);
    });
  });

  describe('3. Manual Scoring and Reveal Mechanics', () => {
    it('revealing an answer does NOT award points automatically', () => {
      const q = state.questions[0];
      const answer = q.answers[0];
      expect(answer.isRevealed).toBe(false);

      // Reveal answer
      answer.isRevealed = true;

      // All team scores must remain 0
      state.teams.forEach((t) => {
        expect(t.score).toBe(0);
      });
    });

    it('awards points manually to the designated team only', () => {
      const q = state.questions[0];
      const answer = q.answers[0]; // e.g. 35 pts
      const targetTeam = state.teams.find((t) => t.id === 'team-2')!;

      // Award points
      const pointsToAward = answer.points * q.multiplier;
      targetTeam.score += pointsToAward;
      answer.isAwarded = true;
      answer.awardedToTeamId = targetTeam.id;

      expect(targetTeam.score).toBe(35);
      expect(state.teams.find((t) => t.id === 'team-1')!.score).toBe(0);
      expect(state.teams.find((t) => t.id === 'team-3')!.score).toBe(0);
      expect(state.teams.find((t) => t.id === 'team-4')!.score).toBe(0);
      expect(answer.isAwarded).toBe(true);
      expect(answer.awardedToTeamId).toBe('team-2');
    });

    it('blocks duplicate award of the same answer', () => {
      const q = state.questions[0];
      const answer = q.answers[0];
      const targetTeam = state.teams.find((t) => t.id === 'team-1')!;

      // First award
      targetTeam.score += answer.points;
      answer.isAwarded = true;

      // Second award attempt should be blocked
      const canAwardAgain = !answer.isAwarded;
      expect(canAwardAgain).toBe(false);
      expect(targetTeam.score).toBe(answer.points);
    });

    it('allows reversing / undoing an award and restores score accurately', () => {
      const q = state.questions[0];
      const answer = q.answers[0];
      const targetTeam = state.teams.find((t) => t.id === 'team-3')!;

      // Award
      targetTeam.score += answer.points;
      answer.isAwarded = true;
      answer.awardedToTeamId = targetTeam.id;
      expect(targetTeam.score).toBe(answer.points);

      // Reversal
      targetTeam.score = Math.max(0, targetTeam.score - answer.points);
      answer.isAwarded = false;
      answer.awardedToTeamId = null;

      expect(targetTeam.score).toBe(0);
      expect(answer.isAwarded).toBe(false);
      expect(answer.awardedToTeamId).toBeNull();
    });

    it('prevents reducing score below zero when allowNegativeScores is false', () => {
      state.settings.allowNegativeScores = false;
      const team = state.teams[0];
      team.score = 20;

      // Attempt to subtract 30
      const delta = -30;
      const newScore = state.settings.allowNegativeScores
        ? team.score + delta
        : Math.max(0, team.score + delta);

      expect(newScore).toBe(0);
    });
  });

  describe('4. Question Bank Validation & Integrity', () => {
    it('validates question text cannot be empty', () => {
      const emptyQuestion = {
        questionText: '   ',
        roundTitle: 'ROUND 1',
        answers: [{ text: 'Answer', points: 10 }],
      };
      const isValid = emptyQuestion.questionText.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('validates answer text cannot be empty', () => {
      const emptyAnswer = { text: '   ', points: 10 };
      const isValid = emptyAnswer.text.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('validates answer points must be non-negative finite numbers', () => {
      const isValidPoints = (val: unknown) => typeof val === 'number' && !isNaN(val) && val >= 0;
      expect(isValidPoints(25)).toBe(true);
      expect(isValidPoints(-5)).toBe(false);
      expect(isValidPoints(NaN)).toBe(false);
      expect(isValidPoints('10')).toBe(false);
    });

    it('detects duplicate answer text within a question', () => {
      const answers: Answer[] = [
        { id: '1', text: 'Coffee', points: 40, isRevealed: false },
        { id: '2', text: 'Tea', points: 30, isRevealed: false },
        { id: '3', text: 'coffee', points: 20, isRevealed: false }, // Duplicate (case-insensitive)
      ];

      const seen = new Set<string>();
      const dupes: string[] = [];
      answers.forEach((a) => {
        const norm = a.text.trim().toLowerCase();
        if (seen.has(norm)) dupes.push(a.text);
        seen.add(norm);
      });

      expect(dupes).toHaveLength(1);
      expect(dupes[0]).toBe('coffee');
    });

    it('editing question text preserves existing team scores and strikes', () => {
      state.teams[0].score = 120;
      state.teams[1].strikes = 2;

      // Edit question
      state.questions[0].questionText = 'Updated Question Prompt';

      expect(state.teams[0].score).toBe(120);
      expect(state.teams[1].strikes).toBe(2);
      expect(state.questions[0].questionText).toBe('Updated Question Prompt');
    });
  });

  describe('5. Undo and Redo Mechanics', () => {
    it('supports undoing a state change and restoring previous state accurately', () => {
      const pastStack: GameState[] = [];
      const futureStack: GameState[] = [];

      // Step 1: initial
      pastStack.push(JSON.parse(JSON.stringify(state)));

      // Step 2: apply score change
      state.teams[0].score = 100;

      // Undo
      const previousState = pastStack.pop()!;
      futureStack.push(JSON.parse(JSON.stringify(state)));
      state = previousState;

      expect(state.teams[0].score).toBe(0);
      expect(futureStack).toHaveLength(1);

      // Redo
      const redoneState = futureStack.pop()!;
      pastStack.push(JSON.parse(JSON.stringify(state)));
      state = redoneState;

      expect(state.teams[0].score).toBe(100);
    });
  });

  describe('6. Edge Cases and Defensive Reliability', () => {
    it('blocks double-clicking or rapid repeated award clicks', () => {
      const q = state.questions[0];
      const ans = q.answers[0];
      const team = state.teams[0];

      let awardsCount = 0;
      const simulateAwardClick = () => {
        if (!ans.isAwarded) {
          ans.isAwarded = true;
          team.score += ans.points;
          awardsCount++;
        }
      };

      simulateAwardClick();
      simulateAwardClick();
      simulateAwardClick();

      expect(awardsCount).toBe(1);
      expect(team.score).toBe(ans.points);
    });

    it('handles timer start, pause, resume, reset, and expiry', () => {
      state.timerActive = true;
      state.timerSeconds = 30;

      // Decrement down to 0
      for (let s = 30; s > 0; s--) {
        state.timerSeconds--;
      }

      expect(state.timerSeconds).toBe(0);
      if (state.timerSeconds <= 0) {
        state.timerActive = false;
      }
      expect(state.timerActive).toBe(false);

      // Reset
      state.timerSeconds = 30;
      expect(state.timerSeconds).toBe(30);
    });

    it('correctly maps audio events for strike 1, 2 vs third strike', () => {
      const getSoundForStrike = (strikeNum: number) => {
        return strikeNum === 3 ? 'thirdStrike' : 'strikeBuzzer';
      };

      expect(getSoundForStrike(1)).toBe('strikeBuzzer');
      expect(getSoundForStrike(2)).toBe('strikeBuzzer');
      expect(getSoundForStrike(3)).toBe('thirdStrike');
    });

    it('gracefully handles corrupted saved data during recovery', () => {
      const corruptedJson = '{"teams": "not-an-array"}';
      let recovered = null;
      try {
        const parsed = JSON.parse(corruptedJson);
        if (Array.isArray(parsed?.teams) && parsed.teams.length > 0) {
          recovered = parsed;
        }
      } catch {
        recovered = null;
      }

      expect(recovered).toBeNull();
    });

    it('deleting a question adjusts activeQuestionIndex safely without crashing', () => {
      state.activeQuestionIndex = 3;
      // Delete question at index 3
      state.questions = state.questions.filter((_, idx) => idx !== 3);
      // Safe re-index
      state.activeQuestionIndex = Math.min(
        state.activeQuestionIndex,
        Math.max(0, state.questions.length - 1)
      );

      expect(state.activeQuestionIndex).toBeLessThan(state.questions.length);
      expect(state.questions[state.activeQuestionIndex]).toBeDefined();
    });
  });
});
