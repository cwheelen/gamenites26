import type { SafeUserInfo, LeaderboardEntry, GameKey } from "@gamenite/shared";
import { useEffect, useState } from "react";
import useTimeSince from "../hooks/useTimeSince";
import { getUserById } from "../services/userService";
import { getUserLeaderboard } from "../services/leaderboardService";
import { gameNames } from "../util/consts";

interface ViewProfileProps {
  username: string;
}
export default function ViewProfile({ username }: ViewProfileProps) {
  const [componentState, setComponentState] = useState<
    | { type: "waiting" }
    | { type: "error"; msg: string }
    | {
        type: "profile";
        user: SafeUserInfo;
        stats: { [key in GameKey]: LeaderboardEntry | null | { error: string } };
      }
  >({ type: "waiting" });
  const [selectedGame, setSelectedGame] = useState<GameKey>("nim");
  const timeSince = useTimeSince();

  useEffect(() => {
    let cancel = false;

    const fetchData = async () => {
      // First fetch user info
      const userResponse = await getUserById(username);
      if (cancel) return;

      if ("error" in userResponse) {
        setComponentState({ type: "error", msg: userResponse.error });
        return;
      }

      // Then fetch stats for both games
      const gameTypes: GameKey[] = ["nim", "guess"];
      const statsPromises = gameTypes.map(async (gameType) => {
        const statResponse = await getUserLeaderboard(username, gameType);
        return { gameType, stats: statResponse };
      });

      const statsResults = await Promise.all(statsPromises);
      if (cancel) return;

      const stats: { [key in GameKey]: LeaderboardEntry | null | { error: string } } = {
        nim: null,
        guess: null,
      };

      for (const { gameType, stats: statResponse } of statsResults) {
        if (
          statResponse === null ||
          (typeof statResponse === "string" && statResponse === "") ||
          (typeof statResponse === "object" && "wins" in statResponse)
        ) {
          stats[gameType] =
            statResponse === null || (typeof statResponse === "string" && statResponse === "")
              ? null
              : statResponse;
        } else if (typeof statResponse === "object" && "error" in statResponse) {
          stats[gameType] = { error: statResponse.error };
        } else {
          // Handle unexpected response types
          stats[gameType] = { error: `Unexpected response: ${JSON.stringify(statResponse)}` };
        }
      }

      setComponentState({ type: "profile", user: userResponse, stats });
    };

    fetchData().catch((err) => {
      if (cancel) return;
      setComponentState({ type: "error", msg: `${err}` });
    });

    return () => {
      cancel = true;
    };
  }, [username]);

  switch (componentState.type) {
    case "error":
      return <div style={{ color: "#f00" }}>{componentState.msg}</div>;
    case "waiting":
      return <div>Loading...</div>;
    case "profile": {
      const gameOptions: GameKey[] = ["nim", "guess"];
      const stat = componentState.stats[selectedGame];
      return (
        <div className="spacedSection">
          <h2>Profile for {componentState.user.display}</h2>
          <div>
            <ul>
              <li>Username: {componentState.user.username}</li>
              <li>Account created {timeSince(componentState.user.createdAt)}</li>
            </ul>
          </div>
          <div>
            <h3>Game Statistics</h3>
            <div className="spacedSection">
              <div className="spacedSection">
                <label htmlFor="gameSelect">Select Game:</label>
                <select
                  id="gameSelect"
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value as GameKey)}
                  className="primary narrow"
                >
                  {gameOptions.map((game) => (
                    <option key={game} value={game}>
                      {gameNames[game]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {stat === null ? (
                  <p>No games played yet!</p>
                ) : typeof stat === "object" && "error" in stat ? (
                  <p className="error">Error loading stats: {stat.error}</p>
                ) : typeof stat === "object" && "wins" in stat ? (
                  <ul>
                    <li>Wins: {stat.wins}</li>
                    <li>Losses: {stat.losses}</li>
                    <li>Games Played: {stat.gamesPlayed}</li>
                    <li>Current Streak: {stat.currentStreak}</li>
                    <li>Longest Streak: {stat.longestStreak}</li>
                    <li>Last Updated: {timeSince(new Date(stat.lastUpdated))}</li>
                  </ul>
                ) : (
                  <p className="error">Unexpected stats format</p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  }
}
