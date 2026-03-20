import { type LegacyFriendRequestInfo } from "@gamenite/shared";
import { FriendRequestRepo } from "../repository.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import type { UserWithId } from "../types.ts";
import { createFriend } from "./friends.service.ts";

async function populateFriendRequestInfo(
  friendRequestId: string,
): Promise<LegacyFriendRequestInfo> {
  const friendRequest = await FriendRequestRepo.get(friendRequestId);
  return {
    friendRequestId,
    from: await populateSafeUserInfo(friendRequest.from),
    to: await populateSafeUserInfo(friendRequest.to),
    status: friendRequest.status,
    createdAt: new Date(friendRequest.createdAt),
  };
}

export async function createFriendRequest(
  fromId: string,
  toId: string,
  createdAt: Date,
): Promise<LegacyFriendRequestInfo> {
  const id = await FriendRequestRepo.add({
    from: fromId,
    to: toId,
    createdAt: createdAt.toISOString(),
    status: "pending",
  });
  return populateFriendRequestInfo(id);
}

export async function getFriendRequestById(
  friendRequestId: string,
): Promise<LegacyFriendRequestInfo | null> {
  const friendRequest = await FriendRequestRepo.find(friendRequestId);
  if (!friendRequest) return null;
  return populateFriendRequestInfo(friendRequestId);
}

export async function getFriendRequestsByUsername(
  username: string,
): Promise<LegacyFriendRequestInfo[]> {
  const keys = await FriendRequestRepo.getAllKeys();
  const unfiltered = await Promise.all(keys.map(populateFriendRequestInfo));
  const unsorted = unfiltered.filter((friendRequest) => {
    return friendRequest.to.username === username;
  });

  return unsorted.toSorted(
    (friendRequest1, friendRequest2) =>
      friendRequest2.createdAt.getTime() - friendRequest1.createdAt.getTime(),
  );
}

export async function updateFriendRequest(
  friendRequestId: string,
  user: UserWithId,
  status: "accepted" | "rejected",
): Promise<LegacyFriendRequestInfo> {
  const friendRequest = await FriendRequestRepo.find(friendRequestId);
  if (!friendRequest) throw new Error(`user ${user.username} updated an invalid friend request id`);
  if (friendRequest.status !== "pending") {
    throw new Error(
      `user ${user.username} tried to ${
        status === "accepted" ? "accept" : "decline"
      } an already ${friendRequest.status} friend request`,
    );
  }

  await FriendRequestRepo.set(friendRequestId, { ...friendRequest, status: status });

  if (status === "accepted") {
    await createFriend(friendRequest.from, friendRequest.to, new Date());
    await createFriend(friendRequest.to, friendRequest.from, new Date());
  }

  return populateFriendRequestInfo(friendRequestId);
}
