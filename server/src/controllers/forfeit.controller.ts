import { withAuth } from "@gamenite/shared";
import type { SocketAPI } from "../types.ts";
import { enforceAuth } from "../services/auth.service.ts";
import { z } from "zod";
import { logSocketError } from "./socket.controller.ts";
import { forfeitGame } from "../services/game.service.ts";

/**
 * Handle `gameForfeit` — a player voluntarily forfeits the game.
 *
 * Rules:
 * - Only an active player in an active (started, not-done) game can forfeit.
 * - The forfeiting player loses; all other non-bot players win.
 * - Emits `gameForfeited` to all watchers/players in the game room.
 */
export const socketForfeit: SocketAPI = (socket, io) => async (body) => {
  try {
    const { auth, payload: gameId } = withAuth(z.string()).parse(body);
    const user = await enforceAuth(auth);

    const forfeitingPlayer = await forfeitGame(gameId, user);

    io.to(gameId).emit("gameForfeited", { gameId, forfeitingPlayer });
  } catch (err) {
    logSocketError(socket, err);
  }
};
