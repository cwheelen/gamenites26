import { GroupChatRepo } from "../repository.ts";
import type { GroupChatInfo } from "@gamenite/shared";
import { createChat } from "./chat.service.ts";

async function populateGroupChatInfo(groupId: string): Promise<GroupChatInfo> {
  const record = await GroupChatRepo.get(groupId);

  return {
    groupId: groupId,
    title: record.title,
    members: record.members,
    chatId: record.chatId,
    createdBy: record.createdBy,
    lastUpdated: record.lastUpdated,
  };
}

export async function createGroupChat(
  title: string,
  members: string[],
  createdBy: string,
): Promise<GroupChatInfo> {
  const chat = await createChat(new Date());

  const id = await GroupChatRepo.add({
    title,
    members,
    chatId: chat.chatId,
    createdBy,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  });

  return populateGroupChatInfo(id);
}

export async function getGroupChatById(groupId: string): Promise<GroupChatInfo | null> {
  const groupChat = await GroupChatRepo.find(groupId);
  if (!groupChat) {
    return null;
  }
  return populateGroupChatInfo(groupId);
}

export async function updateGroupChat(
  groupId: string,
  title?: string,
  members?: string[],
): Promise<GroupChatInfo> {
  const record = await GroupChatRepo.get(groupId);
  await GroupChatRepo.set(groupId, {
    ...record,
    ...(title !== undefined ? { title } : {}),
    ...(members !== undefined ? { members } : {}),
    lastUpdated: new Date().toISOString(),
  });
  return populateGroupChatInfo(groupId);
}

export async function getGroupChatsForUser(username: string): Promise<GroupChatInfo[]> {
  const keys = await GroupChatRepo.getAllKeys();
  const groupChats: GroupChatInfo[] = [];
  for (const key of keys) {
    const groupChat = await getGroupChatById(key);
    if (groupChat && groupChat.members.includes(username)) {
      groupChats.push(groupChat);
    }
  }
  return groupChats;
}
