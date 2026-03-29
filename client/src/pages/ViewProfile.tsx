import type { SafeUserInfo, FriendRequestInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import useTimeSince from "../hooks/useTimeSince";
import { getUserById } from "../services/userService";
import useAuth from "../hooks/useAuth.ts";
import { useNavigate } from "react-router-dom";
import { sendFriendRequest, getFriendshipStatus } from "../services/friendService.ts";
import { blockUser, unblockUser, getBlockStatus } from "../services/blockService.ts";
import useSocketsForPresence from "../hooks/useSocketsForPresence";
import OnlineIndicator from "../components/OnlineIndicator";
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
  const auth = useAuth();
  const navigate = useNavigate();

  const [friendship, setFriendship] = useState<FriendRequestInfo | null>(null);
  const [blockStatus, setBlockStatus] = useState<{
    blockedByMe: boolean;
    blockedByThem: boolean;
  }>({ blockedByMe: false, blockedByThem: false });
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const { status: presenceStatus } = useSocketsForPresence(username);

  useEffect(() => {
    let cancel = false;

    const fetchData = async () => {
      const userResponse = await getUserById(username);
      if (cancel) return;

      if ("error" in userResponse) {
        setComponentState({ type: "error", msg: userResponse.error });
        return;
      }

      const gameTypes: GameKey[] = ["nim", "guess", "battleship", "checkers"];
      const statsPromises = gameTypes.map(async (gameType) => {
        const statResponse = await getUserLeaderboard(username, gameType);
        return { gameType, stats: statResponse };
      });

      const statsResults = await Promise.all(statsPromises);
      if (cancel) return;

      const stats: { [key in GameKey]: LeaderboardEntry | null | { error: string } } = {
        nim: null,
        guess: null,
        battleship: null,
        checkers: null,
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
          stats[gameType] = { error: `Unexpected response: ${JSON.stringify(statResponse)}` };
        }
      }

      setComponentState({ type: "profile", user: userResponse, stats });
    };

    fetchData().catch((err) => {
      if (cancel) return;
      setComponentState({ type: "error", msg: `${err}` });
    });

    getFriendshipStatus(auth.username, username).then((result) => {
      if (cancel) return;
      if (!result || "error" in result) setFriendship(null);
      else setFriendship(result);
    });

    getBlockStatus(auth.username, username).then((result) => {
      if (cancel) return;
      if (!result || "error" in result) return;
      setBlockStatus(result);
    });

    return () => {
      cancel = true;
    };
  }, [username, auth.username]);

  const handleSendRequest = async () => {
    setSending(true);
    setErr(null);
    const result = await sendFriendRequest(auth, username);
    setSending(false);
    if ("error" in result) {
      setErr(result.error);
    } else {
      setFriendship(result);
    }
  };

  const handleBlock = async () => {
    setBlocking(true);
    setErr(null);
    const result = await blockUser(auth, username);
    setBlocking(false);
    if ("error" in result) {
      setErr(result.error);
    } else {
      setBlockStatus({ blockedByMe: true, blockedByThem: blockStatus.blockedByThem });
    }
  };

  const handleUnblock = async () => {
    setBlocking(true);
    setErr(null);
    const result = await unblockUser(auth, username);
    setBlocking(false);
    if ("error" in result) {
      setErr(result.error);
    } else {
      setBlockStatus({ blockedByMe: false, blockedByThem: blockStatus.blockedByThem });
    }
  };

  const friendButton = () => {
    if (blockStatus.blockedByMe || blockStatus.blockedByThem) return null;
    if (!friendship) {
      return (
        <button className="primary narrow" onClick={handleSendRequest} disabled={sending}>
          {sending ? "Sending..." : "Add Friend"}
        </button>
      );
    }
    if (friendship.status === "pending") {
      if (friendship.from.username === auth.username) {
        return (
          <button className="secondary narrow" disabled>
            Request sent
          </button>
        );
      }
      return (
        <button className="secondary narrow" disabled>
          Request received
        </button>
      );
    }
    if (friendship.status === "accepted") {
      return (
        <button className="secondary narrow" disabled>
          Friends ✓
        </button>
      );
    }
    return null;
  };

  switch (componentState.type) {
    case "error":
      return <div style={{ color: "#f00" }}>{componentState.msg}</div>;
    case "waiting":
      return <div>Loading...</div>;
    case "profile": {
      const gameOptions: GameKey[] = ["nim", "guess", "battleship", "checkers"];
      const stat = componentState.stats[selectedGame];
      return (
        <div className="spacedSection">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h2>Profile for {componentState.user.display} </h2>
            <OnlineIndicator username={username} />
            {friendButton()}
            {!blockStatus.blockedByMe && !blockStatus.blockedByThem && (
              <button className="primary narrow" onClick={() => navigate(`/dm/${username}`)}>
                Message
              </button>
            )}
            {blockStatus.blockedByMe ? (
              <button className="secondary narrow" onClick={handleUnblock} disabled={blocking}>
                {blocking ? "Unblocking..." : "Unblock"}
              </button>
            ) : (
              <button className="secondary narrow" onClick={handleBlock} disabled={blocking}>
                {blocking ? "Blocking..." : "Block"}
              </button>
            )}
          </div>
          {blockStatus.blockedByThem && (
            <p className="smallAndGray">This user has restricted who can contact them.</p>
          )}
          {err && <p className="error-message">{err}</p>}

          <div>
            <ul>
              <li>Username: {componentState.user.username}</li>
              <li>Account created {timeSince(componentState.user.createdAt)}</li>
              {presenceStatus === "online" ? (
                <li>Last online: Currently online</li>
              ) : (
                <li>
                  Last online:{" "}
                  {componentState.user.lastOnline
                    ? timeSince(componentState.user.lastOnline)
                    : "N/A"}
                </li>
              )}
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
