import { api, exceptionToErrorMsg } from "./api.ts";
import type { LeaderboardEntry, GameKey, ErrorMsg } from "@gamenite/shared";

/**
 * Get leaderboard for a specific game type
 * @param gameType - The type of game
 * @returns Promise resolving to leaderboard entries or error message
 */
export async function getLeaderboard(gameType: GameKey): Promise<LeaderboardEntry[] | ErrorMsg> {
  try {
    const response = await api.get<LeaderboardEntry[] | ErrorMsg>(`/api/leaderboard/${gameType}`);
    return response.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
}

/**
 * Get leaderboard stats for a specific user and game type
 * @param username - The username
 * @param gameType - The game type
 * @returns Promise resolving to leaderboard entry, null, or error message
 */
export async function getUserLeaderboard(
  username: string,
  gameType: GameKey,
): Promise<LeaderboardEntry | null | ErrorMsg> {
  try {
    const response = await api.get<LeaderboardEntry | null | ErrorMsg>(
      `/api/leaderboard/user/${username}/${gameType}`,
    );
    return response.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
}
