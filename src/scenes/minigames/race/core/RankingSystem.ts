// src/scenes/minigames/race/core/RankingSystem.ts - Pure, deterministic race ranking and standings ladder
export interface StandingEntry {
  kartId: string;
  rank: number; // 1 to 8
  lap: number;
  gateIndex: number;
  progressScore: number;
  finished: boolean;
  finishTimeMs?: number;
  gapToLeaderSec: number;
  gapToAheadSec: number;
  points: number;
}

export class RankingSystem {
  static readonly POINTS_TABLE = [15, 12, 10, 8, 6, 4, 2, 1]; // Mario Kart style points

  private participants: Map<
    string,
    {
      kartId: string;
      lap: number;
      gateIndex: number;
      distAlongSpline: number;
      finished: boolean;
      finishTimeMs?: number;
      progressScore: number;
    }
  > = new Map();

  private cachedStandings: StandingEntry[] = [];

  registerKart(kartId: string): void {
    this.participants.set(kartId, {
      kartId,
      lap: 1,
      gateIndex: 0,
      distAlongSpline: 0,
      finished: false,
      progressScore: 0
    });
  }

  updateKartProgress(
    kartId: string,
    lap: number,
    gateIndex: number,
    distAlongSpline: number,
    finished: boolean,
    finishTimeMs?: number
  ): void {
    const entry = this.participants.get(kartId);
    if (!entry) return;

    entry.lap = lap;
    entry.gateIndex = gateIndex;
    entry.distAlongSpline = distAlongSpline;
    entry.finished = finished;
    if (finished && finishTimeMs !== undefined) {
      entry.finishTimeMs = finishTimeMs;
    }

    // Monotonic continuous progress score calculation:
    // If finished: higher score for lower finish time
    // If racing: lap * 1,000,000 + gateIndex * 10,000 + distAlongSpline
    if (entry.finished && entry.finishTimeMs !== undefined) {
      entry.progressScore = 100_000_000 - entry.finishTimeMs;
    } else {
      entry.progressScore =
        lap * 1_000_000 + gateIndex * 10_000 + Math.max(0, distAlongSpline % 10_000);
    }
  }

  updateStandings(): StandingEntry[] {
    const sorted = Array.from(this.participants.values()).sort(
      (a, b) => b.progressScore - a.progressScore
    );

    const leaderScore = sorted[0]?.progressScore || 0;
    const avgMetersPerSec = 25.0; // Reference conversion for display gaps

    this.cachedStandings = sorted.map((p, index) => {
      const rank = index + 1;
      const points = RankingSystem.POINTS_TABLE[index] || 0;

      let gapToLeaderSec = 0;
      let gapToAheadSec = 0;

      if (index > 0) {
        const prev = sorted[index - 1];
        if (p.finished && prev.finished && p.finishTimeMs && prev.finishTimeMs) {
          gapToLeaderSec = (p.finishTimeMs - (sorted[0].finishTimeMs || 0)) / 1000;
          gapToAheadSec = (p.finishTimeMs - prev.finishTimeMs) / 1000;
        } else {
          const scoreDiffLeader = leaderScore - p.progressScore;
          const scoreDiffAhead = prev.progressScore - p.progressScore;
          gapToLeaderSec = Math.max(0, scoreDiffLeader / avgMetersPerSec);
          gapToAheadSec = Math.max(0, scoreDiffAhead / avgMetersPerSec);
        }
      }

      return {
        kartId: p.kartId,
        rank,
        lap: p.lap,
        gateIndex: p.gateIndex,
        progressScore: p.progressScore,
        finished: p.finished,
        finishTimeMs: p.finishTimeMs,
        gapToLeaderSec: Number(gapToLeaderSec.toFixed(2)),
        gapToAheadSec: Number(gapToAheadSec.toFixed(2)),
        points
      };
    });

    return this.cachedStandings;
  }

  getStandings(): ReadonlyArray<StandingEntry> {
    return this.cachedStandings;
  }

  getKartRank(kartId: string): number {
    const entry = this.cachedStandings.find((s) => s.kartId === kartId);
    return entry ? entry.rank : this.participants.size;
  }

  static getPointsForRank(rank: number): number {
    return RankingSystem.POINTS_TABLE[rank - 1] || 0;
  }
}
