import { useEffect, useState } from "react";
// import useAuth from "./useAuth";
import useLoginContext from "./useLoginContext";
import type { SafeUserInfo } from "@gamenite/shared";
import { getUserStatusByUsername } from "../services/userService";

/**
 * Subscribes to `userStatusChanged` for a given username (e.g. another user's profile).
 */
export default function useSocketsForPresence(username: string) {
  const { socket } = useLoginContext();
  // const auth = useAuth();
  const [status, setStatus] = useState<"online" | "offline">("offline");

  useEffect(() => {
    let cancel = false;
    getUserStatusByUsername(username).then((response) => {
      if (cancel) return;
      if ("error" in response) return;
      setStatus(response.status);
    });
    return () => {
      cancel = true;
    };
  }, [username]);

  useEffect(() => {
    const handleStatusChanged = (payload: { user: SafeUserInfo; status: "online" | "offline" }) => {
      if (payload.user.username !== username) return;
      setStatus(payload.status);
    };

    socket.on("userStatusChanged", handleStatusChanged);
    return () => {
      socket.off("userStatusChanged", handleStatusChanged);
    };
  }, [username, socket]);

  return {
    status,
  };
}
