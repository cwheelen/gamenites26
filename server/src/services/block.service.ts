import type { BlockInfo } from "@gamenite/shared";
import { BlockRepo } from "../repository.ts";

/**
 * Finds an existing block record between two users in either direction.
 *
 * @param blocker - The username of the person who blocked
 * @param blocked - The username of the person who was blocked
 * @returns The block's key and record, or null if no block exists
 */
async function findBlock(
  blocker: string,
  blocked: string,
): Promise<{
  key: string;
  record: { blocker: string; blocked: string; createdAt: string };
} | null> {
  const allKeys = await BlockRepo.getAllKeys();
  for (const key of allKeys) {
    const record = await BlockRepo.get(key);
    // Skip soft-deleted tombstone records
    if (!record.blocker || !record.blocked) continue;
    if (record.blocker === blocker && record.blocked === blocked) {
      return { key, record };
    }
  }
  return null;
}

/**
 * Checks whether `blockerUsername` has blocked `blockedUsername`.
 * This is directional — only returns true if blocker → blocked, not
 * the other way around.
 *
 * @param blockerUsername - The potential blocker
 * @param blockedUsername - The potentially blocked user
 * @returns true if the block exists
 */
export async function isBlocked(
  blockerUsername: string,
  blockedUsername: string,
): Promise<boolean> {
  const block = await findBlock(blockerUsername, blockedUsername);
  return block !== null;
}

/**
 * Checks whether either user has blocked the other.
 *
 * @param usernameA - One user
 * @param usernameB - The other user
 * @returns true if any block exists between the two users
 */
export async function eitherBlocked(usernameA: string, usernameB: string): Promise<boolean> {
  return (await isBlocked(usernameA, usernameB)) || (await isBlocked(usernameB, usernameA));
}

/**
 * Creates a block from `blockerUsername` → `blockedUsername`.
 * Returns an error string if the block already exists or the user
 * is trying to block themselves.
 *
 * @param blockerUsername - The user issuing the block
 * @param blockedUsername - The user being blocked
 * @returns BlockInfo or an error message
 */
export async function blockUser(
  blockerUsername: string,
  blockedUsername: string,
): Promise<BlockInfo | { error: string }> {
  if (blockerUsername === blockedUsername) {
    return { error: "You cannot block yourself" };
  }

  const existing = await findBlock(blockerUsername, blockedUsername);
  if (existing) {
    return { error: "You have already blocked this user" };
  }

  const blockId = await BlockRepo.add({
    blocker: blockerUsername,
    blocked: blockedUsername,
    createdAt: new Date().toISOString(),
  });

  return {
    blockId,
    blocker: blockerUsername,
    blocked: blockedUsername,
    createdAt: new Date(),
  };
}

/**
 * Removes a block from `blockerUsername` → `blockedUsername`.
 * Returns an error string if no such block exists.
 *
 * @param blockerUsername - The user who issued the block
 * @param blockedUsername - The user who was blocked
 * @returns BlockInfo of the removed block, or an error message
 */
export async function unblockUser(
  blockerUsername: string,
  blockedUsername: string,
): Promise<BlockInfo | { error: string }> {
  const existing = await findBlock(blockerUsername, blockedUsername);
  if (!existing) {
    return { error: "No block found between these users" };
  }

  const info: BlockInfo = {
    blockId: existing.key,
    blocker: existing.record.blocker,
    blocked: existing.record.blocked,
    createdAt: new Date(existing.record.createdAt),
  };

  // The Repo interface has no delete method, so we soft-delete by overwriting
  // with empty strings that findBlock skips (it requires both fields non-empty).
  await BlockRepo.set(existing.key, {
    blocker: "",
    blocked: "",
    createdAt: existing.record.createdAt,
  });

  return info;
}

/**
 * Returns the block status from the perspective of `viewerUsername`
 * looking at `targetUsername`.
 *
 * - `blockedByMe`: viewer has blocked target
 * - `blockedByThem`: target has blocked viewer
 *
 * @param viewerUsername - The logged-in user
 * @param targetUsername - The profile being viewed
 */
export async function getBlockStatus(
  viewerUsername: string,
  targetUsername: string,
): Promise<{ blockedByMe: boolean; blockedByThem: boolean }> {
  const [blockedByMe, blockedByThem] = await Promise.all([
    isBlocked(viewerUsername, targetUsername),
    isBlocked(targetUsername, viewerUsername),
  ]);
  return { blockedByMe, blockedByThem };
}
