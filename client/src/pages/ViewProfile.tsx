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

interface ViewProfileProps {
  username: string;
}

export default function ViewProfile({ username }: ViewProfileProps) {
  const [componentState, setComponentState] = useState<
    { type: "waiting" } | { type: "error"; msg: string } | { type: "profile"; user: SafeUserInfo }
  >({ type: "waiting" });
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

    getUserById(username)
      .then((response) => {
        if (cancel) return;
        if ("error" in response) {
          setComponentState({ type: "error", msg: response.error });
        } else {
          setComponentState({
            type: "profile",
            user: response,
          });
        }
      })
      .catch((err) => {
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
    case "profile":
      return (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h2>Profile for {componentState.user.display} </h2>
            <OnlineIndicator status={presenceStatus} />
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
        </>
      );
  }
}
