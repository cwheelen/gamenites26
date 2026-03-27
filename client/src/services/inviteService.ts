import type {
  CreateGameInvite,
  ErrorMsg,
  InviteInfo,
  UpdateGameInvite,
  UserAuth,
} from "@gamenite/shared";
import type { APIResponse } from "../util/types";
import { api, exceptionToErrorMsg } from "./api";

const INVITE_API_URL = "/api/invite";

export const createGameInvite = async (
  auth: UserAuth,
  toUsername: string,
  gameId: string,
): APIResponse<InviteInfo> => {
  const payload: CreateGameInvite = {
    gameId,
    toUsername,
  };
  try {
    const res = await api.post<InviteInfo | ErrorMsg>(`${INVITE_API_URL}/create`, {
      auth,
      payload: payload,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

export const getInvitesByUsername = async (username: string): APIResponse<InviteInfo[]> => {
  try {
    const res = await api.get<InviteInfo[] | ErrorMsg>(`${INVITE_API_URL}/list/${username}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

export const updateGameInvite = async (
  auth: UserAuth,
  inviteId: string,
  status: "accepted" | "declined",
): APIResponse<InviteInfo> => {
  const payload: UpdateGameInvite = {
    inviteId,
    status,
  };
  try {
    const res = await api.put<InviteInfo | ErrorMsg>(`${INVITE_API_URL}/update`, {
      auth,
      payload: payload,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
