import { z } from "zod";

/**
 * Represents the block status between two users as exposed to the client.
 * - `blockId`: database key
 * - `blocker`: username of the user who issued the block
 * - `blocked`: username of the user who was blocked
 * - `createdAt`: when the block was created
 */
export interface BlockInfo {
  blockId: string;
  blocker: string;
  blocked: string;
  createdAt: Date;
}

/*** TYPES USED IN THE BLOCK API ***/

export type BlockPayload = z.infer<typeof zBlockPayload>;
export const zBlockPayload = z.object({
  username: z.string(), // the user to block or unblock
});
