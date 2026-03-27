import { z } from "zod";

/**
 * Represents a direct message conversation as exposed to the client.
 * - `dmId`: database key for the DirectMessageRecord
 * - `chatId`: the underlying chat the two users share
 * - `userA`: one participant (alphabetically first username)
 * - `userB`: the other participant
 */
export interface DirectMessageInfo {
  dmId: string;
  chatId: string;
  userA: string;
  userB: string;
}

/*** TYPES USED IN THE DM API ***/

/**
 * Payload for opening or creating a DM conversation with another user.
 */
export type DMOpenPayload = z.infer<typeof zDMOpenPayload>;
export const zDMOpenPayload = z.object({
  with: z.string(), // the other user's username
});
