import type { CreateGroupChat, ErrorMsg, GroupChatInfo, UserAuth } from "@gamenite/shared";
import type { APIResponse } from "../util/types";
import { api, exceptionToErrorMsg } from "./api";

const GROUP_API_URL = `/api/group`;

export const createGroupChat = async (
  auth: UserAuth,
  title: string,
  members: string[],
): APIResponse<GroupChatInfo> => {
  const payload: CreateGroupChat = {
    title: title,
    members: members,
  };
  try {
    const res = await api.post<GroupChatInfo | ErrorMsg>(`${GROUP_API_URL}/create`, {
      auth,
      payload: payload,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

export const getGroupChatsForUser = async (username: string): APIResponse<GroupChatInfo[]> => {
  try {
    const res = await api.get<GroupChatInfo[] | ErrorMsg>(`${GROUP_API_URL}/list/${username}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

export const getGroupChatById = async (groupId: string): APIResponse<GroupChatInfo> => {
  try {
    const res = await api.get<GroupChatInfo | ErrorMsg>(`${GROUP_API_URL}/${groupId}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

export const updateGroupChat = async (
  auth: UserAuth,
  groupId: string,
  title?: string,
  members?: string[],
): APIResponse<GroupChatInfo> => {
  const payload = {
    groupId,
    title,
    members,
  };
  try {
    const res = await api.put<GroupChatInfo | ErrorMsg>(`${GROUP_API_URL}/update`, {
      auth,
      payload: payload,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
