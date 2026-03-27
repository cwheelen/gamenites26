import type { SafeUserInfo } from "@gamenite/shared";
import type { GameServer } from "../types.ts";
import { persistLastOnline } from "./user.service.ts";

/**
 * In-memory mapping of socketIds to userIds, and per user connection to catch edge case of multiple logins for a user
 * First socket for a user increments count from 0; last socket decrements to 0.
 */
const socketToUserId = new Map<string, string>();
const userConnectionCount = new Map<string, number>();

export async function register(userId: string, socketId: string): Promise<boolean> {
  const previousUserId = socketToUserId.get(socketId);
  if (previousUserId !== undefined) {
    if (previousUserId === userId) {
      return false;
    }
    await unregister(socketId);
  }

  socketToUserId.set(socketId, userId);
  const prior = userConnectionCount.get(userId) ?? 0;
  userConnectionCount.set(userId, prior + 1);
  return prior === 0;
}

export async function unregister(socketId: string): Promise<{
  userId: string | undefined;
  becameOffline: boolean;
  user?: SafeUserInfo;
}> {
  const userId = socketToUserId.get(socketId);
  if (userId === undefined) {
    return { userId: undefined, becameOffline: false, user: undefined };
  }

  socketToUserId.delete(socketId);
  const count = userConnectionCount.get(userId) ?? 0;
  if (count <= 1) {
    userConnectionCount.delete(userId);
    const user = await persistLastOnline(userId);
    return { userId, becameOffline: true, user };
  }
  userConnectionCount.set(userId, count - 1);
  return { userId, becameOffline: false, user: undefined };
}

export function isUserOnline(userId: string): boolean {
  return (userConnectionCount.get(userId) ?? 0) > 0;
}

export function getUserStatus(userId: string): "online" | "offline" {
  return isUserOnline(userId) ? "online" : "offline";
}

export function getOnlineCount(): number {
  return userConnectionCount.size;
}

/**
 * Unregister a disconnected socket, and if it was the user's last socket,
 * emit an offline transition to everyone subscribed to the presence room.
 */
export async function unregisterAndEmitOffline(socketId: string, io: GameServer) {
  const { user, becameOffline } = await unregister(socketId);
  if (!becameOffline || !user) return;
  io.to("presence").emit("userStatusChanged", { user, status: "offline" });
}
