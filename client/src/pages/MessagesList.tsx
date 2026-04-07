import { useNavigate } from "react-router-dom";
import "./MessagesList.css";
import useDMList from "../hooks/useDMList";
import useGroupList from "../hooks/useGroupList";
import useLoginContext from "../hooks/useLoginContext";
import MessageSummaryView from "../components/MessageSummaryView";
import GroupSummaryView from "../components/GroupSummaryView";
import usePagination from "../hooks/usePagination";
import PaginationControls from "../components/PaginationControls";

export default function MessagesList() {
  const pageSize = 10;

  const { user } = useLoginContext();

  const messageList = useDMList(user.username);
  const groupList = useGroupList(user.username);
  const navigate = useNavigate();

  const dmList = "message" in messageList ? [] : messageList;
  const groupChatList = "message" in groupList ? [] : groupList;
  const dmPagination = usePagination(dmList, pageSize);
  const groupChatPagination = usePagination(groupChatList, pageSize);

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
          <>
            <div className="dottedList">
              {dmPagination.currentItems.map((dm) => (
                <MessageSummaryView {...dm} username={user.username} key={dm.dmId.toString()} />
              ))}
            </div>
            <PaginationControls
              currentPage={dmPagination.currentPage}
              totalPages={dmPagination.totalPages}
              onNext={dmPagination.nextPage}
              onPrev={dmPagination.prevPage}
            />
          </>
        )}
        <h3>Group Chats</h3>
        {"message" in groupList ? (
          <p>{groupList.message}</p>
        ) : (
          <>
            <div className="dottedList">
              {groupChatPagination.currentItems.map((group) => (
                <GroupSummaryView {...group} key={group.groupId} />
              ))}
            </div>
            <PaginationControls
              currentPage={groupChatPagination.currentPage}
              totalPages={groupChatPagination.totalPages}
              onNext={groupChatPagination.nextPage}
              onPrev={groupChatPagination.prevPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
