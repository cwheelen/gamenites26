import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameServer, GameServerSocket } from "../src/types.ts";
import { logSocketError } from "../src/controllers/socket.controller.ts";
import { socketPresenceConnect } from "../src/controllers/user.controller.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";
import { populateSafeUserInfo } from "../src/services/user.service.ts";
import {
  unregisterAndEmitOffline,
  register,
  unregister,
} from "../src/services/presence.service.ts";

// Mock the logSocketError function so we can test error conditions in sockets
vi.mock(import("../src/controllers/socket.controller.ts"), () => {
  return { logSocketError: vi.fn() };
});

/**
 * The mock game server only implements a tiny slice of GameServer,
 * and trying to call other methods will result in an error.
 */
const MockGameServer = vi.fn(
  class {
    to = vi.fn(() => this); // allows chaining
    emit = vi.fn();
  },
);

/**
 * The mock socket server only implements a tiny slice of GameServerSocket,
 * and trying to call other methods will result in an error
 */
const MockGameServerSocket = vi.fn(
  class {
    id = "mockGameServerSocket";
    join = vi.fn();
    emit = vi.fn();
    to = vi.fn(() => this);
  },
);

const auth = { username: "user1", password: "pwd1111" };
const badAuth = { username: "user2", password: "nope" };

afterEach(() => {
  vi.resetAllMocks();
});

function makeSocket(id: string) {
  const socket = new MockGameServerSocket() as unknown as GameServerSocket;
  return socket;
}

describe("socketPresenceConnect", () => {
  it("should check auth and reject invalid auth", async () => {
    const mockServer = new MockGameServer() as unknown as GameServer;
    const mockSocket = makeSocket("presence_bad");

    await socketPresenceConnect(mockSocket, mockServer)({ auth: badAuth, payload: undefined });

    expect(logSocketError).toHaveBeenCalledExactlyOnceWith(mockSocket, new Error("Invalid auth"));
  });

  it("should proceed without errors, join presence room, and emit online to the presence room", async () => {
    const mockServer = new MockGameServer() as unknown as GameServer;
    const mockSocket = makeSocket("presence_online_1");

    const record = await getUserByUsername(auth.username);
    const expectedUser = await populateSafeUserInfo(record!.userId);

    await socketPresenceConnect(mockSocket, mockServer)({ auth, payload: undefined });

    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockSocket.join).toHaveBeenCalledExactlyOnceWith("presence");
    expect(mockServer.to).toHaveBeenCalledExactlyOnceWith("presence");
    expect(mockServer.emit).toHaveBeenCalledExactlyOnceWith("userStatusChanged", {
      user: expectedUser,
      status: "online",
    });

    // Cleanup presence state for isolation
    await unregister(mockSocket.id);
  });

  it("should not emit online again when the same user connects with another socket", async () => {
    const mockServer = new MockGameServer() as unknown as GameServer;
    const socket1 = makeSocket("presence_online_2_1");
    const socket2 = makeSocket("presence_online_2_2");

    const record = await getUserByUsername(auth.username);
    const expectedUser = await populateSafeUserInfo(record!.userId);

    await socketPresenceConnect(socket1, mockServer)({ auth, payload: undefined });
    await socketPresenceConnect(socket2, mockServer)({ auth, payload: undefined });

    expect(mockServer.emit).toHaveBeenCalledTimes(1);
    expect(mockServer.emit).toHaveBeenCalledWith("userStatusChanged", {
      user: expectedUser,
      status: "online",
    });

    // Cleanup presence state for isolation
    await unregister(socket1.id);
    await unregister(socket2.id);
  });
});

describe("unregisterAndEmitOffline", () => {
  it("should emit offline when a user unregisters their last socket", async () => {
    const mockServer = new MockGameServer() as unknown as GameServer;

    const record = await getUserByUsername(auth.username);
    const userId = record!.userId;

    await register(userId, "presence_offline_1");

    await unregisterAndEmitOffline("presence_offline_1", mockServer);

    expect(mockServer.to).toHaveBeenCalledExactlyOnceWith("presence");
    expect(mockServer.emit).toHaveBeenCalledOnce();

    expect(mockServer.emit).toHaveBeenCalledWith("userStatusChanged", {
      user: expect.objectContaining({ username: auth.username }),
      status: "offline",
    });
  });

  it("should not emit offline when the user still has other sockets", async () => {
    const mockServer = new MockGameServer() as unknown as GameServer;

    const record = await getUserByUsername(auth.username);
    const userId = record!.userId;

    await register(userId, "presence_offline_2_a");
    await register(userId, "presence_offline_2_b");

    await unregisterAndEmitOffline("presence_offline_2_a", mockServer);
    expect(mockServer.emit).not.toHaveBeenCalled();

    await unregisterAndEmitOffline("presence_offline_2_b", mockServer);
    expect(mockServer.emit).toHaveBeenCalledOnce();
  });
});
