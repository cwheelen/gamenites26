import type { InviteInfo } from "@gamenite/shared";
import { InviteRepo } from "../repository.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import type { UserWithId } from "../types.ts";

async function populateInviteInfo(inviteId: string): Promise<InviteInfo> {
  const gameInvite = await InviteRepo.get(inviteId);
  return {
    inviteId,
    gameId: gameInvite.gameId,
    from: await populateSafeUserInfo(gameInvite.from),
    to: await populateSafeUserInfo(gameInvite.to),
    status: gameInvite.status,
    createdAt: new Date(gameInvite.createdAt),
  };
}

export async function createGameInvite(
  fromId: string,
  toId: string,
  gameId: string,
  createdAt: Date,
): Promise<InviteInfo> {
  const id = await InviteRepo.add({
    from: fromId,
    to: toId,
    createdAt: createdAt.toISOString(),
    status: "pending",
    gameId: gameId,
  });
  return populateInviteInfo(id);
}

export async function getInviteById(inviteId: string): Promise<InviteInfo | null> {
  const gameInvite = await InviteRepo.find(inviteId);
  if (!gameInvite) {
    return null;
  }
  return populateInviteInfo(inviteId);
}

export async function getInvitesByToUsername(username: string): Promise<InviteInfo[]> {
  const keys = await InviteRepo.getAllKeys();
  const unfiltered = await Promise.all(keys.map(populateInviteInfo));
  const unsorted = unfiltered.filter((invite: InviteInfo) => {
    return invite.to.username === username;
  });

  return unsorted.sort((a, b) => {
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export async function updateGameInvite(
  inviteId: string,
  user: UserWithId,
  status: "accepted" | "declined",
): Promise<InviteInfo> {
  const invite = await InviteRepo.find(inviteId);
  if (!invite)
    throw new Error(
      `User ${user.username} tried to ${status === "accepted" ? "accept" : "decline"} game invite that doesn't exist`,
    );
  if (invite.status !== "pending")
    throw new Error(
      `User ${user.username} tried to ${status === "accepted" ? "accept" : "decline"} game invite that isn't pending`,
    );

  await InviteRepo.set(inviteId, { ...invite, status: status });

  return {
    ...invite,
    status,
    createdAt: new Date(invite.createdAt),
    from: await populateSafeUserInfo(invite.from),
    to: await populateSafeUserInfo(invite.to),
    inviteId,
  };
}
