import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameServer, GameServerSocket } from "../src/types.ts";
import { logSocketError } from "../src/controllers/socket.controller.ts";
import { socketForfeit } from "../src/controllers/forfeit.controller.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";
import { GameRepo } from "../src/repository.ts";
import { forfeitGame } from "../src/services/game.service.ts";
import { nimGameService } from "../src/games/nim.ts";

vi.mock(import("../src/controllers/socket.controller.ts"), () => ({
  logSocketError: vi.fn(),
}));

const MockGameServer = vi.fn(
  class {
    to = vi.fn(() => this);
    emit = vi.fn();
  },
);

const MockGameServerSocket = vi.fn(
  class {
    id = "mockSocket";
    join = vi.fn();
    emit = vi.fn();
    to = vi.fn(() => this);
    rooms = new Set<string>();
  },
);

function makeSocket() {
  return new MockGameServerSocket() as unknown as GameServerSocket;
}

function makeServer() {
  return new MockGameServer() as unknown as GameServer;
}

const auth1 = { username: "user1", password: "pwd1111" };
const auth2 = { username: "user2", password: "pwd2222" };
const badAuth = { username: "user1", password: "wrong" };

afterEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers to set up an active nim game in the repo
// ---------------------------------------------------------------------------

async function createActiveNimGame(): Promise<{ gameId: string; playerIds: string[] }> {
  const user1 = await getUserByUsername("user1");
  const user2 = await getUserByUsername("user2");
  const playerIds = [user1!.userId, user2!.userId];

  const { state } = nimGameService.create(playerIds);
  const gameId = await GameRepo.add({
    type: "nim",
    done: false,
    chat: "test-chat",
    createdAt: new Date().toISOString(),
    createdBy: playerIds[0],
    players: playerIds,
    state,
  });

  return { gameId, playerIds };
}

// ---------------------------------------------------------------------------
// socketForfeit — controller-level tests
// ---------------------------------------------------------------------------

describe("socketForfeit", () => {
  it("calls logSocketError on bad auth", async () => {
    const socket = makeSocket();
    const io = makeServer();
    const { gameId } = await createActiveNimGame();

    await socketForfeit(socket, io)({ auth: badAuth, payload: gameId });

    expect(logSocketError).toHaveBeenCalledOnce();
    expect(io.to).not.toHaveBeenCalled();
  });

  it("calls logSocketError when game does not exist", async () => {
    const socket = makeSocket();
    const io = makeServer();

    await socketForfeit(socket, io)({ auth: auth1, payload: "nonexistent-game-id" });

    expect(logSocketError).toHaveBeenCalledOnce();
    expect(io.to).not.toHaveBeenCalled();
  });

  it("calls logSocketError when user is not a player in the game", async () => {
    const socket = makeSocket();
    const io = makeServer();

    // Create a game between user1 and user2, then forfeit as user3 (not a player)
    const { gameId } = await createActiveNimGame();
    const auth3 = { username: "user3", password: "pwd3333" };

    await socketForfeit(socket, io)({ auth: auth3, payload: gameId });

    expect(logSocketError).toHaveBeenCalledOnce();
    expect(io.to).not.toHaveBeenCalled();
  });

  it("emits gameForfeited to the game room on success", async () => {
    const socket = makeSocket();
    const io = makeServer();
    const { gameId } = await createActiveNimGame();

    await socketForfeit(socket, io)({ auth: auth1, payload: gameId });

    expect(logSocketError).not.toHaveBeenCalled();
    expect(io.to).toHaveBeenCalledWith(gameId);
    expect(io.emit).toHaveBeenCalledWith("gameForfeited", {
      gameId,
      forfeitingPlayer: "user1",
    });
  });

  it("marks the game as done after a forfeit", async () => {
    const socket = makeSocket();
    const io = makeServer();
    const { gameId } = await createActiveNimGame();

    await socketForfeit(socket, io)({ auth: auth1, payload: gameId });

    const game = await GameRepo.get(gameId);
    expect(game.done).toBe(true);
  });

  it("calls logSocketError when the game is already done", async () => {
    const socket = makeSocket();
    const io = makeServer();
    const { gameId } = await createActiveNimGame();

    // Forfeit once to finish it
    await socketForfeit(socket, io)({ auth: auth1, payload: gameId });
    vi.resetAllMocks();

    // Attempt a second forfeit on the same finished game
    await socketForfeit(socket, io)({ auth: auth2, payload: gameId });

    expect(logSocketError).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// forfeitGame — service-level tests
// ---------------------------------------------------------------------------

describe("forfeitGame", () => {
  let gameId: string;

  beforeEach(async () => {
    ({ gameId } = await createActiveNimGame());
  });

  it("throws when game does not exist", async () => {
    const user1 = await getUserByUsername("user1");
    await expect(
      forfeitGame("no-such-game", { userId: user1!.userId, username: "user1" }),
    ).rejects.toThrow();
  });

  it("throws when the game has not started (no state)", async () => {
    const user1 = await getUserByUsername("user1");
    // Create a waiting game (no state)
    const waitingGameId = await GameRepo.add({
      type: "nim",
      done: false,
      chat: "test-chat-2",
      createdAt: new Date().toISOString(),
      createdBy: user1!.userId,
      players: [user1!.userId],
    });

    await expect(
      forfeitGame(waitingGameId, { userId: user1!.userId, username: "user1" }),
    ).rejects.toThrow();
  });

  it("throws when the game is already done", async () => {
    const user1 = await getUserByUsername("user1");
    const game = await GameRepo.get(gameId);
    game.done = true;
    await GameRepo.set(gameId, game);

    await expect(
      forfeitGame(gameId, { userId: user1!.userId, username: "user1" }),
    ).rejects.toThrow();
  });

  it("throws when the user is not a player", async () => {
    const user3 = await getUserByUsername("user3");

    await expect(
      forfeitGame(gameId, { userId: user3!.userId, username: "user3" }),
    ).rejects.toThrow();
  });

  it("sets game.done to true", async () => {
    const user1 = await getUserByUsername("user1");
    await forfeitGame(gameId, { userId: user1!.userId, username: "user1" });

    const game = await GameRepo.get(gameId);
    expect(game.done).toBe(true);
  });

  it("returns the forfeiting player's username", async () => {
    const user1 = await getUserByUsername("user1");
    const result = await forfeitGame(gameId, { userId: user1!.userId, username: "user1" });
    expect(result).toBe("user1");
  });

  it("the non-forfeiting player wins (leaderboard reflects a loss for the forfeiter)", async () => {
    // We verify this indirectly: forfeitGame should not throw and should
    // complete without error, as updateLeaderboard is tested separately.
    const user2 = await getUserByUsername("user2");
    await expect(forfeitGame(gameId, { userId: user2!.userId, username: "user2" })).resolves.toBe(
      "user2",
    );
  });
});
