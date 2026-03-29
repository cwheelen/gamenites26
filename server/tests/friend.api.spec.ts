// Make this later

import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.ts";
import { randomUUID } from "node:crypto";

const auth1 = { username: "user1", password: "pwd1111" };
const auth2 = { username: "user2", password: "pwd2222" };

describe("POST /api/friend/create", () => {
  it("should return 400 on ill-formatted payload", async () => {
    const response = await supertest(app).post("/api/friend/create").send({ auth1 });
    expect(response.status).toBe(400);
  });

  it("should return 403 with bad auth", async () => {
    const response = await supertest(app)
      .post("/api/friend/create")
      .send({
        auth: { ...auth2, password: "no" },
        payload: { username: "Evil title", friendUsername: "Evil contents" },
      });
    expect(response.status).toBe(403);
  });

  it("should succeed with correct information", async () => {
    const response = await supertest(app)
      .post("/api/friend/create")
      .send({
        auth: auth1,
        payload: { username: auth1.username, friendUsername: auth2.username },
      });
    expect(response.status).toBe(200);
    expect(response.body.friendId).toBeTruthy();
    expect(response.body.createdAt).toBeTruthy();
    expect(response.body.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ username: "user1" }),
        expect.objectContaining({ username: "user2" }),
      ]),
    );
  });
});

describe("GET /api/friend/:id", () => {
  it("should return 404 on an invalid id", async () => {
    const response = await supertest(app).get(`/api/friend/${randomUUID().toString()}`);
    expect(response.status).toBe(404);
  });

  it("should return existing friend based on id", async () => {
    const response = await supertest(app).get(`/api/friend/deadbeefdeadbeefdeadbeef`);
    expect(response.body).toStrictEqual({
      friendId: "deadbeefdeadbeefdeadbeef",
      users: [
        {
          username: "user0",
          display: expect.any(String),
          createdAt: expect.anything(),
        },
        {
          username: "user1",
          display: expect.any(String),
          createdAt: expect.anything(),
        },
      ],
      createdAt: expect.anything(),
    });
  });
});
