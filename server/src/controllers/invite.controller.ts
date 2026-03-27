import { withAuth, zCreateGameInvite, zUpdateGameInvite, type InviteInfo } from "@gamenite/shared";
import {
  createGameInvite,
  getInviteById,
  getInvitesByToUsername,
  updateGameInvite,
} from "../services/invites.service.ts";
import type { GameServer, RestAPI } from "../types.ts";
import { checkAuth, enforceAuth, getUserByUsername } from "../services/auth.service.ts";
import { getGameById } from "../services/game.service.ts";

export const makePostCreateGameInvite =
  (io: GameServer): RestAPI<InviteInfo> =>
  async (req, res) => {
    const body = withAuth(zCreateGameInvite).safeParse(req.body);
    if (!body.success) {
      res.status(400).send({ error: "Poorly-formed request" });
      return;
    }

    const user = await checkAuth(body.data.auth);
    if (!user) {
      res.status(403).send({ error: "Invalid credentials" });
      return;
    }

    const recipient = await getUserByUsername(body.data.payload.toUsername);
    if (!recipient) {
      res.status(404).send({ error: "User not found" });
      return;
    }

    const game = await getGameById(body.data.payload.gameId);
    if (!game) {
      res.status(404).send({ error: "Game not found" });
      return;
    }
    if (game.status !== "waiting") {
      res.status(400).send({ error: "Game is not in waiting status" });
      return;
    }

    const invite = await createGameInvite(
      user.userId,
      recipient.userId,
      body.data.payload.gameId,
      new Date(),
    );
    io.to(`notify:${recipient.userId}`).emit("gameInviteReceived", invite);
    res.send(invite);
  };

export const getInvitesByUsername: RestAPI<InviteInfo[], { username: string }> = async (
  req,
  res,
) => {
  res.send(await getInvitesByToUsername(req.params.username));
};

export const getInviteByIdHandler: RestAPI<InviteInfo, { id: string }> = async (req, res) => {
  const invite = await getInviteById(req.params.id);
  if (!invite) {
    res.status(404).send({ error: "Invite not found" });
    return;
  }
  res.send(invite);
};

export const putUpdateGameInvite: RestAPI<InviteInfo> = async (req, res) => {
  const body = withAuth(zUpdateGameInvite).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await enforceAuth(body.data.auth);
  res.send(await updateGameInvite(body.data.payload.inviteId, user, body.data.payload.status));
};
