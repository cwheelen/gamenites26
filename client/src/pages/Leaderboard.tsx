import { useState, useEffect } from "react";
import { getLeaderboard } from "../services/leaderboardService.ts";
import { api } from "../services/api.ts";
import type { LeaderboardEntry, GameKey, FriendInfo } from "@gamenite/shared";
import { gameNames } from "../util/consts.ts";
import UserLink from "../components/UserLink.tsx";
import { useNavigate } from "react-router-dom";
import useLoginContext from "../hooks/useLoginContext.ts";
import "./Leaderboard.css";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<
    | {
        entries: LeaderboardEntry[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
    | { error: string }
    | null
  >(null);
  const [selectedGame, setSelectedGame] = useState<GameKey>("nim");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [friends, setFriends] = useState<FriendInfo[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const { user } = useLoginContext();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLeaderboard(await getLeaderboard(selectedGame, currentPage, 10));
    };
    fetchLeaderboard();
  }, [selectedGame, currentPage]);

  useEffect(() => {
    if (friendsOnly) {
      const fetchFriends = async () => {
        try {
          const response = await api.get<FriendInfo[]>(`/api/friend/list/${user.username}`);
          setFriends(response.data);
        } catch (error) {
          setFriends([]);
        }
      };
      fetchFriends();
    }
  }, [friendsOnly, user.username]);

  const gameOptions: GameKey[] = ["nim", "guess"];

  const getFilteredLeaderboard = () => {
    if (!leaderboard || "error" in leaderboard) {
      return leaderboard;
    }

    if (!friendsOnly) {
      return leaderboard;
    }

    if (!friends) {
      return null; // Loading state while friends are being fetched
    }

    const friendUsernames = new Set(
      friends.flatMap((friend) => [friend.users[0].username, friend.users[1].username]),
    );
    const filtered = leaderboard.entries.filter((entry) =>
      friendUsernames.has(entry.user.username),
    );

    return {
      ...leaderboard,
      entries: filtered,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / leaderboard.limit),
    };
  };

  const filteredLeaderboard = getFilteredLeaderboard();

  return (
    <div className="content spacedSection">
      <h1>Leaderboard</h1>

      <div className="spacedSection">
        <label htmlFor="gameSelect">Select Game:</label>
        <select
          id="gameSelect"
          value={selectedGame}
          onChange={(e) => {
            setSelectedGame(e.target.value as GameKey);
            setCurrentPage(1); // Reset to first page when changing games
          }}
          className="primary narrow"
        >
          {gameOptions.map((game) => (
            <option key={game} value={game}>
              {gameNames[game]}
            </option>
          ))}
        </select>
      </div>

      <div className="spacedSection" style={{ marginTop: "0.5rem" }}>
        <label>
          <input
            type="checkbox"
            checked={friendsOnly}
            onChange={(e) => {
              setFriendsOnly(e.target.checked);
              setCurrentPage(1); // Reset to first page when toggling friends mode
            }}
            style={{ marginRight: "0.5rem" }}
          />
          Show only friends
        </label>
      </div>

      {leaderboard === null || (friendsOnly && friends === null) ? (
        <div>Loading...</div>
      ) : "error" in leaderboard ? (
        <div className="error">{leaderboard.error}</div>
      ) : filteredLeaderboard &&
        !("error" in filteredLeaderboard) &&
        filteredLeaderboard.entries.length === 0 ? (
        <div>{friendsOnly ? "No friends have played this game yet!" : "No games played yet!"}</div>
      ) : filteredLeaderboard &&
        !("error" in filteredLeaderboard) &&
        filteredLeaderboard.entries.length > 0 ? (
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
              {filteredLeaderboard.entries.map((entry: LeaderboardEntry, index: number) => (
                <tr key={`${entry.user.username}:${entry.gameType}`}>
                  <td>{(filteredLeaderboard.page - 1) * filteredLeaderboard.limit + index + 1}</td>
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

      {filteredLeaderboard &&
        !("error" in filteredLeaderboard) &&
        filteredLeaderboard.totalPages > 1 && (
          <div
            className="spacedSection"
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "nowrap",
            }}
          >
            <button
              className="primary narrow"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{ flexShrink: 0 }}
            >
              Previous
            </button>

            <span style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
              Page {filteredLeaderboard.page} of {filteredLeaderboard.totalPages}
            </span>

            <button
              className="primary narrow"
              onClick={() =>
                setCurrentPage(Math.min(filteredLeaderboard.totalPages, currentPage + 1))
              }
              disabled={currentPage === filteredLeaderboard.totalPages}
              style={{ flexShrink: 0 }}
            >
              Next
            </button>
          </div>
        )}

      <div className="spacedSection" style={{ marginTop: "2rem" }}>
        <button className="primary narrow" onClick={() => navigate("/game/new")}>
          Play a Game
        </button>
      </div>
    </div>
  );
}
