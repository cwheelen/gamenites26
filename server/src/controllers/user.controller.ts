import { type SafeUserInfo, withAuth, zUserAuth, zUserUpdateRequest } from "@gamenite/shared";
import {
  createUser,
  getAllPublicUsers,
  getStatus,
  getUsersByUsername,
  populateSafeUserInfo,
  updateUser,
} from "../services/user.service.ts";
import { type RestAPI, type SocketAPI } from "../types.ts";
import { z } from "zod";
import { checkAuth, enforceAuth, getUserByUsername } from "../services/auth.service.ts";
import { register } from "../services/presence.service.ts";
import { logSocketError } from "./socket.controller.ts";

/**
 * Handles user login by validating credentials.
 * @param req The request containing username and password in the body.
 * @param res The response, either returning the user or an error.
 */
export const postLogin: RestAPI<SafeUserInfo> = async (req, res) => {
  const userAuth = zUserAuth.safeParse(req.body);
  if (!userAuth.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(userAuth.data);
  if (!user) {
    res.send({ error: "Invalid username or password" });
    return;
  }

  res.send(await populateSafeUserInfo(user.userId));
};

/**
 * Update a user's information
 * @param req A request containing a new password
 * @param res The response, either returning the updated user or an error
 */
export const postByUsername: RestAPI<SafeUserInfo, { username: string }> = async (req, res) => {
  const body = withAuth(zUserUpdateRequest).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user || user.username !== req.params.username) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  res.send(await updateUser(req.params.username, body.data.payload));
};

/**
 * Handles the creation of a new user account.
 * @param req The request containing username and password in the body.
 * @param res The response, either returning the created user or an error.
 * @returns A promise resolving to void.
 */
export const postSignup: RestAPI<SafeUserInfo> = async (req, res) => {
  const userAuth = zUserAuth.safeParse(req.body);
  if (!userAuth.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  res.send(await createUser(userAuth.data.username, userAuth.data.password, new Date()));
};

/**
 * Retrieves a user by their username.
 * @param req The request containing the username as a route parameter.
 * @param res The response, either returning the user (200) or an error.
 */
export const getByUsername: RestAPI<SafeUserInfo, { username: string }> = async (req, res) => {
  const user = await getUserByUsername(req.params.username);
  if (!user) {
    res.status(404).send({ error: "User not found" });
    return;
  }
  res.send(await populateSafeUserInfo(user.userId));
};

/**
 * Returns all users with privacy set to "public".
 */
export const getPublicUsers: RestAPI<SafeUserInfo[]> = async (_req, res) => {
  res.send(await getAllPublicUsers());
};

/**
 * Returns a user's current online/offline state.
 */
export const getStatusByUsername: RestAPI<
  { status: "online" | "offline"; lastOnline: Date },
  { username: string }
> = async (req, res) => {
  try {
    res.send(await getStatus(req.params.username));
  } catch {
    res.status(404).send({ error: "User not found" });
  }
};

/**
 * Returns the user information for a list of users
 */
export const postList: RestAPI<SafeUserInfo[]> = async (req, res) => {
  const usernames = z.array(z.string()).safeParse(req.body);
  if (!usernames.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  let users: SafeUserInfo[];
  try {
    users = await getUsersByUsername(usernames.data);
  } catch {
    res.send({ error: "Usernames do not all exist" });
    return;
  }

  res.send(users);
};

/**
 * Handle a socket request to join the presence: send the connection
 * to the presence and set the status of the user to 'online'
 */
export const socketPresenceConnect: SocketAPI = (socket, io) => async (body) => {
  try {
    const { auth } = withAuth(z.undefined()).parse(body);
    const user = await enforceAuth(auth);
    const becameOnline = await register(user.userId, socket.id);
    await socket.join("presence");
    await socket.join(`notify:${user.userId}`);

    if (becameOnline) {
      io.to("presence").emit("userStatusChanged", {
        user: await populateSafeUserInfo(user.userId),
        status: "online",
      });
    }
  } catch (err) {
    logSocketError(socket, err);
  }
};
