import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FriendRequestInfo } from "@gamenite/shared";
import useAuth from "./useAuth";
import useLoginContext from "./useLoginContext";
import { getFriendList } from "../services/friendService";
import { openDM } from "../services/dmService";
import { createGroupChat } from "../services/groupService";

export default function useNewMessageForm() {
  const auth = useAuth();
  const { user } = useLoginContext();
  const navigate = useNavigate();

  const [friends, setFriends] = useState<FriendRequestInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [openError, setOpenError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    getFriendList(user.username).then((result) => {
      if ("error" in result) {
        setLoadError(result.error);
      } else {
        setFriends(result.friends);
      }
    });
  }, [user.username]);

  const friendUsername = (req: FriendRequestInfo): string => {
    return req.from.username === user.username ? req.to.username : req.from.username;
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };

  const handleSelect = (username: string) => {
    setSelected((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username],
    );
  };

  const handleRemove = (username: string) => {
    setSelected(selected.filter((u) => u !== username));
  };

  const handleSubmit = () => {
    if (selected.length === 0) {
      setOpenError("Please select at least one friend to message.");
    } else if (selected.length === 1) {
      openDM(auth, selected[0]).then((result) => {
        if ("error" in result) {
          setOpenError(result.error);
        } else {
          navigate(`/dm/${selected[0]}`);
        }
      });
    } else {
      createGroupChat(auth, groupName.trim() || "Group Chat", [...selected, user.username]).then(
        (result) => {
          if ("error" in result) {
            setOpenError(result.error);
          } else {
            navigate(`/dm/group/${result.groupId}`);
          }
        },
      );
    }
  };

  const handleCancel = () => {
    navigate("/dm");
  };

  const filtered = friends
    ? friends.filter((req) => friendUsername(req).toLowerCase().includes(filter.toLowerCase()))
    : null;

  return {
    loadError,
    filter,
    handleInput,
    openError,
    handleSelect,
    handleCancel,
    handleRemove,
    handleSubmit,
    filtered,
    friendUsername,
    selected,
    groupName,
    setGroupName,
  };
}
