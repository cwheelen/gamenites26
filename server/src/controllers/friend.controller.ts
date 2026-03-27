import {
  withAuth,
  zFriendRequestPayload,
  zFriendAcceptPayload,
  type FriendRequestInfo,
  type FriendListInfo,
} from "@gamenite/shared";
import { checkAuth } from "../services/auth.service.ts";
import {
  sendFriendRequest,
  acceptFriendRequest,
  getFriendList,
  getFriendshipStatus,
} from "../services/friend.service.ts";
import type { RestAPI } from "../types.ts";

/**
 * POST /api/myFriend/request
 *
 * Send a friend request to another user.
 * Body: { auth: UserAuth, payload: { to: string } }
 */
export const postRequest: RestAPI<FriendRequestInfo> = async (req, res) => {
  const body = withAuth(zFriendRequestPayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await sendFriendRequest(user.username, body.data.payload.to);
  if ("error" in result) {
    res.status(400).send(result);
    return;
  }

  res.send(result);
};

/**
 * POST /api/myFriend/accept
 *
 * Accept a pending friend request.
 * Body: { auth: UserAuth, payload: { requestId: string } }
 */
export const postAccept: RestAPI<FriendRequestInfo> = async (req, res) => {
  const body = withAuth(zFriendAcceptPayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await acceptFriendRequest(body.data.payload.requestId, user.username);
  if ("error" in result) {
    res.status(400).send(result);
    return;
  }

  res.send(result);
};

/**
 * GET /api/myFriend/list/:username
 *
 * Returns the friends list and pending incoming requests for a user.
 */
export const getList: RestAPI<FriendListInfo, { username: string }> = async (req, res) => {
  const result = await getFriendList(req.params.username);
  res.send(result);
};

/**
 * Returns the friendship status between two users, or null if none exists.
 */
export const getStatus: RestAPI<
  FriendRequestInfo | null,
  { usernameA: string; usernameB: string }
> = async (req, res) => {
  const result = await getFriendshipStatus(req.params.usernameA, req.params.usernameB);
  res.send(result);
};
