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

/**
 * Get leaderboard entries for a specific game type
 * @param gameType - The type of game to get leaderboard for
 * @returns Array of leaderboard entries sorted by wins (descending)
 */
export async function getLeaderboard(gameType: GameKey): Promise<LeaderboardEntry[]> {
  const allKeys = await LeaderboardRepo.getAllKeys();
  const gameKeys = allKeys.filter((key) => key.endsWith(`:${gameType}`));
  const records = await Promise.all(gameKeys.map((key) => LeaderboardRepo.get(key)));
  const entries = await Promise.all(
    records.map(async (record) => ({
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
  return entries.sort((a, b) => b.wins - a.wins);
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
