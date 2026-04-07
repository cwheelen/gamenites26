import { NavLink, useNavigate } from "react-router-dom";
import useTimeSince from "../hooks/useTimeSince";
import type { GroupChatInfo } from "@gamenite/shared";

export default function GroupSummaryView({ groupId, title, members, lastUpdated }: GroupChatInfo) {
  const timeSince = useTimeSince();
  const navigate = useNavigate();

  return (
    <div
      className="messageSummary"
      role="listitem"
      onClick={() => navigate(`/dm/group/${groupId}`)}
    >
      <div className="messageSummary__header">
        <NavLink
          to={`/dm/group/${groupId}`}
          className="messageSummary__name"
          onClick={(e) => e.stopPropagation()}
        >
          {title}
        </NavLink>
        <span className="lastActivity">{timeSince(lastUpdated)}</span>
      </div>
      <div className="messageSummary__preview messageSummary__preview--empty">
        {members.join(", ")}
      </div>
    </div>
  );
}
