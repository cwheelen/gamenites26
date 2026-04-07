import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FriendRequestInfo, SafeUserInfo } from "@gamenite/shared";
import useAuth from "./useAuth";
import useLoginContext from "./useLoginContext";
import { getFriendList } from "../services/friendService";
import { openDM } from "../services/dmService";
import { createGroupChat } from "../services/groupService";
import { getPublicUsers } from "../services/userService";

export default function useNewMessageForm() {
  const auth = useAuth();
  const { user } = useLoginContext();
  const navigate = useNavigate();

  const [friends, setFriends] = useState<FriendRequestInfo[] | null>(null);
  const [nonfriends, setNonFriends] = useState<SafeUserInfo[] | null>(null);
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

  useEffect(() => {
    getPublicUsers().then((result) => {
      if ("error" in result) {
        setLoadError(result.error);
      } else {
        setNonFriends(result.filter((u) => u.username !== user.username));
      }
    });
  }, [user.privacy, user.username]);

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

  const friendUsernames = friends ? friends.map(friendUsername) : [];
  const nonfriendUsernames = nonfriends
    ? nonfriends.map((u) => u.username).filter((name) => !friendUsernames.includes(name))
    : [];

  const allTargets = [...friendUsernames, ...nonfriendUsernames];

  const filtered =
    friends === null && nonfriends === null
      ? null
      : allTargets.filter((name) => name.toLowerCase().includes(filter.toLowerCase()));

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
    selected,
    groupName,
    setGroupName,
  };
}
