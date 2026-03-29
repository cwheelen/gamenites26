import type { SafeUserInfo } from "./user.types.ts";
import { z } from "zod";

export interface InviteInfo {
  inviteId: string;
  gameId: string;
  from: SafeUserInfo;
  to: SafeUserInfo;
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: Date;
}

export type CreateGameInvite = z.infer<typeof zCreateGameInvite>;
export const zCreateGameInvite = z.object({
  gameId: z.string(),
  toUsername: z.string(),
});

export type UpdateGameInvite = z.infer<typeof zUpdateGameInvite>;
export const zUpdateGameInvite = z.object({
  inviteId: z.string(),
  status: z.enum(["accepted", "declined"]),
});
