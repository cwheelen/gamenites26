import { useCallback, useEffect, useState } from "react";
import useLoginContext from "./useLoginContext";
import type { InviteInfo } from "@gamenite/shared";

export default function useGameInviteToast() {
  const { socket } = useLoginContext();
  const [pendingInvite, setPendingInvite] = useState<InviteInfo | null>(null);

  useEffect(() => {
    const handler = (invite: InviteInfo) => {
      setPendingInvite(invite);
    };
    socket.on("gameInviteReceived", handler);
    return () => {
      socket.off("gameInviteReceived", handler);
    };
  }, [socket]);

  const dismiss = useCallback(() => setPendingInvite(null), []);

  return { pendingInvite, dismiss: dismiss };
}
