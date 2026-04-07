import { useNavigate } from "react-router-dom";
import "./MessagesList.css";
import useDMList from "../hooks/useDMList";
import useGroupList from "../hooks/useGroupList";
import useLoginContext from "../hooks/useLoginContext";
import MessageSummaryView from "../components/MessageSummaryView";
import GroupSummaryView from "../components/GroupSummaryView";

export default function MessagesList() {
  const { user } = useLoginContext();

  const messageList = useDMList(user.username);
  const groupList = useGroupList(user.username);
  const navigate = useNavigate();

  return (
    <div className="content">
      <div className="spacedSection">
        <h2>All Messages</h2>
        <div>
          <button className="primary narrow" onClick={() => navigate("/dm/new")}>
            Create New Message
          </button>
        </div>
        <h3>Direct Messages</h3>
        {"message" in messageList ? (
          <p>{messageList.message}</p>
        ) : (
          <div className="dottedList">
            {messageList.map((dm) => (
              <MessageSummaryView {...dm} username={user.username} key={dm.dmId.toString()} />
            ))}
          </div>
        )}
        <h3>Group Chats</h3>
        {"message" in groupList ? (
          <p>{groupList.message}</p>
        ) : (
          <div className="dottedList">
            {groupList.map((group) => (
              <GroupSummaryView {...group} key={group.groupId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
