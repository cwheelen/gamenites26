import { withAuth, zCreateGroupChat, zUpdateGroupChat, type GroupChatInfo } from "@gamenite/shared";
import type { RestAPI } from "../types.ts";
import { checkAuth } from "../services/auth.service.ts";
import {
  createGroupChat,
  getGroupChatById,
  getGroupChatsForUser,
  updateGroupChat,
} from "../services/group.service.ts";

export const postCreateGroupChat: RestAPI<GroupChatInfo> = async (req, res) => {
  const body = withAuth(zCreateGroupChat).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const { title, members } = body.data.payload;
  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await createGroupChat(title, members, user.username);
  if ("error" in result) {
    res.status(403).send(result);
    return;
  }
  res.send(result);
};

export const getList: RestAPI<GroupChatInfo[]> = async (req, res) => {
  const username = req.params.username;
  if (!username) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }
  res.send(await getGroupChatsForUser(username));
};

export const getById: RestAPI<GroupChatInfo, { id: string }> = async (req, res) => {
  const groupChat = await getGroupChatById(req.params.id);
  if (!groupChat) {
    res.status(404).send({ error: "Group chat not found" });
    return;
  }
  res.send(groupChat);
};

export const putUpdate: RestAPI<GroupChatInfo> = async (req, res) => {
  const body = withAuth(zUpdateGroupChat).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const { groupId, title, members } = body.data.payload;
  const groupChat = await getGroupChatById(groupId);
  if (!groupChat) {
    res.status(404).send({ error: "Group chat not found" });
    return;
  }

  res.send(await updateGroupChat(groupId, title, members));
};
