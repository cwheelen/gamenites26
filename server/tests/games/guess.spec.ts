import { describe, expect, it } from "vitest";
import { guessLogic } from "../../src/games/guess.ts";

describe(`Guessing game's start() logic`, () => {
  it("Should always start a game with the provided number of players", () => {
    expect(guessLogic.start(2)).toStrictEqual({ secret: expect.anything(), guesses: [null, null] });
    expect(guessLogic.start(4)).toStrictEqual({
      secret: expect.anything(),
      guesses: [null, null, null, null],
    });
  });
});

describe(`Guessing game's update() logic`, () => {
  it("Should reject a poorly-typed move", () => {
    expect(
      guessLogic.update({ secret: expect.anything(), guesses: [null, null, null] }, null, 0),
    ).toBeNull();
  });
  it("Should reject moves that are out of range 1 to 100", () => {
    expect(guessLogic.update({ secret: 44, guesses: [null, null, null] }, 0, 0)).toBeNull();
    expect(guessLogic.update({ secret: 44, guesses: [null, null, null] }, 101, 0)).toBeNull();
  });
  it("Forbids guessing twice", () => {
    expect(guessLogic.update({ secret: 44, guesses: [null, null, 22] }, 10, 2)).toBeNull();
    expect(guessLogic.update({ secret: 44, guesses: [null, null, 22] }, 22, 2)).toBeNull();
  });
  it("Should accept in-range moves and update the correct player", () => {
    expect(guessLogic.update({ secret: 44, guesses: [null, null, null] }, 10, 0)).toStrictEqual({
      secret: 44,
      guesses: [10, null, null],
    });
    expect(guessLogic.update({ secret: 44, guesses: [null, null, 90] }, 20, 1)).toStrictEqual({
      secret: 44,
      guesses: [null, 20, 90],
    });
    expect(guessLogic.update({ secret: 44, guesses: [99, 98, null] }, 20, 2)).toStrictEqual({
      secret: 44,
      guesses: [99, 98, 20],
    });
  });
});

describe(`Guessing game's isDone() logic`, () => {
  it("Should only claim to be done if everyone has guessed", () => {
    expect(guessLogic.isDone({ secret: 44, guesses: [null, null, null] })).toBe(false);
    expect(guessLogic.isDone({ secret: 44, guesses: [null, 10, null] })).toBe(false);
    expect(guessLogic.isDone({ secret: 44, guesses: [30, null, null] })).toBe(false);
    expect(guessLogic.isDone({ secret: 44, guesses: [null, 99, 4] })).toBe(false);
    expect(guessLogic.isDone({ secret: 44, guesses: [3, 99, 4] })).toBe(true);
  });
});

describe(`Guessing game's viewAs() logic`, () => {
  it("Should include only who has guessed for anonymous viewers, unless finished", () => {
    expect(guessLogic.viewAs({ secret: 44, guesses: [null, null, 33] }, -1)).toStrictEqual({
      finished: false,
      guesses: [false, false, true],
    });
    expect(guessLogic.viewAs({ secret: 44, guesses: [1, 2, 33] }, -1)).toStrictEqual({
      finished: true,
      secret: 44,
      guesses: [1, 2, 33],
    });
  });
  it("Should include the current player guess, if any, unless finished", () => {
    expect(guessLogic.viewAs({ secret: 44, guesses: [7, null, 33] }, 1)).toStrictEqual({
      finished: false,
      guesses: [true, false, true],
    });
    expect(guessLogic.viewAs({ secret: 44, guesses: [null, null, 33] }, 2)).toStrictEqual({
      finished: false,
      guesses: [false, false, true],
      myGuess: 33,
    });
    expect(guessLogic.viewAs({ secret: 44, guesses: [7, 6, 33] }, 0)).toStrictEqual({
      finished: true,
      secret: 44,
      guesses: [7, 6, 33],
    });
  });
});

describe(`Guessing game's tagView() logic`, () => {
  it("Should appropriately tag the view", () => {
    expect(guessLogic.tagView({ finished: true, secret: 12, guesses: [1, 2, 3] })).toStrictEqual({
      type: "guess",
      view: { finished: true, secret: 12, guesses: [1, 2, 3] },
    });
  });
});

describe(`Guessing game's describeMove() logic`, () => {
  it("describes a move mid-game without revealing the secret", () => {
    const prev = { secret: 50, guesses: [null, null] };
    const next = { secret: 50, guesses: [30, null] };
    const desc = guessLogic.describeMove(prev, next, 30, 0);
    expect(desc).toContain(" made a guess");
    expect(desc).not.toContain("50");
  });
});

describe(`Guessing game's getWinners() logic`, () => {
  it("returns an empty array before all players have guessed", () => {
    expect(guessLogic.getWinners({ secret: 50, guesses: [null, null] })).toStrictEqual([]);
    expect(guessLogic.getWinners({ secret: 50, guesses: [40, null] })).toStrictEqual([]);
  });

  it("returns the single player closest to the secret", () => {
    // player 0 guesses 45 (distance 5), player 1 guesses 60 (distance 10)
    expect(guessLogic.getWinners({ secret: 50, guesses: [45, 60] })).toStrictEqual([0]);
    // player 0 guesses 30 (distance 20), player 1 guesses 55 (distance 5)
    expect(guessLogic.getWinners({ secret: 50, guesses: [30, 55] })).toStrictEqual([1]);
  });

  it("returns all tied players when multiple players are equally close", () => {
    // both players are 5 away from the secret
    const winners = guessLogic.getWinners({ secret: 50, guesses: [45, 55] });
    expect(winners).toHaveLength(2);
    expect(winners).toContain(0);
    expect(winners).toContain(1);
  });

  it("handles a three-way tie correctly", () => {
    // all three players guess exactly the secret
    const winners = guessLogic.getWinners({ secret: 50, guesses: [50, 50, 50] });
    expect(winners).toHaveLength(3);
  });

  it("handles exact guess (distance 0) as the winner", () => {
    expect(guessLogic.getWinners({ secret: 50, guesses: [50, 99] })).toStrictEqual([0]);
  });
});