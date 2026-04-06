import { z } from "zod";
import { type SafeUserInfo } from "./user.types.ts";

/**
 * Represents the status of a friend relationship.
 */
export type FriendStatus = "pending" | "accepted" | "rejected";

/**
 * Represents a friend request or confirmed friendship as exposed to the client.
 * - `requestId`: database key
 * - `from`: the user who sent the request
 * - `to`: the user who received the request
 * - `status`: whether the request is pending or accepted
 * - `createdAt`: when the request was sent
 */
export interface FriendRequestInfo {
  requestId: string;
  from: SafeUserInfo;
  to: SafeUserInfo;
  status: FriendStatus;
  createdAt: Date;
}

/**
 * The response shape for the friends list endpoint.
 * - `friends`: confirmed friends
 * - `pending`: incoming requests that haven't been accepted yet
 */
export interface FriendListInfo {
  friends: FriendRequestInfo[];
  pending: FriendRequestInfo[];
}

/**
 * Payload for sending a friend request.
 */
export type FriendRequestPayload = z.infer<typeof zFriendRequestPayload>;
export const zFriendRequestPayload = z.object({
  to: z.string(),
});

/**
 * Payload for accepting a friend request.
 */
export type FriendAcceptPayload = z.infer<typeof zFriendAcceptPayload>;
export const zFriendAcceptPayload = z.object({
  requestId: z.string(),
});
