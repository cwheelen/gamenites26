import type { DirectMessageInfo, ErrorMsg } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { messagesList } from "../services/dmService";

export default function useDMList(
  username: string,
  maxDMs?: number,
): { message: string } | DirectMessageInfo[] {
  const [dms, setDMs] = useState<DirectMessageInfo[] | ErrorMsg | null>(null);

  useEffect(() => {
    messagesList(username).then(setDMs);
  }, [username]);

  if (!dms) return { message: "Loading..." };
  if ("error" in dms) return { message: `Error: ${dms.error}` };
  if (dms.length === 0) return { message: "No conversations found..." };
  if (maxDMs) return dms.slice(0, maxDMs);

  return dms;
}
