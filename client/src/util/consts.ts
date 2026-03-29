import { type GameKey } from "@gamenite/shared";

export const gameNames: { [key in GameKey]: string } = {
  nim: "Nim",
  guess: "Number Guesser",
  connect4: "Connect 4",
  battleship: "Battleship",
  checkers: "Checkers",
};

/**
 * Games that support a bot opponent.
 * The bot logic itself is implemented separately — this set controls
 * whether the "vs Bot" option appears in the game creation flow.
 */
export const botSupportedGames: Set<GameKey> = new Set([
  "nim",
  "guess",
  "battleship",
  "checkers",
  // "connect4",  -- uncomment when connect4 is added
]);
