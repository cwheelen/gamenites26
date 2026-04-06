import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FriendRequestInfo } from "@gamenite/shared";
import useAuth from "./useAuth";
import useLoginContext from "./useLoginContext";
import { getFriendList } from "../services/friendService";
import { openDM } from "../services/dmService";

export default function useNewMessageForm() {
  const auth = useAuth();
  const { user } = useLoginContext();
  const navigate = useNavigate();

  const [friends, setFriends] = useState<FriendRequestInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    getFriendList(user.username).then((result) => {
      if ("error" in result) {
        setLoadError(result.error);
      } else {
        setFriends(result.friends);
      }
    });
  }, [user.username]);

  function friendUsername(req: FriendRequestInfo): string {
    return req.from.username === user.username ? req.to.username : req.from.username;
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setFilter(e.target.value);
  }

  async function handleSelect(username: string) {
    setOpenError(null);
    const result = await openDM(auth, username);
    if ("error" in result) {
      setOpenError(result.error);
    } else {
      navigate(`/dm/${username}`);
    }
  }

  function handleCancel() {
    navigate("/dm");
  }

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
    filtered,
    friendUsername,
  };
}
