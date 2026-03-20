import type { APIResponse } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { BlockInfo, ErrorMsg, UserAuth } from "@gamenite/shared";

const BLOCK_API_URL = `/api/block`;

/**
 * Blocks another user.
 *
 * @param auth - The authenticated user's credentials
 * @param username - The username of the user to block
 * @returns BlockInfo or an error message
 */
export const blockUser = async (auth: UserAuth, username: string): APIResponse<BlockInfo> => {
  try {
    const res = await api.post<BlockInfo | ErrorMsg>(`${BLOCK_API_URL}/block`, {
      auth,
      payload: { username },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Unblocks a previously blocked user.
 *
 * @param auth - The authenticated user's credentials
 * @param username - The username of the user to unblock
 * @returns BlockInfo or an error message
 */
export const unblockUser = async (auth: UserAuth, username: string): APIResponse<BlockInfo> => {
  try {
    const res = await api.post<BlockInfo | ErrorMsg>(`${BLOCK_API_URL}/unblock`, {
      auth,
      payload: { username },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Fetches the block status between the viewer and a target user.
 *
 * @param viewerUsername - The logged-in user
 * @param targetUsername - The profile being viewed
 * @returns { blockedByMe, blockedByThem } or an error message
 */
export const getBlockStatus = async (
  viewerUsername: string,
  targetUsername: string,
): APIResponse<{ blockedByMe: boolean; blockedByThem: boolean }> => {
  try {
    const res = await api.get<{ blockedByMe: boolean; blockedByThem: boolean } | ErrorMsg>(
      `${BLOCK_API_URL}/status/${viewerUsername}/${targetUsername}`,
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
