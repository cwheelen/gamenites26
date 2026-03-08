import type { FriendInfo } from "@gamenite/shared";
import { FriendshipRepo } from "../repository.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import type { UserWithId } from "../types.ts";

async function popuateFriendInfo(friendId: string): Promise<FriendInfo> {
  const record = await FriendshipRepo.get(friendId);
  return {
    friendId,
    user: await populateSafeUserInfo(record.user),
    friend: await populateSafeUserInfo(record.friend),
    createdAt: new Date(record.createdAt),
  };
}

export async function createFriend(
  user: UserWithId,
  friend: UserWithId,
  createdAt: Date,
): Promise<FriendInfo> {
  const id = await FriendshipRepo.add({
    user: user.userId,
    friend: friend.userId,
    createdAt: createdAt.toISOString(),
  });
  return popuateFriendInfo(id);
}

export async function getFriendById(friendId: string): Promise<FriendInfo | null> {
  const friend = await FriendshipRepo.find(friendId);
  if (!friend) return null;
  return popuateFriendInfo(friendId);
}
