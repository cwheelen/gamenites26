import type { FriendInfo, SafeUserInfo } from "@gamenite/shared";
import { FriendshipRepo } from "../repository.ts";
import { populateSafeUserInfo } from "./user.service.ts";

async function populateFriendInfo(friendId: string): Promise<FriendInfo> {
  const record = await FriendshipRepo.get(friendId);
  return {
    friendId,
    users: await Promise.all([
      populateSafeUserInfo(record.users[0]),
      populateSafeUserInfo(record.users[1]),
    ]),
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
    users: [userId, friendId],
    createdAt: createdAt.toISOString(),
  });
  return populateFriendInfo(id);
}

export async function getFriendshipById(friendId: string): Promise<FriendInfo | null> {
  const friend = await FriendshipRepo.find(friendId);
  if (!friend) return null;
  return populateFriendInfo(friendId);
}

export async function getFriendshipsById(user: SafeUserInfo): Promise<FriendInfo[]> {
  const keys = await FriendshipRepo.getAllKeys();
  const unfiltered = await Promise.all(keys.map(populateFriendInfo));
  const unsorted = unfiltered.filter((friendship) => {
    return friendship.users.includes(user);
  });

  return unsorted.toSorted((users1, users2) => {
    const friend1 = users1.users[users1.users.indexOf(user) + (1 % 2)];
    const friend2 = users2.users[users2.users.indexOf(user) + (1 % 2)];
    return friend1.display.localeCompare(friend2.display);
  });
}

export async function deleteFriendById(friendshipId: string, userId: string): Promise<boolean> {
  const friendship = await FriendshipRepo.get(friendshipId);

  if (!friendship) {
    throw new Error(`user tried to delete a friendship that doesn't exist`);
  }
  if (!friendship.users.includes(userId)) {
    throw new Error(`user tried to delete a friendship that wasn't theirs`);
  }

  return await FriendshipRepo.delete(friendshipId);
}
