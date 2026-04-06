/* eslint-disable @typescript-eslint/naming-convention */
import {
  type GameInfo,
  type GameKey,
  type TaggedGameView,
  type Connect4State,
  type CheckersState,
  type BattleshipState,
} from "@gamenite/shared";
import { createChat } from "./chat.service.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import { type GameServicer } from "../games/gameServiceManager.ts";
import { nimGameService } from "../games/nim.ts";
import { guessGameService } from "../games/guess.ts";
import { connect4GameService, getBotMove, BOT_USER_ID } from "../games/connect4.ts";
import {
  battleshipGameService,
  getBattleshipBotPlacement,
  getBattleshipBotShot,
  BATTLESHIP_BOT_USER_ID,
} from "../games/battleship.ts";
import {
  checkersGameService,
  getCheckersBotMove,
  CHECKERS_BOT_USER_ID,
} from "../games/checkers.ts";
import { type GameViewUpdates, type UserWithId } from "../types.ts";
import { GameRepo } from "../repository.ts";
import { updateLeaderboard } from "./leaderboard.service.ts";

export const gameServices: { [key in GameKey]: GameServicer } = {
  nim: nimGameService,
  guess: guessGameService,
  connect4: connect4GameService,
  battleship: battleshipGameService,
  checkers: checkersGameService,
};

const BOT_IDS = new Set([BOT_USER_ID, CHECKERS_BOT_USER_ID, BATTLESHIP_BOT_USER_ID]);

async function populateGameInfo(gameId: string): Promise<GameInfo> {
  const game = await GameRepo.get(gameId);
  return {
    gameId,
    createdBy: await populateSafeUserInfo(game.createdBy),
    chat: game.chat,
    createdAt: new Date(game.createdAt),
    players: await Promise.all(
      game.players.filter((id) => !BOT_IDS.has(id)).map(populateSafeUserInfo),
    ),
    type: game.type,
    status: !game.state ? "waiting" : game.done ? "done" : "active",
    minPlayers: gameServices[game.type].minPlayers,
  };
}

export async function createGame(
  user: UserWithId,
  type: GameKey,
  createdAt: Date,
  vsBot = false,
): Promise<GameInfo> {
  const chat = await createChat(createdAt);

  const botId =
    vsBot && type === "connect4"
      ? BOT_USER_ID
      : vsBot && type === "checkers"
        ? CHECKERS_BOT_USER_ID
        : vsBot && type === "battleship"
          ? BATTLESHIP_BOT_USER_ID
          : null;

  const players = botId ? [user.userId, botId] : [user.userId];

  const gameId = await GameRepo.add({
    type,
    done: false,
    chat: chat.chatId,
    createdAt: createdAt.toISOString(),
    createdBy: user.userId,
    players,
  });

  if (botId) {
    const game = await GameRepo.get(gameId);
    const { state } = gameServices[type].create(players);
    game.state = state;
    await GameRepo.set(gameId, game);
  }

  return populateGameInfo(gameId);
}

export async function getGameById(gameId: string): Promise<GameInfo | null> {
  const game = await GameRepo.find(gameId);
  if (!game) return null;
  return populateGameInfo(gameId);
}

export async function joinGame(gameId: string, user: UserWithId): Promise<GameInfo> {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} joining invalid game`);
  if (game.state) {
    throw new Error(`user ${user.username} joining game that started`);
  }
  if (game.players.some((userId) => userId === user.userId)) {
    throw new Error(`user ${user.username} joining game they are in already`);
  }
  if (game.players.length === gameServices[game.type].maxPlayers) {
    throw new Error(`user ${user.username} joining full`);
  }

  game.players = [...game.players, user.userId];
  await GameRepo.set(gameId, game);

  return populateGameInfo(gameId);
}

export async function startGame(gameId: string, user: UserWithId): Promise<GameViewUpdates> {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} starting invalid game`);
  if (game.state) {
    throw new Error(`user ${user.username} starting game that started`);
  }

  const key: GameKey = game.type;

  if (game.players.length < gameServices[key].minPlayers) {
    throw new Error(`user ${user.username} starting underpopulated game`);
  }
  if (!game.players.some((userId) => userId === user.userId)) {
    throw new Error(`user ${user.username} starting game they're not in`);
  }
  const { state, views } = gameServices[key].create(game.players);

  game.state = state;
  await GameRepo.set(gameId, game);

  return Promise.resolve(views);
}

export async function getGames(): Promise<GameInfo[]> {
  const keys = await GameRepo.getAllKeys();
  const unsorted = await Promise.all(keys.map(populateGameInfo));
  return unsorted.toSorted((game1, game2) => game2.createdAt.getTime() - game1.createdAt.getTime());
}

export interface GameUpdateResult {
  views: GameViewUpdates;
  moveDescription: string;
  chatId: string;
}

