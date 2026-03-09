import {
  withAuth,
  zCreateFriendRequest,
  zUpdateFriendRequest,
  type FriendRequestInfo,
} from "@gamenite/shared";
import {
  getFriendRequestById,
  getFriendRequestsByUsername,
  createFriendRequest,
  updateFriendRequest,
} from "../services/friendRequest.service.ts";
import type { RestAPI } from "../types.ts";
import { checkAuth } from "../services/auth.service.ts";

export const postCreateFriendRequest: RestAPI<FriendRequestInfo> = async (req, res) => {
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

  res.send(await createFriendRequest(user.userId, body.data.payload, new Date()));
};

export const getFriendRequest: RestAPI<FriendRequestInfo> = async (req, res) => {
  const friendRequest = await getFriendRequestById(req.params.friendRequestId);

  if (!friendRequest) {
    res.status(404).send({ error: "Friend Request not found" });
    return;
  }
  res.send(friendRequest);
};

export const getRequestList: RestAPI<FriendRequestInfo[]> = async (req, res) => {
  res.send(await getFriendRequestsByUsername(req.params.username));
};

export const putUpdateFriendRequest: RestAPI<FriendRequestInfo> = async (req, res) => {
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
