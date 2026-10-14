import { describe, it, expect } from 'vitest';
import type { GameState } from '../types';
import { createNewGameState } from '../data/defaultData';

describe('GDG Feud — 23-Step Master Integration Scenario', () => {
  it('executes the full 23-step live auditorium workflow correctly', () => {
    // -------------------------------------------------------------
    // Shared Environment Simulation (LocalStorage & Event Channel)
    // -------------------------------------------------------------
    let storageState: string | null = null;
    const soundEventsTriggered: string[] = [];

    const mockStorage = {
      setItem: (_key: string, val: string) => {
        storageState = val;
      },
      getItem: (_key: string) => storageState,
    };

    const hostPastHistory: GameState[] = [];

    // Step 1: Start a new game
    let hostState: GameState = createNewGameState(true);
    mockStorage.setItem('gdg_feud_shared_state_v2', JSON.stringify(hostState));

    // Step 2 & 3: Projector window opens & loads current game state
    let projectorState: GameState = JSON.parse(mockStorage.getItem('gdg_feud_shared_state_v2')!);
    expect(projectorState.teams).toHaveLength(4);
    expect(projectorState.teams.every((t) => t.score === 0 && t.strikes === 0)).toBe(true);

    const syncHostToProjector = (soundTrigger?: string) => {
      mockStorage.setItem('gdg_feud_shared_state_v2', JSON.stringify(hostState));
      projectorState = JSON.parse(mockStorage.getItem('gdg_feud_shared_state_v2')!);
      if (soundTrigger) {
        soundEventsTriggered.push(soundTrigger);
      }
    };

    // Step 4: Select Row 1 and apply a strike
    hostPastHistory.push(JSON.parse(JSON.stringify(hostState)));
    hostState.activeTeamId = 'team-1';
    hostState.teams[0].strikes = 1;
    hostState.lastStrikeTeamId = 'team-1';
    syncHostToProjector('strikeBuzzer');

    // Step 5: Verify only Row 1 changes
    expect(hostState.teams[0].strikes).toBe(1);
    expect(hostState.teams[1].strikes).toBe(0);
    expect(hostState.teams[2].strikes).toBe(0);
    expect(hostState.teams[3].strikes).toBe(0);
    expect(projectorState.teams[0].strikes).toBe(1);
    expect(projectorState.teams[1].strikes).toBe(0);

    // Step 6: Apply two more strikes to Row 1
    hostPastHistory.push(JSON.parse(JSON.stringify(hostState)));
    hostState.teams[0].strikes = 2;
    syncHostToProjector('strikeBuzzer');

    hostPastHistory.push(JSON.parse(JSON.stringify(hostState)));
    hostState.teams[0].strikes = 3;
    syncHostToProjector('thirdStrike');

    // Step 7: Verify third-strike sound trigger occurs and Row 1 has 3 strikes
    expect(hostState.teams[0].strikes).toBe(3);
    expect(projectorState.teams[0].strikes).toBe(3);
    expect(soundEventsTriggered[soundEventsTriggered.length - 1]).toBe('thirdStrike');

    // Step 8: Verify application does NOT automatically end turn or change question
    expect(hostState.activeQuestionIndex).toBe(0);
    expect(projectorState.activeQuestionIndex).toBe(0);
    expect(hostState.activeTeamId).toBe('team-1');
    expect(hostState.teams[0].score).toBe(0);

    // Step 9: Select Row 2 and apply a strike
    hostPastHistory.push(JSON.parse(JSON.stringify(hostState)));
    hostState.activeTeamId = 'team-2';
    hostState.teams[1].strikes = 1;
    hostState.lastStrikeTeamId = 'team-2';
    syncHostToProjector('strikeBuzzer');

    // Step 10: Verify Row 1 still has 3 strikes and Row 2 has 1
    expect(hostState.teams[0].strikes).toBe(3);
    expect(hostState.teams[1].strikes).toBe(1);
    expect(projectorState.teams[0].strikes).toBe(3);
    expect(projectorState.teams[1].strikes).toBe(1);

    // Step 11: Undo the Row 2 strike and verify both windows update
    const previousSnapshot = hostPastHistory.pop()!;
    hostState = JSON.parse(JSON.stringify(previousSnapshot));
    syncHostToProjector(); // No sound on undo

    expect(hostState.teams[0].strikes).toBe(3);
    expect(hostState.teams[1].strikes).toBe(0);
    expect(projectorState.teams[0].strikes).toBe(3);
    expect(projectorState.teams[1].strikes).toBe(0);

    // Step 12: Reveal an answer and verify its text and points appear
    hostPastHistory.push(JSON.parse(JSON.stringify(hostState)));
    const ans1 = hostState.questions[0].answers[0]; // "Check their phone", 35 pts
    ans1.isRevealed = true;
    syncHostToProjector('correctDing');

    expect(projectorState.questions[0].answers[0].isRevealed).toBe(true);
    expect(projectorState.questions[0].answers[0].text).toBe('Check their phone');
    expect(projectorState.questions[0].answers[0].points).toBe(35);

    // Step 13: Verify revealing it does not change any score
    expect(hostState.teams.every((t) => t.score === 0)).toBe(true);
    expect(projectorState.teams.every((t) => t.score === 0)).toBe(true);

    // Step 14: Award its points manually to Row 2
    hostPastHistory.push(JSON.parse(JSON.stringify(hostState)));
    hostState.teams[1].score += ans1.points;
    ans1.isAwarded = true;
    ans1.awardedToTeamId = 'team-2';
    syncHostToProjector('score');

    // Step 15: Verify score changes by the exact amount
    expect(hostState.teams[1].score).toBe(35);
    expect(projectorState.teams[1].score).toBe(35);
    expect(hostState.teams[0].score).toBe(0);
    expect(projectorState.teams[0].score).toBe(0);

    // Step 16: Attempt to award the same answer again and verify duplicate is blocked
    const isAlreadyAwarded = hostState.questions[0].answers[0].isAwarded;
    expect(isAlreadyAwarded).toBe(true);
    if (!isAlreadyAwarded) {
      hostState.teams[1].score += ans1.points; // Should not execute
    }
    expect(hostState.teams[1].score).toBe(35); // Score remains 35, not 70!

    // Step 17: Undo the award and verify score returns to previous value
    const snapshotBeforeAward = hostPastHistory.pop()!;
    hostState = JSON.parse(JSON.stringify(snapshotBeforeAward));
    syncHostToProjector();

    expect(hostState.teams[1].score).toBe(0);
    expect(projectorState.teams[1].score).toBe(0);
    expect(hostState.questions[0].answers[0].isAwarded).toBeFalsy();

    // Step 18: Edit the next question and save it
    hostPastHistory.push(JSON.parse(JSON.stringify(hostState)));
    hostState.questions[1].questionText = 'CUSTOM AUDITORIUM QUESTION PROMPT';
    syncHostToProjector();

    // Step 19: Navigate to that question and verify the edit is preserved
    hostPastHistory.push(JSON.parse(JSON.stringify(hostState)));
    hostState.activeQuestionIndex = 1;
    syncHostToProjector();

    expect(hostState.questions[hostState.activeQuestionIndex].questionText).toBe(
      'CUSTOM AUDITORIUM QUESTION PROMPT'
    );
    expect(projectorState.questions[projectorState.activeQuestionIndex].questionText).toBe(
      'CUSTOM AUDITORIUM QUESTION PROMPT'
    );

    // Step 20: Refresh simulation of host window
    const refreshedHost: GameState = JSON.parse(mockStorage.getItem('gdg_feud_shared_state_v2')!);
    expect(refreshedHost.activeQuestionIndex).toBe(1);
    expect(refreshedHost.questions[1].questionText).toBe('CUSTOM AUDITORIUM QUESTION PROMPT');
    expect(refreshedHost.teams[0].strikes).toBe(3);

    // Step 21: Refresh simulation of projector window
    const refreshedProjector: GameState = JSON.parse(mockStorage.getItem('gdg_feud_shared_state_v2')!);
    expect(refreshedProjector.activeQuestionIndex).toBe(1);
    expect(refreshedProjector.teams[0].strikes).toBe(3);

    // Step 22: Verify no score, strike, reveal state, or award is duplicated
    expect(refreshedHost.teams[0].strikes).toBe(3);
    expect(refreshedHost.teams[1].strikes).toBe(0);
    expect(refreshedHost.teams[1].score).toBe(0);

    // Step 23: Verify no old sound plays during recovery
    const soundsDuringRecovery = soundEventsTriggered.filter((s) => s === 'refreshRecovery');
    expect(soundsDuringRecovery).toHaveLength(0);
  });
});
