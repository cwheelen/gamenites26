import { useState, useEffect } from "react";
import { getLeaderboard } from "../services/leaderboardService.ts";
import type { LeaderboardEntry, GameKey } from "@gamenite/shared";
import { gameNames } from "../util/consts.ts";
import UserLink from "../components/UserLink.tsx";
import { useNavigate } from "react-router-dom";
import "./Leaderboard.css";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | { error: string } | null>(
    null,
  );
  const [selectedGame, setSelectedGame] = useState<GameKey>("nim");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLeaderboard(await getLeaderboard(selectedGame));
    };
    fetchLeaderboard();
  }, [selectedGame]);

  const gameOptions: GameKey[] = ["nim", "guess"];

  return (
    <div className="content spacedSection">
      <h1>Leaderboard</h1>

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

      {leaderboard === null ? (
        <div>Loading...</div>
      ) : typeof leaderboard === "object" && "error" in leaderboard ? (
        <div className="error">{leaderboard.error}</div>
      ) : Array.isArray(leaderboard) && leaderboard.length === 0 ? (
        <div>No games played yet!</div>
      ) : Array.isArray(leaderboard) ? (
        <div className="spacedSection">
          <table className="leaderboardTable">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Game</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Games Played</th>
                <th>Win Rate</th>
                <th>Current Streak</th>
                <th>Best Streak</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr key={`${entry.user.username}:${entry.gameType}`}>
                  <td>{index + 1}</td>
                  <td>
                    <UserLink user={entry.user} />
                  </td>
                  <td>{gameNames[entry.gameType]}</td>
                  <td>{entry.wins}</td>
                  <td>{entry.losses}</td>
                  <td>{entry.gamesPlayed}</td>
                  <td>
                    {entry.gamesPlayed > 0
                      ? `${Math.round((entry.wins / entry.gamesPlayed) * 100)}%`
                      : "0%"}
                  </td>
                  <td>{entry.currentStreak}</td>
                  <td>{entry.longestStreak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="error">Failed to load leaderboard data. Please try again later.</div>
      )}

      <div className="spacedSection">
        <button className="primary narrow" onClick={() => navigate("/game/new")}>
          Play a Game
        </button>
      </div>
    </div>
  );
}
