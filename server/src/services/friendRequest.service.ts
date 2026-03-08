import { type CreateFriendRequest, type FriendRequestInfo } from "@gamenite/shared";
import { FriendRequestRepo } from "../repository.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import type { UserWithId } from "../types.ts";

async function populateFriendRequestInfo(friendRequestId: string): Promise<FriendRequestInfo> {
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
  { from, to }: CreateFriendRequest,
  createdAt: Date,
): Promise<FriendRequestInfo> {
  const id = await FriendRequestRepo.add({
    from,
    to,
    createdAt: createdAt.toISOString(),
    status: "pending",
  });
  return populateFriendRequestInfo(id);
}

export async function getFriendRequestById(
  friendRequestId: string,
): Promise<FriendRequestInfo | null> {
  const friendRequest = await FriendRequestRepo.find(friendRequestId);
  if (!friendRequest) return null;
  return populateFriendRequestInfo(friendRequestId);
}

export async function getFriendRequestsForUser(userId: UserWithId): Promise<FriendRequestInfo[]> {
  const keys = await FriendRequestRepo.getAllKeys();
  const unfiltered = await Promise.all(keys.map(populateFriendRequestInfo));
  const unsorted = unfiltered.filter((friendRequest) => {
    return friendRequest.to.username === userId.username;
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
): Promise<FriendRequestInfo> {
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
  return populateFriendRequestInfo(friendRequestId);
}
