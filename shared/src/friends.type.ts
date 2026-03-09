import type { SafeUserInfo } from "./user.types.ts";
import { z } from "zod";

export interface FriendInfo {
  friendId: string;
  user: SafeUserInfo;
  friend: SafeUserInfo;
  createdAt: Date;
}

export interface FriendRequestInfo {
  friendRequestId: string;
  from: SafeUserInfo;
  to: SafeUserInfo;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

export type CreateFriendRequest = z.infer<typeof zCreateFriendRequest>;
export const zCreateFriendRequest = z.object({
  to: z.string(),
});

export type UpdateFriendRequest = z.infer<typeof zUpdateFriendRequest>;
export const zUpdateFriendRequest = z.object({
  status: z.enum(["accepted", "rejected"]),
  id: z.string(),
});
