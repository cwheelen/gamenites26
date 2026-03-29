import {
  withAuth,
  zCreateFriend,
  zCreateFriendRequest,
  zUpdateFriendRequest,
  type FriendInfo,
} from "@gamenite/shared";
import {
  getFriendRequestById,
  getFriendRequestsByUsername,
  createFriendRequest,
  updateFriendRequest,
} from "../services/friendRequest.service.ts";
import type { RestAPI } from "../types.ts";
import { checkAuth, getUserByUsername } from "../services/auth.service.ts";
import {
  createFriend,
  deleteFriendById,
  getFriendshipById,
  getFriendshipsById,
} from "../services/friends.service.ts";
import { populateSafeUserInfo } from "../services/user.service.ts";

export const postCreateFriendRequest: RestAPI<unknown> = async (req, res) => {
  const body = withAuth(zCreateFriendRequest).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const recipeint = await getUserByUsername(body.data.payload.toUsername);
  if (!recipeint) {
    res.status(404).send({ error: "Friend does not exist" });
    return;
  }

  res.send(await createFriendRequest(user.userId, recipeint.userId, new Date()));
};

export const getFriendRequest: RestAPI<unknown> = async (req, res) => {
  const friendRequest = await getFriendRequestById(req.params.id);

  if (!friendRequest) {
    res.status(404).send({ error: "Friend Request not found" });
    return;
  }
  res.send(friendRequest);
};

export const getRequestList: RestAPI<unknown> = async (req, res) => {
  res.send(await getFriendRequestsByUsername(req.params.username));
};

export const putUpdateFriendRequest: RestAPI<unknown> = async (req, res) => {
  const body = withAuth(zUpdateFriendRequest).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  res.send(await updateFriendRequest(body.data.payload.id, user, body.data.payload.status));
};

export const postCreateFriend: RestAPI<FriendInfo> = async (req, res) => {
  const body = withAuth(zCreateFriend).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const authUser = await checkAuth(body.data.auth);
  if (!authUser) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const user = await getUserByUsername(body.data.payload.username);
  if (!user) {
    res.status(404).send({ error: "Friend does not exist" });
    return;
  }

  const friend = await getUserByUsername(body.data.payload.friendUsername);
  if (!friend) {
    res.status(404).send({ error: "Friend does not exist" });
    return;
  }

  res.send(await createFriend(user.userId, friend.userId, new Date()));
};

export const getFriend: RestAPI<FriendInfo> = async (req, res) => {
  const friend = await getFriendshipById(req.params.id);

  if (!friend) {
    res.status(404).send({ error: "Friend not found" });
    return;
  }

  res.send(friend);
};

export const getFriendList: RestAPI<FriendInfo[], { username: string }> = async (req, res) => {
  const user = await getUserByUsername(req.params.username);
  if (!user) {
    res.status(404).send({ error: "User not found" });
    return;
  }
  res.send(await getFriendshipsById(await populateSafeUserInfo(user.userId)));
};

export const deleteFriend: RestAPI<FriendInfo> = async (req, res) => {
  const { id, username } = req.params;

  const user = await getUserByUsername(username);
  if (!user) {
    res.status(404).send({ error: "User not found" });
    return;
  }

  const friend = await getFriendshipById(id);
  if (!friend) {
    res.status(404).send({ error: "Friendship record not found" });
    return;
  }

  await deleteFriendById(id, user.userId);
};
