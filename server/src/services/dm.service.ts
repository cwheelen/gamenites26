import type { DirectMessageInfo } from "@gamenite/shared";
import { DirectMessageRepo } from "../repository.ts";
import { createChat } from "./chat.service.ts";
import { eitherBlocked } from "./block.service.ts";

/**
 * Returns a stable key for a pair of usernames by sorting them
 * alphabetically. This ensures (alice, bob) and (bob, alice) always
 * resolve to the same conversation.
 */
function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * Finds an existing DM conversation between two users, or creates one
 * if none exists yet. Returns an error if either user has blocked the other.
 *
 * @param usernameA - One participant
 * @param usernameB - The other participant
 * @returns The DirectMessageInfo for the conversation, or an error message
 */
export async function getOrCreateDM(
  usernameA: string,
  usernameB: string,
): Promise<DirectMessageInfo | { error: string }> {
  // Enforce block in both directions before doing anything
  if (await eitherBlocked(usernameA, usernameB)) {
    return { error: "You cannot message this user" };
  }

  const [userA, userB] = sortedPair(usernameA, usernameB);

  // Search for an existing DM between these two users
  const allKeys = await DirectMessageRepo.getAllKeys();
  for (const key of allKeys) {
    const record = await DirectMessageRepo.get(key);
    if (record.userA === userA && record.userB === userB) {
      return { dmId: key, chatId: record.chatId, userA, userB };
    }
  }

  // None found — create a new chat and DM record
  const chat = await createChat(new Date());
  const dmId = await DirectMessageRepo.add({
    userA,
    userB,
    chatId: chat.chatId,
    createdAt: new Date().toISOString(),
  });

  return { dmId, chatId: chat.chatId, userA, userB };
}
