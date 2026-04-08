import {
  zGuessMove,
  type GuessView,
  type GuessState,
  type UnfinishedGuesView,
} from "@gamenite/shared";
import { GameService } from "./gameServiceManager.ts";
import { type GameLogic } from "./gameLogic.ts";

function allGuessed(guesses: (number | null)[]): guesses is number[] {
  return guesses.every((guess) => guess !== null);
}

export const guessLogic: GameLogic<GuessState, GuessView> = {
  minPlayers: 2,
  maxPlayers: null,
  start: (numPlayers) => ({
    secret: Math.round(Math.random() * 100) + 1,
    guesses: Array.from({ length: numPlayers }).map(() => null),
  }),
  update: ({ secret, guesses: oldGuesses }, payload, playerIndex) => {
    const move = zGuessMove.safeParse(payload);
    if (oldGuesses[playerIndex] !== null) return null;
    if (move.error) return null;
    const newGuesses = [...oldGuesses];
    newGuesses[playerIndex] = move.data;
    return {
      secret,
      guesses: newGuesses,
    };
  },
  isDone: ({ guesses }) => guesses.every((guess) => guess !== null),
  viewAs: ({ secret, guesses }, playerIndex) => {
    if (allGuessed(guesses)) {
      return { finished: true, secret, guesses };
    }
    // If the game is not done, we only show the player their own guess
    // everyone can see *who* has guessed
    const view: UnfinishedGuesView = {
      finished: false,
      guesses: guesses.map((value) => value !== null),
    };
    if (playerIndex !== -1 && guesses[playerIndex] !== null) {
      view.myGuess = guesses[playerIndex];
    }
    return view;
  },
  tagView: (view) => ({ type: "guess", view }),
  describeMove: (_prevState, newState, payload) => {
    const move = zGuessMove.parse(payload);
    if (allGuessed(newState.guesses)) {
      return ` guessed ${move} — the secret was ${newState.secret}!`;
    }
    return ` made a guess`;
  },
  getWinners: ({ secret, guesses }) => {
    if (!allGuessed(guesses)) return [];

    // Find the minimum distance to the secret
    const distances = guesses.map((guess, index) => ({
      index,
      distance: Math.abs(guess - secret),
    }));

    const minDistance = Math.min(...distances.map((d) => d.distance));

    // Return all players with the minimum distance (can be multiple winners)
    return distances.filter((d) => d.distance === minDistance).map((d) => d.index);
  },
};

export const guessGameService = new GameService<GuessState, GuessView>(guessLogic);

// Bot code

export const NUMBER_GUESSER_BOT_USER_ID = "__guess_bot__";

export function getGuessBotMove(state: GuessState): number {
  // The bot will guess randomly between 1 and 100, but will never repeat a previous guess
  const previousGuesses = new Set(state.guesses.filter((g): g is number => g !== null));
  let guess: number;
  do {
    guess = Math.round(Math.random() * 100) + 1;
  } while (previousGuesses.has(guess));
  return guess;
}
