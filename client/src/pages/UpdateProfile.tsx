import { useState, useEffect } from "react";
import useLoginContext from "../hooks/useLoginContext";
import useTimeSince from "../hooks/useTimeSince";
import useEditProfileForm from "../hooks/useEditProfileForm";
import type { LeaderboardEntry, GameKey } from "@gamenite/shared";
import { getUserLeaderboard } from "../services/leaderboardService";
import { gameNames } from "../util/consts";

export default function UpdateProfile() {
  const { user } = useLoginContext();
  const timeSince = useTimeSince();
  const [showPass, setShowPass] = useState(false);
  const { display, setDisplay, password, setPassword, confirm, setConfirm, err, handleSubmit } =
    useEditProfileForm();
  const [selectedGame, setSelectedGame] = useState<GameKey>("nim");
  const [stats, setStats] = useState<{
    [key in GameKey]: LeaderboardEntry | null | { error: string };
  }>({
    nim: null,
    guess: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const gameTypes: GameKey[] = ["nim", "guess"];
      const statsPromises = gameTypes.map(async (gameType) => {
        const statResponse = await getUserLeaderboard(user.username, gameType);
        return { gameType, stats: statResponse };
      });

      const statsResults = await Promise.all(statsPromises);
      const newStats: { [key in GameKey]: LeaderboardEntry | null | { error: string } } = {
        nim: null,
        guess: null,
      };

      for (const { gameType, stats: statResponse } of statsResults) {
        if (
          statResponse === null ||
          (typeof statResponse === "string" && statResponse === "") ||
          (typeof statResponse === "object" && "wins" in statResponse)
        ) {
          newStats[gameType] =
            statResponse === null || (typeof statResponse === "string" && statResponse === "")
              ? null
              : statResponse;
        } else if (typeof statResponse === "object" && "error" in statResponse) {
          newStats[gameType] = { error: statResponse.error };
        } else {
          newStats[gameType] = { error: `Unexpected response: ${JSON.stringify(statResponse)}` };
        }
      }

      setStats(newStats);
    };

    fetchStats();
  }, [user.username]);

  return (
    <form className="content spacedSection" onSubmit={handleSubmit}>
      <h2>Profile</h2>
      <div>
        <h3>General information</h3>
        <ul>
          <li>Username: {user.username}</li>
          <li>Account created {timeSince(user.createdAt)}</li>
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
              {(["nim", "guess"] as GameKey[]).map((game) => (
                <option key={game} value={game}>
                  {gameNames[game]}
                </option>
              ))}
            </select>
          </div>
          <div>
            {(() => {
              const stat = stats[selectedGame];
              return stat === null ? (
                <p>No data for this game yet.</p>
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
              );
            })()}
          </div>
        </div>
      </div>
      <hr />
      <div className="spacedSection">
        <h3>Display name</h3>
        <div style={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
          <input
            className="widefill notTooWide"
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
          />
          <button
            className="secondary narrow"
            onClick={(e) => {
              e.preventDefault(); // Don't submit form
              setDisplay(user.display);
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <hr />
      <div className="spacedSection">
        <h3>Reset password</h3>
        <div style={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
          <input
            type={showPass ? "input" : "password"}
            className="widefill notTooWide"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="secondary narrow"
            onClick={(e) => {
              e.preventDefault(); // Don't submit form
              setPassword("");
              setConfirm("");
            }}
          >
            Reset
          </button>
          <button
            className="secondary narrow"
            aria-label="Toggle show password"
            onClick={(e) => {
              e.preventDefault(); // Don't submit form
              setShowPass((v) => !v);
            }}
          >
            {showPass ? "Hide" : "Reveal"}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
          <input
            type={showPass ? "input" : "password"}
            className="widefill notTooWide"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      </div>
      <hr />
      {err && <p className="error-message">{err}</p>}
      <div>
        <button className="primary narrow">Submit</button>
      </div>
      <div className="smallAndGray">After updating your profile, you will be logged out</div>
    </form>
  );
}
