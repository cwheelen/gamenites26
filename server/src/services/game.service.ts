import {
  type GameInfo,
  type GameKey,
  type TaggedGameView,
  type Connect4State,
} from "@gamenite/shared";
import { createChat } from "./chat.service.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import { type GameServicer } from "../games/gameServiceManager.ts";
import { nimGameService } from "../games/nim.ts";
import { guessGameService } from "../games/guess.ts";
import { connect4GameService, getBotMove, BOT_USER_ID } from "../games/connect4.ts";
import { battleshipGameService } from "../games/battleship.ts";
import { checkersGameService } from "../games/checkers.ts";
import { type GameViewUpdates, type UserWithId } from "../types.ts";
import { GameRepo } from "../repository.ts";
import { updateLeaderboard } from "./leaderboard.service.ts";

/**
 * The service interface for individual games
 */
export const gameServices: { [key in GameKey]: GameServicer } = {
  nim: nimGameService,
  guess: guessGameService,
  connect4: connect4GameService,
  battleship: battleshipGameService,
  checkers: checkersGameService,
};

// ... rest of file unchanged below this point ...

/**
 * Expand a stored game.
 * The bot sentinel ID is excluded from the players list sent to clients.
 */
async function populateGameInfo(gameId: string): Promise<GameInfo> {
  const game = await GameRepo.get(gameId);
  return {
    gameId,
    createdBy: await populateSafeUserInfo(game.createdBy),
    chat: game.chat,
    createdAt: new Date(game.createdAt),
    // ← filter out the bot before populating — it has no User record
    players: await Promise.all(
      game.players.filter((id) => id !== BOT_USER_ID).map(populateSafeUserInfo),
    ),
    type: game.type,
    status: !game.state ? "waiting" : game.done ? "done" : "active",
    minPlayers: gameServices[game.type].minPlayers,
  };
}

/**
 * Create and store a new game.
 *
 * @param user - Initial player in the game's waiting room
 * @param type - Game key
 * @param createdAt - Creation time for this game
 * @param vsBot - If true (Connect 4 only), add the CPU as player 1 and start immediately
 * @returns the new game's info object
 */
export async function createGame(
  user: UserWithId,
  type: GameKey,
  createdAt: Date,
  vsBot = false, // ← new parameter
): Promise<GameInfo> {
  const chat = await createChat(createdAt);

  // For bot games the players array is [human, bot] from the start
  const players = vsBot && type === "connect4" ? [user.userId, BOT_USER_ID] : [user.userId];

  const gameId = await GameRepo.add({
    type,
    done: false,
    chat: chat.chatId,
    createdAt: createdAt.toISOString(),
    createdBy: user.userId,
    players,
  });

  // Bot games skip the waiting room — initialise state immediately
  if (vsBot && type === "connect4") {
    const game = await GameRepo.get(gameId);
    const { state } = gameServices[type].create(players);
    game.state = state;
    await GameRepo.set(gameId, game);
  }

  return populateGameInfo(gameId);
}

/**
 * Retrieves a single game from the database.
 */
export async function getGameById(gameId: string): Promise<GameInfo | null> {
  const game = await GameRepo.find(gameId);
  if (!game) return null;
  return populateGameInfo(gameId);
}

/**
 * Adds a user to a game that hasn't started yet.
 */
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

/**
 * Initializes a game that hasn't started yet.
 */
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

/**
 * Get a list of all games.
 */
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

/**
 * Updates a game state and returns the necessary view updates.
 * When it's a bot game and the human's move leaves it as the bot's turn,
 * the bot move is computed and applied here before returning.
 */
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

  // Update leaderboard if the game just finished (skip the bot sentinel)
  if (!wasDone && game.done) {
    const winners = gameServices[game.type].getWinners(game.state);
    for (let i = 0; i < game.players.length; i++) {
      const playerUserId = game.players[i];
      if (playerUserId === BOT_USER_ID) continue; // ← new: bot has no leaderboard entry
      const won = winners.includes(i);
      await updateLeaderboard(playerUserId, game.type, won);
    }
  }

  // Bot code
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

      // Update leaderboard if the bot's move ended the game
      if (!wasDone && game.done) {
        const winners = gameServices[game.type].getWinners(game.state);
        for (let i = 0; i < game.players.length; i++) {
          const playerUserId = game.players[i];
          if (playerUserId === BOT_USER_ID) continue;
          await updateLeaderboard(playerUserId, game.type, winners.includes(i));
        }
      }

      // Return the bot's views
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

/**
 * View a game as a specific user.
 */
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
      game.players.filter((id) => id !== BOT_USER_ID).map(populateSafeUserInfo),
    ),
  };
}
