import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { app } from "../src/app.ts";

const auth1 = { username: "user1", password: "pwd1111" };
const auth2 = { username: "user2", password: "pwd2222" };
const auth3 = { username: "user3", password: "pwd3333" };
const badAuth = { username: "user1", password: "wrong" };

// InviteRepo IS cleared by resetEverythingToDefaults (setup.ts beforeEach), so no
// manual cleanup is needed here.

// Helper: create a new "waiting" game as auth1 and return its gameId.
async function createWaitingGame(): Promise<string> {
  const res = await supertest(app)
    .post("/api/game/create")
    .send({ auth: auth1, payload: { gameKey: "nim" } });
  expect(res.status).toBe(200);
  return (res.body as { gameId: string }).gameId;
}

// Helper: find a seeded game that is NOT in "waiting" status (active or done).
async function findNonWaitingGameId(): Promise<string> {
  const res = await supertest(app).get("/api/game/list");
  expect(res.status).toBe(200);
  const nonWaiting = (res.body as { status: string; gameId: string }[]).find(
    (g) => g.status !== "waiting",
  );
  expect(nonWaiting).toBeTruthy();
  return nonWaiting!.gameId;
}

// Helper: create an invite from auth1 to auth2 for a fresh waiting game.
async function createInvite(): Promise<{ inviteId: string; gameId: string }> {
  const gameId = await createWaitingGame();
  const res = await supertest(app)
    .post("/api/invite/create")
    .send({ auth: auth1, payload: { gameId, toUsername: auth2.username } });
  expect(res.status).toBe(200);
  return { inviteId: res.body.inviteId, gameId };
}

// Shape expected for SafeUserInfo embedded in InviteInfo
const safeUserShape = {
  username: expect.any(String),
  display: expect.any(String),
  privacy: expect.any(String),
  createdAt: expect.any(String),
  lastOnline: expect.any(String),
};

