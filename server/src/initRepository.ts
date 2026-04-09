import { randomUUID } from "node:crypto";
import { getUserByUsername } from "./services/auth.service.ts";
import {
  AuthRepo,
  BlockRepo,
  ChatRepo,
  CommentRepo,
  FriendRequestRepo,
  FriendshipRepo,
  GameRepo,
  LeaderboardRepo,
  MessageRepo,
  ThreadRepo,
  UserRepo,
} from "./repository.ts";
import type { GameRecord, ThreadRecord, FriendshipRecord } from "./models.ts";
import { createChat } from "./services/chat.service.ts";
import { createUser, updateUser } from "./services/user.service.ts";
import { createFriendRequest } from "./services/friendRequest.service.ts";
import { updateLeaderboard } from "./services/leaderboard.service.ts";

/** Reset stored games with example data. */
async function resetStoredGames() {
  const user0id = (await getUserByUsername("user0"))!.userId;
  const user1id = (await getUserByUsername("user1"))!.userId;
  const user2id = (await getUserByUsername("user2"))!.userId;
  const user3id = (await getUserByUsername("user3"))!.userId;

  const recently = new Date(new Date().getTime() - 6 * 60 * 60 * 1000);
  const storedGames: { [key: string]: GameRecord } = {
    [randomUUID().toString()]: {
      type: "nim",
      state: { remaining: 0, nextPlayer: 1 },
      done: true,
      chat: (await createChat(new Date("2025-04-21"))).chatId,
      players: [user2id, user3id],
      createdAt: new Date("2025-04-21").toISOString(),
      createdBy: user2id,
    },
    [randomUUID().toString()]: {
      type: "guess",
      state: { secret: 43, guesses: [null, 2, 99, null] },
      done: false,
      chat: (await createChat(recently)).chatId,
      players: [user1id, user0id, user3id, user2id],
      createdAt: recently.toISOString(),
      createdBy: user1id,
    },
    [randomUUID().toString()]: {
      type: "nim",
      done: false,
      chat: (await createChat(new Date())).chatId,
      players: [user1id],
      createdAt: new Date().toISOString(),
      createdBy: user1id,
    },
  };

  await GameRepo.clear();
  await Promise.all(Object.entries(storedGames).map(([id, entry]) => GameRepo.set(id, entry)));
}