export async function updateGame(
  gameId: string,
  user: UserWithId,
  move: unknown,
): Promise<GameUpdateResult> {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} acted on an invalid game`);
  if (!game.state) {
    throw new Error(`user ${user.username} made a move in game of that hadn't started`);
  }
  const playerIndex = game.players.findIndex((userId) => userId === user.userId);
  if (playerIndex < 0) {
    throw new Error(`user ${user.username} made a move in a game they weren't playing`);
  }

  const wasDone = game.done;
  const result = gameServices[game.type].update(game.state, move, playerIndex, game.players);
  if (!result) throw new Error(`user ${user.username} made an invalid move in ${game.type}`);

  game.state = result.state;
  game.done = game.done || result.done;
  await GameRepo.set(gameId, game);

  if (!wasDone && game.done) {
    const winners = gameServices[game.type].getWinners(game.state);
    for (let i = 0; i < game.players.length; i++) {
      const playerUserId = game.players[i];
      if (BOT_IDS.has(playerUserId)) continue;
      const won = winners.includes(i);
      await updateLeaderboard(playerUserId, game.type, won);
    }
  }

  if (
    !game.done &&
    game.type === "connect4" &&
    game.players[(result.state as Connect4State).nextPlayer] === BOT_USER_ID
  ) {
    const botIndex = (result.state as Connect4State).nextPlayer;
    const botCol = getBotMove((result.state as Connect4State).board);
    const botResult = gameServices["connect4"].update(game.state, botCol, botIndex, game.players);

    if (botResult) {
      game.state = botResult.state;
      game.done = game.done || botResult.done;
      await GameRepo.set(gameId, game);

      if (!wasDone && game.done) {
        const winners = gameServices[game.type].getWinners(game.state);
        for (let i = 0; i < game.players.length; i++) {
          const playerUserId = game.players[i];
          if (BOT_IDS.has(playerUserId)) continue;
          await updateLeaderboard(playerUserId, game.type, winners.includes(i));
        }
      }

      return {
        views: botResult.views,
        moveDescription: result.moveDescription,
        chatId: game.chat,
      };
    }
  }

  if (
    !game.done &&
    game.type === "checkers" &&
    game.players[(result.state as CheckersState).nextPlayer] === CHECKERS_BOT_USER_ID
  ) {
    const botIndex = (result.state as CheckersState).nextPlayer;
    const botMove = getCheckersBotMove((result.state as CheckersState).board, botIndex);
    const botResult = gameServices["checkers"].update(game.state, botMove, botIndex, game.players);

    if (botResult) {
      game.state = botResult.state;
      game.done = game.done || botResult.done;
      await GameRepo.set(gameId, game);

      if (!wasDone && game.done) {
        const winners = gameServices[game.type].getWinners(game.state);
        for (let i = 0; i < game.players.length; i++) {
          const playerUserId = game.players[i];
          if (BOT_IDS.has(playerUserId)) continue;
          await updateLeaderboard(playerUserId, game.type, winners.includes(i));
        }
      }

      return {
        views: botResult.views,
        moveDescription: result.moveDescription,
        chatId: game.chat,
      };
    }
  }

  // bot code

  if (
    !game.done &&
    game.type === "battleship" &&
    game.players[(result.state as BattleshipState).nextPlayer] === BATTLESHIP_BOT_USER_ID
  ) {
    const botState = result.state as BattleshipState;
    const botIndex = botState.nextPlayer;

    let botMove: unknown;
    if (botState.phase === "placing") {
      botMove = { type: "place", ships: getBattleshipBotPlacement() };
    } else {
      const shot = getBattleshipBotShot(botState, botIndex);
      botMove = { type: "shoot", ...shot };
    }

    const botResult = gameServices["battleship"].update(
      game.state,
      botMove,
      botIndex,
      game.players,
    );

    if (botResult) {
      game.state = botResult.state;
      game.done = game.done || botResult.done;
      await GameRepo.set(gameId, game);

      if (!wasDone && game.done) {
        const winners = gameServices[game.type].getWinners(game.state);
        for (let i = 0; i < game.players.length; i++) {
          const playerUserId = game.players[i];
          if (BOT_IDS.has(playerUserId)) continue;
          await updateLeaderboard(playerUserId, game.type, winners.includes(i));
        }
      }

      return {
        views: botResult.views,
        moveDescription: result.moveDescription,
        chatId: game.chat,
      };
    }
  }

  return {
    views: result.views,
    moveDescription: result.moveDescription,
    chatId: game.chat,
  };
}

export async function viewGame(gameId: string, user: UserWithId) {
  const game = await GameRepo.find(gameId);
  if (!game) throw new Error(`user ${user.username} viewed an invalid game id`);
  const playerIndex = game.players.findIndex((userId) => userId === user.userId);
  let view: TaggedGameView | null = null;
  if (game.state) {
    view = gameServices[game.type].view(game.state, playerIndex);
  }
  return {
    isPlayer: playerIndex >= 0,
    view,
    players: await Promise.all(
      game.players.filter((id) => !BOT_IDS.has(id)).map(populateSafeUserInfo),
    ),
  };
}
