import { api, exceptionToErrorMsg } from "./api.ts";
import type { LeaderboardEntry, GameKey, ErrorMsg } from "@gamenite/shared";

export type TimeRange = "overall" | "daily" | "weekly" | "monthly";

/**
 * Get leaderboard for a specific game type
 * @param gameType - The type of game
 * @param page - The page number (1-based, default 1)
 * @param limit - The number of entries per page (default 10)
 * @param timeRange - The time range to filter by (default "overall")
 * @returns Promise resolving to leaderboard data with pagination info or error message
 */
export async function getLeaderboard(
  gameType: GameKey,
  page: number = 1,
  limit: number = 10,
  timeRange: TimeRange = "overall",
): Promise<
  | {
      entries: LeaderboardEntry[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  | ErrorMsg
> {
  try {
    const response = await api.get<
      | {
          entries: LeaderboardEntry[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }
      | ErrorMsg
    >(`/api/leaderboard/${gameType}?page=${page}&limit=${limit}&timeRange=${timeRange}`);
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
