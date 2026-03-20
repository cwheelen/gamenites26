/**
 * A basic error object containing a message.
 *
 * Check for this type with the TypeScript conditional `if ('error' in obj)`
 */
export interface ErrorMsg {
  error: string;
}

export * from "./auth.types.ts";
export * from "./block.types.ts";
export * from "./chat.types.ts";
export * from "./comment.types.ts";
export * from "./dm.types.ts";
export * from "./friend.types.ts";
export * from "./game.types.ts";
export * from "./message.types.ts";
export * from "./socket.types.ts";
export * from "./thread.types.ts";
export * from "./user.types.ts";

// this export had to be a little different because of the API
export {
  type FriendInfo,
  type FriendRequestInfo as LegacyFriendRequestInfo,
  type CreateFriendRequest,
  zCreateFriendRequest,
  type UpdateFriendRequest,
  zUpdateFriendRequest,
  type CreateFriend,
  zCreateFriend,
} from "./friends.type.ts";
