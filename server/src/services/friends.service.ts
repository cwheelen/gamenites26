import type { FriendInfo } from "@gamenite/shared";
import { FriendshipRepo } from "../repository.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import type { UserWithId } from "../types.ts";

async function populateFriendInfo(friendId: string): Promise<FriendInfo> {
  const record = await FriendshipRepo.get(friendId);
  return {
    friendId,
    user: await populateSafeUserInfo(record.user),
    friend: await populateSafeUserInfo(record.friend),
    createdAt: new Date(record.createdAt),
  };
}

export async function createFriend(
  userId: string,
  friendId: string,
  createdAt: Date,
): Promise<FriendInfo> {
  const user = await populateSafeUserInfo(userId);
  if (!user) throw new Error(`No user for id ${userId}`);
  const friend = await populateSafeUserInfo(friendId);
  if (!friend) throw new Error(`No user for id ${friendId}`);
  const id = await FriendshipRepo.add({
    user: userId,
    friend: friendId,
    createdAt: createdAt.toISOString(),
  });
  return populateFriendInfo(id);
}

export async function getFriendById(friendId: string): Promise<FriendInfo | null> {
  const friend = await FriendshipRepo.find(friendId);
  if (!friend) return null;
  return populateFriendInfo(friendId);
}

export async function getFriendsById(username: string): Promise<FriendInfo[]> {
  const keys = await FriendshipRepo.getAllKeys();
  const unfiltered = await Promise.all(keys.map(populateFriendInfo));
  const unsorted = unfiltered.filter((friendship) => {
    return friendship.user.username === username;
  });

  return unsorted.toSorted((friend1, friend2) =>
    friend1.friend.display.localeCompare(friend2.friend.display),
  );
}

export async function deleteFriendById(friendId: string, user: UserWithId): Promise<boolean> {
  const friendship = await FriendshipRepo.find(friendId);

  if (!friendship) {
    throw new Error(`user ${user.username} tried to delete a friendship that doesn't exist`);
  }
  if (friendship.user !== user.userId && friendship.friend !== user.userId) {
    throw new Error(`user ${user.username} tried to delete a friendship they aren't a part of`);
  }

  const success = await FriendshipRepo.delete(friendId);
  return success;
}
