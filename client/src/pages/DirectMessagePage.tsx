import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import useAuth from "../hooks/useAuth.ts";
import { openDM } from "../services/dmService.ts";
import ChatPanel from "../components/ChatPanel.tsx";
import type { DirectMessageInfo } from "@gamenite/shared";
import "./DirectMessagePage.css";

/**
 * DirectMessagePage renders a private real-time chat between the logged-in
 * user and the user identified by the :username route param.
 *
 * It calls POST /api/dm/open to get-or-create the shared chatId, then hands
 * that chatId to the existing ChatPanel component which handles all the
 * socket logic.
 */
export default function DirectMessagePage() {
  const { username } = useParams<{ username: string }>();
  const auth = useAuth();

  const [dm, setDm] = useState<DirectMessageInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;

    openDM(auth, username).then((result) => {
      if ("error" in result) {
        setErr(result.error);
      } else {
        setDm(result);
      }
    });
  }, [username, auth]);

  if (!username) return null;

  if (err) {
    return (
      <div className="content">
        <p className="error-message">{err}</p>
      </div>
    );
  }

  if (!dm) {
    return <div className="content">Loading...</div>;
  }

  return (
    <div className="dmPage">
      <div className="dmPage__header">
        <h2>
          Conversation with{" "}
          <Link to={`/profile/${username}`} className="userLink">
            {username}
          </Link>
        </h2>
      </div>
      <div className="dmPage__chat">
        <ChatPanel chatId={dm.chatId} />
      </div>
    </div>
  );
}
