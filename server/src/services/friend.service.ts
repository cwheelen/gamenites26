import type { FriendListInfo, FriendRequestInfo } from "@gamenite/shared";
import { getUserByUsername } from "./auth.service.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import { FriendRepo } from "../repository.ts";

/**
 * Converts a raw FriendRecord (stored by requestId) into a FriendRequestInfo
 * object safe for sending to the client.
 *
 * @param requestId - The database key for the friend record
 * @returns A populated FriendRequestInfo object
 * @throws If either user referenced by the record does not exist
 */
async function populateFriendRequestInfo(requestId: string): Promise<FriendRequestInfo> {
  const record = await FriendRepo.get(requestId);

  const fromUser = await getUserByUsername(record.from);
  const toUser = await getUserByUsername(record.to);

  if (!fromUser || !toUser) {
    throw new Error(`Could not populate friend request ${requestId}: user not found`);
  }

  const [from, to] = await Promise.all([
    populateSafeUserInfo(fromUser.userId),
    populateSafeUserInfo(toUser.userId),
  ]);

  return {
    requestId,
    from,
    to,
    status: record.status,
    createdAt: new Date(record.createdAt),
  };
}

/**
 * Sends a friend request from one user to another.
 *
 * Returns an error string if:
 * - The target user does not exist
 * - The sender is trying to friend themselves
 * - A pending or accepted relationship already exists between these two users
 *
 * @param fromUsername - The username of the user sending the request
 * @param toUsername - The username of the user receiving the request
 * @returns The created FriendRequestInfo, or an error message
 */
export async function sendFriendRequest(
  fromUsername: string,
  toUsername: string,
): Promise<FriendRequestInfo | { error: string }> {
  if (fromUsername === toUsername) {
    return { error: "You cannot send a friend request to yourself" };
  }

  const toUser = await getUserByUsername(toUsername);
  if (!toUser) {
    return { error: "User not found" };
  }

  // Check for an existing relationship in either direction
  const allKeys = await FriendRepo.getAllKeys();
  for (const key of allKeys) {
    const record = await FriendRepo.get(key);
    const involves =
      (record.from === fromUsername && record.to === toUsername) ||
      (record.from === toUsername && record.to === fromUsername);
    if (involves) {
      if (record.status === "accepted") {
        return { error: "You are already friends with this user" };
      }
      if (record.status === "pending") {
        return { error: "A friend request is already pending with this user" };
      }
    }
  }

  const requestId = await FriendRepo.add({
    from: fromUsername,
    to: toUsername,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  return populateFriendRequestInfo(requestId);
}

/**
 * Accepts a pending friend request.
 *
 * Returns an error string if:
 * - The request does not exist
 * - The accepting user is not the intended recipient of the request
 * - The request has already been accepted
 *
 * @param requestId - The database key of the friend request to accept
 * @param acceptingUsername - The username of the user accepting the request
 * @returns The updated FriendRequestInfo, or an error message
 */
export async function acceptFriendRequest(
  requestId: string,
  acceptingUsername: string,
): Promise<FriendRequestInfo | { error: string }> {
  const record = await FriendRepo.find(requestId);

  if (!record) {
    return { error: "Friend request not found" };
  }

  if (record.to !== acceptingUsername) {
    return { error: "You are not the recipient of this friend request" };
  }

  if (record.status === "accepted") {
    return { error: "This friend request has already been accepted" };
  }

  await FriendRepo.set(requestId, { ...record, status: "accepted" });

  return populateFriendRequestInfo(requestId);
}

/**
 * Retrieves the friends list and pending incoming requests for a given user.
 *
 * - `friends`: all accepted relationships involving this user
 * - `pending`: all pending requests where this user is the recipient
 *
 * @param username - The username to look up
 * @returns A FriendListInfo object
 */
export async function getFriendList(username: string): Promise<FriendListInfo> {
  const allKeys = await FriendRepo.getAllKeys();

  const friends: FriendRequestInfo[] = [];
  const pending: FriendRequestInfo[] = [];

  await Promise.all(
    allKeys.map(async (key) => {
      const record = await FriendRepo.get(key);
      const involves = record.from === username || record.to === username;
      if (!involves) return;

      const info = await populateFriendRequestInfo(key);

      if (record.status === "accepted") {
        friends.push(info);
      } else if (record.status === "pending" && record.to === username) {
        pending.push(info);
      }
    }),
  );

  return { friends, pending };
}

/**
 * Returns the friendship status between two users, or null if no relationship
 * exists.
 *
 * @param usernameA - First username
 * @param usernameB - Second username
 * @returns The FriendRequestInfo if a relationship exists, otherwise null
 */
export async function getFriendshipStatus(
  usernameA: string,
  usernameB: string,
): Promise<FriendRequestInfo | null> {
  const allKeys = await FriendRepo.getAllKeys();

  for (const key of allKeys) {
    const record = await FriendRepo.get(key);
    const involves =
      (record.from === usernameA && record.to === usernameB) ||
      (record.from === usernameB && record.to === usernameA);
    if (involves) {
      return populateFriendRequestInfo(key);
    }
  }

  return null;
}
