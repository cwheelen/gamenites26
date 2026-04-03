import { useState, useEffect } from "react";
import { getLeaderboard, type TimeRange } from "../services/leaderboardService.ts";
import { getFriendList } from "../services/friendService.ts";
import type { LeaderboardEntry, GameKey, FriendRequestInfo } from "@gamenite/shared";
import { gameNames } from "../util/consts.ts";
import UserLink from "../components/UserLink.tsx";
import { useNavigate } from "react-router-dom";
import useLoginContext from "../hooks/useLoginContext.ts";
import "./Leaderboard.css";

const TIME_RANGE_LABELS: { value: TimeRange; label: string }[] = [
  { value: "overall", label: "All Time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

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
  const [timeRange, setTimeRange] = useState<TimeRange>("overall");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [friends, setFriends] = useState<FriendRequestInfo[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const { user } = useLoginContext();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLeaderboard(await getLeaderboard(selectedGame, currentPage, 10, timeRange));
    };
    fetchLeaderboard();
  }, [selectedGame, currentPage, timeRange]);

  useEffect(() => {
    if (friendsOnly) {
      const fetchFriends = async () => {
        try {
          const response = await getFriendList(user.username);
          if (
            response &&
            typeof response === "object" &&
            !Array.isArray(response) &&
            "friends" in response &&
            Array.isArray((response as { friends: unknown }).friends)
          ) {
            setFriends((response as { friends: FriendRequestInfo[] }).friends);
          } else {
            setFriends([]);
          }
        } catch (error) {
          setFriends([]);
        }
      };
      fetchFriends();
    }
  }, [friendsOnly, user.username]);

  const gameOptions: GameKey[] = ["nim", "guess", "connect4", "battleship", "checkers"];

  const getFilteredLeaderboard = () => {
    if (!leaderboard || "error" in leaderboard) {
      return leaderboard;
    }

    if (!friendsOnly) {
      return leaderboard;
    }

    if (!friends) {
      return null;
    }

    const friendUsernamesArr = friends.map((friend) => {
      if (friend.from.username.toLowerCase() === user.username.toLowerCase()) {
        return friend.to.username.toLowerCase();
      } else {
        return friend.from.username.toLowerCase();
      }
    });
    friendUsernamesArr.push(user.username.toLowerCase());
    const friendUsernames = new Set(friendUsernamesArr);
    const filtered = leaderboard.entries.filter((entry) =>
      friendUsernames.has(entry.user.username.toLowerCase()),
    );

    return {
      ...leaderboard,
      entries: filtered,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / leaderboard.limit),
    };
  };

  const filteredLeaderboard = getFilteredLeaderboard();

  /**
   * Finds how many wins the current user needs to reach the next leaderboard position.
   * Returns null if the user is not on the leaderboard, is already #1, or data isn't loaded.
   */
  const getWinsToNextPosition = (): { winsNeeded: number; nextRank: number } | null => {
    if (!filteredLeaderboard || "error" in filteredLeaderboard) return null;
    if (filteredLeaderboard.entries.length === 0) return null;

    // Find all entries across all pages — we only have the current page here,
    // so this works within the visible page. For a full leaderboard search
    // we use the full sorted entries on this page.
    const entries = filteredLeaderboard.entries;
    const myIndex = entries.findIndex(
      (e) => e.user.username.toLowerCase() === user.username.toLowerCase(),
    );

    // User not found on this page
    if (myIndex === -1) return null;
    // User is already #1 on this page
    if (myIndex === 0) return null;

    const myWins = entries[myIndex].wins;
    const aboveWins = entries[myIndex - 1].wins;
    const winsNeeded = aboveWins - myWins + 1;
    const nextRank = (filteredLeaderboard.page - 1) * filteredLeaderboard.limit + myIndex;

    return { winsNeeded, nextRank };
  };

  const winsToNext = getWinsToNextPosition();

  return (
    <div className="content spacedSection">
      <h1>Leaderboard</h1>

      {/* Game selector */}
      <div className="spacedSection">
        <label htmlFor="gameSelect">Select Game:</label>
        <select
          id="gameSelect"
          value={selectedGame}
          onChange={(e) => {
            setSelectedGame(e.target.value as GameKey);
            setCurrentPage(1);
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

      {/* Time range selector */}
      <div className="spacedSection" style={{ marginTop: "0.5rem" }}>
        <label htmlFor="timeRangeSelect">Time Range:</label>
        <select
          id="timeRangeSelect"
          value={timeRange}
          onChange={(e) => {
            setTimeRange(e.target.value as TimeRange);
            setCurrentPage(1);
          }}
          className="primary narrow"
        >
          {TIME_RANGE_LABELS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Friends toggle */}
      <div className="spacedSection" style={{ marginTop: "0.5rem" }}>
        <label>
          <input
            type="checkbox"
            checked={friendsOnly}
            onChange={(e) => {
              setFriendsOnly(e.target.checked);
              setCurrentPage(1);
            }}
            style={{ marginRight: "0.5rem" }}
          />
          Show friends only
        </label>
      </div>

      {/* Wins to next position */}
      {winsToNext && (
        <div
          style={{
            background: "#f0f7ff",
            border: "1px solid #bdd7f5",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            marginTop: "0.5rem",
            whiteSpace: "nowrap",
          }}
        >
          {`🏆 You need ${winsToNext.winsNeeded} more ${winsToNext.winsNeeded === 1 ? "win" : "wins"} to reach rank #${winsToNext.nextRank}!`}
        </div>
      )}

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
              {filteredLeaderboard.entries.map((entry: LeaderboardEntry, index: number) => {
                const isCurrentUser =
                  entry.user.username.toLowerCase() === user.username.toLowerCase();
                return (
                  <tr
                    key={`${entry.user.username}:${entry.gameType}`}
                    style={isCurrentUser ? { background: "#fffbdd", fontWeight: "bold" } : {}}
                  >
                    <td>
                      {(filteredLeaderboard.page - 1) * filteredLeaderboard.limit + index + 1}
                    </td>
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
                );
              })}
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
