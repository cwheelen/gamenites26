import { type LeaderboardEntry, type GameKey } from "@gamenite/shared";
import { getLeaderboard, getUserLeaderboard } from "../services/leaderboard.service.ts";
import { type RestAPI } from "../types.ts";
import { getUserByUsername } from "../services/auth.service.ts";

/**
 * Get leaderboard for a specific game type
 * @param req The request with game type as a parameter
 * @param res The response containing leaderboard entries
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
  if (!["nim", "guess"].includes(gameType)) {
    res.status(400).send({ error: "Invalid game type" });
    return;
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const result = await getLeaderboard(gameType, page, limit);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to retrieve leaderboard" });
  }
};

/**

 * Get leaderboard stats for a specific user and game type
 * @param req The request with username and game type as parameters
 * @param res The response containing user leaderboard stats or null
 */
export const getUserStats: RestAPI<
  LeaderboardEntry | null,
  { username: string; gameType: GameKey }
> = async (req, res) => {
  const { username, gameType } = req.params;
  if (!["nim", "guess"].includes(gameType)) {
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
