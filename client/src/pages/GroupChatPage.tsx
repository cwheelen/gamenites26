import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChatPanel from "../components/ChatPanel.tsx";
import type { GroupChatInfo } from "@gamenite/shared";
import { getGroupChatById, updateGroupChat } from "../services/groupService.ts";
import useAuth from "../hooks/useAuth.ts";
import "./DirectMessagePage.css";

export default function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const auth = useAuth();

  const [group, setGroup] = useState<GroupChatInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editMembers, setEditMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!groupId) return;
    getGroupChatById(groupId).then((result) => {
      if ("error" in result) {
        setErr(result.error);
      } else {
        setGroup(result);
      }
    });
  }, [groupId]);

  if (!groupId) return null;
  if (err)
    return (
      <div className="content">
        <p className="error-message">{err}</p>
      </div>
    );
  if (!group) return <div className="content">Loading...</div>;

  function startEditing() {
    if (!group) return;
    setEditTitle(group.title);
    setEditMembers([...group.members]);
    setNewMember("");
    setSaveErr(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setSaveErr(null);
  }

  function removeMember(username: string) {
    setEditMembers((prev) => prev.filter((m) => m !== username));
  }

  const handleLeaveGroup = async () => {
    if (!group || !groupId) return;
    const remainingMembers = group.members.filter((m) => m !== auth.username);
    if (remainingMembers.length === 0) {
      setErr(
        "You cannot leave the group because you are the last member. Please delete the group instead.",
      );
      return;
    }
    const result = await updateGroupChat(auth, groupId, undefined, remainingMembers);
    if ("error" in result) {
      setErr(result.error);
    } else {
      // Successfully left the group, now redirect to messages list
      navigate("/dm");
    }
  };

  function addMember() {
    const trimmed = newMember.trim();
    if (!trimmed || editMembers.includes(trimmed)) return;
    setEditMembers((prev) => [...prev, trimmed]);
    setNewMember("");
  }

  async function saveChanges() {
    if (!group || !groupId) return;
    if (editMembers.length < 2) {
      setSaveErr("A group chat must have at least 2 members.");
      return;
    }
    const result = await updateGroupChat(auth, groupId, editTitle, editMembers);
    if ("error" in result) {
      setSaveErr(result.error);
    } else {
      setGroup(result);
      setEditing(false);
      setSaveErr(null);
    }
  }

  return (
    <div className="dmPage">
      <div className="dmPage__header">
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="primary narrow" onClick={saveChanges}>
                Save
              </button>
              <button className="narrow" onClick={cancelEditing}>
                Cancel
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
              {editMembers.map((m) => (
                <span
                  key={m}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                >
                  {m}
                  <button
                    onClick={() => removeMember(m)}
                    style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}
                    aria-label={`Remove ${m}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                placeholder="Add member..."
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMember()}
                style={{ width: "10rem" }}
              />
              <button className="narrow" onClick={addMember}>
                Add
              </button>
            </div>
            {saveErr && <p className="error-message">{saveErr}</p>}
          </div>
        ) : (
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <div>
              <h2 style={{ margin: 0 }}>{group.title}</h2>
              <p style={{ margin: 0 }}>{group.members.join(", ")}</p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="narrow" onClick={handleLeaveGroup}>
                Leave Group
              </button>
              <button
                className="narrow"
                disabled={group.createdBy !== auth.username}
                onClick={startEditing}
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="dmPage__chat">
        <ChatPanel chatId={group.chatId} />
      </div>
    </div>
  );
}
