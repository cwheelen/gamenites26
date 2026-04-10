import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { app } from "../src/app.ts";

const auth1 = { username: "user1", password: "pwd1111" };
const auth2 = { username: "user2", password: "pwd2222" };
const auth3 = { username: "user3", password: "pwd3333" };
const badAuth = { username: "user1", password: "wrong" };

describe("POST /api/dm/open", () => {
  it("should return 400 on a missing payload", async () => {
    const response = await supertest(app).post("/api/dm/open").send({ auth: auth1 });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 on a malformed payload (missing 'with' field)", async () => {
    const response = await supertest(app).post("/api/dm/open").send({ auth: auth1, payload: {} });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 403 with invalid credentials", async () => {
    const response = await supertest(app)
      .post("/api/dm/open")
      .send({ auth: badAuth, payload: { with: auth2.username } });
    expect(response.status).toBe(403);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when a user tries to message themselves", async () => {
    const response = await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth1.username } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("You cannot message yourself");
  });

  it("should create a new DM and return a valid DirectMessageInfo", async () => {
    const response = await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth2.username } });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      dmId: expect.any(String),
      chatId: expect.any(String),
      userA: expect.any(String),
      userB: expect.any(String),
      lastUpdated: expect.any(String),
    });
    // userA/userB are the alphabetically sorted pair
    expect([response.body.userA, response.body.userB].sort()).toEqual(
      [auth1.username, auth2.username].sort(),
    );
  });

  it("should return the same DM on repeated calls (idempotent)", async () => {
    const first = await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth2.username } });
    expect(first.status).toBe(200);

    const second = await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth2.username } });
    expect(second.status).toBe(200);

    expect(second.body.dmId).toBe(first.body.dmId);
    expect(second.body.chatId).toBe(first.body.chatId);
  });

  it("should return the same DM regardless of which user initiates", async () => {
    const fromUser1 = await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth2.username } });
    expect(fromUser1.status).toBe(200);

    const fromUser2 = await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth2, payload: { with: auth1.username } });
    expect(fromUser2.status).toBe(200);

    expect(fromUser2.body.dmId).toBe(fromUser1.body.dmId);
  });

  it("should return an error when the requester has blocked the target", async () => {
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: { username: auth2.username } });

    const response = await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth2.username } });
    expect(response.status).toBe(200);
    expect(response.body.error).toBe("You cannot message this user");
  });

  it("should return an error when the target has blocked the requester", async () => {
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth2, payload: { username: auth1.username } });

    const response = await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth2.username } });
    expect(response.status).toBe(200);
    expect(response.body.error).toBe("You cannot message this user");
  });

  it("should return an error when target privacy is 'friends' and requester is not a friend", async () => {
    // Set user2's privacy to "friends"
    await supertest(app)
      .post(`/api/user/${auth2.username}`)
      .send({ auth: auth2, payload: { privacy: "friends" } });

    // user1 and user2 are not friends, so this should fail
    const response = await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth2.username } });
    expect(response.status).toBe(200);
    expect(response.body.error).toBe("This user only accepts messages from friends");
  });

  it("should succeed when target privacy is 'friends' and requester is an accepted friend", async () => {
    // Set user3's privacy to "friends"
    await supertest(app)
      .post(`/api/user/${auth3.username}`)
      .send({ auth: auth3, payload: { privacy: "friends" } });

    // user1 sends a friend request to user3
    const requestResponse = await supertest(app)
      .post("/api/myFriend/request")
      .send({ auth: auth1, payload: { to: auth3.username } });
    expect(requestResponse.status).toBe(200);
    const requestId = requestResponse.body.requestId;

    // user3 accepts the request
    await supertest(app).put("/api/myFriend/accept").send({ auth: auth3, payload: { requestId } });

    // Now user1 can DM user3
    const response = await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth3.username } });
    expect(response.status).toBe(200);
    expect(response.body.dmId).toBeTruthy();
    expect(response.body.error).toBeUndefined();
  });
});

describe("GET /api/dm/list/:username", () => {
  it("should return an empty array when the user has no DMs", async () => {
    const response = await supertest(app).get(`/api/dm/list/${auth1.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return the DMs that involve the specified user", async () => {
    // Create a DM between user1 and user2
    await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth2.username } });

    const response = await supertest(app).get(`/api/dm/list/${auth1.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toStrictEqual({
      dmId: expect.any(String),
      chatId: expect.any(String),
      userA: expect.any(String),
      userB: expect.any(String),
      lastUpdated: expect.any(String),
    });
    const dm = response.body[0];
    expect([dm.userA, dm.userB]).toContain(auth1.username);
    expect([dm.userA, dm.userB]).toContain(auth2.username);
  });

  it("should return multiple DMs when a user has conversations with several people", async () => {
    await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth2.username } });
    await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth3.username } });

    const response = await supertest(app).get(`/api/dm/list/${auth1.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it("should not include DMs that do not involve the specified user", async () => {
    // Create a DM between user2 and user3 only
    await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth2, payload: { with: auth3.username } });

    const response = await supertest(app).get(`/api/dm/list/${auth1.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe("GET /api/dm/:id", () => {
  it("should return 404 for a nonexistent DM id", async () => {
    const response = await supertest(app).get(`/api/dm/${randomUUID()}`);
    expect(response.status).toBe(404);
    expect(response.body.error).toBeTruthy();
  });

  it("should return the correct DM by id", async () => {
    const openResponse = await supertest(app)
      .post("/api/dm/open")
      .send({ auth: auth1, payload: { with: auth2.username } });
    expect(openResponse.status).toBe(200);
    const { dmId } = openResponse.body;

    const response = await supertest(app).get(`/api/dm/${dmId}`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      dmId,
      chatId: openResponse.body.chatId,
      userA: openResponse.body.userA,
      userB: openResponse.body.userB,
      lastUpdated: expect.any(String),
    });
  });
});
