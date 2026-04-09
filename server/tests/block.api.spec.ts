import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.ts";

const auth1 = { username: "user1", password: "pwd1111" };
const auth2 = { username: "user2", password: "pwd2222" };
const auth3 = { username: "user3", password: "pwd3333" };
const badAuth = { username: "user1", password: "wrong" };

describe("POST /api/block/block", () => {
  it("should return 400 on a missing payload", async () => {
    const response = await supertest(app).post("/api/block/block").send({ auth: auth1 });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 on a malformed payload (missing username)", async () => {
    const response = await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: {} });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 403 with invalid credentials", async () => {
    const response = await supertest(app)
      .post("/api/block/block")
      .send({ auth: badAuth, payload: { username: auth2.username } });
    expect(response.status).toBe(403);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when a user tries to block themselves", async () => {
    const response = await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: { username: auth1.username } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("You cannot block yourself");
  });

  it("should successfully block another user and return BlockInfo", async () => {
    const response = await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: { username: auth2.username } });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      blockId: expect.any(String),
      blocker: auth1.username,
      blocked: auth2.username,
      createdAt: expect.any(String),
    });
  });

  it("should return 400 when blocking the same user twice", async () => {
    // First block succeeds
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: { username: auth2.username } });

    // Second block should fail
    const response = await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: { username: auth2.username } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("You have already blocked this user");
  });

  it("blocks are directional — user2 can still block user1 independently", async () => {
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: { username: auth2.username } });

    const response = await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth2, payload: { username: auth1.username } });
    expect(response.status).toBe(200);
    expect(response.body.blocker).toBe(auth2.username);
    expect(response.body.blocked).toBe(auth1.username);
  });
});

describe("POST /api/block/unblock", () => {
  it("should return 400 on a missing payload", async () => {
    const response = await supertest(app).post("/api/block/unblock").send({ auth: auth1 });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 403 with invalid credentials", async () => {
    const response = await supertest(app)
      .post("/api/block/unblock")
      .send({ auth: badAuth, payload: { username: auth2.username } });
    expect(response.status).toBe(403);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when no block exists to remove", async () => {
    const response = await supertest(app)
      .post("/api/block/unblock")
      .send({ auth: auth1, payload: { username: auth2.username } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("No block found between these users");
  });

  it("should successfully unblock a user and return the removed BlockInfo", async () => {
    // Create the block first
    const blockResponse = await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: { username: auth2.username } });
    expect(blockResponse.status).toBe(200);

    // Now unblock
    const response = await supertest(app)
      .post("/api/block/unblock")
      .send({ auth: auth1, payload: { username: auth2.username } });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      blockId: blockResponse.body.blockId,
      blocker: auth1.username,
      blocked: auth2.username,
      createdAt: expect.any(String),
    });
  });

  it("should return 400 when trying to unblock the same user twice", async () => {
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: { username: auth2.username } });

    // First unblock succeeds
    await supertest(app)
      .post("/api/block/unblock")
      .send({ auth: auth1, payload: { username: auth2.username } });

    // Second unblock should fail
    const response = await supertest(app)
      .post("/api/block/unblock")
      .send({ auth: auth1, payload: { username: auth2.username } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("No block found between these users");
  });

  it("unblocking is directional — user2's block of user1 is unaffected", async () => {
    // Both users block each other
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: { username: auth2.username } });
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth2, payload: { username: auth1.username } });

    // user1 unblocks user2
    await supertest(app)
      .post("/api/block/unblock")
      .send({ auth: auth1, payload: { username: auth2.username } });

    // user2's block should still be intact
    const statusResponse = await supertest(app).get(
      `/api/block/status/${auth1.username}/${auth2.username}`,
    );
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.blockedByMe).toBe(false); // user1 no longer blocks user2
    expect(statusResponse.body.blockedByThem).toBe(true); // user2 still blocks user1
  });

  it("should allow re-blocking a user after unblocking them", async () => {
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: { username: auth2.username } });
    await supertest(app)
      .post("/api/block/unblock")
      .send({ auth: auth1, payload: { username: auth2.username } });

    const reblock = await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: { username: auth2.username } });
    expect(reblock.status).toBe(200);
    expect(reblock.body.blocker).toBe(auth1.username);
    expect(reblock.body.blocked).toBe(auth2.username);
  });
});

describe("GET /api/block/status/:viewerUsername/:targetUsername", () => {
  it("should return { blockedByMe: false, blockedByThem: false } when no blocks exist", async () => {
    const response = await supertest(app).get(
      `/api/block/status/${auth2.username}/${auth3.username}`,
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ blockedByMe: false, blockedByThem: false });
  });

  it("should return { blockedByMe: true, blockedByThem: false } when viewer has blocked target", async () => {
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth2, payload: { username: auth3.username } });

    const response = await supertest(app).get(
      `/api/block/status/${auth2.username}/${auth3.username}`,
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ blockedByMe: true, blockedByThem: false });
  });

  it("should return { blockedByMe: false, blockedByThem: true } when target has blocked viewer", async () => {
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth3, payload: { username: auth2.username } });

    const response = await supertest(app).get(
      `/api/block/status/${auth2.username}/${auth3.username}`,
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ blockedByMe: false, blockedByThem: true });
  });

  it("should return { blockedByMe: true, blockedByThem: true } when both users have blocked each other", async () => {
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth2, payload: { username: auth3.username } });
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth3, payload: { username: auth2.username } });

    const response = await supertest(app).get(
      `/api/block/status/${auth2.username}/${auth3.username}`,
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ blockedByMe: true, blockedByThem: true });
  });

  it("status is perspective-dependent — swapping viewer/target swaps the flags", async () => {
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth2, payload: { username: auth3.username } });

    const fromUser2 = await supertest(app).get(
      `/api/block/status/${auth2.username}/${auth3.username}`,
    );
    const fromUser3 = await supertest(app).get(
      `/api/block/status/${auth3.username}/${auth2.username}`,
    );

    expect(fromUser2.body).toStrictEqual({ blockedByMe: true, blockedByThem: false });
    expect(fromUser3.body).toStrictEqual({ blockedByMe: false, blockedByThem: true });
  });

  it("should not be affected by blocks between unrelated users", async () => {
    // auth1 blocks auth3 — should have no effect on auth2/auth3 status
    await supertest(app)
      .post("/api/block/block")
      .send({ auth: auth1, payload: { username: auth3.username } });

    const response = await supertest(app).get(
      `/api/block/status/${auth2.username}/${auth3.username}`,
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ blockedByMe: false, blockedByThem: false });
  });
});
