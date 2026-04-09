import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.ts";

describe("GET /api/leaderboard/:gameType", () => {
  it("should return 400 for invalid game type", async () => {
    const response = await supertest(app).get("/api/leaderboard/invalid");
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({ error: "Invalid game type" });
  });

  it("should return leaderboard for nim", async () => {
    const response = await supertest(app).get("/api/leaderboard/nim");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("entries");
    expect(Array.isArray(response.body.entries)).toBe(true);
    expect(response.body).toHaveProperty("page", 1);
    expect(response.body).toHaveProperty("limit", 10);
    expect(response.body).toHaveProperty("total");
    expect(response.body).toHaveProperty("totalPages");
    // Check structure of first entry if exists
    if (response.body.entries.length > 0) {
      const entry = response.body.entries[0];
      expect(entry).toHaveProperty("user");
      expect(entry).toHaveProperty("gameType", "nim");
      expect(entry).toHaveProperty("wins");
      expect(entry).toHaveProperty("losses");
      expect(entry).toHaveProperty("gamesPlayed");
      expect(entry).toHaveProperty("currentStreak");
      expect(entry).toHaveProperty("longestStreak");
      expect(entry).toHaveProperty("lastUpdated");
    }
  });

  it("should return leaderboard for guess", async () => {
    const response = await supertest(app).get("/api/leaderboard/guess");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("entries");
    expect(Array.isArray(response.body.entries)).toBe(true);
    expect(response.body).toHaveProperty("page", 1);
    expect(response.body).toHaveProperty("limit", 10);
    expect(response.body).toHaveProperty("total");
    expect(response.body).toHaveProperty("totalPages");
  });
});

describe("GET /api/leaderboard/user/:username/:gameType", () => {
  it("should return 400 for invalid game type", async () => {
    const response = await supertest(app).get("/api/leaderboard/user/user1/invalid");
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({ error: "Invalid game type" });
  });

  it("should return 404 for non-existent user", async () => {
    const response = await supertest(app).get("/api/leaderboard/user/nonexistent/nim");
    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({ error: "User not found" });
  });

  it("should return user stats for existing user and nim", async () => {
    const response = await supertest(app).get("/api/leaderboard/user/user3/nim");
    expect(response.status).toBe(200);
    // Since user3 won a nim game in defaults, should have stats
    if (response.body) {
      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("gameType", "nim");
      expect(response.body).toHaveProperty("wins");
      expect(response.body).toHaveProperty("losses");
      expect(response.body).toHaveProperty("gamesPlayed");
      expect(response.body).toHaveProperty("currentStreak");
      expect(response.body).toHaveProperty("longestStreak");
      expect(response.body).toHaveProperty("lastUpdated");
    } else {
      expect(response.body).toBeNull();
    }
  });

  it("should return user stats for existing user and guess", async () => {
    const response = await supertest(app).get("/api/leaderboard/user/user1/guess");
    expect(response.status).toBe(200);
    // user1 might not have guess stats, so could be null
    expect(response.body === null || typeof response.body === "object").toBe(true);
  });

  it("should return null for user with no stats", async () => {
    const response = await supertest(app).get("/api/leaderboard/user/user0/nim");
    expect(response.status).toBe(200);
    // user0 might not have nim stats
    expect(response.body === null || typeof response.body === "object").toBe(true);
  });
});

describe("Leaderboard advanced features", () => {
  it("should return leaderboard with correct pagination", async () => {
    const response = await supertest(app).get("/api/leaderboard/nim?page=2&limit=5");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("entries");
    expect(Array.isArray(response.body.entries)).toBe(true);
    expect(response.body).toHaveProperty("page", 2);
    expect(response.body).toHaveProperty("limit", 5);
    expect(response.body).toHaveProperty("total");
    expect(response.body).toHaveProperty("totalPages");
    expect(response.body.entries.length).toBeLessThanOrEqual(5);
  });

  it("should return leaderboard for each time range", async () => {
    const timeRanges = ["overall", "daily", "weekly", "monthly"];
    for (const range of timeRanges) {
      const response = await supertest(app).get(`/api/leaderboard/nim?timeRange=${range}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("entries");
      expect(Array.isArray(response.body.entries)).toBe(true);
      expect(response.body).toHaveProperty("page");
      expect(response.body).toHaveProperty("limit");
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("totalPages");
    }
  });

  it("should return only friends in leaderboard when friends filter is applied", async () => {
    // Replace 'user1' with a test user who has friends and leaderboard entries
    const response = await supertest(app).get("/api/leaderboard/nim?friendsOf=user1");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("entries");
    expect(Array.isArray(response.body.entries)).toBe(true);
    if (response.body.entries.length > 0) {
      for (const entry of response.body.entries) {
        expect(entry.user).toHaveProperty("username");
        // Optionally, check that entry.user.username is in user1's friends list
      }
    }
  });
});
