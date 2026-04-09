import { NavLink, useNavigate } from "react-router-dom";
import useTimeSince from "../hooks/useTimeSince";

export default function MessageSummaryView({
  userA,
  userB,
  lastUpdated,
  username,
}: {
  userA: string;
  userB: string;
  lastUpdated: string;
  lastMessage?: { text: string; createdBy: string };
  username: string;
}) {
  const timeSince = useTimeSince();
  const navigate = useNavigate();
  const otherUser = userA === username ? userB : userA;

  return (
    <div className="messageSummary" role="listitem" onClick={() => navigate(`/dm/${otherUser}`)}>
      <div className="messageSummary__header">
        <NavLink
          to={`/dm/${otherUser}`}
          className="messageSummary__name"
          onClick={(e) => e.stopPropagation()}
        >
          {otherUser}
        </NavLink>
        <span className="lastActivity">{timeSince(lastUpdated)}</span>
      </div>
    </div>
  );
}
