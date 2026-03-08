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
  from: z.string(),
  to: z.string(),
});
