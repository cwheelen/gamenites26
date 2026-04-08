import { type GameInfo, withAuth, zGameKey, zGameMakeMovePayload } from "@gamenite/shared";
import { type RestAPI, type GameViewUpdates, type SocketAPI, type GameServer } from "../types.ts";
import {
  createGame,
  gameServices,
  getGameById,
  getGames,
  joinGame,
  startGame,
  updateGame,
  viewGame,
} from "../services/game.service.ts";
import { addMoveLogToChat } from "../services/chat.service.ts";
import { z } from "zod";
import { logSocketError } from "./socket.controller.ts";
import { checkAuth, enforceAuth } from "../services/auth.service.ts";
import { isGamePaused } from "./pause.controller.ts";

const zCreateGamePayload = z.object({
  gameKey: zGameKey,
  vsBot: z.boolean().optional().default(false),
  numBots: z.number().int().min(1).max(4).optional(),
});

/**
 * Handle POST requests to `/api/game/create` by creating a game.
 */
export const postCreate: RestAPI<GameInfo> = async (req, res) => {
  const body = withAuth(z.unknown()).safeParse(req.body);
  if (body.error) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const rawPayload = body.data.payload;
  let gameKeyStr: string;
  let vsBot = false;
  let numBots: number | undefined = undefined;

  if (typeof rawPayload === "string") {
    gameKeyStr = rawPayload;
  } else {
    const parsed = zCreateGamePayload.safeParse(rawPayload);
    if (parsed.error) {
      res.status(400).send({ error: "Poorly-formed request" });
      return;
    }
    gameKeyStr = parsed.data.gameKey;
    vsBot = parsed.data.vsBot;
    numBots = parsed.data.numBots;
  }

  const gameKeyParsed = zGameKey.safeParse(gameKeyStr);
  if (gameKeyParsed.error) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  if (gameKeyParsed.data === "guess" && vsBot) {
    const game = await createGame(user, gameKeyParsed.data, new Date(), vsBot, numBots ?? 1);
    res.send(game);
    return;
  }
  const game = await createGame(user, gameKeyParsed.data, new Date(), vsBot);
  res.send(game);
};

/**
 * Handle GET requests to `/api/game/:id`.
 */
export const getById: RestAPI<GameInfo, { id: string }> = async (req, res) => {
  const game = await getGameById(req.params.id);
  if (!game) {
    res.status(404).send({ error: "Game not found" });
    return;
  }
  res.send(game);
};

/**
 * Handle GET requests to `/api/game/list`.
 */
export const getList: RestAPI<GameInfo[]> = async (req, res) => {
  res.send(await getGames());
};

function userRoom(gameId: string, user: string) {
  return `${gameId}-${user}`;
}

export const socketWatch: SocketAPI = (socket) => async (body) => {
  try {
    const { auth, payload: gameId } = withAuth(z.string()).parse(body);
    const user = await enforceAuth(auth);
    const { isPlayer, view, players } = await viewGame(gameId, user);
    const roomsToJoin = isPlayer ? [gameId, userRoom(gameId, user.userId)] : [gameId];
    await socket.join(roomsToJoin);
    socket.emit("gameWatched", { gameId, view, players });
  } catch (err) {
    logSocketError(socket, err);
  }
};

function sendViewUpdates(io: GameServer, gameId: string, updates: GameViewUpdates) {
  io.to(gameId).emit("gameStateUpdated", { ...updates.watchers, forPlayer: false });
  for (const { userId, view } of updates.players) {
    io.to(userRoom(gameId, userId)).emit("gameStateUpdated", { ...view, forPlayer: true });
  }
}

export const socketJoinAsPlayer: SocketAPI = (socket, io) => async (body) => {
  try {
    const { auth, payload: gameId } = withAuth(z.string()).parse(body);
    const user = await enforceAuth(auth);
    const game = await joinGame(gameId, user);

    io.to(gameId).emit("gamePlayersUpdated", game.players);

    if (!socket.rooms.has(userRoom(gameId, user.userId))) {
      await socket.join(userRoom(gameId, user.userId));
    }

    if (game.players.length === gameServices[game.type].maxPlayers) {
      sendViewUpdates(io, gameId, await startGame(gameId, user));
    }
  } catch (err) {
    logSocketError(socket, err);
  }
};

export const socketStart: SocketAPI = (socket, io) => async (body) => {
  try {
    const { auth, payload: gameId } = withAuth(z.string()).parse(body);
    const user = await enforceAuth(auth);
    sendViewUpdates(io, gameId, await startGame(gameId, user));
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handle a request to make a move in a game.
 * Moves are blocked if the game is currently paused.
 */
export const socketMakeMove: SocketAPI = (socket, io) => async (body) => {
  try {
    const {
      auth,
      payload: { gameId, move },
    } = withAuth(zGameMakeMovePayload).parse(body);
    const user = await enforceAuth(auth);

    // Block moves while the game is paused
    if (isGamePaused(gameId)) {
      logSocketError(socket, new Error(`${user.username} tried to move in a paused game`));
      return;
    }

    const { views, moveLog, chatId } = await updateGame(gameId, user, move);
    sendViewUpdates(io, gameId, views);

    const now = new Date();
    for (const { moveDescription, userId } of moveLog) {
      const logUser =
        userId === user.userId ? user : { userId, username: "Unknown", display: "Unknown" };
      const moveLogPayload = await addMoveLogToChat(chatId, moveDescription, logUser, now);
      io.to(chatId).emit("chatMoveLog", moveLogPayload);
    }
  } catch (err) {
    logSocketError(socket, err);
  }
};
