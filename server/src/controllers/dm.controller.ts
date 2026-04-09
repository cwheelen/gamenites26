import { withAuth, zDMOpenPayload, type DirectMessageInfo } from "@gamenite/shared";
import { checkAuth } from "../services/auth.service.ts";
import { getDMById, getMessages, getOrCreateDM } from "../services/dm.service.ts";
import type { RestAPI } from "../types.ts";

/**
 * POST /api/dm/open
 *
 * Opens (or retrieves) the DM conversation between the authenticated user
 * and another user. Returns the chatId the client needs to connect via socket.
 *
 * Body: { auth: UserAuth, payload: { with: string } }
 */
export const postOpen: RestAPI<DirectMessageInfo> = async (req, res) => {
  const body = withAuth(zDMOpenPayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  if (user.username === body.data.payload.with) {
    res.status(400).send({ error: "You cannot message yourself" });
    return;
  }

  const dm = await getOrCreateDM(user.username, body.data.payload.with);
  res.send(dm);
};

/**
 * Handle GET requests to `api/dm/list`
 */
export const getList: RestAPI<DirectMessageInfo[]> = async (req, res) => {
  const username = req.params.username;
  if (!username) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }
  res.send(await getMessages(username));
};

export const getById: RestAPI<DirectMessageInfo, { id: string }> = async (req, res) => {
  const dm = await getDMById(req.params.id);
  if (!dm) {
    res.status(404).send({ error: "DM not found" });
    return;
  }
  res.send(dm);
};
