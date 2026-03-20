import type { APIResponse } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { DirectMessageInfo, ErrorMsg, UserAuth } from "@gamenite/shared";

const DM_API_URL = `/api/dm`;

export const openDM = async (
  auth: UserAuth,
  withUsername: string,
): APIResponse<DirectMessageInfo> => {
  try {
    const res = await api.post<DirectMessageInfo | ErrorMsg>(`${DM_API_URL}/open`, {
      auth,
      payload: { with: withUsername },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
