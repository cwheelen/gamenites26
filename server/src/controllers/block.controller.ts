import { withAuth, zBlockPayload, type BlockInfo } from "@gamenite/shared";
import { checkAuth } from "../services/auth.service.ts";
import { blockUser, unblockUser, getBlockStatus } from "../services/block.service.ts";
import type { RestAPI } from "../types.ts";

/**
 * POST /api/block/block
 *
 * Block another user.
 * Body: { auth: UserAuth, payload: { username: string } }
 */
export const postBlock: RestAPI<BlockInfo> = async (req, res) => {
  const body = withAuth(zBlockPayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await blockUser(user.username, body.data.payload.username);
  if ("error" in result) {
    res.status(400).send(result);
    return;
  }

  res.send(result);
};

/**
 * POST /api/block/unblock
 *
 * Remove a block on another user.
 * Body: { auth: UserAuth, payload: { username: string } }
 */
export const postUnblock: RestAPI<BlockInfo> = async (req, res) => {
  const body = withAuth(zBlockPayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await unblockUser(user.username, body.data.payload.username);
  if ("error" in result) {
    res.status(400).send(result);
    return;
  }

  res.send(result);
};

/**
 * GET /api/block/status/:viewerUsername/:targetUsername
 *
 * Returns { blockedByMe, blockedByThem } from the viewer's perspective.
 */
export const getStatus: RestAPI<
  { blockedByMe: boolean; blockedByThem: boolean },
  { viewerUsername: string; targetUsername: string }
> = async (req, res) => {
  const result = await getBlockStatus(req.params.viewerUsername, req.params.targetUsername);
  res.send(result);
};
