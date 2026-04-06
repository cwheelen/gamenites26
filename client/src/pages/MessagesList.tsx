import { useNavigate } from "react-router-dom";
import "./MessagesList.css";
import useDMList from "../hooks/useDMList";
import useLoginContext from "../hooks/useLoginContext";
import MessageSummaryView from "../components/MessageSummaryView";

export default function MessagesList() {
  const { user } = useLoginContext();

  const messageList = useDMList(user.username);
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
        <>
          {"message" in messageList ? (
            messageList.message
          ) : (
            <div className="dottedList">
              {messageList.map((dm) => (
                <MessageSummaryView {...dm} username={user.username} key={dm.dmId.toString()} />
              ))}
            </div>
          )}
        </>
      </div>
    </div>
  );
}
