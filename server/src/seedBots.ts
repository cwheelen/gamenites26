import "dotenv/config";
import { KeyvMongo } from "@keyv/mongo";
import { Keyv } from "keyv";
import { setDbInitializer } from "./keyv.ts";
import { UserRepo } from "./repository.ts";
import { CONNECT_4_BOT_USER_ID } from "./games/connect4.ts";
import { CHECKERS_BOT_USER_ID } from "./games/checkers.ts";
import { BATTLESHIP_BOT_USER_ID } from "./games/battleship.ts";
import { NIM_BOT_USER_ID } from "./games/nim.ts";
import { NUMBER_GUESSER_BOT_USER_ID } from "./games/guess.ts";

const MONGO_STR = process.env.MONGO_STR || null;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "GameNite";
if (MONGO_STR) {
  setDbInitializer(
    <T>(name: string) =>
      new Keyv<T>(new KeyvMongo(MONGO_STR, { collection: name, db: MONGO_DB_NAME })),
  );
}

const NOW = new Date().toISOString();
const BOTS = [
  { id: CONNECT_4_BOT_USER_ID, display: "Connect4 Bot" },
  { id: CHECKERS_BOT_USER_ID, display: "Checkers Bot" },
  { id: BATTLESHIP_BOT_USER_ID, display: "Battleship Bot" },
  { id: NIM_BOT_USER_ID, display: "Nim Bot" },
  { id: NUMBER_GUESSER_BOT_USER_ID, display: "Guess Bot" },
];

for (const { id, display } of BOTS) {
  await UserRepo.set(id, {
    username: id,
    display,
    privacy: "friends",
    createdAt: NOW,
    lastOnline: NOW,
  });
}
