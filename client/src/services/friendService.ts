import type { APIResponse } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { ErrorMsg, FriendListInfo, FriendRequestInfo, UserAuth } from "@gamenite/shared";

const FRIEND_API_URL = `/api/myFriend`;

/**
 * Sends a POST request to create a friend request.
 *
 * @param auth - The authenticated user's credentials
 * @param toUsername - The username of the user to send a request to
 * @returns The created FriendRequestInfo, or an error message
 */
export const sendFriendRequest = async (
  auth: UserAuth,
  toUsername: string,
): APIResponse<FriendRequestInfo> => {
  try {
    const res = await api.post<FriendRequestInfo | ErrorMsg>(`${FRIEND_API_URL}/request`, {
      auth,
      payload: { to: toUsername },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a PUT request to accept a pending friend request.
 *
 * @param auth - The authenticated user's credentials
 * @param requestId - The ID of the friend request to accept
 * @returns The updated FriendRequestInfo, or an error message
 */
export const acceptFriendRequest = async (
  auth: UserAuth,
  requestId: string,
): APIResponse<FriendRequestInfo> => {
  try {
    const res = await api.put<FriendRequestInfo | ErrorMsg>(`${FRIEND_API_URL}/accept`, {
      auth,
      payload: { requestId },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a PUT request to reject a pending friend request.
 *
 * @param auth - The authenticated user's credentials
 * @param requestId - The ID of the friend request to accept
 * @returns The updated FriendRequestInfo, or an error message
 */
export const rejectFriendRequest = async (
  auth: UserAuth,
  requestId: string,
): APIResponse<FriendRequestInfo> => {
  try {
    const res = await api.put<FriendRequestInfo | ErrorMsg>(`${FRIEND_API_URL}/reject`, {
      auth,
      payload: { requestId },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Fetches the friends list and pending requests for a user.
 *
 * @param username - The username to look up
 * @returns A FriendListInfo object, or an error message
 */
export const getFriendList = async (username: string): APIResponse<FriendListInfo> => {
  try {
    const res = await api.get<FriendListInfo | ErrorMsg>(`${FRIEND_API_URL}/list/${username}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Fetches the friendship status between two users.
 *
 * @param usernameA - First username
 * @param usernameB - Second username
 * @returns A FriendRequestInfo if a relationship exists, null if not, or an error message
 */
export const getFriendshipStatus = async (
  usernameA: string,
  usernameB: string,
): APIResponse<FriendRequestInfo | null> => {
  try {
    const res = await api.get<FriendRequestInfo | null | ErrorMsg>(
      `${FRIEND_API_URL}/status/${usernameA}/${usernameB}`,
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
