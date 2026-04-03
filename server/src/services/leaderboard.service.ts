import { type GameKey, type LeaderboardEntry } from "@gamenite/shared";
import { LeaderboardRepo } from "../repository.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import { type LeaderboardRecord } from "../models.ts";

/**
 * Create a composite key for leaderboard entries
 */
function makeKey(userId: string, gameType: GameKey): string {
  return `${userId}:${gameType}`;
}

export type TimeRange = "overall" | "daily" | "weekly" | "monthly";

/**
 * Returns the cutoff Date for a given time range.
 * Records with lastUpdated before this date are excluded.
 * Returns null for "overall" (no cutoff).
 */
function getTimeRangeCutoff(timeRange: TimeRange): Date | null {
  const now = new Date();
  switch (timeRange) {
    case "daily": {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 1);
      return cutoff;
    }
    case "weekly": {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      return cutoff;
    }
    case "monthly": {
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 1);
      return cutoff;
    }
    case "overall":
    default:
      return null;
  }
}

/**
 * Get leaderboard entries for a specific game type with pagination and time range filter
 * @param gameType - The type of game to get leaderboard for
 * @param page - The page number (1-based)
 * @param limit - The number of entries per page
 * @param timeRange - The time range to filter by (overall, daily, weekly, monthly)
 * @returns Object containing paginated leaderboard entries and metadata
 */
export async function getLeaderboard(
  gameType: GameKey,
  page: number = 1,
  limit: number = 10,
  timeRange: TimeRange = "overall",
): Promise<{
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const allKeys = await LeaderboardRepo.getAllKeys();
  const gameKeys = allKeys.filter((key) => key.endsWith(`:${gameType}`));
  const records = await Promise.all(gameKeys.map((key) => LeaderboardRepo.get(key)));

  // Apply time range filter
  const cutoff = getTimeRangeCutoff(timeRange);
  const filteredRecords = cutoff
    ? records.filter((record) => new Date(record.lastUpdated) >= cutoff)
    : records;

  const entries = await Promise.all(
    filteredRecords.map(async (record) => ({
      user: await populateSafeUserInfo(record.userId),
      gameType: record.gameType,
      wins: record.wins,
      losses: record.losses,
      gamesPlayed: record.gamesPlayed,
      currentStreak: record.currentStreak,
      longestStreak: record.longestStreak,
      lastUpdated: record.lastUpdated,
    })),
  );

  const sortedEntries = entries.sort((a, b) => b.wins - a.wins);
  const total = sortedEntries.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedEntries = sortedEntries.slice(startIndex, endIndex);

  return {
    entries: paginatedEntries,
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Update leaderboard stats for a user after a game
 * @param userId - The user who played the game
 * @param gameType - The type of game played
 * @param won - Whether the user won the game
 */
export async function updateLeaderboard(
  userId: string,
  gameType: GameKey,
  won: boolean,
): Promise<void> {
  const key = makeKey(userId, gameType);
  const existing = await LeaderboardRepo.find(key);

  const now = new Date().toISOString();
  let record: LeaderboardRecord;

  if (existing) {
    record = { ...existing };
    record.gamesPlayed += 1;
    if (won) {
      record.wins += 1;
      record.currentStreak += 1;
      if (record.currentStreak > record.longestStreak) {
        record.longestStreak = record.currentStreak;
      }
    } else {
      record.losses += 1;
      record.currentStreak = 0;
    }
    record.lastUpdated = now;
  } else {
    record = {
      userId,
      gameType,
      wins: won ? 1 : 0,
      losses: won ? 0 : 1,
      gamesPlayed: 1,
      currentStreak: won ? 1 : 0,
      longestStreak: won ? 1 : 0,
      lastUpdated: now,
    };
  }

  await LeaderboardRepo.set(key, record);
}

/**
 * Get leaderboard stats for a specific user and game type
 * @param userId - The user ID
 * @param gameType - The game type
 * @returns The leaderboard entry or null if not found
 */
export async function getUserLeaderboard(
  userId: string,
  gameType: GameKey,
): Promise<LeaderboardEntry | null> {
  const key = makeKey(userId, gameType);
  const record = await LeaderboardRepo.find(key);
  if (!record) return null;
  return {
    user: await populateSafeUserInfo(record.userId),
    gameType: record.gameType,
    wins: record.wins,
    losses: record.losses,
    gamesPlayed: record.gamesPlayed,
    currentStreak: record.currentStreak,
    longestStreak: record.longestStreak,
    lastUpdated: record.lastUpdated,
  };
}
