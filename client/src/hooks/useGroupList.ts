import type { ErrorMsg, GroupChatInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { getGroupChatsForUser } from "../services/groupService";

export default function useGroupList(
  username: string,
  maxChats?: number,
): { message: string } | GroupChatInfo[] {
  const [groups, setGroups] = useState<GroupChatInfo[] | ErrorMsg | null>(null);

  useEffect(() => {
    getGroupChatsForUser(username).then(setGroups);
  }, [username]);

  if (!groups) return { message: "Loading..." };
  if ("error" in groups) return { message: `Error: ${groups.error}` };
  if (groups.length === 0) return { message: "No group chats found..." };
  if (maxChats) return groups.slice(0, maxChats);

  return groups;
}