describe("POST /api/invite/create", () => {
  it("should return 400 on a missing payload", async () => {
    const response = await supertest(app).post("/api/invite/create").send({ auth: auth1 });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when 'gameId' is missing from the payload", async () => {
    const response = await supertest(app)
      .post("/api/invite/create")
      .send({ auth: auth1, payload: { toUsername: auth2.username } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when 'toUsername' is missing from the payload", async () => {
    const gameId = await createWaitingGame();
    const response = await supertest(app)
      .post("/api/invite/create")
      .send({ auth: auth1, payload: { gameId } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 403 with invalid credentials", async () => {
    const gameId = await createWaitingGame();
    const response = await supertest(app)
      .post("/api/invite/create")
      .send({ auth: badAuth, payload: { gameId, toUsername: auth2.username } });
    expect(response.status).toBe(403);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 404 when the recipient username does not exist", async () => {
    const gameId = await createWaitingGame();
    const response = await supertest(app)
      .post("/api/invite/create")
      .send({ auth: auth1, payload: { gameId, toUsername: "no-such-user" } });
    expect(response.status).toBe(404);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 404 when the gameId does not exist", async () => {
    const response = await supertest(app)
      .post("/api/invite/create")
      .send({ auth: auth1, payload: { gameId: randomUUID(), toUsername: auth2.username } });
    expect(response.status).toBe(404);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when the game is not in 'waiting' status", async () => {
    const nonWaitingId = await findNonWaitingGameId();
    const response = await supertest(app)
      .post("/api/invite/create")
      .send({ auth: auth1, payload: { gameId: nonWaitingId, toUsername: auth2.username } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Game is not in waiting status");
  });

  it("should create an invite and return a valid InviteInfo", async () => {
    const gameId = await createWaitingGame();
    const response = await supertest(app)
      .post("/api/invite/create")
      .send({ auth: auth1, payload: { gameId, toUsername: auth2.username } });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      inviteId: expect.any(String),
      gameId,
      from: expect.objectContaining({ username: auth1.username }),
      to: expect.objectContaining({ username: auth2.username }),
      status: "pending",
      createdAt: expect.any(String),
    });
  });

  it("should populate 'from' and 'to' with full SafeUserInfo", async () => {
    const gameId = await createWaitingGame();
    const response = await supertest(app)
      .post("/api/invite/create")
      .send({ auth: auth1, payload: { gameId, toUsername: auth2.username } });
    expect(response.status).toBe(200);
    expect(response.body.from).toStrictEqual(safeUserShape);
    expect(response.body.to).toStrictEqual(safeUserShape);
    expect(response.body.from.username).toBe(auth1.username);
    expect(response.body.to.username).toBe(auth2.username);
  });

  it("should allow multiple invites to different users for the same game", async () => {
    const gameId = await createWaitingGame();

    const toUser2 = await supertest(app)
      .post("/api/invite/create")
      .send({ auth: auth1, payload: { gameId, toUsername: auth2.username } });
    const toUser3 = await supertest(app)
      .post("/api/invite/create")
      .send({ auth: auth1, payload: { gameId, toUsername: auth3.username } });

    expect(toUser2.status).toBe(200);
    expect(toUser3.status).toBe(200);
    expect(toUser2.body.inviteId).not.toBe(toUser3.body.inviteId);
    expect(toUser2.body.to.username).toBe(auth2.username);
    expect(toUser3.body.to.username).toBe(auth3.username);
  });
});

describe("GET /api/invite/list/:username", () => {
  it("should return an empty array when the user has no invites", async () => {
    const response = await supertest(app).get(`/api/invite/list/${auth2.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return invites addressed to the specified user", async () => {
    await createInvite(); // from auth1 to auth2

    const response = await supertest(app).get(`/api/invite/list/${auth2.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      inviteId: expect.any(String),
      status: "pending",
      from: expect.objectContaining({ username: auth1.username }),
      to: expect.objectContaining({ username: auth2.username }),
    });
  });

  it("should not include invites addressed to other users", async () => {
    // Invite sent to auth2 only — auth3 should see nothing
    await createInvite();

    const response = await supertest(app).get(`/api/invite/list/${auth3.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return multiple invites and sort them by createdAt ascending", async () => {
    const gameId1 = await createWaitingGame();
    const gameId2 = await createWaitingGame();

    const first = await supertest(app)
      .post("/api/invite/create")
      .send({ auth: auth1, payload: { gameId: gameId1, toUsername: auth2.username } });
    const second = await supertest(app)
      .post("/api/invite/create")
      .send({ auth: auth1, payload: { gameId: gameId2, toUsername: auth2.username } });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const response = await supertest(app).get(`/api/invite/list/${auth2.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    const timestamps = (response.body as { createdAt: string }[]).map((i) =>
      new Date(i.createdAt).getTime(),
    );
    expect(timestamps[0]).toBeLessThanOrEqual(timestamps[1]);
  });
});

describe("GET /api/invite/:id", () => {
  it("should return 404 for a nonexistent invite id", async () => {
    const response = await supertest(app).get(`/api/invite/${randomUUID()}`);
    expect(response.status).toBe(404);
    expect(response.body.error).toBeTruthy();
  });

  it("should return the correct InviteInfo by id", async () => {
    const { inviteId, gameId } = await createInvite();

    const response = await supertest(app).get(`/api/invite/${inviteId}`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      inviteId,
      gameId,
      from: expect.objectContaining({ username: auth1.username }),
      to: expect.objectContaining({ username: auth2.username }),
      status: "pending",
      createdAt: expect.any(String),
    });
  });
});

describe("PUT /api/invite/update", () => {
  it("should return 400 on a missing payload", async () => {
    const response = await supertest(app).put("/api/invite/update").send({ auth: auth2 });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when 'inviteId' is missing from the payload", async () => {
    const response = await supertest(app)
      .put("/api/invite/update")
      .send({ auth: auth2, payload: { status: "accepted" } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when 'status' is missing from the payload", async () => {
    const { inviteId } = await createInvite();
    const response = await supertest(app)
      .put("/api/invite/update")
      .send({ auth: auth2, payload: { inviteId } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when 'status' is not 'accepted' or 'declined'", async () => {
    const { inviteId } = await createInvite();
    const response = await supertest(app)
      .put("/api/invite/update")
      .send({ auth: auth2, payload: { inviteId, status: "ignored" } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return an error with invalid credentials (enforceAuth throws)", async () => {
    const { inviteId } = await createInvite();
    const response = await supertest(app)
      .put("/api/invite/update")
      .send({ auth: badAuth, payload: { inviteId, status: "accepted" } });
    // enforceAuth throws on bad auth — Express returns 500 since there is no try/catch
    expect(response.status).toBe(500);
  });

  it("should accept a pending invite and return updated InviteInfo", async () => {
    const { inviteId, gameId } = await createInvite();

    const response = await supertest(app)
      .put("/api/invite/update")
      .send({ auth: auth2, payload: { inviteId, status: "accepted" } });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      inviteId,
      gameId,
      from: expect.objectContaining({ username: auth1.username }),
      to: expect.objectContaining({ username: auth2.username }),
      status: "accepted",
      createdAt: expect.any(String),
    });
  });

  it("should decline a pending invite and return updated InviteInfo", async () => {
    const { inviteId, gameId } = await createInvite();

    const response = await supertest(app)
      .put("/api/invite/update")
      .send({ auth: auth2, payload: { inviteId, status: "declined" } });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("declined");
    expect(response.body.inviteId).toBe(inviteId);
    expect(response.body.gameId).toBe(gameId);
  });

  it("should persist the status change — a subsequent GET reflects it", async () => {
    const { inviteId } = await createInvite();

    await supertest(app)
      .put("/api/invite/update")
      .send({ auth: auth2, payload: { inviteId, status: "accepted" } });

    const fetched = await supertest(app).get(`/api/invite/${inviteId}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.status).toBe("accepted");
  });

  it("should throw when updating an already-accepted invite (not pending)", async () => {
    const { inviteId } = await createInvite();

    // First update succeeds
    await supertest(app)
      .put("/api/invite/update")
      .send({ auth: auth2, payload: { inviteId, status: "accepted" } });

    // Second update throws because status is no longer "pending"
    const response = await supertest(app)
      .put("/api/invite/update")
      .send({ auth: auth2, payload: { inviteId, status: "declined" } });
    expect(response.status).toBe(500);
  });

  it("should throw when the inviteId does not exist", async () => {
    const response = await supertest(app)
      .put("/api/invite/update")
      .send({ auth: auth2, payload: { inviteId: randomUUID(), status: "accepted" } });
    expect(response.status).toBe(500);
  });
});
