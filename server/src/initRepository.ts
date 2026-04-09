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
import { CONNECT_4_BOT_USER_ID } from "./games/connect4.ts";
import { CHECKERS_BOT_USER_ID } from "./games/checkers.ts";
import { BATTLESHIP_BOT_USER_ID } from "./games/battleship.ts";
import { NIM_BOT_USER_ID } from "./games/nim.ts";
import { NUMBER_GUESSER_BOT_USER_ID } from "./games/guess.ts";

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

  // Seed bot user records so their moves can be logged to chat
  const botCreatedAt = new Date().toISOString();
  await UserRepo.set(CONNECT_4_BOT_USER_ID, {
    username: CONNECT_4_BOT_USER_ID,
    display: "Connect4 Bot",
    createdAt: botCreatedAt,
    lastOnline: botCreatedAt,
  });
  await UserRepo.set(CHECKERS_BOT_USER_ID, {
    username: CHECKERS_BOT_USER_ID,
    display: "Checkers Bot",
    createdAt: botCreatedAt,
    lastOnline: botCreatedAt,
  });
  await UserRepo.set(BATTLESHIP_BOT_USER_ID, {
    username: BATTLESHIP_BOT_USER_ID,
    display: "Battleship Bot",
    createdAt: botCreatedAt,
    lastOnline: botCreatedAt,
  });
  await UserRepo.set(NIM_BOT_USER_ID, {
    username: NIM_BOT_USER_ID,
    display: "Nim Bot",
    createdAt: botCreatedAt,
    lastOnline: botCreatedAt,
  });
  await UserRepo.set(NUMBER_GUESSER_BOT_USER_ID, {
    username: NUMBER_GUESSER_BOT_USER_ID,
    display: "Guess Bot",
    createdAt: botCreatedAt,
    lastOnline: botCreatedAt,
  });

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

  const now = new Date().toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();

  const entries: {
    userId: string;
    gameType: "nim" | "guess" | "battleship" | "checkers";
    wins: number;
    losses: number;
    lastUpdated: string;
  }[] = [
    // NIM
    { userId: user5id, gameType: "nim", wins: 9, losses: 1, lastUpdated: now },
    { userId: user3id, gameType: "nim", wins: 7, losses: 1, lastUpdated: now },
    { userId: user9id, gameType: "nim", wins: 7, losses: 3, lastUpdated: now },
    { userId: user0id, gameType: "nim", wins: 8, losses: 2, lastUpdated: twoDaysAgo },
    { userId: user11id, gameType: "nim", wins: 8, losses: 0, lastUpdated: twoDaysAgo },
    { userId: user1id, gameType: "nim", wins: 6, losses: 4, lastUpdated: tenDaysAgo },
    { userId: user7id, gameType: "nim", wins: 6, losses: 2, lastUpdated: tenDaysAgo },
    { userId: user2id, gameType: "nim", wins: 5, losses: 3, lastUpdated: fortyDaysAgo },
    { userId: user4id, gameType: "nim", wins: 4, losses: 6, lastUpdated: fortyDaysAgo },
    { userId: user6id, gameType: "nim", wins: 3, losses: 7, lastUpdated: fortyDaysAgo },

    // GUESS
    { userId: user2id, gameType: "guess", wins: 8, losses: 2, lastUpdated: now },
    { userId: user6id, gameType: "guess", wins: 7, losses: 3, lastUpdated: now },
    { userId: user10id, gameType: "guess", wins: 6, losses: 2, lastUpdated: now },
    { userId: user4id, gameType: "guess", wins: 5, losses: 5, lastUpdated: twoDaysAgo },
    { userId: user12id, gameType: "guess", wins: 5, losses: 3, lastUpdated: twoDaysAgo },
    { userId: user0id, gameType: "guess", wins: 4, losses: 4, lastUpdated: tenDaysAgo },
    { userId: user8id, gameType: "guess", wins: 3, losses: 5, lastUpdated: fortyDaysAgo },
    { userId: user14id, gameType: "guess", wins: 2, losses: 6, lastUpdated: fortyDaysAgo },

    // BATTLESHIP
    { userId: user1id, gameType: "battleship", wins: 10, losses: 2, lastUpdated: now },
    { userId: user7id, gameType: "battleship", wins: 8, losses: 4, lastUpdated: now },
    { userId: user13id, gameType: "battleship", wins: 7, losses: 3, lastUpdated: now },
    { userId: user3id, gameType: "battleship", wins: 6, losses: 2, lastUpdated: twoDaysAgo },
    { userId: user9id, gameType: "battleship", wins: 5, losses: 5, lastUpdated: twoDaysAgo },
    { userId: user5id, gameType: "battleship", wins: 4, losses: 4, lastUpdated: tenDaysAgo },
    { userId: user11id, gameType: "battleship", wins: 3, losses: 5, lastUpdated: fortyDaysAgo },
    { userId: user2id, gameType: "battleship", wins: 2, losses: 6, lastUpdated: fortyDaysAgo },

    // CHECKERS
    { userId: user8id, gameType: "checkers", wins: 9, losses: 1, lastUpdated: now },
    { userId: user14id, gameType: "checkers", wins: 7, losses: 2, lastUpdated: now },
    { userId: user4id, gameType: "checkers", wins: 6, losses: 3, lastUpdated: now },
    { userId: user0id, gameType: "checkers", wins: 5, losses: 2, lastUpdated: twoDaysAgo },
    { userId: user6id, gameType: "checkers", wins: 5, losses: 4, lastUpdated: twoDaysAgo },
    { userId: user12id, gameType: "checkers", wins: 4, losses: 3, lastUpdated: tenDaysAgo },
    { userId: user10id, gameType: "checkers", wins: 3, losses: 5, lastUpdated: fortyDaysAgo },
    { userId: user1id, gameType: "checkers", wins: 2, losses: 7, lastUpdated: fortyDaysAgo },
  ];

  await LeaderboardRepo.clear();

  await Promise.all(
    entries.map(({ userId, gameType, wins, losses, lastUpdated }) =>
      LeaderboardRepo.set(`${userId}:${gameType}`, {
        userId,
        gameType,
        wins,
        losses,
        gamesPlayed: wins + losses,
        currentStreak: wins > 0 ? 1 : 0,
        longestStreak: wins,
        lastUpdated,
      }),
    ),
  );
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
