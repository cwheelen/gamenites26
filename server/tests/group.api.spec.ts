import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { app } from "../src/app.ts";

const auth1 = { username: "user1", password: "pwd1111" };
const auth2 = { username: "user2", password: "pwd2222" };
const auth3 = { username: "user3", password: "pwd3333" };
const auth4 = { username: "user4", password: "pwd4444" };
const badAuth = { username: "user1", password: "wrong" };

describe("POST /api/group/create", () => {
  it("should return 400 on a missing payload", async () => {
    const response = await supertest(app).post("/api/group/create").send({ auth: auth1 });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when 'title' is missing from the payload", async () => {
    const response = await supertest(app)
      .post("/api/group/create")
      .send({ auth: auth1, payload: { members: [auth1.username, auth2.username] } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when 'members' is missing from the payload", async () => {
    const response = await supertest(app)
      .post("/api/group/create")
      .send({ auth: auth1, payload: { title: "My Group" } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when 'members' has fewer than 2 entries", async () => {
    const response = await supertest(app)
      .post("/api/group/create")
      .send({ auth: auth1, payload: { title: "My Group", members: [auth1.username] } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 403 with invalid credentials", async () => {
    const response = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: badAuth,
        payload: { title: "My Group", members: [auth1.username, auth2.username] },
      });
    expect(response.status).toBe(403);
    expect(response.body.error).toBeTruthy();
  });

  it("should create a group chat and return a valid GroupChatInfo", async () => {
    const response = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "My Group", members: [auth1.username, auth2.username] },
      });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      groupId: expect.any(String),
      chatId: expect.any(String),
      title: "My Group",
      members: [auth1.username, auth2.username],
      createdBy: auth1.username,
      lastUpdated: expect.any(String),
    });
  });

  it("should create distinct group chats for separate create calls", async () => {
    const first = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Group A", members: [auth1.username, auth2.username] },
      });
    const second = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Group B", members: [auth1.username, auth3.username] },
      });
    expect(first.body.groupId).not.toBe(second.body.groupId);
    expect(first.body.chatId).not.toBe(second.body.chatId);
  });

  it("should return 403 when a member has 'friends' privacy and creator is not a friend", async () => {
    await supertest(app)
      .post(`/api/user/${auth3.username}`)
      .send({ auth: auth3, payload: { privacy: "friends" } });

    const response = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Private Group", members: [auth1.username, auth3.username] },
      });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe(`${auth3.username} only accepts messages from friends`);
  });

  it("should succeed when a member has 'friends' privacy and creator is an accepted friend", async () => {
    await supertest(app)
      .post(`/api/user/${auth3.username}`)
      .send({ auth: auth3, payload: { privacy: "friends" } });

    // auth1 sends friend request to auth3, auth3 accepts
    const requestResponse = await supertest(app)
      .post("/api/myFriend/request")
      .send({ auth: auth1, payload: { to: auth3.username } });
    expect(requestResponse.status).toBe(200);
    await supertest(app)
      .put("/api/myFriend/accept")
      .send({ auth: auth3, payload: { requestId: requestResponse.body.requestId } });

    const response = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Friends Group", members: [auth1.username, auth3.username] },
      });
    expect(response.status).toBe(200);
    expect(response.body.groupId).toBeTruthy();
    expect(response.body.error).toBeUndefined();
  });

  it("should skip the privacy check for the creator when they are also listed as a member", async () => {
    // auth1 sets their own privacy to "friends" — but they are the creator, so it should be skipped
    await supertest(app)
      .post(`/api/user/${auth1.username}`)
      .send({ auth: auth1, payload: { privacy: "friends" } });

    const response = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Self Group", members: [auth1.username, auth2.username] },
      });
    expect(response.status).toBe(200);
    expect(response.body.groupId).toBeTruthy();
  });
});

