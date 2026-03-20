import type { GameKey } from "@gamenite/shared";

/**
 * Record identifiers used to look up keys in a database. This type
 * abbreviation is intended to suggest that the key should be a randomly
 * generated unique ID.
 */
export type RecordId = string;

/**
 * Actual JavaScript Date objects can't necessarily be stored in a database;
 * this type indicates that the string should be the result of taking a Date
 * object and turning it to a string with the Date.toISOString() method.
 */
export type DateISO = string;

/**
 * Represents a user's authorization record in the database.
 * - `user`: the user ID of the corresponding User model
 * - `password`: the password for this user
 */
export interface AuthRecord {
  userId: RecordId; // References User models
  password: string;
}

/**
 * Represents a block relationship in the database.
 * - `blocker`: username of the user who issued the block
 * - `blocked`: username of the user who was blocked
 * - `createdAt`: when the block was created
 */
export interface BlockRecord {
  blocker: string;
  blocked: string;
  createdAt: DateISO;
}

/**
 * Represents a chat document in the database.
 * - `messages`: the ordered list of messages in the chat
 * - `moveLog`: the ordered list of move log entries for this chat
 * - `createdAt`: when the chat was created
 */
export interface ChatRecord {
  messages: RecordId[]; // References Message models
  moveLog: MoveLogEntry[];
  createdAt: DateISO;
}

/**
 * Represents a game move log entry stored in a chat.
 * - `moveDescription`: human-readable description of the move
 * - `userId`: the user who made the move
 * - `createdAt`: when the move was made
 */
export interface MoveLogEntry {
  moveDescription: string;
  userId: RecordId;
  createdAt: DateISO;
}

/**
 * Represents a comment in the database.
 * - `text`: comment contents
 * - `createdBy`: username of the commenter
 * - `createdAt`: when the comment was made
 * - `editedAt`: when the comment was last modified
 */
export interface CommentRecord {
  text: string;
  createdBy: RecordId; // References User records
  createdAt: DateISO;
  editedAt?: DateISO;
}

/**
 * Represents a private direct message conversation between two users.
 * - `userA`: one participant (stored as the alphabetically first username)
 * - `userB`: the other participant
 * - `chatId`: the underlying ChatRecord that stores the messages
 * - `createdAt`: when the conversation was first opened
 */
export interface DirectMessageRecord {
  userA: string; // alphabetically first username
  userB: string; // alphabetically second username
  chatId: RecordId; // References Chat records
  createdAt: DateISO;
}

/**
 * Represents a friend request or confirmed friendship in the database.
 * - `from`: username of the user who sent the request
 * - `to`: username of the user who received the request
 * - `status`: whether the request is pending or accepted
 * - `createdAt`: when the request was sent
 */
export interface FriendRecord {
  from: string; // username of sender
  to: string; // username of receiver
  status: "pending" | "accepted";
  createdAt: DateISO;
}

/**
 * Represents a game document in the database.
 * - `type`: picks which game this is
 * - `state`: absent if the game hasn't started, or the id for the game's state
 * - `chat`: id for the game's chat
 * - `players`: active players for the game
 * - `createdAt`: when the game was created
 * - `createdBy`: username of the person who created the game
 */
export interface GameRecord {
  type: GameKey;
  state?: unknown;
  done: boolean;
  chat: RecordId; // References Chat records
  players: RecordId[]; // References User records
  createdAt: DateISO;
  createdBy: RecordId; // References User records
}

/**
 * Represents a leaderboard entry in the database.
 */
export interface LeaderboardRecord {
  userId: RecordId; // References User records
  gameType: GameKey; // Which game this leaderboard entry belongs to
  wins: number;
  losses: number;
  gamesPlayed: number;
  currentStreak: number;
  longestStreak: number;
  lastUpdated: DateISO;
}

/**
 * Represents a message in the database.
 * - `text`: message contents
 * - `createdBy`: username of message sender
 * - `createdAt`: when the message was sent
 */
export interface MessageRecord {
  text: string;
  createdBy: RecordId; // References User records
  createdAt: DateISO;
}

/**
 * Represents a forum post as it's stored in the database.
 * - `title`: post title
 * - `text`: post contents
 * - `createdAt`: when the thread was posted
 * - `createdBy`: username of OP
 * - `comments`: replies to the post
 */
export interface ThreadRecord {
  title: string;
  text: string;
  createdAt: DateISO;
  createdBy: RecordId; // References User records
  comments: RecordId[]; // References Comment records
}

/**
 * Represents a user document in the database.
 * - `password`: user's password
 * - `display`: A display name
 * - `createdAt`: when this user registered.
 */
export interface UserRecord {
  username: string; // References Auth records
  display: string;
  createdAt: DateISO;
}

/**
 * Represents a friend request in the database.
 * - `from`: the user who sent the friend request
 * - `to`: the user who received the friend request
 * - `status`: the current status of the friend request
 * - `createdAt`: when the friend request was sent
 */
export interface FriendRequestRecord {
  from: RecordId; // References User records
  to: RecordId; // References User records
  status: "pending" | "accepted" | "rejected";
  createdAt: DateISO;
}

/**
 * Represents a friendship in the database.
 * - `users`: the two users in the friendship
 * - `createdAt`: when the friendship was established
 */
export interface FriendshipRecord {
  users: [RecordId, RecordId]; // References User records
  createdAt: DateISO;
}
