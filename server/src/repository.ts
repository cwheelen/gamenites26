import { createRepo } from "./keyv.ts";
import type {
  AuthRecord,
  BlockRecord,
  ChatRecord,
  CommentRecord,
  DirectMessageRecord,
  FriendRecord,
  FriendRequestRecord,
  FriendshipRecord,
  GameRecord,
  LeaderboardRecord,
  MessageRecord,
  ThreadRecord,
  UserRecord,
  InviteRecord,
} from "./models.ts";

export const AuthRepo = createRepo<AuthRecord>("auth");
export const BlockRepo = createRepo<BlockRecord>("block");
export const ChatRepo = createRepo<ChatRecord>("chat");
export const CommentRepo = createRepo<CommentRecord>("comment");
export const DirectMessageRepo = createRepo<DirectMessageRecord>("dm");
export const FriendRepo = createRepo<FriendRecord>("friend");
export const GameRepo = createRepo<GameRecord>("game");
export const LeaderboardRepo = createRepo<LeaderboardRecord>("leaderboard");
export const MessageRepo = createRepo<MessageRecord>("message");
export const ThreadRepo = createRepo<ThreadRecord>("thread");
export const UserRepo = createRepo<UserRecord>("user");
export const FriendRequestRepo = createRepo<FriendRequestRecord>("friend_request");
export const FriendshipRepo = createRepo<FriendshipRecord>("friendship");
export const InviteRepo = createRepo<InviteRecord>("invite");
