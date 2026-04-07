import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import {
  getFriendList,
  acceptFriendRequest,
  rejectFriendRequest,
} from "../services/friendService.ts";
import type { FriendListInfo, FriendRequestInfo } from "@gamenite/shared";
import "./FriendsPage.css";
import OnlineIndicator from "../components/OnlineIndicator.tsx";
import usePagination from "../hooks/usePagination.ts";
import PaginationControls from "../components/PaginationControls.tsx";

export default function FriendsPage() {
  const { user } = useLoginContext();
  const auth = useAuth();
  const [friendData, setFriendData] = useState<FriendListInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const friendList = friendData ? friendData.friends : [];
  const friendPagination = usePagination(friendList, 10);

  useEffect(() => {
    getFriendList(user.username).then((result) => {
      if ("error" in result) {
        setErr(result.error);
      } else {
        setFriendData(result);
      }
    });
  }, [user.username]);

  const handleAccept = async (requestId: string) => {
    setAccepting(requestId);
    const result = await acceptFriendRequest(auth, requestId);
    setAccepting(null);

    if ("error" in result) {
      setErr(result.error);
      return;
    }

    // Move the accepted request from pending into friends
    setFriendData((prev) => {
      if (!prev) return prev;
      return {
        friends: [...prev.friends, result],
        pending: prev.pending.filter((r) => r.requestId !== requestId),
      };
    });
  };

  const handleReject = async (requestId: string) => {
    setRejecting(requestId);
    const result = await rejectFriendRequest(auth, requestId);
    setRejecting(null);

    if ("error" in result) {
      setErr(result.error);
      return;
    }

    // Remove the rejected request from pending
    setFriendData((prev) => {
      if (!prev) return prev;
      return {
        friends: prev.friends,
        pending: prev.pending.filter((r) => r.requestId !== requestId),
      };
    });
  };

  if (err) {
    return (
      <div className="content">
        <p className="error-message">{err}</p>
      </div>
    );
  }

  if (!friendData) {
    return <div className="content">Loading...</div>;
  }

  return (
    <div className="content spacedSection">
      <h2>Friends</h2>

      {/* Pending incoming requests */}
      {friendData.pending.length > 0 && (
        <div className="spacedSection">
          <h3>Pending requests ({friendData.pending.length})</h3>
          <ul className="dottedList" role="list">
            {friendData.pending.map((req: FriendRequestInfo) => (
              <li key={req.requestId} className="friendListItem">
                <div className="friendListItem__info">
                  <Link to={`/profile/${req.from.username}`} className="friendListItem__name">
                    {req.from.display}
                  </Link>
                  <OnlineIndicator username={req.from.username} />
                  <span className="smallAndGray">@{req.from.username}</span>
                </div>
                <div className="friendListItem__actions">
                  <button
                    className="primary narrow"
                    onClick={() => handleAccept(req.requestId)}
                    disabled={accepting === req.requestId}
                  >
                    {accepting === req.requestId ? "Accepting..." : "Accept"}
                  </button>
                  <button
                    className="primary narrow"
                    onClick={() => handleReject(req.requestId)}
                    disabled={rejecting === req.requestId}
                  >
                    {rejecting === req.requestId ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* {friendData.pending.length > 0 && <hr />} */}

      {/* Confirmed friends */}
      <div className="spacedSection">
        <h3>Your friends ({friendData.friends.length})</h3>
        {friendData.friends.length === 0 ? (
          <p className="smallAndGray">
            No friends yet. Visit someone&apos;s profile to send them a request!
          </p>
        ) : (
          <>
            <ul className="dottedList" role="list">
              {friendPagination.currentItems.map((req: FriendRequestInfo) => {
                // Show the other person, not ourselves
                const other = req.from.username === user.username ? req.to : req.from;
                return (
                  <li key={req.requestId} className="friendListItem">
                    <div className="friendListItem__info">
                      <Link to={`/profile/${other.username}`} className="friendListItem__name">
                        {other.display}
                      </Link>
                      <OnlineIndicator username={other.username} />
                      <span className="smallAndGray">@{other.username}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <PaginationControls
              currentPage={friendPagination.currentPage}
              totalPages={friendPagination.totalPages}
              onNext={friendPagination.nextPage}
              onPrev={friendPagination.prevPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
