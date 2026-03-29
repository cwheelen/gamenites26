/* eslint no-console: "off" */

import express, { Router } from "express";
import { Server } from "socket.io";
import { z } from "zod";
import * as http from "node:http";
import * as chat from "./controllers/chat.controller.ts";
import * as block from "./controllers/block.controller.ts";
import * as dm from "./controllers/dm.controller.ts";
import * as game from "./controllers/game.controller.ts";
import * as pause from "./controllers/pause.controller.ts";
import * as leaderboard from "./controllers/leaderboard.controller.ts";
import * as user from "./controllers/user.controller.ts";
import * as thread from "./controllers/thread.controller.ts";
import * as friend from "./controllers/friends.controller.ts";
import * as myFriend from "./controllers/friend.controller.ts";
import * as invite from "./controllers/invite.controller.ts";
import { type GameServer } from "./types.ts";
import { unregisterAndEmitOffline } from "./services/presence.service.ts";

export const app = express();
export const httpServer = http.createServer(app);
const io: GameServer = new Server(httpServer);

app.use(express.json());

app.use(
  "/api",
  Router()
    .use(
      "/game",
      express
        .Router()
        .post("/create", game.postCreate)
        .get("/list", game.getList)
        .get("/:id", game.getById),
    )
    .use(
      "/leaderboard",
      express
        .Router()
        .get("/:gameType", leaderboard.getByGameType)
        .get("/user/:username/:gameType", leaderboard.getUserStats),
    )
    .use(
      "/thread",
      express
        .Router()
        .post("/create", thread.postCreate)
        .get("/list", thread.getList)
        .get("/:id", thread.getById)
        .post("/:id/comment", thread.postByIdComment),
    )
    .use(
      "/user",
      Router()
        .post("/list", user.postList)
        .post("/login", user.postLogin)
        .post("/signup", user.postSignup)
        .post("/:username", user.postByUsername)
        .get("/:username/status", user.getStatusByUsername)
        .get("/:username", user.getByUsername),
    )
    .use(
      "/friend",
      Router()
        .post("/create", friend.postCreateFriend)
        .get("/list/:username", friend.getFriendList)
        .get("/:id", friend.getFriend)
        .delete("/:id/by/:userId", friend.deleteFriend),
    )
    .use(
      "/friendRequest",
      Router()
        .post("/create", friend.postCreateFriendRequest)
        .get("/list/:username", friend.getRequestList)
        .get("/:id", friend.getFriendRequest)
        .put("update", friend.putUpdateFriendRequest),
    )
    .use(
      "/myFriend",
      Router()
        .post("/request", myFriend.postRequest)
        .post("/accept", myFriend.postAccept)
        .get("/list/:username", myFriend.getList)
        .get("/status/:usernameA/:usernameB", myFriend.getStatus),
    )
    .use("/dm", Router().post("/open", dm.postOpen))
    .use(
      "/block",
      Router()
        .post("/block", block.postBlock)
        .post("/unblock", block.postUnblock)
        .get("/status/:viewerUsername/:targetUsername", block.getStatus),
    )
    .use(
      "/invite",
      Router()
        .post("/create", invite.makePostCreateGameInvite(io))
        .get("/list/:username", invite.getInvitesByUsername)
        .get("/:id", invite.getInviteByIdHandler)
        .put("/update", invite.putUpdateGameInvite),
    ),
);

io.on("connection", (socket) => {
  const socketId = socket.id;
  console.log(`CONN [${socketId}] connected`);

  socket.on("disconnect", async () => {
    await unregisterAndEmitOffline(socketId, io);
    console.log(`CONN [${socketId}] disconnected`);
  });

  socket.on("chatJoin", chat.socketJoin(socket, io));
  socket.on("chatLeave", chat.socketLeave(socket, io));
  socket.on("chatSendMessage", chat.socketSendMessage(socket, io));

  socket.on("gameJoinAsPlayer", game.socketJoinAsPlayer(socket, io));
  socket.on("gameMakeMove", game.socketMakeMove(socket, io));
  socket.on("gameStart", game.socketStart(socket, io));
  socket.on("gameWatch", game.socketWatch(socket, io));

  socket.on("userPresenceConnect", user.socketPresenceConnect(socket, io));
  // Pause / away notification
  socket.on("gamePause", pause.socketPause(socket, io));
  socket.on("gameResume", pause.socketResume(socket, io));

  socket.onAny((name, payload) => {
    const zPayload = z.object({ auth: z.object({ username: z.string() }), payload: z.any() });
    const checked = zPayload.safeParse(payload);
    if (checked.error) {
      console.log(`RECV error: ${checked.error.message}`);
    } else {
      console.log(
        `RECV [${socketId}] got ${name}${checked.data.auth.username} ${JSON.stringify(checked.data.payload)}`,
      );
    }
  });
  socket.onAnyOutgoing((name) => {
    console.log(`SEND [${socketId}] gets ${name}`);
  });
});
