import { useEffect, useState } from "react";
import useLoginContext from "../hooks/useLoginContext.ts";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import { getFriendList } from "../services/friendService.ts";

/**
 * Header component that renders the main title.
 */
export default function Header() {
  const { user, reset } = useLoginContext();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getFriendList(user.username).then((result) => {
      if (!("error" in result)) {
        setPendingCount(result.pending.length);
      }
    });
  }, [user.username]);

  return (
    <div id="header" className="header">
      <div className="title">GameNite!</div>
      signed in as {user.display}
      <button
        className="narrowcenter secondary header__friends"
        aria-label={`Friends${pendingCount > 0 ? `, ${pendingCount} pending request${pendingCount > 1 ? "s" : ""}` : ""}`}
        onClick={() => navigate("/friends")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        {pendingCount > 0 && (
          <span className="header__friendsBadge" aria-hidden="true">
            {pendingCount}
          </span>
        )}
      </button>
      <button
        className="narrowcenter secondary"
        onClick={() => {
          reset();
          navigate("/login");
        }}
      >
        Log Out
      </button>
      <button
        className="narrowcenter secondary"
        onClick={() => navigate(`/profile/${user.username}`)}
      >
        View Profile
      </button>
    </div>
  );
}
