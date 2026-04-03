import { type LeaderboardEntry, type GameKey } from "@gamenite/shared";
import {
  getLeaderboard,
  getUserLeaderboard,
  type TimeRange,
} from "../services/leaderboard.service.ts";
import { type RestAPI } from "../types.ts";
import { getUserByUsername } from "../services/auth.service.ts";

const VALID_GAME_TYPES = ["nim", "guess", "connect4", "battleship", "checkers"];
const VALID_TIME_RANGES: TimeRange[] = ["overall", "daily", "weekly", "monthly"];

/**
 * Get leaderboard for a specific game type
 * Supports query params: page, limit, timeRange
 */
export const getByGameType: RestAPI<
  {
    entries: LeaderboardEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  },
  { gameType: GameKey }
> = async (req, res) => {
  const gameType = req.params.gameType;
  if (!VALID_GAME_TYPES.includes(gameType)) {
    res.status(400).send({ error: "Invalid game type" });
    return;
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const rawTimeRange = req.query.timeRange as string;
  const timeRange: TimeRange = VALID_TIME_RANGES.includes(rawTimeRange as TimeRange)
    ? (rawTimeRange as TimeRange)
    : "overall";

  try {
    const result = await getLeaderboard(gameType, page, limit, timeRange);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to retrieve leaderboard" });
  }
};

/**
 * Get leaderboard stats for a specific user and game type
 */
export const getUserStats: RestAPI<
  LeaderboardEntry | null,
  { username: string; gameType: GameKey }
> = async (req, res) => {
  const { username, gameType } = req.params;
  if (!VALID_GAME_TYPES.includes(gameType)) {
    res.status(400).send({ error: "Invalid game type" });
    return;
  }

  try {
    const user = await getUserByUsername(username);
    if (!user) {
      res.status(404).send({ error: "User not found" });
      return;
    }

    const stats = await getUserLeaderboard(user.userId, gameType);
    res.send(stats);
  } catch (error) {
    res.status(500).send({ error: "Failed to retrieve user stats" });
  }
};