describe("GET /api/group/list/:username", () => {
  it("should return an empty array when the user has no group chats", async () => {
    const response = await supertest(app).get(`/api/group/list/${auth1.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return group chats the user is a member of", async () => {
    await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "My Group", members: [auth1.username, auth2.username] },
      });

    const response = await supertest(app).get(`/api/group/list/${auth1.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      groupId: expect.any(String),
      title: "My Group",
      members: expect.arrayContaining([auth1.username, auth2.username]),
    });
  });

  it("should return multiple group chats when user belongs to several", async () => {
    await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Group A", members: [auth1.username, auth2.username] },
      });
    await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth2,
        payload: { title: "Group B", members: [auth1.username, auth2.username] },
      });

    const response = await supertest(app).get(`/api/group/list/${auth1.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it("should not include group chats the user is not a member of", async () => {
    await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth2,
        payload: { title: "Exclusive Group", members: [auth2.username, auth3.username] },
      });

    const response = await supertest(app).get(`/api/group/list/${auth1.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should only return groups containing the queried user, not all groups", async () => {
    // auth1+auth2 group
    await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Group A", members: [auth1.username, auth2.username] },
      });
    // auth2+auth3 group — auth4 is in neither
    await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth2,
        payload: { title: "Group B", members: [auth2.username, auth3.username] },
      });

    const response = await supertest(app).get(`/api/group/list/${auth4.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe("GET /api/group/:id", () => {
  it("should return 404 for a nonexistent group id", async () => {
    const response = await supertest(app).get(`/api/group/${randomUUID()}`);
    expect(response.status).toBe(404);
    expect(response.body.error).toBeTruthy();
  });

  it("should return the correct group chat by id", async () => {
    const created = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Lookup Group", members: [auth1.username, auth2.username] },
      });
    expect(created.status).toBe(200);
    const { groupId } = created.body;

    const response = await supertest(app).get(`/api/group/${groupId}`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      groupId,
      chatId: created.body.chatId,
      title: "Lookup Group",
      members: [auth1.username, auth2.username],
      createdBy: auth1.username,
      lastUpdated: expect.any(String),
    });
  });
});

describe("PUT /api/group/update", () => {
  it("should return 400 on a missing payload", async () => {
    const response = await supertest(app).put("/api/group/update").send({ auth: auth1 });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when groupId is missing from payload", async () => {
    const response = await supertest(app)
      .put("/api/group/update")
      .send({ auth: auth1, payload: { title: "New Title" } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 400 when members has fewer than 2 entries", async () => {
    const created = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Group", members: [auth1.username, auth2.username] },
      });
    const { groupId } = created.body;

    const response = await supertest(app)
      .put("/api/group/update")
      .send({ auth: auth1, payload: { groupId, members: [auth1.username] } });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 403 with invalid credentials", async () => {
    const created = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Group", members: [auth1.username, auth2.username] },
      });
    const { groupId } = created.body;

    const response = await supertest(app)
      .put("/api/group/update")
      .send({ auth: badAuth, payload: { groupId, title: "New Title" } });
    expect(response.status).toBe(403);
    expect(response.body.error).toBeTruthy();
  });

  it("should return 404 when the group does not exist", async () => {
    const response = await supertest(app)
      .put("/api/group/update")
      .send({ auth: auth1, payload: { groupId: randomUUID(), title: "New Title" } });
    expect(response.status).toBe(404);
    expect(response.body.error).toBeTruthy();
  });

  it("should update the title and return the updated GroupChatInfo", async () => {
    const created = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Old Title", members: [auth1.username, auth2.username] },
      });
    const { groupId } = created.body;

    const response = await supertest(app)
      .put("/api/group/update")
      .send({ auth: auth1, payload: { groupId, title: "New Title" } });
    expect(response.status).toBe(200);
    expect(response.body.title).toBe("New Title");
    expect(response.body.groupId).toBe(groupId);
    expect(response.body.members).toEqual([auth1.username, auth2.username]);
  });

  it("should update the members list and return the updated GroupChatInfo", async () => {
    const created = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "My Group", members: [auth1.username, auth2.username] },
      });
    const { groupId } = created.body;

    const response = await supertest(app)
      .put("/api/group/update")
      .send({
        auth: auth1,
        payload: { groupId, members: [auth1.username, auth2.username, auth3.username] },
      });
    expect(response.status).toBe(200);
    expect(response.body.members).toEqual([auth1.username, auth2.username, auth3.username]);
    expect(response.body.title).toBe("My Group");
  });

  it("should update both title and members in a single call", async () => {
    const created = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Old Title", members: [auth1.username, auth2.username] },
      });
    const { groupId } = created.body;

    const response = await supertest(app)
      .put("/api/group/update")
      .send({
        auth: auth2,
        payload: {
          groupId,
          title: "New Title",
          members: [auth1.username, auth2.username, auth3.username],
        },
      });
    expect(response.status).toBe(200);
    expect(response.body.title).toBe("New Title");
    expect(response.body.members).toEqual([auth1.username, auth2.username, auth3.username]);
  });

  it("should persist changes — a subsequent GET reflects the update", async () => {
    const created = await supertest(app)
      .post("/api/group/create")
      .send({
        auth: auth1,
        payload: { title: "Old Title", members: [auth1.username, auth2.username] },
      });
    const { groupId } = created.body;

    await supertest(app)
      .put("/api/group/update")
      .send({ auth: auth1, payload: { groupId, title: "Updated Title" } });

    const fetchResponse = await supertest(app).get(`/api/group/${groupId}`);
    expect(fetchResponse.status).toBe(200);
    expect(fetchResponse.body.title).toBe("Updated Title");
  });
});
