import { withAuth } from "@gamenite/shared";
import { z } from "zod";
import { type SocketAPI, type GameServer } from "../types.ts";
import { enforceAuth } from "../services/auth.service.ts";
import { logSocketError } from "./socket.controller.ts";
import { GameRepo } from "../repository.ts";
import { updateLeaderboard } from "../services/leaderboard.service.ts";
import { type GamePauseStatePayload } from "@gamenite/shared";

const PAUSE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

/**
 * In-memory map of active pause timers keyed by gameId.
 * Each entry holds:
 * - `timer`: the Node.js timeout handle (so we can cancel it on resume)
 * - `pausedByIndex`: the player index who paused (for forfeit logic)
 * - `pausedByUsername`: the username of the paused player (for broadcast)
 * - `timeoutAt`: ISO string of when the timeout fires
 */
const pauseTimers = new Map<
  string,
  {
    timer: ReturnType<typeof setTimeout>;
    pausedByIndex: number;
    pausedByUsername: string;
    timeoutAt: string;
  }
>();

/**
 * Broadcasts the current pause state of a game to all players and watchers
 * in the game's socket room.
 */
function broadcastPauseState(io: GameServer, gameId: string, payload: GamePauseStatePayload) {
  io.to(gameId).emit("gamePauseStateChanged", payload);
}

/**
 * Handles the timeout expiry for a paused game.
 * Marks the game as done, updates the leaderboard, and notifies all clients.
 */
async function handlePauseTimeout(io: GameServer, gameId: string) {
  const entry = pauseTimers.get(gameId);
  if (!entry) return;
  pauseTimers.delete(gameId);

  const game = await GameRepo.find(gameId);
  if (!game || game.done) return; // game already finished normally

  const forfeitedIndex = entry.pausedByIndex;
  const winnerIndex = 1 - forfeitedIndex;

  // Mark the game as done in the DB
  game.done = true;
  await GameRepo.set(gameId, game);

  // Update leaderboard
  for (let i = 0; i < game.players.length; i++) {
    await updateLeaderboard(game.players[i], game.type, i === winnerIndex);
  }

  // Notify all clients
  io.to(gameId).emit("gameTimedOut", {
    gameId,
    forfeitedPlayer: entry.pausedByUsername,
  });

  // Also clear the pause state banner
  broadcastPauseState(io, gameId, {
    gameId,
    isPaused: false,
    pausedBy: null,
    timeoutAt: null,
  });
}

/**
 * Handle `gamePause` — a player signals they are going away.
 *
 * Rules:
 * - Only active players in an active (not-done) game can pause.
 * - A game can only be paused once at a time.
 * - Starts a 2-minute forfeit timer.
 */
export const socketPause: SocketAPI = (socket, io) => async (body) => {
  try {
    const { auth, payload: gameId } = withAuth(z.string()).parse(body);
    const user = await enforceAuth(auth);

    const game = await GameRepo.find(gameId);
    if (!game) throw new Error(`${user.username} paused invalid game`);
    if (!game.state || game.done)
      throw new Error(`${user.username} paused a finished/unstarted game`);

    const playerIndex = game.players.findIndex((id) => id === user.userId);
    if (playerIndex < 0) throw new Error(`${user.username} paused a game they aren't in`);

    // Already paused — ignore duplicate pause requests
    if (pauseTimers.has(gameId)) return;

    const timeoutAt = new Date(Date.now() + PAUSE_TIMEOUT_MS).toISOString();

    const timer = setTimeout(() => {
      void handlePauseTimeout(io, gameId);
    }, PAUSE_TIMEOUT_MS);

    pauseTimers.set(gameId, {
      timer,
      pausedByIndex: playerIndex,
      pausedByUsername: user.username,
      timeoutAt,
    });

    broadcastPauseState(io, gameId, {
      gameId,
      isPaused: true,
      pausedBy: user.username,
      timeoutAt,
    });
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handle `gameResume` — a player signals they are back.
 *
 * Rules:
 * - Only the player who paused can resume.
 * - Clears the forfeit timer.
 */
export const socketResume: SocketAPI = (socket, io) => async (body) => {
  try {
    const { auth, payload: gameId } = withAuth(z.string()).parse(body);
    const user = await enforceAuth(auth);

    const entry = pauseTimers.get(gameId);
    if (!entry) return; // not paused, nothing to do

    // Only the player who paused can resume
    if (entry.pausedByUsername !== user.username) {
      throw new Error(
        `${user.username} tried to resume a game paused by ${entry.pausedByUsername}`,
      );
    }

    clearTimeout(entry.timer);
    pauseTimers.delete(gameId);

    broadcastPauseState(io, gameId, {
      gameId,
      isPaused: false,
      pausedBy: null,
      timeoutAt: null,
    });
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Returns true if the given game is currently paused.
 * Used by the move handler to block moves while paused.
 */
export function isGamePaused(gameId: string): boolean {
  return pauseTimers.has(gameId);
}
