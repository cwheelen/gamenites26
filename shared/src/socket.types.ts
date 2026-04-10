/* eslint-disable import/no-duplicates */
import {
  type ChatInfo,
  type ChatMoveLogPayload,
  type ChatNewMessagePayload,
  type ChatUserJoinedPayload,
  type ChatUserLeftPayload,
} from "./chat.types.ts";
import { type NewMessagePayload } from "./message.types.ts";
import { type WithAuth } from "./auth.types.ts";
import { type GameMakeMovePayload, type GamePlayInfo, type TaggedGameView } from "./game.types.ts";
import { type SafeUserInfo } from "./user.types.ts";
import { type MessageInfo } from "./message.types.ts";
import type { InviteInfo } from "./invite.type.ts";

/**
 * Payload sent to all players/watchers when a game's pause state changes.
 * - `gameId`: the affected game
 * - `isPaused`: whether the game is currently paused
 * - `pausedBy`: the username of the player who paused, or null if not paused
 * - `timeoutAt`: ISO timestamp when the pauser will be auto-forfeited, or null if not paused
 */
export interface GamePauseStatePayload {
  gameId: string;
  isPaused: boolean;
  pausedBy: string | null;
  timeoutAt: string | null;
}

/**
 * The Socket.io interface for client to server communication
 */
export interface ClientToServerEvents {
  chatJoin: (payload: WithAuth<string>) => void;
  chatLeave: (payload: WithAuth<string>) => void;
  chatSendMessage: (payload: WithAuth<NewMessagePayload>) => void;
  gameJoinAsPlayer: (payload: WithAuth<string>) => void;
  gameMakeMove: (payload: WithAuth<GameMakeMovePayload>) => void;
  gameStart: (payload: WithAuth<string>) => void;
  gameWatch: (payload: WithAuth<string>) => void;
  userPresenceConnect: (payload: WithAuth<void>) => void;
  /** Signal that the authenticated player is going away (pauses the game) */
  gamePause: (payload: WithAuth<string>) => void;
  /** Signal that the authenticated player is back (resumes the game) */
  gameResume: (payload: WithAuth<string>) => void;
  gameForfeit: (payload: WithAuth<string>) => void; //gameId
}

/**
 * The Socket.io interface for server to client information
 */
export interface ServerToClientEvents {
  chatJoined: (payload: ChatInfo) => void;
  chatMoveLog: (payload: ChatMoveLogPayload) => void;
  chatNewMessage: (payload: ChatNewMessagePayload) => void;
  chatUserJoined: (payload: ChatUserJoinedPayload) => void;
  chatUserLeft: (payload: ChatUserLeftPayload) => void;
  dmNotification: (payload: {
    fromUsername: string;
    fromDisplay: string;
    message: MessageInfo;
  }) => void;
  gamePlayersUpdated: (payload: SafeUserInfo[]) => void;
  gameStateUpdated: (payload: TaggedGameView & { forPlayer: boolean }) => void;
  gameWatched: (payload: GamePlayInfo) => void;
  userStatusChanged: (payload: { user: SafeUserInfo; status: "online" | "offline" }) => void;
  gameInviteReceived: (payload: InviteInfo) => void;
  /** Broadcast whenever a game is paused or resumed */
  gamePauseStateChanged: (payload: GamePauseStatePayload) => void;
  /** Broadcast when a paused player's timeout expires and they are forfeited */
  gameTimedOut: (payload: { gameId: string; forfeitedPlayer: string }) => void;
  gameForfeited: (payload: { gameId: string; forfeitingPlayer: string }) => void;
}
