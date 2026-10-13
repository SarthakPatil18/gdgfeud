import React, { useMemo } from 'react';
import type { RankedTeam, Team } from '../types';
import { TeamScoreRow } from './TeamScoreRow';

interface LeaderboardViewProps {
  teams: Team[];
  onUpdateTeamName: (teamId: string, newName: string) => void;
  onAdjustScore: (teamId: string, delta: number) => void;
  isPresentationMode: boolean;
  autoSort: boolean;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  teams,
  onUpdateTeamName,
  onAdjustScore,
  isPresentationMode,
  autoSort,
}) => {
  // Compute rankings
  const rankedTeams: RankedTeam[] = useMemo(() => {
    // Sort descending by score
    const sorted = [...teams].sort((a, b) => b.score - a.score);

    // Calculate actual ranks (handling ties)
    const ranked: RankedTeam[] = [];
    let currentRank = 1;

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].score < sorted[i - 1].score) {
        currentRank = i + 1;
      }
      const isTied = (i > 0 && sorted[i].score === sorted[i - 1].score) ||
                     (i < sorted.length - 1 && sorted[i].score === sorted[i + 1].score);

      ranked.push({
        ...sorted[i],
        currentRank,
        isTied,
      });
    }

    if (!autoSort) {
      // Keep original team order (ROW 1, ROW 2, ROW 3, ROW 4) but show their currentRank!
      return teams.map((team) => {
        const found = ranked.find((r) => r.id === team.id);
        return {
          ...team,
          currentRank: found ? found.currentRank : team.initialRank,
          isTied: found ? found.isTied : false,
        };
      });
    }

    return ranked;
  }, [teams, autoSort]);

  return (
    <div className="w-full h-full flex flex-col justify-between py-5 sm:py-6 md:py-8 px-4 sm:px-6 md:px-10 gap-3 sm:gap-4 md:gap-5">
      {rankedTeams.map((team) => (
        <TeamScoreRow
          key={team.id}
          rank={team.currentRank}
          teamName={team.name}
          score={team.score}
          color={team.color}
          strikes={team.strikes || 0}
          isFirstPlace={team.currentRank === 1}
          onEditName={(newName) => onUpdateTeamName(team.id, newName)}
          onScoreAdjust={(delta) => onAdjustScore(team.id, delta)}
          isPresentationMode={isPresentationMode}
        />
      ))}
    </div>
  );
};