/** Reset stored threads with example data */
async function resetStoredThreads() {
  const user0id = (await getUserByUsername("user0"))!.userId;
  const user1id = (await getUserByUsername("user1"))!.userId;
  const user2id = (await getUserByUsername("user2"))!.userId;
  const user3id = (await getUserByUsername("user3"))!.userId;

  const storedThreads: { [key: string]: ThreadRecord } = {
    abadcafeabadcafeabadcafe: {
      createdBy: user1id,
      createdAt: new Date().toISOString(),
      title: "Nim?",
      text: "Is anyone around that wants to play Nim? I'll be here for the next hour or so.",
      comments: [],
    },
    deadbeefdeadbeefdeadbeef: {
      createdBy: user1id,
      createdAt: new Date("2025-04-02").toISOString(),
      title: "Hello game knights",
      text: "I'm a big Nim buff and am excited to join this community.",
      comments: [],
    },
    [randomUUID().toString()]: {
      createdBy: user3id,
      createdAt: new Date(new Date().getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      title: "Other games?",
      text: "Nim is great, but I'm hoping some new strategy games will get introduced soon.",
      comments: [],
    },
    [randomUUID().toString()]: {
      createdBy: user2id,
      createdAt: new Date("2025-04-04").toISOString(),
      title: "Strategy guide?",
      text: "I'm pretty confused about the right strategy for Nim, is there anyone around who can help explain this?",
      comments: [],
    },
    [randomUUID().toString()]: {
      createdBy: user0id,
      createdAt: new Date(new Date().getTime() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
      title: "New game: multiplayer number guesser!",
      text: "Strategy.town now has an exciting new game: guess! Try it out today: multiple people can join this exciting game, and guess a number between 1 and 100!",
      comments: [],
    },
  };
  await ThreadRepo.clear();
  await Promise.all(Object.entries(storedThreads).map(([id, entry]) => ThreadRepo.set(id, entry)));
}

/** Reset stored users with example data */
async function resetStoredUsers() {
  await UserRepo.clear();

  await createUser("user0", "pwd0000", new Date());
  await createUser("user1", "pwd1111", new Date());
  await createUser("user2", "pwd2222", new Date());
  await createUser("user3", "pwd3333", new Date());
  await createUser("user4", "pwd4444", new Date());
  await createUser("user5", "pwd5555", new Date());
  await createUser("user6", "pwd6666", new Date());
  await createUser("user7", "pwd7777", new Date());
  await createUser("user8", "pwd8888", new Date());
  await createUser("user9", "pwd9999", new Date());
  await createUser("user10", "pwd1010", new Date());
  await createUser("user11", "pwd1111", new Date());
  await createUser("user12", "pwd1212", new Date());
  await createUser("user13", "pwd1313", new Date());
  await createUser("user14", "pwd1414", new Date());

  await updateUser("user0", { display: "The Knight Of Games" });
  await updateUser("user1", { display: "Yāo" });
  await updateUser("user2", { display: "Sénior Dos" });
  await updateUser("user3", { display: "Frau Drei" });
  await updateUser("user4", { display: "Game Master" });
  await updateUser("user5", { display: "Nim Champion" });
  await updateUser("user6", { display: "Strategy King" });
  await updateUser("user7", { display: "Puzzle Solver" });
  await updateUser("user8", { display: "Logic Lord" });
  await updateUser("user9", { display: "Brain Teaser" });
  await updateUser("user10", { display: "Mind Bender" });
  await updateUser("user11", { display: "Think Tank" });
  await updateUser("user12", { display: "Wisdom Warrior" });
  await updateUser("user13", { display: "Intellect Icon" });
  await updateUser("user14", { display: "Clever Conqueror" });
}

async function resetFriends() {
  await FriendshipRepo.clear();
  await FriendRequestRepo.clear();

  const user0id = (await getUserByUsername("user0"))!.userId;
  const user1id = (await getUserByUsername("user1"))!.userId;
  const user2id = (await getUserByUsername("user2"))!.userId;
  const user3id = (await getUserByUsername("user3"))!.userId;

  const storedFriends: { [key: string]: FriendshipRecord } = {
    deadbeefdeadbeefdeadbeef: {
      users: [user0id, user1id],
      createdAt: new Date().toISOString(),
    },
  };

  await Promise.all(
    Object.entries(storedFriends).map(([id, entry]) => FriendshipRepo.set(id, entry)),
  );
  await createFriendRequest(user2id, user3id, new Date());
}
/** Reset stored leaderboard with example data */
async function resetStoredLeaderboard() {
  const user0id = (await getUserByUsername("user0"))!.userId;
  const user1id = (await getUserByUsername("user1"))!.userId;
  const user2id = (await getUserByUsername("user2"))!.userId;
  const user3id = (await getUserByUsername("user3"))!.userId;
  const user4id = (await getUserByUsername("user4"))!.userId;
  const user5id = (await getUserByUsername("user5"))!.userId;
  const user6id = (await getUserByUsername("user6"))!.userId;
  const user7id = (await getUserByUsername("user7"))!.userId;
  const user8id = (await getUserByUsername("user8"))!.userId;
  const user9id = (await getUserByUsername("user9"))!.userId;
  const user10id = (await getUserByUsername("user10"))!.userId;
  const user11id = (await getUserByUsername("user11"))!.userId;
  const user12id = (await getUserByUsername("user12"))!.userId;
  const user13id = (await getUserByUsername("user13"))!.userId;
  const user14id = (await getUserByUsername("user14"))!.userId;

  // Add sample leaderboard entries for Nim with varied win/loss records
  // user0: 8 wins, 2 losses (80% win rate)
  for (let i = 0; i < 8; i++) await updateLeaderboard(user0id, "nim", true);
  for (let i = 0; i < 2; i++) await updateLeaderboard(user0id, "nim", false);

  // user1: 6 wins, 4 losses (60% win rate)
  for (let i = 0; i < 6; i++) await updateLeaderboard(user1id, "nim", true);
  for (let i = 0; i < 4; i++) await updateLeaderboard(user1id, "nim", false);

  // user2: 5 wins, 3 losses (62.5% win rate)
  for (let i = 0; i < 5; i++) await updateLeaderboard(user2id, "nim", true);
  for (let i = 0; i < 3; i++) await updateLeaderboard(user2id, "nim", false);

  // user3: 7 wins, 1 loss (87.5% win rate)
  for (let i = 0; i < 7; i++) await updateLeaderboard(user3id, "nim", true);
  await updateLeaderboard(user3id, "nim", false);

  // user4: 4 wins, 6 losses (40% win rate)
  for (let i = 0; i < 4; i++) await updateLeaderboard(user4id, "nim", true);
  for (let i = 0; i < 6; i++) await updateLeaderboard(user4id, "nim", false);

  // user5: 9 wins, 1 loss (90% win rate)
  for (let i = 0; i < 9; i++) await updateLeaderboard(user5id, "nim", true);
  await updateLeaderboard(user5id, "nim", false);

  // user6: 3 wins, 7 losses (30% win rate)
  for (let i = 0; i < 3; i++) await updateLeaderboard(user6id, "nim", true);
  for (let i = 0; i < 7; i++) await updateLeaderboard(user6id, "nim", false);

  // user7: 6 wins, 2 losses (75% win rate)
  for (let i = 0; i < 6; i++) await updateLeaderboard(user7id, "nim", true);
  for (let i = 0; i < 2; i++) await updateLeaderboard(user7id, "nim", false);

  // user8: 2 wins, 8 losses (20% win rate)
  for (let i = 0; i < 2; i++) await updateLeaderboard(user8id, "nim", true);
  for (let i = 0; i < 8; i++) await updateLeaderboard(user8id, "nim", false);

  // user9: 7 wins, 3 losses (70% win rate)
  for (let i = 0; i < 7; i++) await updateLeaderboard(user9id, "nim", true);
  for (let i = 0; i < 3; i++) await updateLeaderboard(user9id, "nim", false);

  // user10: 5 wins, 5 losses (50% win rate)
  for (let i = 0; i < 5; i++) await updateLeaderboard(user10id, "nim", true);
  for (let i = 0; i < 5; i++) await updateLeaderboard(user10id, "nim", false);

  // user11: 8 wins, 0 losses (100% win rate)
  for (let i = 0; i < 8; i++) await updateLeaderboard(user11id, "nim", true);

  // user12: 4 wins, 4 losses (50% win rate)
  for (let i = 0; i < 4; i++) await updateLeaderboard(user12id, "nim", true);
  for (let i = 0; i < 4; i++) await updateLeaderboard(user12id, "nim", false);

  // user13: 6 wins, 6 losses (50% win rate)
  for (let i = 0; i < 6; i++) await updateLeaderboard(user13id, "nim", true);
  for (let i = 0; i < 6; i++) await updateLeaderboard(user13id, "nim", false);

  // user14: 3 wins, 2 losses (60% win rate)
  for (let i = 0; i < 3; i++) await updateLeaderboard(user14id, "nim", true);
  for (let i = 0; i < 2; i++) await updateLeaderboard(user14id, "nim", false);
}

export async function resetEverythingToDefaults() {
  await AuthRepo.clear();
  await BlockRepo.clear();
  await ChatRepo.clear();
  await CommentRepo.clear();
  await GameRepo.clear();
  await LeaderboardRepo.clear();
  await MessageRepo.clear();
  await ThreadRepo.clear();
  await UserRepo.clear();
  await FriendshipRepo.clear();
  await FriendRequestRepo.clear();

  await resetStoredUsers();
  await resetStoredThreads();
  await resetStoredGames();
  await resetFriends();
  await resetStoredLeaderboard();
}
